import uuid
import re
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.models.project import (
    Project, BoardConfig, Requirement, ComponentInstance, 
    Connection, PinAssignment, FirmwareArtifact, TestCase
)
from backend.app.catalog.boards import BOARDS
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.engine.generator import generate_firmware_code, generate_build_guide
from backend.app.engine.validator import validate_project_hardware

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
            description="Optical warning indicator."
        ),
        ComponentInstance(
            id="buzzer",
            part_id="buzzer-piezo",
            name="Piezo Buzzer",
            category="actuator",
            pins=["1", "2"],
            description="Acoustic proximity alarm."
        ),
        ComponentInstance(
            id="r_led",
            part_id="resistor-220",
            name="220Ω Resistor (LED Current Limiter)",
            category="passive",
            pins=["1", "2"],
            attributes={"value": "220"},
            description="Limits LED forward current to protect GPIO23."
        )
    ]
    
    pin_assignments = [
        PinAssignment(component_id="ultrasonic", component_pin="VCC", board_pin="5V", signal_type="POWER_VCC"),
        PinAssignment(component_id="ultrasonic", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id="ultrasonic", component_pin="TRIG", board_pin="D5", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id="ultrasonic", component_pin="ECHO", board_pin="D18", signal_type="DIGITAL_IN"),
        
        PinAssignment(component_id="warning_led", component_pin="A", board_pin="D23", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id="warning_led", component_pin="C", board_pin="GND", signal_type="POWER_GND"),
        
        PinAssignment(component_id="buzzer", component_pin="1", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id="buzzer", component_pin="2", board_pin="D19", signal_type="PWM")
    ]
    
    connections = [
        Connection(id="conn-1", from_component="board", from_pin="5V", to_component="ultrasonic", to_pin="VCC", color="red", signal_type="POWER_VCC"),
        Connection(id="conn-2", from_component="board", from_pin="GND", to_component="ultrasonic", to_pin="GND", color="black", signal_type="POWER_GND"),
        Connection(id="conn-3", from_component="board", from_pin="D5", to_component="ultrasonic", to_pin="TRIG", color="blue", signal_type="DIGITAL"),
        Connection(id="conn-4", from_component="board", from_pin="D18", to_component="ultrasonic", to_pin="ECHO", color="cyan", signal_type="DIGITAL"),
        
        Connection(id="conn-5", from_component="board", from_pin="D23", to_component="r_led", to_pin="1", color="orange", signal_type="DIGITAL"),
        Connection(id="conn-6", from_component="r_led", from_pin="2", to_component="warning_led", to_pin="A", color="orange", signal_type="DIGITAL"),
        Connection(id="conn-7", from_component="board", from_pin="GND", to_component="warning_led", to_pin="C", color="black", signal_type="POWER_GND"),
        
        Connection(id="conn-8", from_component="board", from_pin="D19", to_component="buzzer", to_pin="2", color="yellow", signal_type="PWM"),
        Connection(id="conn-9", from_component="board", from_pin="GND", to_component="buzzer", to_pin="1", color="black", signal_type="POWER_GND")
    ]
    
    tests = [
        TestCase(
            id="test-close-obstacle",
            name="Close Obstacle Warning Trigger",
            requirement_id="req-002",
            given="The simulated obstacle is closer than the warning threshold (e.g., 12.0 cm)",
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

def plan_project_from_prompt(prompt: str, existing_project: Optional[Project] = None) -> Project:
    prompt_lower = prompt.lower()
    
    # Check if this is a modification of existing project
    if existing_project and any(w in prompt_lower for w in ["change", "update", "modify", "threshold", "cm", "set"]):
        # Extract new threshold number
        match = re.search(r'(\d+)\s*cm', prompt_lower)
        if match:
            new_threshold = float(match.group(1))
            updated = existing_project.model_copy(deep=True)
            updated.version += 1
            updated.title = existing_project.title
            updated.description = f"ESP32 ultrasonic distance parking assistant triggering red LED and buzzer when obstacles are closer than {new_threshold:.0f} cm."
            
            # Update requirements
            for req in updated.requirements:
                if "req-002" in req.id or "closer" in req.description:
                    req.description = f"When an object is closer than {new_threshold:.0f} cm, activate warning optical LED and acoustic buzzer."
                    req.target_value = str(new_threshold)
                elif "req-003" in req.id or "farther" in req.description:
                    req.description = f"When an object is farther than {new_threshold:.0f} cm, deactivate warning actuators."
                    req.target_value = str(new_threshold)
                    
            # Re-generate firmware
            code = generate_firmware_code(updated)
            updated.firmware = [FirmwareArtifact(filename="sketch.ino", code=code, language="cpp", version=updated.version)]
            updated.build_guide = generate_build_guide(updated)
            updated.validation = validate_project_hardware(updated)
            return updated
            
    # Default to Smart Parking Sensor for the primary brief demo or ultrasonic queries
    if any(k in prompt_lower for k in ["parking", "ultrasonic", "distance", "hc-sr04", "obstacle", "sensor"]):
        threshold = 20.0
        match = re.search(r'(\d+)\s*cm', prompt_lower)
        if match:
            threshold = float(match.group(1))
        return create_smart_parking_sensor_project(threshold_cm=threshold)
        
    # If other projects requested, create sensible custom project
    p_id = f"proj-{uuid.uuid4().hex[:8]}"
    board = BoardConfig(
        type="esp32-devkit-v1",
        display_name="ESP32 DevKit V1",
        architecture="Xtensa dual-core 32-bit LX6 @ 240MHz",
        voltage_logic=3.3,
        voltage_supply=5.0,
        pins_available=BOARDS["esp32-devkit-v1"]["pins"],
        reserved_pins=BOARDS["esp32-devkit-v1"]["reserved_pins"]
    )
    
    # Generic project creation
    proj = Project(
        id=p_id,
        title="Custom Physical System",
        description=prompt,
        board=board,
        requirements=[
            Requirement(id="req-001", description=prompt, priority="required", category="sensing")
        ],
        components=[
            ComponentInstance(id="sensor", part_id="hc-sr04", name="HC-SR04 Sensor", category="sensor", pins=["VCC", "TRIG", "ECHO", "GND"]),
            ComponentInstance(id="led", part_id="led-green", name="Status LED (Green)", category="actuator", pins=["A", "C"], attributes={"color": "green"})
        ],
        pin_assignments=[
            PinAssignment(component_id="sensor", component_pin="VCC", board_pin="5V", signal_type="POWER_VCC"),
            PinAssignment(component_id="sensor", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
            PinAssignment(component_id="sensor", component_pin="TRIG", board_pin="D5", signal_type="DIGITAL_OUT"),
            PinAssignment(component_id="sensor", component_pin="ECHO", board_pin="D18", signal_type="DIGITAL_IN"),
            PinAssignment(component_id="led", component_pin="A", board_pin="D23", signal_type="DIGITAL_OUT"),
            PinAssignment(component_id="led", component_pin="C", board_pin="GND", signal_type="POWER_GND")
        ],
        connections=[
            Connection(id="c1", from_component="board", from_pin="5V", to_component="sensor", to_pin="VCC", color="red"),
            Connection(id="c2", from_component="board", from_pin="GND", to_component="sensor", to_pin="GND", color="black"),
            Connection(id="c3", from_component="board", from_pin="D5", to_component="sensor", to_pin="TRIG", color="blue"),
            Connection(id="c4", from_component="board", from_pin="D18", to_component="sensor", to_pin="ECHO", color="cyan"),
            Connection(id="c5", from_component="board", from_pin="D23", to_component="led", to_pin="A", color="green"),
            Connection(id="c6", from_component="board", from_pin="GND", to_component="led", to_pin="C", color="black")
        ],
        tests=[
            TestCase(id="test-1", name="Basic Operational Check", given="Power applied", when="Firmware runs", then="Serial output emitted", test_type="serial_telemetry")
        ],
        version=1
    )
    proj.firmware = [FirmwareArtifact(filename="sketch.ino", code=generate_firmware_code(proj), language="cpp")]
    proj.build_guide = generate_build_guide(proj)
    proj.validation = validate_project_hardware(proj)
    return proj
