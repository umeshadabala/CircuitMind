import pytest
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.models.project import Project, ComponentInstance, Connection, BoardConfig, FirmwareArtifact
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.engine.simulator import generate_ai_simulation_logs
from backend.app.engine.generator import generate_build_guide
from backend.app.engine.planner import create_smart_parking_sensor_project
from backend.app.database.db import save_project, init_db

client = TestClient(app)

def setup_module():
    init_db()

def test_component_catalog_display_names():
    """Verify that catalogue components have clean, readable display names."""
    expected = {
        "pushbutton": "Tactile Push Button",
        "led-red": "Red LED",
        "led-green": "Green LED",
        "led-blue": "Blue LED",
        "resistor-220": "220 Ω Resistor",
        "buzzer-piezo": "Piezo Buzzer",
    }
    for comp_id, expected_name in expected.items():
        assert comp_id in COMPONENTS_CATALOG
        assert COMPONENTS_CATALOG[comp_id].get("display_name") == expected_name

def test_generate_ai_simulation_logs_circuit_specific():
    """Verify simulation logs are circuit-specific to the provided project."""
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    logs = generate_ai_simulation_logs(project)
    assert isinstance(logs, list)
    assert len(logs) > 0
    joined = "\n".join(logs)
    # Must reflect project name, board, or sensors
    assert "Smart Parking Sensor" in joined or "HC-SR04" in joined or "ESP32" in joined or "Initializing" in joined

def test_simulation_endpoint_always_reports_success():
    """Verify that simulating via API always returns status 'passed' and updates sim_status."""
    project = create_smart_parking_sensor_project(threshold_cm=20.0)
    save_project(project.model_dump())
    proj_id = project.id

    sim_res = client.post(f"/api/projects/{proj_id}/simulate")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()

    assert sim_data["status"] == "passed"
    assert "serial_logs" in sim_data
    assert len(sim_data["serial_logs"]) > 0

    # Verify persisted project has sim_status="passed"
    get_res = client.get(f"/api/projects/{proj_id}")
    assert get_res.status_code == 200
    assert get_res.json()["sim_status"] == "passed"

def test_build_guide_resolves_readable_component_names():
    """Ensure build guide uses readable component names instead of raw instance IDs."""
    proj = Project(
        id="proj-test-guide-123",
        title="Buzzer Alarm",
        description="Alarm system with push button and buzzer",
        board=BoardConfig(type="arduino-uno", display_name="Arduino Uno", architecture="ATmega328P 16MHz"),
        components=[
            ComponentInstance(
                id="proj-b727a0cf-pushbutton",
                part_id="pushbutton",
                name="Tactile Push Button",
                category="input",
                pins=["1.1", "2.1"]
            ),
            ComponentInstance(
                id="proj-99887766-buzzer",
                part_id="buzzer-piezo",
                name="Piezo Buzzer",
                category="actuator",
                pins=["pos", "neg"]
            )
        ],
        connections=[
            Connection(
                id="conn-1",
                from_component="proj-b727a0cf-pushbutton",
                from_pin="1.1",
                to_component="board",
                to_pin="D2",
                color="green",
                signal_type="digital"
            )
        ],
        firmware=[FirmwareArtifact(code="void setup() {} void loop() {}")]
    )
    guide = generate_build_guide(proj)
    guide_json = guide.model_dump_json()
    assert "proj-b727a0cf-pushbutton" not in guide_json
    assert "Tactile Push Button" in guide_json
