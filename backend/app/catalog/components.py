from typing import Dict, Any

COMPONENTS_CATALOG: Dict[str, Dict[str, Any]] = {
    "hc-sr04": {
        "part_id": "hc-sr04",
        "canonical_name": "HC-SR04 Ultrasonic Distance Sensor",
        "display_name": "HC-SR04 Ultrasonic Distance Sensor",
        "manufacturer": "ElecFreaks / SparkFun / Generic",
        "model": "HC-SR04",
        "category": "sensor",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 4.5,
            "voltage_max": 5.5,
            "voltage_typical": 5.0,
            "current_draw_ma": 15.0,
            "logic_voltage": 5.0,
            "frequency_khz": 40.0,
            "range_min_cm": 2.0,
            "range_max_cm": 400.0,
            "accuracy_mm": 3.0
        },
        "pins": {
            "VCC": {"type": "POWER_VCC", "direction": "in", "voltage": 5.0, "required": True, "description": "Supply voltage (+5V DC)"},
            "TRIG": {"type": "DIGITAL_IN", "direction": "in", "voltage": 5.0, "required": True, "description": "10us TTL trigger pulse input"},
            "ECHO": {"type": "DIGITAL_OUT", "direction": "out", "voltage": 5.0, "required": True, "description": "Echo pulse output proportional to distance (150us - 25ms)"},
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground return"}
        },
        "datasheet_url": "https://cdn.sparkfun.com/datasheets/Sensors/Proximity/HCSR04.pdf",
        "source_metadata": {
            "verified": True,
            "datasheet_source": "SparkFun Electronics Reference Document",
            "last_audit": "2026-10"
        },
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/hc-sr04.png",
        "image_attribution": "Wokwi Open Hardware Elements / CC0",
        "wokwi_part_id": "wokwi-hc-sr04",
        "wokwi_type": "wokwi-hc-sr04",
        "default_attrs": {},
        "firmware_libraries": [],
        "known_limitations": [
            "Echo pin outputs 5V TTL logic level. Direct connection to 3.3V ESP32 GPIO requires level shifting or voltage divider to prevent exceeding 3.6V maximum GPIO input rating.",
            "Blind spot: Distances below 2 cm cause pulse overlap and reading errors."
        ],
        "description": "Measures non-contact distance from 2cm to 400cm using 40kHz ultrasound pulses."
    },
    "led-red": {
        "part_id": "led-red",
        "canonical_name": "Red 5mm Through-Hole LED",
        "display_name": "Red LED",
        "manufacturer": "Lite-On / Generic",
        "model": "L-53HD",
        "category": "actuator",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "forward_voltage_typical": 2.0,
            "forward_voltage_max": 2.4,
            "forward_current_ma_typical": 15.0,
            "forward_current_ma_max": 20.0,
            "dominant_wavelength_nm": 625.0
        },
        "pins": {
            "A": {"type": "DIGITAL_IN", "direction": "in", "voltage": 2.0, "required": True, "description": "Anode (+), longer leg, connect to GPIO via current-limiting resistor"},
            "C": {"type": "POWER_GND", "direction": "out", "voltage": 0.0, "required": True, "description": "Cathode (-), flat rim side, connect to GND"}
        },
        "datasheet_url": "https://media.digikey.com/pdf/Data%20Sheets/Lite-On%20PDFs/L-53HD.pdf",
        "source_metadata": {"verified": True, "source": "DigiKey Lite-On L-53HD Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/led.png",
        "image_attribution": "Wokwi Open Elements",
        "wokwi_part_id": "wokwi-led",
        "wokwi_type": "wokwi-led",
        "default_attrs": {"color": "red"},
        "firmware_libraries": [],
        "known_limitations": [
            "Must always be paired with a series current-limiting resistor (e.g. 220Ω - 330Ω) to avoid burning microcontroller GPIO pins or the LED die."
        ],
        "description": "Standard 20mA optical indicator LED (Red)."
    },
    "led-green": {
        "part_id": "led-green",
        "canonical_name": "Green 5mm Through-Hole LED",
        "display_name": "Green LED",
        "manufacturer": "Lite-On / Generic",
        "model": "L-53GD",
        "category": "actuator",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "forward_voltage_typical": 2.2,
            "forward_voltage_max": 2.6,
            "forward_current_ma_typical": 15.0,
            "forward_current_ma_max": 20.0,
            "dominant_wavelength_nm": 569.0
        },
        "pins": {
            "A": {"type": "DIGITAL_IN", "direction": "in", "voltage": 2.2, "required": True, "description": "Anode (+)"},
            "C": {"type": "POWER_GND", "direction": "out", "voltage": 0.0, "required": True, "description": "Cathode (-)"}
        },
        "datasheet_url": "https://media.digikey.com/pdf/Data%20Sheets/Lite-On%20PDFs/L-53GD.pdf",
        "source_metadata": {"verified": True, "source": "DigiKey Lite-On L-53GD Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/led.png",
        "image_attribution": "Wokwi Open Elements",
        "wokwi_part_id": "wokwi-led",
        "wokwi_type": "wokwi-led",
        "default_attrs": {"color": "green"},
        "firmware_libraries": [],
        "known_limitations": [
            "Requires current-limiting resistor (220Ω - 330Ω)."
        ],
        "description": "Standard 20mA optical indicator LED (Green)."
    },
    "led-blue": {
        "part_id": "led-blue",
        "canonical_name": "Blue 5mm Through-Hole LED",
        "display_name": "Blue LED",
        "manufacturer": "Cree / Kingbright / Generic",
        "model": "WP7113QBC/D",
        "category": "actuator",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "forward_voltage_typical": 3.2,
            "forward_voltage_max": 3.8,
            "forward_current_ma_typical": 20.0,
            "forward_current_ma_max": 30.0,
            "dominant_wavelength_nm": 470.0
        },
        "pins": {
            "A": {"type": "DIGITAL_IN", "direction": "in", "voltage": 3.2, "required": True, "description": "Anode (+)"},
            "C": {"type": "POWER_GND", "direction": "out", "voltage": 0.0, "required": True, "description": "Cathode (-)"}
        },
        "datasheet_url": "https://www.kingbrightusa.com/images/catalog/SPEC/WP7113QBC-D.pdf",
        "source_metadata": {"verified": True, "source": "Kingbright Official Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/led.png",
        "image_attribution": "Wokwi Open Elements",
        "wokwi_part_id": "wokwi-led",
        "wokwi_type": "wokwi-led",
        "default_attrs": {"color": "blue"},
        "firmware_libraries": [],
        "known_limitations": ["Higher forward voltage (3.2V) leaves minimal overhead on 3.3V logic rails."],
        "description": "High-intensity 20mA indicator LED (Blue)."
    },
    "buzzer-piezo": {
        "part_id": "buzzer-piezo",
        "canonical_name": "Piezoelectric Acoustic Transducer",
        "display_name": "Piezo Buzzer",
        "manufacturer": "Murata / CUI Devices / Generic",
        "model": "PKM13EPYH4002-B0",
        "category": "actuator",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 3.0,
            "voltage_max": 12.0,
            "voltage_typical": 3.3,
            "resonant_frequency_hz": 4000.0,
            "sound_pressure_level_db": 85.0,
            "current_draw_ma": 15.0
        },
        "pins": {
            "1": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground return / Negative terminal"},
            "2": {"type": "PWM", "direction": "in", "voltage": 3.3, "required": True, "description": "PWM tone signal / Positive terminal"}
        },
        "datasheet_url": "https://www.cuidevices.com/product/resource/cpe-163.pdf",
        "source_metadata": {"verified": True, "source": "CUI Devices Audio Indicator Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/buzzer.png",
        "image_attribution": "Wokwi Audio Component",
        "wokwi_part_id": "wokwi-buzzer",
        "wokwi_type": "wokwi-buzzer",
        "default_attrs": {},
        "firmware_libraries": [],
        "known_limitations": [
            "Must be connected to a PWM timer pin (e.g. GPIO19 on ESP32 or D3/D9 on Uno) to generate audible pitch modulation.",
            "DC voltage creates only a single pop sound without oscillating signal."
        ],
        "description": "Piezoelectric sound transducer for acoustic warning signals."
    },
    "resistor-220": {
        "part_id": "resistor-220",
        "canonical_name": "220Ω 1/4W Carbon Film Resistor",
        "display_name": "220 Ω Resistor",
        "manufacturer": "Yageo / Generic",
        "model": "CFR-25JR-52-220R",
        "category": "passive",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "resistance_ohms": 220.0,
            "tolerance_percent": 5.0,
            "power_rating_watts": 0.25,
            "max_working_voltage": 250.0
        },
        "pins": {
            "1": {"type": "PASSIVE", "direction": "passive", "voltage": 0.0, "required": True, "description": "Terminal 1"},
            "2": {"type": "PASSIVE", "direction": "passive", "voltage": 0.0, "required": True, "description": "Terminal 2"}
        },
        "datasheet_url": "https://www.yageo.com/upload/products/productsearch/datasheet/r_cfr_2013.pdf",
        "source_metadata": {"verified": True, "source": "Yageo Carbon Film Resistor Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/resistor.png",
        "image_attribution": "Wokwi Passive Elements",
        "wokwi_part_id": "wokwi-resistor",
        "wokwi_type": "wokwi-resistor",
        "default_attrs": {"value": "220"},
        "firmware_libraries": [],
        "known_limitations": ["Current rating max 33mA at 0.25W."],
        "description": "220 Ohm current-limiting resistor for LEDs."
    },
    "dht22": {
        "part_id": "dht22",
        "canonical_name": "DHT22 / AM2302 Digital Temperature & Humidity Sensor",
        "display_name": "DHT22 Temperature & Humidity Sensor",
        "manufacturer": "Aosong Electronics",
        "model": "AM2302",
        "category": "sensor",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 3.3,
            "voltage_max": 5.5,
            "voltage_typical": 3.3,
            "current_draw_measuring_ma": 1.5,
            "current_draw_standby_ua": 40.0,
            "temp_range_c_min": -40.0,
            "temp_range_c_max": 80.0,
            "temp_accuracy_c": 0.5,
            "humidity_range_pct_min": 0.0,
            "humidity_range_pct_max": 100.0,
            "humidity_accuracy_pct": 2.0,
            "sampling_period_seconds": 2.0
        },
        "pins": {
            "VCC": {"type": "POWER_VCC", "direction": "in", "voltage": 3.3, "required": True, "description": "Supply voltage (+3.3V to 5.5V)"},
            "SDA": {"type": "DIGITAL_IN", "direction": "bidirectional", "voltage": 3.3, "required": True, "description": "Single-bus bidirectional data communication"},
            "NC": {"type": "NC", "direction": "passive", "voltage": 0.0, "required": False, "description": "No connection"},
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground return"}
        },
        "datasheet_url": "https://www.sparkfun.com/datasheets/Sensors/Temperature/DHT22.pdf",
        "source_metadata": {"verified": True, "source": "Aosong AM2302 Product Specification"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/dht22.png",
        "image_attribution": "Wokwi Sensor Elements",
        "wokwi_part_id": "wokwi-dht22",
        "wokwi_type": "wokwi-dht22",
        "default_attrs": {},
        "firmware_libraries": ["DHT sensor library", "Adafruit Unified Sensor"],
        "known_limitations": [
            "Minimum 2-second sampling interval between consecutive readings.",
            "Requires 4.7k - 10k pull-up resistor on the data line if not built into the breakout board."
        ],
        "description": "Capacitive humidity sensor & thermistor with calibrated digital signal output."
    },
    "oled-ssd1306": {
        "part_id": "oled-ssd1306",
        "canonical_name": "0.96-inch 128x64 I2C OLED Display (SSD1306 Driver)",
        "display_name": "0.96\" I2C OLED Display (SSD1306)",
        "manufacturer": "Solomon Systech / Adafruit / Generic",
        "model": "SSD1306",
        "category": "display",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 3.3,
            "voltage_max": 5.0,
            "voltage_typical": 3.3,
            "current_typical_ma": 20.0,
            "current_max_ma": 40.0,
            "resolution_x": 128,
            "resolution_y": 64,
            "i2c_clock_max_khz": 400.0,
            "default_i2c_address": "0x3C"
        },
        "pins": {
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground return"},
            "VCC": {"type": "POWER_VCC", "direction": "in", "voltage": 3.3, "required": True, "description": "Power supply (+3.3V / 5V)"},
            "SCL": {"type": "I2C_SCL", "direction": "in", "voltage": 3.3, "required": True, "description": "I2C Serial Clock (ESP32 GPIO22)"},
            "SDA": {"type": "I2C_SDA", "direction": "bidirectional", "voltage": 3.3, "required": True, "description": "I2C Serial Data (ESP32 GPIO21)"}
        },
        "datasheet_url": "https://cdn-shop.adafruit.com/datasheets/SSD1306.pdf",
        "source_metadata": {"verified": True, "source": "Solomon Systech SSD1306 Datasheet Rev 1.1"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/ssd1306.png",
        "image_attribution": "Wokwi Display Library",
        "wokwi_part_id": "wokwi-ssd1306",
        "wokwi_type": "wokwi-ssd1306",
        "default_attrs": {},
        "firmware_libraries": ["Adafruit SSD1306", "Adafruit GFX Library"],
        "known_limitations": [
            "Requires 1KB of microcontroller SRAM buffer for full-frame refresh.",
            "Default I2C address is typically 0x3C; check breakout board resistor jumper for 0x3D."
        ],
        "description": "128x64 monochrome OLED display with I2C communication interface."
    },
    "servo": {
        "part_id": "servo",
        "canonical_name": "SG90 9g Micro Positional Servo Motor",
        "display_name": "SG90 Micro Servo 9g",
        "manufacturer": "Tower Pro / Generic",
        "model": "SG90",
        "category": "actuator",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 4.8,
            "voltage_max": 6.0,
            "voltage_typical": 5.0,
            "stall_current_ma": 650.0,
            "running_current_ma": 220.0,
            "stall_torque_kg_cm": 1.8,
            "operating_speed_sec_60deg": 0.1,
            "pwm_frequency_hz": 50.0,
            "pulse_min_us": 1000.0,
            "pulse_max_us": 2000.0
        },
        "pins": {
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground return (Brown wire)"},
            "V+": {"type": "POWER_VCC", "direction": "in", "voltage": 5.0, "required": True, "description": "Power supply (+5V, Red wire)"},
            "PWM": {"type": "PWM", "direction": "in", "voltage": 3.3, "required": True, "description": "50Hz control signal (Orange wire)"}
        },
        "datasheet_url": "http://www.ee.ic.ac.uk/pcheung/teaching/DE1_EE/stores/sg90_datasheet.pdf",
        "source_metadata": {"verified": True, "source": "Tower Pro SG90 Specification"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/servo.png",
        "image_attribution": "Wokwi Actuator Elements",
        "wokwi_part_id": "wokwi-servo",
        "wokwi_type": "wokwi-servo",
        "default_attrs": {},
        "firmware_libraries": ["ESP32Servo", "Servo"],
        "known_limitations": [
            "Motor stall and movement surges (>500mA) can reset microcontroller if powered directly from 3.3V regulator; use 5V or external power."
        ],
        "description": "Miniature positional servo motor (0° to 180° rotation)."
    },
    "potentiometer": {
        "part_id": "potentiometer",
        "canonical_name": "10kΩ Rotary Linear Potentiometer",
        "display_name": "10kΩ Rotary Potentiometer",
        "manufacturer": "Bourns / Alpha / Generic",
        "model": "RV09AF-40-20K-B10K",
        "category": "input",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "resistance_ohms": 10000.0,
            "taper": "Linear (B)",
            "max_working_voltage": 50.0,
            "power_rating_watts": 0.05,
            "rotational_angle_degrees": 300.0
        },
        "pins": {
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Terminal 1 (GND)"},
            "SIG": {"type": "ANALOG_IN", "direction": "out", "voltage": 3.3, "required": True, "description": "Wiper analog output voltage (Connect to ADC pin)"},
            "VCC": {"type": "POWER_VCC", "direction": "in", "voltage": 3.3, "required": True, "description": "Terminal 3 (Reference voltage, +3.3V)"}
        },
        "datasheet_url": "https://www.bourns.com/docs/product-datasheets/ptd90.pdf",
        "source_metadata": {"verified": True, "source": "Bourns Rotary Potentiometer Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/potentiometer.png",
        "image_attribution": "Wokwi Input Elements",
        "wokwi_part_id": "wokwi-potentiometer",
        "wokwi_type": "wokwi-potentiometer",
        "default_attrs": {},
        "firmware_libraries": [],
        "known_limitations": ["Requires connection to an ADC input pin."],
        "description": "Analog voltage divider for adjustable manual parameter input."
    },
    "pushbutton": {
        "part_id": "pushbutton",
        "canonical_name": "6mm Momentary SPST Tactile Pushbutton",
        "display_name": "Tactile Push Button",
        "manufacturer": "Omron / C&K / Generic",
        "model": "B3F-1000",
        "category": "input",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "contact_rating_ma": 50.0,
            "contact_rating_voltage": 24.0,
            "contact_resistance_mohm_max": 100.0,
            "operating_force_gf": 160.0
        },
        "pins": {
            "1.l": {"type": "DIGITAL_IN", "direction": "in", "voltage": 0.0, "required": True, "description": "Terminal 1 left (connect to GPIO)"},
            "2.l": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Terminal 2 left (connect to GND)"},
            "1.r": {"type": "PASSIVE", "direction": "passive", "voltage": 0.0, "required": False, "description": "Terminal 1 right (internally tied to 1.l)"},
            "2.r": {"type": "PASSIVE", "direction": "passive", "voltage": 0.0, "required": False, "description": "Terminal 2 right (internally tied to 2.l)"}
        },
        "datasheet_url": "https://components.omron.com/us-en/datasheet_pdf/B3F.pdf",
        "source_metadata": {"verified": True, "source": "Omron Electronic Components B3F Series Datasheet"},
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/pushbutton.png",
        "image_attribution": "Wokwi Input Elements",
        "wokwi_part_id": "wokwi-pushbutton",
        "wokwi_type": "wokwi-pushbutton",
        "default_attrs": {"color": "red"},
        "firmware_libraries": [],
        "known_limitations": [
            "Mechanical contacts exhibit contact bounce (typically 1-5ms); enable software debounce or hardware capacitor filtering.",
            "Use INPUT_PULLUP mode in firmware to avoid floating input states."
        ],
        "description": "Tactile switch for digital user input."
    },
    "mpu6050": {
        "part_id": "mpu6050",
        "canonical_name": "MPU-6050 6-Axis Accelerometer and Gyroscope",
        "display_name": "MPU-6050 6-DoF IMU",
        "manufacturer": "InvenSense / TDK",
        "model": "MPU-6050 (GY-521 Breakout)",
        "category": "sensor",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 3.0,
            "voltage_max": 5.0,
            "voltage_typical": 3.3,
            "logic_voltage": 3.3,
            "current_draw_ma": 3.9,
            "sleep_current_ua": 5.0,
            "i2c_address_default": "0x68",
            "i2c_address_alternate": "0x69",
            "accel_ranges_g": [2, 4, 8, 16],
            "gyro_ranges_dps": [250, 500, 1000, 2000]
        },
        "pins": {
            "VCC": {"type": "POWER_VCC", "direction": "in", "voltage": 3.3, "required": True, "description": "Power supply (+3.3V or +5V via breakout LDO)"},
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground reference"},
            "SCL": {"type": "I2C_SCL", "direction": "in", "voltage": 3.3, "required": True, "description": "I2C Serial Clock bus line"},
            "SDA": {"type": "I2C_SDA", "direction": "inout", "voltage": 3.3, "required": True, "description": "I2C Serial Data bidirectional line"},
            "XDA": {"type": "DIGITAL", "direction": "inout", "voltage": 3.3, "required": False, "description": "Auxiliary I2C master serial data"},
            "XCL": {"type": "DIGITAL", "direction": "out", "voltage": 3.3, "required": False, "description": "Auxiliary I2C master serial clock"},
            "AD0": {"type": "DIGITAL_IN", "direction": "in", "voltage": 3.3, "required": False, "description": "I2C Address LSB selection (GND=0x68, VCC=0x69)"},
            "INT": {"type": "DIGITAL_OUT", "direction": "out", "voltage": 3.3, "required": False, "description": "Programmable motion/data-ready interrupt output"}
        },
        "datasheet_url": "https://invensense.tdk.com/wp-content/uploads/2015/02/MPU-6000-Datasheet1.pdf",
        "source_metadata": {
            "verified": True,
            "datasheet_source": "InvenSense MPU-6000/MPU-6050 Product Specification Rev 3.4",
            "last_audit": "2026-10"
        },
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/mpu6050.png",
        "image_attribution": "Wokwi Sensor Elements / CC0",
        "wokwi_part_id": "wokwi-mpu6050",
        "wokwi_type": "wokwi-mpu6050",
        "default_attrs": {},
        "firmware_libraries": ["Wire"],
        "known_limitations": [
            "Requires I2C pullup resistors on SDA and SCL lines (usually provided onboard GY-521).",
            "By default powers up in SLEEP mode; firmware must clear PWR_MGMT_1 register (0x6B) to begin sampling."
        ],
        "description": "6-axis MotionTracking device combining a 3-axis gyroscope and 3-axis accelerometer on a single silicon die with Digital Motion Processor (DMP)."
    },
    "soil-moisture": {
        "part_id": "soil-moisture",
        "canonical_name": "Capacitive / Resistive Soil Moisture Sensor v1.2",
        "display_name": "Soil Moisture Sensor",
        "manufacturer": "DFRobot / Generic",
        "model": "Capacitive v1.2",
        "category": "sensor",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 3.3,
            "voltage_max": 5.5,
            "voltage_typical": 3.3,
            "current_draw_ma": 5.0,
            "output_type": "Analog Voltage (0-3.3V / 0-5V)",
            "output_min_v": 1.2,
            "output_max_v": 3.0
        },
        "pins": {
            "VCC": {"type": "POWER_VCC", "direction": "in", "voltage": 3.3, "required": True, "description": "Power supply (+3.3V to 5V DC)"},
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Ground return"},
            "AOUT": {"type": "ANALOG_IN", "direction": "out", "voltage": 3.3, "required": True, "description": "Analog voltage proportional to soil volumetric water content (Connect to ADC pin)"}
        },
        "datasheet_url": "https://wiki.dfrobot.com/Capacitive_Soil_Moisture_Sensor_SKU_SEN0193",
        "source_metadata": {
            "verified": True,
            "datasheet_source": "DFRobot Capacitive Soil Moisture Sensor Technical Specification",
            "last_audit": "2026-10"
        },
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/potentiometer.png",
        "image_attribution": "Wokwi Analog Sensors / CC0",
        "wokwi_part_id": "wokwi-potentiometer",
        "wokwi_type": "wokwi-potentiometer",
        "default_attrs": {"label": "Soil Moisture"},
        "firmware_libraries": [],
        "known_limitations": [
            "Analog output requires calibration for dry air reference vs fully saturated water reference.",
            "Must connect to an ADC-capable analog input pin (e.g. GPIO34/GPIO32 on ESP32 or A0 on Arduino Uno)."
        ],
        "description": "Corrosion-resistant analog soil moisture sensor measuring soil volumetric water content."
    },
    "esc-interface": {
        "part_id": "esc-interface",
        "canonical_name": "Brushless ESC PWM Signal Interface",
        "display_name": "Brushless ESC Signal Interface",
        "manufacturer": "Standard BLDC Electronic Speed Controller",
        "model": "Generic ESC PWM 50-400Hz",
        "category": "actuator",
        "board_compatibility": ["esp32-devkit-v1", "arduino-uno", "raspberry-pi-pico"],
        "electrical_characteristics": {
            "voltage_min": 3.3,
            "voltage_max": 5.0,
            "voltage_typical": 3.3,
            "pwm_frequency_hz": 50.0,
            "pulse_width_min_us": 1000.0,
            "pulse_width_max_us": 2000.0,
            "current_draw_ma": 2.0
        },
        "pins": {
            "PWM": {"type": "PWM", "direction": "in", "voltage": 3.3, "required": True, "description": "PWM throttle command signal (1000us - 2000us)"},
            "GND": {"type": "POWER_GND", "direction": "in", "voltage": 0.0, "required": True, "description": "Signal ground reference"}
        },
        "datasheet_url": "https://docs.circuitmind.io/components/esc-interface",
        "source_metadata": {
            "verified": True,
            "source": "Standard RC PWM / OneShot ESC Interface Specification",
            "last_audit": "2026-10"
        },
        "image_url": "https://raw.githubusercontent.com/wokwi/wokwi-features/master/images/servo.png",
        "image_attribution": "CircuitMind Open Hardware Specification",
        "wokwi_part_id": None,
        "wokwi_type": None,
        "default_attrs": {},
        "firmware_libraries": [],
        "known_limitations": [
            "Wokwi does not provide a native 3-phase BLDC motor or ESC physical simulator model; signal verification is performed via PWM duty cycle and pulse width timing telemetry.",
            "Do not connect high-voltage ESC battery power rails directly to microcontroller GPIOs."
        ],
        "description": "Standard PWM signal control interface for electronic speed controllers driving brushless motors."
    }
}


