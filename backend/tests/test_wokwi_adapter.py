import json
import pytest
from backend.app.domain.models import ComponentInstance, FirmwareArtifact, Net, NetType, PinReference, Project
from backend.app.simulation.wokwi_adapter import WokwiSimulationAdapter


def test_wokwi_bundle_generation():
    # Build a simulated ESP32 + HC-SR04 project
    adapter = WokwiSimulationAdapter()

    comp_esp = ComponentInstance(
        instance_id="U1",
        catalog_id="ESP32-DEVKIT-V1",
        name="ESP32 DevKit V1",
        category="microcontroller",
        position={"x": 500, "y": 200},
    )
    comp_sensor = ComponentInstance(
        instance_id="S1",
        catalog_id="HC-SR04",
        name="Ultrasonic Sensor",
        category="sensor",
        position={"x": 200, "y": 200},
    )

    net_gnd = Net(
        net_id="NET-GND",
        name="GND",
        net_type=NetType.GROUND,
        pins=[PinReference(instance_id="U1", pin_id="GND"), PinReference(instance_id="S1", pin_id="GND")],
    )
    net_trig = Net(
        net_id="NET-TRIG",
        name="TRIG_SIGNAL",
        net_type=NetType.SIGNAL,
        pins=[PinReference(instance_id="U1", pin_id="GPIO5"), PinReference(instance_id="S1", pin_id="TRIG")],
    )

    project = Project(
        id="test-proj-wokwi",
        name="Wokwi Test Project",
        description="Testing Wokwi bundle synthesis",
        target_board="ESP32-DEVKIT-V1",
        components=[comp_esp, comp_sensor],
        nets=[net_gnd, net_trig],
        firmware=FirmwareArtifact(
            source_code="void setup() {}\nvoid loop() {}",
            revision=1,
            target_board="ESP32-DEVKIT-V1",
        ),
    )

    bundle = adapter.generate_bundle(project)

    # 1. Validate diagram.json format according to Wokwi specification
    diagram_data = json.loads(bundle.files["diagram.json"])
    assert diagram_data["version"] == 1
    assert "author" in diagram_data
    assert len(diagram_data["parts"]) == 2

    # Check parts format
    part_types = [p["type"] for p in diagram_data["parts"]]
    assert "board-esp32-devkit-c-v4" in part_types
    assert "wokwi-hc-sr04" in part_types

    # Check connections format
    assert len(diagram_data["connections"]) == 2
    conn_pairs = [(c[0], c[1]) for c in diagram_data["connections"]]
    assert ("u1:GND", "s1:GND") in conn_pairs
    assert ("u1:GPIO5", "s1:TRIG") in conn_pairs

    # 2. Validate wokwi.toml format
    wokwi_toml = bundle.files["wokwi.toml"]
    assert "[wokwi]" in wokwi_toml
    assert 'version = 1' in wokwi_toml
    assert 'firmware = "firmware.bin"' in wokwi_toml
    assert 'elf = "firmware.elf"' in wokwi_toml


@pytest.mark.asyncio
async def test_wokwi_honest_execution_status():
    adapter = WokwiSimulationAdapter()

    project = Project(
        id="test-proj-status",
        name="Status Check",
        description="Verifying honest simulation reporting",
        target_board="ESP32-DEVKIT-V1",
    )

    artifact = await adapter.run_simulation(project)

    # When wokwi-cli is not installed, adapter MUST NOT fabricate simulated waveforms or claim success.
    # It must honestly report EXPORT_READY with instructions for manual handoff.
    if not adapter.is_tool_installed():
        assert artifact.execution_status == "EXPORT_READY"
        assert "export" in artifact.summary.lower()
        assert "not installed" in artifact.summary.lower()
        assert artifact.diagram_json is not None
        assert artifact.wokwi_toml is not None
    else:
        assert artifact.execution_status in ["COMPLETED", "FAILED"]
