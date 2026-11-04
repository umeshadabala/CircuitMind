import React, { useEffect, useState } from 'react';
import { api } from './api/client';
import { Project, CatalogComponent, HealthResponse } from './types';
import { Header } from './components/Header';
import { LandingView } from './views/LandingView';
import { DashboardView } from './views/DashboardView';
import { NewProjectView } from './views/NewProjectView';
import { WorkspaceView } from './views/WorkspaceView';
import { AlertCircle, X } from 'lucide-react';

export const App: React.FC = () => {
  const [view, setView] = useState<'landing' | 'dashboard' | 'new-project' | 'workspace'>('landing');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [catalog, setCatalog] = useState<CatalogComponent[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [initialPrompt, setInitialPrompt] = useState<string>('');
  const [initialName, setInitialName] = useState<string>('');
  const [isCopilotOpen, setIsCopilotOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load health, catalog, and projects on mount
  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    try {
      const [healthData, catalogData, projectsData] = await Promise.all([
        api.getHealth().catch(() => null),
        api.getCatalog().catch(() => []),
        api.getProjects().catch(() => []),
      ]);

      if (healthData) setHealth(healthData);
      setCatalog(catalogData);
      setProjects(projectsData);
    } catch (err: any) {
      setErrorMessage(`Failed to load system data: ${err.message}`);
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId) || null;

  // Handle creating a new project via pipeline synthesis
  const handleCreateAndSynthesize = async (name: string, prompt: string, targetBoard: string) => {
    setErrorMessage(null);
    try {
      // 1. Create base project
      const newProj = await api.createProject({ name, target_board: targetBoard });

      // 2. Run synthesis pipeline
      const synthesized = await api.synthesizeProject(newProj.id, prompt);

      setProjects((prev) => [synthesized, ...prev]);
      setActiveProjectId(synthesized.id);
      setView('workspace');
    } catch (err: any) {
      setErrorMessage(`Synthesis failed: ${err.message}`);
      throw err;
    }
  };

  const handleOpenProject = (id: string) => {
    setActiveProjectId(id);
    setView('workspace');
  };

  const handleDeleteProject = async (id: string) => {
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (activeProjectId === id) {
        setActiveProjectId(null);
        setView('dashboard');
      }
    } catch (err: any) {
      setErrorMessage(`Delete failed: ${err.message}`);
    }
  };

  const handleUpdateProject = async (data: Partial<Project>) => {
    if (!activeProjectId) return;
    try {
      const updated = await api.updateProject(activeProjectId, data);
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updated : p)));
    } catch (err: any) {
      setErrorMessage(`Update failed: ${err.message}`);
    }
  };

  const handleAddComponent = async (catalogId: string) => {
    if (!activeProjectId) return;
    try {
      const updated = await api.addComponent(activeProjectId, { catalog_id: catalogId });
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updated : p)));
    } catch (err: any) {
      setErrorMessage(`Add component failed: ${err.message}`);
    }
  };

  const handleRemoveComponent = async (instanceId: string) => {
    if (!activeProjectId) return;
    try {
      const updated = await api.removeComponent(activeProjectId, instanceId);
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updated : p)));
    } catch (err: any) {
      setErrorMessage(`Remove component failed: ${err.message}`);
    }
  };

  const handleRefreshValidation = async () => {
    if (!activeProjectId) return;
    try {
      const report = await api.getValidation(activeProjectId);
      setProjects((prev) =>
        prev.map((p) => (p.id === activeProjectId ? { ...p, validation_report: report } : p))
      );
    } catch (err: any) {
      setErrorMessage(`Validation refresh failed: ${err.message}`);
    }
  };

  const handleRunSimulation = async (scenario?: string) => {
    if (!activeProjectId) throw new Error('No active project');
    const sim = await api.runSimulation(activeProjectId, scenario);
    // Refresh project history
    setProjects((prev) =>
      prev.map((p) =>
        p.id === activeProjectId
          ? { ...p, simulation_history: [sim, ...(p.simulation_history || [])] }
          : p
      )
    );
    return sim;
  };

  const handleCopilotChat = async (message: string, provider: 'local' | 'meta' = 'local') => {
    if (!activeProjectId) throw new Error('No active project');
    const res = await api.copilotChat(activeProjectId, message, provider);
    if (res.project) {
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? res.project : p)));
    }
    return { reply: res.reply, actions_executed: res.actions_executed, provider: res.provider };
  };

  const handleUpdateComponentPosition = async (instanceId: string, position: { x: number; y: number }) => {
    if (!activeProjectId) return;
    try {
      const updated = await api.updateComponentPosition(activeProjectId, instanceId, position);
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updated : p)));
    } catch (err: any) {
      setErrorMessage(`Update position failed: ${err.message}`);
    }
  };

  const handleAutoLayout = async () => {
    if (!activeProjectId) return;
    try {
      const updated = await api.autoLayout(activeProjectId);
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? updated : p)));
    } catch (err: any) {
      setErrorMessage(`Auto-layout failed: ${err.message}`);
    }
  };

  const handleAutoRepair = async () => {
    if (!activeProjectId) return;
    try {
      const result = await api.repairProject(activeProjectId);
      setProjects((prev) => prev.map((p) => (p.id === activeProjectId ? result.project : p)));
    } catch (err: any) {
      setErrorMessage(`Auto-repair failed: ${err.message}`);
    }
  };

  const handleSelectSample = (prompt: string, name: string) => {
    setInitialPrompt(prompt);
    setInitialName(name);
    setView('new-project');
  };

  return (
    <div className="min-h-screen bg-[#090D12] dark:bg-[#090D12] bg-[#F8FAFC] text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 flex flex-col transition-colors">
      <Header
        project={activeProject}
        health={health}
        onNavigate={(newView) => setView(newView)}
        currentView={view}
        onOpenCopilot={view === 'workspace' ? () => setIsCopilotOpen(!isCopilotOpen) : undefined}
        isCopilotOpen={isCopilotOpen}
        onStartNew={() => {
          setInitialPrompt('');
          setInitialName('My ESP32 Project');
          setView('new-project');
        }}
      />

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="bg-rose-950/90 border-b border-rose-800 text-rose-200 px-4 py-2.5 text-xs font-mono flex items-center justify-between z-50">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Main Views */}
      <main className="flex-1 overflow-auto">
        {view === 'landing' && (
          <LandingView
            onStartNew={() => {
              setInitialPrompt('');
              setInitialName('My ESP32 Project');
              setView('new-project');
            }}
            onSelectSample={handleSelectSample}
            catalog={catalog}
          />
        )}

        {view === 'dashboard' && (
          <DashboardView
            projects={projects}
            onOpenProject={handleOpenProject}
            onNewProject={() => {
              setInitialPrompt('');
              setInitialName('My ESP32 Project');
              setView('new-project');
            }}
            onDeleteProject={handleDeleteProject}
          />
        )}

        {view === 'new-project' && (
          <NewProjectView
            initialPrompt={initialPrompt}
            initialName={initialName}
            onBack={() => setView('dashboard')}
            onSubmit={handleCreateAndSynthesize}
          />
        )}

        {view === 'workspace' && activeProject && (
          <WorkspaceView
            project={activeProject}
            catalog={catalog}
            onUpdateProject={handleUpdateProject}
            onAddComponent={handleAddComponent}
            onRemoveComponent={handleRemoveComponent}
            onRefreshValidation={handleRefreshValidation}
            onRunSimulation={handleRunSimulation}
            onCopilotChat={handleCopilotChat}
            isCopilotOpen={isCopilotOpen}
            onToggleCopilot={() => setIsCopilotOpen(!isCopilotOpen)}
            onUpdatePosition={handleUpdateComponentPosition}
            onAutoLayout={handleAutoLayout}
            onAutoRepair={handleAutoRepair}
            onDeleteProject={handleDeleteProject}
          />
        )}
      </main>
    </div>
  );
};

export default App;

