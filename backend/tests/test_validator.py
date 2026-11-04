import pytest
from backend.app.domain.drc_rules import DRCRule
from backend.app.domain.models import (
    ComponentInstance,
    Net,
    NetType,
    PinReference,
    Project,
    Severity,
)
from backend.app.services.validator import DRCValidator


def test_drc_flags_pwr_gnd_short():
    project = Project(
        id="p1",
        name="Short Test",
        description="",
        revision=1,
        created_at="",
        updated_at="",
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
        ],
        nets=[
            Net(
                net_id="NET_BAD",
                name="Illegal Short",
                net_type=NetType.POWER,
                pins=[
                    PinReference(instance_id="U1", pin_id="3V3"),
                    PinReference(instance_id="U1", pin_id="GND"),
                ],
            )
        ],
    )
    report = DRCValidator.validate_project(project)
    assert not report.valid
    rule_ids = [f.rule_id for f in report.findings]
    assert DRCRule.PWR_GND_SHORT.value in rule_ids


def test_drc_flags_voltage_overstress_when_divider_missing():
    # HC-SR04 ECHO directly to ESP32 without divider
    project = Project(
        id="p2",
        name="Overstress Test",
        description="",
        revision=1,
        created_at="",
        updated_at="",
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
            ComponentInstance(instance_id="S1", catalog_id="HC-SR04", name="Ultrasonic", role="sensor"),
        ],
        nets=[
            Net(
                net_id="NET_5V",
                name="5V",
                net_type=NetType.POWER,
                pins=[PinReference(instance_id="U1", pin_id="VIN"), PinReference(instance_id="S1", pin_id="VCC")],
            ),
            Net(
                net_id="NET_GND",
                name="GND",
                net_type=NetType.GROUND,
                pins=[PinReference(instance_id="U1", pin_id="GND"), PinReference(instance_id="S1", pin_id="GND")],
            ),
            Net(
                net_id="NET_ECHO",
                name="Echo Direct",
                net_type=NetType.SIGNAL,
                pins=[PinReference(instance_id="S1", pin_id="ECHO"), PinReference(instance_id="U1", pin_id="GPIO18")],
            ),
        ],
    )
    report = DRCValidator.validate_project(project)
    assert not report.valid
    rule_ids = [f.rule_id for f in report.findings]
    assert DRCRule.VOLTAGE_OVERSTRESS.value in rule_ids


def test_drc_warns_on_unresisted_led():
    project = Project(
        id="p3",
        name="LED Resistor Warning Test",
        description="",
        revision=1,
        created_at="",
        updated_at="",
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
            ComponentInstance(instance_id="D1", catalog_id="LED-RED", name="Red LED", role="actuator"),
        ],
        nets=[
            Net(
                net_id="NET_GND",
                name="GND",
                net_type=NetType.GROUND,
                pins=[PinReference(instance_id="U1", pin_id="GND"), PinReference(instance_id="D1", pin_id="CATHODE")],
            ),
            Net(
                net_id="NET_DIRECT_LED",
                name="Direct LED",
                net_type=NetType.SIGNAL,
                pins=[PinReference(instance_id="U1", pin_id="GPIO4"), PinReference(instance_id="D1", pin_id="ANODE")],
            ),
        ],
    )
    report = DRCValidator.validate_project(project)
    rule_ids = [f.rule_id for f in report.findings]
    assert DRCRule.MISSING_CURRENT_LIMITER.value in rule_ids

