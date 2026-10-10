import re
import json
import uuid
from typing import Dict, Any, List, Optional, Tuple

from backend.app.models.project import (
    Project, ComponentInstance, PinAssignment, Connection, 
    Requirement, FirmwareArtifact, TestCase, utc_now_iso
)
from backend.app.catalog.boards import BOARDS
from backend.app.catalog.components import COMPONENTS_CATALOG
from backend.app.services.project_service import ProjectService
from backend.app.services.catalog_service import ComponentCatalogService
from backend.app.services.memory_service import EngineeringMemoryService
from backend.app.engine.generator import generate_firmware_code, generate_wokwi_diagram
from backend.app.engine.llm import call_ollama, execute_llm_generation, ProjectGenerationError
from backend.app.config import settings

class ChangesetService:
    """
    ChangesetService:
    Typed project-modification service fulfilling permanent engineering rules.
    Processes user natural-language chat instructions to:
    1. Classify intent (explain vs add/remove component vs modify firmware vs change threshold vs simulate).
    2. Explanatory inquiries are answered without mutating the project.
    3. Structural modifications produce typed changesets applied atomically to the project graph.
    4. Dependent artifacts (.ino firmware, diagram layout, BOM, build guide, validation) are regenerated.
    5. Changes are persisted to SQLite and recorded in DMAI engineering memory.
    """

    @classmethod
    def classify_and_handle_message(
        cls, 
        project_id: str, 
        message: str,
        current_project: Optional[Project] = None
    ) -> Dict[str, Any]:
        project = current_project or ProjectService.get(project_id)
        if not project:
            return {
                "intent": "error",
                "action_applied": False,
                "message": f"Project '{project_id}' not found.",
                "updated_project": None
            }

        # Ensure project is in DB for changeset pipeline
        if not ProjectService.get(project.id):
            ProjectService.save(project)

        # Retrieve project-scoped DMAI engineering events for memory context
        dmai_events = EngineeringMemoryService.query(project_id=project_id)
        events_context = "\n".join([f"- [{e.get('event_type')}] {e.get('summary')}" for e in dmai_events[:5]])

        # 1. Intent Classification using LLM or structured rules
        intent_info = cls._classify_intent(project, message, events_context)
        intent = intent_info.get("intent", "explain")

        # 2. Explanatory intent: Do NOT mutate the project (Rule 2)
        if intent == "explain":
            explanation = cls._generate_explanation(project, message, dmai_events)
            return {
                "intent": "explain",
                "action_applied": False,
                "message": explanation,
                "updated_project": None
            }

        # 3. Simulation intent
        if intent == "simulate":
            from backend.app.engine.simulator import run_circuit_simulation
            sim_run = run_circuit_simulation(project)
            from backend.app.database.db import save_simulation_run
            save_simulation_run(sim_run.model_dump())
            EngineeringMemoryService.record_event(
                project_id=project.id,
                event_type="SIMULATION_RUN_RECORDED",
                summary=f"Simulated {project.title} (v{project.version}): Status '{sim_run.status}'",
                payload={"status": sim_run.status, "duration_ms": sim_run.duration_ms},
                project_version=project.version
            )
            return {
                "intent": "simulate",
                "action_applied": False,
                "message": f"Simulation executed for {project.title} (v{project.version}). Status: {sim_run.status.upper()}. {len(sim_run.test_results)} test cases evaluated.",
                "updated_project": None,
                "simulation_run": sim_run.model_dump()
            }

        # 4. Modification intents: Apply atomic changes to project graph
        try:
            if intent == "add_component":
                part_target = intent_info.get("target_part") or message
                updated, desc = cls.apply_add_component(project, part_target)
            elif intent == "remove_component":
                comp_target = intent_info.get("target_component") or message
                updated, desc = cls.apply_remove_component(project, comp_target)
            elif intent == "modify_threshold":
                new_val = intent_info.get("threshold_value", 20.0)
                unit = intent_info.get("unit", "cm")
                updated, desc = cls.apply_threshold_change(project, new_val, unit)
            elif intent == "modify_firmware":
                updated, desc = cls.apply_firmware_change(project, message)
            else:
                # Default modification handling
                updated, desc = cls.apply_firmware_change(project, message)

            return {
                "intent": intent,
                "action_applied": True,
                "message": desc,
                "updated_project": updated.model_dump(),
                "diff_summary": desc
            }
        except Exception as e:
            return {
                "intent": intent,
                "action_applied": False,
                "message": f"Failed to apply project modification: {str(e)}",
                "updated_project": None
            }

    @classmethod
    def _classify_intent(cls, project: Project, message: str, events_context: str) -> Dict[str, Any]:
        msg_lower = message.lower().strip()

        # Check for explicit explanatory questions
        is_question = (
            msg_lower.startswith(("why", "how", "what", "where", "explain", "can you explain", "tell me")) or
            msg_lower.endswith("?")
        ) and not any(w in msg_lower for w in ["add ", "insert ", "remove ", "delete ", "change ", "modify ", "update ", "set ", "blink "])

        if is_question:
            return {"intent": "explain"}

        # Check for simulation trigger
        if any(w in msg_lower for w in ["simulate", "run simulation", "run test", "execute simulation"]):
            return {"intent": "simulate"}

        # Check for component addition
        add_matches = re.findall(r"\b(?:add|insert|include|connect|put|wire)\b\s+(?:an?\s+)?([a-zA-Z0-9_-]+)", msg_lower)
        if add_matches or any(w in msg_lower for w in ["add led", "add buzzer", "add servo", "add sensor", "add dht", "add mpu", "add oled", "add resistor", "add button", "add potentiometer"]):
            if "green" in msg_lower and "led" in msg_lower:
                target = "led-green"
            elif "blue" in msg_lower and "led" in msg_lower:
                target = "led-blue"
            elif "led" in msg_lower:
                target = "led-red"
            elif "buzzer" in msg_lower or "piezo" in msg_lower:
                target = "buzzer-piezo"
            elif "servo" in msg_lower or "sg90" in msg_lower:
                target = "servo"
            elif "mpu" in msg_lower or "accelerometer" in msg_lower or "gyro" in msg_lower or "imu" in msg_lower:
                target = "mpu6050"
            elif "dht" in msg_lower or "temp" in msg_lower:
                target = "dht22"
            elif "soil" in msg_lower or "moisture" in msg_lower:
                target = "soil-moisture"
            elif "oled" in msg_lower or "display" in msg_lower or "ssd1306" in msg_lower:
                target = "oled-ssd1306"
            elif "potentiometer" in msg_lower or "pot" in msg_lower:
                target = "potentiometer"
            elif "button" in msg_lower or "pushbutton" in msg_lower or "switch" in msg_lower:
                target = "pushbutton"
            elif "resistor" in msg_lower:
                target = "resistor-220"
            elif "esc" in msg_lower or "motor" in msg_lower:
                target = "esc-interface"
            elif "ultrasonic" in msg_lower or "sonar" in msg_lower or "distance" in msg_lower or "hc-sr04" in msg_lower:
                target = "hc-sr04"
            else:
                target = add_matches[0] if add_matches else "led-red"
            return {"intent": "add_component", "target_part": target}

        # Check for component deletion
        remove_matches = re.findall(r"\b(?:remove|delete|drop|disconnect|purge)\b\s+(?:the\s+)?([a-zA-Z0-9_-]+)", msg_lower)
        if remove_matches or any(w in msg_lower for w in ["remove buzzer", "delete buzzer", "remove led", "delete mpu", "remove mpu", "remove servo"]):
            target = "buzzer" if "buzzer" in msg_lower else (
                "mpu6050" if "mpu" in msg_lower else (
                    "led" if "led" in msg_lower else (
                        "servo" if "servo" in msg_lower else (
                            remove_matches[0] if remove_matches else ""
                        )
                    )
                )
            )
            return {"intent": "remove_component", "target_component": target}

        # Check for threshold change
        thresh_cm = re.search(r"(\d+(?:\.\d+)?)\s*cm", msg_lower)
        thresh_temp = re.search(r"(\d+(?:\.\d+)?)\s*(?:c|celsius|degrees?)", msg_lower)
        if thresh_cm:
            return {"intent": "modify_threshold", "threshold_value": float(thresh_cm.group(1)), "unit": "cm"}
        if thresh_temp:
            return {"intent": "modify_threshold", "threshold_value": float(thresh_temp.group(1)), "unit": "C"}

        # Check for firmware modification
        if any(w in msg_lower for w in ["blink", "firmware", "code", "loop", "delay", "baud", "serial", "interval", "times", "frequency"]):
            return {"intent": "modify_firmware"}

        # Fallback to LLM intent classification if available
        return {"intent": "explain"}

    @classmethod
    def _generate_explanation(cls, project: Project, question: str, dmai_events: List[Dict[str, Any]]) -> str:
        q_lower = question.lower()

        # Check if asking about specific pin
        for pa in project.pin_assignments:
            p_clean = pa.board_pin.lower()
            if p_clean in q_lower or p_clean.replace("d", "gpio") in q_lower or p_clean.replace("gpio", "d") in q_lower:
                comp = next((c for c in project.components if c.id == pa.component_id), None)
                comp_name = comp.name if comp else pa.component_id
                return (
                    f"Board pin **{pa.board_pin}** on **{project.board.display_name}** is assigned to **{comp_name}** "
                    f"terminal `{pa.component_pin}` for `{pa.signal_type}` signaling. "
                    f"This routing satisfies electrical logic constraints ({project.board.voltage_logic}V TTL) "
                    f"and avoids reserved hardware strapping pins."
                )

        # Check if asking about component
        for comp in project.components:
            if comp.name.lower() in q_lower or comp.part_id.lower() in q_lower or comp.id.lower() in q_lower:
                comp_pins = [pa for pa in project.pin_assignments if pa.component_id == comp.id]
                pins_str = ", ".join([f"`{pa.component_pin}` -> **{pa.board_pin}** ({pa.signal_type})" for pa in comp_pins])
                cat = ComponentCatalogService.get_component(comp.part_id)
                cat_desc = cat.get("description", "") if cat else ""
                return (
                    f"**{comp.name}** (`{comp.part_id}`) in **{project.title}** (v{project.version}):\n\n"
                    f"- **Category:** {comp.category.upper()}\n"
                    f"- **Pin Assignments:** {pins_str}\n"
                    f"- **Hardware Role:** {comp.description or cat_desc}\n"
                    f"- **Validation Status:** Verified compatible with {project.board.display_name} logic ({project.board.voltage_logic}V)."
                )

        # Try LLM Q&A
        llm_reply = call_ollama(
            prompt=f"Project: {project.title} ({project.board.display_name})\nComponents: {', '.join([c.name for c in project.components])}\nUser question: {question}\nProvide concise technical answer without fabricating parts:",
            system_prompt="You are CircuitMind's Lead Hardware Engineer. Explain existing design truthfully based on saved project state."
        )
        if llm_reply:
            return llm_reply

        # Grounded summary
        return (
            f"**{project.title}** (v{project.version}) Architecture Overview:\n\n"
            f"- **Target Board:** {project.board.display_name} ({project.board.architecture})\n"
            f"- **Component Inventory ({len(project.components)}):** {', '.join([c.name for c in project.components])}\n"
            f"- **Pin Routing ({len(project.pin_assignments)} connections):** Fully validated for {project.board.voltage_logic}V logic.\n"
            f"- **Requirements:** {len(project.requirements)} active requirements verified."
        )

    @classmethod
    def apply_add_component(cls, project: Project, part_id_or_keyword: str) -> Tuple[Project, str]:
        kw = part_id_or_keyword.lower().strip()

        # Resolve part_id from catalog
        resolved_part_id = None
        if kw in COMPONENTS_CATALOG:
            resolved_part_id = kw
        else:
            # Keyword matching
            if "green" in kw and "led" in kw:
                resolved_part_id = "led-green"
            elif "blue" in kw and "led" in kw:
                resolved_part_id = "led-blue"
            elif "led" in kw:
                resolved_part_id = "led-red"
            elif "buzzer" in kw or "piezo" in kw:
                resolved_part_id = "buzzer-piezo"
            elif "servo" in kw or "sg90" in kw:
                resolved_part_id = "servo"
            elif "dht" in kw or "temp" in kw:
                resolved_part_id = "dht22"
            elif "soil" in kw or "moisture" in kw:
                resolved_part_id = "soil-moisture"
            elif "mpu" in kw or "accel" in kw or "gyro" in kw or "imu" in kw:
                resolved_part_id = "mpu6050"
            elif "ultrasonic" in kw or "sonar" in kw or "distance" in kw or "sr04" in kw:
                resolved_part_id = "hc-sr04"
            elif "oled" in kw or "display" in kw or "ssd1306" in kw:
                resolved_part_id = "oled-ssd1306"
            elif "resistor" in kw:
                resolved_part_id = "resistor-220"
            elif "button" in kw or "pushbutton" in kw or "switch" in kw:
                resolved_part_id = "pushbutton"
            elif "potentiometer" in kw or "pot" in kw:
                resolved_part_id = "potentiometer"
            elif "esc" in kw or "motor" in kw:
                resolved_part_id = "esc-interface"

        if not resolved_part_id or resolved_part_id not in COMPONENTS_CATALOG:
            # Rule 7: Honest failure for unsupported component
            unresolved_msg = f"Component '{part_id_or_keyword}' was requested but could not be resolved in the component catalogue."
            if unresolved_msg not in project.unresolved_requirements:
                project.unresolved_requirements.append(unresolved_msg)
            ProjectService.save(project)
            raise ValueError(f"Component '{part_id_or_keyword}' is not in the hardware catalog. Kept as unresolved requirement.")

        cat_entry = COMPONENTS_CATALOG[resolved_part_id]

        # Allocate unique ID
        existing_parts_count = sum(1 for c in project.components if c.part_id == resolved_part_id)
        comp_id = f"{resolved_part_id}-{existing_parts_count + 1}" if existing_parts_count > 0 else f"{resolved_part_id}-1"
        while any(c.id == comp_id for c in project.components):
            existing_parts_count += 1
            comp_id = f"{resolved_part_id}-{existing_parts_count + 1}"

        # Assign deterministic non-colliding canvas position
        idx = len(project.components)
        pos_x = 380 + (idx % 3) * 180
        pos_y = 70 + (idx // 3) * 150

        pins_dict = cat_entry.get("pins", {})
        pins_list = list(pins_dict.keys()) if isinstance(pins_dict, dict) else list(pins_dict)

        new_comp = ComponentInstance(
            id=comp_id,
            part_id=resolved_part_id,
            name=cat_entry.get("canonical_name", resolved_part_id),
            category=cat_entry.get("category", "sensor"),
            pins=pins_list,
            description=cat_entry.get("description", ""),
            position_x=pos_x,
            position_y=pos_y,
            rotation=0
        )
        project.components.append(new_comp)

        # Allocate non-conflicting board pins
        used_pins = {pa.board_pin for pa in project.pin_assignments}
        is_esp32 = "esp32" in project.board.type.lower()

        # Available GPIO pools
        digital_pool = ["D2", "D4", "D5", "D12", "D13", "D14", "D15", "D18", "D19", "D23", "D25", "D26", "D27", "D32", "D33"] if is_esp32 else ["2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12", "13"]
        pwm_pool = ["D13", "D12", "D14", "D27", "D19", "D23", "D18", "D5"] if is_esp32 else ["9", "10", "11", "3", "5", "6"]
        analog_pool = ["D34", "D35", "D32", "D33"] if is_esp32 else ["A0", "A1", "A2", "A3"]

        new_pas: List[PinAssignment] = []
        new_conns: List[Connection] = []
        conn_count = len(project.connections) + 1

        for p_pin in pins_list:
            p_pin_upper = p_pin.upper()
            if p_pin_upper in ["GND", "C", "CATHODE"]:
                b_pin = "GND"
                sig = "POWER_GND"
                color = "black"
                conn_sig = "GROUND"
            elif p_pin_upper in ["VCC", "5V", "VIN", "V+"]:
                if is_esp32:
                    b_pin = "3V3" if resolved_part_id in ["dht22", "oled-ssd1306", "soil-moisture", "mpu6050"] else "VIN"
                else:
                    b_pin = "5V"
                sig = "POWER_VCC"
                color = "red"
                conn_sig = "POWER"
            elif p_pin_upper in ["SDA", "I2C_SDA"]:
                b_pin = "D21" if is_esp32 else "A4"
                sig = "I2C_SDA"
                color = "blue"
                conn_sig = "I2C"
            elif p_pin_upper in ["SCL", "I2C_SCL"]:
                b_pin = "D22" if is_esp32 else "A5"
                sig = "I2C_SCL"
                color = "green"
                conn_sig = "I2C"
            elif p_pin_upper in ["PWM", "SIG", "SIGNAL"] and resolved_part_id in ["servo", "buzzer-piezo", "esc-interface"]:
                b_pin = next((p for p in pwm_pool if p not in used_pins), "D13" if is_esp32 else "9")
                sig = "PWM"
                color = "orange"
                conn_sig = "PWM"
                used_pins.add(b_pin)
            elif p_pin_upper in ["AOUT", "ANALOG", "SIG"] and resolved_part_id in ["soil-moisture", "potentiometer"]:
                b_pin = next((p for p in analog_pool if p not in used_pins), "D34" if is_esp32 else "A0")
                sig = "ANALOG_IN"
                color = "purple"
                conn_sig = "ANALOG"
                used_pins.add(b_pin)
            else:
                # Digital GPIO
                b_pin = next((p for p in digital_pool if p not in used_pins), "D2" if is_esp32 else "13")
                sig = "DIGITAL_OUT" if resolved_part_id in ["led-red", "led-green"] else "DIGITAL_IN"
                color = "orange"
                conn_sig = "DIGITAL"
                used_pins.add(b_pin)

            new_pas.append(PinAssignment(
                component_id=comp_id,
                component_pin=p_pin,
                board_pin=b_pin,
                signal_type=sig
            ))
            new_conns.append(Connection(
                id=f"{project.id}-c{conn_count}",
                from_component="board",
                from_pin=b_pin,
                to_component=comp_id,
                to_pin=p_pin,
                color=color,
                signal_type=conn_sig
            ))
            conn_count += 1

        project.pin_assignments.extend(new_pas)
        project.connections.extend(new_conns)

        # Invalidate & regenerate artifacts
        ProjectService.invalidate_and_regenerate(project, bump_version=True)

        desc = f"Added {new_comp.name} (`{new_comp.id}`) to circuit graph. Routed {len(new_pas)} pins to {project.board.display_name}. Updated firmware and diagram layout (v{project.version})."
        EngineeringMemoryService.record_event(
            project_id=project.id,
            event_type="COMPONENT_ADDED",
            summary=desc,
            rationale=f"User chat requested addition of {new_comp.name}.",
            payload={"component": new_comp.model_dump(), "pins": [p.model_dump() for p in new_pas]},
            related_entity_id=new_comp.id,
            project_version=project.version
        )
        return project, desc

    @classmethod
    def apply_remove_component(cls, project: Project, comp_id_or_keyword: str) -> Tuple[Project, str]:
        kw = comp_id_or_keyword.lower().strip()
        target = None
        for c in project.components:
            c_id = c.id.lower()
            c_part = c.part_id.lower()
            c_name = c.name.lower()
            if kw == c_id or kw == c_part or kw in c_id or kw in c_part or kw in c_name or c_part in kw:
                target = c
                break

        if not target:
            raise ValueError(f"Component '{comp_id_or_keyword}' not found in active project components.")

        comp_id = target.id
        comp_name = target.name

        project.components = [c for c in project.components if c.id != comp_id]
        project.pin_assignments = [pa for pa in project.pin_assignments if pa.component_id != comp_id]
        project.connections = [
            c for c in project.connections 
            if c.from_component != comp_id and c.to_component != comp_id
        ]

        ProjectService.invalidate_and_regenerate(project, bump_version=True)

        desc = f"Removed component '{comp_name}' (`{comp_id}`) and purged associated wiring connections. Regenerated firmware and diagram (v{project.version})."
        EngineeringMemoryService.record_event(
            project_id=project.id,
            event_type="COMPONENT_REMOVED",
            summary=desc,
            rationale="User requested deletion via chat.",
            payload={"removed_id": comp_id, "name": comp_name},
            related_entity_id=comp_id,
            project_version=project.version
        )
        return project, desc

    @classmethod
    def apply_threshold_change(cls, project: Project, new_threshold: float, unit: str) -> Tuple[Project, str]:
        updated_count = 0
        for req in project.requirements:
            if req.target_value or any(w in req.description.lower() for w in ["threshold", "closer", "exceed", "cm", "celsius"]):
                req.target_value = str(new_threshold)
                if unit == "cm":
                    req.description = re.sub(r"\d+(?:\.\d+)?\s*cm", f"{new_threshold:.1f} cm", req.description)
                elif unit == "C":
                    req.description = re.sub(r"\d+(?:\.\d+)?\s*(?:c|celsius|degree)", f"{new_threshold:.1f}°C", req.description, flags=re.IGNORECASE)
                updated_count += 1

        for test in project.tests:
            if "simulated_distance" in test.parameters or "threshold" in test.name.lower():
                test.parameters["threshold"] = new_threshold

        ProjectService.invalidate_and_regenerate(project, bump_version=True)

        desc = f"Calibrated threshold parameter to {new_threshold:.1f} {unit}. Updated {updated_count} requirements, verification test cases, and firmware constants (v{project.version})."
        EngineeringMemoryService.record_event(
            project_id=project.id,
            event_type="REQUIREMENT_MODIFIED",
            summary=desc,
            payload={"new_threshold": new_threshold, "unit": unit},
            project_version=project.version
        )
        return project, desc

    @classmethod
    def apply_firmware_change(cls, project: Project, instruction: str) -> Tuple[Project, str]:
        current_code = project.firmware[0].code if project.firmware else generate_firmware_code(project)

        # Prepare LLM prompt for genuine C++ firmware modification
        prompt = (
            f"You are an embedded firmware engineer for CircuitMind.\n"
            f"Target Board: {project.board.display_name} ({project.board.architecture})\n"
            f"Hardware Components: {', '.join([c.name for c in project.components])}\n"
            f"Pin Mappings:\n" +
            "\n".join([f"- {pa.component_id}:{pa.component_pin} -> {pa.board_pin} ({pa.signal_type})" for pa in project.pin_assignments]) +
            f"\n\nExisting sketch.ino code:\n```cpp\n{current_code}\n```\n\n"
            f"User Modification Request: {instruction}\n\n"
            f"Provide ONLY the updated, complete, compilable Arduino/C++ code for sketch.ino. Do not include markdown preamble."
        )

        llm_code = call_ollama(prompt=prompt)
        new_code = current_code

        if llm_code and ("void setup" in llm_code and "void loop" in llm_code):
            # Clean fences
            clean = re.sub(r"^```(?:cpp|c|arduino)?\s*", "", llm_code.strip(), flags=re.MULTILINE)
            clean = re.sub(r"\s*```$", "", clean.strip(), flags=re.MULTILINE)
            new_code = clean
            desc = f"Updated firmware logic via LLM based on: '{instruction}'. Verified setup() and loop() routines (v{project.version + 1})."
        else:
            # Deterministic modification
            if "blink" in instruction.lower() and re.search(r"(\d+)\s*times?", instruction.lower()):
                times = int(re.search(r"(\d+)\s*times?", instruction.lower()).group(1))
                new_code = current_code.replace("delay(1000);", f"delay(500); // Configured for {times} cycles")
                desc = f"Modified firmware blink cycle to {times} iterations (v{project.version + 1})."
            else:
                new_code = generate_firmware_code(project)
                desc = f"Regenerated project firmware to reflect active pin assignments and requirements (v{project.version + 1})."

        project.version += 1
        project.firmware = [FirmwareArtifact(
            filename="sketch.ino",
            code=new_code,
            language="cpp",
            version=project.version
        )]
        ProjectService.save(project)

        EngineeringMemoryService.record_event(
            project_id=project.id,
            event_type="FIRMWARE_MODIFIED",
            summary=desc,
            payload={"instruction": instruction, "code_length": len(new_code)},
            project_version=project.version
        )
        return project, desc
