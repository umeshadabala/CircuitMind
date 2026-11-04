from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field


class PinRole(str, Enum):
    POWER = "POWER"
    GROUND = "GROUND"
    ANALOG = "ANALOG"
    DIGITAL_IO = "DIGITAL_IO"
    DIGITAL_IN = "DIGITAL_IN"
    DIGITAL_OUT = "DIGITAL_OUT"
    I2C_SDA = "I2C_SDA"
    I2C_SCL = "I2C_SCL"
    SPI_MOSI = "SPI_MOSI"
    SPI_MISO = "SPI_MISO"
    SPI_SCK = "SPI_SCK"
    SPI_CS = "SPI_CS"
    UART_TX = "UART_TX"
    UART_RX = "UART_RX"
    PWM = "PWM"
    PASSIVE = "PASSIVE"


class PinDirection(str, Enum):
    INPUT = "INPUT"
    OUTPUT = "OUTPUT"
    BIDIRECTIONAL = "BIDIRECTIONAL"
    PASSIVE = "PASSIVE"
    POWER = "POWER"


class Pin(BaseModel):
    pin_id: str
    name: str
    number: Optional[int] = None
    role: PinRole
    direction: PinDirection
    voltage_min: float = 0.0
    voltage_max: float = 3.3
    current_max_ma: Optional[float] = None
    capabilities: List[str] = Field(default_factory=list)
    is_strapping: bool = False
    requires_pullup: bool = False
    requires_current_limiting: bool = False


class CatalogComponent(BaseModel):
    catalog_id: str
    name: str
    category: str
    description: str
    manufacturer: Optional[str] = None
    part_number: Optional[str] = None
    source_url: Optional[str] = None
    provenance: str = "manufacturer_verified"
    datasheet_url: Optional[str] = None
    supply_voltage_min: float
    supply_voltage_max: float
    pins: List[Pin]
    default_properties: Dict[str, Any] = Field(default_factory=dict)
    notes: str = ""
    wokwi_id: Optional[str] = None
    simulation_support: Dict[str, bool] = Field(default_factory=lambda: {"wokwi": False, "behavioral": True})
    supported_toolchains: List[str] = Field(default_factory=list)
    interfaces: List[str] = Field(default_factory=list)
    evidence_quality: str = "verified"
    known_limitations: str = ""
    last_verified_date: str = "2026-10-29"


class ComponentTraceability(BaseModel):
    requirement_id: str = ""
    reason: str = ""
    subsystem: str = "General"
    controller_interface: Optional[str] = None


class ComponentInstance(BaseModel):
    instance_id: str
    catalog_id: str
    name: str
    role: str = "component"
    category: Optional[str] = None
    position: Dict[str, float] = Field(default_factory=lambda: {"x": 100.0, "y": 100.0})
    properties: Dict[str, Any] = Field(default_factory=dict)
    traceability: Optional[ComponentTraceability] = None


class PinReference(BaseModel):
    instance_id: str
    pin_id: str


class NetType(str, Enum):
    POWER = "POWER"
    GROUND = "GROUND"
    SIGNAL = "SIGNAL"
    I2C = "I2C"
    SPI = "SPI"
    UART = "UART"
    ANALOG = "ANALOG"


class Net(BaseModel):
    net_id: str
    name: str
    net_type: NetType
    pins: List[PinReference] = Field(default_factory=list)
    voltage: Optional[float] = None
    rationale: str = ""


class Severity(str, Enum):
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class ValidationFinding(BaseModel):
    rule_id: str
    severity: Severity
    title: str
    message: str
    remedy: str
    affected_instances: List[str] = Field(default_factory=list)
    affected_pins: List[str] = Field(default_factory=list)
    affected_nets: List[str] = Field(default_factory=list)


class ValidationReport(BaseModel):
    revision: int
    valid: bool
    findings: List[ValidationFinding] = Field(default_factory=list)
    checked_at: str
    implemented_checks: List[str] = Field(default_factory=list)
    unsupported_checks: List[str] = Field(default_factory=list)
    summary: Dict[str, int] = Field(default_factory=dict)


class FirmwareArtifact(BaseModel):
    revision: int
    language: str = "cpp"
    target_platform: str = "esp32"
    source_code: str
    pin_map: Dict[str, int] = Field(default_factory=dict)
    compiled: bool = False
    compilation_status: str = "Uncompiled (No host compiler invoked)"


class SimulationStep(BaseModel):
    step_number: int
    timestamp_ms: int
    action: str
    inputs: Dict[str, Any] = Field(default_factory=dict)
    expected_state: Dict[str, Any] = Field(default_factory=dict)
    actual_state: Dict[str, Any] = Field(default_factory=dict)
    passed: bool
    detail: str


class SimulationChannelReport(BaseModel):
    channel: str  # "static_validation", "firmware_compilation", "mcu_peripheral_simulation", "system_level_simulation", "physical_hardware"
    status: str   # "PASSED", "WARNING", "FAILED", "NOT_CONFIGURED", "EXPORT_READY", "UNTESTED"
    tool_name: str
    detail: str
    evidence: Dict[str, Any] = Field(default_factory=dict)


class SimulationArtifact(BaseModel):
    revision: int
    scenario_name: str
    passed: bool
    steps: List[SimulationStep] = Field(default_factory=list)
    summary: str
    simulated_at: str
    adapter_id: str = "behavioral"
    execution_status: str = "COMPLETED"  # "COMPLETED", "EXPORT_READY", "TOOL_MISSING", "FAILED"
    channels: List[SimulationChannelReport] = Field(default_factory=list)
    diagram_json: Optional[Dict[str, Any]] = None
    wokwi_toml: Optional[str] = None


class CandidateEvaluation(BaseModel):
    board_id: str
    name: str
    architecture: str
    score: float
    pros: List[str] = Field(default_factory=list)
    cons: List[str] = Field(default_factory=list)
    feasibility: str = "FEASIBLE"  # FEASIBLE, INCOMPATIBLE, MISSING_PERIPHERALS


class BoardSelectionDecision(BaseModel):
    selected_board: str
    architecture_category: str
    selection_rationale: str
    evaluated_candidates: List[CandidateEvaluation] = Field(default_factory=list)
    trade_offs: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    unmet_capabilities: List[str] = Field(default_factory=list)


class Requirements(BaseModel):
    system_overview: str
    desired_behavior: List[str] = Field(default_factory=list)
    inputs_and_sensors: List[str] = Field(default_factory=list)
    outputs_and_actuators: List[str] = Field(default_factory=list)
    controller_requirements: str
    power_requirements: str
    environmental_constraints: str
    safety_considerations: List[str] = Field(default_factory=list)
    assumptions: List[str] = Field(default_factory=list)
    acceptance_criteria: List[str] = Field(default_factory=list)


class Architecture(BaseModel):
    functional_blocks: List[Dict[str, Any]] = Field(default_factory=list)
    proposed_parts: List[str] = Field(default_factory=list)
    firmware_responsibilities: List[str] = Field(default_factory=list)
    power_domains: List[str] = Field(default_factory=list)


class Project(BaseModel):
    id: str
    name: str
    description: str
    target_board: str = "AUTO"
    revision: int = 1
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    requirements: Optional[Requirements] = None
    architecture: Optional[Architecture] = None
    board_decision: Optional[BoardSelectionDecision] = None
    components: List[ComponentInstance] = Field(default_factory=list)
    nets: List[Net] = Field(default_factory=list)
    validation_report: Optional[ValidationReport] = None
    firmware: Optional[FirmwareArtifact] = None
    simulation_history: List[SimulationArtifact] = Field(default_factory=list)
    assembly_guide: Optional[str] = None
    diagnostic_trace: Optional[Dict[str, Any]] = None
