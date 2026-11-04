import pytest
from backend.app.domain.models import ComponentInstance, Project
from backend.app.services.simulator import BehavioralSimulator


def test_antitheft_behavioral_simulation_trace():
    project = Project(
        id="sim-1",
        name="Anti-Theft System",
        description="",
        revision=1,
        created_at="",
        updated_at="",
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
            ComponentInstance(instance_id="S1", catalog_id="HC-SR04", name="Ultrasonic", role="sensor"),
            ComponentInstance(instance_id="BZ1", catalog_id="BUZZER-PIEZO", name="Buzzer", role="actuator"),
        ],
    )
    sim = BehavioralSimulator.simulate_project(project)
    assert sim.passed
    assert len(sim.steps) >= 4
    # Step 3 must be breach detection
    breach_step = sim.steps[2]
    assert breach_step.inputs["distance_cm"] == 15.0
    assert breach_step.actual_state["alarm_active"] is True
    assert breach_step.passed is True


def test_traffic_light_behavioral_simulation_cycle():
    project = Project(
        id="sim-2",
        name="Traffic System",
        description="",
        revision=2,
        created_at="",
        updated_at="",
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
            ComponentInstance(instance_id="D1", catalog_id="LED-RED", name="Red", role="actuator"),
            ComponentInstance(instance_id="D2", catalog_id="LED-YELLOW", name="Yellow", role="actuator"),
            ComponentInstance(instance_id="D3", catalog_id="LED-GREEN", name="Green", role="actuator"),
        ],
    )
    sim = BehavioralSimulator.simulate_project(project)
    assert sim.passed
    assert any("RED to GREEN" in s.action for s in sim.steps)
    assert any("GREEN to YELLOW" in s.action for s in sim.steps)

