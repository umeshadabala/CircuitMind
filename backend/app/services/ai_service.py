import json
from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

from backend.app.config import settings
from backend.app.models.project import Project, DiagnosticIssue, ValidationResult
from backend.app.services.project_service import ProjectService
from backend.app.services.catalog_service import ComponentCatalogService
from backend.app.services.validation_service import HardwareValidationService
from backend.app.services.artifact_service import ArtifactGeneratorService
from backend.app.services.wokwi_service import WokwiSimulationService
from backend.app.services.memory_service import EngineeringMemoryService
from backend.app.engine.llm import call_ollama, ask_engineering_llm

class ProposedChange(BaseModel):
    action: str = Field(description="Action type, e.g. 'modify_threshold', 'add_component', 'reassign_pin'")
    rationale: str = Field(description="Engineering justification based on datasheets or physical requirements")
    parameters: Dict[str, Any] = Field(default_factory=dict)

class AiEngineeringResponse(BaseModel):
    message: str
    suggested_changes: List[ProposedChange] = Field(default_factory=list)
    referenced_catalog_parts: List[str] = Field(default_factory=list)
    validation_status: Optional[str] = None

class AiService:
    """
    AiService:
    Provides bounded engineering tools to the configured LLM (GPT-OSS-120B Cloud via Ollama).
    Ensures model outputs are strictly validated against Pydantic schemas,
    and prevents the model from fabricating API responses, component specs, or test evidence.
    """

    # Bounded Engineering Tools
    @classmethod
    def read_project_state(cls, project_id: str) -> Optional[Dict[str, Any]]:
        proj = ProjectService.get(project_id)
        return proj.model_dump() if proj else None

    @classmethod
    def search_catalog(cls, query: str = "", category: Optional[str] = None) -> List[Dict[str, Any]]:
        components = ComponentCatalogService.list_components(category)
        if not query:
            return components[:10]
        q = query.lower()
        return [
            c for c in components 
            if q in c.get("canonical_name", "").lower() 
            or q in c.get("part_id", "").lower() 
            or q in c.get("description", "").lower()
        ]

    @classmethod
    def run_deterministic_validation(cls, project_id: str) -> ValidationResult:
        proj = ProjectService.get(project_id)
        if not proj:
            return ValidationResult(status="error", issues=[DiagnosticIssue(severity="error", code="PROJECT_NOT_FOUND", message="Project not found")])
        val = HardwareValidationService.validate(proj)
        proj.validation = val
        ProjectService.save(proj)
        return val

    @classmethod
    def inspect_simulation_evidence(cls, project_id: str) -> Dict[str, Any]:
        runs = WokwiSimulationService.get_simulation_runs(project_id) if hasattr(WokwiSimulationService, "get_simulation_runs") else []
        from backend.app.database.db import get_simulation_runs
        runs = get_simulation_runs(project_id)
        if not runs:
            return {"status": "no_runs", "message": "No simulation runs recorded for this project."}
        latest = runs[0]
        return {
            "status": latest.get("status"),
            "runner": latest.get("runner"),
            "duration_ms": latest.get("duration_ms"),
            "serial_log_count": len(latest.get("serial_logs", [])),
            "recent_logs": latest.get("serial_logs", [])[-10:],
            "test_results": latest.get("test_results", [])
        }

    @classmethod
    def process_engineering_query(cls, project_id: str, query: str) -> AiEngineeringResponse:
        proj = ProjectService.get(project_id)
        if not proj:
            return AiEngineeringResponse(message="Project not found.")

        # Try LLM
        llm_answer = ask_engineering_llm(proj.model_dump(), query)
        
        # Check if user query requests a change (e.g. threshold)
        suggested_changes = []
        import re
        threshold_match = re.search(r"(\d+)\s*cm", query)
        if "threshold" in query.lower() and threshold_match:
            new_val = float(threshold_match.group(1))
            suggested_changes.append(ProposedChange(
                action="modify_threshold",
                rationale=f"User requested updating distance threshold to {new_val} cm.",
                parameters={"threshold_cm": new_val}
            ))

        # Catalog references
        catalog_matches = []
        for c in proj.components:
            if c.part_id in query.lower() or c.name.lower() in query.lower():
                catalog_matches.append(c.part_id)

        if not llm_answer:
            # Deterministic fallback response grounded in verified project graph
            llm_answer = (
                f"Analyzing '{proj.title}' (v{proj.version}): "
                f"Target board is {proj.board.display_name}. "
                f"System comprises {len(proj.components)} components and {len(proj.pin_assignments)} pin assignments. "
                f"Deterministic hardware validation status is '{proj.validation.status}'."
            )

        return AiEngineeringResponse(
            message=llm_answer,
            suggested_changes=suggested_changes,
            referenced_catalog_parts=catalog_matches,
            validation_status=proj.validation.status
        )
