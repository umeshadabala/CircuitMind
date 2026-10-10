import json
from typing import Dict, Any, List
from backend.app.models.project import Project, BuildGuide, GuideStep, FirmwareArtifact
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.catalog.boards import BOARDS

def generate_wokwi_diagram(project: Project) -> Dict[str, Any]:
    board_type = project.board.type
    board_def = BOARDS.get(board_type, BOARDS["esp32-devkit-v1"])
    wokwi_board_part = board_def.get("wokwi_part", "wokwi-esp32-devkit-v1")
    
    parts = []
    # Add microcontroller board
    parts.append({
        "type": wokwi_board_part,
        "id": "board",
        "top": 100,
        "left": 100,
        "attrs": {}
    })
    
    # Position other components nicely
    x_offset = 350
    y_offset = 80
    
    for i, comp in enumerate(project.components):
        cat_item = COMPONENTS_CATALOG.get(comp.part_id, {})
        wokwi_type = cat_item.get("wokwi_type", f"wokwi-{comp.part_id}")
        attrs = dict(cat_item.get("default_attrs", {}))
        attrs.update(comp.attributes)
        
        parts.append({
            "type": wokwi_type,
            "id": comp.id,
            "top": y_offset + (i * 120),
            "left": x_offset,
            "attrs": attrs
        })
        
    # Build connections list in Wokwi format: [ [from_endpoint, to_endpoint, color, [route]] ]
    wokwi_connections = []
    
    for conn in project.connections:
        from_ep = f"{conn.from_component}:{conn.from_pin}"
        to_ep = f"{conn.to_component}:{conn.to_pin}"
        color = conn.color or "orange"
        wokwi_connections.append([from_ep, to_ep, color, ["v0"]])
        
    return {
        "version": 1,
        "author": "CircuitMind AI Engineering IDE",
        "editor": "wokwi",
        "parts": parts,
        "connections": wokwi_connections
    }

def generate_firmware_code(project: Project) -> str:
    # Build pin mapping dictionary
    pin_defs = {}
    for pa in project.pin_assignments:
        pin_defs[f"{pa.component_id}_{pa.component_pin}"] = pa.board_pin
        
    # Analyze components to generate suitable sketch
    comp_types = [c.part_id for c in project.components]
    
    # Special check for Smart Parking Sensor (HC-SR04 + LED + Buzzer)
    if "hc-sr04" in comp_types:
        trig_pin = pin_defs.get("ultrasonic_TRIG", pin_defs.get("sensor_TRIG", "D5")).replace("D", "")
        echo_pin = pin_defs.get("ultrasonic_ECHO", pin_defs.get("sensor_ECHO", "D18")).replace("D", "")
        led_pin = pin_defs.get("warning_led_A", pin_defs.get("led_A", "D23")).replace("D", "")
        buzzer_pin = pin_defs.get("buzzer_2", pin_defs.get("buzzer_SIG", "D19")).replace("D", "")
        
        # Check requirement threshold (prioritize explicit target_value)
        threshold = 20.0
        for req in project.requirements:
            if req.target_value:
                try:
                    threshold = float(req.target_value)
                    break
                except ValueError:
                    pass
            elif "50" in req.description:
                threshold = 50.0
                break
            elif "20" in req.description:
                threshold = 20.0

        return f"""/*
 * ========================================================
 * CircuitMind Generated Firmware
 * Project: {project.title}
 * Board: {project.board.display_name}
 * Version: {project.version}
 * Architecture: Think it. Build it. Prove it.
 * ========================================================
 */

#include <Arduino.h>

// Pin Definitions
#define TRIG_PIN {trig_pin}
#define ECHO_PIN {echo_pin}
#define LED_PIN {led_pin}
#define BUZZER_PIN {buzzer_pin}

// Engineering Parameters
const float DISTANCE_THRESHOLD_CM = {threshold:.1f};
const unsigned long MEASUREMENT_INTERVAL_MS = 200;

unsigned long lastMeasurementTime = 0;

float measureDistanceCm() {{
  // Clear trigger pin
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  
  // Send 10us trigger pulse
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);
  
  // Read echo travel duration in microseconds (timeout at 30ms ~500cm)
  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  
  if (duration <= 0) {{
    return -1.0; // Out of range or timeout
  }}
  
  // Speed of sound: 343 m/s = 0.0343 cm/us
  // Distance = (duration * 0.0343) / 2
  float distance = (duration * 0.0343) / 2.0;
  return distance;
}}

void setup() {{
  Serial.begin(115200);
  delay(500);
  Serial.println();
  Serial.println("[CIRCUITMIND] System Initializing...");
  Serial.printf("[CIRCUITMIND] Project: %s (v%d)\\n", "{project.title}", {project.version});
  Serial.printf("[CIRCUITMIND] Warning Threshold: %.1f cm\\n", DISTANCE_THRESHOLD_CM);
  
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(LED_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  digitalWrite(LED_PIN, LOW);
  digitalWrite(BUZZER_PIN, LOW);
  
  Serial.println("[CIRCUITMIND] Hardware pins initialized. Entering control loop.");
}}

void loop() {{
  unsigned long now = millis();
  if (now - lastMeasurementTime >= MEASUREMENT_INTERVAL_MS) {{
    lastMeasurementTime = now;
    
    float distance = measureDistanceCm();
    
    if (distance > 0) {{
      Serial.printf("[TELEMETRY] Distance: %.1f cm | Threshold: %.1f cm | ", distance, DISTANCE_THRESHOLD_CM);
      
      if (distance < DISTANCE_THRESHOLD_CM) {{
        // Close obstacle detected: Engage alarm actuators
        digitalWrite(LED_PIN, HIGH);
        digitalWrite(BUZZER_PIN, HIGH);
        Serial.println("STATUS: WARNING! Obstacle in proximity [LED: HIGH, BUZZER: HIGH]");
      }} else {{
        // Safe distance
        digitalWrite(LED_PIN, LOW);
        digitalWrite(BUZZER_PIN, LOW);
        Serial.println("STATUS: CLEAR [LED: LOW, BUZZER: LOW]");
      }}
    }} else {{
      Serial.println("[TELEMETRY] Sensor reading out of bounds / no echo.");
    }}
  }}
}}
"""

    # Generic modular template for other circuits
    code = f"""/*
 * ========================================================
 * CircuitMind Generated Firmware
 * Project: {project.title}
 * Board: {project.board.display_name}
 * ========================================================
 */

#include <Arduino.h>

"""
    for pa in project.pin_assignments:
        pin_num = pa.board_pin.replace("D", "")
        code += f"#define PIN_{pa.component_id.upper()}_{pa.component_pin.upper()} {pin_num}\n"
        
    code += """
void setup() {
  Serial.begin(115200);
  Serial.println("[CIRCUITMIND] Firmware started.");
"""
    for pa in project.pin_assignments:
        mode = "OUTPUT" if pa.signal_type in ["DIGITAL_OUT", "PWM"] else "INPUT"
        code += f"  pinMode(PIN_{pa.component_id.upper()}_{pa.component_pin.upper()}, {mode});\n"
        
    code += """}

void loop() {
  // Main control loop
  delay(100);
}
"""
    return code

def generate_build_guide(project: Project) -> BuildGuide:
    steps: List[GuideStep] = [
        GuideStep(
            step_number=1,
            title="Prepare the Development Board",
            component_references=["board"],
            instructions=f"Seat the {project.board.display_name} securely onto a breadboard with pins straddling the center divider.",
            expected_result="Board is firmly seated and pin labels are clearly visible."
        ),
        GuideStep(
            step_number=2,
            title="Establish Power & Ground Rails",
            component_references=["board"],
            instructions="Connect a red jumper wire from the board 5V / VIN pin to the breadboard positive (+) rail. Connect a black jumper wire from GND to the negative (-) rail.",
            expected_result="Common power and ground rails are active.",
            safety_caution="Verify ground polarity before powering on to prevent reverse voltage damage."
        )
    ]
    
    step_num = 3
    for comp in project.components:
        comp_conns = [c for c in project.connections if c.to_component == comp.id or c.from_component == comp.id]
        wires = ", ".join([f"{c.from_component}:{c.from_pin} -> {c.to_component}:{c.to_pin}" for c in comp_conns])
        steps.append(GuideStep(
            step_number=step_num,
            title=f"Mount and Wire {comp.name}",
            component_references=[comp.id],
            instructions=f"Place the {comp.name} on the breadboard. Connect wires: {wires}.",
            expected_result=f"{comp.name} terminals are securely connected to the designated GPIO pins."
        ))
        step_num += 1
        
    steps.append(GuideStep(
        step_number=step_num,
        title="Upload Firmware and Verify via Serial Monitor",
        component_references=["board", "firmware"],
        instructions="Connect the board to your computer via USB. Select the matching board and port in Arduino IDE or load into Wokwi Simulator. Open the Serial Monitor at 115200 baud.",
        expected_result="Serial console outputs initialization telemetry and periodic sensor readings."
    ))

    troubleshooting = [
        {"issue": "No serial output received", "fix": "Ensure baud rate in Serial Monitor is set to 115200 baud."},
        {"issue": "Distance reads -1.0 or 0 cm", "fix": "Check TRIG and ECHO connections. Verify VCC receives 5V."},
        {"issue": "LED stays dark during warning", "fix": "Check LED polarity: long lead (Anode) must connect to GPIO pin, short lead (Cathode) to GND."}
    ]

    cautions = [
        "Never short 5V/VIN directly to GND.",
        "Ensure all GPIO outputs do not exceed rated current limits (12mA on ESP32).",
        "Double-check electrolytic capacitor and diode/LED polarity before applying power."
    ]

    rationale = {
        "board": f"Selected {project.board.display_name} for high processing speed, ample GPIO pins, and reliable simulation support.",
        "hc-sr04": "Standard ultrasonic sensor offering millimeter-level distance measurement with robust reflection.",
        "led-red": "High-visibility optical alarm providing immediate visual feedback for warning states.",
        "buzzer-piezo": "Acoustic transducer delivering clear audible warning tones without requiring external amplifiers."
    }

    return BuildGuide(
        title=f"Assembly & Engineering Guide: {project.title}",
        summary=f"Complete step-by-step assembly, wiring, and testing instructions for {project.title}.",
        component_rationale=rationale,
        steps=steps,
        testing_instructions="Simulate or physically place an obstacle within range. Observe LED lighting and buzzer sounding when distance drops below threshold.",
        troubleshooting=troubleshooting,
        electrical_cautions=cautions
    )
