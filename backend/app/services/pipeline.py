import logging
import re
import uuid
from typing import Dict, List, Optional, Set, Tuple
from backend.app.ai.ollama_client import OllamaClient, OllamaInferenceError, OllamaUnavailableError
from backend.app.ai.prompts import (
    SYSTEM_REQUIREMENTS_PROMPT,
    build_architecture_system_prompt,
)
from backend.app.domain.catalog import HARDWARE_CATALOG, get_catalog_item
from backend.app.domain.models import (
    Architecture,
    BoardSelectionDecision,
    ComponentInstance,
    ComponentTraceability,
    PinDirection,
    Project,
    Requirements,
    Severity,
    ValidationFinding,
    ValidationReport,
)
from backend.app.services.artifact_gen import ArtifactGenerator
from backend.app.services.board_selector import AutonomousBoardSelector
from backend.app.services.diagnostic_trace import PipelineDiagnosticTrace
from backend.app.services.firmware_gen import FirmwareGenerator
from backend.app.services.net_generator import NetGenerator
from backend.app.services.pin_allocator import DeterministicPinAllocator, PinAllocationError
from backend.app.services.validator import DRCValidator
from backend.app.storage.repository import ProjectRepository

logger = logging.getLogger("circuitmind.pipeline")


class PipelineService:
    """
    Orchestrates Stages A through G of the requirements-to-design pipeline.
    Fully generic: translates natural language specifications into verified hardware graphs
    with autonomous controller selection, component traceability, and coherent architectures.
    """

    def __init__(self, ollama_client: Optional[OllamaClient] = None, repository: Optional[ProjectRepository] = None):
        self.ollama = ollama_client or OllamaClient()
        self.repo = repository or ProjectRepository()

    async def stage_a_parse_requirements(self, prompt: str) -> Requirements:
        """Stage A: Natural language requirements analysis via local Ollama or generic parser."""
        try:
            raw_json = await self.ollama.generate_json(prompt=prompt, system_prompt=SYSTEM_REQUIREMENTS_PROMPT)
            return Requirements.model_validate(raw_json)
        except (OllamaUnavailableError, OllamaInferenceError) as e:
            logger.info(f"Ollama inference unavailable ({e}), using generic heuristic parser.")
            return self._generic_requirements_parser(prompt)

    async def stage_b_propose_architecture(self, req: Requirements, selected_board: Optional[str] = None) -> Architecture:
        """Stage B: Architecture proposal resolving functional blocks and catalog parts."""
        req_summary = (
            f"Overview: {req.system_overview}\n"
            f"Inputs: {', '.join(req.inputs_and_sensors)}\n"
            f"Outputs: {', '.join(req.outputs_and_actuators)}\n"
            f"Controller: {selected_board or req.controller_requirements}"
        )
        system_prompt = build_architecture_system_prompt(selected_board)
        try:
            raw_json = await self.ollama.generate_json(prompt=req_summary, system_prompt=system_prompt)
            return Architecture.model_validate(raw_json)
        except (OllamaUnavailableError, OllamaInferenceError):
            return self._generic_architecture_proposal(req, selected_board)

    def stage_c_resolve_components(self, proposed_parts: List[str], target_board: Optional[str] = None) -> List[ComponentInstance]:
        """Stage C: Resolve proposed catalog IDs into component instances with layout, traceability, and supporting passives."""
        instances: List[ComponentInstance] = []
        designator_counts: Dict[str, int] = {}

        # Align controller with target_ctrl: replace any mismatched or generic controller
        target_ctrl = target_board or "ESP32-DEVKIT-V1"
        cleaned_parts: List[str] = []
        controller_placed = False

        for p in proposed_parts:
            catalog_item = get_catalog_item(p)
            if catalog_item and catalog_item.category in ["microcontroller", "flight_controller"]:
                if not controller_placed:
                    cleaned_parts.append(target_ctrl)
                    controller_placed = True
            else:
                cleaned_parts.append(p)

        if not controller_placed:
            cleaned_parts = [target_ctrl] + cleaned_parts

        # Multirotor drone architecture completeness check
        if target_ctrl == "STM32F405-FC" or any(get_catalog_item(p) and get_catalog_item(p).category == "flight_controller" for p in cleaned_parts):
            for req_drone_part in ["ESC-4IN1-30A", "BLDC-MOTOR-2207", "PDB-LIPO-5V-12V"]:
                if req_drone_part not in cleaned_parts:
                    cleaned_parts.append(req_drone_part)

        # Detect required supporting circuitry generically from component pin definitions
        expanded_parts: List[str] = list(cleaned_parts)

        # 1. Check if any component produces 5V output into 3.3V MCU -> needs voltage divider
        mcu_part = get_catalog_item(target_ctrl)
        logic_voltage = 3.3
        if mcu_part and mcu_part.default_properties:
            logic_voltage = mcu_part.default_properties.get("logic_voltage", 3.3)
        is_3v3_logic = logic_voltage <= 3.3 and (not mcu_part or mcu_part.catalog_id != "ARDUINO-UNO-R3")

        if is_3v3_logic:
            needs_divider = False
            for part_id in proposed_parts:
                part = get_catalog_item(part_id)
                if part and any(p.direction in (PinDirection.OUTPUT, PinDirection.BIDIRECTIONAL) and p.voltage_max > 3.6 for p in part.pins):
                    needs_divider = True
                    break
            if needs_divider and "DIVIDER-5V-3V3" not in expanded_parts:
                expanded_parts.append("DIVIDER-5V-3V3")

        # 2. Check if any component requires current limiting (e.g. LEDs)
        current_limit_count = 0
        for part_id in proposed_parts:
            part = get_catalog_item(part_id)
            if part and any(p.requires_current_limiting for p in part.pins):
                current_limit_count += 1

        existing_resistors = sum(1 for p in expanded_parts if "RES-220R" in p or "RES-330R" in p)
        res_type = "RES-220R" if target_ctrl == "ARDUINO-UNO-R3" else "RES-330R"
        for _ in range(current_limit_count - existing_resistors):
            expanded_parts.append(res_type)

        # 3. Check if any component requires a pull-up resistor (e.g. 1-Wire DS18B20)
        needs_pullup = False
        for part_id in proposed_parts:
            part = get_catalog_item(part_id)
            if part and any(p.requires_pullup for p in part.pins):
                needs_pullup = True
                break
        if needs_pullup and "RES-10K" not in expanded_parts:
            expanded_parts.append("RES-10K")

        # Structured, uncluttered column layout
        col_y: Dict[str, float] = {
            "power": 60.0,
            "sensor": 60.0,
            "logic": 60.0,
            "microcontroller": 100.0,
            "flight_controller": 100.0,
            "passive": 60.0,
            "motor_driver": 260.0,
            "actuator": 60.0,
            "display": 60.0,
        }

        col_x: Dict[str, float] = {
            "power": 50.0,
            "sensor": 180.0,
            "logic": 420.0,
            "microcontroller": 650.0,
            "flight_controller": 650.0,
            "motor_driver": 920.0,
            "passive": 1150.0,
            "actuator": 1380.0,
            "display": 1380.0,
        }

        for part_id in expanded_parts:
            catalog_item = get_catalog_item(part_id)
            if not catalog_item:
                logger.warning(f"Rejecting unknown catalog part: {part_id}")
                continue

            cat = catalog_item.category
            prefix = self._get_designator_prefix(cat)
            designator_counts[prefix] = designator_counts.get(prefix, 0) + 1
            inst_id = f"{prefix}{designator_counts[prefix]}"

            x = col_x.get(cat, 650.0)
            y = col_y.get(cat, 80.0)
            col_y[cat] = y + 130.0

            # Traceability mapping to requirement and subsystem
            subsystem = "General"
            reason = f"{catalog_item.name} supporting system design"
            req_id = "REQ-1"

            if cat in ["microcontroller", "flight_controller"]:
                subsystem = "Flight Control" if cat == "flight_controller" else "Microcontroller Computing"
                reason = "Primary compute unit executing system logic, timing, and peripheral orchestration"
                req_id = "REQ-CTRL-1"
            elif cat == "motor_driver":
                subsystem = "Propulsion Drive"
                reason = "Multi-channel electronic speed controller driving brushless motors via DShot/PWM"
                req_id = "REQ-PROP-1"
            elif cat == "power":
                subsystem = "Power Distribution"
                reason = "Converts and regulates battery input into stable 5V and 12V rails"
                req_id = "REQ-PWR-1"
            elif cat == "sensor":
                subsystem = "Sensing & Acquisition"
                reason = f"Acquires physical telemetry ({catalog_item.name})"
                req_id = "REQ-SENS-1"
            elif cat in ["actuator", "display"]:
                subsystem = "Actuation & Interface"
                reason = f"Outputs physical actuation or visual feedback ({catalog_item.name})"
                req_id = "REQ-ACT-1"
            elif cat == "logic":
                subsystem = "Signal Conditioning"
                reason = "Logic level voltage conversion to protect 3.3V inputs from 5V overstress"
                req_id = "REQ-PROT-1"
            elif cat == "passive":
                subsystem = "Passive Circuitry"
                reason = "Current-limiting or bus pull-up impedance matching"
                req_id = "REQ-ELEC-1"

            trace = ComponentTraceability(
                requirement_id=req_id,
                reason=reason,
                subsystem=subsystem,
            )

            instances.append(
                ComponentInstance(
                    instance_id=inst_id,
                    catalog_id=catalog_item.catalog_id,
                    name=catalog_item.name,
                    role=catalog_item.category,
                    position={"x": x, "y": y},
                    properties=catalog_item.default_properties,
                    traceability=trace,
                )
            )

        return instances

    async def execute_full_pipeline(self, project: Project, prompt: str) -> Project:
        """Executes full Stages A->G with autonomous board selection, component traceability, and diagnostic trace recording."""
        req_id = str(uuid.uuid4())
        trace = PipelineDiagnosticTrace(
            request_id=req_id,
            project_id=project.id,
            model_identifier=self.ollama.model,
            provider_type="ollama",
            endpoint_url=self.ollama.base_url,
            prompt_summary=prompt.strip()[:140],
            project_revision=project.revision + 1,
        )

        # Stage A: Requirements
        req_source = "ollama"
        try:
            raw_json = await self.ollama.generate_json(prompt=prompt, system_prompt=SYSTEM_REQUIREMENTS_PROMPT)
            req = Requirements.model_validate(raw_json)
            trace.reached_ollama = True
        except (OllamaUnavailableError, OllamaInferenceError) as e:
            logger.info(f"Ollama inference unavailable ({e}), using generic heuristic parser.")
            trace.fallbacks_triggered.append(f"Stage A fallback to heuristic parser: {type(e).__name__}")
            req_source = "heuristic_fallback"
            req = self._generic_requirements_parser(prompt)

        project.requirements = req
        trace.validated_requirements = req.model_dump()
        trace.requirements_source = req_source

        # Autonomous Board Selection
        requested_board = project.target_board if project.target_board != "AUTO" else None
        board_decision = AutonomousBoardSelector.evaluate_and_select(req, requested_board)
        project.target_board = board_decision.selected_board
        project.board_decision = board_decision
        trace.board_selection = board_decision.model_dump()

        # Stage B: Architecture
        arch_source = "ollama"
        req_summary = (
            f"Overview: {req.system_overview}\n"
            f"Inputs: {', '.join(req.inputs_and_sensors)}\n"
            f"Outputs: {', '.join(req.outputs_and_actuators)}\n"
            f"Controller: {board_decision.selected_board}"
        )
        system_prompt = build_architecture_system_prompt(board_decision.selected_board)
        try:
            raw_json = await self.ollama.generate_json(prompt=req_summary, system_prompt=system_prompt)
            arch = Architecture.model_validate(raw_json)
            trace.reached_ollama = True
        except (OllamaUnavailableError, OllamaInferenceError) as e:
            logger.info(f"Stage B Ollama inference failed ({e}), using generic architecture fallback.")
            trace.fallbacks_triggered.append(f"Stage B fallback to heuristic architecture: {type(e).__name__}")
            arch_source = "heuristic_fallback"
            arch = self._generic_architecture_proposal(req, board_decision.selected_board)

        project.architecture = arch
        trace.architecture_proposal = arch.model_dump()
        trace.architecture_source = arch_source

        # Stage C: Component Resolution with Traceability
        components = self.stage_c_resolve_components(arch.proposed_parts, board_decision.selected_board)
        project.components = components

        trace.proposed_components = list(arch.proposed_parts)
        trace.catalog_matches = [c.catalog_id for c in components]
        trace.rejected_candidates = [p for p in arch.proposed_parts if not get_catalog_item(p)]
        trace.persisted_components = [f"{c.instance_id}: {c.catalog_id}" for c in components]

        # Stage D: Pin Allocation
        pin_alloc_err: Optional[str] = None
        try:
            pin_map = DeterministicPinAllocator.allocate_pins(components, strict=True)
        except PinAllocationError as pae:
            logger.warning(f"Pin allocation could not satisfy all components strictly: {pae}")
            pin_alloc_err = str(pae)
            pin_map = DeterministicPinAllocator.allocate_pins(components, strict=False)

        # Stage E: Net Generation
        nets = NetGenerator.generate_nets(components, pin_map)
        project.nets = nets
        trace.persisted_nets = [n.net_id for n in nets]

        # Increment revision for the new synthesized design
        project.revision += 1

        # Stage F: Electrical Validation
        validation_report = DRCValidator.validate_project(project)
        if pin_alloc_err:
            validation_report.valid = False
            validation_report.findings.insert(
                0,
                ValidationFinding(
                    rule_id="DRC-E007",
                    severity=Severity.ERROR,
                    title="Pin Allocation Capacity Exceeded",
                    message=pin_alloc_err,
                    remedy="Choose a microcontroller board with more I/O pins or remove non-essential peripherals.",
                    affected_instances=[c.instance_id for c in components],
                ),
            )
        project.validation_report = validation_report
        trace.validation_status = "PASSED" if validation_report.valid else "FAILED"
        trace.validation_findings = [f.model_dump() for f in validation_report.findings]

        # Stage G: Artifact Generation
        project.firmware = FirmwareGenerator.generate_firmware(project)
        project.assembly_guide = ArtifactGenerator.generate_assembly_guide(project)

        # Save diagnostic trace on project
        project.diagnostic_trace = trace.model_dump()
        logger.info(f"Pipeline Diagnostic Trace [Request {req_id}]: {trace.model_dump_json()}")

        # Persist updated revision
        saved = self.repo.save_project(project, increment_revision=False)
        return saved

    @staticmethod
    def _get_designator_prefix(category: str) -> str:
        prefixes = {
            "microcontroller": "U",
            "flight_controller": "FC",
            "motor_driver": "ESC",
            "power": "PDB",
            "sensor": "S",
            "actuator": "D",
            "passive": "R",
            "display": "DISP",
            "logic": "LVL",
        }
        return prefixes.get(category, "COMP")

    @classmethod
    def _generic_requirements_parser(cls, prompt: str) -> Requirements:
        """
        Generic, heuristic requirements analyzer extracting functional intents
        without forcing any specific board or template.
        """
        p_lower = prompt.lower()
        inputs: List[str] = []
        outputs: List[str] = []
        behavior: List[str] = []

        is_drone = any(w in p_lower for w in ["drone", "quadcopter", "uav", "multirotor", "flight", "aerodynamic"])

        if is_drone:
            inputs.append("6-DOF IMU attitude sensor (gyroscope and accelerometer)")
            if any(w in p_lower for w in ["obstacle", "distance", "ultrasonic", "proximity", "altitude"]):
                inputs.append("Ultrasonic distance sensor (HC-SR04) for ground proximity and altitude hold")
            outputs.append("4x High-frequency DShot/PWM brushless motor speed control outputs")
            if any(w in p_lower for w in ["buzzer", "alarm", "lost", "finder"]):
                outputs.append("Active piezo lost-model buzzer")
            if any(w in p_lower for w in ["led", "light"]):
                outputs.append("Arming and status indicator LED")
            behavior.append("Real-time attitude stabilization loop (roll, pitch, yaw) at 1kHz")
            behavior.append("Attitude estimation using onboard IMU and EKF2 filter")
            behavior.append("Independent multi-rotor mixer modulation across 4 brushless motors")

            ctrl_req = "Dedicated 32-bit flight controller (STM32F405-FC) with integrated IMU and real-time autopilot software stack (PX4/Betaflight)"
            pwr_req = "3S-6S LiPo battery with regulated 5V BEC for flight controller and high-current power distribution"

        else:
            # General embedded project discovery
            if any(w in p_lower for w in ["distance", "ultrasonic", "proximity", "range", "obstacle"]):
                inputs.append("Ultrasonic distance sensor (HC-SR04 or compatible)")
                behavior.append("Acquire non-contact proximity measurements")

            if any(w in p_lower for w in ["temp", "temperature", "thermal", "heat"]):
                if "humidity" in p_lower or "dht" in p_lower:
                    inputs.append("Digital temperature & humidity sensor (DHT22)")
                else:
                    inputs.append("Digital temperature sensor (1-Wire DS18B20)")
                behavior.append("Monitor ambient temperature and check threshold limits")
            elif "humidity" in p_lower:
                inputs.append("Digital humidity & temperature sensor (DHT22)")

            if any(w in p_lower for w in ["imu", "gyro", "accelerometer", "motion", "tilt"]):
                inputs.append("6-DOF IMU sensor (MPU6050 I2C)")
                behavior.append("Acquire angular rate and acceleration data")

            if any(w in p_lower for w in ["light", "photo", "ldr", "brightness", "lux"]):
                inputs.append("Photoresistor light sensor module")

            if any(w in p_lower for w in ["potentiometer", "pot", "knob", "dial"]):
                inputs.append("10kΩ Rotary potentiometer analog input")

            if any(w in p_lower for w in ["button", "switch", "push", "trigger", "arm", "reset"]):
                inputs.append("Tactile momentary push button")
                behavior.append("Process user button trigger events")

            if any(w in p_lower for w in ["servo", "steer", "motor"]):
                outputs.append("9g Micro Servo Motor (SG90)")
                behavior.append("Position servo angle via 50Hz PWM pulse width modulation")

            if any(w in p_lower for w in ["relay", "mains", "ac load", "high power"]):
                outputs.append("5V Single-channel optocoupled relay module")
                behavior.append("Electromechanical load switching via digital output")

            if any(w in p_lower for w in ["red led", "red light", "red signal"]) or ("red" in p_lower and "led" in p_lower):
                outputs.append("Red indicator LED")
            elif "led" in p_lower or "light" in p_lower or "indicator" in p_lower:
                outputs.append("Status indicator LED")

            if any(w in p_lower for w in ["yellow led", "yellow light", "yellow signal", "amber"]):
                outputs.append("Yellow warning indicator LED")

            if any(w in p_lower for w in ["green led", "green light", "green signal"]):
                outputs.append("Green status indicator LED")

            if any(w in p_lower for w in ["buzzer", "alarm", "sound", "piezo", "beeper", "audio", "siren"]):
                outputs.append("Active piezo sounder buzzer")
                behavior.append("Assert audible alert feedback upon trigger condition")

            if any(w in p_lower for w in ["oled", "display", "screen"]):
                outputs.append("I2C OLED graphic display module (SSD1306)")
                behavior.append("Render real-time system metrics and diagnostics")

            if any(w in p_lower for w in ["lcd", "character display"]):
                outputs.append("16x2 Character LCD with I2C backpack")

            if not behavior:
                behavior.append("Execute cyclic input polling and state evaluation loop")

            ctrl_req = "Autonomous controller selection based on interface constraints and peripheral capabilities"
            pwr_req = "Standard USB / regulated 5V power bus with common system ground"

        return Requirements(
            system_overview=f"Physical system: {prompt.strip()[:140]}",
            desired_behavior=behavior,
            inputs_and_sensors=inputs or ["General-purpose sensor/input"],
            outputs_and_actuators=outputs or ["Status indicator output"],
            controller_requirements=ctrl_req,
            power_requirements=pwr_req,
            environmental_constraints="Standard operating environment",
            safety_considerations=[
                "Ensure voltage level matching between components with different logic levels",
                "Protect driven LEDs with series current-limiting resistors",
            ],
            assumptions=["Prototyping architecture with verifiable electrical connections"],
            acceptance_criteria=[
                "Pass all Design Rule Checks (DRC) with zero electrical errors",
                "Generate conflict-free pin map and verified firmware",
            ],
        )

    @classmethod
    def _generic_architecture_proposal(cls, req: Requirements, selected_board: Optional[str] = None) -> Architecture:
        """
        Generically matches required functional inputs/outputs against the curated catalog.
        Rejects unsupported parts without fabricating fake components.
        """
        all_desc = f"{req.system_overview} {' '.join(req.inputs_and_sensors)} {' '.join(req.outputs_and_actuators)} {req.controller_requirements}".lower()
        is_drone = any(w in all_desc for w in ["drone", "quadcopter", "uav", "multirotor", "flight system", "aerial"])

        ctrl = selected_board or ("STM32F405-FC" if is_drone else "ESP32-DEVKIT-V1")
        proposed_parts: List[str] = [ctrl]

        if is_drone:
            # Full multirotor drone architecture: Flight Controller + 4-in-1 ESC + Brushless Motor + Power Distribution Board
            proposed_parts.append("ESC-4IN1-30A")
            proposed_parts.append("BLDC-MOTOR-2207")
            proposed_parts.append("PDB-LIPO-5V-12V")
            if any(w in all_desc for w in ["obstacle", "distance", "ultrasonic", "proximity", "range"]):
                proposed_parts.append("HC-SR04")
            if any(w in all_desc for w in ["buzzer", "alarm", "sound", "finder", "beeper"]):
                proposed_parts.append("BUZZER-PIEZO")
            if any(w in all_desc for w in ["led", "light", "indicator"]):
                proposed_parts.append("LED-GREEN")
        else:
            # General component discovery across expanded catalog
            if any(w in all_desc for w in ["ultrasonic", "distance", "proximity", "range", "obstacle"]):
                proposed_parts.append("HC-SR04")

            if any(w in all_desc for w in ["temp", "temperature", "thermal"]):
                if "humidity" in all_desc or "dht" in all_desc:
                    proposed_parts.append("DHT22")
                else:
                    proposed_parts.append("DS18B20")
            elif "humidity" in all_desc:
                proposed_parts.append("DHT22")

            if any(w in all_desc for w in ["imu", "gyro", "accelerometer", "motion", "mpu"]):
                proposed_parts.append("MPU6050")

            if any(w in all_desc for w in ["light", "photo", "ldr", "lux", "brightness"]):
                proposed_parts.append("PHOTO-LDR")

            if any(w in all_desc for w in ["potentiometer", "pot", "analog knob"]):
                proposed_parts.append("POT-10K")

            if any(w in all_desc for w in ["button", "switch", "push"]):
                proposed_parts.append("BTN-PUSH")

            if any(w in all_desc for w in ["servo", "steering", "micro servo"]):
                proposed_parts.append("SERVO-SG90")

            if any(w in all_desc for w in ["relay", "mains", "ac load"]):
                proposed_parts.append("RELAY-5V-1CH")

            if "red" in all_desc:
                proposed_parts.append("LED-RED")
            elif "led" in all_desc or "light" in all_desc:
                proposed_parts.append("LED-RED")

            if "yellow" in all_desc or "amber" in all_desc:
                proposed_parts.append("LED-YELLOW")

            if "green" in all_desc:
                proposed_parts.append("LED-GREEN")

            if any(w in all_desc for w in ["buzzer", "alarm", "sound", "piezo"]):
                proposed_parts.append("BUZZER-PIEZO")

            if any(w in all_desc for w in ["oled", "display", "screen"]):
                proposed_parts.append("OLED-SSD1306")

            if any(w in all_desc for w in ["lcd", "character display", "1602"]):
                proposed_parts.append("LCD-1602-I2C")

        # Deduplicate while preserving order
        seen = set()
        unique_parts: List[str] = []
        for p in proposed_parts:
            if p not in seen:
                unique_parts.append(p)
                seen.add(p)

        blocks = [
            {"name": "Controller & Computing", "description": "Master flight or embedded processing unit", "parts": [ctrl]},
            {"name": "Input & Sensors", "description": "Physical signal acquisition and telemetry", "parts": [p for p in unique_parts if p in ["HC-SR04", "DS18B20", "DHT22", "MPU6050", "PHOTO-LDR", "POT-10K", "BTN-PUSH"]]},
            {"name": "Actuators & Outputs", "description": "Physical actuators, user indicators, and displays", "parts": [p for p in unique_parts if p in ["LED-RED", "LED-YELLOW", "LED-GREEN", "BUZZER-PIEZO", "SERVO-SG90", "RELAY-5V-1CH", "OLED-SSD1306", "LCD-1602-I2C"]]},
        ]
        if is_drone:
            blocks.append({
                "name": "Propulsion & Power System",
                "description": "Multirotor ESCs, brushless motors, and power distribution board",
                "parts": [p for p in unique_parts if p in ["ESC-4IN1-30A", "BLDC-MOTOR-2207", "PDB-LIPO-5V-12V"]],
            })

        return Architecture(
            functional_blocks=blocks,
            proposed_parts=unique_parts,
            firmware_responsibilities=["Attitude estimation" if is_drone else "Periodic acquisition", "State evaluation", "Actuator drive assertion"],
            power_domains=["LiPo VBAT", "5V", "12V"] if is_drone else ["3.3V", "5V"],
        )
