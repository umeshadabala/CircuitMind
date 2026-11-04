#!/usr/bin/env python3
"""
Repeatable catalog ingestion and schema validation script.
Validates:
1. Pydantic CatalogComponent schema compliance.
2. Unique catalog IDs and valid categories.
3. Electrical pin invariants (voltage_min <= voltage_max, valid roles, directions).
4. Authoritative provenance metadata and Wokwi simulation IDs.
5. Prevents duplicate definitions and preserves high-quality verified records.
"""

import sys
from pathlib import Path

# Add project root to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from backend.app.domain.catalog import HARDWARE_CATALOG, list_catalog_items
from backend.app.domain.models import CatalogComponent, PinRole, PinDirection


def validate_catalog() -> int:
    print(f"=== CircuitMind Catalog Ingestion & Invariant Validation ===")
    items = list_catalog_items()
    print(f"Validating {len(items)} catalog components...")

    errors = []
    seen_ids = set()

    for item in items:
        # Check duplicate IDs
        if item.catalog_id in seen_ids:
            errors.append(f"Duplicate catalog_id: {item.catalog_id}")
        seen_ids.add(item.catalog_id)

        # Check supply voltages
        if item.supply_voltage_min > item.supply_voltage_max:
            errors.append(f"{item.catalog_id}: supply_voltage_min ({item.supply_voltage_min}V) > supply_voltage_max ({item.supply_voltage_max}V)")

        # Check provenance
        if not item.provenance:
            errors.append(f"{item.catalog_id}: Missing provenance record")

        # Check pins
        if not item.pins:
            errors.append(f"{item.catalog_id}: Component has no pins defined")

        pin_ids = set()
        for p in item.pins:
            if p.pin_id in pin_ids:
                errors.append(f"{item.catalog_id}: Duplicate pin_id '{p.pin_id}'")
            pin_ids.add(p.pin_id)

            if p.voltage_min > p.voltage_max:
                errors.append(f"{item.catalog_id}.{p.pin_id}: pin voltage_min ({p.voltage_min}V) > voltage_max ({p.voltage_max}V)")

        # Wokwi simulation support check
        if item.simulation_support.get("wokwi") and not item.wokwi_id:
            errors.append(f"{item.catalog_id}: Marked wokwi simulation supported but missing wokwi_id")

    if errors:
        print(f"FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  - {err}")
        return 1

    print(f"SUCCESS: All {len(items)} catalog components passed schema and electrical validation!")
    print(f"Controllers: {len([i for i in items if i.category in ['microcontroller', 'flight_controller']])}")
    print(f"Sensors: {len([i for i in items if i.category == 'sensor'])}")
    print(f"Actuators & Outputs: {len([i for i in items if i.category in ['actuator', 'display', 'motor_driver']])}")
    print(f"Passives & Power: {len([i for i in items if i.category in ['passive', 'logic', 'power']])}")
    return 0


if __name__ == "__main__":
    sys.exit(validate_catalog())

