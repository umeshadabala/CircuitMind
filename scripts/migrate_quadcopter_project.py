import uuid
from typing import List
from backend.app.models.project import (
    Project, BoardConfig, Requirement, ComponentInstance,
    Connection, PinAssignment, TestCase, FirmwareArtifact
)
from backend.app.catalog.boards import BOARDS
from backend.app.services.project_service import ProjectService
from backend.app.engine.generator import (
    generate_quadcopter_firmware, generate_wokwi_diagram, generate_build_guide
)
from backend.app.engine.validator import validate_project_hardware
from backend.app.engine.simulator import run_circuit_simulation

def repair_quadcopter_project():
    p_id = "proj-da623a03"
    
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
            description="Build a simulation-oriented mini quadcopter flight controller using an ESP32, an MPU6050 6-axis IMU, four brushless motor ESC signal interfaces, an arming switch, a status LED, and a buzzer.",
            priority="required",
            category="control"
        ),
        Requirement(
            id=f"{p_id}-req-002",
            description="Read accelerometer and gyroscope data from MPU6050 over I2C (SDA=D21, SCL=D22) at 0x68.",
            priority="required",
            category="sensing"
        ),
        Requirement(
            id=f"{p_id}-req-003",
            description="Estimate roll and pitch angles using a complementary filter (0.98 gyro + 0.02 accel).",
            priority="required",
            category="control"
        ),
        Requirement(
            id=f"{p_id}-req-004",
            description="Implement dual-axis PID loops for roll and pitch stabilization with configurable Kp, Ki, Kd gains.",
            priority="required",
            category="control"
        ),
        Requirement(
            id=f"{p_id}-req-005",
            description="Generate four separate ESC motor control commands (Front-Left, Front-Right, Rear-Right, Rear-Left) using Quad-X mixing convention.",
            priority="required",
            category="actuation"
        ),
        Requirement(
            id=f"{p_id}-req-006",
            description="Remain safely disarmed at boot with motor outputs clamped to 1000us baseline until explicit arming switch toggle.",
            priority="required",
            category="control"
        ),
        Requirement(
            id=f"{p_id}-req-007",
            description="Enter a safe disarmed state with error alert indication if IMU telemetry becomes invalid or stale (>100ms).",
            priority="required",
            category="control"
        ),
        Requirement(
            id=f"{p_id}-req-008",
            description="Print live telemetry (attitude, PID output, motor commands, arming status) over Serial at 115200 baud.",
            priority="recommended",
            category="connectivity"
        ),
        Requirement(
            id=f"{p_id}-req-009",
            description="Execute deterministic 250Hz non-blocking control loop using micros() scheduling without blocking delays.",
            priority="required",
            category="control"
        )
    ]

    components = [
        ComponentInstance(
            id=f"{p_id}-mpu6050",
            part_id="mpu6050",
            name="MPU-6050 6-DoF IMU",
            category="sensor",
            pins=["VCC", "GND", "SCL", "SDA", "XDA", "XCL", "AD0", "INT"],
            description="6-axis inertial measurement unit (3-axis gyro + 3-axis accelerometer)",
            position_x=440,
            position_y=60
        ),
        ComponentInstance(
            id=f"{p_id}-esc-1",
            part_id="esc-interface",
            name="ESC 1 (Front-Left Motor)",
            category="actuator",
            pins=["PWM", "GND"],
            description="Electronic Speed Controller PWM input (Motor 1 - CCW)",
            position_x=440,
            position_y=210
        ),
        ComponentInstance(
            id=f"{p_id}-esc-2",
            part_id="esc-interface",
            name="ESC 2 (Front-Right Motor)",
            category="actuator",
            pins=["PWM", "GND"],
            description="Electronic Speed Controller PWM input (Motor 2 - CW)",
            position_x=650,
            position_y=210
        ),
        ComponentInstance(
            id=f"{p_id}-esc-3",
            part_id="esc-interface",
            name="ESC 3 (Rear-Right Motor)",
            category="actuator",
            pins=["PWM", "GND"],
            description="Electronic Speed Controller PWM input (Motor 3 - CCW)",
            position_x=650,
            position_y=350
        ),
        ComponentInstance(
            id=f"{p_id}-esc-4",
            part_id="esc-interface",
            name="ESC 4 (Rear-Left Motor)",
            category="actuator",
            pins=["PWM", "GND"],
            description="Electronic Speed Controller PWM input (Motor 4 - CW)",
            position_x=440,
            position_y=350
        ),
        ComponentInstance(
            id=f"{p_id}-pushbutton",
            part_id="pushbutton",
            name="Arming Switch",
            category="input",
            pins=["1.l", "2.l", "1.r", "2.r"],
            description="Tactile push button for flight controller arm/disarm toggle",
            position_x=650,
            position_y=60
        ),
        ComponentInstance(
            id=f"{p_id}-resistor",
            part_id="resistor-220",
            name="220 Ω Resistor",
            category="passive",
            pins=["1", "2"],
            description="Current limiting resistor for flight status LED",
            position_x=440,
            position_y=490
        ),
        ComponentInstance(
            id=f"{p_id}-led-red",
            part_id="led-red",
            name="Status LED",
            category="output",
            pins=["A", "C"],
            description="Red 5mm LED indicating armed (solid) and error (flashing) state",
            position_x=650,
            position_y=490
        ),
        ComponentInstance(
            id=f"{p_id}-buzzer-piezo",
            part_id="buzzer-piezo",
            name="Piezo Buzzer",
            category="output",
            pins=["1", "2"],
            description="Acoustic alarm for arming beeps and failsafe alert",
            position_x=860,
            position_y=60
        )
    ]

    pin_assignments = [
        # MPU6050 (I2C)
        PinAssignment(component_id=f"{p_id}-mpu6050", component_pin="VCC", board_pin="3V3", signal_type="POWER_VCC"),
        PinAssignment(component_id=f"{p_id}-mpu6050", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-mpu6050", component_pin="SDA", board_pin="D21", signal_type="I2C_SDA"),
        PinAssignment(component_id=f"{p_id}-mpu6050", component_pin="SCL", board_pin="D22", signal_type="I2C_SCL"),

        # ESCs (PWM)
        PinAssignment(component_id=f"{p_id}-esc-1", component_pin="PWM", board_pin="D13", signal_type="PWM"),
        PinAssignment(component_id=f"{p_id}-esc-1", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-esc-2", component_pin="PWM", board_pin="D12", signal_type="PWM"),
        PinAssignment(component_id=f"{p_id}-esc-2", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-esc-3", component_pin="PWM", board_pin="D14", signal_type="PWM"),
        PinAssignment(component_id=f"{p_id}-esc-3", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),
        PinAssignment(component_id=f"{p_id}-esc-4", component_pin="PWM", board_pin="D27", signal_type="PWM"),
        PinAssignment(component_id=f"{p_id}-esc-4", component_pin="GND", board_pin="GND", signal_type="POWER_GND"),

        # Arming Switch
        PinAssignment(component_id=f"{p_id}-pushbutton", component_pin="1.l", board_pin="D15", signal_type="DIGITAL_IN"),
        PinAssignment(component_id=f"{p_id}-pushbutton", component_pin="2.l", board_pin="GND", signal_type="POWER_GND"),

        # Status LED & Resistor
        PinAssignment(component_id=f"{p_id}-resistor", component_pin="1", board_pin="D2", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id=f"{p_id}-led-red", component_pin="C", board_pin="GND", signal_type="POWER_GND"),

        # Buzzer
        PinAssignment(component_id=f"{p_id}-buzzer-piezo", component_pin="1", board_pin="D4", signal_type="DIGITAL_OUT"),
        PinAssignment(component_id=f"{p_id}-buzzer-piezo", component_pin="2", board_pin="GND", signal_type="POWER_GND"),
    ]

    connections = [
        # MPU6050
        Connection(id=f"{p_id}-c1", from_component="board", from_pin="3V3", to_component=f"{p_id}-mpu6050", to_pin="VCC", color="red", signal_type="POWER"),
        Connection(id=f"{p_id}-c2", from_component="board", from_pin="GND", to_component=f"{p_id}-mpu6050", to_pin="GND", color="black", signal_type="GROUND"),
        Connection(id=f"{p_id}-c3", from_component="board", from_pin="D21", to_component=f"{p_id}-mpu6050", to_pin="SDA", color="blue", signal_type="I2C"),
        Connection(id=f"{p_id}-c4", from_component="board", from_pin="D22", to_component=f"{p_id}-mpu6050", to_pin="SCL", color="green", signal_type="I2C"),

        # ESC 1
        Connection(id=f"{p_id}-c5", from_component="board", from_pin="D13", to_component=f"{p_id}-esc-1", to_pin="PWM", color="orange", signal_type="PWM"),
        Connection(id=f"{p_id}-c6", from_component="board", from_pin="GND", to_component=f"{p_id}-esc-1", to_pin="GND", color="black", signal_type="GROUND"),

        # ESC 2
        Connection(id=f"{p_id}-c7", from_component="board", from_pin="D12", to_component=f"{p_id}-esc-2", to_pin="PWM", color="orange", signal_type="PWM"),
        Connection(id=f"{p_id}-c8", from_component="board", from_pin="GND", to_component=f"{p_id}-esc-2", to_pin="GND", color="black", signal_type="GROUND"),

        # ESC 3
        Connection(id=f"{p_id}-c9", from_component="board", from_pin="D14", to_component=f"{p_id}-esc-3", to_pin="PWM", color="orange", signal_type="PWM"),
        Connection(id=f"{p_id}-c10", from_component="board", from_pin="GND", to_component=f"{p_id}-esc-3", to_pin="GND", color="black", signal_type="GROUND"),

        # ESC 4
        Connection(id=f"{p_id}-c11", from_component="board", from_pin="D27", to_component=f"{p_id}-esc-4", to_pin="PWM", color="orange", signal_type="PWM"),
        Connection(id=f"{p_id}-c12", from_component="board", from_pin="GND", to_component=f"{p_id}-esc-4", to_pin="GND", color="black", signal_type="GROUND"),

        # Arming Switch
        Connection(id=f"{p_id}-c13", from_component="board", from_pin="D15", to_component=f"{p_id}-pushbutton", to_pin="1.l", color="yellow", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c14", from_component="board", from_pin="GND", to_component=f"{p_id}-pushbutton", to_pin="2.l", color="black", signal_type="GROUND"),

        # Status LED via 220R Resistor
        Connection(id=f"{p_id}-c15", from_component="board", from_pin="D2", to_component=f"{p_id}-resistor", to_pin="1", color="red", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c16", from_component=f"{p_id}-resistor", from_pin="2", to_component=f"{p_id}-led-red", to_pin="A", color="red", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c17", from_component="board", from_pin="GND", to_component=f"{p_id}-led-red", to_pin="C", color="black", signal_type="GROUND"),

        # Buzzer
        Connection(id=f"{p_id}-c18", from_component="board", from_pin="D4", to_component=f"{p_id}-buzzer-piezo", to_pin="1", color="purple", signal_type="DIGITAL"),
        Connection(id=f"{p_id}-c19", from_component="board", from_pin="GND", to_component=f"{p_id}-buzzer-piezo", to_pin="2", color="black", signal_type="GROUND"),
    ]

    tests = [
        TestCase(
            id=f"{p_id}-test-001",
            requirement_id=f"{p_id}-req-002",
            name="IMU I²C Communication Test",
            test_type="i2c_telemetry",
            given="ESP32 powered on with MPU-6050 wired to I2C bus (D21 SDA, D22 SCL)",
            when="Microcontroller executes Wire.beginTransmission(0x68)",
            then="MPU6050 acknowledges on 0x68 and returns valid accelerometer and gyro data",
            parameters={"i2c_address": "0x68"}
        ),
        TestCase(
            id=f"{p_id}-test-002",
            requirement_id=f"{p_id}-req-006",
            name="Arming Switch Activation",
            test_type="pin_state",
            given="Controller boots in safe DISARMED state with motors off",
            when="Arming switch button is toggled ON (D15 pulled LOW)",
            then="Flight status transitions to ARMED and status LED turns solid",
            parameters={"switch_pin": "D15"}
        ),
        TestCase(
            id=f"{p_id}-test-003",
            requirement_id=f"{p_id}-req-006",
            name="Safe Disarmed Motor Outputs",
            test_type="pin_state",
            given="Flight controller is in DISARMED state",
            when="Control loop updates motor outputs",
            then="All 4 ESC PWM signals are clamped to safe baseline pulse width (1000us)",
            parameters={"safe_pulse_us": 1000}
        ),
        TestCase(
            id=f"{p_id}-test-004",
            requirement_id=f"{p_id}-req-007",
            name="IMU Stale Data Handling",
            test_type="pin_state",
            given="System is ARMED and executing flight stabilization loop",
            when="IMU communication fails or telemetry becomes stale for >100ms",
            then="System immediately disarms motors to 1000us and activates buzzer/LED error alert",
            parameters={"timeout_ms": 100}
        ),
        TestCase(
            id=f"{p_id}-test-005",
            requirement_id=f"{p_id}-req-009",
            name="PID Loop Timing",
            test_type="frequency",
            given="Flight stabilization loop running with complementary filter",
            when="Loop time is measured between successive iterations",
            then="Loop executes deterministically at 250Hz (4000us interval) without blocking delays",
            parameters={"target_freq_hz": 250}
        )
    ]

    unresolved_requirements = [
        "Wokwi simulator currently lacks a dynamic brushless motor/ESC aerodynamic physics model; ESC signal interfaces are simulated as calibrated 50Hz/250Hz PWM servo pulses.",
        "Physical flight readiness requires off-board ESC power distribution and independent hardware bench testing before propeller attachment."
    ]

    proj = Project(
        id=p_id,
        title="ESP32 Quad-copter Flight Controller (Simulation-Only)",
        description="Simulation-oriented ESP32 mini quadcopter flight controller with MPU-6050 IMU, 4 ESC signal interfaces, arming switch, status LED, and buzzer.",
        version=1,
        board=board,
        requirements=requirements,
        components=components,
        pin_assignments=pin_assignments,
        connections=connections,
        firmware=[],
        tests=tests,
        unresolved_requirements=unresolved_requirements
    )

    # Generate Firmware
    fw_code = generate_quadcopter_firmware(proj)
    proj.firmware = [FirmwareArtifact(
        filename="sketch.ino",
        code=fw_code,
        board_type="esp32-devkit-v1",
        version=proj.version,
        compilation_status="unverified"
    )]

    # Generate Wokwi diagram & build guide
    proj.diagram_layout = generate_wokwi_diagram(proj)
    proj.build_guide = generate_build_guide(proj)

    # Validate Hardware
    proj.validation = validate_project_hardware(proj)

    # Run Simulation
    sim_run = run_circuit_simulation(proj)

    # Save to SQLite
    ProjectService.save(proj)
    from backend.app.database.db import save_simulation_run
    save_simulation_run(sim_run.model_dump())

    print(f"Project '{p_id}' successfully repaired and persisted!")
    print(f"- Components ({len(proj.components)}): {[c.name for c in proj.components]}")
    print(f"- Pin assignments ({len(proj.pin_assignments)}): {[(pa.component_id, pa.board_pin) for pa in proj.pin_assignments]}")
    print(f"- Validation: {proj.validation.status} ({len(proj.validation.issues)} issues)")
    print(f"- Simulation: {sim_run.status} ({sim_run.summary})")

if __name__ == "__main__":
    repair_quadcopter_project()
