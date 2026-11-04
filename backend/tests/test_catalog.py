import pytest
from backend.app.domain.catalog import HARDWARE_CATALOG, get_catalog_item, list_catalog_items
from backend.app.domain.models import PinDirection, PinRole


def test_catalog_contains_required_components():
    required_ids = [
        "ESP32-DEVKIT-V1",
        "HC-SR04",
        "LED-RED",
        "RES-220R",
        "RES-330R",
        "DIVIDER-5V-3V3",
        "BUZZER-PIEZO",
        "BTN-PUSH",
        "OLED-SSD1306",
        "DS18B20",
    ]
    for cid in required_ids:
        item = get_catalog_item(cid)
        assert item is not None, f"Required component {cid} missing from catalog"
        assert item.catalog_id == cid
        assert len(item.pins) > 0


def test_esp32_pin_definitions_and_strapping():
    esp32 = get_catalog_item("ESP32-DEVKIT-V1")
    assert esp32 is not None
    # Check 3V3, GND, VIN
    pin_ids = [p.pin_id for p in esp32.pins]
    assert "3V3" in pin_ids
    assert "GND" in pin_ids
    assert "VIN" in pin_ids
    assert "GPIO21" in pin_ids  # I2C SDA
    assert "GPIO22" in pin_ids  # I2C SCL

    # Check strapping pins are flagged
    gpio0 = next(p for p in esp32.pins if p.pin_id == "GPIO0")
    assert gpio0.is_strapping is True
    gpio12 = next(p for p in esp32.pins if p.pin_id == "GPIO12")
    assert gpio12.is_strapping is True

    # Check input-only pins
    gpio34 = next(p for p in esp32.pins if p.pin_id == "GPIO34")
    assert gpio34.direction == PinDirection.INPUT


def test_hcsr04_voltage_requirements():
    sensor = get_catalog_item("HC-SR04")
    assert sensor is not None
    echo_pin = next(p for p in sensor.pins if p.pin_id == "ECHO")
    assert echo_pin.direction == PinDirection.OUTPUT
    # Echo outputs 5V TTL
    assert echo_pin.voltage_max >= 4.8

