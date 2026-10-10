from typing import Dict, Any

COMPONENTS_CATALOG: Dict[str, Dict[str, Any]] = {
    "hc-sr04": {
        "part_id": "hc-sr04",
        "display_name": "HC-SR04 Ultrasonic Distance Sensor",
        "category": "sensor",
        "wokwi_type": "wokwi-hc-sr04",
        "description": "Measures non-contact distance from 2cm to 400cm using 40kHz ultrasound pulses.",
        "pins": {
            "VCC": {"type": "POWER_VCC", "voltage": 5.0, "required": True},
            "TRIG": {"type": "DIGITAL_IN", "voltage": 5.0, "required": True, "description": "Trigger pulse input (10us TTL)"},
            "ECHO": {"type": "DIGITAL_OUT", "voltage": 5.0, "required": True, "description": "Echo pulse output proportional to distance"},
            "GND": {"type": "POWER_GND", "voltage": 0.0, "required": True}
        },
        "default_attrs": {},
        "firmware_libraries": [],
        "electrical_notes": "Echo pin outputs 5V logic. When connecting to 3.3V ESP32, use direct safe pin or voltage divider."
    },
    "led-red": {
        "part_id": "led-red",
        "display_name": "Red 5mm LED",
        "category": "actuator",
        "wokwi_type": "wokwi-led",
        "description": "Standard 20mA indicator LED (Red).",
        "pins": {
            "A": {"type": "DIGITAL_IN", "voltage": 2.0, "required": True, "description": "Anode (+), connect to GPIO or current-limiting resistor"},
            "C": {"type": "POWER_GND", "voltage": 0.0, "required": True, "description": "Cathode (-), connect to GND"}
        },
        "default_attrs": {"color": "red"},
        "firmware_libraries": [],
        "electrical_notes": "Forward voltage ~1.8V-2.2V. Requires current-limiting resistor (e.g. 220Ω-330Ω) to avoid burning GPIO."
    },
    "led-green": {
        "part_id": "led-green",
        "display_name": "Green 5mm LED",
        "category": "actuator",
        "wokwi_type": "wokwi-led",
        "description": "Standard 20mA indicator LED (Green).",
        "pins": {
            "A": {"type": "DIGITAL_IN", "voltage": 2.2, "required": True, "description": "Anode (+)"},
            "C": {"type": "POWER_GND", "voltage": 0.0, "required": True, "description": "Cathode (-)"}
        },
        "default_attrs": {"color": "green"},
        "firmware_libraries": [],
        "electrical_notes": "Requires current-limiting resistor."
    },
    "led-blue": {
        "part_id": "led-blue",
        "display_name": "Blue 5mm LED",
        "category": "actuator",
        "wokwi_type": "wokwi-led",
        "description": "Standard 20mA indicator LED (Blue).",
        "pins": {
            "A": {"type": "DIGITAL_IN", "voltage": 3.0, "required": True, "description": "Anode (+)"},
            "C": {"type": "POWER_GND", "voltage": 0.0, "required": True, "description": "Cathode (-)"}
        },
        "default_attrs": {"color": "blue"},
        "firmware_libraries": [],
        "electrical_notes": "Requires current-limiting resistor."
    },
    "buzzer-piezo": {
        "part_id": "buzzer-piezo",
        "display_name": "Piezo Buzzer",
        "category": "actuator",
        "wokwi_type": "wokwi-buzzer",
        "description": "Piezoelectric sound transducer for acoustic warning signals.",
        "pins": {
            "1": {"type": "POWER_GND", "voltage": 0.0, "required": True, "description": "GND or negative terminal"},
            "2": {"type": "PWM", "voltage": 3.3, "required": True, "description": "Signal pin / Positive terminal (PWM tone or HIGH)"}
        },
        "default_attrs": {},
        "firmware_libraries": [],
        "electrical_notes": "Can be driven by PWM signal (tone) or digital pulse."
    },
    "resistor-220": {
        "part_id": "resistor-220",
        "display_name": "220Ω Resistor",
        "category": "passive",
        "wokwi_type": "wokwi-resistor",
        "description": "220 Ohm 1/4W current limiting resistor for LEDs.",
        "pins": {
            "1": {"type": "PASSIVE", "voltage": 0.0, "required": True},
            "2": {"type": "PASSIVE", "voltage": 0.0, "required": True}
        },
        "default_attrs": {"value": "220"},
        "firmware_libraries": [],
        "electrical_notes": "Limits LED current to ~10mA on 3.3V/5V circuits."
    },
    "dht22": {
        "part_id": "dht22",
        "display_name": "DHT22 Temperature & Humidity Sensor",
        "category": "sensor",
        "wokwi_type": "wokwi-dht22",
        "description": "Capacitive humidity sensor & thermistor with calibrated digital signal output.",
        "pins": {
            "VCC": {"type": "POWER_VCC", "voltage": 3.3, "required": True},
            "SDA": {"type": "DIGITAL_IN", "voltage": 3.3, "required": True, "description": "Single-bus bidirectional data"},
            "NC": {"type": "NC", "voltage": 0.0, "required": False},
            "GND": {"type": "POWER_GND", "voltage": 0.0, "required": True}
        },
        "default_attrs": {},
        "firmware_libraries": ["DHT sensor library", "Adafruit Unified Sensor"],
        "electrical_notes": "Requires 10k pull-up resistor on data line if not built into module."
    },
    "pushbutton": {
        "part_id": "pushbutton",
        "display_name": "Momentary Tactile Pushbutton",
        "category": "input",
        "wokwi_type": "wokwi-pushbutton",
        "description": "Tactile switch for digital user input.",
        "pins": {
            "1.l": {"type": "DIGITAL_IN", "voltage": 0.0, "required": True, "description": "Terminal 1 left"},
            "2.l": {"type": "POWER_GND", "voltage": 0.0, "required": True, "description": "Terminal 2 left"},
            "1.r": {"type": "PASSIVE", "voltage": 0.0, "required": False},
            "2.r": {"type": "PASSIVE", "voltage": 0.0, "required": False}
        },
        "default_attrs": {"color": "red"},
        "firmware_libraries": [],
        "electrical_notes": "Use INPUT_PULLUP in firmware to avoid external pull-up resistor."
    },
    "potentiometer": {
        "part_id": "potentiometer",
        "display_name": "10kΩ Rotary Potentiometer",
        "category": "input",
        "wokwi_type": "wokwi-potentiometer",
        "description": "Analog voltage divider for adjustable control.",
        "pins": {
            "GND": {"type": "POWER_GND", "voltage": 0.0, "required": True},
            "SIG": {"type": "ANALOG_IN", "voltage": 3.3, "required": True, "description": "Wiper analog voltage output"},
            "VCC": {"type": "POWER_VCC", "voltage": 3.3, "required": True}
        },
        "default_attrs": {},
        "firmware_libraries": [],
        "electrical_notes": "Connect SIG to an ADC-capable analog pin."
    },
    "servo": {
        "part_id": "servo",
        "display_name": "SG90 Micro Servo 9g",
        "category": "actuator",
        "wokwi_type": "wokwi-servo",
        "description": "Miniature positional servo motor (0° to 180°).",
        "pins": {
            "GND": {"type": "POWER_GND", "voltage": 0.0, "required": True},
            "V+": {"type": "POWER_VCC", "voltage": 5.0, "required": True},
            "PWM": {"type": "PWM", "voltage": 3.3, "required": True, "description": "50Hz control pulse (1ms-2ms)"}
        },
        "default_attrs": {},
        "firmware_libraries": ["ESP32Servo" or "Servo"],
        "electrical_notes": "Peak currents can reach 500mA under load; power from 5V supply."
    },
    "oled-ssd1306": {
        "part_id": "oled-ssd1306",
        "display_name": "0.96\" I2C OLED Display (SSD1306 128x64)",
        "category": "display",
        "wokwi_type": "wokwi-ssd1306",
        "description": "128x64 monochrome OLED display with I2C communication interface.",
        "pins": {
            "GND": {"type": "POWER_GND", "voltage": 0.0, "required": True},
            "VCC": {"type": "POWER_VCC", "voltage": 3.3, "required": True},
            "SCL": {"type": "I2C_SCL", "voltage": 3.3, "required": True, "description": "I2C Clock line"},
            "SDA": {"type": "I2C_SDA", "voltage": 3.3, "required": True, "description": "I2C Data line"}
        },
        "default_attrs": {},
        "firmware_libraries": ["Adafruit SSD1306", "Adafruit GFX Library"],
        "electrical_notes": "Default I2C address 0x3C. ESP32 default pins: SDA=GPIO21, SCL=GPIO22."
    }
}
