import pytest
from backend.app.domain.models import (
    ComponentInstance,
    Net,
    NetType,
    PinReference,
    Project,
    Requirements,
    ValidationFinding,
    Severity,
)


def test_project_initialization_invariants():
    proj = Project(
        id="proj-123",
        name="Test ESP32 System",
        description="A test embedded project",
        target_board="ESP32-DEVKIT-V1",
        revision=1,
        created_at="2026-10-28T00:00:00Z",
        updated_at="2026-10-28T00:00:00Z",
    )
    assert proj.id == "proj-123"
    assert proj.revision == 1
    assert proj.components == []
    assert proj.nets == []
    assert proj.validation_report is None


def test_net_pin_membership():
    net = Net(
        net_id="NET_TRIG",
        name="Trigger Pulse",
        net_type=NetType.SIGNAL,
        pins=[
            PinReference(instance_id="U1", pin_id="GPIO4"),
            PinReference(instance_id="S1", pin_id="TRIG"),
        ],
    )
    assert len(net.pins) == 2
    assert net.pins[0].instance_id == "U1"
    assert net.pins[1].pin_id == "TRIG"


def test_component_position_metadata():
    comp = ComponentInstance(
        instance_id="D1",
        catalog_id="LED-RED",
        name="Status LED",
        role="actuator",
        position={"x": 150.0, "y": 220.0},
    )
    assert comp.position["x"] == 150.0
    assert comp.position["y"] == 220.0
    # Electrical identity is preserved independently of canvas coordinates
    assert comp.instance_id == "D1"
    assert comp.catalog_id == "LED-RED"

