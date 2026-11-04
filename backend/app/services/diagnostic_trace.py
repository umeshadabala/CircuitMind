from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PipelineDiagnosticTrace(BaseModel):
    """
    Sanitized, structured diagnostic trace capturing the end-to-end execution of a request.
    Records model interaction, catalog matching, board decisions, and graph persistence.
    """
    request_id: str
    project_id: str
    timestamp: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    model_identifier: str
    provider_type: str = "ollama"
    reached_ollama: bool = False
    endpoint_url: str = ""
    prompt_summary: str = ""

    # Requirements Stage
    validated_requirements: Optional[Dict[str, Any]] = None
    requirements_source: str = "ollama"  # "ollama" or "heuristic_fallback"

    # Board Selection Stage
    board_selection: Optional[Dict[str, Any]] = None

    # Architecture Planning Stage
    architecture_proposal: Optional[Dict[str, Any]] = None
    architecture_source: str = "ollama"  # "ollama" or "heuristic_fallback"

    # Catalog Matching & Resolution
    catalog_matches: List[str] = Field(default_factory=list)
    rejected_candidates: List[str] = Field(default_factory=list)

    # Component & Net Resolution
    proposed_components: List[str] = Field(default_factory=list)
    persisted_components: List[str] = Field(default_factory=list)
    persisted_nets: List[str] = Field(default_factory=list)

    # Validation
    validation_status: str = "PENDING"
    validation_findings: List[Dict[str, Any]] = Field(default_factory=list)
    project_revision: int = 1

    # Diagnostics
    fallbacks_triggered: List[str] = Field(default_factory=list)
    exceptions: List[str] = Field(default_factory=list)

