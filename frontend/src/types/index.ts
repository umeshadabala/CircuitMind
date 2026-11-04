export type PinRole =
  | 'POWER'
  | 'GROUND'
  | 'ANALOG'
  | 'DIGITAL_IO'
  | 'DIGITAL_IN'
  | 'DIGITAL_OUT'
  | 'I2C_SDA'
  | 'I2C_SCL'
  | 'SPI_MOSI'
  | 'SPI_MISO'
  | 'SPI_SCK'
  | 'SPI_CS'
  | 'UART_TX'
  | 'UART_RX'
  | 'PWM'
  | 'PASSIVE';

export type PinDirection = 'INPUT' | 'OUTPUT' | 'BIDIRECTIONAL' | 'PASSIVE' | 'POWER';

export interface Pin {
  pin_id: string;
  name: string;
  number?: number;
  role: PinRole;
  direction: PinDirection;
  voltage_min: number;
  voltage_max: number;
  current_max_ma?: number;
  capabilities: string[];
  is_strapping?: boolean;
  requires_pullup?: boolean;
  requires_current_limiting?: boolean;
}

export interface CatalogComponent {
  catalog_id: string;
  name: string;
  category: string;
  description: string;
  manufacturer?: string;
  part_number?: string;
  source_url?: string;
  datasheet_url?: string;
  provenance?: string;
  wokwi_id?: string;
  simulation_support?: Record<string, boolean>;
  supported_toolchains?: string[];
  interfaces?: string[];
  supply_voltage_min: number;
  supply_voltage_max: number;
  pins: Pin[];
  default_properties: Record<string, any>;
  notes?: string;
}

export interface ComponentTraceability {
  requirement_id: string;
  subsystem: string;
  reason: string;
  controller_interface?: string;
}

export interface ComponentInstance {
  instance_id: string;
  catalog_id: string;
  name: string;
  role: string;
  category?: string;
  position: { x: number; y: number };
  properties: Record<string, any>;
  traceability?: ComponentTraceability;
}

export interface PinReference {
  instance_id: string;
  pin_id: string;
}

export type NetType = 'POWER' | 'GROUND' | 'SIGNAL' | 'I2C' | 'SPI' | 'UART' | 'ANALOG';

export interface Net {
  net_id: string;
  name: string;
  net_type: NetType;
  pins: PinReference[];
  voltage?: number;
  rationale?: string;
}

export type Severity = 'ERROR' | 'WARNING' | 'INFO';

export interface ValidationFinding {
  rule_id: string;
  severity: Severity;
  title: string;
  message: string;
  remedy: string;
  affected_instances: string[];
  affected_pins: string[];
  affected_nets: string[];
}

export interface ValidationReport {
  revision: number;
  valid: boolean;
  findings: ValidationFinding[];
  checked_at: string;
  implemented_checks?: string[];
  unsupported_checks?: string[];
  summary?: {
    errors?: number;
    warnings?: number;
    info?: number;
    total?: number;
  };
}

export interface FirmwareArtifact {
  revision: number;
  language: string;
  target_platform: string;
  source_code: string;
  pin_map: Record<string, number>;
  compiled: boolean;
  compilation_status: string;
}

export interface SimulationStep {
  step_number: number;
  timestamp_ms: number;
  action: string;
  inputs: Record<string, any>;
  expected_state: Record<string, any>;
  actual_state: Record<string, any>;
  passed: boolean;
  detail: string;
}

export interface SimulationChannelReport {
  channel: string;
  status: string;
  tool_name: string;
  detail: string;
  evidence: Record<string, any>;
}

export interface SimulationArtifact {
  revision: number;
  scenario_name: string;
  passed: boolean;
  steps: SimulationStep[];
  summary: string;
  simulated_at: string;
  adapter_id?: string;
  execution_status?: string;
  channels?: SimulationChannelReport[];
  diagram_json?: Record<string, any>;
  wokwi_toml?: string;
}

export interface CandidateEvaluation {
  board_id: string;
  name: string;
  architecture: string;
  score: number;
  pros: string[];
  cons: string[];
  feasibility: string;
}

export interface BoardSelectionDecision {
  selected_board: string;
  architecture_category: string;
  selection_rationale: string;
  evaluated_candidates: CandidateEvaluation[];
  trade_offs: string[];
  assumptions: string[];
  unmet_capabilities: string[];
}

export interface Requirements {
  system_overview: string;
  desired_behavior: string[];
  inputs_and_sensors: string[];
  outputs_and_actuators: string[];
  controller_requirements: string;
  power_requirements: string;
  environmental_constraints: string;
  safety_considerations: string[];
  assumptions: string[];
  acceptance_criteria: string[];
}

export interface Architecture {
  functional_blocks: { name: string; description: string; parts: string[] }[];
  proposed_parts: string[];
  firmware_responsibilities: string[];
  power_domains: string[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  target_board: string;
  revision: number;
  created_at: string;
  updated_at: string;
  requirements?: Requirements;
  architecture?: Architecture;
  board_decision?: BoardSelectionDecision;
  components: ComponentInstance[];
  nets: Net[];
  validation_report?: ValidationReport;
  firmware?: FirmwareArtifact;
  simulation_history: SimulationArtifact[];
  assembly_guide?: string;
  diagnostic_trace?: Record<string, any>;
}

export interface BomItem {
  catalog_id: string;
  name: string;
  category: string;
  description: string;
  quantity: number;
  designators: string[];
  datasheet_url?: string;
}

export interface BomResponse {
  project_id: string;
  revision: number;
  total_components: number;
  unique_parts: number;
  items: BomItem[];
}

export interface NetlistNode {
  instance_id: string;
  pin_id: string;
}

export interface NetlistNet {
  net_id: string;
  name: string;
  net_type: string;
  voltage?: number;
  rationale?: string;
  nodes: NetlistNode[];
}

export interface NetlistResponse {
  project_id: string;
  revision: number;
  net_count: number;
  nets: NetlistNet[];
  kicad_format: string;
}

export type AIProvider = 'local' | 'meta' | 'nvidia';

export interface MetaTrialStatus {
  provider: 'meta' | 'nvidia';
  status: 'available' | 'processing' | 'consumed' | 'unavailable';
  trial_available: boolean;
  configured: boolean;
  model: string;
}

export interface HealthResponse {
  status: string;
  version: string;
  active_provider?: 'local' | 'nvidia' | 'meta';
  ollama: {
    status: string;
    base_url: string;
    configured_model: string;
    model_available?: boolean;
    available_models?: string[];
    detail?: string;
  };
  meta?: {
    status: string;
    configured: boolean;
    model: string;
    model_verified?: boolean;
    available_models?: string[];
    detail?: string;
  };
  nvidia?: {
    status: string;
    configured: boolean;
    model: string;
    model_verified?: boolean;
    available_models?: string[];
    detail?: string;
  };
}

