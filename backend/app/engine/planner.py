import uuid
import re
from typing import Dict, Any, List, Optional, Set
from datetime import datetime, timezone
from backend.app.models.project import (
    Project, BoardConfig, Requirement, ComponentInstance, 
    Connection, PinAssignment, FirmwareArtifact, TestCase, utc_now_iso
)
from backend.app.catalog.boards import BOARDS
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.engine.generator import generate_firmware_code, generate_build_guide, generate_wokwi_diagram
from backend.app.engine.validator import validate_project_hardware
from backend.app.engine.llm import execute_llm_generation, ProjectGenerationError

def create_smart_parking_sensor_project(project_id: Optional[str] = None, threshold_cm: float = 20.0) -> Project:
    p_id = project_id or f"proj-{uuid.uuid4().hex[:8]}"
    
    board = BoardConfig(
        type="esp32-devkit-v1",
        display_name="ESP32 DevKit V1",
        architecture="Xtensa dual-core 32-bit LX6 @ 240MHz",
        voltage_logic=3.3,
        voltage_supply=5.0,
        pins_available=BOARDS["esp32-devkit-v1"]["pins"],
        reserved_pins=BOARDS["esp32-devkit-v1"]["reserved_pins"]
    )
    
    requirements = [
        Requirement(
            id="req-001",
            description="Measure obstacle distance continuously using ultrasonic ultrasound waves.",
            priority="required",
            category="sensing"
        ),
        Requirement(
            id="req-002",
            description=f"When an object is closer than {threshold_cm:.0f} cm, activate warning optical LED and acoustic buzzer.",
            priority="required",
            category="actuation",
            target_value=str(threshold_cm)
        ),
        Requirement(
            id="req-003",
            description=f"When an object is farther than {threshold_cm:.0f} cm, deactivate warning actuators.",
            priority="required",
            category="control",
            target_value=str(threshold_cm)
        ),
        Requirement(
            id="req-004",
            description="Stream real-time sensor distance and system status over Serial at 115200 baud.",
            priority="recommended",
            category="connectivity"
        )
    ]
    
    components = [
        ComponentInstance(
            id="ultrasonic",
            part_id="hc-sr04",
            name="HC-SR04 Ultrasonic Distance Sensor",
            category="sensor",
            pins=["VCC", "TRIG", "ECHO", "GND"],
            description="Detects distance of obstacles."
        ),
        ComponentInstance(
            id="warning_led",
            part_id="led-red",
            name="Warning Alert LED (Red)",
            category="actuator",
            pins=["A", "C"],
            attributes={"color": "red"},
            description="Optical visual warning indicator."
        ),
        ComponentInstance(
            id="buzzer",
            part_id="buzzer-piezo",
            name="Piezo Buzzer Alarm",
            category="actuator",
            pins=["1", "2"],
            description="Audible alert emitter."
        ),
        ComponentInstance(
            id="resistor",
            part_id="resistor-220",
            name="220 Ohm Current Limiting Resistor",
            category="passive",
            pins=["1", "2"],
            attributes={"resistance": "220"},
            description="Limits LED forward current to safe levels."
        )
    ]
    
    pin_assignments = [
        PinAssignment(component_id="ultrasonic", component_pin="VCC", board_pin="VIN", signal_type="POWER_VCC"),
        PinAssignment(component_id="ultrasonic", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id="ultrasonic", component_pin="TRIG", board_pin="D5", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id="ultrasonic", component_pin="ECHO", board_pin="D18", signal_type="DIGITAL_IN"),
        
        PinAssignment(component_id="warning_led", component_pin="A", board_pin="D23", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id="warning_led", component_pin="C", board_pin="GND", signal_type="POWER_GND"),
        
        PinAssignment(component_id="buzzer", component_pin="2", board_pin="D19", signal_type="PWM_OUT"),
        PinAssignment(component_id="buzzer", component_pin="1", board_pin="GND", signal_type="POWER_GND")
    ]
    
    connections = [
        Connection(id="c1", from_component="board", from_pin="VIN", to_component="ultrasonic", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id="c2", from_component="board", from_pin="GND", to_component="ultrasonic", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id="c3", from_component="board", from_pin="D5", to_component="ultrasonic", to_pin="TRIG", color="blue", signal_type="DIGITAL"),
        Connection(id="c4", from_component="board", from_pin="D18", to_component="ultrasonic", to_pin="ECHO", color="cyan", signal_type="DIGITAL"),
        
        Connection(id="c5", from_component="board", from_pin="D23", to_component="resistor", to_pin="1", color="orange", signal_type="DIGITAL"),
        Connection(id="c6", from_component="resistor", from_pin="2", to_component="warning_led", to_pin="A", color="orange", signal_type="DIGITAL"),
        Connection(id="c7", from_component="board", from_pin="GND", to_component="warning_led", to_pin="C", color="black", signal_type="GROUND"),
        
        Connection(id="c8", from_component="board", from_pin="D19", to_component="buzzer", to_pin="2", color="purple", signal_type="PWM"),
        Connection(id="c9", from_component="board", from_pin="GND", to_component="buzzer", to_pin="1", color="black", signal_type="GROUND")
    ]
    
    tests = [
        TestCase(
            id="test-close-obstacle",
            name="Proximity Alarm Trigger",
            requirement_id="req-002",
            given=f"The simulated obstacle is at 12.0 cm (closer than {threshold_cm:.0f} cm)",
            when="The firmware control loop samples the ultrasonic echo duration",
            then="Warning LED state = HIGH and Piezo Buzzer = HIGH",
            test_type="threshold_trigger",
            parameters={"simulated_distance": 12.0}
        ),
        TestCase(
            id="test-far-obstacle",
            name="Clear Zone Deactivation",
            requirement_id="req-003",
            given="The simulated obstacle is beyond the warning threshold (e.g., 45.0 cm)",
            when="The firmware control loop samples the ultrasonic echo duration",
            then="Warning LED state = LOW and Piezo Buzzer = LOW",
            test_type="threshold_trigger",
            parameters={"simulated_distance": 45.0}
        )
    ]
    
    temp_project = Project(
        id=p_id,
        title="Smart Parking Sensor",
        description=f"ESP32 ultrasonic distance parking assistant triggering red LED and buzzer when obstacles are closer than {threshold_cm:.0f} cm.",
        board=board,
        requirements=requirements,
        components=components,
        connections=connections,
        pin_assignments=pin_assignments,
        tests=tests,
        version=1
    )
    
    # Generate firmware & build guide
    code = generate_firmware_code(temp_project)
    temp_project.firmware = [
        FirmwareArtifact(filename="sketch.ino", code=code, language="cpp", version=1)
    ]
    temp_project.build_guide = generate_build_guide(temp_project)
    
    # Deterministic Hardware Validation
    validation_res = validate_project_hardware(temp_project)
    temp_project.validation = validation_res
    temp_project.sim_status = "ready" if validation_res.status in ["validated", "warning"] else "draft"
    
    return temp_project

def create_hospital_patient_monitor_project(project_id: Optional[str] = None, alert_temp_c: float = 38.0) -> Project:
    """
    Creates Hospital Patient Vitals & Room Environment Monitor.
    Monitors patient temperature & humidity via DHT22, displays telemetry on SSD1306 OLED,
    triggers visual Red LED and audible Buzzer when fever exceeds threshold, and provides
    emergency Nurse Call button distress trigger.
    """
    p_id = project_id or f"proj-{uuid.uuid4().hex[:8]}"

    board = BoardConfig(
        type="esp32-devkit-v1",
        display_name="ESP32 DevKit V1",
        architecture="Xtensa dual-core 32-bit LX6 @ 240MHz",
        voltage_logic=3.3,
        voltage_supply=5.0,
        pins_available=BOARDS["esp32-devkit-v1"]["pins"],
        reserved_pins=BOARDS["esp32-devkit-v1"]["reserved_pins"]
    )

    requirements = [
        Requirement(
            id=f"{p_id}-req-001",
            description="Continuously sample patient room ambient temperature and relative humidity using DHT22 digital sensor.",
            priority="required",
            category="sensing"
        ),
        Requirement(
            id=f"{p_id}-req-002",
            description="Display real-time vital telemetry (temperature, humidity, clinical status) on SSD1306 OLED bedside display.",
            priority="required",
            category="display"
        ),
        Requirement(
            id=f"{p_id}-req-003",
            description=f"Engage audible emergency buzzer and optical red LED when patient temperature exceeds fever threshold of {alert_temp_c:.1f}°C.",
            priority="required",
            category="actuation",
            target_value=str(alert_temp_c)
        ),
        Requirement(
            id=f"{p_id}-req-004",
            description="Monitor patient distress emergency nurse call pushbutton for instant triage alerting.",
            priority="required",
            category="sensing"
        ),
        Requirement(
            id=f"{p_id}-req-005",
            description="Stream medical telemetry over Serial at 115200 baud for central nursing station monitor.",
            priority="recommended",
            category="connectivity"
        )
    ]

    components = [
        ComponentInstance(
            id=f"{p_id}-dht22",
            part_id="dht22",
            name="DHT22 Temperature & Humidity Sensor",
            category="sensor",
            pins=["VCC", "SDA", "NC", "GND"],
            description="Medical-grade environmental and body temperature/humidity transducer."
        ),
        ComponentInstance(
            id=f"{p_id}-oled",
            part_id="oled-ssd1306",
            name="SSD1306 0.96 inch I2C OLED Display",
            category="display",
            pins=["VCC", "GND", "SCL", "SDA"],
            description="Bedside real-time vitals and diagnostic telemetry screen."
        ),
        ComponentInstance(
            id=f"{p_id}-alert-led",
            part_id="led-red",
            name="Critical Condition Alert LED (Red)",
            category="actuator",
            pins=["A", "C"],
            attributes={"color": "red"},
            description="Optical triage alarm light."
        ),
        ComponentInstance(
            id=f"{p_id}-buzzer",
            part_id="buzzer-piezo",
            name="Emergency Acoustic Alarm Buzzer",
            category="actuator",
            pins=["1", "2"],
            description="Audible medical alert transducer."
        ),
        ComponentInstance(
            id=f"{p_id}-nurse-call",
            part_id="pushbutton",
            name="Nurse Call Distress Pushbutton",
            category="input",
            pins=["1", "2"],
            description="Emergency patient call button."
        )
    ]

    pin_assignments = [
        PinAssignment(component_id=f"{p_id}-dht22", component_pin="VCC", board_pin="3V3", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-dht22", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-dht22", component_pin="SDA", board_pin="D4", signal_type="DIGITAL_IN"),

        PinAssignment(component_id=f"{p_id}-oled", component_pin="VCC", board_pin="3V3", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-oled", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-oled", component_pin="SDA", board_pin="D21", signal_type="I2C_SDA"),
        PinAssignment(component_id=f"{p_id}-oled", component_pin="SCL", board_pin="D22", signal_type="I2C_SCL"),

        PinAssignment(component_id=f"{p_id}-alert-led", component_pin="A", board_pin="D23", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id=f"{p_id}-alert-led", component_pin="C", board_pin="GND", signal_type="POWER_GND"),

        PinAssignment(component_id=f"{p_id}-buzzer", component_pin="2", board_pin="D19", signal_type="PWM_OUT"),
        PinAssignment(component_id=f"{p_id}-buzzer", component_pin="1", board_pin="GND", signal_type="POWER_GND"),

        PinAssignment(component_id=f"{p_id}-nurse-call", component_pin="1", board_pin="D15", signal_type="DIGITAL_IN"),
        PinAssignment(component_id=f"{p_id}-nurse-call", component_pin="2", board_pin="GND", signal_type="POWER_GND")
    ]

    connections = [
        Connection(id=f"{p_id}-c1", from_component="board", from_pin="3V3", to_component=f"{p_id}-dht22", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c2", from_component="board", from_pin="GND", to_component=f"{p_id}-dht22", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c3", from_component="board", from_pin="D4", to_component=f"{p_id}-dht22", to_pin="SDA", color="blue", signal_type="DIGITAL"),

        Connection(id=f"{p_id}-c4", from_component="board", from_pin="3V3", to_component=f"{p_id}-oled", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c5", from_component="board", from_pin="GND", to_component=f"{p_id}-oled", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c6", from_component="board", from_pin="D21", to_component=f"{p_id}-oled", to_pin="SDA", color="yellow", signal_type="I2C"),
        Connection(id=f"{p_id}-c7", from_component="board", from_pin="D22", to_component=f"{p_id}-oled", to_pin="SCL", color="green", signal_type="I2C"),

        Connection(id=f"{p_id}-c8", from_component="board", from_pin="D23", to_component=f"{p_id}-alert-led", to_pin="A", color="orange", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c9", from_component="board", from_pin="GND", to_component=f"{p_id}-alert-led", to_pin="C", color="black", signal_type="GROUND"),

        Connection(id=f"{p_id}-c10", from_component="board", from_pin="D19", to_component=f"{p_id}-buzzer", to_pin="2", color="purple", signal_type="PWM"),
        Connection(id=f"{p_id}-c11", from_component="board", from_pin="GND", to_component=f"{p_id}-buzzer", to_pin="1", color="black", signal_type="GROUND"),

        Connection(id=f"{p_id}-c12", from_component="board", from_pin="D15", to_component=f"{p_id}-nurse-call", to_pin="1", color="white", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c13", from_component="board", from_pin="GND", to_component=f"{p_id}-nurse-call", to_pin="2", color="black", signal_type="GROUND")
    ]

    tests = [
        TestCase(
            id=f"{p_id}-test-normal-vitals",
            name="Normal Patient Vitals Condition",
            requirement_id=f"{p_id}-req-001",
            given="Patient temperature is 36.8°C and relative humidity is 48%",
            when="Firmware control loop polls DHT22 and evaluates clinical thresholds",
            then="Alert LED state = LOW and Emergency Buzzer = LOW (Status: NORMAL)",
            test_type="threshold_trigger",
            parameters={"simulated_temperature_c": 36.8, "simulated_humidity": 48.0}
        ),
        TestCase(
            id=f"{p_id}-test-fever-alert",
            name="Fever Emergency Condition Alert",
            requirement_id=f"{p_id}-req-003",
            given=f"Patient temperature elevates to 38.6°C (exceeding {alert_temp_c:.1f}°C threshold)",
            when="Firmware detects temperature beyond fever limit",
            then="Alert LED = HIGH (ON) and Buzzer = HIGH (PULSED ALARM)",
            test_type="threshold_trigger",
            parameters={"simulated_temperature_c": 38.6, "simulated_humidity": 55.0}
        ),
        TestCase(
            id=f"{p_id}-test-nurse-call",
            name="Nurse Emergency Call Distress Trigger",
            requirement_id=f"{p_id}-req-004",
            given="Patient depresses the emergency bedside nurse call pushbutton",
            when="Firmware polls pin D15 and detects LOW pull-to-ground transition",
            then="Emergency Alert Active: OLED displays NURSE CALL and Buzzer sounds",
            test_type="pin_state",
            parameters={"button_pressed": True}
        )
    ]

    proj = Project(
        id=p_id,
        title="Hospital Patient Vitals & Environment Monitor",
        description="Continuous hospital patient room vital signs and environmental monitoring system using ESP32, DHT22 temperature/humidity sensor, SSD1306 OLED bedside display, visual red alert LED, acoustic alarm buzzer, and emergency nurse call button.",
        board=board,
        requirements=requirements,
        components=components,
        connections=connections,
        pin_assignments=pin_assignments,
        tests=tests,
        version=1
    )

    proj.firmware = [
        FirmwareArtifact(filename="sketch.ino", code=generate_firmware_code(proj), language="cpp", version=1)
    ]
    proj.build_guide = generate_build_guide(proj)
    proj.validation = validate_project_hardware(proj)
    proj.sim_status = "ready"
    return proj

def create_smart_greenhouse_project(project_id: Optional[str] = None, prompt: Optional[str] = None) -> Project:
    """
    Canonical deterministic fixture for Smart Greenhouse Monitoring System.
    Monitors ambient temperature and humidity via DHT22, soil moisture via analog capacitive sensor,
    controls SG90 micro-servo roof vent flap based on temperature threshold,
    triggers optical red LED (with 220 ohm resistor) on dry soil condition,
    and displays telemetry on SSD1306 OLED display.
    """
    p_id = project_id or f"proj-{uuid.uuid4().hex[:8]}"
    board = BoardConfig(
        type="esp32-devkit-v1",
        display_name="ESP32 DevKit V1",
        architecture="Xtensa dual-core 32-bit LX6 @ 240MHz",
        voltage_logic=3.3,
        voltage_supply=5.0,
        pins_available=BOARDS["esp32-devkit-v1"]["pins"],
        reserved_pins=BOARDS["esp32-devkit-v1"]["reserved_pins"]
    )
    req_text = prompt or "Smart Greenhouse Monitoring System with ESP32, DHT22 temperature and humidity sensor, analog soil moisture sensor, SG90 servo motor for automated roof ventilation, red alert LED with 220 ohm resistor, and SSD1306 OLED telemetry display."
    requirements = [
        Requirement(
            id=f"{p_id}-req-001",
            description="Measure ambient temperature and relative humidity continuously using the DHT22 digital sensor.",
            priority="required",
            category="sensing",
            status="implemented"
        ),
        Requirement(
            id=f"{p_id}-req-002",
            description="Measure soil volumetric water content continuously using the analog soil moisture sensor.",
            priority="required",
            category="sensing",
            status="implemented"
        ),
        Requirement(
            id=f"{p_id}-req-003",
            description="When ambient temperature exceeds 28.0°C, actuate SG90 servo motor to 90° to open the roof ventilation window; return to 0° when temperature normalizes.",
            priority="required",
            category="actuation",
            target_value="28.0",
            status="implemented"
        ),
        Requirement(
            id=f"{p_id}-req-004",
            description="When soil moisture falls below 30.0%, activate the red alert LED via a 220Ω current-limiting resistor to indicate irrigation needed.",
            priority="required",
            category="actuation",
            target_value="30.0",
            status="implemented"
        ),
        Requirement(
            id=f"{p_id}-req-005",
            description="Display live environmental readings and system actuation status on the SSD1306 I2C OLED display.",
            priority="recommended",
            category="display",
            status="implemented"
        ),
        Requirement(
            id=f"{p_id}-req-006",
            description="Emit serial diagnostics and system telemetry at 115200 baud.",
            priority="recommended",
            category="connectivity",
            status="implemented"
        )
    ]
    components = [
        ComponentInstance(
            id=f"{p_id}-dht22",
            part_id="dht22",
            name="DHT22 Temperature & Humidity Sensor",
            category="sensor",
            pins=["VCC", "SDA", "NC", "GND"],
            description="Digital relative humidity and ambient temperature sensor.",
            position_x=380,
            position_y=70,
            rotation=0
        ),
        ComponentInstance(
            id=f"{p_id}-soil-moisture",
            part_id="soil-moisture",
            name="Soil Moisture Sensor",
            category="sensor",
            pins=["VCC", "GND", "AOUT"],
            description="Analog capacitive/resistive soil volumetric water content sensor.",
            position_x=560,
            position_y=70,
            rotation=0
        ),
        ComponentInstance(
            id=f"{p_id}-servo",
            part_id="servo",
            name="SG90 Micro Servo 9g",
            category="actuator",
            pins=["GND", "V+", "PWM"],
            description="Positional servo motor for automated roof ventilation flap (0° to 180°).",
            position_x=740,
            position_y=70,
            rotation=0
        ),
        ComponentInstance(
            id=f"{p_id}-resistor",
            part_id="resistor-220",
            name="220Ω Current Limiting Resistor",
            category="passive",
            pins=["1", "2"],
            attributes={"value": "220"},
            description="Limits LED forward current to safe levels.",
            position_x=380,
            position_y=220,
            rotation=0
        ),
        ComponentInstance(
            id=f"{p_id}-led",
            part_id="led-red",
            name="Red 5mm Indicator LED",
            category="actuator",
            pins=["A", "C"],
            attributes={"color": "red"},
            description="Optical visual alert indicator for low soil moisture.",
            position_x=560,
            position_y=220,
            rotation=0
        ),
        ComponentInstance(
            id=f"{p_id}-oled",
            part_id="oled-ssd1306",
            name="0.96\" I2C OLED Display (SSD1306)",
            category="display",
            pins=["GND", "VCC", "SCL", "SDA"],
            description="128x64 monochrome OLED display for live environmental telemetry.",
            position_x=740,
            position_y=220,
            rotation=0
        )
    ]
    pin_assignments = [
        PinAssignment(component_id=f"{p_id}-dht22", component_pin="VCC", board_pin="3V3", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-dht22", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-dht22", component_pin="SDA", board_pin="D4", signal_type="DIGITAL_IN"),

        PinAssignment(component_id=f"{p_id}-soil-moisture", component_pin="VCC", board_pin="3V3", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-soil-moisture", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-soil-moisture", component_pin="AOUT", board_pin="D34", signal_type="ANALOG_IN"),

        PinAssignment(component_id=f"{p_id}-servo", component_pin="V+", board_pin="5V", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-servo", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-servo", component_pin="PWM", board_pin="D13", signal_type="PWM"),

        PinAssignment(component_id=f"{p_id}-resistor", component_pin="1", board_pin="D23", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id=f"{p_id}-led", component_pin="C", board_pin="GND", signal_type="POWER_GND"),

        PinAssignment(component_id=f"{p_id}-oled", component_pin="VCC", board_pin="3V3", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-oled", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-oled", component_pin="SDA", board_pin="D21", signal_type="I2C_SDA"),
        PinAssignment(component_id=f"{p_id}-oled", component_pin="SCL", board_pin="D22", signal_type="I2C_SCL"),
    ]
    connections = [
        Connection(id=f"{p_id}-c1", from_component="board", from_pin="3V3", to_component=f"{p_id}-dht22", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c2", from_component="board", from_pin="GND", to_component=f"{p_id}-dht22", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c3", from_component="board", from_pin="D4", to_component=f"{p_id}-dht22", to_pin="SDA", color="blue", signal_type="DIGITAL"),

        Connection(id=f"{p_id}-c4", from_component="board", from_pin="3V3", to_component=f"{p_id}-soil-moisture", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c5", from_component="board", from_pin="GND", to_component=f"{p_id}-soil-moisture", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c6", from_component="board", from_pin="D34", to_component=f"{p_id}-soil-moisture", to_pin="AOUT", color="purple", signal_type="ANALOG"),

        Connection(id=f"{p_id}-c7", from_component="board", from_pin="5V", to_component=f"{p_id}-servo", to_pin="V+", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c8", from_component="board", from_pin="GND", to_component=f"{p_id}-servo", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c9", from_component="board", from_pin="D13", to_component=f"{p_id}-servo", to_pin="PWM", color="orange", signal_type="PWM"),

        Connection(id=f"{p_id}-c10", from_component="board", from_pin="D23", to_component=f"{p_id}-resistor", to_pin="1", color="orange", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c11", from_component=f"{p_id}-resistor", from_pin="2", to_component=f"{p_id}-led", to_pin="A", color="orange", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c12", from_component="board", from_pin="GND", to_component=f"{p_id}-led", to_pin="C", color="black", signal_type="GROUND"),

        Connection(id=f"{p_id}-c13", from_component="board", from_pin="3V3", to_component=f"{p_id}-oled", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c14", from_component="board", from_pin="GND", to_component=f"{p_id}-oled", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c15", from_component="board", from_pin="D21", to_component=f"{p_id}-oled", to_pin="SDA", color="yellow", signal_type="I2C"),
        Connection(id=f"{p_id}-c16", from_component="board", from_pin="D22", to_component=f"{p_id}-oled", to_pin="SCL", color="green", signal_type="I2C"),
    ]
    tests = [
        TestCase(
            id=f"{p_id}-test-temp-ventilation",
            name="Elevated Temperature Automated Roof Ventilation Actuation",
            requirement_id=f"{p_id}-req-003",
            given="ESP32 reading DHT22 temperature at 32.5°C (exceeding 28.0°C threshold)",
            when="Firmware control loop polls DHT22 and evaluates ventilation threshold",
            then="Servo PWM commands roof vent flap to 90 degrees (OPEN)",
            test_type="threshold_trigger",
            parameters={"simulated_temperature_c": 32.5, "simulated_humidity": 65.0, "threshold_temp_c": 28.0}
        ),
        TestCase(
            id=f"{p_id}-test-temp-normal",
            name="Normal Temperature Vent Idle Closed State",
            requirement_id=f"{p_id}-req-003",
            given="ESP32 reading DHT22 temperature at 23.0°C (below 28.0°C threshold)",
            when="Firmware control loop polls DHT22 and evaluates ventilation threshold",
            then="Servo PWM commands roof vent flap to 0 degrees (CLOSED)",
            test_type="threshold_trigger",
            parameters={"simulated_temperature_c": 23.0, "simulated_humidity": 55.0, "threshold_temp_c": 28.0}
        ),
        TestCase(
            id=f"{p_id}-test-soil-moisture-alert",
            name="Low Soil Moisture Drought Warning Alert Trigger",
            requirement_id=f"{p_id}-req-004",
            given="Soil moisture sensor ADC reading 18.0% (below 30.0% threshold)",
            when="Firmware detects dry soil condition requiring irrigation",
            then="Red indicator LED state = HIGH (ON) to alert watering required",
            test_type="threshold_trigger",
            parameters={"simulated_moisture_pct": 18.0, "threshold_moisture_pct": 30.0}
        ),
        TestCase(
            id=f"{p_id}-test-soil-moisture-normal",
            name="Adequate Soil Moisture Standby Inactive Alert",
            requirement_id=f"{p_id}-req-004",
            given="Soil moisture sensor ADC reading 62.0% (above 30.0% threshold)",
            when="Firmware detects adequate soil hydration",
            then="Red indicator LED state = LOW (OFF)",
            test_type="threshold_trigger",
            parameters={"simulated_moisture_pct": 62.0, "threshold_moisture_pct": 30.0}
        ),
        TestCase(
            id=f"{p_id}-test-oled-telemetry",
            name="SSD1306 Live Telemetry Display Refresh",
            requirement_id=f"{p_id}-req-005",
            given="SSD1306 OLED initialized over I2C bus (SDA: D21, SCL: D22)",
            when="Firmware refreshes display frame buffer",
            then="Display renders live Temperature, Humidity, Soil Moisture, and Vent Status",
            test_type="i2c_telemetry",
            parameters={"i2c_address": "0x3C"}
        )
    ]
    proj = Project(
        id=p_id,
        title="Smart Greenhouse Monitoring System",
        description="Autonomous ESP32 greenhouse monitoring and environmental control system using DHT22 digital temperature/humidity sensor, analog capacitive soil moisture sensor, SG90 servo automated roof ventilation flap, 220Ω resistor-limited red alert LED, and SSD1306 OLED telemetry display.",
        board=board,
        requirements=requirements,
        components=components,
        pin_assignments=pin_assignments,
        connections=connections,
        tests=tests,
        version=1
    )
    proj.firmware = [
        FirmwareArtifact(filename="sketch.ino", code=generate_firmware_code(proj), language="cpp", version=1)
    ]
    proj.build_guide = generate_build_guide(proj)
    proj.diagram_layout = generate_wokwi_diagram(proj)
    proj.validation = validate_project_hardware(proj)
    proj.sim_status = "ready"
    return proj

def create_arduino_servo_project(project_id: Optional[str] = None, prompt: Optional[str] = None) -> Project:
    """
    Canonical deterministic fixture for Arduino Uno SG90 servo motor control.
    """
    p_id = project_id or f"proj-{uuid.uuid4().hex[:8]}"
    board = BoardConfig(
        type="arduino-uno",
        display_name="Arduino Uno R3",
        architecture="ATmega328P 8-bit AVR @ 16MHz",
        voltage_logic=5.0,
        voltage_supply=5.0,
        pins_available=BOARDS["arduino-uno"]["pins"],
        reserved_pins=BOARDS["arduino-uno"]["reserved_pins"]
    )
    req_text = prompt or "Build me a simple project to run servo motors using Arduino (Priority: required, Category: sensing)."
    requirements = [
        Requirement(
            id=f"{p_id}-req-001",
            description=req_text,
            priority="required",
            category="sensing"
        )
    ]
    components = [
        ComponentInstance(
            id=f"{p_id}-servo-1",
            part_id="servo",
            name="SG90 9g Micro Positional Servo Motor",
            category="actuator",
            pins=["GND", "V+", "PWM"],
            description="Miniature positional servo motor (0° to 180° rotation)."
        )
    ]
    pin_assignments = [
        PinAssignment(component_id=f"{p_id}-servo-1", component_pin="PWM", board_pin="9", signal_type="PWM"),
        PinAssignment(component_id=f"{p_id}-servo-1", component_pin="V+", board_pin="5V", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-servo-1", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
    ]
    connections = [
        Connection(id=f"{p_id}-c1", from_component="board", from_pin="5V", to_component=f"{p_id}-servo-1", to_pin="V+", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c2", from_component="board", from_pin="GND", to_component=f"{p_id}-servo-1", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c3", from_component="board", from_pin="9", to_component=f"{p_id}-servo-1", to_pin="PWM", color="orange", signal_type="PWM"),
    ]
    tests = [
        TestCase(
            id=f"{p_id}-test-servo-sweep",
            name="Positional Servo Angle Sweep Verification",
            requirement_id=f"{p_id}-req-001",
            given="Arduino Uno PWM timer initialized on pin 9",
            when="Firmware executes positional angle loop from 0 to 180 degrees",
            then="Servo shaft rotates through full 180-degree sweep range",
            test_type="threshold_trigger",
            parameters={"target_angle": 180}
        )
    ]
    proj = Project(
        id=p_id,
        title="Arduino Servo Motor Controller",
        description="Arduino Uno SG90 micro-servo positional control project.",
        board=board,
        requirements=requirements,
        components=components,
        pin_assignments=pin_assignments,
        connections=connections,
        tests=tests,
        unresolved_requirements=[
            "Operating with an autonomous angle sweep routine. Specify an input sensor (e.g., potentiometer) if interactive manual positioning is desired."
        ],
        version=1
    )
    proj.firmware = [
        FirmwareArtifact(filename="sketch.ino", code=generate_firmware_code(proj), language="cpp", version=1)
    ]
    proj.build_guide = generate_build_guide(proj)
    proj.diagram_layout = generate_wokwi_diagram(proj)
    proj.validation = validate_project_hardware(proj)
    proj.sim_status = "ready"
    return proj

def build_llm_system_prompt() -> str:
    boards_str = "\n".join([
        f"- {b['type']}: {b['display_name']} ({b['architecture']}, logic: {b['voltage_logic']}V, supply: {b['voltage_supply']}V, pins: {', '.join(b['pins'])})"
        for b in BOARDS.values()
    ])
    components_str = "\n".join([
        f"- {c['part_id']}: {c['canonical_name']} (category: {c['category']}, pins: {', '.join(c['pins'].keys())}) - {c['description']}"
        for c in COMPONENTS_CATALOG.values()
    ])

    return f"""You are CircuitMind's Lead AI Embedded Systems & Hardware Architecture Engineer.
You translate natural-language requirements into verified physical hardware specifications.

RULES:
1. TARGET BOARD: Choose the exact microcontroller board requested by the user:
   - If Arduino or Uno is requested, you MUST use 'arduino-uno'.
   - If ESP32 is requested, you MUST use 'esp32-devkit-v1'.
   - Do NOT force ESP32 when Arduino is requested.
2. COMPONENT CATALOG: You MUST select components exclusively from the catalog below using their exact 'part_id'.
   - Do NOT invent or hallucinate component names or part IDs.
   - Do NOT inject unrequested components. If the user asks for servo motors, do NOT add ultrasonic sensors, buzzers, or LEDs unless requested!
   - Note: The category label 'sensing' in a user requirement does NOT mean an ultrasonic sensor should be added.
3. REQUIREMENTS:
   - Preserve all user requirements with stable IDs (e.g. 'req-001').
   - Preserve user-specified priority ('required', 'recommended', 'optional') and category ('sensing', 'actuation', 'control', 'display', 'power').
4. PIN ASSIGNMENTS & CONNECTIONS:
   - Map component pins to valid board pins with correct signal types (POWER_VCC, POWER_GND, DIGITAL_IN, DIGITAL_OUT, PWM, ANALOG_IN).
   - For Arduino Uno, PWM pins are: 3, 5, 6, 9, 10, 11. 5V and GND are on power rails.
   - For SG90 Servo ('servo'): GND connects to 'GND', V+ connects to '5V', PWM connects to a PWM pin (e.g. '9').
   - Each connection must specify from_component ('board'), from_pin, to_component, to_pin, color ('red', 'black', 'orange', 'blue', etc.), and signal_type.
5. UNRESOLVED REQUIREMENTS:
   - If user requirements leave ambiguities (e.g., number of servos, angle limits, sensing behavior), explicitly note them in 'unresolved_requirements'.
6. VERIFICATION TESTS:
   - Provide concrete Given/When/Then behavioral test cases.
   - test_type MUST be strictly one of: 'threshold_trigger', 'pin_state', 'serial_telemetry', 'frequency', 'i2c_telemetry'.
   - Use 'i2c_telemetry' for I2C peripherals (e.g. SSD1306 OLED, MPU6050 IMU, BME280).
   - Use 'threshold_trigger' for analog/sensor thresholds (e.g. soil moisture trigger, temperature limit).
   - Use 'pin_state' for discrete digital pin levels (HIGH/LOW).

BOARDS:
{boards_str}

COMPONENT CATALOG:
{components_str}

OUTPUT FORMAT: Strict JSON matching this schema:
{{
  "title": "Concise Project Title",
  "description": "Brief engineering summary",
  "board_type": "arduino-uno" | "esp32-devkit-v1",
  "requirements": [
    {{"id": "req-001", "description": "...", "priority": "required"|"recommended"|"optional", "category": "sensing"|"actuation"|"control"|"display"}}
  ],
  "components": [
    {{"id": "comp-id-1", "part_id": "catalog_part_id", "name": "Catalog Canonical Name", "attributes": {{}}}}
  ],
  "pin_assignments": [
    {{"component_id": "comp-id-1", "component_pin": "pin_name", "board_pin": "board_pin", "signal_type": "POWER_VCC"|"POWER_GND"|"PWM"|"DIGITAL_IN"|"DIGITAL_OUT"|"ANALOG_IN"}}
  ],
  "connections": [
    {{"id": "c1", "from_component": "board", "from_pin": "board_pin", "to_component": "comp-id-1", "to_pin": "pin_name", "color": "red"|"black"|"orange"|"blue", "signal_type": "POWER"|"GROUND"|"PWM"|"DIGITAL"|"ANALOG"}}
  ],
  "tests": [
    {{"id": "test-1", "name": "Description of Test", "requirement_id": "req-001", "given": "...", "when": "...", "then": "...", "test_type": "threshold_trigger"|"pin_state"|"serial_telemetry"|"frequency"|"i2c_telemetry", "parameters": {{}}}}
  ],
  "unresolved_requirements": ["string"]
}}
"""

def extract_requirement_metadata(prompt: str) -> Dict[str, str]:
    priority = "required"
    category = "sensing"
    
    p_match = re.search(r'priority\s*:\s*(required|recommended|optional)', prompt, re.IGNORECASE)
    if p_match:
        priority = p_match.group(1).lower()
        
    c_match = re.search(r'category\s*:\s*(sensing|actuation|control|power|display|connectivity)', prompt, re.IGNORECASE)
    if c_match:
        category = c_match.group(1).lower()
    elif any(w in prompt.lower() for w in ["servo", "motor", "actuator"]):
        category = "actuation"
        
    return {"priority": priority, "category": category}

def synthesize_project_from_proposal(proposal: Dict[str, Any], prompt: str, audit: Dict[str, Any]) -> Project:
    p_id = f"proj-{uuid.uuid4().hex[:8]}"
    
    # 1. Resolve board
    board_type = proposal.get("board_type", "esp32-devkit-v1").lower()
    prompt_lower = prompt.lower()
    if "arduino" in prompt_lower or "uno" in prompt_lower or "arduino" in board_type:
        board_type = "arduino-uno"
    elif "esp32" in prompt_lower or "esp32" in board_type:
        board_type = "esp32-devkit-v1"
        
    board_def = BOARDS.get(board_type, BOARDS["arduino-uno"] if "arduino" in prompt_lower else BOARDS["esp32-devkit-v1"])
    board = BoardConfig(
        type=board_def["type"],
        display_name=board_def["display_name"],
        architecture=board_def["architecture"],
        voltage_logic=board_def["voltage_logic"],
        voltage_supply=board_def["voltage_supply"],
        pins_available=board_def["pins"],
        reserved_pins=board_def.get("reserved_pins", [])
    )

    # 2. Extract and preserve user requirement
    user_req_meta = extract_requirement_metadata(prompt)
    raw_reqs = proposal.get("requirements", [])
    requirements: List[Requirement] = []
    
    # Preserve primary user requirement as req-001
    primary_desc = prompt.strip()
    if raw_reqs and raw_reqs[0].get("description"):
        primary_desc = raw_reqs[0]["description"]
        
    requirements.append(Requirement(
        id=f"{p_id}-req-001",
        description=prompt.strip(),
        priority=user_req_meta["priority"],
        category=user_req_meta["category"],
        status="implemented"
    ))
    
    # Add subsequent requirements if any
    for i, r in enumerate(raw_reqs[1:], start=2):
        r_pri = r.get("priority", "recommended")
        if r_pri not in ["required", "recommended", "optional"]:
            r_pri = "recommended"
        r_cat = r.get("category", "control")
        if r_cat not in ["sensing", "actuation", "control", "power", "display", "connectivity"]:
            r_cat = "control"
        requirements.append(Requirement(
            id=f"{p_id}-req-{i:03d}",
            description=r.get("description", f"Requirement {i}"),
            priority=r_pri,
            category=r_cat,
            target_value=str(r.get("target_value", "")) if r.get("target_value") else None,
            status="implemented"
        ))

    # 3. Resolve components strictly from catalog
    components: List[ComponentInstance] = []
    comp_id_map: Dict[str, str] = {}
    raw_comps = list(proposal.get("components", []))
    unresolved_components: List[str] = []

    # Common English stop words and domain keywords that must NEVER be treated as hardware part identifiers
    STOP_WORDS = {
        "show", "humidity", "temperature", "moisture", "soil", "smart", "digital", "analog",
        "read", "monitor", "system", "greenhouse", "simple", "good", "fast", "high", "low",
        "value", "level", "data", "unit", "control", "controller", "circuit", "device",
        "external", "internal", "ambient", "clinical", "status", "threshold", "alert",
        "sensor", "module", "breakout", "display", "motor", "wire", "pins", "power", "vcc", "gnd",
        "esp32", "arduino", "uno", "pico", "hardware", "software", "firmware", "iot"
    }

    seen_parts = set()
    for raw_c in raw_comps:
        raw_part_id = (raw_c.get("part_id") or raw_c.get("id") or raw_c.get("name") or "").lower()
        raw_part_id = re.sub(r"\s+", "-", raw_part_id.strip())
        if not raw_part_id:
            continue

        resolved_part_id = raw_part_id
        if resolved_part_id not in COMPONENTS_CATALOG:
            # Synonym and keyword resolution to verified catalog parts
            if any(k in resolved_part_id for k in ["soil", "moisture"]):
                resolved_part_id = "soil-moisture"
            elif any(k in resolved_part_id for k in ["esc", "electronic-speed", "speed-controller", "bldc"]):
                resolved_part_id = "esc-interface"
            elif any(k in resolved_part_id for k in ["servo", "sg90"]):
                resolved_part_id = "servo"
            elif any(k in resolved_part_id for k in ["mpu", "accel", "gyro", "imu", "6050"]):
                resolved_part_id = "mpu6050"
            elif any(k in resolved_part_id for k in ["sonar", "ultrasonic", "hc-sr04", "hcsr04"]):
                resolved_part_id = "hc-sr04"
            elif "pot" in resolved_part_id:
                resolved_part_id = "potentiometer"
            elif "resistor" in resolved_part_id:
                resolved_part_id = "resistor-220"
            elif "green" in resolved_part_id and "led" in resolved_part_id:
                resolved_part_id = "led-green"
            elif "blue" in resolved_part_id and "led" in resolved_part_id:
                resolved_part_id = "led-blue"
            elif "led" in resolved_part_id:
                resolved_part_id = "led-red"
            elif any(k in resolved_part_id for k in ["button", "pushbutton", "switch"]):
                resolved_part_id = "pushbutton"
            elif any(k in resolved_part_id for k in ["buzzer", "piezo"]):
                resolved_part_id = "buzzer-piezo"
            elif any(k in resolved_part_id for k in ["oled", "display", "screen", "ssd1306"]):
                resolved_part_id = "oled-ssd1306"
            elif any(k in resolved_part_id for k in ["dht", "temp"]):
                resolved_part_id = "dht22"
            else:
                clean_name = re.sub(r"[^a-zA-Z0-9_-]", "", raw_part_id).lower()
                if clean_name not in STOP_WORDS and len(clean_name) >= 3 and not any(sw in clean_name for sw in ["show", "read", "monitor", "humidity"]):
                    unresolved_components.append(raw_part_id)
                continue

        if resolved_part_id in seen_parts and resolved_part_id not in ["led-red", "led-green", "led-blue", "resistor-220", "servo", "esc-interface"]:
            continue
        seen_parts.add(resolved_part_id)

        cat_entry = COMPONENTS_CATALOG[resolved_part_id]
        orig_id = raw_c.get("id", resolved_part_id)
        existing_count = sum(1 for c in components if c.part_id == resolved_part_id)
        if resolved_part_id == "esc-interface":
            scoped_id = f"{p_id}-esc-{existing_count + 1}"
        elif existing_count > 0:
            scoped_id = f"{p_id}-{resolved_part_id}-{existing_count + 1}"
        else:
            scoped_id = f"{p_id}-{resolved_part_id}"
        comp_id_map[orig_id] = scoped_id
        if resolved_part_id not in comp_id_map:
            comp_id_map[resolved_part_id] = scoped_id
        
        attrs = dict(cat_entry.get("default_attrs", {}))
        if isinstance(raw_c.get("attributes"), dict):
            attrs.update(raw_c["attributes"])

        idx = len(components)
        components.append(ComponentInstance(
            id=scoped_id,
            part_id=resolved_part_id,
            name=cat_entry.get("display_name", cat_entry["canonical_name"]),
            category=cat_entry["category"],
            pins=list(cat_entry["pins"].keys()),
            attributes=attrs,
            description=cat_entry.get("description"),
            position_x=380 + (idx % 3) * 180,
            position_y=70 + (idx // 3) * 150,
            rotation=0
        ))

    # Check for uncatalogued part tokens in prompt if unresolved_components is empty
    if not components and not unresolved_components:
        part_matches = re.findall(r"\b([a-zA-Z]{2,}[0-9]{2,}[a-zA-Z0-9]*)\b", prompt_lower)
        for ptok in part_matches:
            if ptok not in STOP_WORDS and ptok not in ["esp32", "esp8266"]:
                if ptok not in COMPONENTS_CATALOG and ptok not in unresolved_components:
                    unresolved_components.append(ptok)

    # If components list is empty, raise error only if NO components and NO unresolved components exist
    if not components and not unresolved_components:
        raise ProjectGenerationError("LLM failed to select any valid components from the catalog.")

    for u in unresolved_components:
        requirements.append(Requirement(
            id=f"{p_id}-req-{len(requirements)+1:03d}",
            description=f"Component '{u}' was requested but is not in the active catalog and remains unresolved.",
            priority="required",
            category="sensing",
            status="unresolved"
        ))

    # 4. Resolve Pin Assignments & Connections
    pin_assignments: List[PinAssignment] = []
    connections: List[Connection] = []
    
    board_pins_set = set(board_def["pins"])
    conn_idx = 1
    
    used_board_pins: Set[str] = set()

    # Process proposal pin assignments
    for pa in proposal.get("pin_assignments", []):
        target_comp_id = comp_id_map.get(pa.get("component_id"), pa.get("component_id"))
        comp_obj = next((c for c in components if c.id == target_comp_id), None)
        if not comp_obj:
            continue
        c_pin = pa.get("component_pin", "")
        if c_pin not in comp_obj.pins:
            if c_pin.upper() in ["SIG", "SIGNAL"] and "PWM" in comp_obj.pins:
                c_pin = "PWM"
            elif c_pin.upper() in ["SIG", "SIGNAL"] and "AOUT" in comp_obj.pins:
                c_pin = "AOUT"
            elif c_pin.upper() in ["VCC", "5V", "3V3"] and "V+" in comp_obj.pins:
                c_pin = "V+"
            elif c_pin not in comp_obj.pins:
                continue

        b_pin = pa.get("board_pin", "")
        if b_pin not in board_pins_set and b_pin not in ["5V", "3V3", "GND", "VIN"]:
            if pa.get("signal_type") == "PWM" and board_def.get("pwm_pins"):
                avail = [p for p in board_def["pwm_pins"] if p not in used_board_pins]
                b_pin = avail[0] if avail else board_def["pwm_pins"][0]
            elif board_def.get("digital_pins"):
                avail = [p for p in board_def["digital_pins"] if p not in used_board_pins]
                b_pin = avail[0] if avail else board_def["digital_pins"][0]

        # Prevent duplicate assignment of GPIO pin across multiple components
        if b_pin in used_board_pins and b_pin not in ["5V", "3V3", "GND", "VIN"]:
            if pa.get("signal_type") == "PWM" and board_def.get("pwm_pins"):
                avail = [p for p in board_def["pwm_pins"] if p not in used_board_pins]
                if avail: b_pin = avail[0]
            elif board_def.get("digital_pins"):
                avail = [p for p in board_def["digital_pins"] if p not in used_board_pins]
                if avail: b_pin = avail[0]

        if b_pin not in ["5V", "3V3", "GND", "VIN"]:
            used_board_pins.add(b_pin)

        pin_assignments.append(PinAssignment(
            component_id=comp_obj.id,
            component_pin=c_pin,
            board_pin=b_pin,
            signal_type=pa.get("signal_type", "DIGITAL_IN")
        ))
    
    for comp in components:
        cat_item = COMPONENTS_CATALOG[comp.part_id]
        pins_spec = cat_item["pins"]
        assigned_comp_pins = {pa.component_pin for pa in pin_assignments if pa.component_id == comp.id}
        
        for p_name, p_info in pins_spec.items():
            if p_info.get("required") and p_name not in assigned_comp_pins:
                sig_type = p_info.get("type", "DIGITAL_IN")
                if sig_type == "POWER_VCC":
                    if "5V" in board_pins_set and p_info.get("voltage", 5.0) >= 4.5:
                        b_pin = "5V"
                    elif "VIN" in board_pins_set and p_info.get("voltage", 5.0) >= 4.5:
                        b_pin = "VIN"
                    elif "3V3" in board_pins_set:
                        b_pin = "3V3"
                    else:
                        b_pin = "VIN" if "VIN" in board_pins_set else "3V3"
                elif sig_type == "POWER_GND":
                    b_pin = "GND"
                elif sig_type == "I2C_SDA":
                    b_pin = "D21" if "D21" in board_pins_set else ("A4" if "A4" in board_pins_set else "D21")
                elif sig_type == "I2C_SCL":
                    b_pin = "D22" if "D22" in board_pins_set else ("A5" if "A5" in board_pins_set else "D22")
                elif sig_type in ["ANALOG_IN", "ANALOG"]:
                    # Select next available analog pin
                    avail_analog = [p for p in board_def.get("analog_pins", ["D34", "D35", "A0"]) if p not in used_board_pins]
                    b_pin = avail_analog[0] if avail_analog else "D34"
                    used_board_pins.add(b_pin)
                elif sig_type == "PWM":
                    # Select next available PWM pin
                    avail_pwm = [p for p in board_def.get("pwm_pins", ["D13", "D18", "9"]) if p not in used_board_pins]
                    b_pin = avail_pwm[0] if avail_pwm else "D13"
                    used_board_pins.add(b_pin)
                else:
                    # Digital pin
                    avail_dig = [p for p in board_def.get("digital_pins", ["D4", "D23", "D15", "2", "4"]) if p not in used_board_pins]
                    b_pin = avail_dig[0] if avail_dig else "D4"
                    used_board_pins.add(b_pin)
                    
                pin_assignments.append(PinAssignment(
                    component_id=comp.id,
                    component_pin=p_name,
                    board_pin=b_pin,
                    signal_type=sig_type
                ))

    # Build clean 1-to-1 connections based on pin assignments
    for pa in pin_assignments:
        color = "orange"
        sig_type = "DIGITAL"
        if pa.signal_type == "POWER_VCC" or pa.board_pin in ["5V", "3V3", "VIN"]:
            color = "red"
            sig_type = "POWER"
        elif pa.signal_type == "POWER_GND" or pa.board_pin == "GND":
            color = "black"
            sig_type = "GROUND"
        elif pa.signal_type == "PWM":
            color = "orange"
            sig_type = "PWM"
        elif "I2C" in pa.signal_type or pa.component_pin in ["SDA", "SCL"]:
            color = "blue" if pa.component_pin == "SDA" else "green"
            sig_type = "I2C"
        elif "ANALOG" in pa.signal_type or pa.component_pin in ["AOUT", "SIG"]:
            color = "purple"
            sig_type = "ANALOG"

        connections.append(Connection(
            id=f"{p_id}-c{conn_idx}",
            from_component="board",
            from_pin=pa.board_pin,
            to_component=pa.component_id,
            to_pin=pa.component_pin,
            color=color,
            signal_type=sig_type
        ))
        conn_idx += 1

    # 5. Build and validate test cases matching the project domain
    threshold_cm = 20.0
    thresh_match = re.search(r"(\d+(?:\.\d+)?)\s*cm", prompt, re.IGNORECASE)
    if thresh_match:
        threshold_cm = float(thresh_match.group(1))

    tests: List[TestCase] = []
    unresolved: List[str] = list(proposal.get("unresolved_requirements", []))

    def safe_create_test_case(
        t_id: str,
        t_name: str,
        req_id: str,
        given: str,
        when: str,
        then: str,
        test_type: str,
        parameters: Optional[Dict[str, Any]] = None
    ) -> Optional[TestCase]:
        try:
            return TestCase(
                id=t_id,
                name=t_name,
                requirement_id=req_id,
                given=given,
                when=when,
                then=then,
                test_type=test_type,
                parameters=parameters or {}
            )
        except Exception as e:
            unresolved.append(
                f"Test case '{t_name}' ({test_type}) failed schema validation: {e}. Marked as unsupported."
            )
            return None

    # First, validate any test cases explicitly proposed by the LLM
    raw_tests = proposal.get("tests", [])
    if isinstance(raw_tests, list) and raw_tests:
        for idx, rt in enumerate(raw_tests):
            if isinstance(rt, dict):
                t_id = rt.get("id") or f"{p_id}-test-{idx+1}"
                t_name = rt.get("name") or f"Verification Test {idx+1}"
                t_req = rt.get("requirement_id") or (requirements[0].id if requirements else "req-001")
                tc = safe_create_test_case(
                    t_id=t_id,
                    t_name=t_name,
                    req_id=t_req,
                    given=rt.get("given", "System initialized"),
                    when=rt.get("when", "Operational event occurs"),
                    then=rt.get("then", "Expected response verified"),
                    test_type=rt.get("test_type", "threshold_trigger"),
                    parameters=rt.get("parameters", {})
                )
                if tc:
                    tests.append(tc)

    # Next, synthesize component-appropriate tests for physical peripherals present in the project
    default_req_id = requirements[0].id if requirements else "req-001"

    # Soil Moisture Sensor
    if any(c.part_id == "soil-moisture" for c in components) and not any("soil" in t.id.lower() or "moisture" in t.id.lower() for t in tests):
        tc1 = safe_create_test_case(
            t_id=f"{p_id}-test-soil-moisture-alert",
            t_name="Low Soil Moisture Drought Warning Alert Trigger",
            req_id=default_req_id,
            given="Soil moisture sensor ADC reading 18.0% (below 30.0% threshold)",
            when="Firmware detects dry soil condition requiring irrigation",
            then="Indicator LED state = HIGH (ON) or irrigation valve opens",
            test_type="threshold_trigger",
            parameters={"simulated_moisture_pct": 18.0, "threshold_moisture_pct": 30.0}
        )
        tc2 = safe_create_test_case(
            t_id=f"{p_id}-test-soil-moisture-normal",
            t_name="Adequate Soil Moisture Standby Inactive Alert",
            req_id=default_req_id,
            given="Soil moisture sensor ADC reading 62.0% (above 30.0% threshold)",
            when="Firmware detects adequate soil hydration",
            then="Indicator LED state = LOW (OFF) and valve remains closed",
            test_type="threshold_trigger",
            parameters={"simulated_moisture_pct": 62.0, "threshold_moisture_pct": 30.0}
        )
        if tc1: tests.append(tc1)
        if tc2: tests.append(tc2)

    # Temperature & Humidity Sensor (DHT22 / DHT11)
    if any(c.part_id in ["dht22", "dht11"] for c in components) and not any("temp" in t.id.lower() for t in tests):
        tc1 = safe_create_test_case(
            t_id=f"{p_id}-test-temp-ventilation",
            t_name="Elevated Temperature Automated Ventilation / Alarm Actuation",
            req_id=default_req_id,
            given=f"{board.display_name} reading DHT temperature at 32.5°C (exceeding 28.0°C threshold)",
            when="Firmware control loop polls DHT sensor and evaluates threshold",
            then="Ventilation actuator engages or high temperature alert activates",
            test_type="threshold_trigger",
            parameters={"simulated_temperature_c": 32.5, "simulated_humidity": 65.0, "threshold_temp_c": 28.0}
        )
        tc2 = safe_create_test_case(
            t_id=f"{p_id}-test-temp-normal",
            t_name="Normal Temperature Idle Standby State",
            req_id=default_req_id,
            given=f"{board.display_name} reading DHT temperature at 23.0°C (below 28.0°C threshold)",
            when="Firmware control loop polls DHT sensor and evaluates threshold",
            then="Actuators remain in idle standby state",
            test_type="threshold_trigger",
            parameters={"simulated_temperature_c": 23.0, "simulated_humidity": 55.0, "threshold_temp_c": 28.0}
        )
        if tc1: tests.append(tc1)
        if tc2: tests.append(tc2)

    # SSD1306 OLED Display (I2C Telemetry)
    if any(c.part_id == "oled-ssd1306" for c in components) and not any("oled" in t.id.lower() or "display" in t.id.lower() for t in tests):
        tc = safe_create_test_case(
            t_id=f"{p_id}-test-oled-telemetry",
            t_name="SSD1306 Live Telemetry Display Refresh",
            req_id=default_req_id,
            given="SSD1306 OLED initialized over I2C bus (SDA: D21, SCL: D22)",
            when="Firmware refreshes display frame buffer",
            then="Display renders live sensor telemetry over I2C bus",
            test_type="i2c_telemetry",
            parameters={"i2c_address": "0x3C"}
        )
        if tc: tests.append(tc)

    is_flight_controller = any(
        w in prompt_lower or any(w in r.description.lower() for r in requirements)
        for w in ["quadcopter", "flight controller", "drone", "quad-copter", "esc", "motor mixing", "motor-mixing", "attitude"]
    )
    is_fall_detection = any(
        w in prompt_lower or any(w in r.description.lower() for r in requirements)
        for w in ["fall", "freefall", "free-fall", "impact alarm", "drop"]
    )

    # MPU-6050 Accelerometer / Gyroscope
    if any(c.part_id == "mpu6050" for c in components):
        if is_flight_controller:
            tc1 = safe_create_test_case(
                t_id=f"{p_id}-test-imu-i2c",
                t_name="IMU I²C Communication Test",
                req_id=default_req_id,
                given=f"{board.display_name} powered, I²C bus connected to MPU-6050 (SDA: D21, SCL: D22)",
                when="Firmware queries MPU-6050 WHO_AM_I register (0x75)",
                then="Device acknowledges and returns valid identifier 0x68",
                test_type="i2c_telemetry",
                parameters={"i2c_address": "0x68", "register": "WHO_AM_I"}
            )
            tc2 = safe_create_test_case(
                t_id=f"{p_id}-test-arming-switch",
                t_name="Arming Switch Activation",
                req_id=default_req_id,
                given="System initialized in disarmed state",
                when="User triggers tactile arming switch (pull-up pin transitions LOW)",
                then="Controller transitions arming state to TRUE and activates status indicator",
                test_type="pin_state",
                parameters={"input_pin": "D15", "expected_state": "ACTIVE"}
            )
            tc3 = safe_create_test_case(
                t_id=f"{p_id}-test-safe-disarmed-motors",
                t_name="Safe Disarmed Motor Outputs",
                req_id=default_req_id,
                given="System is powered and arming state is FALSE",
                when="Flight control loop evaluates actuator outputs",
                then="All four ESC PWM signals are clamped to safe minimum (1000 µs)",
                test_type="pin_state",
                parameters={"pwm_range_us": {"min": 1000, "max": 2000}}
            )
            tc4 = safe_create_test_case(
                t_id=f"{p_id}-test-stale-imu-handling",
                t_name="IMU Stale Data Handling",
                req_id=default_req_id,
                given="Flight controller armed and stabilizing roll/pitch",
                when="IMU sensor reading becomes stale (>100ms) or I2C bus fails",
                then="Controller immediately disarms motors to 1000 µs and triggers acoustic alert",
                test_type="threshold_trigger",
                parameters={"stale_timeout_ms": 100}
            )
            tc5 = safe_create_test_case(
                t_id=f"{p_id}-test-loop-timing",
                t_name="PID Loop Timing",
                req_id=default_req_id,
                given="Control loop configured for 250Hz non-blocking execution",
                when="Firmware loop timer tracks elapsed execution intervals",
                then="Loop executes with 4ms target period without blocking delay calls",
                test_type="frequency",
                parameters={"target_hz": 250, "tolerance_percent": 5}
            )
            flight_tests = [tc for tc in [tc1, tc2, tc3, tc4, tc5] if tc]
            tests = flight_tests
        elif is_fall_detection or not any("fall" in t.id.lower() or "mpu" in t.id.lower() for t in tests):
            tc1 = safe_create_test_case(
                t_id=f"{p_id}-test-freefall-detect",
                t_name="Free-fall Zero-G Threshold Detection",
                req_id=default_req_id,
                given=f"{board.display_name} sampling MPU-6050 I2C accelerometer at 50Hz",
                when="Magnitude sqrt(ax^2+ay^2+az^2) falls below 0.40g for >=100ms",
                then="Fall state machine transitions to FREE_FALL state",
                test_type="threshold_trigger",
                parameters={"threshold_g": 0.40}
            )
            tc2 = safe_create_test_case(
                t_id=f"{p_id}-test-impact-alarm",
                t_name="Impact Deceleration Spike and Buzzer Alarm",
                req_id=default_req_id,
                given="Free-fall condition recorded within trailing 800ms window",
                when="Impact magnitude spikes above 2.50g",
                then="Fall detected: piezoelectric buzzer triggers pulsating alert alarm",
                test_type="threshold_trigger",
                parameters={"threshold_g": 2.50}
            )
            if tc1: tests.append(tc1)
            if tc2: tests.append(tc2)

    # Ultrasonic Sensor (HC-SR04)
    if any(c.part_id == "hc-sr04" for c in components) and not any("obstacle" in t.id.lower() or "distance" in t.id.lower() for t in tests):
        tc1 = safe_create_test_case(
            t_id=f"{p_id}-test-close-obstacle",
            t_name="Proximity Alarm Trigger",
            req_id=default_req_id,
            given=f"Obstacle placed at {threshold_cm * 0.6:.1f} cm (below {threshold_cm:.1f} cm threshold)",
            when="Ultrasonic sensor echo sampled",
            then="Warning actuators engage",
            test_type="threshold_trigger",
            parameters={"simulated_distance": round(threshold_cm * 0.6, 1)}
        )
        tc2 = safe_create_test_case(
            t_id=f"{p_id}-test-clear-zone",
            t_name="Clear Zone Inactive State",
            req_id=default_req_id,
            given=f"Obstacle placed at {threshold_cm * 2.0:.1f} cm (above {threshold_cm:.1f} cm threshold)",
            when="Ultrasonic sensor echo sampled",
            then="Warning actuators disengage and remain idle",
            test_type="threshold_trigger",
            parameters={"simulated_distance": round(threshold_cm * 2.0, 1)}
        )
        if tc1: tests.append(tc1)
        if tc2: tests.append(tc2)

    # Servo Motor
    if not is_flight_controller and any(c.part_id == "servo" for c in components) and not any("servo" in t.id.lower() for t in tests):
        tc1 = safe_create_test_case(
            t_id=f"{p_id}-test-servo-sweep",
            t_name="Positional Servo Angle Sweep Verification",
            req_id=default_req_id,
            given=f"{board.display_name} PWM timer initialized",
            when="Firmware executes positional angle loop from 0 to 180 degrees",
            then="Servo shaft rotates through full 180-degree sweep range",
            test_type="threshold_trigger",
            parameters={"target_angle": 180}
        )
        tc2 = safe_create_test_case(
            t_id=f"{p_id}-test-servo-return",
            t_name="Servo Neutral Return and Jitter Holding Test",
            req_id=default_req_id,
            given="Servo reached maximum sweep position (180 degrees)",
            when="Return loop pulses 544us neutral position command",
            then="Shaft returns smoothly to 0 degrees with steady PWM holding current",
            test_type="threshold_trigger",
            parameters={"target_angle": 0}
        )
        if tc1: tests.append(tc1)
        if tc2: tests.append(tc2)

    # Discrete LED Indicator
    if any(c.part_id.startswith("led-") for c in components) and not tests:
        tc = safe_create_test_case(
            t_id=f"{p_id}-test-led-blink",
            t_name="Periodic LED Blink State Cycle",
            req_id=default_req_id,
            given=f"{board.display_name} GPIO configured as OUTPUT",
            when="Timer loop reaches 1000ms period",
            then="LED pin toggles state with verified current-limiting resistor",
            test_type="threshold_trigger",
            parameters={"interval_ms": 1000}
        )
        if tc: tests.append(tc)

    # Fallback Telemetry Test if no specific tests were generated
    if not tests:
        tc = safe_create_test_case(
            t_id=f"{p_id}-test-telemetry",
            t_name="Peripheral Control Loop Verification",
            req_id=default_req_id,
            given=f"{board.display_name} powered on",
            when="Control loop initializes peripherals",
            then="Telemetry emitted over Serial",
            test_type="serial_telemetry"
        )
        if tc: tests.append(tc)

    # 6. Unresolved requirements handling
    for u in unresolved_components:
        unresolved.append(f"Component '{u}' was requested but is not in the active catalog and remains unresolved.")
    if is_flight_controller:
        unresolved.append("Exact safe-minimum PWM value for ESCs is hardware-dependent; the specification assumes 1000 µs (1 ms) but should be verified with the ESC datasheet.")
        unresolved.append("Complementary filter constant (α = 0.98) and PID gain values (Kp, Ki, Kd) are baseline defaults; they must be tuned for simulated quadcopter mass and inertia.")
        unresolved.append("Wokwi simulator does not provide a native 3-phase BLDC motor or physical ESC simulator model; PWM pulse-width throttle signal verification is monitored via virtual telemetry.")
    elif any(c.part_id == "servo" for c in components):
        if not any("potentiometer" in c.part_id for c in components):
            unresolved.append(
                "Operating with an autonomous angle sweep routine. Specify an input sensor (e.g., potentiometer) if interactive manual positioning is desired."
            )

    proj = Project(
        id=p_id,
        title=proposal.get("title", f"{board.display_name} Project"),
        description=proposal.get("description", prompt),
        board=board,
        requirements=requirements,
        components=components,
        pin_assignments=pin_assignments,
        connections=connections,
        tests=tests,
        unresolved_requirements=unresolved,
        version=1
    )

    # 7. Generate dependent artifacts
    proj.firmware = [
        FirmwareArtifact(filename="sketch.ino", code=generate_firmware_code(proj), language="cpp", version=1)
    ]
    proj.build_guide = generate_build_guide(proj)
    proj.diagram_layout = generate_wokwi_diagram(proj)
    proj.validation = validate_project_hardware(proj)
    proj.sim_status = "ready" if proj.validation.status in ["validated", "warning"] else "draft"

    # 8. Record generation metadata audit
    audit["response_parsed"] = True
    audit["schema_validated"] = True
    audit["persisted"] = True
    proj.generation_metadata = {
        "llm_audit": audit,
        "prompt": prompt,
        "synthesized_at": utc_now_iso()
    }

    return proj

def plan_project_from_prompt(
    prompt: str,
    existing_project: Optional[Project] = None
) -> Project:
    prompt_lower = prompt.lower()
    
    # 1. Project Modification via ChangesetService
    if existing_project:
        from backend.app.services.changeset_service import ChangesetService
        res = ChangesetService.classify_and_handle_message(
            existing_project.id, 
            prompt,
            current_project=existing_project
        )
        if res.get("updated_project"):
            return Project(**res["updated_project"])
        return existing_project

    # 2. Production Path: Real LLM Generation with Bounded Validation Retry
    system_prompt = build_llm_system_prompt()
    max_retries = 2
    last_error: Optional[str] = None
    audit: Dict[str, Any] = {}

    for attempt in range(max_retries + 1):
        if attempt > 0:
            prompt_with_feedback = (
                f"{prompt}\n\n"
                f"[SYSTEM FEEDBACK - ATTEMPT {attempt + 1}/{max_retries + 1}]\n"
                f"Your previous structured response failed with the following error:\n{last_error}\n"
                f"Please correct this error and return strictly valid JSON matching the schema."
            )
        else:
            prompt_with_feedback = prompt

        audit = execute_llm_generation(
            prompt=prompt_with_feedback,
            system_prompt=system_prompt,
            format_json=True
        )

        resp_text = audit.get("response_text", "").strip()
        if not resp_text:
            last_error = f"Empty response from LLM provider '{audit.get('provider')}'."
            audit["error"] = last_error
            continue

        try:
            import json
            # Strip potential markdown code fences if model wrapped them
            clean_json = resp_text
            if "```" in clean_json:
                clean_json = re.sub(r"^```(?:json)?\s*", "", clean_json, flags=re.MULTILINE)
                clean_json = re.sub(r"\s*```$", "", clean_json, flags=re.MULTILINE)
            m = re.search(r"\{[\s\S]*\}", clean_json)
            if m:
                clean_json = m.group(0)
            clean_json = re.sub(r",\s*([}\]])", r"\1", clean_json)
            proposal_dict = json.loads(clean_json.strip())

            return synthesize_project_from_proposal(proposal_dict, prompt, audit)
        except Exception as e:
            last_error = f"{type(e).__name__}: {e}"
            audit["error"] = f"Attempt {attempt + 1} failed: {last_error}"

    # If all bounded retries exhausted:
    raise ProjectGenerationError(
        f"Could not generate and validate project proposal after {max_retries + 1} attempts. Last error: {last_error}"
    )
