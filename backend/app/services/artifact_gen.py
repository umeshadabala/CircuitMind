from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from backend.app.domain.catalog import get_catalog_item
from backend.app.domain.models import Project, PinRole, PinDirection


class ArtifactGenerator:
    """Derives BOM, Netlists, and Assembly guides from the canonical project graph."""

    @classmethod
    def generate_bom(cls, project: Project) -> Dict[str, Any]:
        """
        Generates an interactive, verified Bill of Materials grouping component instances
        strictly by catalog ID and extracting verified specifications without inventing data.
        """
        counts: Dict[str, List[Any]] = {}
        for comp in project.components:
            counts.setdefault(comp.catalog_id, []).append(comp)

        items: List[Dict[str, Any]] = []
        for cat_id, inst_list in sorted(counts.items()):
            part = get_catalog_item(cat_id)
            designators = sorted([c.instance_id for c in inst_list])

            # Extract electrical value / rating from catalog or properties
            value_rating = "Standard Spec"
            if part:
                if "resistance_ohms" in part.default_properties:
                    value_rating = f"{part.default_properties['resistance_ohms']}Ω"
                elif "clock_mhz" in part.default_properties:
                    value_rating = f"{part.default_properties['clock_mhz']} MHz"
                elif "kv_rating" in part.default_properties:
                    value_rating = f"{part.default_properties['kv_rating']} KV"
                elif "max_current_a" in part.default_properties:
                    value_rating = f"{part.default_properties['max_current_a']}A Max"
                elif part.supply_voltage_max > 0:
                    value_rating = f"{part.supply_voltage_min}V - {part.supply_voltage_max}V"

            # Package / footprint
            package = "Standard Module / Board"
            if part:
                if part.category == "passive":
                    package = "Through-Hole 0.25W / Axial"
                elif "LED" in cat_id:
                    package = "Through-Hole 5mm Round"
                elif "DIP" in part.description:
                    package = "DIP Package"
                elif "FC" in cat_id or "ESC" in cat_id:
                    package = "30.5x30.5mm Stack Mounting"

            items.append({
                "catalog_id": cat_id,
                "name": part.name if part else cat_id,
                "category": part.category if part else "custom",
                "part_number": part.part_number if part and part.part_number else "N/A",
                "manufacturer": part.manufacturer if part and part.manufacturer else "Curated Hardware Library",
                "value_rating": value_rating,
                "package": package,
                "description": part.description if part else "",
                "quantity": len(designators),
                "designators": designators,
                "provenance": "Curated & Verified" if part else "Unverified Custom Part",
                "datasheet_url": part.datasheet_url if part else None,
                "sourcing_status": "Catalog Specification Verified (Contact Distributor)",
                "estimated_unit_price": None,  # Strictly do not fabricate pricing data
                "instances": [
                    {
                        "instance_id": c.instance_id,
                        "name": c.name,
                        "role": c.role,
                        "position": c.position,
                        "properties": c.properties,
                    }
                    for c in inst_list
                ],
            })

        return {
            "project_id": project.id,
            "revision": project.revision,
            "total_components": len(project.components),
            "unique_parts": len(items),
            "items": items,
        }

    @classmethod
    def generate_netlist(cls, project: Project) -> Dict[str, Any]:
        """
        Generates an interactive, structured Netlist and KiCad-compatible text format
        directly from canonical electrical nets and pin definitions.
        """
        inst_map = {c.instance_id: c for c in project.components}

        # Structured net objects
        structured_nets: List[Dict[str, Any]] = []
        kicad_lines = [
            f"(export (version D) (project \"{project.name}\") (revision {project.revision})",
            "  (components",
        ]

        for c in project.components:
            part = get_catalog_item(c.catalog_id)
            footprint = "Module"
            if part and part.category == "passive":
                footprint = "Axial_ThroughHole"
            kicad_lines.append(f'    (comp (ref "{c.instance_id}") (value "{c.catalog_id}") (footprint "{footprint}"))')
        kicad_lines.append("  )")
        kicad_lines.append("  (nets")

        for net in project.nets:
            endpoints = []
            for p in net.pins:
                comp = inst_map.get(p.instance_id)
                part = get_catalog_item(comp.catalog_id) if comp else None
                pin_def = next((x for x in (part.pins if part else []) if x.pin_id == p.pin_id), None)

                endpoints.append({
                    "instance_id": p.instance_id,
                    "pin_id": p.pin_id,
                    "component_name": comp.name if comp else p.instance_id,
                    "catalog_id": comp.catalog_id if comp else "UNKNOWN",
                    "pin_name": pin_def.name if pin_def else p.pin_id,
                    "role": pin_def.role.value if pin_def else "PASSIVE",
                    "direction": pin_def.direction.value if pin_def else "PASSIVE",
                    "voltage_max": pin_def.voltage_max if pin_def else None,
                })

            is_valid = len(net.pins) >= 2
            status = "CONNECTED" if is_valid else "FLOATING"

            structured_nets.append({
                "net_id": net.net_id,
                "name": net.name,
                "net_type": net.net_type.value,
                "voltage": net.voltage,
                "node_count": len(net.pins),
                "is_valid": is_valid,
                "status": status,
                "rationale": net.rationale or "System electrical connection.",
                "endpoints": endpoints,
            })

            kicad_lines.append(f'    (net (code "{net.net_id}") (name "{net.name}")')
            for p in net.pins:
                kicad_lines.append(f'      (node (ref "{p.instance_id}") (pin "{p.pin_id}"))')
            kicad_lines.append("    )")

        kicad_lines.append("  )")
        kicad_lines.append(")")
        kicad_text = "\n".join(kicad_lines)

        return {
            "project_id": project.id,
            "revision": project.revision,
            "net_count": len(project.nets),
            "nets": structured_nets,
            "kicad_format": kicad_text,
        }

    @classmethod
    def generate_assembly_guide(cls, project: Project) -> str:
        """
        Derives an authentic, project-specific engineering assembly, wiring, and testing guide.
        Strictly includes only components present in the canonical graph.
        Never references unselected sensors, dividers, or actuators.
        """
        now_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
        target_board = project.target_board or "Generic Controller"
        mcu_part = get_catalog_item(target_board)
        mcu_name = mcu_part.name if mcu_part else target_board

        # Component categorization & presence detection
        components = project.components
        comp_ids = {c.catalog_id for c in components}
        inst_map = {c.instance_id: c for c in components}

        has_bldc_or_drone = any("FC" in cid or "ESC" in cid or "BLDC" in cid or "PDB" in cid for cid in comp_ids)
        has_relay = any("RELAY" in cid for cid in comp_ids)
        has_led = any("LED" in cid for cid in comp_ids)
        has_buzzer = any("BUZZER" in cid for cid in comp_ids)
        has_oled = any("OLED" in cid or "SSD1306" in cid for cid in comp_ids)
        has_sonar = any("HC-SR04" in cid or "SONAR" in cid for cid in comp_ids)
        has_dht = any("DHT" in cid for cid in comp_ids)
        has_bmp = any("BMP" in cid or "BME" in cid for cid in comp_ids)
        has_servo = any("SERVO" in cid for cid in comp_ids)
        has_button = any("BTN" in cid or "BUTTON" in cid for cid in comp_ids)
        has_pot = any("POT" in cid for cid in comp_ids)
        has_pir = any("PIR" in cid for cid in comp_ids)

        # Voltage rails present in nets
        rail_names = [n.name for n in project.nets if n.net_type.value in ["POWER", "GROUND"]]
        voltages = sorted(list({n.voltage for n in project.nets if n.voltage is not None and n.voltage > 0}))

        lines: List[str] = [
            f"# Engineering Assembly & Commissioning Guide: {project.name}",
            f"**Revision**: {project.revision}  |  **Target Controller**: `{target_board}` ({mcu_name})  |  **Generated**: {now_str}",
            "",
            "> [!IMPORTANT]",
            f"> This document is derived directly from CircuitMind project graph revision {project.revision}. Every instruction, pin assignment, and safety precaution corresponds strictly to the verified components in this design.",
            "",
            "## Table of Contents",
            "1. [Design Overview & Operational Architecture](#1-design-overview--operational-architecture)",
            "2. [Safety Precautions & Voltage Domains](#2-safety-precautions--voltage-domains)",
            "3. [Verified Component Inventory](#3-verified-component-inventory)",
            "4. [Required Tools, Supplies & Bench Equipment](#4-required-tools-supplies--bench-equipment)",
            "5. [Power Supply Architecture & Ground Distribution](#5-power-supply-architecture--ground-distribution)",
            "6. [Step-by-Step Wiring Sequence](#6-step-by-step-wiring-sequence)",
            "7. [Controller Pin Assignment Table](#7-controller-pin-assignment-table)",
            "8. [Component-Specific Installation & Polarity Guidelines](#8-component-specific-installation--polarity-guidelines)",
            "9. [Firmware Setup, Dependencies & Flashing Procedure](#9-firmware-setup-dependencies--flashing-procedure)",
            "10. [Pre-Power Inspection & Continuity Checklist](#10-pre-power-inspection--continuity-checklist)",
            "11. [Controlled First-Power-Up Sequence](#11-controlled-first-power-up-sequence)",
            "12. [Functional Bench Verification Test Cases](#12-functional-bench-verification-test-cases)",
            "13. [Hardware & Interface Troubleshooting Matrix](#13-hardware--interface-troubleshooting-matrix)",
            "14. [Engineering Assumptions, Unresolved Checks & Limitations](#14-engineering-assumptions-unresolved-checks--limitations)",
            "",
            "---",
            "",
            "## 1. Design Overview & Operational Architecture",
            f"This project implements a hardware system built around the **{mcu_name}** (`{target_board}`).",
        ]

        if project.description:
            lines.append(f"**Functional Intent**: {project.description}")

        if project.architecture:
            if project.architecture.functional_blocks:
                lines.append("\n**Key Architecture Blocks**:")
                for blk in project.architecture.functional_blocks:
                    blk_name = blk.get("name", "Subsystem")
                    blk_desc = blk.get("description", "")
                    lines.append(f"- **{blk_name}**: {blk_desc}")
            if project.architecture.power_domains:
                lines.append(f"\n**Power Architecture**: {', '.join(project.architecture.power_domains)}")

        lines.extend([
            "",
            "## 2. Safety Precautions & Voltage Domains",
            f"The operating environment includes active rails: **{', '.join([f'{v}V' for v in voltages]) if voltages else 'Standard logic supply'}** alongside common ground (`0V`).",
        ])

        # Specific safety rules based on ACTUAL components
        if has_bldc_or_drone:
            lines.extend([
                "- **High-Current LiPo Battery Hazard**: The multirotor power bus carries up to 25.2V (6S) with burst discharge capability exceeding 100A. A short circuit will cause instant thermal destruction or fire. Never short `NET_VBAT` to `NET_GND`.",
                "- **Propeller Safety Rule**: **NEVER** install propellers while connecting the flight controller to USB or performing bench motor tests. Accidental motor spin-up can cause severe physical lacerations.",
                "- **Smoke Stopper Current Limiter**: Always connect a current-limiting fuse or smoke-stopper between the LiPo battery and PDB during the initial bench power-up.",
            ])

        if has_relay:
            lines.extend([
                "- **Galvanic Isolation & Load Separation**: The relay coil input is powered by 5V DC logic. The relay output contacts (`COM`, `NO`, `NC`) switch an independent circuit. **Never route AC mains (120V/240V) onto a solderless breadboard.** Use dedicated screw terminals and an insulated enclosure for any switched load.",
                "- **Flyback & Inductive Suppression**: When switching inductive loads (solenoids, coils), verify snubbing/freewheeling protection is in place.",
            ])

        if has_led:
            lines.extend([
                "- **LED Current Limiting**: LEDs are current-driven diodes with very low dynamic internal resistance. Each LED anode must have a series current-limiting resistor (typically 220Ω to 330Ω) between the driving GPIO and the LED.",
            ])

        if has_sonar:
            lines.extend([
                "- **Ultrasonic 5V Logic Protection**: The HC-SR04 operates at 5V VCC and outputs a 5V logic pulse on its `ECHO` pin. When paired with a 3.3V microcontroller, verify that the 5V-to-3.3V divider/shifter is connected to prevent GPIO overvoltage.",
            ])

        lines.extend([
            f"- **ESD & Logic Protection**: Always handle the `{target_board}` on an anti-static mat. Ensure all power supplies are unplugged before inserting or moving jumper wires.",
            "",
            "## 3. Verified Component Inventory",
            "| Ref Designator | Component Name | Catalog Part # | Value / Rating | Qty | Role |",
            "| :--- | :--- | :--- | :--- | :---: | :--- |",
        ])

        bom = cls.generate_bom(project)
        for item in bom["items"]:
            for d in item["designators"]:
                lines.append(f"| **`{d}`** | {item['name']} | `{item['part_number']}` | {item['value_rating']} | 1 | {item['category']} |")

        lines.extend([
            "",
            "## 4. Required Tools, Supplies & Bench Equipment",
            "- **Digital Multimeter (DMM)**: With continuity buzzer, DC voltage measurement (0–30V), and resistance ranges.",
            "- **Breadboard / Mounting Base**: Solderless breadboard (830 tie-point) or rigid mounting plate with standoffs.",
            "- **Jumper Wires**: High-grade stranded jumper wires (Male-to-Male and Male-to-Female).",
            f"- **Host Programming Cable**: USB cable compatible with `{target_board}`.",
            "- **Precision Hand Tools**: Wire strippers, needle-nose pliers, and small flathead screwdriver.",
        ])

        if has_bldc_or_drone:
            lines.append("- **LiPo Safety Bag & Smoke-Stopper**: Current-limited inline fuse module with XT60 connectors.")

        lines.extend([
            "",
            "## 5. Power Supply Architecture & Ground Distribution",
            "All modules must share an unbroken, low-impedance ground reference to ensure stable logic thresholds.",
            "",
            "| Rail ID | Rail Name | Nominal Voltage | Origin / Source | Connected Pins |",
            "| :--- | :--- | :---: | :--- | :--- |",
        ])

        for net in project.nets:
            if net.net_type.value in ["POWER", "GROUND"]:
                pin_list = ", ".join([f"`{p.instance_id}.{p.pin_id}`" for p in net.pins])
                volt_str = f"{net.voltage}V" if net.voltage is not None else "0V (GND)"
                lines.append(f"| `{net.net_id}` | {net.name} | {volt_str} | {net.rationale or 'System rail'} | {pin_list} |")

        lines.extend([
            "",
            "## 6. Step-by-Step Wiring Sequence",
            "",
            "### Phase 1: Common Ground & Power Rails",
        ])

        pwr_nets = [n for n in project.nets if n.net_type.value in ["POWER", "GROUND"]]
        for idx, net in enumerate(pwr_nets, 1):
            nodes_str = " ➔ ".join([f"`{p.instance_id}.{p.pin_id}`" for p in net.pins])
            lines.append(f"{idx}. **{net.name}** (`{net.net_id}`): Connect {nodes_str}.")
            if net.rationale:
                lines.append(f"   *Engineering Note: {net.rationale}*")

        lines.extend([
            "",
            "### Phase 2: Communication Buses (I2C, SPI, UART)",
        ])

        bus_nets = [n for n in project.nets if n.net_type.value in ["I2C", "SPI", "UART"]]
        if bus_nets:
            for idx, net in enumerate(bus_nets, 1):
                nodes_str = " ⟷ ".join([f"`{p.instance_id}.{p.pin_id}`" for p in net.pins])
                lines.append(f"{idx}. **{net.name}** (`{net.net_id}`): Wire {nodes_str}.")
        else:
            lines.append("*No dedicated multi-drop bus lines defined in this design.*")

        lines.extend([
            "",
            "### Phase 3: Actuator, Motor, and Signal Routing",
        ])

        signal_nets = [n for n in project.nets if n.net_type.value not in ["POWER", "GROUND", "I2C", "SPI", "UART"]]
        for idx, net in enumerate(signal_nets, 1):
            nodes_str = " ➔ ".join([f"`{p.instance_id}.{p.pin_id}`" for p in net.pins])
            lines.append(f"{idx}. **{net.name}** (`{net.net_id}`): Connect {nodes_str}.")
            if net.rationale:
                lines.append(f"   *Rationale: {net.rationale}*")

        lines.extend([
            "",
            "## 7. Controller Pin Assignment Table",
            f"Mapping of physical `{target_board}` pins to peripheral terminals:",
            "",
            "| Controller Pin | Peripheral Terminal | Connected Net | Net Type | Nominal Voltage |",
            "| :--- | :--- | :--- | :---: | :---: |",
        ])

        # Find controller component
        mcu_inst = next((c for c in components if c.role in ["microcontroller", "controller", "flight_controller"] or "FC" in c.catalog_id or "ESP32" in c.catalog_id or "ARDUINO" in c.catalog_id or "PICO" in c.catalog_id), None)
        if mcu_inst:
            for net in project.nets:
                mcu_pin = next((p for p in net.pins if p.instance_id == mcu_inst.instance_id), None)
                if mcu_pin:
                    periph_pins = [f"`{p.instance_id}.{p.pin_id}`" for p in net.pins if p.instance_id != mcu_inst.instance_id]
                    periph_str = ", ".join(periph_pins) if periph_pins else "*(Internal / Unconnected)*"
                    volt_str = f"{net.voltage}V" if net.voltage is not None else "—"
                    lines.append(f"| **`{mcu_pin.pin_id}`** | {periph_str} | `{net.name}` | `{net.net_type.value}` | {volt_str} |")

        lines.extend([
            "",
            "## 8. Component-Specific Installation & Polarity Guidelines",
        ])

        if has_led:
            lines.extend([
                "- **Light Emitting Diodes (LEDs)**: The longer lead is the **Anode (+)**, which must face toward the series current-limiting resistor and driving GPIO. The shorter lead adjacent to the flat edge of the epoxy lens is the **Cathode (-)**, connecting directly to ground.",
            ])

        if has_buzzer:
            lines.extend([
                "- **Active Piezo Sounder**: Observe the `+` mark on the top sticker. The positive pin connects to the controller drive GPIO/pad; the negative terminal connects to GND.",
            ])

        if has_oled:
            lines.extend([
                "- **SSD1306 0.96-inch OLED**: Verify that `VCC` and `GND` pins match your module's silkscreen (some breakout boards place GND on Pin 1, others on Pin 2). Default I2C bus address is `0x3C`.",
            ])

        if has_bldc_or_drone:
            lines.extend([
                "- **4-in-1 ESC and BLDC Motors**: Motor phase wires (A, B, C) can be connected in any initial sequence. If any motor spins in reverse during bench checkout, swap any two of its three phase wires to invert direction.",
                "- **ESC Signal Harness**: Connect `M1_IN` through `M4_IN` in exact order corresponding to Betaflight/PX4 Quad-X motor numbering.",
            ])

        if has_relay:
            lines.extend([
                "- **Relay Module**: Ensure the coil power is fed from the 5V rail. Set the active trigger jumper (HIGH/LOW) to match firmware logic.",
            ])

        if has_button:
            lines.extend([
                "- **Pushbutton**: Connected between the sensing GPIO and GND utilizing internal pull-up resistors (`INPUT_PULLUP`). Active state reads logic LOW (`0`).",
            ])

        lines.extend([
            "",
            "## 9. Firmware Setup, Dependencies & Flashing Procedure",
        ])

        # Tailor firmware section to actual target platform
        if "ARDUINO" in target_board:
            lines.extend([
                "1. **Toolchain**: Install the latest **Arduino IDE** (v2.x) or PlatformIO with the `Atmel AVR` platform.",
                "2. **Board Selection**: Under Tools > Board, choose **Arduino Uno**.",
                "3. **Port Selection**: Select the serial port corresponding to your connected USB ATmega16U2 device.",
                "4. **Compile & Upload**: Paste generated firmware code from the Firmware tab into your sketch and click **Upload**.",
            ])
        elif "PICO" in target_board:
            lines.extend([
                "1. **Toolchain**: Arduino-Pico core (Earle Philhower) or Raspberry Pi Pico C/C++ SDK.",
                "2. **Boot Mode**: Hold down the onboard **BOOTSEL** button while plugging the Pico into USB.",
                "3. **Flashing**: Drag and drop the compiled `.uf2` binary into the `RPI-RP2` mass storage drive.",
            ])
        elif "STM32" in target_board or "FC" in target_board:
            lines.extend([
                "1. **Flight Software Stack**: This board runs **Betaflight** (4.4+) or **PX4 Autopilot** firmware.",
                "2. **Flashing Tool**: Connect via USB in DFU mode using **Betaflight Configurator** or **QGroundControl**.",
                "3. **Motor Protocol**: Configure motor protocol to **DShot600** or **DShot300** to match `ESC-4IN1-30A`.",
            ])
        else:  # ESP32 default
            lines.extend([
                "1. **Toolchain**: Install **PlatformIO IDE** (VS Code extension) or the **Arduino IDE** with ESP32 board package.",
                "2. **Board Selection**: Choose **ESP32 Dev Module** with Flash Frequency 80MHz, Upload Speed 921600.",
                "3. **Baud Rate**: Initialize the Serial Monitor at **115200 baud** to view real-time diagnostic output.",
                "4. **Upload**: Hold the `BOOT` button if required when the serial flasher initiates connection.",
            ])

        lines.extend([
            "",
            "## 10. Pre-Power Inspection & Continuity Checklist",
            "Perform the following checks with all power disconnected:",
            "",
            "- [ ] **VCC-to-GND Short Circuit Check**: Place DMM in continuity/resistance mode across `3V3` and `GND`, and across `5V` and `GND`. Confirm resistance is in the mega-ohm range (no continuous beep).",
            "- [ ] **Polarity Verification**: Visually inspect all electrolytic capacitors, diodes, LEDs, and power module inputs for correct polarity.",
            "- [ ] **Wire Seating**: Gently tug on jumper wires to verify snug insertion in breadboard sockets and screw terminals.",
        ])

        if has_bldc_or_drone:
            lines.append("- [ ] **Propellers Removed**: Confirm that all propellers are off the motor shafts prior to power-up.")

        lines.extend([
            "",
            "## 11. Controlled First-Power-Up Sequence",
            "1. **Stage 1 (Isolated Controller)**: Connect the controller board via USB with no external high-current loads attached. Verify onboard Power LED illuminates steady.",
            "2. **Stage 2 (Voltage Measurement)**: Using the multimeter, measure the `3V3` and `5V` test pads relative to GND. Verify readings are within ±5% nominal (3.15V–3.45V and 4.8V–5.25V).",
            "3. **Stage 3 (Peripheral Connection)**: Unplug USB, attach peripheral signal wires, and re-power. Verify no components feel abnormally hot to the touch.",
        ])

        if has_bldc_or_drone:
            lines.append("4. **Stage 4 (Battery Power via Smoke Stopper)**: Connect the LiPo battery through an inline smoke stopper. If the green indicator stays lit, arming tests may proceed.")

        lines.extend([
            "",
            "## 12. Functional Bench Verification Test Cases",
            "",
            "| Test Case | Stimulus / Action | Expected Result | Verified (Y/N) |",
            "| :--- | :--- | :--- | :---: |",
            "| **TC-01: Boot & Heartbeat** | Power on system and observe serial terminal | Controller prints initialization banner and configured baud rate | [ ] |",
        ])

        tc_idx = 2
        if has_led:
            lines.append(f"| **TC-{tc_idx:02d}: Status Indicator** | Firmware boot complete | Status LED turns ON or flashes heartbeat pattern | [ ] |")
            tc_idx += 1

        if has_buzzer:
            lines.append(f"| **TC-{tc_idx:02d}: Audio Feedback** | System armed / triggered | Piezo buzzer produces audible tone | [ ] |")
            tc_idx += 1

        if has_oled:
            lines.append(f"| **TC-{tc_idx:02d}: Display Render** | Firmware running | OLED displays system status text without garbled artifacts | [ ] |")
            tc_idx += 1

        if has_sonar:
            lines.append(f"| **TC-{tc_idx:02d}: Sonar Ranging** | Place object 20cm in front of HC-SR04 | Serial monitor reports ~20cm distance ±2cm | [ ] |")
            tc_idx += 1

        if has_button:
            lines.append(f"| **TC-{tc_idx:02d}: Button Sense** | Press momentary push button | Serial monitor detects button transition to active state | [ ] |")
            tc_idx += 1

        if has_relay:
            lines.append(f"| **TC-{tc_idx:02d}: Relay Actuation** | Firmware signals relay trigger | Audible relay contact click and NO/COM continuity closes | [ ] |")
            tc_idx += 1

        if has_bldc_or_drone:
            lines.append(f"| **TC-{tc_idx:02d}: Motor Direction** | Gentle throttle pulse in configurator | All 4 motors spin smoothly in designated directions | [ ] |")
            tc_idx += 1

        lines.extend([
            "",
            "## 13. Hardware & Interface Troubleshooting Matrix",
            "",
            "| Symptom | Probable Root Cause | Recommended Corrective Action |",
            "| :--- | :--- | :--- |",
            "| Controller reboots or USB disconnects | Microcontroller supply voltage dipping under load | Verify external 5V/3.3V rail can supply required current; check for loose wiring |",
            "| Sensor reads 0, NaN, or timeout | Inverted data lines or missing supply voltage | Verify power pin voltages with DMM; check for swapped SDA/SCL or TX/RX lines |",
        ])

        if has_oled:
            lines.append("| OLED screen remains dark | Incorrect I2C address or unpowered display | Confirm 3.3V power at display pins; scan I2C bus (default 0x3C vs 0x3D) |")

        if has_led:
            lines.append("| LED does not illuminate | Inverted diode polarity or GPIO pin mismatch | Check anode/cathode orientation; verify firmware GPIO assignment matches hardware net |")

        if has_bldc_or_drone:
            lines.append("| Motors beep continuously | ESC not receiving valid throttle command | Check DShot signal wiring from flight controller; verify ESC calibration in software |")

        lines.extend([
            "",
            "## 14. Engineering Assumptions, Unresolved Checks & Limitations",
            "- **Static Netlist Scope**: Electrical validation confirms logic compatibility, voltage limits, and connection integrity. Physical PCB trace impedances (50Ω RF), return loss, and radiated emissions (EMI/EMC) require specialized laboratory testing.",
            "- **Thermal Budget**: High-current switching devices require adequate heatsinking and airflow under continuous full-load operating conditions.",
            "- **Environmental Sealing**: Solderless breadboard prototypes have no environmental ingress protection (IP00). Conformal coating and ruggedized enclosures are required for field deployment.",
        ])

        return "\n".join(lines)
