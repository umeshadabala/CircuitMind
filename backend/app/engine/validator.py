from typing import List, Dict, Any, Set
from datetime import datetime, timezone
from backend.app.models.project import Project, ValidationResult, DiagnosticIssue
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.catalog.boards import BOARDS

def validate_project_hardware(project: Project) -> ValidationResult:
    issues: List[DiagnosticIssue] = []
    
    board_type = project.board.type
    board_def = BOARDS.get(board_type)
    if not board_def:
        issues.append(DiagnosticIssue(
            severity="error",
            code="UNKNOWN_BOARD",
            message=f"Board '{board_type}' is not recognized in the hardware catalog.",
            affected_entities=["board"],
            remediation="Select a supported board such as 'esp32-devkit-v1' or 'arduino-uno'."
        ))
        return ValidationResult(status="error", issues=issues, validated_at=datetime.now(timezone.utc).isoformat())

    board_pins_set = set(board_def["pins"])
    reserved_pins = set(board_def.get("reserved_pins", []))
    input_only_pins = set(board_def.get("input_only_pins", []))

    # Track components
    component_map = {c.id: c for c in project.components}
    
    # 1. Validate component catalog references
    for comp in project.components:
        cat_item = COMPONENTS_CATALOG.get(comp.part_id)
        if not cat_item:
            issues.append(DiagnosticIssue(
                severity="warning",
                code="UNKNOWN_CATALOG_PART",
                message=f"Component '{comp.id}' has part_id '{comp.part_id}' not found in catalog.",
                affected_entities=[comp.id],
                remediation=f"Verify part_id against supported catalog items."
            ))
            
    # 2. Check for duplicate or conflicting GPIO assignments
    gpio_assignments: Dict[str, List[str]] = {}
    for pin_assign in project.pin_assignments:
        b_pin = pin_assign.board_pin
        # Check if pin exists on board
        if b_pin not in board_pins_set and b_pin not in ["3V3", "5V", "GND", "VIN"]:
            issues.append(DiagnosticIssue(
                severity="error",
                code="INVALID_BOARD_PIN",
                message=f"Pin '{b_pin}' assigned to {pin_assign.component_id} does not exist on {board_def['display_name']}.",
                affected_entities=[pin_assign.component_id, b_pin],
                remediation=f"Assign to a valid pin on {board_def['display_name']}."
            ))
        
        # Check reserved pins
        if b_pin in reserved_pins:
            issues.append(DiagnosticIssue(
                severity="warning",
                code="RESERVED_PIN_USAGE",
                message=f"Pin '{b_pin}' is reserved on {board_def['display_name']} (often used for UART or Boot).",
                affected_entities=[pin_assign.component_id, b_pin],
                remediation=f"Avoid using reserved pins like {', '.join(reserved_pins)} to ensure reliable flashing."
            ))

        # Check input-only pins used as output
        if b_pin in input_only_pins and pin_assign.signal_type in ["DIGITAL_OUT", "PWM"]:
            issues.append(DiagnosticIssue(
                severity="error",
                code="INPUT_ONLY_PIN_OUTPUT",
                message=f"Pin '{b_pin}' on {board_def['display_name']} is input-only and cannot be driven as {pin_assign.signal_type}.",
                affected_entities=[pin_assign.component_id, b_pin],
                remediation=f"Connect {pin_assign.component_id} to an output-capable GPIO."
            ))

        # Group by GPIO (ignore power/ground rails)
        if b_pin not in ["GND", "3V3", "5V", "VIN"]:
            gpio_assignments.setdefault(b_pin, []).append(f"{pin_assign.component_id}:{pin_assign.component_pin}")

    for b_pin, usages in gpio_assignments.items():
        if len(usages) > 1:
            # If I2C, multiple devices on SDA/SCL is valid
            is_i2c = any("SDA" in u or "SCL" in u for u in usages)
            if not is_i2c:
                issues.append(DiagnosticIssue(
                    severity="error",
                    code="PIN_CONFLICT",
                    message=f"GPIO pin '{b_pin}' is assigned to multiple components simultaneously: {', '.join(usages)}.",
                    affected_entities=[b_pin] + usages,
                    remediation="Assign distinct GPIO pins to each active sensor or actuator."
                ))

    # 3. Check connection endpoint validity and required power/ground
    connected_pins: Dict[str, Set[str]] = {}
    for conn in project.connections:
        connected_pins.setdefault(conn.from_component, set()).add(conn.from_pin)
        connected_pins.setdefault(conn.to_component, set()).add(conn.to_pin)
        
        # Validate existence
        if conn.from_component != "board" and conn.from_component not in component_map:
            issues.append(DiagnosticIssue(
                severity="error",
                code="DANGLING_CONNECTION_SRC",
                message=f"Connection '{conn.id}' originates from non-existent component '{conn.from_component}'.",
                affected_entities=[conn.id, conn.from_component]
            ))
        if conn.to_component != "board" and conn.to_component not in component_map:
            issues.append(DiagnosticIssue(
                severity="error",
                code="DANGLING_CONNECTION_DEST",
                message=f"Connection '{conn.id}' targets non-existent component '{conn.to_component}'.",
                affected_entities=[conn.id, conn.to_component]
            ))

    # 4. Check component-level missing required connections
    has_led = False
    has_resistor = False
    for comp in project.components:
        if "led" in comp.part_id:
            has_led = True
        if "resistor" in comp.part_id:
            has_resistor = True
            
        cat_item = COMPONENTS_CATALOG.get(comp.part_id)
        if cat_item:
            pins_spec = cat_item.get("pins", {})
            comp_connected = connected_pins.get(comp.id, set())
            for p_name, p_info in pins_spec.items():
                if p_info.get("required") and p_name not in comp_connected:
                    issues.append(DiagnosticIssue(
                        severity="warning",
                        code="UNCONNECTED_REQUIRED_PIN",
                        message=f"Component '{comp.id}' ({comp.name}) required pin '{p_name}' is not connected.",
                        affected_entities=[comp.id, p_name],
                        remediation=f"Wire pin '{p_name}' to the appropriate board pin or rail."
                    ))

    # LED current limiting resistor warning
    if has_led and not has_resistor:
        issues.append(DiagnosticIssue(
            severity="info",
            code="LED_CURRENT_LIMITING",
            message="LED detected without an in-line current-limiting resistor. In physical hardware, use a 220Ω-330Ω resistor to prevent excessive current draw.",
            affected_entities=["resistor"],
            remediation="Add a 220Ω resistor between the GPIO output and LED anode."
        ))

    # Determine status
    has_errors = any(i.severity == "error" for i in issues)
    has_warnings = any(i.severity == "warning" for i in issues)
    
    status = "error" if has_errors else ("warning" if has_warnings else "validated")
    
    return ValidationResult(
        status=status,
        issues=issues,
        validated_at=datetime.now(timezone.utc).isoformat()
    )
