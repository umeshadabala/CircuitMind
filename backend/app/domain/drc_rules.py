from enum import Enum


class DRCRule(str, Enum):
    PWR_GND_SHORT = "DRC-E001"            # Power shorted to ground
    MISSING_POWER = "DRC-E002"            # Active component missing VCC/power rail
    MISSING_GROUND = "DRC-E003"           # Component missing GND connection
    INVALID_PIN_REF = "DRC-E004"          # Pin reference refers to invalid instance or pin ID
    GPIO_CONFLICT = "DRC-E005"            # Multiple non-passive pins contending on same GPIO net
    INPUT_ONLY_AS_OUTPUT = "DRC-E006"     # Input-only pin (ESP32 GPIO34-39) assigned to drive output
    VOLTAGE_OVERSTRESS = "DRC-E007"       # 5V output driving 3.3V max input without level shifter
    MISSING_CURRENT_LIMITER = "DRC-W001"  # LED connected directly to GPIO/rail without series resistor
    STRAPPING_PIN_USED = "DRC-W002"       # Strapping pin (GPIO0, 2, 12, 15) utilized - may affect boot mode
    MISSING_PULLUP = "DRC-W003"           # Line requiring pull-up (e.g. 1-Wire DS18B20) lacks pull-up
    UNSUPPORTED_PART = "DRC-E008"         # Part not found in curated catalog
    FLOATING_NET = "DRC-W004"             # Net has fewer than 2 connected pins
    UNTRACEABLE_COMPONENT = "DRC-W005"    # Component missing traceable requirement or engineering rationale
    MISSING_CRITICAL_SUBSYSTEM = "DRC-E009" # Critical subsystem required by architecture is missing from graph
    STALE_ARTIFACT = "DRC-I001"           # Artifact revision older than project graph revision
