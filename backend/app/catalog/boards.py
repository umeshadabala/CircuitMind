from typing import Dict, Any, List

BOARDS: Dict[str, Dict[str, Any]] = {
    "esp32-devkit-v1": {
        "type": "esp32-devkit-v1",
        "wokwi_part": "wokwi-esp32-devkit-v1",
        "display_name": "ESP32 DevKit V1",
        "architecture": "Xtensa dual-core 32-bit LX6 @ 240MHz",
        "voltage_logic": 3.3,
        "voltage_supply": 5.0,
        "pins": [
            "3V3", "GND", "D15", "D2", "D4", "RX2", "TX2", "D5", "D18", "D19", "D21", "RX0", "TX0", "D22", "D23",
            "EN", "VP", "VN", "D34", "D35", "D32", "D33", "D25", "D26", "D27", "D14", "D12", "D13", "VIN"
        ],
        "gpio_mapping": {
            "D2": "GPIO2", "D4": "GPIO4", "D5": "GPIO5", "D12": "GPIO12", "D13": "GPIO13",
            "D14": "GPIO14", "D15": "GPIO15", "D18": "GPIO18", "D19": "GPIO19", "D21": "GPIO21",
            "D22": "GPIO22", "D23": "GPIO23", "D25": "GPIO25", "D26": "GPIO26", "D27": "GPIO27",
            "D32": "GPIO32", "D33": "GPIO33", "D34": "GPIO34", "D35": "GPIO35"
        },
        "digital_pins": ["D2", "D4", "D5", "D12", "D13", "D14", "D15", "D18", "D19", "D21", "D22", "D23", "D25", "D26", "D27", "D32", "D33"],
        "input_only_pins": ["D34", "D35", "VP", "VN"],
        "pwm_pins": ["D2", "D4", "D5", "D12", "D13", "D14", "D15", "D18", "D19", "D21", "D22", "D23", "D25", "D26", "D27", "D32", "D33"],
        "i2c_default": {"sda": "D21", "scl": "D22"},
        "spi_default": {"mosi": "D23", "miso": "D19", "sck": "D18", "cs": "D5"},
        "reserved_pins": ["TX0", "RX0", "EN"],
        "max_gpio_current_ma": 12.0
    },
    "arduino-uno": {
        "type": "arduino-uno",
        "wokwi_part": "wokwi-arduino-uno",
        "display_name": "Arduino Uno R3",
        "architecture": "ATmega328P 8-bit AVR @ 16MHz",
        "voltage_logic": 5.0,
        "voltage_supply": 5.0,
        "pins": [
            "5V", "3V3", "GND", "VIN", "RESET",
            "0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13",
            "A0", "A1", "A2", "A3", "A4", "A5"
        ],
        "digital_pins": ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"],
        "pwm_pins": ["3", "5", "6", "9", "10", "11"],
        "analog_pins": ["A0", "A1", "A2", "A3", "A4", "A5"],
        "i2c_default": {"sda": "A4", "scl": "A5"},
        "reserved_pins": ["0", "1"],
        "max_gpio_current_ma": 20.0
    }
}
