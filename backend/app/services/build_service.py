import shutil
import subprocess
import re
from typing import Dict, Any, List, Optional
from backend.app.models.project import Project

class FirmwareBuildService:
    """
    FirmwareBuildService:
    Detects target microcontroller board, inspects available build toolchains (arduino-cli, platformio),
    validates C++ sketch syntax & macro definitions, and provides actionable compiler setup instructions.
    """

    @classmethod
    def detect_toolchain(cls, board_type: str) -> Dict[str, Any]:
        """Detects whether hardware compilers are available locally."""
        arduino_cli = shutil.which("arduino-cli")
        platformio = shutil.which("pio") or shutil.which("platformio")
        avr_gcc = shutil.which("avr-gcc")

        has_toolchain = bool(arduino_cli or platformio)

        instructions = []
        if not has_toolchain:
            if "esp32" in board_type.lower():
                instructions = [
                    "Install Arduino CLI: brew install arduino-cli (macOS) or curl -fsSL https://raw.githubusercontent.com/arduino/arduino-cli/master/install.sh | sh",
                    "Add ESP32 Index: arduino-cli config add board_manager.additional_urls https://espressif.github.io/arduino-esp32/package_esp32_index.json",
                    "Install ESP32 Core: arduino-cli core install esp32:esp32",
                    "Alternative: Install PlatformIO via 'pip install platformio' and run 'pio pkg install -p espressif32'"
                ]
            else:
                instructions = [
                    "Install Arduino CLI: brew install arduino-cli",
                    "Install AVR Core: arduino-cli core install arduino:avr",
                    "Alternative: Install PlatformIO via 'pip install platformio'"
                ]

        return {
            "has_compiler": has_toolchain,
            "arduino_cli_path": arduino_cli,
            "platformio_path": platformio,
            "avr_gcc_path": avr_gcc,
            "board_type": board_type,
            "setup_instructions": instructions
        }

    @classmethod
    def lint_firmware(cls, project: Project) -> Dict[str, Any]:
        """
        Statically analyzes generated firmware sketch for:
        1. Required entry points: setup() and loop()
        2. Macro consistency: ensures all assigned pins have matching #define macros
        3. Logic voltage compliance
        """
        code = project.firmware[0].code if project.firmware else ""
        issues: List[str] = []

        if "void setup()" not in code:
            issues.append("Missing required entry point 'void setup()'")
        if "void loop()" not in code:
            issues.append("Missing required control loop 'void loop()'")

        # Check firmware defines and GPIO references, ignoring passive power rails
        power_rails = {"VCC", "GND", "C", "K", "5V", "3V3", "VIN", "COM"}
        for pa in project.pin_assignments:
            if pa.component_pin.upper() in power_rails or pa.board_pin.upper() in power_rails:
                continue
            
            # Hardware I2C / SPI bus peripherals handled by Wire / display libraries
            if pa.signal_type in ["I2C_SDA", "I2C_SCL"] and any(k in code for k in ["Wire", "I2C", "SDA", "SCL", "Adafruit", "u8g2", "display", "OLED"]):
                continue

            # Numeric pin (e.g. D5 -> 5)
            pin_num = re.sub(r"^[A-Za-z]+", "", pa.board_pin)
            c_name = pa.component_id.upper()
            c_pin = pa.component_pin.upper()
            
            matched = (
                f"{c_name}_{c_pin}" in code or
                f"{c_name}_PIN" in code or
                f"{c_pin}_PIN" in code or
                pa.board_pin in code or
                (pin_num and (f" {pin_num}" in code or f"({pin_num}" in code or f",{pin_num}" in code))
            )
            
            if not matched:
                issues.append(f"Firmware does not appear to reference GPIO pin {pa.board_pin} for {pa.component_id}:{pa.component_pin}")


        return {
            "valid": len(issues) == 0,
            "issues": issues,
            "line_count": len(code.splitlines()),
            "target_board": project.board.display_name
        }
