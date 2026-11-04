from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
from pydantic import BaseModel, Field
from backend.app.domain.models import Project, SimulationArtifact


class SimulationBundle(BaseModel):
    adapter_id: str
    project_id: str
    revision: int
    files: Dict[str, str] = Field(default_factory=dict)
    export_ready: bool = True
    instructions: str = ""
    tool_installed: bool = False
    required_tools: List[str] = Field(default_factory=list)


class SimulationAdapter(ABC):
    """
    Abstract interface for CircuitMind simulation adapters.
    Provides explicit capability discovery, artifact bundle generation,
    local tool detection, and honest execution status reporting.
    """

    adapter_id: str = "base"
    name: str = "Base Simulation Adapter"
    description: str = ""

    @abstractmethod
    def describe_capabilities(self) -> Dict[str, Any]:
        """Returns structured capability declaration, supported boards, parts, and local tools."""
        pass

    @abstractmethod
    def is_tool_installed(self) -> bool:
        """Inspects whether required simulation binaries (e.g. wokwi-cli, px4) are available."""
        pass

    @abstractmethod
    def can_simulate(self, project: Project) -> Tuple[bool, str]:
        """Evaluates whether this adapter can simulate the given project graph."""
        pass

    @abstractmethod
    def generate_bundle(self, project: Project) -> SimulationBundle:
        """Generates simulator configuration files (e.g. diagram.json, wokwi.toml, SITL scripts)."""
        pass

    @abstractmethod
    async def run_simulation(self, project: Project, scenario: Optional[str] = None) -> SimulationArtifact:
        """Executes simulation or provides honest export handoff status."""
        pass

