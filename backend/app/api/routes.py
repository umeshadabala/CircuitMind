from datetime import datetime, timezone
import logging
from typing import Any, Dict, List, Optional
import uuid
from fastapi import APIRouter, HTTPException, Request, Response, status
from pydantic import BaseModel, Field

from backend.app.ai.copilot import CopilotService
from backend.app.ai.meta_client import MetaAIClient, MetaAIError
from backend.app.ai.ollama_client import OllamaClient
from backend.app.ai.trial_manager import trial_manager, TrialPolicyError
from backend.app.config import settings
from backend.app.domain.catalog import get_catalog_item, list_catalog_items
from backend.app.domain.models import (
    CatalogComponent,
    ComponentInstance,
    Net,
    Project,
    Requirements,
    SimulationArtifact,
    ValidationReport,
)
from backend.app.services.artifact_gen import ArtifactGenerator
from backend.app.services.firmware_gen import FirmwareGenerator
from backend.app.services.net_generator import NetGenerator
from backend.app.services.pin_allocator import DeterministicPinAllocator
from backend.app.services.pipeline import PipelineService
from backend.app.services.simulator import BehavioralSimulator
from backend.app.services.validator import DRCValidator
from backend.app.simulation.manager import simulator_manager
from backend.app.storage.repository import ProjectRepository

api_router = APIRouter(prefix="/api")
logger = logging.getLogger("circuitmind.api")
repo = ProjectRepository()
pipeline_service = PipelineService(repository=repo)
meta_client = MetaAIClient()
ollama_client = OllamaClient()
copilot_service = CopilotService(ollama_client=ollama_client, meta_client=meta_client, repository=repo)


# ================= HEALTH & STATUS =================
@api_router.get("/health")
async def get_health():
    ollama_info = await ollama_client.check_health()
    meta_info = await meta_client.check_availability()
    return {
        "status": "ok",
        "version": "1.0.0",
        "ollama": ollama_info,
        "meta": meta_info,
    }


# ================= META AI TRIAL STATUS =================
@api_router.get("/ai/meta/trial-status")
async def get_meta_trial_status(request: Request, response: Response):
    """
    Stateless inspection and issuance of the signed Meta AI trial cookie.
    Ensures that the browser identity can observe whether its single-use trial is available.
    """
    state, tid = trial_manager.get_trial_status(request)
    if not request.cookies.get("cm_meta_trial"):
        # Provision initial available signed cookie on new browser session
        trial_manager.set_trial_cookie(response, state="available", token_id=tid or None)

    return {
        "provider": "meta",
        "status": state,
        "trial_available": state == "available",
        "configured": meta_client.is_configured(),
        "model": meta_client.model_id,
    }


# ================= HARDWARE CATALOG =================
@api_router.get("/catalog", response_model=List[CatalogComponent])
def get_catalog():
    return list_catalog_items()


@api_router.get("/catalog/{catalog_id}", response_model=CatalogComponent)
def get_catalog_part(catalog_id: str):
    part = get_catalog_item(catalog_id)
    if not part:
        raise HTTPException(status_code=404, detail=f"Catalog component '{catalog_id}' not found")
    return part


# ================= PROJECTS CRUD =================
class CreateProjectRequest(BaseModel):
    name: str
    description: str = ""
    target_board: str = "AUTO"


class UpdateProjectRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    target_board: Optional[str] = None


@api_router.get("/projects", response_model=List[Project])
def list_projects():
    return repo.list_projects()


@api_router.post("/projects", response_model=Project, status_code=status.HTTP_201_CREATED)
def create_project(req: CreateProjectRequest):
    now = datetime.now(timezone.utc).isoformat()
    target_board = req.target_board or "AUTO"

    initial_components: List[ComponentInstance] = []
    if target_board != "AUTO" and get_catalog_item(target_board):
        board_item = get_catalog_item(target_board)
        initial_components.append(
            ComponentInstance(
                instance_id="U1",
                catalog_id=target_board,
                name=board_item.name if board_item else target_board,
                role=board_item.category if board_item else "microcontroller",
                position={"x": 550.0, "y": 100.0},
            )
        )

    project = Project(
        id=str(uuid.uuid4()),
        name=req.name,
        description=req.description,
        target_board=target_board,
        revision=1,
        created_at=now,
        updated_at=now,
        components=initial_components,
    )
    # Perform initial DRC and firmware generation
    project.validation_report = DRCValidator.validate_project(project)
    project.firmware = FirmwareGenerator.generate_firmware(project)
    project.assembly_guide = ArtifactGenerator.generate_assembly_guide(project)
    saved = repo.save_project(project, increment_revision=False)
    return saved


@api_router.get("/projects/{project_id}", response_model=Project)
def get_project(project_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj


@api_router.put("/projects/{project_id}", response_model=Project)
def update_project(project_id: str, req: UpdateProjectRequest):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if req.name is not None:
        proj.name = req.name
    if req.description is not None:
        proj.description = req.description
    if req.target_board is not None:
        proj.target_board = req.target_board
    return repo.save_project(proj, increment_revision=True)


@api_router.delete("/projects/{project_id}")
def delete_project(project_id: str):
    success = repo.delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "deleted", "project_id": project_id}


# ================= PIPELINE & SYNTHESIS =================
class ParseRequirementsRequest(BaseModel):
    prompt: str


class SynthesizeRequest(BaseModel):
    prompt: str


@api_router.post("/pipeline/parse-requirements", response_model=Requirements)
async def parse_requirements(req: ParseRequirementsRequest):
    return await pipeline_service.stage_a_parse_requirements(req.prompt)


@api_router.post("/projects/{project_id}/synthesize", response_model=Project)
async def synthesize_project(project_id: str, req: SynthesizeRequest):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    try:
        updated = await pipeline_service.execute_full_pipeline(proj, req.prompt)
        return updated
    except Exception as e:
        logger.exception("Project synthesis pipeline failed")
        raise HTTPException(status_code=400, detail=f"Synthesis failed: {str(e)}")


@api_router.get("/projects/{project_id}/diagnostic-trace")
def get_project_diagnostic_trace(project_id: str):
    """Retrieves the sanitized diagnostic trace of the project generation pipeline."""
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return proj.diagnostic_trace or {"status": "no_trace_available"}


# ================= DIRECT GRAPH MUTATIONS =================
class AddComponentRequest(BaseModel):
    catalog_id: str
    name: Optional[str] = None
    position: Optional[Dict[str, float]] = None


@api_router.post("/projects/{project_id}/components", response_model=Project)
def add_component(project_id: str, req: AddComponentRequest):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    part = get_catalog_item(req.catalog_id)
    if not part:
        raise HTTPException(status_code=400, detail=f"Unsupported catalog ID '{req.catalog_id}'")

    prefix = "U" if part.category == "microcontroller" else "D" if part.category == "actuator" else "S" if part.category == "sensor" else "R" if part.category == "passive" else "C"
    existing_ids = [c.instance_id for c in proj.components]
    idx = 1
    while f"{prefix}{idx}" in existing_ids:
        idx += 1
    new_id = f"{prefix}{idx}"

    new_inst = ComponentInstance(
        instance_id=new_id,
        catalog_id=part.catalog_id,
        name=req.name or part.name,
        role=part.category,
        position=req.position or {"x": 450.0, "y": 250.0},
        properties=part.default_properties,
    )
    proj.components.append(new_inst)

    # Increment revision and refresh graph
    proj.revision += 1
    copilot_service._refresh_project_graph(proj)
    return repo.save_project(proj, increment_revision=False)


class UpdatePositionRequest(BaseModel):
    x: float
    y: float


@api_router.put("/projects/{project_id}/components/{instance_id}/position", response_model=Project)
def update_component_position(project_id: str, instance_id: str, req: UpdatePositionRequest):
    """Updates presentation coordinates on canvas without altering electrical connectivity."""
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    comp = next((c for c in proj.components if c.instance_id == instance_id), None)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Instance '{instance_id}' not found")

    comp.position = {"x": req.x, "y": req.y}
    # Presentation metadata update does not alter electrical revision
    return repo.save_project(proj, increment_revision=False)


@api_router.post("/projects/{project_id}/repair")
def repair_project_drc(project_id: str):
    """Executes bounded automated DRC repair on the project graph."""
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    actions = DRCValidator.auto_repair_project(proj)
    copilot_service._refresh_project_graph(proj)
    saved = repo.save_project(proj, increment_revision=False)
    return {"actions_taken": actions, "project": saved}


@api_router.post("/projects/{project_id}/layout", response_model=Project)
def auto_layout_project(project_id: str):
    """Calculates clean, uncluttered hierarchical layout positions preserving graph connectivity."""
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    col_y: Dict[str, float] = {
        "power": 60.0,
        "sensor": 60.0,
        "logic": 60.0,
        "microcontroller": 100.0,
        "flight_controller": 100.0,
        "motor_driver": 60.0,
        "passive": 60.0,
        "actuator": 60.0,
        "display": 60.0,
    }
    col_x: Dict[str, float] = {
        "power": 60.0,
        "sensor": 60.0,
        "logic": 330.0,
        "microcontroller": 600.0,
        "flight_controller": 600.0,
        "motor_driver": 960.0,
        "passive": 960.0,
        "actuator": 1260.0,
        "display": 1260.0,
    }

    for comp in proj.components:
        cat = comp.role
        x = col_x.get(cat, 570.0)
        y = col_y.get(cat, 80.0)
        col_y[cat] = y + 130.0
        comp.position = {"x": x, "y": y}

    return repo.save_project(proj, increment_revision=False)


@api_router.delete("/projects/{project_id}/components/{instance_id}", response_model=Project)
def remove_component(project_id: str, instance_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    initial_len = len(proj.components)
    proj.components = [c for c in proj.components if c.instance_id != instance_id]
    if len(proj.components) == initial_len:
        raise HTTPException(status_code=404, detail=f"Instance '{instance_id}' not found")

    # Remove any pin connections referencing this instance
    for net in proj.nets:
        net.pins = [p for p in net.pins if p.instance_id != instance_id]
    proj.nets = [n for n in proj.nets if len(n.pins) > 0]

    proj.revision += 1
    copilot_service._refresh_project_graph(proj)
    return repo.save_project(proj, increment_revision=False)


# ================= VALIDATION & ARTIFACTS =================
@api_router.get("/projects/{project_id}/validation", response_model=ValidationReport)
def get_validation(project_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    report = DRCValidator.validate_project(proj)
    proj.validation_report = report
    repo.save_project(proj, increment_revision=False)
    return report


@api_router.get("/projects/{project_id}/artifacts/bom")
def get_bom(project_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return ArtifactGenerator.generate_bom(proj)


@api_router.get("/projects/{project_id}/artifacts/netlist")
def get_netlist(project_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return ArtifactGenerator.generate_netlist(proj)


@api_router.get("/projects/{project_id}/artifacts/firmware")
def get_firmware(project_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    if not proj.firmware or proj.firmware.revision != proj.revision:
        proj.firmware = FirmwareGenerator.generate_firmware(proj)
        repo.save_project(proj, increment_revision=False)
    return proj.firmware


@api_router.get("/projects/{project_id}/artifacts/assembly-guide")
def get_assembly_guide(project_id: str):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"markdown": ArtifactGenerator.generate_assembly_guide(proj)}


# ================= SIMULATION =================
class SimulateRequest(BaseModel):
    scenario: Optional[str] = None
    preferred_adapter: Optional[str] = None


@api_router.get("/simulation/adapters")
def list_simulation_adapters():
    """Lists all registered simulation adapters and local tool discovery statuses."""
    return simulator_manager.list_adapters()


@api_router.get("/projects/{project_id}/simulation/wokwi-bundle")
def get_wokwi_bundle(project_id: str):
    """Generates and returns the Wokwi diagram.json and wokwi.toml bundle."""
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    adapter = simulator_manager.get_adapter("wokwi")
    if not adapter:
        raise HTTPException(status_code=500, detail="Wokwi adapter unavailable")
    return adapter.generate_bundle(proj)


@api_router.post("/projects/{project_id}/simulate", response_model=SimulationArtifact)
async def simulate_project(project_id: str, req: SimulateRequest):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")
    sim_result = await simulator_manager.execute_simulation(
        proj,
        scenario=req.scenario,
        preferred_adapter=req.preferred_adapter,
    )
    proj.simulation_history.insert(0, sim_result)
    repo.save_project(proj, increment_revision=False)
    return sim_result


# ================= COPILOT =================
class CopilotMessageRequest(BaseModel):
    message: str
    provider: Optional[str] = "local"


@api_router.post("/projects/{project_id}/copilot")
async def copilot_chat(
    project_id: str,
    req: CopilotMessageRequest,
    request: Request,
    response: Response,
):
    proj = repo.get_project(project_id)
    if not proj:
        raise HTTPException(status_code=404, detail="Project not found")

    provider = (req.provider or "local").lower()

    if provider == "meta":
        # Strict Meta AI One-Trial Guardrails
        if not req.message or not req.message.strip():
            raise HTTPException(status_code=400, detail="Empty prompt cannot be submitted to Meta AI.")

        if len(req.message) > settings.META_MAX_PROMPT_CHARS:
            raise HTTPException(
                status_code=400,
                detail=f"Prompt exceeds maximum character limit ({len(req.message)} > {settings.META_MAX_PROMPT_CHARS}).",
            )

        # 1. Reserve trial and verify signed cookie eligibility
        try:
            token_id = await trial_manager.reserve_trial(request)
        except TrialPolicyError as tpe:
            raise HTTPException(status_code=tpe.status_code, detail=str(tpe))

        # 2. Invoke external Meta API and unconditionally consume trial token
        try:
            res = await copilot_service.chat(proj, req.message, provider="meta")
            return res
        except MetaAIError as mae:
            raise HTTPException(status_code=mae.status_code or 502, detail=mae.user_message)
        finally:
            await trial_manager.release_and_consume_trial(token_id, response, state="consumed")

    else:
        # Default: Local AI (Ollama)
        res = await copilot_service.chat(proj, req.message, provider="local")
        return res
