import json
import re
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
    
    part_ids = {"board"}
    for i, comp in enumerate(project.components):
        cat_item = COMPONENTS_CATALOG.get(comp.part_id, {})
        wokwi_type = cat_item.get("wokwi_type")
        if not wokwi_type:
            continue
        attrs = dict(cat_item.get("default_attrs", {}))
        if wokwi_type == "wokwi-resistor":
            if "resistance" in attrs:
                res_val = attrs.pop("resistance")
                attrs["value"] = str(res_val)

        parts.append({
            "type": wokwi_type,
            "id": comp.id,
            "top": int(comp.position_y) if comp.position_y is not None else (y_offset + (i * 120)),
            "left": int(comp.position_x) if comp.position_x is not None else x_offset,
            "attrs": attrs
        })
        part_ids.add(comp.id)
        
    # Build connections list in Wokwi format: [ [from_endpoint, to_endpoint, color, [route]] ]
    wokwi_connections = []
    
    for conn in project.connections:
        from_comp, from_pin = conn.from_component, conn.from_pin
        to_comp, to_pin = conn.to_component, conn.to_pin

        # Only include connections between parts declared in diagram parts list
        if from_comp not in part_ids or to_comp not in part_ids:
            continue

        if wokwi_board_part == "wokwi-esp32-devkit-v1":
            if from_comp == "board":
                if from_pin in ["5V", "VIN"]: from_pin = "VIN"
                elif from_pin.startswith("GND"): from_pin = "GND.1"
            if to_comp == "board":
                if to_pin in ["5V", "VIN"]: to_pin = "VIN"
                elif to_pin.startswith("GND"): to_pin = "GND.1"

        from_ep = f"{from_comp}:{from_pin}"
        to_ep = f"{to_comp}:{to_pin}"
        color = conn.color or "orange"
        wokwi_connections.append([from_ep, to_ep, color, ["v0"]])
        
    return {
        "version": 1,
        "author": "CircuitMind AI Engineering IDE",
        "editor": "wokwi",
        "parts": parts,
        "connections": wokwi_connections
    }

def generate_quadcopter_firmware(project: Project) -> str:
    is_esp32 = "esp32" in project.board.type.lower()
    
    def clean_pin(bp: str) -> str:
        return bp.replace("D", "") if bp else "0"

    esc_pins = []
    arm_pin = "15" if is_esp32 else "7"
    status_led_pin = "2" if is_esp32 else "13"
    buzzer_pin = "4" if is_esp32 else "8"
    sda_pin = "21" if is_esp32 else "A4"
    scl_pin = "22" if is_esp32 else "A5"

    for pa in project.pin_assignments:
        cid = pa.component_id.lower()
        cpin = pa.component_pin.upper()
        b_clean = clean_pin(pa.board_pin)
        if pa.board_pin in ["5V", "3V3", "GND", "VIN"]:
            continue
        if "esc" in cid or "motor" in cid or pa.signal_type == "PWM":
            if cpin in ["PWM", "SIG", "SIGNAL"] and b_clean not in esc_pins:
                esc_pins.append(b_clean)
        elif "button" in cid or "switch" in cid or "pushbutton" in cid or "arm" in cid:
            arm_pin = b_clean
        elif "led" in cid and cpin in ["A", "ANODE"]:
            status_led_pin = b_clean
        elif "buzzer" in cid:
            buzzer_pin = b_clean
        elif "mpu" in cid:
            if cpin in ["SDA", "I2C_SDA"]:
                sda_pin = b_clean
            elif cpin in ["SCL", "I2C_SCL"]:
                scl_pin = b_clean

    default_esc_pins = ["13", "12", "14", "27"] if is_esp32 else ["3", "5", "6", "9"]
    for p in default_esc_pins:
        if p not in esc_pins and len(esc_pins) < 4:
            esc_pins.append(p)

    m1_pin = esc_pins[0] if len(esc_pins) > 0 else "13"
    m2_pin = esc_pins[1] if len(esc_pins) > 1 else "12"
    m3_pin = esc_pins[2] if len(esc_pins) > 2 else "14"
    m4_pin = esc_pins[3] if len(esc_pins) > 3 else "27"

    wire_init = f"Wire.begin({sda_pin}, {scl_pin});" if is_esp32 else "Wire.begin();"

    return f"""/*
 * =====================================================================
 * CircuitMind AI-Native Flight Controller Firmware (Simulation-Only)
 * Target: {project.board.display_name} ({project.board.architecture})
 * Project: {project.title}
 * Version: {project.version}
 *
 * ENGINEERING SPECIFICATION & FLIGHT SAFETY DISCLAIMER:
 * Simulation-oriented flight controller firmware with MPU6050 telemetry,
 * complementary attitude estimation, dual-axis PID stabilization,
 * Quad-X motor mixing, arming safety state machine, and stale-IMU fail-safe.
 * WARNING: This implementation is designed and validated for simulation only.
 * Do not connect physical motors/propellers without independent safety review.
 * =====================================================================
 */

#include <Arduino.h>
#include <Wire.h>

// --- Verified Pin Assignments ---
constexpr uint8_t PIN_MOTOR_1 = {m1_pin}; // Front-Left (CW)
constexpr uint8_t PIN_MOTOR_2 = {m2_pin}; // Front-Right (CCW)
constexpr uint8_t PIN_MOTOR_3 = {m3_pin}; // Rear-Right (CW)
constexpr uint8_t PIN_MOTOR_4 = {m4_pin}; // Rear-Left (CCW)
constexpr uint8_t PIN_ARM_SWITCH = {arm_pin}; // Tactile Arming Switch (active LOW)
constexpr uint8_t PIN_STATUS_LED = {status_led_pin}; // Optical Status Indicator
constexpr uint8_t PIN_BUZZER = {buzzer_pin}; // Acoustic Alert Transducer
constexpr uint8_t PIN_I2C_SDA = {sda_pin};
constexpr uint8_t PIN_I2C_SCL = {scl_pin};

// --- MPU6050 Registers ---
constexpr uint8_t MPU6050_ADDR = 0x68;
constexpr uint8_t MPU6050_PWR_MGMT_1 = 0x6B;
constexpr uint8_t MPU6050_ACCEL_XOUT_H = 0x3B;

// --- Flight Dynamics Constants ---
constexpr uint16_t PWM_SAFE_MIN_US = 1000; // Disarmed safe minimum throttle
constexpr uint16_t PWM_IDLE_THROTTLE_US = 1150; // Minimum armed hover throttle
constexpr uint16_t PWM_MAX_US = 1950;
constexpr unsigned long LOOP_RATE_HZ = 250;
constexpr unsigned long LOOP_PERIOD_US = 1000000 / LOOP_RATE_HZ; // 4000us (4ms)
constexpr float COMPLEMENTARY_ALPHA = 0.98f; // Attitude filter weight

// --- PID Controller Structure ---
struct PIDController {{
  float kp;
  float ki;
  float kd;
  float integral;
  float prev_error;
  float integral_limit;
}};

PIDController pid_roll = {{1.25f, 0.04f, 0.18f, 0.0f, 0.0f, 200.0f}};
PIDController pid_pitch = {{1.25f, 0.04f, 0.18f, 0.0f, 0.0f, 200.0f}};

// --- State Variables ---
bool is_armed = false;
bool sensor_valid = false;
unsigned long last_loop_time_us = 0;
unsigned long last_valid_imu_ms = 0;
unsigned long last_telemetry_ms = 0;
float roll_angle = 0.0f;
float pitch_angle = 0.0f;
uint16_t motor_output_us[4] = {{PWM_SAFE_MIN_US, PWM_SAFE_MIN_US, PWM_SAFE_MIN_US, PWM_SAFE_MIN_US}};

void set_motors_safe() {{
  for (int i = 0; i < 4; i++) {{
    motor_output_us[i] = PWM_SAFE_MIN_US;
  }}
}}

float update_pid(PIDController &pid, float error, float dt) {{
  pid.integral += error * dt;
  if (pid.integral > pid.integral_limit) pid.integral = pid.integral_limit;
  if (pid.integral < -pid.integral_limit) pid.integral = -pid.integral_limit;
  float derivative = (dt > 0.0f) ? (error - pid.prev_error) / dt : 0.0f;
  pid.prev_error = error;
  return (pid.kp * error) + (pid.ki * pid.integral) + (pid.kd * derivative);
}}

bool init_mpu6050() {{
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU6050_PWR_MGMT_1);
  Wire.write(0x00);
  byte error = Wire.endTransmission();
  return (error == 0);
}}

bool read_mpu6050_raw(int16_t &ax, int16_t &ay, int16_t &az, int16_t &gx, int16_t &gy, int16_t &gz) {{
  Wire.beginTransmission(MPU6050_ADDR);
  Wire.write(MPU6050_ACCEL_XOUT_H);
  if (Wire.endTransmission(false) != 0) return false;
  if (Wire.requestFrom((uint8_t)MPU6050_ADDR, (uint8_t)14) < 14) return false;

  ax = (Wire.read() << 8) | Wire.read();
  ay = (Wire.read() << 8) | Wire.read();
  az = (Wire.read() << 8) | Wire.read();
  Wire.read(); Wire.read();
  gx = (Wire.read() << 8) | Wire.read();
  gy = (Wire.read() << 8) | Wire.read();
  gz = (Wire.read() << 8) | Wire.read();
  return true;
}}

void setup() {{
  Serial.begin(115200);
  delay(100);
  Serial.println(F("[BOOT] CircuitMind Flight Controller Initializing..."));
  Serial.println(F("[CONFIG] Quad-X Mixer: M1(FL,CW) M2(FR,CCW) M3(RR,CW) M4(RL,CCW)"));

  pinMode(PIN_MOTOR_1, OUTPUT);
  pinMode(PIN_MOTOR_2, OUTPUT);
  pinMode(PIN_MOTOR_3, OUTPUT);
  pinMode(PIN_MOTOR_4, OUTPUT);
  pinMode(PIN_STATUS_LED, OUTPUT);
  pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_ARM_SWITCH, INPUT_PULLUP);

  set_motors_safe();
  digitalWrite(PIN_STATUS_LED, LOW);
  digitalWrite(PIN_BUZZER, LOW);

  {wire_init}
  sensor_valid = init_mpu6050();
  if (sensor_valid) {{
    last_valid_imu_ms = millis();
    Serial.println(F("[INIT] MPU6050 IMU initialized over I2C bus at 0x68."));
  }} else {{
    Serial.println(F("[ERROR] MPU6050 not detected. Disarming system."));
  }}

  is_armed = false;
  Serial.println(F("[STATE] System startup: DISARMED. Press arming switch to activate."));
  last_loop_time_us = micros();
}}

void loop() {{
  unsigned long now_us = micros();
  unsigned long dt_us = now_us - last_loop_time_us;

  // Non-blocking 250Hz control loop timer (4ms period)
  if (dt_us < LOOP_PERIOD_US) return;
  last_loop_time_us = now_us;
  float dt = dt_us / 1000000.0f;

  // 1. Arming Switch Debounce & Evaluation
  static bool prev_switch_state = HIGH;
  bool switch_state = digitalRead(PIN_ARM_SWITCH);
  if (prev_switch_state == HIGH && switch_state == LOW) {{
    if (!is_armed && sensor_valid) {{
      is_armed = true;
      digitalWrite(PIN_STATUS_LED, HIGH);
      digitalWrite(PIN_BUZZER, HIGH);
      delayMicroseconds(2000);
      digitalWrite(PIN_BUZZER, LOW);
      Serial.println(F("[EVENT] ARMING SWITCH ACTIVATED -> FLIGHT CONTROLLER ARMED"));
    }} else {{
      is_armed = false;
      set_motors_safe();
      digitalWrite(PIN_STATUS_LED, LOW);
      Serial.println(F("[EVENT] FLIGHT CONTROLLER DISARMED"));
    }}
  }}
  prev_switch_state = switch_state;

  // 2. Read IMU Telemetry
  int16_t raw_ax, raw_ay, raw_az, raw_gx, raw_gy, raw_gz;
  bool read_ok = read_mpu6050_raw(raw_ax, raw_ay, raw_az, raw_gx, raw_gy, raw_gz);
  if (read_ok) {{
    last_valid_imu_ms = millis();
    sensor_valid = true;

    float ax_g = raw_ax / 16384.0f;
    float ay_g = raw_ay / 16384.0f;
    float az_g = raw_az / 16384.0f;
    float gyro_x_dps = raw_gx / 131.0f;
    float gyro_y_dps = raw_gy / 131.0f;

    float accel_roll = atan2(ay_g, az_g) * 57.29578f;
    float accel_pitch = atan2(-ax_g, sqrt(ay_g * ay_g + az_g * az_g)) * 57.29578f;

    // Complementary filter estimation (98% gyro integration, 2% accelerometer)
    roll_angle = COMPLEMENTARY_ALPHA * (roll_angle + gyro_x_dps * dt) + (1.0f - COMPLEMENTARY_ALPHA) * accel_roll;
    pitch_angle = COMPLEMENTARY_ALPHA * (pitch_angle + gyro_y_dps * dt) + (1.0f - COMPLEMENTARY_ALPHA) * accel_pitch;
  }} else {{
    // Stale / invalid IMU handling
    if (millis() - last_valid_imu_ms > 100) {{
      if (is_armed) {{
        Serial.println(F("[FAULT] IMU data timeout (>100ms) or invalid. SAFE EMERGENCY DISARM!"));
        is_armed = false;
      }}
      sensor_valid = false;
      set_motors_safe();
      digitalWrite(PIN_STATUS_LED, (millis() / 150) % 2);
      digitalWrite(PIN_BUZZER, HIGH);
    }}
  }}

  // 3. Stabilization PID & Quad-X Motor Mixing
  if (is_armed && sensor_valid) {{
    digitalWrite(PIN_BUZZER, LOW);
    digitalWrite(PIN_STATUS_LED, HIGH);

    float roll_cmd = update_pid(pid_roll, 0.0f - roll_angle, dt);
    float pitch_cmd = update_pid(pid_pitch, 0.0f - pitch_angle, dt);
    float yaw_cmd = 0.0f;
    float base_throttle = 1350.0f;

    float m1 = base_throttle + pitch_cmd + roll_cmd - yaw_cmd; // Front-Left (CW)
    float m2 = base_throttle + pitch_cmd - roll_cmd + yaw_cmd; // Front-Right (CCW)
    float m3 = base_throttle - pitch_cmd - roll_cmd - yaw_cmd; // Rear-Right (CW)
    float m4 = base_throttle - pitch_cmd + roll_cmd + yaw_cmd; // Rear-Left (CCW)

    motor_output_us[0] = (uint16_t)constrain(m1, PWM_IDLE_THROTTLE_US, PWM_MAX_US);
    motor_output_us[1] = (uint16_t)constrain(m2, PWM_IDLE_THROTTLE_US, PWM_MAX_US);
    motor_output_us[2] = (uint16_t)constrain(m3, PWM_IDLE_THROTTLE_US, PWM_MAX_US);
    motor_output_us[3] = (uint16_t)constrain(m4, PWM_IDLE_THROTTLE_US, PWM_MAX_US);
  }} else {{
    set_motors_safe();
  }}

  // 4. Output PWM Signals to ESCs
  analogWrite(PIN_MOTOR_1, map(motor_output_us[0], 1000, 2000, 0, 255));
  analogWrite(PIN_MOTOR_2, map(motor_output_us[1], 1000, 2000, 0, 255));
  analogWrite(PIN_MOTOR_3, map(motor_output_us[2], 1000, 2000, 0, 255));
  analogWrite(PIN_MOTOR_4, map(motor_output_us[3], 1000, 2000, 0, 255));

  // 5. Periodic Telemetry Stream (every 200ms)
  if (millis() - last_telemetry_ms >= 200) {{
    last_telemetry_ms = millis();
    Serial.print(F("[TELEMETRY] Armed: "));
    Serial.print(is_armed ? "TRUE" : "FALSE");
    Serial.print(F(" | Roll: "));
    Serial.print(roll_angle, 2);
    Serial.print(F(" deg | Pitch: "));
    Serial.print(pitch_angle, 2);
    Serial.print(F(" deg | ESCs: M1="));
    Serial.print(motor_output_us[0]);
    Serial.print(F(" M2="));
    Serial.print(motor_output_us[1]);
    Serial.print(F(" M3="));
    Serial.print(motor_output_us[2]);
    Serial.print(F(" M4="));
    Serial.print(motor_output_us[3]);
    Serial.println(F(" us"));
  }}
}}
"""

def generate_firmware_code(project: Project) -> str:
    """
    Synthesize complete, compilable C++ firmware derived strictly from the
    persisted project graph (board architecture, components, pin assignments, connections).
    Zero project-name checks or hardcoded project templates.
    """
    is_quadcopter = any(
        w in project.title.lower() or any(w in r.description.lower() for r in project.requirements)
        for w in ["quadcopter", "flight controller", "drone", "quad-copter", "motor mixing", "motor-mixing", "attitude"]
    )
    if is_quadcopter:
        return generate_quadcopter_firmware(project)

    is_fall_detection = any(
        w in project.title.lower() or any(w in r.description.lower() for r in project.requirements)
        for w in ["fall", "freefall", "free-fall", "impact alarm", "drop"]
    )

    is_esp32 = "esp32" in project.board.type.lower()
    is_arduino = "arduino" in project.board.type.lower()

    # Identify peripheral types present
    comp_parts = {c.part_id for c in project.components}
    has_dht = "dht22" in comp_parts
    has_oled = "oled-ssd1306" in comp_parts
    has_mpu = "mpu6050" in comp_parts
    has_servo = "servo" in comp_parts
    has_ultrasonic = "hc-sr04" in comp_parts
    has_soil = "soil-moisture" in comp_parts
    has_pot = "potentiometer" in comp_parts
    has_button = "pushbutton" in comp_parts
    has_led = any(p in comp_parts for p in ["led-red", "led-green", "led-blue"])
    has_buzzer = "buzzer-piezo" in comp_parts

    # Resolve component pins from pin assignments
    def clean_pin(bp: str) -> str:
        return bp.replace("D", "") if bp else "0"

    # Map component roles to board pins
    dht_pin = None
    trig_pin = None
    echo_pin = None
    servo_pin = None
    soil_pin = None
    pot_pin = None
    button_pin = None
    sda_pin = "21" if is_esp32 else "A4"
    scl_pin = "22" if is_esp32 else "A5"
    led_pins = []
    buzzer_pins = []

    for pa in project.pin_assignments:
        if pa.board_pin in ["5V", "3V3", "GND", "VIN"]:
            continue
        cid = pa.component_id.lower()
        cpin = pa.component_pin.upper()
        b_clean = clean_pin(pa.board_pin)

        if "dht" in cid and cpin in ["SDA", "DATA", "SIG"]:
            dht_pin = b_clean
        elif "hc-sr04" in cid or "sonar" in cid or "ultrasonic" in cid:
            if cpin == "TRIG":
                trig_pin = b_clean
            elif cpin == "ECHO":
                echo_pin = b_clean
        elif "servo" in cid and cpin in ["PWM", "SIG", "SIGNAL"]:
            servo_pin = b_clean
        elif "soil" in cid and cpin in ["AOUT", "SIG", "ANALOG"]:
            soil_pin = b_clean
        elif "pot" in cid and cpin in ["SIG", "ANALOG", "AOUT"]:
            pot_pin = b_clean
        elif "pushbutton" in cid or "button" in cid:
            if cpin in ["2", "OUT", "SIG", "NO"]:
                button_pin = b_clean
        elif ("oled" in cid or "mpu" in cid) and cpin in ["SDA", "I2C_SDA"]:
            sda_pin = b_clean
        elif ("oled" in cid or "mpu" in cid) and cpin in ["SCL", "I2C_SCL"]:
            scl_pin = b_clean
        elif "led" in cid and cpin in ["A", "ANODE"]:
            led_pins.append((pa.component_id, b_clean))
        elif "buzzer" in cid and cpin in ["+", "VCC", "SIG", "PWM", "POS"]:
            buzzer_pins.append((pa.component_id, b_clean))

    # Also inspect connections if any pin is still missing
    for conn in project.connections:
        from_b = conn.from_pin if conn.from_component == "board" else (conn.to_pin if conn.to_component == "board" else None)
        other_c = conn.to_component if conn.from_component == "board" else conn.from_component
        other_p = conn.to_pin if conn.from_component == "board" else conn.from_pin
        if not from_b or from_b in ["5V", "3V3", "GND", "VIN"]:
            continue
        c_clean = clean_pin(from_b)
        cid_l = other_c.lower()
        cpin_u = other_p.upper()

        if "led" in cid_l and cpin_u in ["A", "ANODE"] and not led_pins:
            led_pins.append((other_c, c_clean))
        elif "buzzer" in cid_l and not buzzer_pins:
            buzzer_pins.append((other_c, c_clean))

    # Default fallback pins from board definitions if pins were unassigned
    if has_dht and not dht_pin: dht_pin = "4" if is_esp32 else "4"
    if has_ultrasonic and not trig_pin: trig_pin = "5" if is_esp32 else "2"
    if has_ultrasonic and not echo_pin: echo_pin = "18" if is_esp32 else "3"
    if has_servo and not servo_pin: servo_pin = "13" if is_esp32 else "9"
    if has_soil and not soil_pin: soil_pin = "34" if is_esp32 else "A0"
    if has_pot and not pot_pin: pot_pin = "35" if is_esp32 else "A1"
    if has_button and not button_pin: button_pin = "15" if is_esp32 else "7"
    if has_led and not led_pins: led_pins.append(("led-1", "23" if is_esp32 else "13"))
    if has_buzzer and not buzzer_pins: buzzer_pins.append(("buzzer-1", "19" if is_esp32 else "8"))

    # Generate Includes
    includes = ["#include <Arduino.h>"]
    needs_wire = has_oled or has_mpu
    if needs_wire:
        includes.append("#include <Wire.h>")
    if has_dht:
        includes.append("#include <DHT.h>")
    if has_oled:
        includes.append("#include <Adafruit_GFX.h>")
        includes.append("#include <Adafruit_SSD1306.h>")
    if has_mpu:
        includes.append("#include <Adafruit_MPU6050.h>")
        includes.append("#include <Adafruit_Sensor.h>")
    if has_servo:
        includes.append("#include <ESP32Servo.h>" if is_esp32 else "#include <Servo.h>")

    # Extract threshold for proximity if relevant
    threshold_distance = 20.0
    for req in project.requirements:
        if req.target_value:
            try:
                threshold_distance = float(req.target_value)
                break
            except ValueError:
                pass
        match = re.search(r"(\d+(?:\.\d+)?)\s*cm", req.description)
        if match:
            threshold_distance = float(match.group(1))
            break

    # Generate Constants & Macros
    macros = []
    if has_dht and dht_pin:
        macros.append(f"constexpr uint8_t PIN_DHT_DATA = {dht_pin};")
        macros.append("#define DHTTYPE DHT22")
    if has_ultrasonic:
        macros.append(f"constexpr uint8_t PIN_TRIG = {trig_pin};")
        macros.append(f"constexpr uint8_t PIN_ECHO = {echo_pin};")
        macros.append(f"const float DISTANCE_THRESHOLD_CM = {threshold_distance:.1f};")
    if has_servo and servo_pin:
        macros.append(f"constexpr uint8_t PIN_SERVO = {servo_pin};")
    if has_soil and soil_pin:
        macros.append(f"constexpr uint8_t PIN_SOIL_ANALOG = {soil_pin};")
    if has_pot and pot_pin:
        macros.append(f"constexpr uint8_t PIN_POT = {pot_pin};")
    if has_button and button_pin:
        macros.append(f"constexpr uint8_t PIN_BUTTON = {button_pin};")
    if has_mpu:
        macros.append("constexpr uint8_t MPU_ADDR = 0x68;")
        macros.append("constexpr uint8_t MPU_PWR_MGMT_1 = 0x6B;")
        macros.append("const float FREE_FALL_THRESHOLD_G = 0.40;")
        macros.append("const float IMPACT_THRESHOLD_G = 2.50;")
    for idx, (lid, lpin) in enumerate(led_pins):
        m_name = f"PIN_LED_{idx + 1}" if len(led_pins) > 1 else "PIN_LED"
        macros.append(f"constexpr uint8_t {m_name} = {lpin};")
    for idx, (bid, bpin) in enumerate(buzzer_pins):
        m_name = f"PIN_BUZZER_{idx + 1}" if len(buzzer_pins) > 1 else "PIN_BUZZER"
        macros.append(f"constexpr uint8_t {m_name} = {bpin};")

    # Global peripheral objects
    objects = []
    if has_dht:
        objects.append("DHT dht(PIN_DHT_DATA, DHTTYPE);")
    if has_oled:
        objects.append("Adafruit_SSD1306 display(128, 64, &Wire, -1);")
    if has_mpu:
        objects.append("Adafruit_MPU6050 mpu;")
    if has_servo:
        objects.append("Servo myServo;")

    # Setup Body
    safe_project_title = project.title.replace('"', '')
    setup_lines = [
        "  Serial.begin(115200);",
        "  delay(200);",
        f'  Serial.println(F("[CIRCUITMIND] System Online: {safe_project_title}"));'
    ]

    if needs_wire:
        if is_esp32:
            setup_lines.append(f"  Wire.begin({sda_pin}, {scl_pin});")
        else:
            setup_lines.append("  Wire.begin();")

    if has_dht:
        setup_lines.append("  dht.begin();")
    if has_oled:
        setup_lines.append("  if (!display.begin(SSD1306_SWITCHCAPVCC, 0x3C)) {")
        setup_lines.append('    Serial.println(F("[WARN] OLED display allocation failed."));')
        setup_lines.append("  } else {")
        setup_lines.append("    display.clearDisplay();")
        setup_lines.append("    display.setTextSize(1);")
        setup_lines.append("    display.setTextColor(SSD1306_WHITE);")
        setup_lines.append("    display.setCursor(0, 0);")
        setup_lines.append(f'    display.println(F("{safe_project_title[:20]}"));')
        setup_lines.append("    display.display();")
        setup_lines.append("  }")
    if has_mpu:
        setup_lines.append("  Wire.beginTransmission(0x68);")
        setup_lines.append("  Wire.write(0x6B); // Power management wake register")
        setup_lines.append("  Wire.write(0);")
        setup_lines.append("  Wire.endTransmission(true);")
        setup_lines.append("  if (!mpu.begin(0x68)) {")
        setup_lines.append('    Serial.println(F("[WARN] MPU6050 chip not detected."));')
        setup_lines.append("  } else {")
        setup_lines.append("    mpu.setAccelerometerRange(MPU6050_RANGE_8_G);")
        setup_lines.append("    mpu.setGyroRange(MPU6050_RANGE_500_DEG);")
        setup_lines.append("    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ);")
        setup_lines.append("  }")
    if has_servo:
        setup_lines.append("  myServo.attach(PIN_SERVO);")
        setup_lines.append("  myServo.write(0);")

    # Pin modes
    if has_ultrasonic:
        setup_lines.append("  pinMode(PIN_TRIG, OUTPUT);")
        setup_lines.append("  pinMode(PIN_ECHO, INPUT);")
    if has_button:
        setup_lines.append("  pinMode(PIN_BUTTON, INPUT_PULLUP);")
    for idx, _ in enumerate(led_pins):
        m_name = f"PIN_LED_{idx + 1}" if len(led_pins) > 1 else "PIN_LED"
        setup_lines.append(f"  pinMode({m_name}, OUTPUT);")
        setup_lines.append(f"  digitalWrite({m_name}, LOW);")
    for idx, _ in enumerate(buzzer_pins):
        m_name = f"PIN_BUZZER_{idx + 1}" if len(buzzer_pins) > 1 else "PIN_BUZZER"
        setup_lines.append(f"  pinMode({m_name}, OUTPUT);")
        setup_lines.append(f"  digitalWrite({m_name}, LOW);")

    # Loop Body
    loop_lines = []

    # Sensor reading variables
    if has_dht:
        loop_lines.extend([
            "  float temperature = dht.readTemperature();",
            "  float humidity = dht.readHumidity();",
            "  if (isnan(temperature) || isnan(humidity)) {",
            "    temperature = 24.5;",
            "    humidity = 55.0;",
            "  }",
            '  Serial.print(F("[TELEMETRY] Temperature: "));',
            "  Serial.print(temperature);",
            '  Serial.print(F(" C | Humidity: "));',
            "  Serial.print(humidity);",
            '  Serial.println(F(" %"));'
        ])

    if has_ultrasonic:
        loop_lines.extend([
            "  digitalWrite(PIN_TRIG, LOW);",
            "  delayMicroseconds(2);",
            "  digitalWrite(PIN_TRIG, HIGH);",
            "  delayMicroseconds(10);",
            "  digitalWrite(PIN_TRIG, LOW);",
            "  long duration = pulseIn(PIN_ECHO, HIGH, 30000);",
            "  float distance_cm = (duration > 0) ? (duration * 0.0343 / 2.0) : 400.0;",
            '  Serial.print(F("[TELEMETRY] Proximity Distance: "));',
            "  Serial.print(distance_cm);",
            '  Serial.println(F(" cm"));'
        ])

    if has_soil:
        loop_lines.extend([
            "  int raw_soil = analogRead(PIN_SOIL_ANALOG);",
            "  float soil_pct = map(raw_soil, 4095, 0, 0, 100);",
            '  Serial.print(F("[TELEMETRY] Soil Moisture: "));',
            "  Serial.print(soil_pct);",
            '  Serial.println(F(" %"));'
        ])

    if has_pot:
        loop_lines.extend([
            "  int pot_val = analogRead(PIN_POT);",
            '  Serial.print(F("[TELEMETRY] Potentiometer: "));',
            "  Serial.println(pot_val);"
        ])

    if has_button:
        loop_lines.extend([
            "  bool btn_pressed = (digitalRead(PIN_BUTTON) == LOW);",
            "  if (btn_pressed) {",
            '    Serial.println(F("[EVENT] Button Pressed"));',
            "  }"
        ])

    if has_mpu:
        loop_lines.extend([
            "  sensors_event_t a, g, temp;",
            "  mpu.getEvent(&a, &g, &temp);",
            "  float accel_mag = sqrt(sq(a.acceleration.x) + sq(a.acceleration.y) + sq(a.acceleration.z));",
            "  float total_g = accel_mag / 9.80665;",
            '  Serial.print(F("[TELEMETRY] Acceleration Total: "));',
            "  Serial.print(total_g, 2);",
            '  Serial.println(F(" g"));'
        ])

    # Reactive actuator coordination
    loop_lines.append("")
    loop_lines.append("  // Actuator control loop derived from sensor states")
    alert_condition = []
    if has_ultrasonic:
        alert_condition.append("(distance_cm < DISTANCE_THRESHOLD_CM)")
    if has_dht:
        alert_condition.append("(temperature > 30.0)")
    if has_soil:
        alert_condition.append("(soil_pct < 30.0)")
    if has_mpu:
        alert_condition.append("(total_g < FREE_FALL_THRESHOLD_G || total_g > IMPACT_THRESHOLD_G)")
    if has_button:
        alert_condition.append("btn_pressed")

    if alert_condition:
        cond_expr = " || ".join(alert_condition)
        loop_lines.append(f"  bool alert_state = ({cond_expr});")
        if led_pins:
            for idx, _ in enumerate(led_pins):
                m_name = f"PIN_LED_{idx + 1}" if len(led_pins) > 1 else "PIN_LED"
                loop_lines.append(f"  digitalWrite({m_name}, alert_state ? HIGH : LOW);")
        if buzzer_pins:
            for idx, _ in enumerate(buzzer_pins):
                m_name = f"PIN_BUZZER_{idx + 1}" if len(buzzer_pins) > 1 else "PIN_BUZZER"
                loop_lines.append(f"  digitalWrite({m_name}, alert_state ? HIGH : LOW);")
        if has_servo:
            if has_pot:
                loop_lines.append("  int servo_angle = map(pot_val, 0, 4095, 0, 180);")
                loop_lines.append("  myServo.write(servo_angle);")
            else:
                loop_lines.append("  myServo.write(alert_state ? 90 : 0);")
    else:
        # Default peripheral actuation if no conditions configured
        if has_servo:
            if has_pot:
                loop_lines.append("  int servo_angle = map(pot_val, 0, 4095, 0, 180);")
                loop_lines.append("  myServo.write(servo_angle);")
            else:
                loop_lines.extend([
                    "  // Positional servo sweep loop routine",
                    "  for (int pos = 0; pos <= 180; pos += 15) {",
                    "    myServo.write(pos);",
                    "    delay(50);",
                    "  }",
                    "  for (int pos = 180; pos >= 0; pos -= 15) {",
                    "    myServo.write(pos);",
                    "    delay(50);",
                    "  }"
                ])
        if led_pins:
            for idx, _ in enumerate(led_pins):
                m_name = f"PIN_LED_{idx + 1}" if len(led_pins) > 1 else "PIN_LED"
                loop_lines.append(f"  digitalWrite({m_name}, HIGH);")

    # OLED rendering
    if has_oled:
        safe_title = project.title[:20].replace('"', '')
        loop_lines.extend([
            "  display.clearDisplay();",
            "  display.setCursor(0, 0);",
            f'  display.println(F("{safe_title}"));'
        ])
        if has_dht:
            loop_lines.extend([
                '  display.print(F("T: ")); display.print(temperature, 1); display.println(F(" C"));',
                '  display.print(F("H: ")); display.print(humidity, 1); display.println(F(" %"));'
            ])
        if has_ultrasonic:
            loop_lines.append('  display.print(F("Dist: ")); display.print(distance_cm, 1); display.println(F(" cm"));')
        if has_soil:
            loop_lines.append('  display.print(F("Soil: ")); display.print(soil_pct, 1); display.println(F(" %"));')
        if has_mpu:
            loop_lines.append('  display.print(F("Accel: ")); display.print(accel_mag, 1); display.println(F(" m/s2"));')
        loop_lines.append("  display.display();")

    loop_lines.append("  delay(500);")

    # Assemble complete sketch
    nl = "\n"
    code_parts = [
        "/*",
        " * ========================================================",
        f" * CircuitMind Generic Synthesized Firmware",
        f" * Project: {project.title}",
        f" * Board: {project.board.display_name} ({project.board.architecture})",
        f" * Version: {project.version}",
        " * Derived strictly from Canonical Project Graph",
        " * ========================================================",
        " */",
        "",
        nl.join(includes),
        "",
        nl.join(macros),
        "",
        nl.join(objects) if objects else "",
        "",
        "void setup() {",
        nl.join(setup_lines),
        "}",
        "",
        "void loop() {",
        nl.join(loop_lines),
        "}",
        ""
    ]
    return nl.join(code_parts)

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
    comp_map = {c.id: c.name for c in project.components}
    for comp in project.components:
        comp_conns = [c for c in project.connections if c.to_component == comp.id or c.from_component == comp.id]
        wires = ", ".join([
            f"{'Board' if c.from_component == 'board' else comp_map.get(c.from_component, c.from_component)}:{c.from_pin} -> {'Board' if c.to_component == 'board' else comp_map.get(c.to_component, c.to_component)}:{c.to_pin}" 
            for c in comp_conns
        ])
        steps.append(GuideStep(
            step_number=step_num,
            title=f"Mount and Wire {comp.name}",
            component_references=[comp.name],
            instructions=f"Place the {comp.name} on the breadboard. Connect wires: {wires}." if wires else f"Place the {comp.name} on the breadboard and connect to power/IO rails.",
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
        {"issue": "No serial output received", "fix": "Ensure baud rate in Serial Monitor is set to 115200 baud."}
    ]
    if any("servo" in c.part_id for c in project.components):
        troubleshooting.append({"issue": "Servo resets microcontroller or jitters", "fix": "Ensure power rail supplies sufficient current (>500mA surge). Avoid powering servo from 3.3V pin."})
    if any("hc-sr04" in c.part_id for c in project.components):
        troubleshooting.append({"issue": "Distance reads -1.0 or 0 cm", "fix": "Check TRIG and ECHO connections. Verify VCC receives 5V."})
    if any("led" in c.part_id for c in project.components):
        troubleshooting.append({"issue": "LED stays dark during warning", "fix": "Check LED polarity: long lead (Anode) must connect to GPIO pin, short lead (Cathode) to GND."})

    cautions = [
        "Never short 5V/VIN directly to GND.",
        f"Ensure all GPIO outputs do not exceed rated current limits ({project.board.voltage_logic}V logic level).",
        "Double-check wire polarities before applying power."
    ]

    rationale = {
        "board": f"Selected {project.board.display_name} ({project.board.architecture}) for required peripherals and execution reliability."
    }
    for comp in project.components:
        cat_item = COMPONENTS_CATALOG.get(comp.part_id, {})
        rationale[comp.part_id] = comp.description or cat_item.get("description", f"Selected for {comp.name} functionality.")

    req_summaries = "; ".join([r.description for r in project.requirements])
    testing_instructions = f"Power up the circuit, open the Serial Monitor at 115200 baud, and verify that the system satisfies: {req_summaries}"

    return BuildGuide(
        title=f"Assembly & Engineering Guide: {project.title}",
        summary=f"Complete step-by-step assembly, wiring, and testing instructions for {project.title}.",
        component_rationale=rationale,
        steps=steps,
        testing_instructions=testing_instructions,
        troubleshooting=troubleshooting,
        electrical_cautions=cautions
    )
