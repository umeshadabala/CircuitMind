import { Project, SimulationRun, ValidationResult, MemoryEvent, DebugDiagnosis } from '../types';

const BASE_URL = '/api';

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

async function parseErrorMessage(res: Response): Promise<string> {
  try {
    const data = await res.json();
    if (data && typeof data === 'object') {
      if (typeof data.detail === 'string') return data.detail;
      if (Array.isArray(data.detail)) {
        return data.detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
      }
      if (typeof data.message === 'string') return data.message;
    }
    return JSON.stringify(data);
  } catch {
    try {
      const text = await res.text();
      return text || `HTTP ${res.status}: ${res.statusText}`;
    } catch {
      return `HTTP ${res.status}: ${res.statusText}`;
    }
  }
}

export async function planProject(prompt: string, existingProjectId?: string, signal?: AbortSignal): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, existing_project_id: existingProjectId }),
    signal
  });
  if (!res.ok) throw new Error(await parseErrorMessage(res));
  return res.json();
}

export async function fetchProjects(): Promise<Array<{ id: string; title: string; description: string; board_type: string; version: number }>> {
  const res = await fetch(`${BASE_URL}/projects`);
  return res.json();
}

export async function seedDemoProject(projectType: string = 'parking'): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/seed-demo?project_type=${projectType}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function resetDatabase(): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/admin/reset-db`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`);
  if (!res.ok) throw new Error('Project not found');
  return res.json();
}

export async function deleteProject(id: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('Failed to delete project');
  return res.json();
}

export async function validateProject(id: string): Promise<ValidationResult> {
  const res = await fetch(`${BASE_URL}/projects/${id}/validate`, { method: 'POST' });
  return res.json();
}

export async function simulateProject(id: string): Promise<SimulationRun> {
  const res = await fetch(`${BASE_URL}/projects/${id}/simulate`, { method: 'POST' });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchSimulationRuns(id: string): Promise<SimulationRun[]> {
  const res = await fetch(`${BASE_URL}/projects/${id}/simulation-runs`);
  return res.json();
}

export async function injectDefect(id: string, defectType: string = 'misassigned_buzzer_pin'): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/debug/inject-defect?defect_type=${defectType}`, { method: 'POST' });
  return res.json();
}

export async function diagnoseProject(id: string): Promise<DebugDiagnosis | { status: string; message: string }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/debug/diagnose`, { method: 'POST' });
  return res.json();
}

export async function applyRepairPatch(id: string, diagnosis: DebugDiagnosis): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/debug/apply-patch`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(diagnosis)
  });
  return res.json();
}

export async function fetchProjectMemory(id: string, eventType?: string, search?: string): Promise<MemoryEvent[]> {
  const params = new URLSearchParams();
  if (eventType) params.append('event_type', eventType);
  if (search) params.append('search', search);
  const res = await fetch(`${BASE_URL}/projects/${id}/memory?${params.toString()}`);
  return res.json();
}

export async function askDmai(id: string, question: string): Promise<{ answer: string; source: string; relevant_events: MemoryEvent[] }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/dmai/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  });
  return res.json();
}

export async function chatWithProject(id: string, message: string): Promise<{
  intent: string;
  action_applied: boolean;
  message: string;
  updated_project?: Project;
  diff_summary?: string;
  simulation_run?: SimulationRun;
}> {
  const res = await fetch(`${BASE_URL}/projects/${id}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchWokwiDiagram(id: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/projects/${id}/export/wokwi`);
  return res.json();
}

export function getExportBundleUrl(id: string): string {
  return `${BASE_URL}/projects/${id}/export/bundle`;
}

export async function fetchSimulationStatus(): Promise<import('../types').AdapterStatus> {
  const res = await fetch(`${BASE_URL}/simulation/status`);
  return res.json();
}

export async function lintWokwiDiagram(id: string): Promise<{
  valid: boolean;
  lint_engine: string;
  issues?: string[];
  output?: string;
  part_count: number;
  connection_count: number;
}> {
  const res = await fetch(`${BASE_URL}/projects/${id}/simulation/lint`, { method: 'POST' });
  return res.json();
}

export async function fetchWokwiHandoff(id: string): Promise<import('../types').WokwiHandoff> {
  const res = await fetch(`${BASE_URL}/projects/${id}/simulation/handoff`);
  return res.json();
}

export async function fetchBuildStatus(id: string): Promise<import('../types').BuildStatus> {
  const res = await fetch(`${BASE_URL}/projects/${id}/firmware/build-status`);
  return res.json();
}

export async function fetchCatalogComponents(category?: string): Promise<import('../types').ComponentCatalogItem[]> {
  const url = category ? `${BASE_URL}/catalog/components?category=${category}` : `${BASE_URL}/catalog/components`;
  const res = await fetch(url);
  return res.json();
}

export async function fetchCatalogComponent(partId: string): Promise<import('../types').ComponentCatalogItem> {
  const res = await fetch(`${BASE_URL}/catalog/components/${partId}`);
  if (!res.ok) throw new Error('Component not found');
  return res.json();
}

export async function fetchCatalogBoards(): Promise<Record<string, unknown>> {
  const res = await fetch(`${BASE_URL}/catalog/boards`);
  return res.json();
}

export async function updateProjectLayout(
  id: string,
  diagramLayout: Record<string, unknown>,
  positions?: Record<string, { x: number; y: number; rotation?: number }>
): Promise<{ status: string; message: string; version: number }> {
  const res = await fetch(`${BASE_URL}/projects/${id}/layout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ diagram_layout: diagramLayout, positions })
  });
  return res.json();
}

export async function addComponentToProject(
  id: string,
  partId: string,
  customName?: string,
  positionX?: number,
  positionY?: number
): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/components`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      part_id: partId,
      custom_name: customName,
      position_x: positionX,
      position_y: positionY
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteComponentFromProject(id: string, componentId: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/components/${componentId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function addConnectionToProject(
  id: string,
  fromComponent: string,
  fromPin: string,
  toComponent: string,
  toPin: string,
  color?: string,
  signalType?: string
): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/connections`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      from_component: fromComponent,
      from_pin: fromPin,
      to_component: toComponent,
      to_pin: toPin,
      color,
      signal_type: signalType
    })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteConnectionFromProject(id: string, connectionId: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/connections/${connectionId}`, {
    method: 'DELETE'
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateProjectFirmware(id: string, code: string, filename: string = 'sketch.ino'): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}/firmware`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ filename, code })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateFullProject(id: string, project: Project): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(project)
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

