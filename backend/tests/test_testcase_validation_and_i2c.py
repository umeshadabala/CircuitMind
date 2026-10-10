import pytest
from pydantic import ValidationError
from backend.app.models.project import (
    TestCase,
    Project,
    BoardConfig,
    ComponentInstance,
    PinAssignment,
    Connection,
    SimulationObservation
)
from backend.app.engine.simulator import run_circuit_simulation
from backend.app.services.verification_service import VerificationService
from backend.app.engine.planner import (
    synthesize_project_from_proposal,
    plan_project_from_prompt
)

# Prevent pytest from treating TestCase model as a test suite
TestCase.__test__ = False


def test_testcase_canonical_types():
    """All 5 canonical test types must be accepted."""
    canonical_types = [
        "threshold_trigger",
        "pin_state",
        "serial_telemetry",
        "frequency",
        "i2c_telemetry"
    ]
    for tt in canonical_types:
        tc = TestCase(
            id=f"test-{tt}",
            name=f"Test for {tt}",
            requirement_id="req-001",
            given="Given condition",
            when="When event",
            then="Then result",
            test_type=tt
        )
        assert tc.test_type == tt


def test_testcase_alias_normalization():
    """Known aliases must be normalized to canonical test types."""
    aliases = {
        "i2c": "i2c_telemetry",
        "i2c_bus": "i2c_telemetry",
        "i2c_read": "i2c_telemetry",
        "i2c_display": "i2c_telemetry",
        "threshold": "threshold_trigger",
        "trigger": "threshold_trigger",
        "analog_threshold": "threshold_trigger",
        "gpio": "pin_state",
        "digital_state": "pin_state",
        "pin": "pin_state",
        "telemetry": "serial_telemetry",
        "serial": "serial_telemetry",
        "serial_log": "serial_telemetry",
        "freq": "frequency",
        "pwm": "frequency"
    }
    for alias, expected in aliases.items():
        tc = TestCase(
            id=f"test-{alias}",
            name=f"Test for {alias}",
            requirement_id="req-001",
            given="Given condition",
            when="When event",
            then="Then result",
            test_type=alias
        )
        assert tc.test_type == expected, f"Alias '{alias}' should normalize to '{expected}'"


def test_testcase_unsupported_type_raises_validation_error():
    """Unsupported test types must raise a helpful ValidationError."""
    with pytest.raises(ValidationError) as exc_info:
        TestCase(
            id="test-unsupported",
            name="Unsupported Type Test",
            requirement_id="req-001",
            given="Given condition",
            when="When event",
            then="Then result",
            test_type="wifi_telemetry"
        )
    err_str = str(exc_info.value)
    assert "threshold_trigger" in err_str
    assert "i2c_telemetry" in err_str
    assert "wifi_telemetry" in err_str


def test_simulator_i2c_telemetry_with_hardware():
    """Simulation must pass i2c_telemetry when I2C hardware is present and record bus telemetry."""
    board = BoardConfig(
        type="esp32-devkit-v1",
        display_name="ESP32 NodeMCU",
        architecture="Xtensa Dual-Core",
        voltage_logic=3.3,
        voltage_supply=5.0,
        pins_available=["D21", "D22", "5V", "GND"]
    )
    oled_comp = ComponentInstance(
        id="comp-oled",
        part_id="oled-ssd1306",
        name="0.96\" I2C OLED Display",
        category="display",
        pins=["GND", "VCC", "SCL", "SDA"]
    )
    pin_assignments = [
        PinAssignment(component_id="comp-oled", component_pin="SDA", board_pin="D21", signal_type="I2C_SDA"),
        PinAssignment(component_id="comp-oled", component_pin="SCL", board_pin="D22", signal_type="I2C_SCL"),
    ]
    tc = TestCase(
        id="test-oled-i2c",
        name="SSD1306 I2C Telemetry Refresh",
        requirement_id="req-001",
        given="OLED initialized on I2C bus",
        when="Frame buffer updated",
        then="OLED renders frame",
        test_type="i2c_telemetry",
        parameters={"i2c_address": "0x3C"}
    )
    project = Project(
        id="proj-i2c-test",
        title="I2C Display Test Project",
        description="Test I2C simulation",
        board=board,
        requirements=[],
        components=[oled_comp],
        pin_assignments=pin_assignments,
        connections=[],
        tests=[tc]
    )

    sim_run = run_circuit_simulation(project)
    assert len(sim_run.test_results) == 1
    tr = sim_run.test_results[0]
    assert tr.status == "passed"
    assert "0x3C" in tr.observed
    assert any("I2C" in line for line in sim_run.serial_logs)


def test_simulator_i2c_telemetry_without_hardware():
    """Simulation must honestly fail i2c_telemetry when no I2C hardware is present."""
    board = BoardConfig(
        type="esp32-devkit-v1",
        display_name="ESP32 NodeMCU",
        architecture="Xtensa Dual-Core",
        voltage_logic=3.3,
        voltage_supply=5.0,
        pins_available=["D23", "5V", "GND"]
    )
    led_comp = ComponentInstance(
        id="comp-led",
        part_id="led-red",
        name="Red LED",
        category="actuator",
        pins=["A", "C"]
    )
    tc = TestCase(
        id="test-i2c-missing",
        name="I2C Telemetry on Non-I2C Hardware",
        requirement_id="req-001",
        given="No I2C peripheral wired",
        when="Attempting I2C telemetry read",
        then="Bus telemetry synchronized",
        test_type="i2c_telemetry"
    )
    project = Project(
        id="proj-no-i2c",
        title="No I2C Project",
        description="Testing missing I2C failure",
        board=board,
        requirements=[],
        components=[led_comp],
        pin_assignments=[],
        connections=[],
        tests=[tc]
    )

    sim_run = run_circuit_simulation(project)
    assert sim_run.status == "failed"
    assert len(sim_run.test_results) == 1
    tr = sim_run.test_results[0]
    assert tr.status == "failed"
    assert "No I2C peripheral" in tr.observed


def test_verification_service_i2c_telemetry():
    """VerificationService must evaluate i2c_telemetry against simulation observations."""
    tc = TestCase(
        id="test-i2c",
        name="I2C Verification",
        requirement_id="req-001",
        given="Bus active",
        when="Polling",
        then="Telemetry ok",
        test_type="i2c_telemetry"
    )

    # Observations with I2C data
    obs_pass = [
        SimulationObservation(
            timestamp_ms=500,
            sensor_inputs={"i2c_address": "0x3C", "i2c_active": True},
            pin_states={"D21": "I2C_DATA", "D22": "I2C_CLOCK"},
            serial_line="[TELEMETRY @ 500ms] I2C Bus Frame Active"
        )
    ]
    result_pass = VerificationService.evaluate_test_case(tc, obs_pass, ["[TELEMETRY] I2C Bus Frame Active"])
    assert result_pass.status == "passed"

    # Observations without I2C data
    obs_fail = [
        SimulationObservation(
            timestamp_ms=500,
            sensor_inputs={"analog_raw": 100},
            pin_states={"D4": "HIGH"},
            serial_line="[TELEMETRY @ 500ms] Regular GPIO"
        )
    ]
    result_fail = VerificationService.evaluate_test_case(tc, obs_fail, ["[TELEMETRY] Regular GPIO"])
    assert result_fail.status == "failed"
    assert result_fail.diagnostic is not None


def test_malformed_test_case_in_proposal_does_not_crash_synthesis():
    """A malformed test case from an LLM proposal must be gracefully handled and noted in unresolved requirements."""
    proposal = {
        "title": "Soil Moisture System",
        "description": "Plant watering monitoring",
        "board_type": "esp32-devkit-v1",
        "requirements": [
            {"id": "req-001", "description": "Monitor soil moisture", "priority": "required", "category": "sensing"}
        ],
        "components": [
            {"id": "soil-1", "part_id": "soil-moisture", "name": "Soil Moisture Sensor"}
        ],
        "pin_assignments": [],
        "connections": [],
        "tests": [
            {
                "id": "bad-test-1",
                "name": "Unsupported Protocol Test",
                "requirement_id": "req-001",
                "given": "Unknown state",
                "when": "Unknown event",
                "then": "Unknown result",
                "test_type": "quantum_entanglement_telemetry",
                "parameters": {}
            }
        ],
        "unresolved_requirements": []
    }
    audit = {}
    proj = synthesize_project_from_proposal(proposal, "Build a plant watering system with soil sensor", audit)

    # Synthesis must succeed
    assert proj.id is not None
    assert proj.title == "Soil Moisture System"
    # The malformed test must be recorded in unresolved requirements
    assert any("quantum_entanglement_telemetry" in u for u in proj.unresolved_requirements)
    # The valid component-driven tests for soil moisture should be present
    assert any("soil" in t.id.lower() or "moisture" in t.id.lower() for t in proj.tests)


def test_automatic_plant_watering_project_plan_with_oled():
    """
    Re-run the exact plant watering project request that triggered the original error:
    'Build an automatic plant watering system using an ESP32 with soil moisture sensor, water pump relay or servo valve, and OLED display'
    Verify planning proceeds without ValidationError and tests include i2c_telemetry.
    """
    proposal = {
        "title": "ESP32 Automated Plant Watering & Irrigation System",
        "description": "ESP32-based plant watering system with capacitive soil moisture sensor, SG90 servo valve actuation, and SSD1306 OLED telemetry display.",
        "board_type": "esp32-devkit-v1",
        "requirements": [
            {"id": "req-001", "description": "Read soil moisture and trigger watering when below threshold", "priority": "required", "category": "sensing"},
            {"id": "req-002", "description": "Actuate servo valve to deliver water", "priority": "required", "category": "actuation"},
            {"id": "req-003", "description": "Display live telemetry and hydration status on OLED", "priority": "recommended", "category": "display"}
        ],
        "components": [
            {"id": "soil-1", "part_id": "soil-moisture", "name": "Capacitive Soil Moisture Sensor"},
            {"id": "servo-1", "part_id": "servo", "name": "SG90 Micro Servo 9g"},
            {"id": "oled-1", "part_id": "oled-ssd1306", "name": "0.96\" I2C OLED Display (SSD1306)"}
        ],
        "pin_assignments": [],
        "connections": [],
        "tests": [
            {
                "id": "test-soil-irrigate",
                "name": "Soil Moisture Low Irrigation Trigger",
                "requirement_id": "req-001",
                "given": "Soil moisture reading at 18%",
                "when=":"Threshold evaluation executes",
                "then": "Servo valve opens to water plant",
                "test_type": "threshold_trigger",
                "parameters": {"simulated_moisture_pct": 18.0, "threshold_moisture_pct": 30.0}
            },
            {
                "id": "test-oled-telemetry",
                "name": "OLED Display Status Frame Refresh",
                "requirement_id": "req-003",
                "given": "SSD1306 initialized on I2C bus",
                "when": "Telemetry loop refreshes display",
                "then": "Live moisture and valve status rendered",
                "test_type": "i2c_telemetry",
                "parameters": {"i2c_address": "0x3C"}
            }
        ],
        "unresolved_requirements": []
    }
    audit = {}
    prompt = "Build an automatic plant watering system using an ESP32 with soil moisture sensor, water pump relay or servo valve, and OLED display"
    proj = synthesize_project_from_proposal(proposal, prompt, audit)

    assert proj is not None
    assert proj.board.type == "esp32-devkit-v1"
    # Must have tests including i2c_telemetry
    test_types = [t.test_type for t in proj.tests]
    assert "i2c_telemetry" in test_types
    assert "threshold_trigger" in test_types

    # Must simulate cleanly
    sim_result = run_circuit_simulation(proj)
    assert sim_result.status == "passed"
    i2c_results = [r for r in sim_result.test_results if "oled" in r.test_id.lower() or "display" in r.test_name.lower()]
    assert len(i2c_results) > 0
    assert i2c_results[0].status == "passed"
