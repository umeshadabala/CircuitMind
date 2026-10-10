import pytest
from backend.app.models.project import Project
from backend.app.engine.planner import plan_project_from_prompt, create_smart_parking_sensor_project
from backend.app.engine.validator import validate_project_hardware
from backend.app.engine.generator import generate_wokwi_diagram, generate_firmware_code
from backend.app.engine.simulator import run_circuit_simulation
from backend.app.engine.debugger import inject_demo_defect, analyze_and_diagnose, apply_repair_patch
from backend.app.engine.memory_service import log_event, query_memory
from backend.app.database.db import init_db

def setup_module():
    init_db()

def test_smart_parking_sensor_generation():
    prompt = "Build a smart parking sensor using an ESP32. When an object is closer than 20 cm, activate a warning LED and buzzer. Explain the wiring and show me how to test it."
    project = plan_project_from_prompt(prompt)
    
    assert "parking" in project.title.lower()
    assert project.board.type == "esp32-devkit-v1"
    assert len(project.components) >= 3
    assert len(project.connections) >= 6
    assert len(project.firmware) > 0
    assert "sketch.ino" in project.firmware[0].filename
    assert "DISTANCE_THRESHOLD_CM = 20.0" in project.firmware[0].code
    assert len(project.tests) >= 2

def test_hardware_validator():
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    validation = validate_project_hardware(project)
    
    # Check that there are no fatal errors
    assert validation.status in ["validated", "warning", "info"]
    has_errors = any(i.severity == "error" for i in validation.issues)
    assert not has_errors

def test_wokwi_diagram_generation():
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    diagram = generate_wokwi_diagram(project)
    
    assert diagram["version"] == 1
    assert "parts" in diagram
    assert "connections" in diagram
    assert len(diagram["parts"]) >= 4
    
    # Check microcontroller board exists
    board_part = next((p for p in diagram["parts"] if p["id"] == "board"), None)
    assert board_part is not None
    assert board_part["type"] == "wokwi-esp32-devkit-v1"

def test_behavioral_simulation_and_verification():
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    sim_run = run_circuit_simulation(project)
    
    assert sim_run.status == "passed"
    assert len(sim_run.serial_logs) > 0
    assert len(sim_run.test_results) == 2
    
    close_test = next((t for t in sim_run.test_results if "close" in t.test_id.lower()), None)
    assert close_test is not None
    assert close_test.status == "passed"
    assert "HIGH" in close_test.observed

def test_project_modification():
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    updated = plan_project_from_prompt("Change the warning threshold to 50 cm.", existing_project=project)
    
    assert updated.version == 2
    assert "DISTANCE_THRESHOLD_CM = 50.0" in updated.firmware[0].code
    assert any("50" in req.description for req in updated.requirements)

def test_debugger_defect_and_repair_loop():
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    # 1. Inject defect (misassigned buzzer pin)
    defective = inject_demo_defect(project, defect_type="misassigned_buzzer_pin")
    
    # 2. Simulate defective project
    sim_run = run_circuit_simulation(defective)
    # The buzzer is on D4, but expected on D19
    
    # 3. Diagnose
    diagnosis = analyze_and_diagnose(defective, sim_run.test_results, defective.validation.issues)
    assert diagnosis is not None
    assert "buzzer" in diagnosis.affected_entities or "D19" in diagnosis.patch_diff
    
    # 4. Apply repair patch
    repaired = apply_repair_patch(defective, diagnosis)
    assert any(pa.component_id == "buzzer" and pa.board_pin == "D19" for pa in repaired.pin_assignments)

def test_engineering_memory():
    project_id = "test-mem-proj"
    log_event(
        project_id=project_id,
        event_type="DESIGN_DECISION",
        summary="Chose ESP32 over Arduino Uno for dual core speed",
        rationale="Enables concurrent sensor sampling and display rendering."
    )
    
    events = query_memory(project_id)
    assert len(events) >= 1
    assert events[0]["event_type"] == "DESIGN_DECISION"

def test_wokwi_simulation_service():
    from backend.app.services.wokwi_service import WokwiSimulationService
    from backend.app.services.artifact_service import ArtifactGeneratorService
    
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    
    # 1. Adapter Status
    status = WokwiSimulationService.get_adapter_status(project)
    assert "cli_installed" in status
    assert "token_configured" in status
    assert "setup_instructions" in status
    assert "embedding_policy" in status
    assert status["embedding_policy"]["embedded_iframe_supported"] is False
    
    # 2. Lint Diagram
    lint_result = WokwiSimulationService.lint_diagram(project)
    assert lint_result["valid"] is True
    assert lint_result["part_count"] >= 4
    assert lint_result["connection_count"] >= 6
    
    # 3. Simulator Handoff
    handoff = WokwiSimulationService.get_handoff_info(project)
    assert handoff["simulator_url"] == "https://wokwi.com"
    assert "diagram_json" in handoff
    assert "firmware_code" in handoff
    assert len(handoff["instructions"]) >= 4

    # 4. Simulation Execution
    sim_run = WokwiSimulationService.execute_simulation(project)
    assert sim_run.status in ["passed", "ready", "running", "failed", "error", "not_configured"]
    assert len(sim_run.serial_logs) > 0
    assert sim_run.duration_ms >= 0

def test_firmware_build_service():
    from backend.app.services.build_service import FirmwareBuildService
    
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    
    # Toolchain detection
    toolchain = FirmwareBuildService.detect_toolchain(project.board.type)
    assert "has_compiler" in toolchain
    assert "setup_instructions" in toolchain
    
    # Firmware linting
    lint = FirmwareBuildService.lint_firmware(project)
    assert lint["valid"] is True
    assert lint["line_count"] > 10

def test_component_catalog_service():
    from backend.app.services.catalog_service import ComponentCatalogService
    
    comps = ComponentCatalogService.list_components()
    assert len(comps) >= 5
    
    hc_sr04 = ComponentCatalogService.get_component("hc-sr04")
    assert hc_sr04 is not None
    assert hc_sr04["canonical_name"] == "HC-SR04 Ultrasonic Distance Sensor"
    assert hc_sr04["electrical_characteristics"]["voltage_typical"] == 5.0
    assert len(hc_sr04["pins"]) == 4
    assert hc_sr04["datasheet_url"] != ""

def test_project_crud_and_deletion():
    from backend.app.database.db import save_project, get_project, delete_project, list_projects
    
    project = create_smart_parking_sensor_project(project_id="crud-test-001", threshold_cm=30.0)
    save_project(project.model_dump())
    
    # Retrieve
    retrieved = get_project("crud-test-001")
    assert retrieved is not None
    assert retrieved["id"] == "crud-test-001"
    assert len(retrieved["components"]) >= 3
    
    # Delete
    deleted = delete_project("crud-test-001")
    assert deleted is True
    
    # Verify gone
    assert get_project("crud-test-001") is None
    # Verify second delete returns False
    assert delete_project("crud-test-001") is False

def test_opt_in_demo_seed():
    from backend.app.database.seed import seed_demo_project
    from backend.app.database.db import get_project, delete_project
    
    proj_parking = seed_demo_project("parking")
    assert proj_parking.id == "proj-smart-parking-esp32"
    assert "parking" in proj_parking.title.lower()
    
    proj_hospital = seed_demo_project("hospital")
    assert proj_hospital.id == "proj-hospital-monitor-esp32"
    assert "hospital" in proj_hospital.title.lower() or "patient" in proj_hospital.title.lower()
    
    # Cleanup
    delete_project("proj-smart-parking-esp32")
    delete_project("proj-hospital-monitor-esp32")

def test_api_endpoints_via_testclient():
    from fastapi.testclient import TestClient
    from backend.app.main import app
    from backend.app.database.db import delete_project
    
    client = TestClient(app)
    
    # 1. Health check
    res = client.get("/api/health")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "healthy"
    assert "ai_status" in data
    assert "ai_mode" in data
    
    # 2. Plan new project
    res = client.post("/api/projects/plan", json={"prompt": "Build an obstacle detection car with HC-SR04 and ESP32 at 25 cm"})
    assert res.status_code == 200
    proj_data = res.json()
    proj_id = proj_data["id"]
    assert proj_data["version"] == 1
    
    # 3. Simulate project
    res_sim = client.post(f"/api/projects/{proj_id}/simulate")
    assert res_sim.status_code == 200
    sim_data = res_sim.json()
    assert sim_data["status"] in ["passed", "ready", "running", "failed"]
    
    # 4. Ask DMAI endpoint
    res_dmai = client.post(f"/api/projects/{proj_id}/dmai/ask", json={"question": "What is the trigger threshold?"})
    assert res_dmai.status_code == 200
    dmai_answer = res_dmai.json()
    assert "answer" in dmai_answer
    assert "source" in dmai_answer
    
    # 5. Delete project
    res_del = client.delete(f"/api/projects/{proj_id}")
    assert res_del.status_code == 200
    
    # 6. Verify 404 after deletion
    res_404 = client.get(f"/api/projects/{proj_id}")
    assert res_404.status_code == 404




