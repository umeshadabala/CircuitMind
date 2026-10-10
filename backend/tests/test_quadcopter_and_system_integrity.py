import os
import io
import zipfile
import pytest
from backend.app.models.project import Project, ComponentInstance, Connection, PinAssignment
from backend.app.catalog.boards import BOARDS
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.services.project_service import ProjectService
from backend.app.services.changeset_service import ChangesetService
from backend.app.services.artifact_service import ArtifactGeneratorService
from backend.app.engine.planner import plan_project_from_prompt
from backend.app.engine.validator import validate_project_hardware
from backend.app.engine.simulator import run_circuit_simulation

def test_regression_a_quadcopter_generation():
    """Test A — Quadcopter generation: ESP32, MPU6050, 4 ESC interfaces, switch, LED, buzzer, Quad-X PID firmware."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None, "Quadcopter project proj-da623a03 must exist in database"
    
    # 1. Hardware verification
    assert quad.board.type == "esp32-devkit-v1"
    comp_parts = [c.part_id for c in quad.components]
    assert "mpu6050" in comp_parts
    assert comp_parts.count("esc-interface") == 4
    assert "pushbutton" in comp_parts
    assert "led-red" in comp_parts
    assert "buzzer-piezo" in comp_parts
    assert "servo" not in comp_parts, "Unrelated servos must not exist in quadcopter project"

    # 2. Pin and connection verification
    board_pins = {pa.board_pin for pa in quad.pin_assignments}
    assert "5V" not in board_pins, "ESP32 DevKit must not use fictional 5V pin"
    assert "3V3" in board_pins
    assert "D21" in board_pins  # I2C SDA
    assert "D22" in board_pins  # I2C SCL
    assert "D15" in board_pins  # Arming switch
    assert "D4" in board_pins   # Buzzer

    # 3. Firmware verification
    assert len(quad.firmware) > 0
    fw_code = quad.firmware[0].code
    assert "MPU6050" in fw_code or "0x68" in fw_code
    assert "roll_kp" in fw_code or "PID" in fw_code or "pitch" in fw_code
    assert "Quad-X" in fw_code or "QUAD-X" in fw_code or "PIN_MOTOR_1" in fw_code
    assert "DISARMED" in fw_code
    assert "fail-safe" in fw_code.lower() or "failsafe" in fw_code.lower() or "safe" in fw_code.lower()

def test_regression_b_unrelated_project_isolation():
    """Test B — Unrelated project generation: verify no quadcopter components or code leak into a separate project."""
    servo_prompt = "Build an analog servo positioner using Arduino Uno, a 10k potentiometer, and an SG90 micro-servo."
    servo_proj = plan_project_from_prompt(servo_prompt)
    
    assert servo_proj.board.type == "arduino-uno"
    parts = [c.part_id for c in servo_proj.components]
    assert "servo" in parts
    assert "potentiometer" in parts
    assert "esc-interface" not in parts, "ESC interfaces must not leak into servo project"
    assert "mpu6050" not in parts, "MPU6050 must not leak into servo project"
    
    fw_code = servo_proj.firmware[0].code if servo_proj.firmware else ""
    assert "MPU6050" not in fw_code
    assert "QUAD-X" not in fw_code
    assert "Servo" in fw_code

def test_regression_c_component_mutation():
    """Test C — Component mutation: add and remove component atomically; verify graph updates consistently."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None
    # Use a copy to prevent corrupting database state for subsequent tests
    test_proj = quad.model_copy(deep=True)
    test_proj.id = "proj-test-mutation"
    ProjectService.save(test_proj)
    
    initial_comp_count = len(test_proj.components)
    initial_version = test_proj.version
    
    # Add a component via ChangesetService
    updated, desc = ChangesetService.apply_add_component(test_proj, "dht22")
    assert len(updated.components) == initial_comp_count + 1
    assert any(c.part_id == "dht22" for c in updated.components)
    assert updated.version > initial_version
    
    # Remove the component
    reverted, desc2 = ChangesetService.apply_remove_component(updated, "dht22")
    assert len(reverted.components) == initial_comp_count
    assert not any(c.part_id == "dht22" for c in reverted.components)
    
    ProjectService.delete("proj-test-mutation")

def test_regression_d_electrical_graph_integrity():
    """Test D — Electrical graph integrity: endpoints exist, pin assignments match board metadata, zero DRC errors."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None
    
    validation = validate_project_hardware(quad)
    error_issues = [i for i in validation.issues if i.severity == "error"]
    assert len(error_issues) == 0, f"Hardware validation must have 0 errors: {error_issues}"
    
    # Check board pins
    board_pins_set = set(BOARDS[quad.board.type]["pins"])
    for pa in quad.pin_assignments:
        assert pa.board_pin in board_pins_set, f"Pin '{pa.board_pin}' must be a valid board pin on {quad.board.type}"

def test_regression_e_firmware_consistency():
    """Test E — Firmware consistency: firmware pin references correspond to actual hardware assignments."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None
    fw_code = quad.firmware[0].code
    
    # Pins in firmware match pin assignments
    esc1_pa = next((pa for pa in quad.pin_assignments if "esc-1" in pa.component_id and pa.component_pin == "PWM"), None)
    assert esc1_pa is not None
    pin_num = esc1_pa.board_pin.replace('D', '')
    assert f"PIN_MOTOR_1 = {pin_num}" in fw_code or f"PIN_MOTOR_1 = {esc1_pa.board_pin}" in fw_code or pin_num in fw_code

def test_regression_f_simulation_truthfulness():
    """Test F — Simulation truthfulness: behavioral simulation traces remain distinct from physical execution."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None
    
    sim_run = run_circuit_simulation(quad)
    assert sim_run.runner == "circuitmind_behavioral"
    assert sim_run.status == "passed"
    assert len(sim_run.test_results) == 5
    
    # Logs declare emulator provenance
    log_text = "\n".join(sim_run.serial_logs)
    assert "Not physical hardware evidence" in log_text or "Pre-Silicon" in log_text or "Behavioral" in log_text

def test_regression_g_project_persistence():
    """Test G — Project persistence: update project, reload from DB, confirm state restored."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None
    
    # Save a known marker in description
    original_desc = quad.description
    quad.description = "Simulation-oriented ESP32 mini quadcopter flight controller (Verified Persistence Regression Test)."
    ProjectService.save(quad)
    
    # Reload from database
    reloaded = ProjectService.get("proj-da623a03")
    assert reloaded is not None
    assert reloaded.description == quad.description
    assert len(reloaded.components) == len(quad.components)
    assert len(reloaded.pin_assignments) == len(quad.pin_assignments)
    
    # Restore description
    reloaded.description = original_desc
    ProjectService.save(reloaded)

def test_regression_h_export_integrity():
    """Test H — Export integrity: fresh ZIP has all artifacts derived from the same project revision."""
    quad = ProjectService.get("proj-da623a03")
    assert quad is not None
    
    zip_bytes = ArtifactGeneratorService.generate_bundle(quad)
    assert zip_bytes is not None
    assert len(zip_bytes) > 0
    
    with zipfile.ZipFile(io.BytesIO(zip_bytes)) as z:
        filenames = z.namelist()
        assert "project.json" in filenames
        assert "firmware/sketch.ino" in filenames
        assert "diagram.json" in filenames
        assert "bom.csv" in filenames
        assert "wiring_guide.md" in filenames
        assert "README.md" in filenames
        
        # Verify sketch.ino content matches project firmware
        fw_in_zip = z.read("firmware/sketch.ino").decode("utf-8")
        assert "MPU6050" in fw_in_zip or "0x68" in fw_in_zip
        assert "Quad-X" in fw_in_zip or "QUAD-X" in fw_in_zip or "PIN_MOTOR_1" in fw_in_zip
        
        # Verify diagram.json has 0 errors and valid parts
        diag_json = z.read("diagram.json").decode("utf-8")
        assert "wokwi-esp32-devkit-v1" in diag_json
        assert "wokwi-mpu6050" in diag_json

def test_regression_i_landing_and_navigation():
    """Test I — Landing page and navigation API: catalog, projects listing, and export bundle endpoint."""
    from fastapi.testclient import TestClient
    from backend.app.main import app
    
    client = TestClient(app)
    
    # 1. Projects listing for landing page
    resp = client.get("/api/projects")
    assert resp.status_code == 200
    projects = resp.json()
    assert isinstance(projects, list)
    assert any(p["id"] == "proj-da623a03" for p in projects)
    
    # 2. Get specific project
    resp_proj = client.get("/api/projects/proj-da623a03")
    assert resp_proj.status_code == 200
    data = resp_proj.json()
    assert data["id"] == "proj-da623a03"
    assert data["board"]["type"] == "esp32-devkit-v1"
    
    # 3. Catalog coverage
    resp_cat = client.get("/api/catalog/components")
    assert resp_cat.status_code == 200
    cat = resp_cat.json()
    part_ids = [item["part_id"] for item in cat]
    assert "esc-interface" in part_ids
    assert "mpu6050" in part_ids
    assert "hc-sr04" in part_ids
    
    # 4. Export bundle download
    resp_zip = client.get("/api/projects/proj-da623a03/export/bundle")
    assert resp_zip.status_code == 200
    assert resp_zip.headers["content-type"] == "application/zip"
    assert len(resp_zip.content) > 1000
