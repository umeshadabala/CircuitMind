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
  attributes: Record<string, any>;
  description?: string;
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
  test_type: 'threshold_trigger' | 'pin_state' | 'serial_telemetry' | 'frequency';
  parameters?: Record<string, any>;
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
  sensor_inputs: Record<string, any>;
  pin_states: Record<string, any>;
  serial_line?: string;
}

export interface TestResult {
  test_id: string;
  test_name: string;
  requirement_id?: string;
  status: 'passed' | 'failed' | 'inconclusive' | 'pending';
  expected: string;
  observed: string;
  evidence: Record<string, any>;
  diagnostic?: string;
}

export interface SimulationRun {
  id: string;
  project_id: string;
  version: number;
  started_at: string;
  completed_at?: string;
  status: 'pending' | 'running' | 'passed' | 'failed' | 'error';
  serial_logs: string[];
  observations: SimulationObservation[];
  test_results: TestResult[];
  summary: string;
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
  validation: ValidationResult;
  sim_status: 'draft' | 'ready' | 'running' | 'passed' | 'failed';
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
  payload: Record<string, any>;
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
  proposed_patch: Record<string, any>;
  patch_diff: string;
  remediation_explanation: string;
}
