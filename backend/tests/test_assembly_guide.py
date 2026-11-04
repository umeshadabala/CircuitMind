import pytest
from backend.app.domain.models import ComponentInstance, Net, NetType, PinReference, Project
from backend.app.services.artifact_gen import ArtifactGenerator


def test_assembly_guide_strictly_contains_only_present_components():
    """
    Verifies that the Assembly Guide derives exclusively from canonical graph components
    and never injects unselected parts (e.g. ultrasonic, voltage divider, LiPo, motors).
    """
    # Create an Arduino Relay Box project (no ultrasonic, no voltage divider, no motors)
    project = Project(
        id="proj-relay-box",
        name="Arduino Smart Relay Box",
        description="Automated 5V relay switching via push-button",
        target_board="ARDUINO-UNO-R3",
        revision=1,
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ARDUINO-UNO-R3", name="Arduino Uno R3", role="microcontroller"),
            ComponentInstance(instance_id="K1", catalog_id="RELAY-MODULE-1CH", name="1-Channel 5V Relay", role="actuator"),
            ComponentInstance(instance_id="S1", catalog_id="BTN-PUSH", name="Tactile Button", role="sensor"),
            ComponentInstance(instance_id="D1", catalog_id="LED-5MM-RED", name="Red Status LED", role="actuator"),
            ComponentInstance(instance_id="R1", catalog_id="RES-330R", name="330Ω Resistor", role="passive"),
        ],
        nets=[
            Net(net_id="NET_5V", name="5V Power Bus", net_type=NetType.POWER, voltage=5.0, pins=[PinReference(instance_id="U1", pin_id="5V"), PinReference(instance_id="K1", pin_id="VCC")]),
            Net(net_id="NET_GND", name="Common Ground", net_type=NetType.GROUND, voltage=0.0, pins=[PinReference(instance_id="U1", pin_id="GND"), PinReference(instance_id="K1", pin_id="GND"), PinReference(instance_id="S1", pin_id="PIN2"), PinReference(instance_id="D1", pin_id="CATHODE")]),
            Net(net_id="NET_RELAY_TRIG", name="Relay Control", net_type=NetType.SIGNAL, voltage=5.0, pins=[PinReference(instance_id="U1", pin_id="D4"), PinReference(instance_id="K1", pin_id="IN")]),
            Net(net_id="NET_BTN", name="Button Sense", net_type=NetType.SIGNAL, voltage=5.0, pins=[PinReference(instance_id="U1", pin_id="D2"), PinReference(instance_id="S1", pin_id="PIN1")]),
            Net(net_id="NET_LED_DRIVE", name="LED Resistor", net_type=NetType.SIGNAL, voltage=5.0, pins=[PinReference(instance_id="U1", pin_id="D5"), PinReference(instance_id="R1", pin_id="PIN1")]),
            Net(net_id="NET_LED_ANODE", name="LED Node", net_type=NetType.SIGNAL, voltage=2.0, pins=[PinReference(instance_id="R1", pin_id="PIN2"), PinReference(instance_id="D1", pin_id="ANODE")]),
        ]
    )

    guide = ArtifactGenerator.generate_assembly_guide(project)

    # 1. Must contain all 14 structured sections
    for sec_num in range(1, 15):
        assert f"## {sec_num}." in guide, f"Missing section {sec_num} in Assembly Guide"

    # 2. Must describe present components
    assert "Arduino Uno R3" in guide
    assert "RELAY-MODULE-1CH" in guide
    assert "U1" in guide
    assert "K1" in guide
    assert "D1" in guide
    assert "R1" in guide
    assert "S1" in guide

    # 3. Must mention relay coil isolation and LED polarity
    assert "Galvanic Isolation" in guide or "Relay Module" in guide
    assert "LED Current Limiting" in guide or "Anode" in guide
    assert "Arduino IDE" in guide

    # 4. Critical negative checks: MUST NOT mention unselected parts
    assert "HC-SR04" not in guide
    assert "ultrasonic" not in guide.lower()
    assert "voltage divider" not in guide.lower()
    assert "lipo battery" not in guide.lower()
    assert "bldc" not in guide.lower()
    assert "esc" not in guide.lower()
    assert "smoke-stopper" not in guide.lower()


def test_drone_assembly_guide_contains_propulsion_and_safety():
    """Verifies that a drone project generates authentic multirotor safety guidelines."""
    project = Project(
        id="proj-drone",
        name="Quadcopter Racer",
        description="High-speed FPV quadcopter with brushless propulsion",
        target_board="STM32F405-FC",
        revision=2,
        components=[
            ComponentInstance(instance_id="FC1", catalog_id="STM32F405-FC", name="Flight Controller", role="flight_controller"),
            ComponentInstance(instance_id="ESC1", catalog_id="ESC-4IN1-30A", name="4-in-1 ESC", role="motor_driver"),
            ComponentInstance(instance_id="PDB1", catalog_id="PDB-LIPO-5V-12V", name="PDB", role="power"),
            ComponentInstance(instance_id="M1", catalog_id="BLDC-MOTOR-2207", name="Brushless Motor 1", role="actuator"),
        ],
        nets=[
            Net(net_id="NET_VBAT", name="Main Battery Bus", net_type=NetType.POWER, voltage=14.8, pins=[PinReference(instance_id="PDB1", pin_id="BAT_POS"), PinReference(instance_id="ESC1", pin_id="VBAT")]),
            Net(net_id="NET_GND", name="Common Ground", net_type=NetType.GROUND, voltage=0.0, pins=[PinReference(instance_id="PDB1", pin_id="GND"), PinReference(instance_id="ESC1", pin_id="GND")]),
        ]
    )

    guide = ArtifactGenerator.generate_assembly_guide(project)

    # Must contain drone safety precautions
    assert "LiPo Battery Hazard" in guide or "LiPo" in guide
    assert "Propeller Safety" in guide or "propeller" in guide.lower()
    assert "Betaflight" in guide or "PX4" in guide
    assert "DShot" in guide or "ESC" in guide

    # Negative check: No relay or ultrasonic
    assert "RELAY" not in guide
    assert "HC-SR04" not in guide


def test_bom_and_netlist_generation_fidelity():
    """Verifies BOM and Netlist data structures have complete specifications and no fabricated pricing."""
    project = Project(
        id="test-p",
        name="Fidelity Test",
        description="Fidelity verification circuit",
        revision=3,
        components=[
            ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
            ComponentInstance(instance_id="R1", catalog_id="RES-330R", name="330Ω Resistor", role="passive"),
            ComponentInstance(instance_id="R2", catalog_id="RES-330R", name="330Ω Resistor", role="passive"),
        ],
        nets=[
            Net(net_id="NET_TEST", name="Test Net", net_type=NetType.SIGNAL, voltage=3.3, pins=[
                PinReference(instance_id="U1", pin_id="GPIO4"),
                PinReference(instance_id="R1", pin_id="PIN1"),
                PinReference(instance_id="R2", pin_id="PIN1"),
            ])
        ]
    )

    bom = ArtifactGenerator.generate_bom(project)
    assert bom["total_components"] == 3
    assert bom["unique_parts"] == 2
    res_item = next(item for item in bom["items"] if item["catalog_id"] == "RES-330R")
    assert res_item["quantity"] == 2
    assert res_item["designators"] == ["R1", "R2"]
    assert res_item["estimated_unit_price"] is None  # Pricing not fabricated

    netlist = ArtifactGenerator.generate_netlist(project)
    assert netlist["net_count"] == 1
    net_data = netlist["nets"][0]
    assert net_data["node_count"] == 3
    assert len(net_data["endpoints"]) == 3
    assert net_data["status"] == "CONNECTED"
