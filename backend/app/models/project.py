from typing import List, Dict, Any, Optional, Literal
from pydantic import BaseModel, Field
from datetime import datetime, timezone

def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

class Requirement(BaseModel):
    id: str
    description: str
    priority: Literal["required", "recommended", "optional"] = "required"
    category: Literal["sensing", "actuation", "control", "power", "display", "connectivity"] = "sensing"
    target_value: Optional[str] = None

class BoardConfig(BaseModel):
    type: str  # e.g. "esp32-devkit-v1", "arduino-uno"
    display_name: str
    architecture: str  # "Xtensa dual-core 240MHz" or "ATmega328P 16MHz"
    voltage_logic: float = 3.3  # or 5.0
    voltage_supply: float = 5.0
    pins_available: List[str] = []
    reserved_pins: List[str] = []

class PinAssignment(BaseModel):
    component_id: str
    component_pin: str
    board_pin: str
    signal_type: Literal["POWER_VCC", "POWER_GND", "DIGITAL_IN", "DIGITAL_OUT", "ANALOG_IN", "PWM", "I2C_SDA", "I2C_SCL", "SPI", "UART"] = "DIGITAL_IN"

class ComponentInstance(BaseModel):
    id: str
    part_id: str  # Catalog reference, e.g. "hc-sr04", "led-red"
    name: str
    category: str
    pins: List[str]
    attributes: Dict[str, Any] = Field(default_factory=dict)
    description: Optional[str] = None

class Connection(BaseModel):
    id: str
    from_component: str  # e.g. "board" or component id
    from_pin: str
    to_component: str
    to_pin: str
    color: str = "orange"
    signal_type: str = "DIGITAL"
    description: Optional[str] = None

class FirmwareArtifact(BaseModel):
    filename: str = "sketch.ino"
    code: str
    language: str = "cpp"
    libraries: List[str] = Field(default_factory=list)
    entry_point: str = "setup"
    version: int = 1

class TestCase(BaseModel):
    id: str
    name: str
    requirement_id: Optional[str] = None
    given: str
    when: str
    then: str
    test_type: Literal["threshold_trigger", "pin_state", "serial_telemetry", "frequency"] = "threshold_trigger"
    parameters: Dict[str, Any] = Field(default_factory=dict)

class DiagnosticIssue(BaseModel):
    severity: Literal["error", "warning", "info"]
    code: str
    message: str
    affected_entities: List[str] = Field(default_factory=list)
    remediation: Optional[str] = None

class ValidationResult(BaseModel):
    status: Literal["draft", "validated", "warning", "error"] = "draft"
    issues: List[DiagnosticIssue] = Field(default_factory=list)
    validated_at: Optional[str] = None

class GuideStep(BaseModel):
    step_number: int
    title: str
    component_references: List[str] = Field(default_factory=list)
    instructions: str
    expected_result: str
    safety_caution: Optional[str] = None

class BuildGuide(BaseModel):
    title: str
    summary: str
    component_rationale: Dict[str, str] = Field(default_factory=dict)
    steps: List[GuideStep] = Field(default_factory=list)
    testing_instructions: str
    troubleshooting: List[Dict[str, str]] = Field(default_factory=list)
    electrical_cautions: List[str] = Field(default_factory=list)

class SimulationObservation(BaseModel):
    timestamp_ms: int
    sensor_inputs: Dict[str, Any] = Field(default_factory=dict)
    pin_states: Dict[str, Any] = Field(default_factory=dict)
    serial_line: Optional[str] = None

class TestResult(BaseModel):
    test_id: str
    test_name: str
    requirement_id: Optional[str] = None
    status: Literal["passed", "failed", "inconclusive", "pending"] = "pending"
    expected: str
    observed: str
    evidence: Dict[str, Any] = Field(default_factory=dict)
    diagnostic: Optional[str] = None

class SimulationRun(BaseModel):
    id: str
    project_id: str
    version: int
    started_at: str = Field(default_factory=utc_now_iso)
    completed_at: Optional[str] = None
    status: Literal["pending", "running", "passed", "failed", "error"] = "pending"
    serial_logs: List[str] = Field(default_factory=list)
    observations: List[SimulationObservation] = Field(default_factory=list)
    test_results: List[TestResult] = Field(default_factory=list)
    summary: str = ""

class Project(BaseModel):
    schema_version: str = "1.0"
    id: str
    title: str
    description: str
    board: BoardConfig
    requirements: List[Requirement] = Field(default_factory=list)
    components: List[ComponentInstance] = Field(default_factory=list)
    connections: List[Connection] = Field(default_factory=list)
    pin_assignments: List[PinAssignment] = Field(default_factory=list)
    firmware: List[FirmwareArtifact] = Field(default_factory=list)
    tests: List[TestCase] = Field(default_factory=list)
    build_guide: Optional[BuildGuide] = None
    validation: ValidationResult = Field(default_factory=ValidationResult)
    sim_status: Literal["draft", "ready", "running", "passed", "failed"] = "draft"
    version: int = 1
    created_at: str = Field(default_factory=utc_now_iso)
    updated_at: str = Field(default_factory=utc_now_iso)
