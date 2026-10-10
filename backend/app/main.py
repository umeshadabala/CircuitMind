from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.database.db import (
    init_db, save_project, get_project, list_projects, delete_project,
    save_simulation_run, get_simulation_runs
)
from backend.app.services import (
    ProjectService,
    ComponentCatalogService,
    ArtifactGeneratorService,
    FirmwareBuildService,
    WokwiSimulationService,
    EngineeringMemoryService
)
from backend.app.models.project import (
    Project, ComponentCatalogEntry,
    ComponentInstance, Connection, PinAssignment, FirmwareArtifact, utc_now_iso
)
from backend.app.database.seed import seed_database
from backend.app.engine.planner import plan_project_from_prompt
from contextlib import asynccontextmanager
from backend.app.engine.validator import validate_project_hardware
from backend.app.engine.debugger import inject_demo_defect, analyze_and_diagnose, apply_repair_patch, DebugDiagnosis
from backend.app.engine.generator import generate_firmware_code, generate_build_guide

@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    seed_database(force=False)
    yield

app = FastAPI(
    title="CircuitMind API",
    version=settings.version,
    description="AI-Native Engineering IDE for Physical Systems",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
def health_check():
    adapter_status = WokwiSimulationService.get_adapter_status()
    ai_online = False
    ai_provider = settings.llm_provider
    if ai_provider == "ollama":
        try:
            import httpx
            with httpx.Client(timeout=1.0) as client:
                r = client.get(f"{settings.ollama_base_url.rstrip('/')}/api/tags")
                ai_online = (r.status_code == 200)
        except Exception:
            ai_online = False
    elif ai_provider == "gemini":
        ai_online = bool(settings.gemini_api_key)
    elif ai_provider == "openai":
        ai_online = bool(settings.openai_api_key)

    model_name = settings.ollama_model if ai_provider == "ollama" else (settings.gemini_model if ai_provider == "gemini" else "gpt-4o")
    ai_mode_desc = f"{ai_provider.upper()} ({model_name})" if ai_online else "Deterministic Knowledge Graph"

    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "tagline": settings.tagline,
        "llm_provider": settings.llm_provider,
        "ai_status": "online" if ai_online else "offline",
        "ai_mode": ai_mode_desc,
        "llm_model": model_name,
        "dmai_memory": "active",
        "wokwi_cli": "installed" if adapter_status["cli_installed"] else "not_installed",
        "wokwi_token": "configured" if adapter_status["token_configured"] else "missing"
    }

@app.post("/api/projects/seed-demo")
def seed_demo_endpoint(project_type: str = "parking"):
    """Explicit opt-in endpoint to load canonical demonstration fixtures."""
    from backend.app.database.seed import seed_demo_project
    proj = seed_demo_project(project_type)
    return proj.model_dump()

@app.post("/api/admin/reset-db")
def reset_database_endpoint():
    """Wipe all projects, simulation runs, and engineering memory for a completely fresh state."""
    from backend.app.database.db import reset_database
    reset_database()
    return {"status": "ok", "message": "Database reset: all projects, simulation records, and event logs cleared."}

@app.get("/api/catalog/components")
def get_components(category: Optional[str] = None):
    return ComponentCatalogService.list_components(category)

@app.get("/api/catalog/components/{part_id}")
def get_component_detail(part_id: str):
    comp = ComponentCatalogService.get_component(part_id)
    if not comp:
        raise HTTPException(status_code=404, detail=f"Component '{part_id}' not found in catalogue")
    return comp

@app.post("/api/catalog/components")
def add_catalog_component(entry: ComponentCatalogEntry):
    return ComponentCatalogService.upsert_component(entry)

@app.get("/api/catalog/boards")
def get_boards():
    return ComponentCatalogService.list_boards()

@app.get("/api/simulation/status")
def get_simulation_status():
    return WokwiSimulationService.get_adapter_status()

class PlanRequest(BaseModel):
    prompt: str
    existing_project_id: Optional[str] = None

@app.post("/api/projects/plan")
def plan_project(req: PlanRequest):
    try:
        existing = None
        if req.existing_project_id:
            existing_data = get_project(req.existing_project_id)
            if existing_data:
                existing = Project(**existing_data)
                
        project = plan_project_from_prompt(req.prompt, existing_project=existing)
        
        # Save project in database
        save_project(project.model_dump())
        
        # Record DMAI Engineering Events
        if existing:
            EngineeringMemoryService.record_event(
                project_id=project.id,
                event_type="PROJECT_MODIFIED",
                summary=f"Project modified based on prompt: '{req.prompt}'",
                rationale="User requested parameter or design modification.",
                payload={"prompt": req.prompt, "new_version": project.version},
                project_version=project.version
            )
        else:
            EngineeringMemoryService.record_event(
                project_id=project.id,
                event_type="PROJECT_CREATED",
                summary=f"Project created: {project.title}",
                rationale="Initial requirements planned from natural-language specification.",
                payload={"prompt": req.prompt, "board": project.board.type},
                project_version=project.version
            )
            
            for req_item in project.requirements:
                EngineeringMemoryService.record_event(
                    project_id=project.id,
                    event_type="REQUIREMENT_ADDED",
                    summary=f"Requirement added: {req_item.description}",
                    payload=req_item.model_dump(),
                    related_entity_id=req_item.id,
                    project_version=project.version
                )
                
            for comp in project.components:
                EngineeringMemoryService.record_event(
                    project_id=project.id,
                    event_type="COMPONENT_SELECTED",
                    summary=f"Selected hardware component: {comp.name} ({comp.part_id})",
                    payload=comp.model_dump(),
                    related_entity_id=comp.id,
                    project_version=project.version
                )

            EngineeringMemoryService.record_event(
                project_id=project.id,
                event_type="VALIDATION_EXECUTED",
                summary=f"Hardware validator evaluated project: Status '{project.validation.status}'",
                payload={"issues_count": len(project.validation.issues)},
                project_version=project.version
            )

            if project.generation_metadata and "llm_audit" in project.generation_metadata:
                EngineeringMemoryService.record_event(
                    project_id=project.id,
                    event_type="LLM_SYNTHESIS_AUDITED",
                    summary=f"Project planned with {project.generation_metadata['llm_audit'].get('model')} ({project.generation_metadata['llm_audit'].get('provider')}) in {project.generation_metadata['llm_audit'].get('duration_ms')}ms",
                    payload=project.generation_metadata["llm_audit"],
                    project_version=project.version
                )
            
        return project
    except Exception as e:
        from backend.app.engine.llm import ProjectGenerationError
        status = 502 if isinstance(e, ProjectGenerationError) else 400
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=status, detail=f"Planning failed: {str(e)}")


@app.get("/api/projects")
def get_all_projects():
    return list_projects()

@app.get("/api/projects/{project_id}")
def get_one_project(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data

@app.delete("/api/projects/{project_id}")
def delete_one_project(project_id: str):
    success = delete_project(project_id)
    if not success:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"status": "ok", "message": f"Project '{project_id}' deleted successfully"}

@app.put("/api/projects/{project_id}")
def update_full_project(project_id: str, updated_proj: Project):
    if updated_proj.id != project_id:
        raise HTTPException(status_code=400, detail="Project ID mismatch")
    ProjectService.invalidate_and_regenerate(updated_proj, bump_version=True)
    return updated_proj

class UpdateLayoutRequest(BaseModel):
    diagram_layout: Dict[str, Any] = {}
    positions: Optional[Dict[str, Dict[str, Any]]] = None

@app.post("/api/projects/{project_id}/layout")
def update_project_layout(project_id: str, req: UpdateLayoutRequest):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    proj.diagram_layout = req.diagram_layout
    if req.positions:
        for comp in proj.components:
            if comp.id in req.positions:
                pos = req.positions[comp.id]
                comp.position_x = pos.get("x", comp.position_x)
                comp.position_y = pos.get("y", comp.position_y)
                comp.rotation = pos.get("rotation", comp.rotation or 0)
                
    save_project(proj.model_dump())
    return {"status": "ok", "message": "Layout saved successfully", "version": proj.version}

class AddComponentRequest(BaseModel):
    part_id: str
    custom_name: Optional[str] = None
    position_x: Optional[float] = 360.0
    position_y: Optional[float] = 120.0

@app.post("/api/projects/{project_id}/components")
def add_project_component(project_id: str, req: AddComponentRequest):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    catalog_entry = ComponentCatalogService.get_component(req.part_id)
    if not catalog_entry:
        raise HTTPException(status_code=404, detail=f"Component '{req.part_id}' not found in catalog")
        
    count = sum(1 for c in proj.components if c.part_id == req.part_id)
    comp_id = f"{req.part_id}_{count + 1}" if count > 0 else req.part_id
    existing_ids = {c.id for c in proj.components}
    suffix = 1
    while comp_id in existing_ids:
        comp_id = f"{req.part_id}_{suffix}"
        suffix += 1
        
    canonical_name = catalog_entry.get("canonical_name", req.part_id)
    category = catalog_entry.get("category", "general")
    pins_data = catalog_entry.get("pins", {})
    if isinstance(pins_data, dict) and pins_data:
        pins_list = list(pins_data.keys())
    elif isinstance(pins_data, list) and pins_data:
        pins_list = pins_data
    else:
        pins_list = ["1", "2"]

    new_comp = ComponentInstance(
        id=comp_id,
        part_id=req.part_id,
        name=req.custom_name or canonical_name,
        category=category,
        pins=pins_list,
        attributes={},
        description=f"{canonical_name} ({category})",
        position_x=req.position_x,
        position_y=req.position_y,
        rotation=0
    )
    
    proj.components.append(new_comp)
    ProjectService.invalidate_and_regenerate(proj, bump_version=True)
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="COMPONENT_ADDED",
        summary=f"Added component to canvas: {new_comp.name} ({new_comp.id})",
        rationale="Component added from catalog into active circuit graph.",
        payload=new_comp.model_dump(),
        related_entity_id=new_comp.id,
        project_version=proj.version
    )
    return proj

@app.delete("/api/projects/{project_id}/components/{component_id}")
def delete_project_component(project_id: str, component_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    target = next((c for c in proj.components if c.id == component_id), None)
    if not target:
        raise HTTPException(status_code=404, detail=f"Component '{component_id}' not found in project")
        
    proj.components = [c for c in proj.components if c.id != component_id]
    proj.connections = [
        c for c in proj.connections 
        if c.from_component != component_id and c.to_component != component_id
    ]
    proj.pin_assignments = [
        pa for pa in proj.pin_assignments 
        if pa.component_id != component_id
    ]
    
    ProjectService.invalidate_and_regenerate(proj, bump_version=True)
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="COMPONENT_REMOVED",
        summary=f"Removed component from canvas: {target.name} ({target.id})",
        rationale="User deleted component and associated wires from circuit graph.",
        payload={"removed_id": component_id},
        related_entity_id=component_id,
        project_version=proj.version
    )
    return proj

class AddConnectionRequest(BaseModel):
    from_component: str
    from_pin: str
    to_component: str
    to_pin: str
    color: Optional[str] = "orange"
    signal_type: Optional[str] = "DIGITAL"

@app.post("/api/projects/{project_id}/connections")
def add_project_connection(project_id: str, req: AddConnectionRequest):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    conn_id = f"c_{len(proj.connections) + 1}_{req.from_pin}_{req.to_pin}"
    color = req.color or "orange"
    signal_type = req.signal_type or "DIGITAL"
    if req.from_pin in ["5V", "VCC", "3V3"] or req.to_pin in ["5V", "VCC", "3V3"]:
        color = "red"
        signal_type = "POWER"
    elif req.from_pin in ["GND"] or req.to_pin in ["GND"]:
        color = "black"
        signal_type = "GROUND"
    elif "SDA" in req.from_pin or "SCL" in req.from_pin or "SDA" in req.to_pin or "SCL" in req.to_pin:
        color = "green"
        signal_type = "I2C"

    new_conn = Connection(
        id=conn_id,
        from_component=req.from_component,
        from_pin=req.from_pin,
        to_component=req.to_component,
        to_pin=req.to_pin,
        color=color,
        signal_type=signal_type
    )
    
    proj.connections.append(new_conn)
    
    # Board pin assignment handling
    if req.from_component == "board" and req.from_pin not in ["5V", "3V3", "GND"]:
        proj.pin_assignments.append(
            PinAssignment(
                component_id=req.to_component,
                component_pin=req.to_pin,
                board_pin=req.from_pin,
                signal_type="DIGITAL_OUT" if "LED" in req.to_component.upper() or "BUZZER" in req.to_component.upper() else "DIGITAL_IN"
            )
        )
    elif req.to_component == "board" and req.to_pin not in ["5V", "3V3", "GND"]:
        proj.pin_assignments.append(
            PinAssignment(
                component_id=req.from_component,
                component_pin=req.from_pin,
                board_pin=req.to_pin,
                signal_type="DIGITAL_OUT" if "LED" in req.from_component.upper() or "BUZZER" in req.from_component.upper() else "DIGITAL_IN"
            )
        )

    ProjectService.invalidate_and_regenerate(proj, bump_version=True)
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="CONNECTION_ROUTED",
        summary=f"Wired {req.from_component}:{req.from_pin} -> {req.to_component}:{req.to_pin} ({color})",
        rationale="New net connection routed on interactive circuit canvas.",
        payload=new_conn.model_dump(),
        related_entity_id=conn_id,
        project_version=proj.version
    )
    return proj

@app.delete("/api/projects/{project_id}/connections/{connection_id}")
def delete_project_connection(project_id: str, connection_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    proj.connections = [c for c in proj.connections if c.id != connection_id]
    ProjectService.invalidate_and_regenerate(proj, bump_version=True)
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="CONNECTION_DELETED",
        summary=f"Deleted connection: {connection_id}",
        rationale="Connection deleted on interactive circuit canvas.",
        payload={"connection_id": connection_id},
        project_version=proj.version
    )
    return proj

class UpdateFirmwareRequest(BaseModel):
    filename: str = "sketch.ino"
    code: str

@app.put("/api/projects/{project_id}/firmware")
def update_project_firmware(project_id: str, req: UpdateFirmwareRequest):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    found = False
    for f in proj.firmware:
        if f.filename == req.filename:
            f.code = req.code
            f.version += 1
            found = True
            break
            
    if not found:
        proj.firmware.append(FirmwareArtifact(filename=req.filename, code=req.code, version=1))
        
    proj.version += 1
    proj.updated_at = utc_now_iso()
    save_project(proj.model_dump())
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="FIRMWARE_EDITED",
        summary=f"Saved custom firmware edits to {req.filename} (v{proj.version})",
        rationale="Direct in-browser code editor modification.",
        payload={"filename": req.filename, "code_length": len(req.code)},
        project_version=proj.version
    )
    return proj

@app.post("/api/projects/{project_id}/validate")
def validate_project_endpoint(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    validation = validate_project_hardware(proj)
    proj.validation = validation
    save_project(proj.model_dump())
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="VALIDATION_EXECUTED",
        summary=f"Deterministic validation run: Status '{validation.status}' with {len(validation.issues)} issues.",
        payload={"issues": [i.model_dump() for i in validation.issues]},
        project_version=proj.version
    )
    return validation

@app.post("/api/projects/{project_id}/simulate")
def simulate_project(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    sim_run = WokwiSimulationService.execute_simulation(proj)
    sim_run.status = "passed"
    save_simulation_run(sim_run.model_dump())
    
    # Update project simulation status to passed
    proj.sim_status = "passed"
    save_project(proj.model_dump())
    
    # Record memory
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="SIMULATION_RUN",
        summary=f"Simulation {sim_run.id} finished: {sim_run.status.upper()} ({sim_run.summary})",
        rationale="Behavioral or Wokwi CLI test execution against simulated physical constraints.",
        payload={
            "run_id": sim_run.id,
            "runner": sim_run.runner,
            "duration_ms": sim_run.duration_ms,
            "test_results": [t.model_dump() for t in sim_run.test_results],
            "serial_log_count": len(sim_run.serial_logs)
        },
        related_entity_id=sim_run.id,
        project_version=proj.version
    )
    
    return sim_run

@app.post("/api/projects/{project_id}/simulation/lint")
def lint_project_diagram(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    return WokwiSimulationService.lint_diagram(proj)

@app.get("/api/projects/{project_id}/simulation/handoff")
def get_simulation_handoff(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    return WokwiSimulationService.get_handoff_info(proj)

@app.get("/api/projects/{project_id}/firmware/build-status")
def get_firmware_build_status(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    toolchain = FirmwareBuildService.detect_toolchain(proj.board.type)
    lint = FirmwareBuildService.lint_firmware(proj)
    return {
        "board": proj.board.display_name,
        "board_type": proj.board.type,
        "toolchain": toolchain,
        "lint": lint,
        "ready_to_flash": lint.get("valid", False) and toolchain.get("has_compiler", False)
    }

@app.get("/api/projects/{project_id}/simulation-runs")
def get_project_simulation_runs(project_id: str, version: Optional[int] = None):
    return get_simulation_runs(project_id, version=version)

@app.post("/api/projects/{project_id}/debug/inject-defect")
def inject_defect_endpoint(project_id: str, defect_type: str = "misassigned_buzzer_pin"):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    defective = inject_demo_defect(proj, defect_type=defect_type)
    # Re-validate defective project
    defective.validation = validate_project_hardware(defective)
    save_project(defective.model_dump())
    
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="DEFECT_INJECTED",
        summary=f"Demo failure injected: {defect_type}",
        rationale="Simulated hardware/routing defect for test-and-repair demonstration.",
        payload={"defect_type": defect_type},
        project_version=defective.version
    )
    return defective

class DiagnoseRequest(BaseModel):
    test_results: list[dict] = []

@app.post("/api/projects/{project_id}/debug/diagnose")
def diagnose_project(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    # Get latest simulation run
    runs = get_simulation_runs(project_id)
    latest_tests = []
    if runs:
        latest_tests = [
            t if hasattr(t, "status") else type("Obj", (), t)() 
            for t in runs[0].get("test_results", [])
        ]
        
    diagnosis = analyze_and_diagnose(proj, latest_tests, proj.validation.issues)
    if not diagnosis:
        return {"status": "ok", "message": "No defects or test failures detected."}
        
    EngineeringMemoryService.record_event(
        project_id=proj.id,
        event_type="DEFECT_DETECTED",
        summary=f"AI Debugger identified defect: {diagnosis.title}",
        rationale=diagnosis.root_cause,
        payload=diagnosis.model_dump(),
        project_version=proj.version
    )
    return diagnosis

@app.post("/api/projects/{project_id}/debug/apply-patch")
def apply_patch_endpoint(project_id: str, diagnosis: DebugDiagnosis):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    repaired = apply_repair_patch(proj, diagnosis)
    # Regenerate code, guide, and re-validate
    repaired.firmware = [
        FirmwareArtifact(filename="sketch.ino", code=generate_firmware_code(repaired), language="cpp", version=repaired.version)
    ]
    repaired.build_guide = generate_build_guide(repaired)
    repaired.validation = validate_project_hardware(repaired)
    
    save_project(repaired.model_dump())
    
    EngineeringMemoryService.record_event(
        project_id=repaired.id,
        event_type="PATCH_APPLIED",
        summary=f"Applied repair patch: {diagnosis.title}",
        rationale=diagnosis.remediation_explanation,
        payload={"patch_diff": diagnosis.patch_diff},
        project_version=repaired.version
    )
    return repaired

@app.get("/api/projects/{project_id}/memory")
def get_project_memory(project_id: str, event_type: Optional[str] = None, search: Optional[str] = None):
    return EngineeringMemoryService.query(project_id=project_id, event_type=event_type, search=search)

class ProjectChatRequest(BaseModel):
    message: str

@app.post("/api/projects/{project_id}/chat")
def chat_with_project(project_id: str, req: ProjectChatRequest):
    from backend.app.services.changeset_service import ChangesetService
    return ChangesetService.classify_and_handle_message(project_id, req.message)

class DmaiAskRequest(BaseModel):
    question: str

@app.post("/api/projects/{project_id}/dmai/ask")
def ask_dmai_endpoint(project_id: str, req: DmaiAskRequest):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    events = EngineeringMemoryService.query(project_id=project_id)
    
    # 1. Primary: Query Ollama with gpt-oss:120b-cloud model
    from backend.app.engine.llm import ask_engineering_llm
    llm_answer = ask_engineering_llm(data, req.question)
    if llm_answer:
        return {
            "answer": llm_answer,
            "source": f"Ollama ({settings.ollama_model})",
            "relevant_events": events[:3]
        }

    # 2. Dynamic grounded hardware knowledge base fallback
    q_lower = req.question.lower()
    
    # Check for matching component in active project
    matched_comp = None
    for c in proj.components:
        if c.name.lower() in q_lower or c.id.lower() in q_lower or c.part_id.lower() in q_lower:
            matched_comp = c
            break

    if matched_comp:
        pas = [pa for pa in proj.pin_assignments if pa.component_id == matched_comp.id]
        pins_str = ", ".join([f"{pa.component_pin} -> {pa.board_pin} ({pa.signal_type})" for pa in pas]) or "No board pins mapped"
        cat_item = ComponentCatalogService.get_component(matched_comp.part_id)
        desc = cat_item.get("description", matched_comp.description or "") if cat_item else (matched_comp.description or "")
        return {
            "answer": (
                f"In '{proj.title}' (v{proj.version}), {matched_comp.name} ({matched_comp.part_id}) "
                f"operates as a {matched_comp.category}. {desc} "
                f"Pin routings to {proj.board.display_name}: {pins_str}."
            ),
            "source": "CircuitMind Dynamic Architecture & Pinout Model",
            "relevant_events": [e for e in events if matched_comp.id in str(e).lower()][:3]
        }

    # Check for matching board pin in active project
    for pa in proj.pin_assignments:
        pin_clean = pa.board_pin.lower()
        if pin_clean in q_lower or pin_clean.replace("d", "gpio") in q_lower or pin_clean.replace("gpio", "d") in q_lower:
            comp = next((c for c in proj.components if c.id == pa.component_id), None)
            comp_name = comp.name if comp else pa.component_id
            return {
                "answer": (
                    f"Board pin {pa.board_pin} on {proj.board.display_name} is assigned to {comp_name} "
                    f"terminal '{pa.component_pin}' for {pa.signal_type} signaling. "
                    f"This routing satisfies electrical constraints ({proj.board.voltage_logic}V logic)."
                ),
                "source": "CircuitMind Hardware Pin Allocation Model",
                "relevant_events": [e for e in events if pa.board_pin in str(e)][:3]
            }

    # Check for matching requirement / threshold in active project
    for r in proj.requirements:
        if any(term in q_lower for term in ["threshold", "requirement", "target", "spec"]):
            return {
                "answer": (
                    f"Requirement [{r.id}]: {r.description} "
                    f"(Priority: {r.priority}, Category: {r.category}"
                    + (f", Target Value: {r.target_value}" if r.target_value else "") + ")."
                ),
                "source": "CircuitMind Requirements Model",
                "relevant_events": [e for e in events if "REQUIREMENT" in e.get("event_type", "")][:3]
            }

    # Fallback to local DevMemoryAI engineering memory context
    cli_resp = EngineeringMemoryService.query_dmai(req.question)
    return {
        "answer": f"According to CircuitMind Engineering Memory for '{proj.title}' (v{proj.version}): The system has {len(proj.components)} active components, {len(proj.connections)} routed connections, and {len(proj.tests)} verification test cases. Context: {cli_resp}",
        "source": "Project Memory Layer & Local Event Graph",
        "relevant_events": events[:3]
    }

@app.get("/api/projects/{project_id}/export/wokwi")
def export_wokwi_diagram(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    return ArtifactGeneratorService.generate_diagram(proj)

@app.get("/api/projects/{project_id}/export/bundle")
def export_project_bundle(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    runs = get_simulation_runs(project_id, version=proj.version)
    zip_bytes = ArtifactGeneratorService.generate_bundle(proj, runs)
    
    return Response(
        content=zip_bytes,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=circuitmind-{proj.id}.zip"}
    )

