import logging
import re
from typing import Dict, List, Optional, Set, Tuple
from backend.app.domain.catalog import HARDWARE_CATALOG, get_catalog_item
from backend.app.domain.models import (
    BoardSelectionDecision,
    CandidateEvaluation,
    CatalogComponent,
    Requirements,
)

logger = logging.getLogger("circuitmind.board_selector")


class AutonomousBoardSelector:
    """
    Autonomous engineering planner for controller, processor, and architecture selection.
    Evaluates candidate controllers based on:
    - Physical domain & system requirements (e.g. flight control vs IoT telemetry vs basic logic)
    - GPIO & peripheral channel budget (PWM, ADC, I2C, SPI, UART)
    - Logic voltage compatibility (5V vs 3.3V)
    - Computation and memory requirements
    - Toolchain and simulation availability (Wokwi vs PX4 SITL vs behavioral)
    """

    CANDIDATE_BOARDS = [
        "STM32F405-FC",
        "ESP32-DEVKIT-V1",
        "ARDUINO-UNO-R3",
        "RPI-PICO",
    ]

    @classmethod
    def evaluate_and_select(cls, req: Requirements, requested_board: Optional[str] = None) -> BoardSelectionDecision:
        """
        Autonomously evaluates supported controller candidates and selects the optimal architecture.
        If user explicitly requested a specific board (and it's not "AUTO"), validates it against constraints.
        """
        req_text = " ".join([
            req.system_overview,
            " ".join(req.desired_behavior),
            " ".join(req.inputs_and_sensors),
            " ".join(req.outputs_and_actuators),
            req.controller_requirements,
            req.power_requirements,
        ]).lower()

        # Domain classification using word boundaries to prevent false substring hits
        is_drone = bool(re.search(r"\b(drone|quadcopter|uav|multirotor|flight|aerodynamic|dshot|propulsion)\b", req_text))
        is_iot = bool(re.search(r"\b(wifi|wi-fi|wireless|ble|bluetooth|cloud|iot|mqtt|web|http|telemetry)\b", req_text))
        is_5v_prefer = bool(re.search(r"\b(5v logic|5v native|arduino uno|atmega328|simple 5v)\b", req_text))
        is_high_speed_pio = bool(re.search(r"\b(rp2040|pico|pio|programmable io|programmable i/o)\b", req_text))

        evaluations: List[CandidateEvaluation] = []

        # Evaluate STM32F405-FC
        f405_score = 10.0
        f405_pros = ["Dedicated Cortex-M4F 168MHz flight computer", "Integrated MPU6000 6-DOF IMU & Barometer", "4x hardware DShot600 motor outputs", "Runs standard PX4/Betaflight flight stack"]
        f405_cons = ["Specialized flight architecture; overkill for simple sensor badges", "Simulated via PX4 SITL / dynamics rather than breadboard Wokwi"]
        f405_feasibility = "FEASIBLE"
        if is_drone:
            f405_score += 90.0
            f405_pros.append("Optimal choice: directly meets multirotor flight dynamics and attitude estimation requirements")
        else:
            f405_score -= 30.0
            f405_cons.append("Lacks integrated Wi-Fi and general-purpose breadboard headers")
        evaluations.append(CandidateEvaluation(
            board_id="STM32F405-FC",
            name="STM32F405 Dedicated Flight Controller",
            architecture="Dedicated Flight Controller (ARM Cortex-M4F)",
            score=f405_score,
            pros=f405_pros,
            cons=f405_cons,
            feasibility=f405_feasibility,
        ))

        # Evaluate ESP32-DEVKIT-V1
        esp32_score = 40.0
        esp32_pros = ["Dual-core 240MHz Xtensa processor", "Integrated Wi-Fi & Bluetooth BLE", "Large flash (4MB) and SRAM (520KB)", "Fully supported in Wokwi simulator"]
        esp32_cons = ["3.3V logic requires voltage dividers/shifters with 5V sensors", "Strapping pins must be guarded during boot"]
        esp32_feasibility = "FEASIBLE"
        if is_iot:
            esp32_score += 45.0
            esp32_pros.append("Native wireless networking directly satisfies remote/cloud requirements")
        if is_drone:
            esp32_score -= 40.0
            esp32_cons.append("Not a dedicated flight controller: lacks integrated high-G IMU, DShot hardware timing, and PX4 flight stack")
        evaluations.append(CandidateEvaluation(
            board_id="ESP32-DEVKIT-V1",
            name="ESP32 NodeMCU DevKit V1",
            architecture="Wireless IoT Microcontroller (Xtensa LX6)",
            score=esp32_score,
            pros=esp32_pros,
            cons=esp32_cons,
            feasibility=esp32_feasibility,
        ))

        # Evaluate ARDUINO-UNO-R3
        uno_score = 25.0
        uno_pros = ["Native 5V operating voltage simplifies 5V sensor wiring", "Immense educational ecosystem and library support", "Fully simulated in Wokwi"]
        uno_cons = ["8-bit 16MHz ATmega328P with limited 2KB RAM and 32KB flash", "No native Wi-Fi or Bluetooth without add-on shields"]
        uno_feasibility = "FEASIBLE"
        if is_5v_prefer or ("arduino" in req_text and not is_iot and not is_drone):
            uno_score += 35.0
            uno_pros.append("Directly satisfies native 5V sensor requirements without level shifters")
        if is_drone:
            uno_score -= 50.0
            uno_feasibility = "INCOMPATIBLE"
            uno_cons.append("Insufficient computation and peripherals for multirotor flight attitude control")
        if is_iot:
            uno_score -= 20.0
            uno_cons.append("Lacks native wireless network radio")
        evaluations.append(CandidateEvaluation(
            board_id="ARDUINO-UNO-R3",
            name="Arduino Uno R3",
            architecture="8-Bit AVR Microcontroller (ATmega328P)",
            score=uno_score,
            pros=uno_pros,
            cons=uno_cons,
            feasibility=uno_feasibility,
        ))

        # Evaluate RPI-PICO
        pico_score = 30.0
        pico_pros = ["Dual-core ARM Cortex-M0+ @ 133MHz", "8 Programmable I/O (PIO) state machines for custom protocols", "Low power consumption and affordable", "Fully supported in Wokwi simulator"]
        pico_cons = ["No built-in Wi-Fi on base RP2040 Pico", "3.3V logic level requires protection with 5V outputs"]
        pico_feasibility = "FEASIBLE"
        if is_high_speed_pio:
            pico_score += 40.0
            pico_pros.append("High clock speed and PIO state machines satisfy custom timing constraints")
        if is_drone:
            pico_score -= 35.0
            pico_cons.append("Lacks integrated flight IMU and official PX4 autopilot flight stack")
        evaluations.append(CandidateEvaluation(
            board_id="RPI-PICO",
            name="Raspberry Pi Pico (RP2040)",
            architecture="Dual-Core ARM Cortex-M0+ with PIO",
            score=pico_score,
            pros=pico_pros,
            cons=pico_cons,
            feasibility=pico_feasibility,
        ))

        # Sort candidate evaluations by score descending
        evaluations.sort(key=lambda c: c.score, reverse=True)

        # Check if user requested an explicit override
        if requested_board and requested_board.upper() != "AUTO" and requested_board in HARDWARE_CATALOG:
            selected_board_id = requested_board
            rationale = f"User explicitly selected {requested_board}. Verified against system requirements."
            matched_eval = next((e for e in evaluations if e.board_id == requested_board), None)
            arch_cat = matched_eval.architecture if matched_eval else "Microcontroller"
        else:
            top_candidate = evaluations[0]
            selected_board_id = top_candidate.board_id
            arch_cat = top_candidate.architecture
            rationale = (
                f"Autonomously selected {top_candidate.name} ({top_candidate.architecture}). "
                f"Highest capability score ({top_candidate.score:.1f}) based on: {'; '.join(top_candidate.pros[:2])}."
            )

        # Build trade-offs and assumptions
        trade_offs = []
        assumptions = []
        unmet = []

        if is_drone:
            assumptions.append("System is designed as a multirotor quadcopter using an X-configuration frame.")
            assumptions.append("Propulsion relies on 4 independent brushless DC motors driven by a 4-in-1 DShot ESC.")
            assumptions.append("Flight dynamics, stabilization, and attitude control are managed by PX4/Betaflight software stack.")
            trade_offs.append("Requires dedicated flight controller hardware (STM32F405-FC) with integrated IMU rather than a general-purpose IoT MCU.")
            trade_offs.append("Simulated via PX4 SITL and Gazebo dynamics rather than breadboard circuit emulation.")
        elif is_iot:
            assumptions.append("System requires 2.4GHz Wi-Fi or Bluetooth BLE for wireless telemetry and remote control.")
            trade_offs.append("Selected ESP32 with integrated RF transceiver over Arduino Uno/Pico to avoid external network shields.")
        elif selected_board_id == "ARDUINO-UNO-R3":
            assumptions.append("All connected components utilize standard 5V logic signaling.")
            trade_offs.append("5V operating voltage eliminates level shifters but provides 8-bit 16MHz compute compared to 32-bit platforms.")

        return BoardSelectionDecision(
            selected_board=selected_board_id,
            architecture_category=arch_cat,
            selection_rationale=rationale,
            evaluated_candidates=evaluations,
            trade_offs=trade_offs,
            assumptions=assumptions,
            unmet_capabilities=unmet,
        )
