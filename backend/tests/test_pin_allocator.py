import pytest
from backend.app.domain.models import ComponentInstance
from backend.app.services.pin_allocator import DeterministicPinAllocator, PinAllocationError


def test_pin_allocator_avoids_strapping_pins():
    components = [
        ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
        ComponentInstance(instance_id="D1", catalog_id="LED-RED", name="Red LED", role="actuator"),
        ComponentInstance(instance_id="BZ1", catalog_id="BUZZER-PIEZO", name="Buzzer", role="actuator"),
    ]
    allocs = DeterministicPinAllocator.allocate_pins(components)
    assert "D1.ANODE" in allocs
    assert "BZ1.POS" in allocs

    # Verify no strapping pins (GPIO0, GPIO2, GPIO12, GPIO15) assigned
    strapping_gpios = {"GPIO0", "GPIO2", "GPIO12", "GPIO15"}
    for target_gpio in allocs.values():
        assert target_gpio not in strapping_gpios


def test_pin_allocator_i2c_dedicated_assignment():
    components = [
        ComponentInstance(instance_id="U1", catalog_id="ESP32-DEVKIT-V1", name="ESP32", role="microcontroller"),
        ComponentInstance(instance_id="DISP1", catalog_id="OLED-SSD1306", name="OLED", role="display"),
    ]
    allocs = DeterministicPinAllocator.allocate_pins(components)
    assert allocs["DISP1.SDA"] == "GPIO21"
    assert allocs["DISP1.SCL"] == "GPIO22"


def test_missing_mcu_raises_error():
    components = [
        ComponentInstance(instance_id="D1", catalog_id="LED-RED", name="Red LED", role="actuator"),
    ]
    with pytest.raises(PinAllocationError):
        DeterministicPinAllocator.allocate_pins(components)


def test_stm32f405_multirotor_peripherals_allocation():
    """
    Verifies that flight controller peripherals (ESC, Buzzer, Status LED, Servo, Ultrasonic)
    allocate dedicated hardware pads and auxiliary pins without exhausting GPIOs or raising errors.
    """
    components = [
        ComponentInstance(instance_id="FC1", catalog_id="STM32F405-FC", name="Flight Controller", role="flight_controller"),
        ComponentInstance(instance_id="ESC1", catalog_id="ESC-4IN1-30A", name="4-in-1 ESC", role="motor_driver"),
        ComponentInstance(instance_id="D5", catalog_id="BUZZER-PIEZO", name="Lost Model Buzzer", role="actuator"),
        ComponentInstance(instance_id="LED1", catalog_id="LED-RED", name="Arming LED", role="actuator"),
        ComponentInstance(instance_id="SRV1", catalog_id="SERVO-SG90", name="Gimbal Servo", role="actuator"),
        ComponentInstance(instance_id="S1", catalog_id="HC-SR04", name="Altitude Sonar", role="sensor"),
    ]
    allocs = DeterministicPinAllocator.allocate_pins(components, strict=True)

    # Motor outputs map directly to M1-M4
    assert allocs["ESC1.M1_IN"] == "M1"
    assert allocs["ESC1.M2_IN"] == "M2"
    assert allocs["ESC1.M3_IN"] == "M3"
    assert allocs["ESC1.M4_IN"] == "M4"

    # Dedicated buzzer pad
    assert allocs["D5.POS"] == "BUZZER"

    # Dedicated LED pad
    assert allocs["LED1.ANODE"] == "LED"

    # Auxiliary motor/servo pad
    assert allocs["SRV1.PWM"] == "M5"

    # General sensors allocate auxiliary GPIOs
    assert allocs["S1.TRIG"] == "AUX1"
    assert allocs["S1.ECHO"] == "AUX2"


def test_strict_vs_best_effort_pin_allocation():
    """
    Verifies that strict=True raises PinAllocationError when peripheral count exceeds board pins,
    while strict=False returns partial allocations gracefully without an unhandled crash.
    """
    # Arduino Uno has ~14 digital pins. Create 25 LEDs to exceed pin capacity.
    components = [
        ComponentInstance(instance_id="U1", catalog_id="ARDUINO-UNO-R3", name="Uno", role="controller")
    ]
    for i in range(25):
        components.append(
            ComponentInstance(instance_id=f"D{i}", catalog_id="LED-RED", name=f"LED {i}", role="actuator")
        )

    # Strict allocation must raise PinAllocationError
    with pytest.raises(PinAllocationError):
        DeterministicPinAllocator.allocate_pins(components, strict=True)

    # Best-effort allocation must succeed and return partial map
    partial_allocs = DeterministicPinAllocator.allocate_pins(components, strict=False)
    assert len(partial_allocs) > 0
    assert len(partial_allocs) < 25
