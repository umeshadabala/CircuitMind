import pytest
from backend.app.domain.models import Requirements
from backend.app.services.board_selector import AutonomousBoardSelector


def test_autonomous_selection_multirotor_drone():
    req = Requirements(
        system_overview="Autonomous obstacle avoidance quadcopter with real-time attitude stabilization",
        desired_behavior=[
            "1kHz attitude control loop",
            "Independent 4-motor brushless control",
            "Altitude proximity sensing",
        ],
        inputs_and_sensors=["6-DOF IMU", "Ultrasonic distance sensor"],
        outputs_and_actuators=["4x Brushless motors via DShot ESC", "Buzzer"],
        controller_requirements="Dedicated multirotor flight controller",
        power_requirements="4S LiPo battery",
        environmental_constraints="Vibration and high aerodynamic forces",
        safety_considerations=["Motor disarm fail-safe"],
        assumptions=["Flight software autopilot stack"],
        acceptance_criteria=["Zero desync at 1kHz update rates"],
    )

    decision = AutonomousBoardSelector.evaluate_and_select(req)
    assert decision.selected_board == "STM32F405-FC"
    assert "multirotor flight controller" in decision.selection_rationale.lower() or "stm32f405" in decision.selection_rationale.lower()
    assert len(decision.evaluated_candidates) >= 4

    # Verify all candidates were rigorously evaluated
    eval_map = {c.board_id: c for c in decision.evaluated_candidates}
    assert "STM32F405-FC" in eval_map
    assert "ESP32-DEVKIT-V1" in eval_map
    assert "ARDUINO-UNO-R3" in eval_map
    assert "RPI-PICO" in eval_map

    # Ensure Arduino Uno is rejected for lack of high-frequency IMU / 4x DShot capability
    assert eval_map["ARDUINO-UNO-R3"].feasibility == "INCOMPATIBLE"


def test_autonomous_selection_iot_wireless():
    req = Requirements(
        system_overview="WiFi temperature telemetry logger pushing data to cloud MQTT broker",
        desired_behavior=["Read temperature periodically", "Transmit over 2.4GHz WiFi"],
        inputs_and_sensors=["DS18B20 1-Wire temperature sensor"],
        outputs_and_actuators=["OLED status display"],
        controller_requirements="Low-cost wireless IoT controller",
        power_requirements="5V USB power",
        environmental_constraints="Indoor room temperature",
        safety_considerations=["Network disconnect retry"],
        assumptions=["Standard WiFi access point"],
        acceptance_criteria=["Telemetry sent every 10 seconds"],
    )

    decision = AutonomousBoardSelector.evaluate_and_select(req)
    assert decision.selected_board == "ESP32-DEVKIT-V1"
    assert "wifi" in decision.selection_rationale.lower() or "wireless" in decision.selection_rationale.lower() or "esp32" in decision.selection_rationale.lower()


def test_autonomous_selection_5v_arduino():
    req = Requirements(
        system_overview="Simple educational 5V relay switch box with tactile push button",
        desired_behavior=["Toggle relay state on button press", "Drive 5V logic cleanly"],
        inputs_and_sensors=["Push button"],
        outputs_and_actuators=["5V Relay module", "Indicator LED"],
        controller_requirements="Standard 5V microcontroller board",
        power_requirements="5V DC adapter",
        environmental_constraints="Benchtop classroom",
        safety_considerations=["Mains isolation"],
        assumptions=["Standard Arduino IDE toolchain"],
        acceptance_criteria=["Immediate relay click on press"],
    )

    decision = AutonomousBoardSelector.evaluate_and_select(req)
    assert decision.selected_board == "ARDUINO-UNO-R3"


def test_autonomous_selection_rp2040_pico():
    req = Requirements(
        system_overview="High speed PIO pulse generator with dual-core 133MHz timing coordination on RP2040",
        desired_behavior=["Generate custom sub-microsecond waveforms using Programmable IO (PIO)"],
        inputs_and_sensors=["Trigger pulse"],
        outputs_and_actuators=["Custom high speed digital waveform pin"],
        controller_requirements="Dual-core controller with hardware PIO state machines",
        power_requirements="USB 5V",
        environmental_constraints="Lab bench",
        safety_considerations=["Signal integrity"],
        assumptions=["Pico C SDK"],
        acceptance_criteria=["Precise microsecond timing"],
    )

    decision = AutonomousBoardSelector.evaluate_and_select(req)
    assert decision.selected_board == "RPI-PICO"


def test_user_requested_override_honored():
    req = Requirements(
        system_overview="Simple LED flasher",
        desired_behavior=["Blink green LED at 1Hz"],
        inputs_and_sensors=[],
        outputs_and_actuators=["LED-GREEN"],
        controller_requirements="Any basic microcontroller",
        power_requirements="USB 5V",
        environmental_constraints="Lab",
        safety_considerations=[],
        assumptions=[],
        acceptance_criteria=["Blinks"],
    )

    # User explicitly requests RPI-PICO
    decision = AutonomousBoardSelector.evaluate_and_select(req, requested_board="RPI-PICO")
    assert decision.selected_board == "RPI-PICO"
    assert "user explicitly selected" in decision.selection_rationale.lower()
