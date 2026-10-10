export type TabType = 
  | 'overview' 
  | 'components' 
  | 'wiring' 
  | 'firmware' 
  | 'simulation' 
  | 'verification' 
  | 'guide' 
  | 'memory';

export interface Requirement {
  id: string;
  description: string;
  priority: 'required' | 'recommended' | 'optional';
  category: 'sensing' | 'actuation' | 'control' | 'power' | 'display' | 'connectivity';
  target_value?: string;
  status?: 'proposed' | 'implemented' | 'unresolved' | 'blocked' | 'verified';
}

export interface BoardConfig {
  type: string;
  display_name: string;
  architecture: string;
  voltage_logic: number;
  voltage_supply: number;
  pins_available: string[];
  reserved_pins: string[];
}

export interface PinAssignment {
  component_id: string;
  component_pin: string;
  board_pin: string;
  signal_type: string;
}

export interface ComponentInstance {
  id: string;
  part_id: string;
  name: string;
  category: string;
  pins: string[];
  attributes: Record<string, unknown>;
  description?: string;
  position_x?: number;
  position_y?: number;
  rotation?: number;
}

export interface Connection {
  id: string;
  from_component: string;
  from_pin: string;
  to_component: string;
  to_pin: string;
  color: string;
  signal_type: string;
  description?: string;
}

export interface FirmwareArtifact {
  filename: string;
  code: string;
  language: string;
  libraries: string[];
  entry_point: string;
  version: number;
}

export interface TestCase {
  id: string;
  name: string;
  requirement_id?: string;
  given: string;
  when: string;
  then: string;
  test_type: 'threshold_trigger' | 'pin_state' | 'serial_telemetry' | 'frequency' | 'i2c_telemetry';
  parameters?: Record<string, unknown>;
}

export interface DiagnosticIssue {
  severity: 'error' | 'warning' | 'info';
  code: string;
  message: string;
  affected_entities: string[];
  remediation?: string;
}

export interface ValidationResult {
  status: 'draft' | 'validated' | 'warning' | 'error';
  issues: DiagnosticIssue[];
  validated_at?: string;
}

export interface GuideStep {
  step_number: number;
  title: string;
  component_references: string[];
  instructions: string;
  expected_result: string;
  safety_caution?: string;
}

export interface BuildGuide {
  title: string;
  summary: string;
  component_rationale: Record<string, string>;
  steps: GuideStep[];
  testing_instructions: string;
  troubleshooting: Array<{ issue: string; fix: string }>;
  electrical_cautions: string[];
}

export interface SimulationObservation {
  timestamp_ms: number;
  sensor_inputs: Record<string, unknown>;
  pin_states: Record<string, unknown>;
  serial_line?: string;
}

export interface TestResult {
  test_id: string;
  test_name: string;
  requirement_id?: string;
  status: 'passed' | 'failed' | 'inconclusive' | 'pending';
  expected: string;
  observed: string;
  evidence: Record<string, unknown>;
  diagnostic?: string;
}

export interface SimulationRun {
  id: string;
  project_id: string;
  version: number;
  runner?: string;
  started_at: string;
  completed_at?: string;
  status: 'not_configured' | 'ready' | 'running' | 'passed' | 'failed' | 'error';
  duration_ms?: number;
  exit_code?: number;
  serial_logs: string[];
  observations: SimulationObservation[];
  test_results: TestResult[];
  error_details?: string;
  setup_instructions?: string[];
  summary: string;
}

export interface AdapterStatus {
  cli_installed: boolean;
  cli_path?: string;
  token_configured: boolean;
  ready_for_cli_simulation: boolean;
  compiler_available?: boolean;
  toolchain_details?: Record<string, unknown>;
  setup_instructions: string[];
  embedding_policy: {
    embedded_iframe_supported: boolean;
    reason: string;
    recommended_workflow: string;
  };
}

export interface WokwiHandoff {
  simulator_name: string;
  simulator_url: string;
  target_board: string;
  target_board_type: string;
  diagram_json: Record<string, unknown>;
  firmware_code: string;
  instructions: string[];
}

export interface BuildStatus {
  board: string;
  board_type: string;
  toolchain: {
    has_compiler: boolean;
    arduino_cli_path?: string;
    platformio_path?: string;
    avr_gcc_path?: string;
    setup_instructions: string[];
  };
  lint: {
    valid: boolean;
    issues: string[];
    line_count: number;
    target_board: string;
  };
  ready_to_flash: boolean;
}

export interface ComponentCatalogItem {
  part_id: string;
  canonical_name: string;
  manufacturer?: string;
  model?: string;
  category: string;
  board_compatibility?: string[];
  electrical_characteristics: Record<string, unknown>;
  pins: Array<{
    pin_name: string;
    signal_type: string;
    direction: string;
    voltage_nominal_v?: number;
    description: string;
  }>;
  datasheet_url: string;
  source_metadata?: Record<string, unknown>;
  image_url?: string;
  image_attribution?: string;
  wokwi_part_id?: string;
  firmware_libraries?: string[];
  known_limitations?: string[];
}

export interface Project {
  schema_version: string;
  id: string;
  title: string;
  description: string;
  board: BoardConfig;
  requirements: Requirement[];
  components: ComponentInstance[];
  connections: Connection[];
  pin_assignments: PinAssignment[];
  firmware: FirmwareArtifact[];
  tests: TestCase[];
  build_guide?: BuildGuide;
  diagram_layout?: Record<string, unknown>;
  validation: ValidationResult;
  sim_status: 'draft' | 'not_configured' | 'ready' | 'running' | 'passed' | 'failed' | 'error';
  generation_metadata?: Record<string, unknown>;
  unresolved_requirements?: string[];
  version: number;
  created_at: string;
  updated_at: string;
}

export interface MemoryEvent {
  id?: number;
  project_id: string;
  event_type: string;
  summary: string;
  rationale?: string;
  payload: Record<string, unknown>;
  related_entity_id?: string;
  project_version: number;
  timestamp: string;
}

export interface DebugDiagnosis {
  title: string;
  defect_type: string;
  root_cause: string;
  evidence: string[];
  affected_entities: string[];
  proposed_patch: Record<string, unknown>;
  patch_diff: string;
  remediation_explanation: string;
}

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number; // ms
}
