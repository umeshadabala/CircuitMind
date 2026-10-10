import pytest
import os
from unittest.mock import patch
from fastapi.testclient import TestClient
from backend.app.config import settings
from backend.app.main import app
from backend.app.models.project import Project
from backend.app.engine.planner import plan_project_from_prompt
from backend.app.engine.llm import ProjectGenerationError, execute_llm_generation
from backend.app.services.wokwi_service import WokwiSimulationService
from backend.app.services.artifact_service import ArtifactGeneratorService

SERVO_PROMPT = "Build me a simple project to run servo motors using Arduino (Priority: required, Category: sensing)."

@pytest.fixture(scope="module")
def servo_project():
    """Executes the full pipeline via plan_project_from_prompt using Ollama gpt-oss:120b-cloud."""
    return plan_project_from_prompt(SERVO_PROMPT)

def test_condition_1_servo_request_does_not_generate_parking_sensor(servo_project):
    """Rule 9.1: A servo request must not generate an unrelated parking-sensor project."""
    assert "parking" not in servo_project.title.lower()
    assert "parking" not in servo_project.description.lower()
    assert any("servo" in comp.name.lower() or comp.part_id == "servo" for comp in servo_project.components)

def test_condition_2_selected_board_is_arduino_uno(servo_project):
    """Rule 9.2: Selected board matches project specification (arduino-uno)."""
    assert servo_project.board.type == "arduino-uno"
    assert "Arduino Uno" in servo_project.board.display_name
    assert "AVR" in servo_project.board.architecture
    assert servo_project.board.voltage_logic == 5.0

def test_condition_3_requested_servo_component_in_graph(servo_project):
    """Rule 9.3: Requested servo component (part_id == 'servo') appears in project graph."""
    servo_comps = [c for c in servo_project.components if c.part_id == "servo"]
    assert len(servo_comps) >= 1
    servo = servo_comps[0]
    assert servo.pins == ["GND", "V+", "PWM"]

def test_condition_4_unrequested_components_not_injected(servo_project):
    """Rule 9.4: Unrequested components (hc-sr04, led, buzzer) are not injected."""
    part_ids = {c.part_id for c in servo_project.components}
    assert "hc-sr04" not in part_ids
    assert "led" not in part_ids
    assert "led-green" not in part_ids
    assert "led-red" not in part_ids
    assert "buzzer" not in part_ids

def test_condition_5_wokwi_diagram_reflects_persisted_graph(servo_project):
    """Rule 9.5: Wokwi diagram reflects persisted project graph and lints cleanly."""
    diagram = ArtifactGeneratorService.generate_diagram(servo_project)
    
    # Verify parts
    board_part = next((p for p in diagram["parts"] if p["id"] == "board"), None)
    assert board_part is not None
    assert board_part["type"] == "wokwi-arduino-uno"
    
    servo_part = next((p for p in diagram["parts"] if "servo" in p["id"]), None)
    assert servo_part is not None
    assert servo_part["type"] == "wokwi-servo"

    # Verify linting passes
    lint_res = WokwiSimulationService.lint_diagram(servo_project)
    assert lint_res["valid"] is True

def test_condition_6_firmware_generation_uses_servo_h(servo_project):
    """Rule 9.6: Firmware generation uses <Servo.h>, pin 9, and sweep loop."""
    assert len(servo_project.firmware) > 0
    fw = servo_project.firmware[0]
    assert "#include <Servo.h>" in fw.code
    assert "myServo.attach" in fw.code
    assert "myServo.write" in fw.code
    assert "pos <= 180" in fw.code
    assert "pos >= 0" in fw.code

def test_condition_7_provider_failure_raises_error_not_fake_project():
    """Rule 9.7: If provider fails, raises ProjectGenerationError and HTTP 502 without fake project."""
    client = TestClient(app)
    with patch("backend.app.engine.planner.execute_llm_generation") as mock_llm:
        mock_llm.side_effect = ProjectGenerationError("Connection refused to LLM provider")
        resp = client.post("/api/projects/plan", json={"prompt": "Custom robotic arm with servo"})
        assert resp.status_code == 502
        data = resp.json()
        assert "Connection refused" in data["detail"]

def test_condition_8_preserves_requirements_and_metadata(servo_project):
    """Rule 9.10: Requirement priority 'required' and category 'sensing' are preserved."""
    reqs = servo_project.requirements
    assert len(reqs) >= 1
    first_req = reqs[0]
    assert first_req.priority == "required"
    assert first_req.category == "sensing"
    assert "servo" in first_req.description.lower()

def test_condition_9_verified_llm_audit_trail(servo_project):
    """Rule 1: Verify real LLM provider was called and recorded in generation_metadata."""
    audit = servo_project.generation_metadata.get("llm_audit")
    assert audit is not None
    assert audit["provider"] == settings.llm_provider
    assert audit["model"] == settings.ollama_model
    assert audit["request_sent"] is True
    assert audit["provider_status"] == 200
    assert audit["duration_ms"] > 0
    assert audit["response_parsed"] is True
    assert audit["schema_validated"] is True
    assert audit["persisted"] is True

def test_condition_10_env_configuration_usage():
    """Verify that settings are loaded from .env and used properly."""
    assert settings.llm_provider == "ollama"
    assert settings.ollama_model == "gpt-oss:120b-cloud"
    assert settings.ollama_base_url == "http://localhost:11434"
    assert settings.wokwi_cli_path != ""
    assert settings.wokwi_cli_token != ""
    assert settings.wokwi_timeout_seconds >= 10


FALL_DETECTION_PROMPT = "ESP32 Fall Detection with Buzzer Alarm using MPU6050 accelerometer"

@pytest.fixture(scope="module")
def fall_detection_project():
    return plan_project_from_prompt(FALL_DETECTION_PROMPT)

def test_fall_detection_preserves_mpu6050_and_buzzer(fall_detection_project):
    """Step 2: MPU-6050 must not be silently dropped; buzzer must be present."""
    part_ids = {c.part_id for c in fall_detection_project.components}
    assert "mpu6050" in part_ids, "MPU6050 must be preserved in component graph"
    assert "buzzer-piezo" in part_ids, "Buzzer must be preserved in component graph"
    assert fall_detection_project.board.type == "esp32-devkit-v1"
    assert "ESP32" in fall_detection_project.board.display_name

def test_fall_detection_valid_cpp_identifiers_and_algorithm(fall_detection_project):
    """Step 4: Firmware must use valid C++ identifiers (no PIN_PROJ-... or hyphens) and implement real fall detection."""
    assert len(fall_detection_project.firmware) > 0
    fw_code = fall_detection_project.firmware[0].code

    # Assert NO malformed identifiers with UUIDs or hyphens
    import re
    assert "PIN_PROJ-" not in fw_code
    assert not re.search(r"PIN_[A-Za-z0-9_]*-[A-Za-z0-9_]*", fw_code), "Identifiers must not contain hyphens"

    # Assert typed pin declarations or valid C++ constants
    assert "constexpr uint8_t" in fw_code or "const uint8_t" in fw_code or "#define" in fw_code

    # Assert MPU6050 I2C initialization & algorithm
    assert "#include <Wire.h>" in fw_code
    assert "0x68" in fw_code  # I2C default address
    assert "0x6B" in fw_code  # Power management wake register
    assert "FREE_FALL_THRESHOLD_G" in fw_code or "freefall" in fw_code.lower()
    assert "IMPACT_THRESHOLD_G" in fw_code or "impact" in fw_code.lower()
    assert "buzzer" in fw_code.lower()

def test_fall_detection_wokwi_diagram_lint_passes(fall_detection_project):
    """Diagram must contain wokwi-mpu6050, board, and buzzer, and pass Wokwi CLI lint."""
    diagram = ArtifactGeneratorService.generate_diagram(fall_detection_project)
    part_types = {p["type"] for p in diagram["parts"]}
    assert "wokwi-esp32-devkit-v1" in part_types
    assert "wokwi-mpu6050" in part_types
    assert "wokwi-buzzer" in part_types

    lint_res = WokwiSimulationService.lint_diagram(fall_detection_project)
    assert lint_res["valid"] is True, f"Wokwi diagram lint failed: {lint_res.get('issues')}"

def test_fall_detection_test_cases(fall_detection_project):
    """Test cases must specifically verify free-fall and impact alarm."""
    test_ids = [t.id for t in fall_detection_project.tests]
    assert any("freefall" in tid for tid in test_ids)
    assert any("impact" in tid for tid in test_ids)

def test_led_blinking_generation_no_unrelated_components():
    """LED blinking prompt generates only LED and resistor on board, no ultrasonic or buzzer."""
    proj = plan_project_from_prompt("Simple LED blinking project using Arduino Uno")
    assert proj.board.type == "arduino-uno"
    part_ids = {c.part_id for c in proj.components}
    assert any("led" in pid for pid in part_ids)
    assert "hc-sr04" not in part_ids
    assert "buzzer-piezo" not in part_ids
    assert "servo" not in part_ids
    fw = proj.firmware[0].code
    assert "digitalWrite" in fw

def test_uncatalogued_component_preserved_as_unresolved():
    """Uncatalogued components must not be silently ignored; must be retained as unresolved."""
    proj = plan_project_from_prompt("Build a custom monitor using an esp32 with bme680 environmental gas sensor")
    # bme680 is not currently in the catalog; must be marked as unresolved
    has_unresolved_req = any("bme680" in r.description.lower() and r.status == "unresolved" for r in proj.requirements)
    has_unresolved_list = any("bme680" in u.lower() for u in proj.unresolved_requirements)
    assert has_unresolved_req or has_unresolved_list, "Uncatalogued part bme680 must be tracked as unresolved"

def test_export_bundle_consistency(fall_detection_project):
    """Step 3: Graph, diagram, BOM, firmware, and assembly guide must describe the exact same project."""
    bundle = ArtifactGeneratorService.generate_export_bundle(fall_detection_project)
    assert "sketch.ino" in bundle
    assert "diagram.json" in bundle
    assert "bom.json" in bundle
    assert "README.md" in bundle

    import json
    bom = json.loads(bundle["bom.json"])
    assert any(item["part_id"] == "mpu6050" for item in bom["components"])
    assert any("buzzer" in item["part_id"] for item in bom["components"])

