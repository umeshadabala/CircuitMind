from typing import Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime, timezone

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class MemoryEvent(BaseModel):
    id: Optional[int] = None
    project_id: str
    event_type: str  # e.g. "REQUIREMENT_ADDED", "COMPONENT_SELECTED", "PIN_ASSIGNED", "SIMULATION_RUN", "TEST_RESULT", "DEFECT_FOUND", "PATCH_APPLIED", "USER_DECISION"
    summary: str
    rationale: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    related_entity_id: Optional[str] = None
    project_version: int = 1
    timestamp: str = Field(default_factory=utc_now_iso)

class MemoryQuery(BaseModel):
    project_id: str
    event_type: Optional[str] = None
    search: Optional[str] = None
    limit: int = 50
