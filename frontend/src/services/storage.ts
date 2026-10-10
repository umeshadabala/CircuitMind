import { Project, SimulationRun, MemoryEvent } from '../types';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  toolsUsed?: string[];
  proposedPatch?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  project_id: string;
  title: string;
  created_at: string;
  updated_at: string;
  messages: ChatMessage[];
}

export interface WorkspacePreferences {
  theme: 'dark';
  snapToGrid: boolean;
  gridSize: number;
  autoSave: boolean;
  activeTab: string;
  isCopilotOpen: boolean;
  storageMode: 'local_indexeddb' | 'synced_server';
}

const DB_NAME = 'CircuitMindStudio_v1';
const DB_VERSION = 1;

class IndexedDBStorage {
  private dbPromise: Promise<IDBDatabase> | null = null;

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB is not supported in this environment'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // 1. Projects store
        if (!db.objectStoreNames.contains('projects')) {
          const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
          projectStore.createIndex('updated_at', 'updated_at', { unique: false });
        }

        // 2. Conversations store
        if (!db.objectStoreNames.contains('conversations')) {
          const convStore = db.createObjectStore('conversations', { keyPath: 'id' });
          convStore.createIndex('project_id', 'project_id', { unique: false });
        }

        // 3. Simulation Runs store
        if (!db.objectStoreNames.contains('simulation_runs')) {
          const simStore = db.createObjectStore('simulation_runs', { keyPath: 'id' });
          simStore.createIndex('project_id', 'project_id', { unique: false });
        }

        // 4. Engineering Events / DMAI Memory store
        if (!db.objectStoreNames.contains('engineering_events')) {
          const eventStore = db.createObjectStore('engineering_events', { keyPath: 'id', autoIncrement: true });
          eventStore.createIndex('project_id', 'project_id', { unique: false });
        }

        // 5. Workspace Preferences store
        if (!db.objectStoreNames.contains('preferences')) {
          db.createObjectStore('preferences', { keyPath: 'key' });
        }
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onerror = () => {
        reject(request.error);
      };
    });

    return this.dbPromise;
  }

  // Projects CRUD
  async getAllProjects(): Promise<Project[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async getProject(id: string): Promise<Project | null> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readonly');
      const store = tx.objectStore('projects');
      const request = store.get(id);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  async saveProject(project: Project): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('projects', 'readwrite');
      const store = tx.objectStore('projects');
      const updatedProject = {
        ...project,
        updated_at: new Date().toISOString()
      };
      const request = store.put(updatedProject);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteProject(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'conversations', 'simulation_runs', 'engineering_events'], 'readwrite');
      tx.objectStore('projects').delete(id);

      // Clean up linked data
      const convStore = tx.objectStore('conversations');
      const convIdx = convStore.index('project_id');
      const convReq = convIdx.getAllKeys(id);
      convReq.onsuccess = () => {
        (convReq.result || []).forEach(k => convStore.delete(k));
      };

      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async duplicateProject(id: string): Promise<Project> {
    const original = await this.getProject(id);
    if (!original) throw new Error(`Project ${id} not found`);

    const newId = `proj-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const copy: Project = {
      ...original,
      id: newId,
      title: `${original.title} (Copy)`,
      version: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    await this.saveProject(copy);
    return copy;
  }

  async renameProject(id: string, newTitle: string): Promise<Project> {
    const proj = await this.getProject(id);
    if (!proj) throw new Error(`Project ${id} not found`);
    proj.title = newTitle.trim();
    proj.version += 1;
    await this.saveProject(proj);
    return proj;
  }

  // Conversations CRUD
  async getConversations(projectId: string): Promise<Conversation[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readonly');
      const store = tx.objectStore('conversations');
      const index = store.index('project_id');
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveConversation(conv: Conversation): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const request = store.put(conv);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async deleteConversation(id: string): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('conversations', 'readwrite');
      const store = tx.objectStore('conversations');
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Simulation Runs
  async getSimulationRuns(projectId: string): Promise<SimulationRun[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('simulation_runs', 'readonly');
      const store = tx.objectStore('simulation_runs');
      const index = store.index('project_id');
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async saveSimulationRun(run: SimulationRun): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('simulation_runs', 'readwrite');
      const store = tx.objectStore('simulation_runs');
      const request = store.put(run);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Engineering Events
  async getEngineeringEvents(projectId: string): Promise<MemoryEvent[]> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('engineering_events', 'readonly');
      const store = tx.objectStore('engineering_events');
      const index = store.index('project_id');
      const request = index.getAll(projectId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async recordEngineeringEvent(event: Omit<MemoryEvent, 'id' | 'timestamp'> & { timestamp?: string }): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('engineering_events', 'readwrite');
      const store = tx.objectStore('engineering_events');
      const fullEvent = {
        ...event,
        timestamp: event.timestamp || new Date().toISOString()
      };
      const request = store.add(fullEvent);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Preferences
  async getPreferences(): Promise<WorkspacePreferences> {
    const db = await this.getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('preferences', 'readonly');
      const store = tx.objectStore('preferences');
      const request = store.get('workspace_config');
      request.onsuccess = () => {
        const defaultPrefs: WorkspacePreferences = {
          theme: 'dark',
          snapToGrid: true,
          gridSize: 20,
          autoSave: true,
          activeTab: 'wiring',
          isCopilotOpen: true,
          storageMode: 'local_indexeddb'
        };
        resolve(request.result?.value || defaultPrefs);
      };
      request.onerror = () => {
        resolve({
          theme: 'dark',
          snapToGrid: true,
          gridSize: 20,
          autoSave: true,
          activeTab: 'wiring',
          isCopilotOpen: true,
          storageMode: 'local_indexeddb'
        });
      };
    });
  }

  async savePreferences(prefs: WorkspacePreferences): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('preferences', 'readwrite');
      const store = tx.objectStore('preferences');
      const request = store.put({ key: 'workspace_config', value: prefs });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  // Import / Export
  async exportProjectJson(projectId: string): Promise<string> {
    const project = await this.getProject(projectId);
    if (!project) throw new Error('Project not found');
    const runs = await this.getSimulationRuns(projectId);
    const events = await this.getEngineeringEvents(projectId);

    return JSON.stringify({
      schema_version: 'circuitmind-studio-v1',
      exported_at: new Date().toISOString(),
      project,
      simulation_runs: runs,
      engineering_events: events
    }, null, 2);
  }

  async importProjectJson(jsonString: string): Promise<Project> {
    const parsed = JSON.parse(jsonString);
    const project: Project = parsed.project || parsed;
    if (!project.id || !project.title) {
      throw new Error('Invalid project JSON structure');
    }

    // Assign new unique ID to avoid overwriting existing project
    project.id = `proj-imp-${Date.now().toString(36)}`;
    project.title = `${project.title} (Imported)`;
    project.updated_at = new Date().toISOString();

    await this.saveProject(project);

    if (Array.isArray(parsed.engineering_events)) {
      for (const ev of parsed.engineering_events) {
        await this.recordEngineeringEvent({
          ...ev,
          project_id: project.id
        });
      }
    }

    return project;
  }

  async clearAllLocalData(): Promise<void> {
    const db = await this.getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['projects', 'conversations', 'simulation_runs', 'engineering_events'], 'readwrite');
      tx.objectStore('projects').clear();
      tx.objectStore('conversations').clear();
      tx.objectStore('simulation_runs').clear();
      tx.objectStore('engineering_events').clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export const StorageService = new IndexedDBStorage();
