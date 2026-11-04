import logging
from typing import Dict, List, Optional, Set
from backend.app.domain.catalog import HARDWARE_CATALOG, get_catalog_item
from backend.app.domain.models import ComponentInstance, PinDirection, PinRole

logger = logging.getLogger(__name__)


class PinAllocationError(Exception):
    """Raised when deterministic pin allocation cannot be satisfied."""
    pass


class DeterministicPinAllocator:
    """
    Constraint-based deterministic pin allocator for microcontrollers and peripheral components.
    Fully generic: allocates pins strictly based on component pin roles, directions,
    and board peripheral capabilities without hardcoding specific component catalog IDs.
    """

    # Prioritized safe GPIOs for general digital outputs on ESP32 (avoiding boot strapping pins 0, 2, 12, 15)
    SAFE_OUTPUT_GPIOS = ["GPIO4", "GPIO18", "GPIO19", "GPIO23", "GPIO27", "GPIO13", "GPIO14", "GPIO16", "GPIO17"]

    # Safe GPIOs for digital inputs
    SAFE_INPUT_GPIOS = ["GPIO34", "GPIO35", "GPIO32", "GPIO33", "GPIO27", "GPIO13", "GPIO14"]

    # Safe GPIOs for analog input (ADC)
    SAFE_ANALOG_GPIOS = ["GPIO32", "GPIO33", "GPIO34", "GPIO35", "GPIO25", "GPIO26", "GPIO27"]

    # Safe GPIOs for bidirectional digital buses (e.g. 1-Wire)
    SAFE_BIDI_GPIOS = ["GPIO4", "GPIO18", "GPIO19", "GPIO23", "GPIO27", "GPIO13", "GPIO14"]

    @classmethod
    def allocate_pins(cls, components: List[ComponentInstance], strict: bool = True) -> Dict[str, str]:
        """
        Allocates MCU pins to peripheral components based on electrical and peripheral constraints.
        Returns a mapping: '{instance_id}.{pin_id}' -> 'GPIOxx' (or board-specific pin identifier).
        If strict is True, raises PinAllocationError when a pin cannot be allocated.
        If strict is False, logs a warning and proceeds with best-effort allocation.
        """
        mcu_inst = next(
            (c for c in components if c.role in ["microcontroller", "controller", "flight_controller"] or "FC" in c.catalog_id or "ESP32" in c.catalog_id or "ARDUINO" in c.catalog_id or "PICO" in c.catalog_id),
            None,
        )
        if not mcu_inst:
            raise PinAllocationError("No microcontroller board present in project design.")

        mcu_catalog = get_catalog_item(mcu_inst.catalog_id)
        if not mcu_catalog:
            raise PinAllocationError(f"Microcontroller catalog definition '{mcu_inst.catalog_id}' not found.")

        used_pins: Set[str] = set()
        allocations: Dict[str, str] = {}

        # -------------------------------------------------------------
        # Phase 1: Allocate Dedicated Subsystems & Buses FIRST
        # -------------------------------------------------------------

        # 1a. Multirotor ESC Motor Signal Channels (M1_IN..M4_IN -> M1..M4)
        for comp in components:
            if "ESC" in comp.catalog_id:
                for motor_idx in range(1, 5):
                    esc_pin = f"M{motor_idx}_IN"
                    target_mcu_pin = f"M{motor_idx}"
                    if any(p.pin_id == target_mcu_pin for p in mcu_catalog.pins):
                        allocations[f"{comp.instance_id}.{esc_pin}"] = target_mcu_pin
                        used_pins.add(target_mcu_pin)

        # 1b. Dedicated I2C Bus (SDA / SCL)
        for comp in components:
            if comp.instance_id == mcu_inst.instance_id:
                continue
            part = get_catalog_item(comp.catalog_id)
            if not part or part.category in ["passive", "logic"]:
                continue

            for pin in part.pins:
                if pin.role == PinRole.I2C_SDA:
                    board_pin = cls._find_board_pin_by_capability(mcu_catalog, "I2C_SDA", used_pins)
                    if not board_pin:
                        board_pin = "GPIO21" if "ESP32" in mcu_inst.catalog_id else ("A4" if "ARDUINO" in mcu_inst.catalog_id else "GP4")
                    allocations[f"{comp.instance_id}.{pin.pin_id}"] = board_pin
                    used_pins.add(board_pin)
                elif pin.role == PinRole.I2C_SCL:
                    board_pin = cls._find_board_pin_by_capability(mcu_catalog, "I2C_SCL", used_pins)
                    if not board_pin:
                        board_pin = "GPIO22" if "ESP32" in mcu_inst.catalog_id else ("A5" if "ARDUINO" in mcu_inst.catalog_id else "GP5")
                    allocations[f"{comp.instance_id}.{pin.pin_id}"] = board_pin
                    used_pins.add(board_pin)

        # 1c. Dedicated Buzzer Pad (BUZZER pad on flight controllers / dedicated boards)
        for comp in components:
            if "BUZZER" in comp.catalog_id or (comp.role == "actuator" and "BUZZER" in comp.name.upper()):
                buzzer_pad = next(
                    (p.pin_id for p in mcu_catalog.pins if (p.pin_id == "BUZZER" or "BUZZER" in p.capabilities) and p.pin_id not in used_pins),
                    None,
                )
                if buzzer_pad:
                    allocations[f"{comp.instance_id}.POS"] = buzzer_pad
                    used_pins.add(buzzer_pad)

        # 1d. Dedicated LED / Addressable Strip Pad (LED pad on flight controllers)
        for comp in components:
            if "LED" in comp.catalog_id:
                led_pad = next(
                    (p.pin_id for p in mcu_catalog.pins if (p.pin_id == "LED" or "LED_STRIP" in p.capabilities) and p.pin_id not in used_pins),
                    None,
                )
                if led_pad:
                    part = get_catalog_item(comp.catalog_id)
                    sig_pin = next((p.pin_id for p in (part.pins if part else []) if p.pin_id in ["ANODE", "DIN", "POS"]), None)
                    if sig_pin:
                        allocations[f"{comp.instance_id}.{sig_pin}"] = led_pad
                        used_pins.add(led_pad)

        # 1e. Dedicated Servos (M5, M6 or SERVO capability on flight controllers)
        for comp in components:
            if "SERVO" in comp.catalog_id:
                servo_pad = next(
                    (p.pin_id for p in mcu_catalog.pins if ("SERVO" in p.capabilities or p.pin_id in ["M5", "M6"]) and p.pin_id not in used_pins),
                    None,
                )
                if servo_pad:
                    allocations[f"{comp.instance_id}.PWM"] = servo_pad
                    used_pins.add(servo_pad)

        # -------------------------------------------------------------
        # Phase 2: Build General GPIO Candidate Pools
        # -------------------------------------------------------------
        if "ESP32" in mcu_inst.catalog_id:
            safe_outputs = [p for p in cls.SAFE_OUTPUT_GPIOS if p not in used_pins]
            safe_inputs = [p for p in cls.SAFE_INPUT_GPIOS if p not in used_pins]
            safe_analogs = [p for p in cls.SAFE_ANALOG_GPIOS if p not in used_pins]
            safe_bidis = [p for p in cls.SAFE_BIDI_GPIOS if p not in used_pins]
        else:
            # Deprioritize dedicated peripheral pins from general pool so they aren't stolen
            reserved_dedicated = {"M1", "M2", "M3", "M4", "BUZZER", "LED", "I2C_SDA", "I2C_SCL", "RC_IN"}

            # Prioritize standard general GPIOs and AUX pins first
            general_pins = [
                p for p in mcu_catalog.pins
                if not p.is_strapping and p.role not in [PinRole.POWER, PinRole.GROUND] and p.pin_id not in reserved_dedicated
            ]

            # Prefer general I/O / AUX pins over specialized telemetry UARTs
            aux_first = sorted(
                general_pins,
                key=lambda p: 0 if (p.pin_id.startswith("AUX") or p.pin_id.startswith("D") or p.pin_id.startswith("GP")) else 1,
            )

            safe_outputs = [
                p.pin_id for p in aux_first
                if (p.direction in [PinDirection.BIDIRECTIONAL, PinDirection.OUTPUT] or "PWM" in p.capabilities or p.role == PinRole.DIGITAL_OUT)
            ]
            safe_inputs = [
                p.pin_id for p in aux_first
                if (p.direction in [PinDirection.BIDIRECTIONAL, PinDirection.INPUT] or p.role in [PinRole.DIGITAL_IN, PinRole.DIGITAL_IO])
            ]
            safe_analogs = [
                p.pin_id for p in aux_first
                if (p.role == PinRole.ANALOG or "ADC" in p.capabilities)
            ]
            safe_bidis = [
                p.pin_id for p in aux_first
                if p.direction == PinDirection.BIDIRECTIONAL
            ]

            # If general pins are exhausted, append remaining unused dedicated pins as fallback
            fallback_outputs = [
                p.pin_id for p in mcu_catalog.pins
                if p.pin_id in reserved_dedicated and p.pin_id not in used_pins
                and (p.direction in [PinDirection.BIDIRECTIONAL, PinDirection.OUTPUT] or "PWM" in p.capabilities or p.role == PinRole.DIGITAL_OUT)
            ]
            fallback_inputs = [
                p.pin_id for p in mcu_catalog.pins
                if p.pin_id in reserved_dedicated and p.pin_id not in used_pins
                and (p.direction in [PinDirection.BIDIRECTIONAL, PinDirection.INPUT] or p.role in [PinRole.DIGITAL_IN, PinRole.DIGITAL_IO])
            ]
            safe_outputs.extend(fallback_outputs)
            safe_inputs.extend(fallback_inputs)

        # -------------------------------------------------------------
        # Phase 3: Allocate General Inputs, Outputs, and Sensor Pins
        # -------------------------------------------------------------
        for comp in components:
            if comp.instance_id == mcu_inst.instance_id:
                continue
            part = get_catalog_item(comp.catalog_id)
            if not part or part.category in ["passive", "logic"]:
                continue

            for pin in part.pins:
                key = f"{comp.instance_id}.{pin.pin_id}"
                if key in allocations:
                    continue  # Already allocated in dedicated phase

                # Skip power and ground pins (handled by power rails)
                if pin.role in [PinRole.POWER, PinRole.GROUND] or pin.direction == PinDirection.POWER:
                    continue

                # Case A: Analog pin
                if pin.role == PinRole.ANALOG or "ADC" in pin.capabilities:
                    avail_pin = cls._find_available_pin(safe_analogs, used_pins)
                    if not avail_pin:
                        if strict:
                            raise PinAllocationError(f"No available analog ADC pin on {mcu_inst.catalog_id} for {key}.")
                        logger.warning(f"Pin allocation best-effort: no analog pin for {key}")
                        continue
                    allocations[key] = avail_pin
                    used_pins.add(avail_pin)

                # Case B: Peripheral Digital Input (requires an MCU Output pin)
                elif pin.direction == PinDirection.INPUT:
                    avail_pin = cls._find_available_pin(safe_outputs, used_pins)
                    if not avail_pin:
                        if strict:
                            raise PinAllocationError(f"No available output GPIO pin on {mcu_inst.catalog_id} for {key}.")
                        logger.warning(f"Pin allocation best-effort: no output pin for {key}")
                        continue
                    allocations[key] = avail_pin
                    used_pins.add(avail_pin)

                # Case C: Peripheral Digital Output (requires an MCU Input pin)
                elif pin.direction == PinDirection.OUTPUT:
                    avail_pin = cls._find_available_pin(safe_inputs, used_pins)
                    if not avail_pin:
                        if strict:
                            raise PinAllocationError(f"No available input GPIO pin on {mcu_inst.catalog_id} for {key}.")
                        logger.warning(f"Pin allocation best-effort: no input pin for {key}")
                        continue
                    allocations[key] = avail_pin
                    used_pins.add(avail_pin)

                # Case D: Peripheral Bidirectional pin (e.g. 1-Wire)
                elif pin.direction == PinDirection.BIDIRECTIONAL:
                    avail_pin = cls._find_available_pin(safe_bidis, used_pins)
                    if not avail_pin:
                        if strict:
                            raise PinAllocationError(f"No available bidirectional GPIO pin on {mcu_inst.catalog_id} for {key}.")
                        logger.warning(f"Pin allocation best-effort: no bidirectional pin for {key}")
                        continue
                    allocations[key] = avail_pin
                    used_pins.add(avail_pin)

                # Case E: Passive terminal (e.g. push button sense terminal)
                elif pin.direction == PinDirection.PASSIVE and comp.role == "sensor":
                    avail_pin = cls._find_available_pin(safe_inputs, used_pins)
                    if not avail_pin:
                        if strict:
                            raise PinAllocationError(f"No available GPIO pin on {mcu_inst.catalog_id} for {key}.")
                        logger.warning(f"Pin allocation best-effort: no GPIO pin for {key}")
                        continue
                    allocations[key] = avail_pin
                    used_pins.add(avail_pin)

                # Case F: Actuator passive terminal requiring MCU drive (e.g. LED Anode)
                elif pin.direction == PinDirection.PASSIVE and (comp.role in ["actuator", "display"] or "LED" in comp.catalog_id) and (pin.pin_id in ["ANODE", "POS"] or pin.requires_current_limiting):
                    avail_pin = cls._find_available_pin(safe_outputs, used_pins)
                    if not avail_pin:
                        if strict:
                            raise PinAllocationError(f"No available output GPIO pin on {mcu_inst.catalog_id} for {key}.")
                        logger.warning(f"Pin allocation best-effort: no output pin for {key}")
                        continue
                    allocations[key] = avail_pin
                    used_pins.add(avail_pin)

        return allocations

    @staticmethod
    def _find_available_pin(priority_list: List[str], used: Set[str]) -> Optional[str]:
        for pin in priority_list:
            if pin not in used:
                return pin
        return None

    @staticmethod
    def _find_board_pin_by_capability(mcu_catalog, capability: str, used: Set[str]) -> Optional[str]:
        for p in mcu_catalog.pins:
            if capability in p.capabilities and p.pin_id not in used:
                return p.pin_id
        return None
