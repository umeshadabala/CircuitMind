import logging
from typing import Any, Dict, List, Optional, Tuple
from backend.app.ai.meta_client import MetaAIClient, MetaAIError
from backend.app.ai.nvidia_client import NVIDIAClient, NVIDIAAIError
from backend.app.ai.ollama_client import OllamaClient, OllamaInferenceError, OllamaUnavailableError
from backend.app.ai.prompts import SYSTEM_COPILOT_PROMPT
from backend.app.domain.catalog import get_catalog_item, HARDWARE_CATALOG
from backend.app.domain.models import ComponentInstance, Project
from backend.app.services.artifact_gen import ArtifactGenerator
from backend.app.services.firmware_gen import FirmwareGenerator
from backend.app.services.net_generator import NetGenerator
from backend.app.services.pin_allocator import DeterministicPinAllocator
from backend.app.services.simulator import BehavioralSimulator
from backend.app.services.validator import DRCValidator
from backend.app.storage.repository import ProjectRepository

logger = logging.getLogger("circuitmind.copilot")


class CopilotService:
    """
    Intelligent engineering copilot that inspects the active project graph,
    evaluates trade-offs, and executes verified, typed backend mutations.
    """

    def __init__(
        self,
        ollama_client: Optional[OllamaClient] = None,
        meta_client: Optional[MetaAIClient] = None,
        nvidia_client: Optional[NVIDIAClient] = None,
        repository: Optional[ProjectRepository] = None,
    ):
        self.ollama = ollama_client or OllamaClient()
        self.meta = meta_client or MetaAIClient()
        self.nvidia = nvidia_client or NVIDIAClient()
        self.repo = repository or ProjectRepository()

    async def chat(self, project: Project, user_message: str, provider: str = "local") -> Dict[str, Any]:
        """
        Interacts with the user, analyzing active project context using either
        Local AI (Ollama), Meta AI (Meta Model API), or NVIDIA NIM (Meta Muse Glimmer).

        Strict constraint: Providers are isolated. No silent fallback between providers.
        """
        context_summary = self._build_context_summary(project)
        full_prompt = f"Project Context:\n{context_summary}\n\nUser Question/Instruction:\n{user_message}"

        applied_changes: List[str] = []
        rejected_changes: List[str] = []
        provider_key = provider.lower()

        if provider_key in ("nvidia", "nvidia_nim"):
            # NVIDIA NIM branch (Meta Muse Glimmer 30B) — single explicit call, no auto-fallback
            try:
                res = await self.nvidia.generate_chat_json(prompt=full_prompt, system_prompt=SYSTEM_COPILOT_PROMPT)
                message = res.get("message", "NVIDIA NIM processed instruction.")
                actions = res.get("actions", [])
            except NVIDIAAIError as nae:
                logger.error("NVIDIA NIM generation failed: %s", nae)
                raise nae
        elif provider_key == "meta":
            # Meta Model API branch — single explicit call, no auto-fallback
            try:
                res = await self.meta.generate_chat_json(prompt=full_prompt, system_prompt=SYSTEM_COPILOT_PROMPT)
                message = res.get("message", "Meta AI processed instruction.")
                actions = res.get("actions", [])
            except MetaAIError as mae:
                logger.error("Meta AI generation failed: %s", mae)
                raise mae
        else:
            # Local AI (Ollama) branch — default local inference with deterministic fallback
            try:
                res = await self.ollama.generate_json(prompt=full_prompt, system_prompt=SYSTEM_COPILOT_PROMPT)
                message = res.get("message", "Processed instruction.")
                actions = res.get("actions", [])
            except (OllamaUnavailableError, OllamaInferenceError) as e:
                logger.info(f"Ollama inference unavailable ({e}), using deterministic copilot handler.")
                message, actions = self._rule_based_response(project, user_message)

        # Execute any identified engineering actions with strict compatibility checks
        if actions:
            for act in actions:
                success, desc = self.execute_action(project, act)
                if success:
                    applied_changes.append(desc)
                else:
                    rejected_changes.append(desc)

        return {
            "reply": message,
            "actions_executed": applied_changes,
            "rejected_actions": rejected_changes,
            "current_revision": project.revision,
            "provider": provider.lower(),
            "project": project,
        }

    def execute_action(self, project: Project, action: Dict[str, Any]) -> Tuple[bool, str]:
        """
        Executes a verified domain mutation.
        Returns (success: bool, description: str).
        """
        act_type = action.get("action_type")

        if act_type == "add_component":
            catalog_id = action.get("catalog_id")
            if not catalog_id:
                return False, "Failed: No catalog_id specified for component addition."

            item = get_catalog_item(catalog_id)
            if not item:
                return False, f"Rejected: Part '{catalog_id}' is not in the curated hardware catalog."

            # Generate unique instance ID
            prefix = "U" if item.category == "microcontroller" else "D" if item.category == "actuator" else "S" if item.category == "sensor" else "R" if item.category == "passive" else "C"
            existing_ids = [c.instance_id for c in project.components]
            counter = 1
            while f"{prefix}{counter}" in existing_ids:
                counter += 1
            new_id = f"{prefix}{counter}"

            new_instance = ComponentInstance(
                instance_id=new_id,
                catalog_id=item.catalog_id,
                name=item.name,
                role=item.category,
                position={"x": 550.0, "y": 250.0},
                properties=item.default_properties,
            )
            project.components.append(new_instance)

            # Check if companion passive is needed (e.g. resistor for LED)
            if any(p.requires_current_limiting for p in item.pins):
                res_item = get_catalog_item("RES-330R")
                if res_item:
                    r_id = f"R{len([c for c in project.components if c.instance_id.startswith('R')]) + 1}"
                    project.components.append(
                        ComponentInstance(
                            instance_id=r_id,
                            catalog_id="RES-330R",
                            name="330Ω Series Resistor",
                            role="passive",
                            position={"x": 930.0, "y": 250.0},
                            properties=res_item.default_properties,
                        )
                    )

            # Increment revision and refresh graph
            project.revision += 1
            self._refresh_project_graph(project)
            self.repo.save_project(project, increment_revision=False)
            return True, f"Added {item.name} ({new_id}) to design. Revision updated to Rev {project.revision}."

        elif act_type == "remove_component":
            inst_id = action.get("instance_id")
            if not inst_id:
                return False, "Failed: instance_id required to remove component."

            original_count = len(project.components)
            project.components = [c for c in project.components if c.instance_id != inst_id]
            if len(project.components) == original_count:
                return False, f"Failed: Instance '{inst_id}' not found in project."

            project.revision += 1
            self._refresh_project_graph(project)
            self.repo.save_project(project, increment_revision=False)
            return True, f"Removed instance {inst_id}. Revision updated to Rev {project.revision}."

        elif act_type == "repair_drc":
            repair_notes = DRCValidator.auto_repair_project(project)
            self._refresh_project_graph(project)
            self.repo.save_project(project, increment_revision=False)
            return True, f"DRC auto-repair executed: {'; '.join(repair_notes)}"

        elif act_type == "run_validation":
            project.validation_report = DRCValidator.validate_project(project)
            self.repo.save_project(project, increment_revision=False)
            return True, f"DRC validation executed: {len(project.validation_report.findings)} findings found."

        elif act_type == "run_simulation":
            sim_result = BehavioralSimulator.simulate_project(project)
            project.simulation_history.insert(0, sim_result)
            self.repo.save_project(project, increment_revision=False)
            return True, f"Behavioral simulation completed: {'PASSED' if sim_result.passed else 'FAILED'}."

        return False, f"Unknown action type: '{act_type}'."

    def _refresh_project_graph(self, project: Project) -> None:
        """Recomputes deterministic pin allocations, nets, DRC, firmware, and assembly guide."""
        try:
            pin_map = DeterministicPinAllocator.allocate_pins(project.components, strict=False)
            project.nets = NetGenerator.generate_nets(project.components, pin_map)
        except Exception as e:
            logger.warning(f"Pin allocation error during graph refresh: {e}")

        project.validation_report = DRCValidator.validate_project(project)
        project.firmware = FirmwareGenerator.generate_firmware(project)
        project.assembly_guide = ArtifactGenerator.generate_assembly_guide(project)

    @staticmethod
    def _build_context_summary(project: Project) -> str:
        comp_summary = ", ".join([f"{c.instance_id} ({c.catalog_id})" for c in project.components])
        net_summary = f"{len(project.nets)} nets defined"
        findings_count = len(project.validation_report.findings) if project.validation_report else 0
        valid_status = "CLEAN" if (project.validation_report and project.validation_report.valid) else f"{findings_count} DRC issues"

        return (
            f"Project: '{project.name}' (Rev {project.revision}, Board: {project.target_board})\n"
            f"Components: {comp_summary or 'None'}\n"
            f"Wiring: {net_summary}\n"
            f"Validation Status: {valid_status}\n"
            f"Firmware: {'Generated' if project.firmware else 'None'}"
        )

    @classmethod
    def _rule_based_response(cls, project: Project, user_message: str) -> Tuple[str, List[Dict[str, Any]]]:
        msg_lower = user_message.lower()
        actions: List[Dict[str, Any]] = []

        if "add" in msg_lower and "led" in msg_lower:
            actions.append({"action_type": "add_component", "catalog_id": "LED-RED"})
            return "Adding a Red indicator LED with a current-limiting resistor to the design.", actions
        elif "add" in msg_lower and "buzzer" in msg_lower:
            actions.append({"action_type": "add_component", "catalog_id": "BUZZER-PIEZO"})
            return "Adding an active Piezo Buzzer to the project graph.", actions
        elif "repair" in msg_lower or "fix" in msg_lower or "auto-repair" in msg_lower:
            actions.append({"action_type": "repair_drc"})
            return "Executing bounded DRC repair on active project graph.", actions
        elif "validate" in msg_lower or "drc" in msg_lower or "check" in msg_lower:
            actions.append({"action_type": "run_validation"})
            return "Running Design Rule Check (DRC) on current circuit graph.", actions
        elif "simulate" in msg_lower or "test" in msg_lower:
            actions.append({"action_type": "run_simulation"})
            return "Running behavioral state machine simulation trace.", actions
        elif "explain" in msg_lower or "how" in msg_lower or "what" in msg_lower:
            findings_desc = ""
            if project.validation_report and project.validation_report.findings:
                findings_desc = " Currently active DRC findings:\n" + "\n".join(
                    [f"- [{f.severity}] {f.title}: {f.message}" for f in project.validation_report.findings[:3]]
                )
            return (
                f"Project '{project.name}' is at Revision {project.revision} with {len(project.components)} components and {len(project.nets)} nets. "
                f"Firmware is generated for {project.target_board}.{findings_desc}",
                actions,
            )
        else:
            return (
                f"CircuitMind Copilot received your instruction: '{user_message}'. "
                f"You can ask me to add/remove components, run DRC validation, repair violations, or simulate behavior.",
                actions,
            )
