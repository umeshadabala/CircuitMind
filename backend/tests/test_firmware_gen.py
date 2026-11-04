import pytest
from backend.app.domain.models import ComponentInstance, Net, NetType, PinReference, Project
from backend.app.services.firmware_gen import FirmwareGenerator


def test_firmware_contains_provenance_and_pin_mappings():
    project = Project(
        id="p-fw",
        name="Security Proximity Alarm",
        description="",
        revision=3,
        created_at="",
        updated_at="",
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
            ComponentInstance(instance_id="S1", catalog_id="HC-SR04", name="Ultrasonic", role="sensor"),
            ComponentInstance(instance_id="BZ1", catalog_id="BUZZER-PIEZO", name="Buzzer", role="actuator"),
        ],
        nets=[
            Net(
                net_id="NET_TRIG",
                name="Trig",
                net_type=NetType.SIGNAL,
                pins=[PinReference(instance_id="U1", pin_id="GPIO4"), PinReference(instance_id="S1", pin_id="TRIG")],
            ),
            Net(
                net_id="NET_BUZZ",
                name="Buzz",
                net_type=NetType.SIGNAL,
                pins=[PinReference(instance_id="U1", pin_id="GPIO19"), PinReference(instance_id="BZ1", pin_id="POS")],
            ),
        ],
    )
    fw = FirmwareGenerator.generate_firmware(project)
    assert fw.revision == 3
    assert fw.target_platform == "esp32"
    assert "Revision: 3" in fw.source_code
    assert "PIN_S1_TRIG 4" in fw.source_code
    assert "PIN_BZ1_POS 19" in fw.source_code
    assert not fw.compiled
    assert "Uncompiled" in fw.compilation_status

