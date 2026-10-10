import { Project, SimulationRun, ValidationResult, MemoryEvent, DebugDiagnosis } from '../types';

const BASE_URL = '/api';

export async function checkHealth() {
  const res = await fetch(`${BASE_URL}/health`);
  return res.json();
}

export async function planProject(prompt: string, existingProjectId?: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/plan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, existing_project_id: existingProjectId })
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchProjects(): Promise<Array<{ id: string; title: string; description: string; board_type: string; version: number }>> {
  const res = await fetch(`${BASE_URL}/projects`);
  return res.json();
}

export async function fetchProject(id: string): Promise<Project> {
  const res = await fetch(`${BASE_URL}/projects/${id}`);
  if (!res.ok) throw new Error('Project not found');
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

export async function fetchWokwiDiagram(id: string): Promise<any> {
  const res = await fetch(`${BASE_URL}/projects/${id}/export/wokwi`);
  return res.json();
}

export function getExportBundleUrl(id: string): string {
  return `${BASE_URL}/projects/${id}/export/bundle`;
}
