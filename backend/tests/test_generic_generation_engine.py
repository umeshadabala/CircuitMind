import pytest
import re
from unittest.mock import patch
from fastapi.testclient import TestClient

from backend.app.main import app
from backend.app.models.project import Project
from backend.app.engine.planner import plan_project_from_prompt
from backend.app.engine.llm import ProjectGenerationError
from backend.app.engine.generator import generate_firmware_code, generate_wokwi_diagram
from backend.app.services.changeset_service import ChangesetService
from backend.app.engine.simulator import run_circuit_simulation

client = TestClient(app)

def test_generic_engine_different_prompts_yield_different_graphs():
    """Ensure different user requests produce distinct, strictly derived project graphs."""
    # 1. Servo project
    proposal_servo = {
        "title": "Dual Servo Pan Tilt",
        "description": "Pan and tilt servo controller",
        "board_type": "arduino-uno",
        "requirements": [{"id": "req-001", "description": "Control dual servo motors", "priority": "required", "category": "actuation"}],
        "components": [
            {"id": "servo-pan", "part_id": "servo", "name": "SG90 Micro Servo 9g"},
            {"id": "pot-1", "part_id": "potentiometer", "name": "10k Potentiometer"}
        ],
        "pin_assignments": [
            {"component_id": "servo-pan", "component_pin": "PWM", "board_pin": "9", "signal_type": "PWM"},
            {"component_id": "pot-1", "component_pin": "SIG", "board_pin": "A0", "signal_type": "ANALOG_IN"}
        ]
    }
    with patch("backend.app.engine.planner.execute_llm_generation") as mock_llm:
        import json
        mock_llm.return_value = {
            "provider": "ollama",
            "model": "gpt-oss:120b-cloud",
            "status_code": 200,
            "response_text": json.dumps(proposal_servo)
        }
        proj_servo = plan_project_from_prompt("Dual servo pan tilt with potentiometer control on Arduino Uno")

    servo_part_ids = [c.part_id for c in proj_servo.components]
    assert "servo" in servo_part_ids
    assert "potentiometer" in servo_part_ids
    assert "mpu6050" not in servo_part_ids
    assert "hc-sr04" not in servo_part_ids
    assert "buzzer-piezo" not in servo_part_ids
    assert proj_servo.board.type == "arduino-uno"

    # 2. Environmental DHT22 monitor
    proposal_env = {
        "title": "ESP32 Temp Humidity Monitor",
        "description": "Temperature and humidity logging",
        "board_type": "esp32-devkit-v1",
        "requirements": [{"id": "req-001", "description": "Monitor temperature and humidity", "priority": "required", "category": "sensing"}],
        "components": [
            {"id": "dht-1", "part_id": "dht22", "name": "DHT22 Sensor"},
            {"id": "oled-1", "part_id": "oled-ssd1306", "name": "OLED Display"}
        ],
        "pin_assignments": [
            {"component_id": "dht-1", "component_pin": "SDA", "board_pin": "D4", "signal_type": "DIGITAL_IN"},
            {"component_id": "oled-1", "component_pin": "SDA", "board_pin": "D21", "signal_type": "I2C_SDA"},
            {"component_id": "oled-1", "component_pin": "SCL", "board_pin": "D22", "signal_type": "I2C_SCL"}
        ]
    }
    with patch("backend.app.engine.planner.execute_llm_generation") as mock_llm:
        mock_llm.return_value = {
            "provider": "ollama",
            "model": "gpt-oss:120b-cloud",
            "status_code": 200,
            "response_text": json.dumps(proposal_env)
        }
        proj_env = plan_project_from_prompt("ESP32 temperature and humidity logger with OLED screen")

    env_part_ids = [c.part_id for c in proj_env.components]
    assert "dht22" in env_part_ids
    assert "oled-ssd1306" in env_part_ids
    assert "servo" not in env_part_ids
    assert "hc-sr04" not in env_part_ids
    assert "mpu6050" not in env_part_ids
    assert proj_env.board.type == "esp32-devkit-v1"

    # Verify firmware is generated specifically for each without template leakage
    fw_servo = proj_servo.firmware[0].code
    assert "#include <Servo.h>" in fw_servo
    assert "dht" not in fw_servo.lower()
    assert "oled" not in fw_servo.lower()

    fw_env = proj_env.firmware[0].code
    assert "#include <DHT.h>" in fw_env
    assert "#include <Adafruit_SSD1306.h>" in fw_env
    assert "servo" not in fw_env.lower()

def test_unrequested_components_never_injected():
    """Verify that unrequested components (e.g. buzzer, MPU6050) are never injected."""
    proposal_button_led = {
        "title": "Button Triggered LED",
        "description": "Simple pushbutton toggles red LED",
        "board_type": "esp32-devkit-v1",
        "requirements": [{"id": "req-001", "description": "Toggle LED when button is pressed", "priority": "required", "category": "control"}],
        "components": [
            {"id": "btn-1", "part_id": "pushbutton", "name": "Push Button"},
            {"id": "led-1", "part_id": "led-red", "name": "Red LED"}
        ],
        "pin_assignments": [
            {"component_id": "btn-1", "component_pin": "2", "board_pin": "D15", "signal_type": "DIGITAL_IN"},
            {"component_id": "led-1", "component_pin": "A", "board_pin": "D23", "signal_type": "DIGITAL_OUT"}
        ]
    }
    with patch("backend.app.engine.planner.execute_llm_generation") as mock_llm:
        import json
        mock_llm.return_value = {
            "provider": "ollama",
            "model": "gpt-oss:120b-cloud",
            "status_code": 200,
            "response_text": json.dumps(proposal_button_led)
        }
        proj = plan_project_from_prompt("Simple push button toggles a red LED on ESP32")

    comp_parts = {c.part_id for c in proj.components}
    assert comp_parts == {"pushbutton", "led-red"}
    assert "buzzer-piezo" not in comp_parts
    assert "mpu6050" not in comp_parts
    assert "hc-sr04" not in comp_parts
    assert "dht22" not in comp_parts

def test_chat_action_updates_persisted_graph_and_firmware():
    """Verify chat modification modifies the active project graph and updates firmware."""
    proposal_base = {
        "title": "Base Red LED Circuit",
        "description": "Red LED on ESP32",
        "board_type": "esp32-devkit-v1",
        "requirements": [{"id": "req-001", "description": "Light up red LED", "priority": "required", "category": "display"}],
        "components": [{"id": "led-1", "part_id": "led-red", "name": "Red LED"}],
        "pin_assignments": [{"component_id": "led-1", "component_pin": "A", "board_pin": "D23", "signal_type": "DIGITAL_OUT"}]
    }
    with patch("backend.app.engine.planner.execute_llm_generation") as mock_llm:
        import json
        mock_llm.return_value = {
            "provider": "ollama",
            "model": "gpt-oss:120b-cloud",
            "status_code": 200,
            "response_text": json.dumps(proposal_base)
        }
        proj = plan_project_from_prompt("ESP32 with red LED")

    initial_version = proj.version
    # Now simulate user sending chat action: "Add green LED"
    res = ChangesetService.classify_and_handle_message(
        project_id=proj.id,
        message="Add a green LED to the circuit.",
        current_project=proj
    )
    assert res["action_applied"] is True
    updated = Project(**res["updated_project"])
    assert updated.version == initial_version + 1

    part_ids = [c.part_id for c in updated.components]
    assert "led-red" in part_ids
    assert "led-green" in part_ids

    # Firmware must now reflect both LEDs
    fw_code = updated.firmware[0].code
    assert "PIN_LED_1" in fw_code
    assert "PIN_LED_2" in fw_code

def test_failed_llm_request_does_not_return_canned_project():
    """Verify that provider failure raises genuine HTTP 502 error and never substitutes a canned project."""
    with patch("backend.app.engine.planner.execute_llm_generation") as mock_llm:
        mock_llm.side_effect = ProjectGenerationError("Ollama daemon unreachable on port 11434")
        resp = client.post("/api/projects/plan", json={"prompt": "Custom IoT garden irrigation"})
        assert resp.status_code == 502
        body = resp.json()
        assert "Planning failed" in body["detail"]
        assert "unreachable" in body["detail"]
        # Make sure no fake project was returned
        assert "components" not in body

def test_project_switching_isolation():
    """Verify distinct projects maintain completely isolated components and simulation results."""
    # Create project 1
    proj1 = Project(
        id="proj-iso-001",
        title="Project One Ultrasonic",
        description="HC-SR04 Proximity",
        board={"type": "esp32-devkit-v1", "display_name": "ESP32", "architecture": "Xtensa", "voltage_logic": 3.3, "voltage_supply": 5.0, "pins_available": ["D5", "D18"]},
        requirements=[],
        components=[{"id": "p1-sonar", "part_id": "hc-sr04", "name": "Ultrasonic Sensor", "category": "sensor", "pins": ["TRIG", "ECHO", "VCC", "GND"]}],
        pin_assignments=[{"component_id": "p1-sonar", "component_pin": "TRIG", "board_pin": "D5", "signal_type": "DIGITAL_OUT"}],
        connections=[],
        tests=[],
        version=1
    )

    # Create project 2
    proj2 = Project(
        id="proj-iso-002",
        title="Project Two Soil Monitor",
        description="Soil Moisture Sensing",
        board={"type": "esp32-devkit-v1", "display_name": "ESP32", "architecture": "Xtensa", "voltage_logic": 3.3, "voltage_supply": 5.0, "pins_available": ["D34"]},
        requirements=[],
        components=[{"id": "p2-soil", "part_id": "soil-moisture", "name": "Soil Moisture", "category": "sensor", "pins": ["AOUT", "VCC", "GND"]}],
        pin_assignments=[{"component_id": "p2-soil", "component_pin": "AOUT", "board_pin": "D34", "signal_type": "ANALOG_IN"}],
        connections=[],
        tests=[],
        version=1
    )

    sim1 = run_circuit_simulation(proj1)
    sim2 = run_circuit_simulation(proj2)

    # Verify sim1 logs contain HC-SR04 and NOT soil moisture
    assert any("HC-SR04" in log or "Ultrasonic" in log for log in sim1.serial_logs)
    assert not any("Soil Moisture" in log for log in sim1.serial_logs)

    # Verify sim2 logs contain Soil Moisture and NOT HC-SR04
    assert any("Soil Moisture" in log for log in sim2.serial_logs)
    assert not any("HC-SR04" in log or "Ultrasonic" in log for log in sim2.serial_logs)
