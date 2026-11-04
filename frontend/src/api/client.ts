import {
  BomResponse,
  CatalogComponent,
  HealthResponse,
  MetaTrialStatus,
  NetlistResponse,
  Project,
  Requirements,
  SimulationArtifact,
  ValidationReport,
} from '../types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers,
  });
  if (!response.ok) {
    let errorDetail = `Request failed: ${response.status} ${response.statusText}`;
    try {
      const errJson = await response.json();
      if (errJson.detail) errorDetail = errJson.detail;
    } catch {
      // Fallback to text
    }
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Health
  getHealth: () => request<HealthResponse>('/api/health'),

  // Catalog
  getCatalog: () => request<CatalogComponent[]>('/api/catalog'),
  getCatalogPart: (id: string) => request<CatalogComponent>(`/api/catalog/${id}`),

  // Projects
  getProjects: () => request<Project[]>('/api/projects'),
  getProject: (id: string) => request<Project>(`/api/projects/${id}`),
  createProject: (data: { name: string; description?: string; target_board?: string }) =>
    request<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  updateProject: (id: string, data: Partial<Project>) =>
    request<Project>(`/api/projects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteProject: (id: string) =>
    request<{ status: string; project_id: string }>(`/api/projects/${id}`, { method: 'DELETE' }),

  // Pipeline
  parseRequirements: (prompt: string) =>
    request<Requirements>('/api/pipeline/parse-requirements', {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),
  synthesizeProject: (projectId: string, prompt: string) =>
    request<Project>(`/api/projects/${projectId}/synthesize`, {
      method: 'POST',
      body: JSON.stringify({ prompt }),
    }),

  // Graph mutations
  addComponent: (projectId: string, data: { catalog_id: string; name?: string; position?: { x: number; y: number } }) =>
    request<Project>(`/api/projects/${projectId}/components`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  removeComponent: (projectId: string, instanceId: string) =>
    request<Project>(`/api/projects/${projectId}/components/${instanceId}`, {
      method: 'DELETE',
    }),
  updateComponentPosition: (projectId: string, instanceId: string, position: { x: number; y: number }) =>
    request<Project>(`/api/projects/${projectId}/components/${instanceId}/position`, {
      method: 'PUT',
      body: JSON.stringify(position),
    }),
  repairProject: (projectId: string) =>
    request<{ actions_taken: string[]; project: Project }>(`/api/projects/${projectId}/repair`, {
      method: 'POST',
    }),
  autoLayout: (projectId: string) =>
    request<Project>(`/api/projects/${projectId}/layout`, {
      method: 'POST',
    }),

  // Artifacts & Validation
  getValidation: (projectId: string) => request<ValidationReport>(`/api/projects/${projectId}/validation`),
  getBom: (projectId: string) => request<BomResponse>(`/api/projects/${projectId}/artifacts/bom`),
  getNetlist: (projectId: string) => request<NetlistResponse>(`/api/projects/${projectId}/artifacts/netlist`),
  getFirmware: (projectId: string) => request<any>(`/api/projects/${projectId}/artifacts/firmware`),
  getAssemblyGuide: (projectId: string) =>
    request<{ markdown: string }>(`/api/projects/${projectId}/artifacts/assembly-guide`),

  // Simulation
  runSimulation: (projectId: string, scenario?: string) =>
    request<SimulationArtifact>(`/api/projects/${projectId}/simulate`, {
      method: 'POST',
      body: JSON.stringify({ scenario }),
    }),

  // Meta AI Trial
  getMetaTrialStatus: () => request<MetaTrialStatus>('/api/ai/meta/trial-status'),

  // Copilot
  copilotChat: (projectId: string, message: string, provider: 'local' | 'meta' = 'local') =>
    request<{ reply: string; actions_executed: string[]; provider?: string; current_revision: number; project: Project }>(
      `/api/projects/${projectId}/copilot`,
      { method: 'POST', body: JSON.stringify({ message, provider }) }
    ),
};

