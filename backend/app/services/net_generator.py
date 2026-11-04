from typing import Dict, List, Optional, Set
from backend.app.domain.catalog import HARDWARE_CATALOG, get_catalog_item
from backend.app.domain.models import ComponentInstance, Net, NetType, PinDirection, PinReference, PinRole


class NetGenerator:
    """
    Generates explicit electrical nets from component instances, pin definitions,
    and allocated microcontroller pins.
    Fully generic: wires power, ground, signal, bus, series current-limiting passives,
    and voltage dividers purely based on electrical characteristics and pin requirements.
    """

    @classmethod
    def generate_nets(cls, components: List[ComponentInstance], pin_map: Dict[str, str]) -> List[Net]:
        nets: List[Net] = []

        mcu_inst = next(
            (c for c in components if c.role in ["microcontroller", "controller", "flight_controller"] or "FC" in c.catalog_id or "ESP32" in c.catalog_id or "ARDUINO" in c.catalog_id or "PICO" in c.catalog_id),
            None,
        )
        if not mcu_inst:
            return nets

        mcu_catalog = get_catalog_item(mcu_inst.catalog_id)
        pwr_3v3_pin = next((p.pin_id for p in (mcu_catalog.pins if mcu_catalog else []) if p.pin_id in ["3V3", "3.3V"] or (p.role == PinRole.POWER and p.voltage_max <= 3.6)), None)
        pwr_5v_pin = next((p.pin_id for p in (mcu_catalog.pins if mcu_catalog else []) if p.pin_id in ["5V", "VIN", "VBUS", "VSYS"] or (p.role == PinRole.POWER and p.voltage_min >= 4.5)), None)
        gnd_pin = next((p.pin_id for p in (mcu_catalog.pins if mcu_catalog else []) if p.role == PinRole.GROUND or "GND" in p.pin_id), "GND")

        # Global Power and Ground nets
        net_3v3_pins = [PinReference(instance_id=mcu_inst.instance_id, pin_id=pwr_3v3_pin)] if pwr_3v3_pin else []
        net_3v3 = Net(
            net_id="NET_3V3",
            name="3.3V Power Rail",
            net_type=NetType.POWER,
            voltage=3.3,
            rationale="Regulated 3.3V supply rail from microcontroller on-board regulator.",
            pins=net_3v3_pins,
        )

        net_5v_pins = [PinReference(instance_id=mcu_inst.instance_id, pin_id=pwr_5v_pin)] if pwr_5v_pin else []
        net_5v = Net(
            net_id="NET_5V",
            name="5V Power Rail",
            net_type=NetType.POWER,
            voltage=5.0,
            rationale="5V main power bus from external supply or USB for 5V peripherals.",
            pins=net_5v_pins,
        )

        net_gnd = Net(
            net_id="NET_GND",
            name="Common Ground",
            net_type=NetType.GROUND,
            voltage=0.0,
            rationale="Common system ground reference across all modules.",
            pins=[PinReference(instance_id=mcu_inst.instance_id, pin_id=gnd_pin)],
        )

        # Multirotor power distribution (VBAT)
        pdb_inst = next((c for c in components if "PDB" in c.catalog_id), None)
        esc_inst = next((c for c in components if "ESC" in c.catalog_id), None)
        motor_inst = next((c for c in components if "MOTOR" in c.catalog_id or "BLDC" in c.catalog_id), None)

        net_vbat: Optional[Net] = None
        if pdb_inst or (mcu_catalog and any(p.pin_id == "VBAT" for p in mcu_catalog.pins)):
            vbat_pins = []
            if pdb_inst:
                vbat_pins.append(PinReference(instance_id=pdb_inst.instance_id, pin_id="BAT_POS"))
                net_5v.pins.append(PinReference(instance_id=pdb_inst.instance_id, pin_id="5V_OUT"))
                net_gnd.pins.append(PinReference(instance_id=pdb_inst.instance_id, pin_id="GND"))
                net_gnd.pins.append(PinReference(instance_id=pdb_inst.instance_id, pin_id="BAT_NEG"))
            if esc_inst:
                vbat_pins.append(PinReference(instance_id=esc_inst.instance_id, pin_id="VBAT"))
                net_gnd.pins.append(PinReference(instance_id=esc_inst.instance_id, pin_id="GND"))
            if mcu_catalog and any(p.pin_id == "VBAT" for p in mcu_catalog.pins):
                vbat_pins.append(PinReference(instance_id=mcu_inst.instance_id, pin_id="VBAT"))

            if vbat_pins:
                net_vbat = Net(
                    net_id="NET_VBAT",
                    name="LiPo Battery Main Bus",
                    net_type=NetType.POWER,
                    voltage=14.8,
                    rationale="High-current LiPo power distribution rail.",
                    pins=vbat_pins,
                )

        # Track available passives and level shifters
        resistors = [c for c in components if "RES" in c.catalog_id]
        used_resistors: Set[str] = set()
        dividers = [c for c in components if "DIVIDER" in c.catalog_id or "LEVEL" in c.catalog_id]
        used_dividers: Set[str] = set()

        # Step 1: Distribute Power and Ground to all peripheral components
        for comp in components:
            if comp.instance_id == mcu_inst.instance_id:
                continue
            part = get_catalog_item(comp.catalog_id)
            if not part:
                continue

            for pin in part.pins:
                # Ground pins
                if pin.role == PinRole.GROUND or "GND" in pin.pin_id.upper() or pin.pin_id in ["CATHODE", "NEG", "PIN2"]:
                    # For buttons, PIN2 goes to GND
                    # For LEDs, CATHODE goes to GND
                    # For buzzer, NEG goes to GND
                    if pin.pin_id not in ["PIN1", "ANODE", "POS"]:
                        net_gnd.pins.append(PinReference(instance_id=comp.instance_id, pin_id=pin.pin_id))

                # Power supply pins (VCC, VDD)
                elif pin.role == PinRole.POWER or pin.direction == PinDirection.POWER or pin.pin_id in ["VCC", "VDD"]:
                    if part.supply_voltage_min >= 4.5:
                        net_5v.pins.append(PinReference(instance_id=comp.instance_id, pin_id=pin.pin_id))
                    else:
                        net_3v3.pins.append(PinReference(instance_id=comp.instance_id, pin_id=pin.pin_id))

        # Step 2: Route Signal Connections based on pin allocations
        for pin_key, mcu_pin_id in sorted(pin_map.items()):
            comp_id, pin_id = pin_key.split(".")
            comp = next((c for c in components if c.instance_id == comp_id), None)
            if not comp:
                continue
            part = get_catalog_item(comp.catalog_id)
            if not part:
                continue
            pin_def = next((p for p in part.pins if p.pin_id == pin_id), None)
            if not pin_def:
                continue

            # Case A: Pin requires series current limiting (e.g. LED Anode)
            if pin_def.requires_current_limiting:
                avail_res = next(
                    (r for r in resistors if r.instance_id not in used_resistors and ("220" in r.catalog_id or "330" in r.catalog_id)),
                    None,
                )
                if avail_res:
                    used_resistors.add(avail_res.instance_id)
                    # Net 1: MCU GPIO -> Resistor PIN1
                    nets.append(
                        Net(
                            net_id=f"NET_{avail_res.instance_id}_DRIVE",
                            name=f"{comp.name} Drive Control",
                            net_type=NetType.SIGNAL,
                            rationale=f"Microcontroller {mcu_pin_id} logic drive to series current-limiting resistor.",
                            pins=[
                                PinReference(instance_id=mcu_inst.instance_id, pin_id=mcu_pin_id),
                                PinReference(instance_id=avail_res.instance_id, pin_id="PIN1"),
                            ],
                        )
                    )
                    # Net 2: Resistor PIN2 -> Peripheral Anode
                    nets.append(
                        Net(
                            net_id=f"NET_{comp.instance_id}_{pin_id}",
                            name=f"{comp.name} Current-Limited Node",
                            net_type=NetType.SIGNAL,
                            rationale="Current-limited signal line to component.",
                            pins=[
                                PinReference(instance_id=avail_res.instance_id, pin_id="PIN2"),
                                PinReference(instance_id=comp.instance_id, pin_id=pin_id),
                            ],
                        )
                    )
                else:
                    # Direct connection (DRC will flag missing resistor)
                    nets.append(
                        Net(
                            net_id=f"NET_{comp.instance_id}_{pin_id}_DIRECT",
                            name=f"{comp.name} Direct Drive",
                            net_type=NetType.SIGNAL,
                            rationale="Direct drive connection without series resistor.",
                            pins=[
                                PinReference(instance_id=mcu_inst.instance_id, pin_id=mcu_pin_id),
                                PinReference(instance_id=comp.instance_id, pin_id=pin_id),
                            ],
                        )
                    )

            # Case B: Peripheral 5V Output driving 3.3V MCU input (requires level shifter / voltage divider)
            elif pin_def.direction == PinDirection.OUTPUT and pin_def.voltage_max > 3.6:
                avail_div = next((d for d in dividers if d.instance_id not in used_dividers), None)
                if avail_div:
                    used_dividers.add(avail_div.instance_id)
                    # Net 1: Sensor 5V output -> Divider VIN
                    nets.append(
                        Net(
                            net_id=f"NET_{comp.instance_id}_{pin_id}_5V",
                            name=f"{comp.name} {pin_id} 5V Signal",
                            net_type=NetType.SIGNAL,
                            voltage=5.0,
                            rationale="Raw 5V signal connected to voltage divider input.",
                            pins=[
                                PinReference(instance_id=comp.instance_id, pin_id=pin_id),
                                PinReference(instance_id=avail_div.instance_id, pin_id="VIN"),
                            ],
                        )
                    )
                    # Net 2: Divider VOUT (3.3V) -> MCU input
                    nets.append(
                        Net(
                            net_id=f"NET_{comp.instance_id}_{pin_id}_3V3",
                            name=f"{comp.name} {pin_id} 3.3V Scaled",
                            net_type=NetType.SIGNAL,
                            voltage=3.3,
                            rationale="Level-shifted 3.3V signal safely routed to microcontroller GPIO.",
                            pins=[
                                PinReference(instance_id=avail_div.instance_id, pin_id="VOUT"),
                                PinReference(instance_id=mcu_inst.instance_id, pin_id=mcu_pin_id),
                            ],
                        )
                    )
                    net_gnd.pins.append(PinReference(instance_id=avail_div.instance_id, pin_id="GND"))
                else:
                    # Direct connection without level shifter (DRC will flag overstress)
                    nets.append(
                        Net(
                            net_id=f"NET_{comp.instance_id}_{pin_id}_DIRECT",
                            name=f"{comp.name} {pin_id} Direct",
                            net_type=NetType.SIGNAL,
                            voltage=5.0,
                            rationale="Direct 5V output to MCU input without level translation.",
                            pins=[
                                PinReference(instance_id=comp.instance_id, pin_id=pin_id),
                                PinReference(instance_id=mcu_inst.instance_id, pin_id=mcu_pin_id),
                            ],
                        )
                    )

            # Case C: Bus lines (I2C)
            elif pin_def.role in [PinRole.I2C_SDA, PinRole.I2C_SCL]:
                net_type = NetType.I2C
                bus_name = "I2C SDA" if pin_def.role == PinRole.I2C_SDA else "I2C SCL"
                nets.append(
                    Net(
                        net_id=f"NET_{comp.instance_id}_{pin_id}",
                        name=f"{comp.name} {bus_name}",
                        net_type=net_type,
                        rationale=f"Standard {bus_name} communication line.",
                        pins=[
                            PinReference(instance_id=mcu_inst.instance_id, pin_id=mcu_pin_id),
                            PinReference(instance_id=comp.instance_id, pin_id=pin_id),
                        ],
                    )
                )

            # Case D: General digital, analog, or switch signal
            else:
                net_type = NetType.ANALOG if pin_def.role == PinRole.ANALOG else NetType.SIGNAL
                nets.append(
                    Net(
                        net_id=f"NET_{comp.instance_id}_{pin_id}",
                        name=f"{comp.name} {pin_id} Signal",
                        net_type=net_type,
                        rationale=f"Connection between {mcu_inst.name} {mcu_pin_id} and {comp.name} {pin_id}.",
                        pins=[
                            PinReference(instance_id=mcu_inst.instance_id, pin_id=mcu_pin_id),
                            PinReference(instance_id=comp.instance_id, pin_id=pin_id),
                        ],
                    )
                )

        # Multirotor motor phase connections
        if motor_inst and esc_inst:
            for phase in ["A", "B", "C"]:
                nets.append(
                    Net(
                        net_id=f"NET_MOTOR_PHASE_{phase}",
                        name=f"Motor Phase {phase}",
                        net_type=NetType.SIGNAL,
                        rationale=f"3-phase brushless motor drive line {phase} from 4-in-1 ESC.",
                        pins=[
                            PinReference(instance_id=esc_inst.instance_id, pin_id="GND" if phase == "C" else "VBAT"),
                            PinReference(instance_id=motor_inst.instance_id, pin_id=phase),
                        ],
                    )
                )

        # Assemble all power rails and signal nets
        power_rails = [net_gnd]
        if pwr_3v3_pin:
            power_rails.append(net_3v3)
        elif len(net_3v3.pins) > 1:
            power_rails.append(net_3v3)

        if pwr_5v_pin and not pwr_3v3_pin:
            power_rails.append(net_5v)
        elif len(net_5v.pins) > 1:
            power_rails.append(net_5v)

        if net_vbat and len(net_vbat.pins) > 1:
            power_rails.append(net_vbat)

        return power_rails + nets
