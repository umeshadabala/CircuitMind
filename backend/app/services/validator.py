from datetime import datetime, timezone
from typing import Dict, List, Optional, Set, Tuple

from backend.app.domain.catalog import HARDWARE_CATALOG, get_catalog_item
from backend.app.domain.drc_rules import DRCRule
from backend.app.domain.models import (
    CatalogComponent,
    ComponentInstance,
    Net,
    NetType,
    Pin,
    PinDirection,
    PinReference,
    PinRole,
    Project,
    Severity,
    ValidationFinding,
    ValidationReport,
)


class DRCValidator:
    """Deterministic Design Rule Check (DRC) and automated repair engine for CircuitMind graphs."""

    @classmethod
    def validate_project(cls, project: Project) -> ValidationReport:
        findings: List[ValidationFinding] = []

        # Map instances by instance_id
        inst_map: Dict[str, ComponentInstance] = {c.instance_id: c for c in project.components}
        # Cache catalog parts
        part_map: Dict[str, Optional[CatalogComponent]] = {
            c.instance_id: get_catalog_item(c.catalog_id) for c in project.components
        }

        # 1. Rule: Unsupported Components (DRC-E008)
        for inst in project.components:
            if not part_map[inst.instance_id]:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.UNSUPPORTED_PART.value,
                        severity=Severity.ERROR,
                        title=f"Unsupported Component '{inst.catalog_id}'",
                        message=f"Instance {inst.instance_id} references catalog ID '{inst.catalog_id}' which is not in the hardware catalog.",
                        remedy=f"Replace {inst.instance_id} with a supported component from the curated catalog.",
                        affected_instances=[inst.instance_id],
                    )
                )

        # 2. Rule: Invalid Pin References (DRC-E004)
        for net in project.nets:
            for pin_ref in net.pins:
                inst = inst_map.get(pin_ref.instance_id)
                if not inst:
                    findings.append(
                        ValidationFinding(
                            rule_id=DRCRule.INVALID_PIN_REF.value,
                            severity=Severity.ERROR,
                            title="Invalid Component in Net",
                            message=f"Net '{net.name}' ({net.net_id}) connects to nonexistent instance '{pin_ref.instance_id}'.",
                            remedy="Remove invalid pin reference or recreate the component instance.",
                            affected_nets=[net.net_id],
                        )
                    )
                    continue

                catalog_part = part_map.get(pin_ref.instance_id)
                if catalog_part:
                    pin_exists = any(p.pin_id == pin_ref.pin_id for p in catalog_part.pins)
                    if not pin_exists:
                        findings.append(
                            ValidationFinding(
                                rule_id=DRCRule.INVALID_PIN_REF.value,
                                severity=Severity.ERROR,
                                title=f"Invalid Pin '{pin_ref.pin_id}' on {inst.instance_id}",
                                message=f"Pin '{pin_ref.pin_id}' is not defined for part '{catalog_part.name}'.",
                                remedy=f"Select a valid pin defined on {catalog_part.catalog_id}.",
                                affected_instances=[inst.instance_id],
                                affected_pins=[f"{inst.instance_id}.{pin_ref.pin_id}"],
                                affected_nets=[net.net_id],
                            )
                        )

        # 3. Rule: Power / Ground Short Circuits (DRC-E001)
        for net in project.nets:
            has_pwr_pin = False
            has_gnd_pin = False
            pwr_pin_names = []
            gnd_pin_names = []

            for pin_ref in net.pins:
                catalog_part = part_map.get(pin_ref.instance_id)
                if not catalog_part:
                    continue
                pin_def = next((p for p in catalog_part.pins if p.pin_id == pin_ref.pin_id), None)
                if not pin_def:
                    continue

                if pin_def.role == PinRole.POWER or pin_def.direction == PinDirection.POWER and ("VCC" in pin_def.pin_id.upper() or "3V3" in pin_def.pin_id.upper() or "VIN" in pin_def.pin_id.upper()):
                    has_pwr_pin = True
                    pwr_pin_names.append(f"{pin_ref.instance_id}.{pin_ref.pin_id}")
                elif pin_def.role == PinRole.GROUND or "GND" in pin_def.pin_id.upper():
                    has_gnd_pin = True
                    gnd_pin_names.append(f"{pin_ref.instance_id}.{pin_ref.pin_id}")

            if (has_pwr_pin and has_gnd_pin) or (net.net_type == NetType.POWER and has_gnd_pin) or (net.net_type == NetType.GROUND and has_pwr_pin):
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.PWR_GND_SHORT.value,
                        severity=Severity.ERROR,
                        title=f"Power/Ground Short Circuit on Net '{net.name}'",
                        message=f"Net '{net.name}' connects power pins ({', '.join(pwr_pin_names)}) directly to ground pins ({', '.join(gnd_pin_names)}).",
                        remedy="Separate power and ground rails into independent nets immediately to avoid board damage.",
                        affected_nets=[net.net_id],
                        affected_pins=pwr_pin_names + gnd_pin_names,
                    )
                )

        # Map each pin (instance_id, pin_id) -> list of net_ids
        pin_to_nets: Dict[Tuple[str, str], List[str]] = {}
        for net in project.nets:
            for pin_ref in net.pins:
                key = (pin_ref.instance_id, pin_ref.pin_id)
                pin_to_nets.setdefault(key, []).append(net.net_id)

        # 4. Rules: Missing Power / Missing Ground on Active Components (DRC-E002, DRC-E003)
        for inst in project.components:
            catalog_part = part_map.get(inst.instance_id)
            if not catalog_part or catalog_part.category == "passive":
                continue

            for pin_def in catalog_part.pins:
                key = (inst.instance_id, pin_def.pin_id)
                connected_nets = pin_to_nets.get(key, [])

                # Power check
                if catalog_part.category in ["microcontroller", "flight_controller"]:
                    has_any_pwr = any(
                        len(pin_to_nets.get((inst.instance_id, p.pin_id), [])) > 0
                        for p in catalog_part.pins
                        if p.role == PinRole.POWER
                    )
                    first_pwr = next((p.pin_id for p in catalog_part.pins if p.role == PinRole.POWER), None)
                    if not has_any_pwr and pin_def.pin_id == first_pwr:
                        findings.append(
                            ValidationFinding(
                                rule_id=DRCRule.MISSING_POWER.value,
                                severity=Severity.ERROR,
                                title=f"Unconnected Power Rail on {inst.instance_id}",
                                message=f"{inst.instance_id} ({catalog_part.name}) has no power rail connected.",
                                remedy=f"Connect {inst.instance_id} to an appropriate power rail.",
                                affected_instances=[inst.instance_id],
                                affected_pins=[f"{inst.instance_id}.{first_pwr}"],
                            )
                        )
                elif (pin_def.role == PinRole.POWER or pin_def.pin_id in ["VCC", "VDD"]) and not connected_nets:
                    findings.append(
                        ValidationFinding(
                            rule_id=DRCRule.MISSING_POWER.value,
                            severity=Severity.ERROR,
                            title=f"Unconnected Power Pin on {inst.instance_id}",
                            message=f"{inst.instance_id} ({catalog_part.name}) has unpowered supply pin '{pin_def.pin_id}'.",
                            remedy=f"Connect {inst.instance_id}.{pin_def.pin_id} to an appropriate power rail (3.3V or 5V).",
                            affected_instances=[inst.instance_id],
                            affected_pins=[f"{inst.instance_id}.{pin_def.pin_id}"],
                        )
                    )

                # Ground check
                if (pin_def.role == PinRole.GROUND or "GND" in pin_def.pin_id.upper()) and not connected_nets:
                    findings.append(
                        ValidationFinding(
                            rule_id=DRCRule.MISSING_GROUND.value,
                            severity=Severity.ERROR,
                            title=f"Unconnected Ground Pin on {inst.instance_id}",
                            message=f"{inst.instance_id} ({catalog_part.name}) has ungrounded pin '{pin_def.pin_id}'.",
                            remedy=f"Connect {inst.instance_id}.{pin_def.pin_id} to system common ground (GND).",
                            affected_instances=[inst.instance_id],
                            affected_pins=[f"{inst.instance_id}.{pin_def.pin_id}"],
                        )
                    )

        # 5. Rule: Input-Only Pin Used as Output (DRC-E006)
        mcu_instances = [inst for inst in project.components if "ESP32" in inst.catalog_id or inst.role == "microcontroller"]
        for mcu in mcu_instances:
            catalog_part = part_map.get(mcu.instance_id)
            if not catalog_part:
                continue
            for pin_def in catalog_part.pins:
                if pin_def.direction == PinDirection.INPUT:
                    nets_for_pin = pin_to_nets.get((mcu.instance_id, pin_def.pin_id), [])
                    for net_id in nets_for_pin:
                        net = next(n for n in project.nets if n.net_id == net_id)
                        for other_pin_ref in net.pins:
                            if other_pin_ref.instance_id == mcu.instance_id:
                                continue
                            other_part = part_map.get(other_pin_ref.instance_id)
                            if not other_part:
                                continue
                            other_pin = next((p for p in other_part.pins if p.pin_id == other_pin_ref.pin_id), None)
                            if other_pin and (other_pin.direction == PinDirection.INPUT or other_part.category in ["actuator", "display"]):
                                findings.append(
                                    ValidationFinding(
                                        rule_id=DRCRule.INPUT_ONLY_AS_OUTPUT.value,
                                        severity=Severity.ERROR,
                                        title=f"Input-Only Pin {pin_def.pin_id} Driving Output",
                                        message=f"{mcu.name} pin {pin_def.pin_id} is input-only and cannot drive output on {other_pin_ref.instance_id}.{other_pin_ref.pin_id}.",
                                        remedy="Reassign peripheral to an output-capable GPIO pin (such as GPIO4, GPIO18, or GPIO23).",
                                        affected_instances=[mcu.instance_id, other_pin_ref.instance_id],
                                        affected_pins=[f"{mcu.instance_id}.{pin_def.pin_id}", f"{other_pin_ref.instance_id}.{other_pin_ref.pin_id}"],
                                        affected_nets=[net.net_id],
                                    )
                                )

        # 6. Rule: Voltage Overstress / 5V into 3.3V GPIO (DRC-E007)
        for net in project.nets:
            has_5v_out = False
            has_3v3_in = False
            out_pin_name = ""
            in_pin_name = ""

            for pin_ref in net.pins:
                part = part_map.get(pin_ref.instance_id)
                if not part:
                    continue
                pin = next((p for p in part.pins if p.pin_id == pin_ref.pin_id), None)
                if not pin:
                    continue

                if pin.direction == PinDirection.OUTPUT and pin.voltage_max > 4.5:
                    has_5v_out = True
                    out_pin_name = f"{pin_ref.instance_id}.{pin_ref.pin_id}"
                elif pin.direction in [PinDirection.INPUT, PinDirection.BIDIRECTIONAL] and pin.voltage_max <= 3.6:
                    if "ESP32" in part.catalog_id or part.category == "microcontroller":
                        has_3v3_in = True
                        in_pin_name = f"{pin_ref.instance_id}.{pin_ref.pin_id}"

            if has_5v_out and has_3v3_in:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.VOLTAGE_OVERSTRESS.value,
                        severity=Severity.ERROR,
                        title=f"Voltage Level Conflict on Net '{net.name}'",
                        message=f"5V output {out_pin_name} is directly connected to 3.3V-max input {in_pin_name} without a level shifter or voltage divider.",
                        remedy="Insert a 5V to 3.3V voltage divider network (DIVIDER-5V-3V3 or 1k/2k resistors) between the 5V output and 3.3V input.",
                        affected_nets=[net.net_id],
                        affected_pins=[out_pin_name, in_pin_name],
                    )
                )

        # 7. Rule: Missing Current-Limiting Resistor on LEDs (DRC-W001)
        led_instances = [inst for inst in project.components if inst.catalog_id.startswith("LED-") or (part_map.get(inst.instance_id) and any(p.requires_current_limiting for p in part_map[inst.instance_id].pins))]
        for led in led_instances:
            part = part_map.get(led.instance_id)
            if not part:
                continue
            cur_limit_pin = next((p for p in part.pins if p.requires_current_limiting), None)
            target_pin_id = cur_limit_pin.pin_id if cur_limit_pin else "ANODE"

            anode_nets = pin_to_nets.get((led.instance_id, target_pin_id), [])
            has_resistor = False
            for net_id in anode_nets:
                net = next(n for n in project.nets if n.net_id == net_id)
                for pin_ref in net.pins:
                    other_part = part_map.get(pin_ref.instance_id)
                    if other_part and (other_part.category == "passive" and "RES" in other_part.catalog_id):
                        has_resistor = True
                        break

            if not has_resistor:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.MISSING_CURRENT_LIMITER.value,
                        severity=Severity.WARNING,
                        title=f"Missing Current Limiting Resistor for {led.instance_id}",
                        message=f"{led.name} ({led.instance_id}) is connected without a series current-limiting resistor.",
                        remedy="Add a 220Ω or 330Ω resistor in series with the LED to limit current to safe operating levels.",
                        affected_instances=[led.instance_id],
                    )
                )

        # 8. Rule: Strapping Pin Utilized (DRC-W002)
        for mcu in mcu_instances:
            catalog_part = part_map.get(mcu.instance_id)
            if not catalog_part:
                continue
            for pin_def in catalog_part.pins:
                if pin_def.is_strapping:
                    connected = pin_to_nets.get((mcu.instance_id, pin_def.pin_id), [])
                    if connected:
                        findings.append(
                            ValidationFinding(
                                rule_id=DRCRule.STRAPPING_PIN_USED.value,
                                severity=Severity.WARNING,
                                title=f"Strapping Pin {pin_def.pin_id} Connected",
                                message=f"{mcu.name} pin {pin_def.pin_id} is a boot strapping pin. Ensure external components do not bias this pin during reset.",
                                remedy="Prefer non-strapping general-purpose pins (e.g. GPIO4, GPIO18, GPIO19, GPIO23) if predictable cold-boot behavior is required.",
                                affected_instances=[mcu.instance_id],
                                affected_pins=[f"{mcu.instance_id}.{pin_def.pin_id}"],
                            )
                        )

        # 9. Rule: Floating Nets (DRC-W004)
        for net in project.nets:
            if len(net.pins) < 2:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.FLOATING_NET.value,
                        severity=Severity.WARNING,
                        title=f"Floating Net '{net.name}'",
                        message=f"Net '{net.name}' ({net.net_id}) has only {len(net.pins)} connected pin(s).",
                        remedy="Connect at least two pins to form a closed circuit, or remove the unused net.",
                        affected_nets=[net.net_id],
                    )
                )

        # 10. Rule: Missing Critical Subsystem (DRC-E009)
        req_text = ""
        if project.requirements:
            req_text = f"{project.requirements.system_overview} {' '.join(project.requirements.desired_behavior)}".lower()
        elif project.name:
            req_text = project.name.lower()

        is_drone_system = any(w in req_text for w in ["drone", "quadcopter", "multirotor", "uav", "flight system"])
        if is_drone_system:
            has_fc = any(c.role == "flight_controller" or "FC" in c.catalog_id for c in project.components)
            if not has_fc:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.MISSING_CRITICAL_SUBSYSTEM.value,
                        severity=Severity.ERROR,
                        title="Missing Dedicated Flight Controller",
                        message="Quadcopter/drone systems require a dedicated flight controller (e.g. STM32F405-FC) with integrated IMU and real-time flight software stack. A generic MCU with LEDs is not a safe flight architecture.",
                        remedy="Include STM32F405-FC with PX4/Betaflight autopilot stack.",
                    )
                )

            has_esc = any("ESC" in c.catalog_id for c in project.components)
            if not has_esc:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.MISSING_CRITICAL_SUBSYSTEM.value,
                        severity=Severity.ERROR,
                        title="Missing Motor Speed Controller (ESC)",
                        message="Multirotor flight requires a multi-channel electronic speed controller (e.g. ESC-4IN1-30A) to drive brushless motors.",
                        remedy="Add ESC-4IN1-30A DShot speed controller to the propulsion subsystem.",
                    )
                )

            has_motors = any("MOTOR" in c.catalog_id or "BLDC" in c.catalog_id for c in project.components)
            if not has_motors:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.MISSING_CRITICAL_SUBSYSTEM.value,
                        severity=Severity.ERROR,
                        title="Missing Propulsion Motors",
                        message="Quadcopter physical architecture requires brushless DC motors (e.g. BLDC-MOTOR-2207) for thrust and attitude control.",
                        remedy="Include BLDC-MOTOR-2207 multirotor motors in the propulsion subsystem.",
                    )
                )

        # 11. Rule: Untraceable / Isolated Component (DRC-W005)
        connected_instances = set()
        for net in project.nets:
            for p in net.pins:
                connected_instances.add(p.instance_id)

        for c in project.components:
            if c.instance_id not in connected_instances and project.nets:
                findings.append(
                    ValidationFinding(
                        rule_id=DRCRule.UNTRACEABLE_COMPONENT.value,
                        severity=Severity.WARNING,
                        title=f"Unconnected Component '{c.name}'",
                        message=f"Component {c.instance_id} ({c.catalog_id}) has no net connections in the canonical graph.",
                        remedy="Wire component pins to power rails and signal lines, or remove the unused part.",
                        affected_instances=[c.instance_id],
                    )
                )

        is_valid = not any(f.severity == Severity.ERROR for f in findings)
        err_count = sum(1 for f in findings if f.severity == Severity.ERROR)
        warn_count = sum(1 for f in findings if f.severity == Severity.WARNING)
        info_count = sum(1 for f in findings if f.severity == Severity.INFO)

        implemented_checks = [
            f"{r.value} ({r.name.replace('_', ' ').title()})" for r in DRCRule
        ]
        unsupported_checks = [
            "High-Frequency RF Impedance Matching & Return Loss (50Ω trace geometry not verified by static netlist)",
            "Continuous Dynamic Thermal Dissipation & Junction Temperature (Requires thermal FEA under airflow load)",
            "Radiated Electromagnetic Interference (EMI) & Shielding Compliance (Requires anechoic chamber verification)",
            "Mechanical Vibration & Structural Resonance Fatigue (Multirotor frame resonance damping requires physical logging)",
            "AC Mains Dielectric Breakdown & Galvanic Creepage Distances (Mains safety requires physical PCB clearance inspection)",
            "Component Tolerance Drift & Monte Carlo Aging Analysis (Worst-case temperature coefficient variance not modeled)",
        ]

        report = ValidationReport(
            revision=project.revision,
            valid=is_valid,
            findings=findings,
            checked_at=datetime.now(timezone.utc).isoformat(),
            implemented_checks=implemented_checks,
            unsupported_checks=unsupported_checks,
            summary={
                "errors": err_count,
                "warnings": warn_count,
                "info": info_count,
                "total": len(findings),
            },
        )
        return report

    @classmethod
    def auto_repair_project(cls, project: Project) -> List[str]:
        """
        Executes bounded, explicit graph mutations to resolve repairable DRC findings.
        Returns a list of actions taken.
        """
        from backend.app.services.pin_allocator import DeterministicPinAllocator
        from backend.app.services.net_generator import NetGenerator

        actions_taken: List[str] = []
        report = cls.validate_project(project)
        if report.valid and not any(f.severity == Severity.WARNING for f in report.findings):
            return ["No repairable DRC issues found; design is clean."]

        # Check 1: Missing voltage divider (DRC-E007)
        has_overstress = any(f.rule_id == DRCRule.VOLTAGE_OVERSTRESS.value for f in report.findings)
        if has_overstress:
            divider_part = get_catalog_item("DIVIDER-5V-3V3")
            if divider_part and not any(c.catalog_id == "DIVIDER-5V-3V3" for c in project.components):
                idx = len([c for c in project.components if c.instance_id.startswith("LVL")]) + 1
                new_inst = ComponentInstance(
                    instance_id=f"LVL{idx}",
                    catalog_id="DIVIDER-5V-3V3",
                    name="5V to 3.3V Voltage Divider Network",
                    role="logic",
                    position={"x": 320.0, "y": 180.0},
                    properties=divider_part.default_properties,
                )
                project.components.append(new_inst)
                actions_taken.append("Added DIVIDER-5V-3V3 to protect 3.3V microcontroller inputs.")

        # Check 2: Missing current limiting resistor for LEDs (DRC-W001)
        missing_resistors = [f for f in report.findings if f.rule_id == DRCRule.MISSING_CURRENT_LIMITER.value]
        for finding in missing_resistors:
            res_part = get_catalog_item("RES-330R")
            if res_part:
                r_idx = len([c for c in project.components if c.instance_id.startswith("R")]) + 1
                new_res = ComponentInstance(
                    instance_id=f"R{r_idx}",
                    catalog_id="RES-330R",
                    name="330Ω Current Limiting Resistor",
                    role="passive",
                    position={"x": 940.0, "y": 80.0 + r_idx * 60.0},
                    properties=res_part.default_properties,
                )
                project.components.append(new_res)
                actions_taken.append(f"Added {new_res.instance_id} (330Ω) to limit LED current.")

        # Check 3: Clean up floating nets (DRC-W004)
        original_net_count = len(project.nets)
        project.nets = [n for n in project.nets if len(n.pins) >= 2]
        if len(project.nets) < original_net_count:
            actions_taken.append(f"Removed {original_net_count - len(project.nets)} floating net(s).")

        # If any components were added, re-allocate pins and re-generate nets
        if actions_taken:
            try:
                pin_map = DeterministicPinAllocator.allocate_pins(project.components)
                project.nets = NetGenerator.generate_nets(project.components, pin_map)
                project.revision += 1
                project.validation_report = cls.validate_project(project)
            except Exception as e:
                actions_taken.append(f"Note during graph refresh: {e}")

        return actions_taken
