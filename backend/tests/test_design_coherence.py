import pytest
from backend.app.domain.catalog import get_catalog_item
from backend.app.domain.models import ComponentInstance, FirmwareArtifact, Project, Requirements
from backend.app.services.pin_allocator import DeterministicPinAllocator
from backend.app.services.net_generator import NetGenerator
from backend.app.services.pipeline import PipelineService
from backend.app.services.validator import DRCValidator
from backend.app.simulation.manager import SimulatorManager


@pytest.mark.asyncio
async def test_drone_full_architecture_coherence(clean_repo):
    """
    Verifies that a quadcopter prompt generates a complete, coherent multirotor architecture
    (Flight Controller + 4-in-1 ESC + Brushless Motor + PDB) instead of an MCU with LEDs.
    """
    pipeline = PipelineService(repository=clean_repo)
    p = Project(id="drone-test", name="Acro Drone", description="Autonomous quadcopter", revision=1)
    clean_repo.save_project(p)

    res = await pipeline.execute_full_pipeline(
        p, "Build an autonomous obstacle avoidance quadcopter drone with flight controller and ultrasonic rangefinder"
    )

    catalog_ids = {c.catalog_id for c in res.components}

    # Autonomous controller selection chosen flight controller
    assert res.target_board == "STM32F405-FC"
    assert "STM32F405-FC" in catalog_ids

    # Critical multirotor subsystems present
    assert "ESC-4IN1-30A" in catalog_ids
    assert "BLDC-MOTOR-2207" in catalog_ids
    assert "PDB-LIPO-5V-12V" in catalog_ids
    assert "HC-SR04" in catalog_ids

    # Ensure all components have traceability metadata
    for c in res.components:
        assert c.traceability is not None
        assert c.traceability.requirement_id.startswith("REQ-")
        assert len(c.traceability.subsystem) > 0
        assert len(c.traceability.reason) > 0

    # Ensure DRC passes with zero errors
    assert res.validation_report is not None
    assert res.validation_report.valid


def test_drc_flags_missing_critical_subsystem():
    """
    Verifies that if a user claims a drone project but only includes an ESP32 and LEDs,
    the DRC validator catches the missing critical subsystems (FC, ESC, Motors, PDB).
    """
    comp_esp = ComponentInstance(
        instance_id="U1",
        catalog_id="ESP32-DEVKIT-V1",
        name="ESP32",
        role="controller",
    )
    comp_led = ComponentInstance(
        instance_id="D1",
        catalog_id="LED-RED",
        name="LED",
        role="actuator",
    )

    p = Project(
        id="bad-drone",
        name="Incomplete Drone",
        description="Quadcopter drone without flight hardware",
        components=[comp_esp, comp_led],
    )

    report = DRCValidator.validate_project(p)
    assert not report.valid

    e009_findings = [f for f in report.findings if f.rule_id == "DRC-E009"]
    assert len(e009_findings) > 0
    assert any("flight controller" in f.message.lower() for f in e009_findings)
    assert any("esc" in f.message.lower() or "motor" in f.message.lower() for f in e009_findings)


def test_dynamic_pin_allocation_across_boards():
    """
    Verifies that pin allocation succeeds generically across different MCU families:
    Arduino Uno (D-pins), Raspberry Pi Pico (GP-pins), and STM32 Flight Controller (M-pins).
    """
    # 1. Arduino Uno with LED and Button
    comp_uno = ComponentInstance(instance_id="U1", catalog_id="ARDUINO-UNO-R3", name="Uno", role="controller")
    comp_led = ComponentInstance(instance_id="D1", catalog_id="LED-RED", name="LED", role="actuator")
    comp_btn = ComponentInstance(instance_id="S1", catalog_id="BTN-PUSH", name="Button", role="sensor")

    pin_map_uno = DeterministicPinAllocator.allocate_pins([comp_uno, comp_led, comp_btn])
    assert "D1.ANODE" in pin_map_uno
    # Arduino digital pins start with D
    assert pin_map_uno["D1.ANODE"].startswith("D")

    # 2. Raspberry Pi Pico with LED and Button
    comp_pico = ComponentInstance(instance_id="U1", catalog_id="RPI-PICO", name="Pico", role="controller")
    pin_map_pico = DeterministicPinAllocator.allocate_pins([comp_pico, comp_led, comp_btn])
    assert "D1.ANODE" in pin_map_pico
    assert pin_map_pico["D1.ANODE"].startswith("GP")

    # 3. STM32 Flight Controller with ESC
    comp_fc = ComponentInstance(instance_id="FC1", catalog_id="STM32F405-FC", name="Flight Controller", role="flight_controller")
    comp_esc = ComponentInstance(instance_id="ESC1", catalog_id="ESC-4IN1-30A", name="4-in-1 ESC", role="motor_driver")
    pin_map_fc = DeterministicPinAllocator.allocate_pins([comp_fc, comp_esc])
    assert "ESC1.M1_IN" in pin_map_fc
    assert pin_map_fc["ESC1.M1_IN"].startswith("M")


@pytest.mark.asyncio
async def test_simulation_manager_multi_channel():
    """
    Verifies that the SimulatorManager generates a comprehensive multi-channel report
    spanning DRC, firmware, behavioral, MCU, flight, and physical evidence.
    """
    manager = SimulatorManager()

    comp_esp = ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="controller")
    comp_buzzer = ComponentInstance(instance_id="D1", catalog_id="BUZZER-PIEZO", name="Buzzer", role="actuator")

    p = Project(
        id="sim-test",
        name="Multi Channel Sim",
        description="Testing simulation channels",
        target_board="ESP32-DEVKIT-V1",
        components=[comp_esp, comp_buzzer],
        firmware=FirmwareArtifact(
            source_code="void setup() {} void loop() {}",
            revision=1,
            target_board="ESP32-DEVKIT-V1",
        ),
    )

    artifact = await manager.execute_simulation(p)
    assert len(artifact.channels) == 5

    channel_keys = [c.channel for c in artifact.channels]
    assert "static_validation" in channel_keys
    assert "firmware_compilation" in channel_keys
    assert "mcu_peripheral_simulation" in channel_keys
    assert "system_level_simulation" in channel_keys
    assert "physical_hardware_verification" in channel_keys

    # Physical hardware channel MUST honestly report untested
    hw_channel = next(c for c in artifact.channels if c.channel == "physical_hardware_verification")
    assert hw_channel.status == "UNTESTED"
    assert "physical hardware has not been connected" in hw_channel.detail.lower()
