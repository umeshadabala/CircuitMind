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
    
    assert project.title == "Smart Parking Sensor"
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
