import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Project, SimulationRun, DebugDiagnosis } from './types';
import { 
  planProject, 
  fetchProjects, 
  fetchProject, 
  simulateProject, 
  injectDefect, 
  diagnoseProject, 
  applyRepairPatch,
  updateProjectFirmware,
  seedDemoProject,
  deleteProject as apiDeleteProject
} from './api/client';
import { StorageService } from './services/storage';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { DashboardView, ProjectSummary } from './components/DashboardView';
import { NewProjectView } from './components/NewProjectView';
import { OverviewView } from './components/OverviewView';
import { ComponentsView } from './components/ComponentsView';
import { WiringView } from './components/WiringView';
import { FirmwareView } from './components/FirmwareView';
import { SimulationView } from './components/SimulationView';
import { GuideView } from './components/GuideView';
import { DmaiMemoryView } from './components/DmaiMemoryView';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { AiDebuggerModal } from './components/AiDebuggerModal';
import { LandingView } from './components/LandingView';
import { useToast } from './context/ToastContext';
import confetti from 'canvas-confetti';
import { AlertCircle, ArrowLeft, Layers } from 'lucide-react';

type RouteState = 
  | { page: 'landing' }
  | { page: 'dashboard' }
  | { page: 'new' }
  | { page: 'project'; projectId: string }
  | { page: 'not-found' };

function parseHashRoute(hash: string): RouteState {
  const cleanHash = hash.trim();
  if (cleanHash === '#/landing' || !cleanHash || cleanHash === '#' || cleanHash === '#/') {
    return { page: 'landing' };
  }
  if (cleanHash === '#/dashboard') {
    return { page: 'dashboard' };
  }
  if (cleanHash === '#/new') {
    return { page: 'new' };
  }
  if (cleanHash.startsWith('#/project/')) {
    const id = cleanHash.replace('#/project/', '').trim();
    if (id) return { page: 'project', projectId: id };
  }
  return { page: 'not-found' };
}

export const App: React.FC = () => {
  const { toast } = useToast();

  // Active Project & Tab
  const [project, setProject] = useState<Project | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('wiring');
  const [projectsList, setProjectsList] = useState<ProjectSummary[]>([]);
  
  // Routing State
  const [currentHash, setCurrentHash] = useState<string>(() => 
    typeof window !== 'undefined' ? (window.location.hash || '#/') : '#/'
  );
  const routeState = parseHashRoute(currentHash);

  // Stale async response guard
  const activeRequestIdRef = useRef<number>(0);
  const planAbortControllerRef = useRef<AbortController | null>(null);
  
  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [simRun, setSimRun] = useState<SimulationRun | null>(null);

  // Debugger modal states
  const [debuggerOpen, setDebuggerOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DebugDiagnosis | null>(null);
  const [applyingPatch, setApplyingPatch] = useState(false);

  // Collapsible sidebar preferences
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem('circuitmind_sidebar_collapsed') === 'true';
  });

  // Responsive copilot & mobile drawer states
  const [isCopilotOpen, setIsCopilotOpen] = useState<boolean>(() => 
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Navigation Helper
  const navigateTo = useCallback((hash: string) => {
    if (typeof window !== 'undefined') {
      window.location.hash = hash;
    }
  }, []);

  // Listen to browser hash changes (Back / Forward navigation)
  useEffect(() => {
    const handleHashChange = () => {
      setCurrentHash(window.location.hash || '#/');
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // Persist sidebar collapsed preference
  const toggleSidebarCollapse = useCallback(() => {
    setIsSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('circuitmind_sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Responsive resize watcher
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsCopilotOpen(false);
      } else {
        setIsCopilotOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Hydrate projects list from IndexedDB and sync with backend SQLite
  const refreshProjectsList = useCallback(async () => {
    try {
      // 1. Local IndexedDB
      const localProjects = await StorageService.getAllProjects();
      
      if (localProjects.length > 0) {
        const summaries: ProjectSummary[] = localProjects.map(p => ({
          id: p.id,
          title: p.title,
          description: p.description,
          board_type: p.board.type,
          version: p.version,
          components_count: p.components ? p.components.length : 0,
          status: p.validation?.status || 'draft',
          updated_at: p.updated_at
        }));
        setProjectsList(summaries);
        return localProjects;
      } else {
        // 2. Fallback to backend SQLite
        const serverList = await fetchProjects();
        if (serverList.length > 0) {
          const summaries: ProjectSummary[] = serverList.map(p => ({
            id: p.id,
            title: p.title,
            description: p.description,
            board_type: p.board_type,
            version: p.version,
            components_count: 0,
            status: 'draft'
          }));
          setProjectsList(summaries);
          return null;
        } else {
          setProjectsList([]);
          return [];
        }
      }
    } catch (e) {
      console.error('Project hydration notice:', e);
      return [];
    }
  }, []);

  useEffect(() => {
    refreshProjectsList();
  }, [refreshProjectsList]);

  // Sync routeState.projectId to state
  useEffect(() => {
    if (routeState.page === 'project') {
      const targetId = routeState.projectId;
      if (project && project.id === targetId) {
        // Already loaded
        return;
      }

      let isCurrent = true;
      setLoading(true);

      const load = async () => {
        try {
          let p = await StorageService.getProject(targetId);
          if (!p) {
            p = await fetchProject(targetId);
            if (p) await StorageService.saveProject(p);
          }
          if (!isCurrent) return;
          if (p) {
            setProject(p);
            setSimRun(null);
            try {
              const runs = await StorageService.getSimulationRuns(p.id);
              const validRun = runs.find(r => r.project_id === p.id && r.version === p.version);
              if (validRun) setSimRun(validRun);
            } catch {
              // ignore simulation cache miss
            }
          } else {
            setProject(null);
          }
        } catch (err) {
          console.error('Error loading project for route:', err);
          if (isCurrent) setProject(null);
        } finally {
          if (isCurrent) setLoading(false);
        }
      };

      load();
      return () => {
        isCurrent = false;
      };
    } else {
      // Navigating away from project view (e.g. to #/new or #/dashboard): clear any stale loading state
      setLoading(false);
    }
  }, [routeState]);

  // Sync active project updates to IndexedDB
  useEffect(() => {
    if (project) {
      StorageService.saveProject(project).catch(err => {
        console.error('IndexedDB background sync warning:', err);
      });
    }
  }, [project]);

  // Cancel any ongoing project synthesis
  const handleCancelPlan = useCallback(() => {
    if (planAbortControllerRef.current) {
      planAbortControllerRef.current.abort();
      planAbortControllerRef.current = null;
    }
    setLoading(false);
    toast.info('Project synthesis cancelled.', 'Cancelled');
  }, []);

  // 1. Synthesize project from natural-language prompt
  const handlePlan = async (promptText: string) => {
    if (planAbortControllerRef.current) {
      planAbortControllerRef.current.abort();
    }
    const controller = new AbortController();
    planAbortControllerRef.current = controller;

    const reqId = ++activeRequestIdRef.current;
    try {
      setLoading(true);
      toast.info('Synthesizing circuit components, pin assignments, firmware, and simulation...', 'CircuitMind AI');
      const newProj = await planProject(promptText, undefined, controller.signal);
      if (reqId !== activeRequestIdRef.current) return;

      await StorageService.saveProject(newProj);
      await StorageService.recordEngineeringEvent({
        project_id: newProj.id,
        event_type: 'PROJECT_SYNTHESIZED',
        summary: `Synthesized new project "${newProj.title}" via AI planner`,
        payload: { prompt: promptText, components_count: newProj.components.length },
        project_version: newProj.version
      });

      setProject(newProj);
      setCurrentTab('wiring');
      setSimRun(null);
      await refreshProjectsList();
      toast.success(`Successfully planned "${newProj.title}" with ${newProj.components.length} components!`, 'Project Ready');
      
      // Navigate to project workspace
      navigateTo(`#/project/${newProj.id}`);
    } catch (err: unknown) {
      if (controller.signal.aborted) {
        return;
      }
      if (reqId !== activeRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to synthesize circuit';
      toast.error(msg, 'Planning Failed');
      throw err; // Allow NewProjectView to capture and display error banner
    } finally {
      if (planAbortControllerRef.current === controller) {
        planAbortControllerRef.current = null;
      }
      setLoading(false); // ALWAYS release loading lock
    }
  };

  // 2. Open project
  const handleOpenProject = (id: string) => {
    navigateTo(`#/project/${id}`);
  };

  // 3. Delete project
  const handleDeleteProject = async (id: string) => {
    try {
      await StorageService.deleteProject(id);
      try {
        await apiDeleteProject(id);
      } catch {
        // Project might have been client-local
      }
      await refreshProjectsList();
      if (project && project.id === id) {
        setProject(null);
        navigateTo('#/dashboard');
      }
      toast.success('Project deleted from storage', 'Project Removed');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project';
      toast.error(msg, 'Delete Error');
      throw err;
    }
  };

  // 4. Duplicate project
  const handleDuplicateProject = async (id: string) => {
    try {
      const copy = await StorageService.duplicateProject(id);
      await refreshProjectsList();
      toast.success(`Duplicated project as "${copy.title}"`, 'Project Duplicated');
      navigateTo(`#/project/${copy.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate project';
      toast.error(msg, 'Duplicate Error');
      throw err;
    }
  };

  // 5. Rename project
  const handleRenameProject = async (id: string, newTitle: string) => {
    try {
      const updated = await StorageService.renameProject(id, newTitle);
      if (project && project.id === id) {
        setProject(updated);
      }
      await refreshProjectsList();
      toast.success(`Renamed to "${newTitle}"`, 'Project Updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rename project';
      toast.error(msg, 'Rename Error');
      throw err;
    }
  };

  // 6. Explicit load of demonstration fixture
  const handleLoadDemoProject = async (demoType: string = 'parking') => {
    const reqId = ++activeRequestIdRef.current;
    try {
      setLoading(true);
      toast.info('Loading demonstration fixture from server...', 'Sample Fixture');
      const demoProj = await seedDemoProject(demoType);
      if (reqId !== activeRequestIdRef.current) return;
      await StorageService.saveProject(demoProj);
      setProject(demoProj);
      setCurrentTab('wiring');
      setSimRun(null);
      await refreshProjectsList();
      toast.success(`Loaded "${demoProj.title}" fixture successfully!`, 'Demo Ready');
      navigateTo(`#/project/${demoProj.id}`);
    } catch (err: unknown) {
      if (reqId !== activeRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'Failed to load demo fixture';
      toast.error(msg, 'Fixture Error');
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  // 7. Project state mutations from canvas or inspector
  const handleUpdateProject = (updated: Project) => {
    setProject(updated);
    StorageService.saveProject(updated).catch(err => {
      console.error('Failed to sync updated project to IndexedDB:', err);
    });
    refreshProjectsList();
  };

  // 8. Save Firmware Code directly from in-browser editor
  const handleSaveFirmware = async (filename: string, code: string) => {
    if (!project) return;
    try {
      try {
        await updateProjectFirmware(project.id, filename, code);
      } catch {
        console.warn('Backend firmware sync offline, persisting locally in IndexedDB');
      }

      const updatedFirmware = [...project.firmware];
      const foundIdx = updatedFirmware.findIndex(f => f.filename === filename);
      if (foundIdx >= 0) {
        updatedFirmware[foundIdx] = {
          ...updatedFirmware[foundIdx],
          code,
          version: updatedFirmware[foundIdx].version + 1
        };
      } else {
        updatedFirmware.push({
          filename,
          code,
          language: 'cpp',
          libraries: [],
          entry_point: filename,
          version: 1
        });
      }

      const updatedProject: Project = {
        ...project,
        firmware: updatedFirmware,
        version: project.version + 1,
        updated_at: new Date().toISOString()
      };

      await StorageService.saveProject(updatedProject);
      await StorageService.recordEngineeringEvent({
        project_id: project.id,
        event_type: 'FIRMWARE_EDITED',
        summary: `Saved custom firmware edits to ${filename} (v${updatedProject.version})`,
        payload: { filename, code_length: code.length },
        project_version: updatedProject.version
      });

      setProject(updatedProject);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save firmware';
      throw new Error(msg);
    }
  };

  // 9. Run Behavioral Simulation
  const handleSimulate = async () => {
    if (!project) return;
    const reqId = ++activeRequestIdRef.current;
    try {
      setSimulating(true);
      toast.info('Running Wokwi behavioral simulation...', 'Simulation Engine');
      const run = await simulateProject(project.id);
      if (reqId !== activeRequestIdRef.current) return;
      
      setSimRun(run);
      await StorageService.saveSimulationRun(run);

      const passedTests = run.test_results?.filter(t => t.status === 'passed').length ?? 0;
      const totalTests = run.test_results?.length ?? 0;

      await StorageService.recordEngineeringEvent({
        project_id: project.id,
        event_type: 'SIMULATION_EXECUTED',
        summary: `Simulation completed with status: ${run.status} (${passedTests}/${totalTests} tests passed)`,
        payload: { 
          status: run.status, 
          passed: passedTests, 
          total: totalTests,
          log_count: run.serial_logs?.length ?? 0
        },
        project_version: project.version
      });

      const updatedProject: Project = {
        ...project,
        sim_status: run.status
      };
      setProject(updatedProject);
      await StorageService.saveProject(updatedProject);

      if (run.status === 'passed') {
        confetti({
          particleCount: 60,
          spread: 60,
          origin: { y: 0.7 }
        });
        toast.success(`Simulation passed! All ${passedTests} behavioral tests verified.`, 'Passed');
      } else {
        toast.error(`Simulation failed! ${totalTests - passedTests} tests failed. Click "Debug" to diagnose.`, 'Failed');
      }
    } catch (err: unknown) {
      if (reqId !== activeRequestIdRef.current) return;
      const msg = err instanceof Error ? err.message : 'Simulation error';
      toast.error(msg, 'Execution Failed');
    } finally {
      if (reqId === activeRequestIdRef.current) {
        setSimulating(false);
      }
    }
  };

  // 10. Inject Defect
  const handleInjectDefect = async (defectType: string = 'stuck_pin') => {
    if (!project) return;
    try {
      toast.info(`Injecting "${defectType}" defect into simulation environment...`, 'Fault Injection');
      const updated = await injectDefect(project.id, defectType);
      setProject(updated);
      await StorageService.saveProject(updated);
      await StorageService.recordEngineeringEvent({
        project_id: project.id,
        event_type: 'DEFECT_INJECTED',
        summary: `Injected fault model "${defectType}" into project`,
        payload: { defect_type: defectType },
        project_version: updated.version
      });
      toast.warning(`Defect "${defectType}" injected! Run simulation to inspect failure.`, 'Fault Injected');
      setCurrentTab('simulation');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to inject defect';
      toast.error(msg, 'Fault Error');
    }
  };

  // 11. Diagnose Defect
  const handleOpenDebugger = async () => {
    if (!project) return;
    try {
      toast.info('AI reasoning engine analyzing circuit schematic, firmware, and execution trace...', 'Automated Diagnosis');
      const diagRes = await diagnoseProject(project.id);
      if ('root_cause' in diagRes) {
        setDiagnosis(diagRes as DebugDiagnosis);
        setDebuggerOpen(true);
      } else {
        toast.info(diagRes.message || 'No active defects detected in circuit.', 'Diagnostics');
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Diagnosis failed';
      toast.error(msg, 'Diagnosis Error');
    }
  };

  // 12. Apply Repair Patch
  const handleApplyPatch = async (diag: DebugDiagnosis) => {
    if (!project) return;
    try {
      setApplyingPatch(true);
      toast.info('Applying firmware repair patch...', 'Applying Fix');
      const repaired = await applyRepairPatch(project.id, diag);
      setProject(repaired);
      await StorageService.saveProject(repaired);
      await StorageService.recordEngineeringEvent({
        project_id: project.id,
        event_type: 'PATCH_APPLIED',
        summary: `Applied repair patch for defect "${diag.root_cause}"`,
        payload: { defect_type: diag.defect_type, root_cause: diag.root_cause },
        project_version: repaired.version
      });
      setDebuggerOpen(false);
      setDiagnosis(null);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      toast.success('Defect resolved! Circuit re-verified successfully.', 'Repair Complete');
      setCurrentTab('simulation');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error applying patch';
      toast.error(msg, 'Patch Error');
    } finally {
      setApplyingPatch(false);
    }
  };

  // 13. AI Chat Copilot Modification
  const handleModify = async (instruction: string) => {
    if (!project) return;
    try {
      setModifying(true);
      toast.info('AI synthesizing requested hardware modifications...', 'Circuit Modification');
      const updated = await planProject(`${instruction} (Existing Project ID: ${project.id})`);
      setProject(updated);
      await StorageService.saveProject(updated);
      toast.success('Project updated with requested hardware changes', 'Modifications Applied');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to apply modifications';
      toast.error(msg, 'Modification Error');
    } finally {
      setModifying(false);
    }
  };

  if (routeState.page === 'landing') {
    return (
      <LandingView 
        onPlan={handlePlan}
        loading={loading}
        recentProjects={projectsList}
        onLoadProject={handleOpenProject}
        onLoadDemo={handleLoadDemoProject}
        onNewProject={() => navigateTo('#/new')}
        onNavigateToDashboard={() => navigateTo('#/dashboard')}
        onNavigateToProject={(id) => navigateTo(`#/project/${id}`)}
      />
    );
  }

  return (
    <div className="app-shell">
      {/* Top Navbar */}
      <Navbar 
        project={routeState.page === 'project' ? project : null} 
        onSimulate={handleSimulate} 
        onNewProject={() => navigateTo('#/new')}
        onOpenDashboard={() => navigateTo('#/dashboard')}
        simulating={simulating}
        onToggleSidebar={() => setIsMobileSidebarOpen(prev => !prev)}
        onToggleCopilot={() => setIsCopilotOpen(prev => !prev)}
        isCopilotOpen={isCopilotOpen}
      />

      {/* Main Layout Body */}
      {routeState.page === 'dashboard' && (
        <div className={`app-body ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} copilot-collapsed`}>
          {/* Backdrop for mobile drawer */}
          <div 
            className={`drawer-backdrop ${isMobileSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Left Sidebar */}
          <Sidebar 
            currentRoute={currentHash}
            onNavigate={navigateTo}
            project={project}
            currentTab={currentTab} 
            onSelectTab={setCurrentTab} 
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            unresolvedDefects={simRun?.status === 'failed'}
            isOpenOnMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Dashboard View */}
          <main className="workspace" style={{ padding: '24px 32px' }}>
            <DashboardView 
              projects={projectsList}
              loading={loading}
              onOpenProject={handleOpenProject}
              onNewProject={() => navigateTo('#/new')}
              onDeleteProject={handleDeleteProject}
              onDuplicateProject={handleDuplicateProject}
              onRenameProject={handleRenameProject}
              onLoadDemo={handleLoadDemoProject}
              onRefresh={refreshProjectsList}
            />
          </main>
        </div>
      )}

      {routeState.page === 'new' && (
        <div className={`app-body ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} copilot-collapsed`}>
          {/* Backdrop for mobile drawer */}
          <div 
            className={`drawer-backdrop ${isMobileSidebarOpen ? 'active' : ''}`}
            onClick={() => setIsMobileSidebarOpen(false)}
          />

          {/* Left Sidebar */}
          <Sidebar 
            currentRoute={currentHash}
            onNavigate={navigateTo}
            project={project}
            currentTab={currentTab} 
            onSelectTab={setCurrentTab} 
            isCollapsed={isSidebarCollapsed}
            onToggleCollapse={toggleSidebarCollapse}
            unresolvedDefects={simRun?.status === 'failed'}
            isOpenOnMobile={isMobileSidebarOpen}
            onCloseMobile={() => setIsMobileSidebarOpen(false)}
          />

          {/* Dedicated New Project Page */}
          <main className="workspace" style={{ padding: '24px 32px' }}>
            <NewProjectView 
              onGenerate={handlePlan}
              onCancel={() => navigateTo('#/dashboard')}
              onCancelSynthesis={handleCancelPlan}
              loading={loading}
            />
          </main>
        </div>
      )}

      {routeState.page === 'project' && (
        !project ? (
          <div className="workspace" style={{ padding: '60px 20px', textAlign: 'center' }}>
            {loading ? (
              <div style={{ color: 'var(--text-secondary)' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px', color: '#fff' }}>Loading Project...</div>
                <div style={{ fontSize: '13px' }}>Fetching circuit schematic, pin assignments, and firmware.</div>
              </div>
            ) : (
              <div style={{ maxWidth: '460px', margin: '0 auto', background: 'var(--bg-card)', padding: '36px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                <AlertCircle size={36} color="var(--status-warning)" style={{ marginBottom: '14px' }} />
                <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>Project Not Found</h2>
                <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
                  The requested project ID could not be located in local IndexedDB storage or the server database.
                </p>
                <button className="btn btn-primary" onClick={() => navigateTo('#/dashboard')}>
                  <ArrowLeft size={15} />
                  <span>Return to Dashboard</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`app-body ${isSidebarCollapsed ? 'sidebar-collapsed' : ''} ${!isCopilotOpen ? 'copilot-collapsed' : ''}`}>
            {/* Backdrop for mobile & tablet overlay drawers */}
            <div 
              className={`drawer-backdrop ${(isMobileSidebarOpen || (isCopilotOpen && typeof window !== 'undefined' && window.innerWidth < 1024)) ? 'active' : ''}`}
              onClick={() => {
                setIsMobileSidebarOpen(false);
                if (window.innerWidth < 1024) setIsCopilotOpen(false);
              }}
            />

            {/* Left Sidebar */}
            <Sidebar 
              currentRoute={currentHash}
              onNavigate={navigateTo}
              project={project} 
              currentTab={currentTab} 
              onSelectTab={setCurrentTab} 
              isCollapsed={isSidebarCollapsed}
              onToggleCollapse={toggleSidebarCollapse}
              unresolvedDefects={simRun?.status === 'failed'}
              isOpenOnMobile={isMobileSidebarOpen}
              onCloseMobile={() => setIsMobileSidebarOpen(false)}
            />

            {/* Central Workspace */}
            <main className="workspace">
              {currentTab === 'wiring' && (
                <WiringView project={project} onUpdateProject={handleUpdateProject} />
              )}
              {currentTab === 'overview' && (
                <OverviewView 
                  project={project} 
                  onSelectTab={setCurrentTab} 
                  onSimulate={handleSimulate} 
                />
              )}
              {currentTab === 'components' && (
                <ComponentsView project={project} onUpdateProject={handleUpdateProject} />
              )}
              {currentTab === 'firmware' && (
                <FirmwareView 
                  project={project} 
                  onSaveFirmware={handleSaveFirmware}
                  proposedPatch={diagnosis?.patch_diff}
                  onApplyPatch={() => diagnosis && handleApplyPatch(diagnosis)}
                  onDiscardPatch={() => setDiagnosis(null)}
                />
              )}
              {(currentTab === 'simulation' || (currentTab as string) === 'verification') && (
                <SimulationView 
                  project={project} 
                  simRun={simRun} 
                  onSimulate={handleSimulate} 
                  simulating={simulating} 
                  onInjectDefect={handleInjectDefect}
                  onOpenDebugger={handleOpenDebugger}
                />
              )}
              {currentTab === 'guide' && (
                <GuideView project={project} />
              )}
              {currentTab === 'memory' && (
                <DmaiMemoryView project={project} />
              )}
            </main>

            {/* Right State-Aware Assistant */}
            <AiAssistantPanel 
              project={project} 
              onModify={handleModify} 
              onUpdateProject={handleUpdateProject} 
              onSimulate={handleSimulate} 
              onInjectDefect={handleInjectDefect} 
              modifying={modifying} 
              isOpen={isCopilotOpen}
              onClose={() => setIsCopilotOpen(false)}
            />
          </div>
        )
      )}

      {routeState.page === 'not-found' && (
        <div className="workspace" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{ maxWidth: '440px', margin: '0 auto', background: 'var(--bg-card)', padding: '36px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <Layers size={36} color="var(--accent-orange)" style={{ marginBottom: '14px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>Page Not Found</h2>
            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '20px', lineHeight: 1.5 }}>
              The route "{currentHash}" is not recognized.
            </p>
            <button className="btn btn-primary" onClick={() => navigateTo('#/dashboard')}>
              <ArrowLeft size={15} />
              <span>Back to Dashboard</span>
            </button>
          </div>
        </div>
      )}

      {/* AI Debugger Modal */}
      {debuggerOpen && project && (
        <AiDebuggerModal 
          project={project} 
          diagnosis={diagnosis} 
          onApplyPatch={handleApplyPatch} 
          onClose={() => setDebuggerOpen(false)} 
          applying={applyingPatch} 
        />
      )}
    </div>
  );
};

export default App;
