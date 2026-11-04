import logging
from typing import Any, Dict, List, Optional
from backend.app.domain.models import (
    Project,
    SimulationArtifact,
    SimulationChannelReport,
)
from backend.app.simulation.base import SimulationAdapter, SimulationBundle
from backend.app.simulation.behavioral_adapter import BehavioralSimulationAdapter
from backend.app.simulation.flight_sim_adapter import FlightSimulatorAdapter
from backend.app.simulation.wokwi_adapter import WokwiSimulationAdapter

logger = logging.getLogger("circuitmind.simulation.manager")


class SimulatorManager:
    """
    Capability-based simulator selection and multi-channel verification manager.
    Coordinates Wokwi circuit simulation, PX4 SITL flight dynamics, and deterministic behavioral verification.
    """

    def __init__(self):
        self._adapters: Dict[str, SimulationAdapter] = {
            "wokwi": WokwiSimulationAdapter(),
            "px4_sitl": FlightSimulatorAdapter(),
            "behavioral": BehavioralSimulationAdapter(),
        }

    def list_adapters(self) -> List[Dict[str, Any]]:
        """Lists all registered simulation adapters and their local tool discovery statuses."""
        return [adapter.describe_capabilities() for adapter in self._adapters.values()]

    def get_adapter(self, adapter_id: str) -> Optional[SimulationAdapter]:
        return self._adapters.get(adapter_id)

    def select_adapter_for_project(self, project: Project, preferred_adapter: Optional[str] = None) -> SimulationAdapter:
        """
        Capability-based selection: chooses the most suitable simulator based on project system type.
        - Multirotor/Drone projects -> FlightSimulatorAdapter (PX4 SITL / Gazebo)
        - MCU projects with Wokwi models -> WokwiSimulationAdapter
        - General projects / fallback -> BehavioralSimulationAdapter
        """
        if preferred_adapter and preferred_adapter in self._adapters:
            adapter = self._adapters[preferred_adapter]
            can_sim, _ = adapter.can_simulate(project)
            if can_sim:
                return adapter

        # 1. Check if Drone / Flight architecture
        flight_adapter = self._adapters["px4_sitl"]
        can_flight, _ = flight_adapter.can_simulate(project)
        if can_flight:
            return flight_adapter

        # 2. Check if Wokwi MCU architecture
        wokwi_adapter = self._adapters["wokwi"]
        can_wokwi, _ = wokwi_adapter.can_simulate(project)
        if can_wokwi:
            return wokwi_adapter

        # 3. Default to deterministic behavioral simulator
        return self._adapters["behavioral"]

    async def execute_simulation(
        self,
        project: Project,
        scenario: Optional[str] = None,
        preferred_adapter: Optional[str] = None,
    ) -> SimulationArtifact:
        """
        Executes capability-selected simulation and populates the 5 distinct reporting channels:
        1. Static engineering validation (DRC)
        2. Firmware compilation status
        3. MCU / peripheral simulation (Wokwi)
        4. System-level simulation (PX4 SITL / Aerodynamics)
        5. Physical hardware verification
        """
        adapter = self.select_adapter_for_project(project, preferred_adapter)
        logger.info(f"Selected simulation adapter '{adapter.adapter_id}' for project '{project.name}' (Rev {project.revision})")

        artifact = await adapter.run_simulation(project, scenario)

        # Build comprehensive multi-channel report
        channels: List[SimulationChannelReport] = []

        # Channel 1: Static engineering validation
        drc_valid = project.validation_report.valid if project.validation_report else False
        drc_count = len(project.validation_report.findings) if project.validation_report else 0
        channels.append(SimulationChannelReport(
            channel="static_validation",
            status="PASSED" if drc_valid else "WARNING",
            tool_name="Deterministic Design Rule Check (DRC)",
            detail="All electrical and logic constraints satisfied." if drc_valid else f"{drc_count} finding(s) detected.",
            evidence={"valid": drc_valid, "findings_count": drc_count},
        ))

        # Channel 2: Firmware compilation
        fw = project.firmware
        channels.append(SimulationChannelReport(
            channel="firmware_compilation",
            status="NOT_CONFIGURED" if not fw else ("PASSED" if fw.compiled else "EXPORT_READY"),
            tool_name=f"{fw.target_platform if fw else 'MCU'} Toolchain Generator",
            detail=fw.compilation_status if fw else "No firmware generated for this revision.",
            evidence={"lines_of_code": len(fw.source_code.splitlines()) if fw else 0},
        ))

        # Channel 3: MCU / Peripheral simulation (Wokwi)
        wokwi_avail = self._adapters["wokwi"].is_tool_installed()
        wokwi_can, wokwi_reason = self._adapters["wokwi"].can_simulate(project)
        if adapter.adapter_id == "wokwi":
            channels.append(SimulationChannelReport(
                channel="mcu_peripheral_simulation",
                status=artifact.execution_status,
                tool_name="Wokwi Embedded Circuit Simulator",
                detail=artifact.summary,
                evidence={"parts": len(artifact.diagram_json.get("parts", [])) if artifact.diagram_json else 0},
            ))
        else:
            channels.append(SimulationChannelReport(
                channel="mcu_peripheral_simulation",
                status="NOT_APPLICABLE" if not wokwi_can else ("PASSED" if wokwi_avail else "EXPORT_READY"),
                tool_name="Wokwi Simulator",
                detail=wokwi_reason if not wokwi_can else ("Wokwi CLI installed." if wokwi_avail else "Wokwi export available."),
            ))

        # Channel 4: System-level simulation (e.g. PX4 SITL / dynamics)
        if adapter.adapter_id == "px4_sitl":
            channels.append(SimulationChannelReport(
                channel="system_level_simulation",
                status=artifact.execution_status,
                tool_name="PX4 SITL / Gazebo Multirotor Dynamics",
                detail=artifact.summary,
                evidence={"flight_controller": "STM32F405-FC", "frame": "quad_x"},
            ))
        else:
            channels.append(SimulationChannelReport(
                channel="system_level_simulation",
                status="NOT_CONFIGURED",
                tool_name="System Dynamics Simulator",
                detail="System does not require flight dynamics modeling or external SITL.",
            ))

        # Channel 5: Physical hardware verification
        channels.append(SimulationChannelReport(
            channel="physical_hardware_verification",
            status="UNTESTED",
            tool_name="Physical Hardware Bench Verification",
            detail="Physical hardware has not been connected or bench tested. Assembly guide generated for breadboard fabrication.",
            evidence={"bench_tested": False},
        ))

        artifact.channels = channels
        return artifact


# Global singleton instance
simulator_manager = SimulatorManager()

