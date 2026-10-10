import pytest
import uuid
from backend.app.models.project import Project, ComponentInstance
from backend.app.engine.planner import create_smart_parking_sensor_project, plan_project_from_prompt
from backend.app.services.project_service import ProjectService
from backend.app.services.changeset_service import ChangesetService
from backend.app.services.memory_service import EngineeringMemoryService
from backend.app.services.artifact_service import ArtifactGeneratorService
from backend.app.engine.simulator import run_circuit_simulation
from backend.app.database.db import save_simulation_run, get_simulation_runs

@pytest.fixture
def parking_project() -> Project:
    p_id = f"test-chat-{uuid.uuid4().hex[:8]}"
    proj = create_smart_parking_sensor_project(project_id=p_id, threshold_cm=20.0)
    ProjectService.save(proj)
    return proj

def test_explanatory_chat_does_not_mutate_project(parking_project):
    """Rule 2: Explanatory questions must NOT mutate the project state or bump version."""
    orig_version = parking_project.version
    orig_comp_count = len(parking_project.components)
    orig_conn_count = len(parking_project.connections)

    result = ChangesetService.classify_and_handle_message(
        project_id=parking_project.id,
        message="Why did you select pin D5 for the ultrasonic sensor?",
        current_project=parking_project
    )

    assert result["intent"] == "explain"
    assert result["action_applied"] is False
    assert result["updated_project"] is None
    assert len(result["message"]) > 10

    # Verify persisted project in DB remains untouched
    fresh = ProjectService.get(parking_project.id)
    assert fresh is not None
    assert fresh.version == orig_version
    assert len(fresh.components) == orig_comp_count
    assert len(fresh.connections) == orig_conn_count

def test_chat_add_component_updates_graph_and_firmware(parking_project):
    """Rule 2 & 4 & 5 & 6: Adding a component via chat updates graph, pins, connections, firmware, and BOM."""
    orig_version = parking_project.version
    
    # Request adding a servo motor to the parking sensor
    result = ChangesetService.classify_and_handle_message(
        project_id=parking_project.id,
        message="Add a servo motor to act as a barrier gate.",
        current_project=parking_project
    )

    assert result["intent"] == "add_component"
    assert result["action_applied"] is True
    assert result["updated_project"] is not None

    updated = Project(**result["updated_project"])
    assert updated.version == orig_version + 1

    # Check component graph contains servo
    servo_comp = next((c for c in updated.components if "servo" in c.part_id.lower()), None)
    assert servo_comp is not None, "Servo component must be present in project graph"

    # Check pins and connections exist for servo
    servo_pins = [pa for pa in updated.pin_assignments if pa.component_id == servo_comp.id]
    assert len(servo_pins) >= 2, "Servo must have power and signal pin assignments"

    servo_conns = [c for c in updated.connections if c.to_component == servo_comp.id or c.from_component == servo_comp.id]
    assert len(servo_conns) >= 2, "Servo must have power and signal wiring connections"

    # Check firmware reflects servo
    assert len(updated.firmware) > 0
    fw_code = updated.firmware[0].code
    assert "servo" in fw_code.lower()

    # Check BOM includes servo
    bundle = ArtifactGeneratorService.generate_export_bundle(updated)
    assert "servo" in bundle["bom.json"].lower()

    # Verify DMAI recorded event
    events = EngineeringMemoryService.query(project_id=parking_project.id)
    assert any("servo" in e.get("summary", "").lower() for e in events)

def test_chat_remove_component_purges_wires_and_graph(parking_project):
    """Rule 4 & 6: Deleting a component removes it and purges all referencing connections."""
    orig_version = parking_project.version
    # Find buzzer in original project
    buzzer_inst = next((c for c in parking_project.components if "buzzer" in c.part_id.lower()), None)
    assert buzzer_inst is not None

    result = ChangesetService.classify_and_handle_message(
        project_id=parking_project.id,
        message="Remove the buzzer from the circuit.",
        current_project=parking_project
    )

    assert result["intent"] == "remove_component"
    assert result["action_applied"] is True
    assert result["updated_project"] is not None

    updated = Project(**result["updated_project"])
    assert updated.version == orig_version + 1

    # Ensure buzzer is gone from components
    assert not any("buzzer" in c.part_id.lower() for c in updated.components)

    # Ensure NO connections reference the deleted buzzer instance
    referencing_conns = [
        c for c in updated.connections 
        if c.from_component == buzzer_inst.id or c.to_component == buzzer_inst.id
    ]
    assert len(referencing_conns) == 0, "No connections may reference deleted component"

    # Ensure NO pin assignments reference the deleted buzzer instance
    referencing_pins = [
        pa for pa in updated.pin_assignments 
        if pa.component_id == buzzer_inst.id
    ]
    assert len(referencing_pins) == 0, "No pin assignments may reference deleted component"

def test_chat_threshold_modification_updates_requirements_and_firmware(parking_project):
    """Rule 4 & 5: Modifying a threshold updates requirement, tests, and firmware constant."""
    orig_version = parking_project.version
    result = ChangesetService.classify_and_handle_message(
        project_id=parking_project.id,
        message="Change the warning distance threshold to 45 cm.",
        current_project=parking_project
    )

    assert result["intent"] == "modify_threshold"
    assert result["action_applied"] is True
    assert result["updated_project"] is not None

    updated = Project(**result["updated_project"])
    assert updated.version == orig_version + 1

    # Requirements updated with 45 cm
    assert any("45" in r.description or r.target_value == "45.0" for r in updated.requirements)

    # Firmware updated with 45.0
    fw_code = updated.firmware[0].code
    assert "45.0" in fw_code or "45" in fw_code

def test_simulation_run_isolated_to_project_and_version(parking_project):
    """Rule 8: Simulation runs and logs must be strictly isolated by project and version."""
    # Run simulation on parking project
    sim_a = run_circuit_simulation(parking_project)
    save_simulation_run(sim_a.model_dump())

    # Create a separate project (e.g. Servo only)
    servo_pid = f"test-servo-{uuid.uuid4().hex[:8]}"
    servo_proj = plan_project_from_prompt("Simple servo sweep on Arduino Uno")
    servo_proj.id = servo_pid
    ProjectService.save(servo_proj)

    sim_b = run_circuit_simulation(servo_proj)
    save_simulation_run(sim_b.model_dump())

    # Verify Project A logs don't contain Project B data
    assert any("ultrasonic" in log.lower() or "distance" in log.lower() for log in sim_a.serial_logs)
    assert not any("sweep" in log.lower() for log in sim_a.serial_logs)

    # Verify Project B logs don't contain Ultrasonic distance readings
    assert not any("ultrasonic" in log.lower() or "hc-sr04" in log.lower() for log in sim_b.serial_logs)

    # Query DB runs for Project A
    runs_a = get_simulation_runs(parking_project.id, version=parking_project.version)
    assert len(runs_a) >= 1
    assert all(r["project_id"] == parking_project.id for r in runs_a)

    # Query DB runs for Project B
    runs_b = get_simulation_runs(servo_pid, version=servo_proj.version)
    assert len(runs_b) >= 1
    assert all(r["project_id"] == servo_pid for r in runs_b)

def test_export_bundle_contains_matching_project_version(parking_project):
    """Rule 13: Exported artifacts must match the saved project version."""
    bundle = ArtifactGeneratorService.generate_export_bundle(parking_project)
    
    assert "project.json" in bundle
    assert "sketch.ino" in bundle
    assert "diagram.json" in bundle
    assert "bom.json" in bundle

    import json
    proj_meta = json.loads(bundle["project.json"])
    assert proj_meta["version"] == parking_project.version
    assert proj_meta["id"] == parking_project.id
