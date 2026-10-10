from typing import List, Dict, Any
from backend.app.models.project import Project, ValidationResult, DiagnosticIssue
from backend.app.engine.validator import validate_project_hardware

class HardwareValidationService:
    """
    HardwareValidationService:
    Performs deterministic electrical rule checks, pin conflicts, logic voltage mismatches,
    and microcontroller peripheral allocation validation.
    """

    @classmethod
    def validate(cls, project: Project) -> ValidationResult:
        """Evaluates hardware safety, electrical constraints, and pin integrity."""
        return validate_project_hardware(project)
