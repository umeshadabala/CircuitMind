import subprocess
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from backend.app.models.memory import MemoryEvent
from backend.app.database.db import insert_memory_event, get_memory_events

def log_event(
    project_id: str,
    event_type: str,
    summary: str,
    rationale: Optional[str] = None,
    payload: Optional[Dict[str, Any]] = None,
    related_entity_id: Optional[str] = None,
    project_version: int = 1
) -> int:
    event = MemoryEvent(
        project_id=project_id,
        event_type=event_type,
        summary=summary,
        rationale=rationale,
        payload=payload or {},
        related_entity_id=related_entity_id,
        project_version=project_version,
        timestamp=datetime.now(timezone.utc).isoformat()
    )
    return insert_memory_event(event)

def query_memory(project_id: str, event_type: Optional[str] = None, search: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    return get_memory_events(project_id=project_id, event_type=event_type, search=search, limit=limit)

def ask_dmai_cli(question: str) -> str:
    """
    Queries the DevMemoryAI CLI tool directly if available in the repository.
    """
    try:
        res = subprocess.run(
            ["dmai", "ask", question],
            capture_output=True,
            text=True,
            timeout=10
        )
        if res.returncode == 0 and res.stdout.strip():
            return res.stdout.strip()
        return "DevMemoryAI CLI returned no active context for this query."
    except Exception as e:
        return f"DevMemoryAI CLI integration: {str(e)}"
