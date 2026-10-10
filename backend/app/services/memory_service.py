from typing import Dict, Any, List, Optional
from backend.app.models.memory import MemoryEvent
from backend.app.database.db import insert_memory_event, get_memory_events
from backend.app.engine.memory_service import log_event, query_memory, ask_dmai_cli

class EngineeringMemoryService:
    """
    EngineeringMemoryService:
    Maintains persistent project memory inspired by DevMemory AI (DMAI).
    Tracks architectural decisions, component selections, deterministic validations,
    and verification test history in SQLite.
    """

    @classmethod
    def record_event(
        cls,
        project_id: str,
        event_type: str,
        summary: str,
        rationale: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
        related_entity_id: Optional[str] = None,
        project_version: int = 1
    ) -> int:
        return log_event(
            project_id=project_id,
            event_type=event_type,
            summary=summary,
            rationale=rationale,
            payload=payload,
            related_entity_id=related_entity_id,
            project_version=project_version
        )

    @classmethod
    def query(
        cls,
        project_id: str,
        event_type: Optional[str] = None,
        search: Optional[str] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        return query_memory(project_id=project_id, event_type=event_type, search=search, limit=limit)

    @classmethod
    def query_dmai(cls, question: str) -> str:
        return ask_dmai_cli(question)
