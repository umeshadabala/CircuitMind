import io
import zipfile
import json
from typing import Dict, Any, Optional
from fastapi import FastAPI, HTTPException, Response
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from backend.app.config import settings
from backend.app.database.db import (
    init_db, save_project, get_project, list_projects,
    save_simulation_run, get_simulation_runs
)
from backend.app.models.project import Project, SimulationRun
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.catalog.boards import BOARDS
from backend.app.engine.planner import plan_project_from_prompt, create_smart_parking_sensor_project
from backend.app.engine.validator import validate_project_hardware
from backend.app.engine.generator import generate_wokwi_diagram, generate_firmware_code, generate_build_guide
from backend.app.engine.simulator import run_circuit_simulation
from backend.app.engine.debugger import inject_demo_defect, analyze_and_diagnose, apply_repair_patch, DebugDiagnosis
from backend.app.engine.memory_service import log_event, query_memory, ask_dmai_cli

app = FastAPI(
    title="CircuitMind API",
    version=settings.version,
    description="AI-Native Engineering IDE for Physical Systems"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    init_db()

@app.get("/api/health")
def health_check():
    return {
        "status": "healthy",
        "app": settings.app_name,
        "version": settings.version,
        "tagline": settings.tagline,
        "ai_mode": "Local Engineering Engine (Deterministic & Fast)",
        "dmai_memory": "active"
    }

@app.get("/api/catalog/components")
def get_components():
    return COMPONENTS_CATALOG

@app.get("/api/catalog/boards")
def get_boards():
    return BOARDS

class PlanRequest(BaseModel):
    prompt: str
    existing_project_id: Optional[str] = None

@app.post("/api/projects/plan")
def plan_project(req: PlanRequest):
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
        log_event(
            project_id=project.id,
            event_type="PROJECT_MODIFIED",
            summary=f"Project modified based on prompt: '{req.prompt}'",
            rationale="User requested parameter or design modification.",
            payload={"prompt": req.prompt, "new_version": project.version},
            project_version=project.version
        )
    else:
        log_event(
            project_id=project.id,
            event_type="PROJECT_CREATED",
            summary=f"Project created: {project.title}",
            rationale="Initial requirements planned from natural-language specification.",
            payload={"prompt": req.prompt, "board": project.board.type},
            project_version=project.version
        )
        
        for req_item in project.requirements:
            log_event(
                project_id=project.id,
                event_type="REQUIREMENT_ADDED",
                summary=f"Requirement added: {req_item.description}",
                payload=req_item.model_dump(),
                related_entity_id=req_item.id,
                project_version=project.version
            )
            
        for comp in project.components:
            log_event(
                project_id=project.id,
                event_type="COMPONENT_SELECTED",
                summary=f"Selected hardware component: {comp.name} ({comp.part_id})",
                payload=comp.model_dump(),
                related_entity_id=comp.id,
                project_version=project.version
            )

        log_event(
            project_id=project.id,
            event_type="VALIDATION_EXECUTED",
            summary=f"Hardware validator evaluated project: Status '{project.validation.status}'",
            payload={"issues_count": len(project.validation.issues)},
            project_version=project.version
        )
        
    return project

@app.get("/api/projects")
def get_all_projects():
    return list_projects()

@app.get("/api/projects/{project_id}")
def get_one_project(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    return data

@app.post("/api/projects/{project_id}/validate")
def validate_project_endpoint(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    validation = validate_project_hardware(proj)
    proj.validation = validation
    save_project(proj.model_dump())
    
    log_event(
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
    
    sim_run = run_circuit_simulation(proj)
    save_simulation_run(sim_run.model_dump())
    
    # Update project simulation status
    proj.sim_status = sim_run.status
    save_project(proj.model_dump())
    
    # Record memory
    log_event(
        project_id=proj.id,
        event_type="SIMULATION_RUN",
        summary=f"Simulation {sim_run.id} finished: {sim_run.status.upper()} ({sim_run.summary})",
        rationale="Behavioral test loop execution against simulated physical constraints.",
        payload={
            "run_id": sim_run.id,
            "test_results": [t.model_dump() for t in sim_run.test_results],
            "serial_log_count": len(sim_run.serial_logs)
        },
        related_entity_id=sim_run.id,
        project_version=proj.version
    )
    
    return sim_run

@app.get("/api/projects/{project_id}/simulation-runs")
def get_project_simulation_runs(project_id: str):
    return get_simulation_runs(project_id)

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
    
    log_event(
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
        
    log_event(
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
        type(proj.firmware[0])(filename="sketch.ino", code=generate_firmware_code(repaired), language="cpp", version=repaired.version)
    ]
    repaired.build_guide = generate_build_guide(repaired)
    repaired.validation = validate_project_hardware(repaired)
    
    save_project(repaired.model_dump())
    
    log_event(
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
    return query_memory(project_id=project_id, event_type=event_type, search=search)

class DmaiAskRequest(BaseModel):
    question: str

@app.post("/api/projects/{project_id}/dmai/ask")
def ask_dmai_endpoint(project_id: str, req: DmaiAskRequest):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    q_lower = req.question.lower()
    
    # 1. Inspect project entities and history directly
    events = query_memory(project_id)
    
    if "oled" in q_lower or "gpio21" in q_lower or "gpio22" in q_lower:
        return {
            "answer": "The ESP32 default hardware I2C peripheral is assigned to GPIO21 (SDA) and GPIO22 (SCL). Connecting the SSD1306 OLED to these pins enables high-speed hardware bus communication (up to 400kHz) without software bit-banging overhead.",
            "source": "CircuitMind Hardware Knowledge Base & Architecture Model",
            "relevant_events": [e for e in events if "I2C" in e.get("summary", "") or "COMPONENT" in e.get("event_type", "")][:3]
        }
    elif "buzzer" in q_lower or "gpio19" in q_lower:
        return {
            "answer": f"The piezo buzzer is routed to Pin D19 (GPIO19) on the {proj.board.display_name}. This pin supports hardware PWM timer channels, which allows frequency tone generation without blocking CPU cycles.",
            "source": "CircuitMind Pin Assignment Model",
            "relevant_events": [e for e in events if "buzzer" in e.get("summary", "").lower()][:3]
        }
    elif "threshold" in q_lower or "20" in q_lower or "50" in q_lower:
        # Check current threshold
        threshold_val = 20.0
        for r in proj.requirements:
            if "50" in r.description:
                threshold_val = 50.0
            elif "20" in r.description:
                threshold_val = 20.0
        return {
            "answer": f"The current obstacle threshold is set to {threshold_val:.1f} cm (defined in Requirement req-002 and firmware constant DISTANCE_THRESHOLD_CM). When distance is below this value, the control loop triggers optical and acoustic alert actuators.",
            "source": "Project Requirements Model & Firmware Artifact",
            "relevant_events": [e for e in events if "THRESHOLD" in e.get("summary", "") or "REQUIREMENT" in e.get("summary", "")][:3]
        }
    
    # Call dmai CLI as fallback / companion
    cli_resp = ask_dmai_cli(req.question)
    return {
        "answer": f"According to CircuitMind Engineering Memory for '{proj.title}' (v{proj.version}): The system has {len(proj.components)} active components, {len(proj.connections)} routed connections, and {len(proj.tests)} verification test cases. DevMemory context: {cli_resp}",
        "source": "DevMemoryAI CLI & Local SQLite Memory Log",
        "relevant_events": events[:3]
    }

@app.get("/api/projects/{project_id}/export/wokwi")
def export_wokwi_diagram(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    diagram = generate_wokwi_diagram(proj)
    return diagram

@app.get("/api/projects/{project_id}/export/bundle")
def export_project_bundle(project_id: str):
    data = get_project(project_id)
    if not data:
        raise HTTPException(status_code=404, detail="Project not found")
    proj = Project(**data)
    
    diagram = generate_wokwi_diagram(proj)
    firmware_code = proj.firmware[0].code if proj.firmware else ""
    runs = get_simulation_runs(project_id)
    
    # Create ZIP in-memory
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("project.json", json.dumps(proj.model_dump(), indent=2))
        zf.writestr("diagram.json", json.dumps(diagram, indent=2))
        zf.writestr("firmware/sketch.ino", firmware_code)
        zf.writestr("tests/tests.json", json.dumps([t.model_dump() for t in proj.tests], indent=2))
        
        # Guide
        guide_md = f"# {proj.title} - Build Guide\n\n{proj.build_guide.summary if proj.build_guide else ''}\n\n## Steps\n"
        if proj.build_guide:
            for s in proj.build_guide.steps:
                guide_md += f"### Step {s.step_number}: {s.title}\n{s.instructions}\n**Expected Result:** {s.expected_result}\n\n"
        zf.writestr("documentation/BUILD_GUIDE.md", guide_md)
        
        # README
        readme_md = f"""# {proj.title}

AI-Native Engineering Project generated by CircuitMind.
Tagline: Think it. Build it. Prove it.

## Overview
{proj.description}

## Hardware Inventory
"""
        for comp in proj.components:
            readme_md += f"- **{comp.name}** (`{comp.part_id}`)\n"
            
        readme_md += f"""
## Simulation
Import `diagram.json` and `firmware/sketch.ino` into [Wokwi Simulator](https://wokwi.com) to execute in the browser.
"""
        zf.writestr("README.md", readme_md)
        
        if runs:
            zf.writestr("simulation/run-results.json", json.dumps(runs[0], indent=2))
            
    zip_buffer.seek(0)
    return Response(
        content=zip_buffer.getvalue(),
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename=circuitmind-{proj.id}.zip"}
    )
