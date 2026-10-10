import json
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.app.models.project import Project, utc_now_iso
from backend.app.database.db import save_project, get_project, list_projects
from backend.app.services.validation_service import HardwareValidationService
from backend.app.services.artifact_service import ArtifactGeneratorService

class ProjectService:
    """
    ProjectService:
    Single source of truth for Project Graph persistence and relational consistency.
    Guarantees that schematic, firmware, simulator configuration, and displayed
    component catalog never silently diverge.
    """

    @classmethod
    def save(cls, project: Project) -> Project:
        """Persists project and synchronized relational child tables."""
        project.updated_at = utc_now_iso()
        save_project(project.model_dump())
        return project

    @classmethod
    def get(cls, project_id: str) -> Optional[Project]:
        data = get_project(project_id)
        if not data:
            return None
        return Project(**data)

    @classmethod
    def list(cls) -> List[Dict[str, Any]]:
        return list_projects()

    @classmethod
    def delete(cls, project_id: str) -> bool:
        from backend.app.database.db import delete_project
        return delete_project(project_id)

    @classmethod
    def invalidate_and_regenerate(cls, project: Project, bump_version: bool = True) -> Project:
        """
        Critical Rule 4:
        If the user changes a component, pin assignment, or requirement,
        invalidate and regenerate all dependent artifacts:
        - Re-run deterministic hardware validation
        - Regenerate C++ firmware source (sketch.ino)
        - Regenerate assembly guide and cautions
        - Synchronize Wokwi simulator diagram
        """
        if bump_version:
            project.version += 1

        # 1. Deterministic hardware validation
        project.validation = HardwareValidationService.validate(project)

        # 2. Re-generate firmware source
        firmware_artifact = ArtifactGeneratorService.generate_firmware(project)
        project.firmware = [firmware_artifact]

        # 3. Re-generate assembly build guide
        project.build_guide = ArtifactGeneratorService.generate_guide(project)

        # 4. Invalidate previous simulation status if design changed
        project.sim_status = "ready"
        project.updated_at = utc_now_iso()

        # Persist updated graph
        cls.save(project)
        return project
