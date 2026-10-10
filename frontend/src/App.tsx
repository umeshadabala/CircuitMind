import React, { useState, useEffect } from 'react';
import { Project, SimulationRun, DebugDiagnosis } from './types';
import { 
  planProject, 
  fetchProjects, 
  fetchProject, 
  simulateProject, 
  injectDefect, 
  diagnoseProject, 
  applyRepairPatch 
} from './api/client';
import { Navbar } from './components/Navbar';
import { Sidebar, TabType } from './components/Sidebar';
import { LandingView } from './components/LandingView';
import { OverviewView } from './components/OverviewView';
import { ComponentsView } from './components/ComponentsView';
import { WiringView } from './components/WiringView';
import { FirmwareView } from './components/FirmwareView';
import { SimulationView } from './components/SimulationView';
import { VerificationView } from './components/VerificationView';
import { GuideView } from './components/GuideView';
import { DmaiMemoryView } from './components/DmaiMemoryView';
import { AiAssistantPanel } from './components/AiAssistantPanel';
import { AiDebuggerModal } from './components/AiDebuggerModal';
import confetti from 'canvas-confetti';

export const App: React.FC = () => {
  const [project, setProject] = useState<Project | null>(null);
  const [currentTab, setCurrentTab] = useState<TabType>('overview');
  const [recentProjects, setRecentProjects] = useState<Array<{ id: string; title: string; description: string; board_type: string; version: number }>>([]);
  
  // Loading & Action states
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [modifying, setModifying] = useState(false);
  const [simRun, setSimRun] = useState<SimulationRun | null>(null);

  // Debugger modal states
  const [debuggerOpen, setDebuggerOpen] = useState(false);
  const [diagnosis, setDiagnosis] = useState<DebugDiagnosis | null>(null);
  const [applyingPatch, setApplyingPatch] = useState(false);

  // Load recent projects on start
  const refreshProjectsList = async () => {
    try {
      const list = await fetchProjects();
      setRecentProjects(list);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    refreshProjectsList();
  }, []);

  // 1. Plan project from natural-language prompt
  const handlePlan = async (prompt: string) => {
    try {
      setLoading(true);
      const newProj = await planProject(prompt);
      setProject(newProj);
      setCurrentTab('overview');
      setSimRun(null);
      refreshProjectsList();
    } catch (err: any) {
      alert(`Error planning project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 2. Load existing project from SQLite
  const handleLoadProject = async (id: string) => {
    try {
      setLoading(true);
      const p = await fetchProject(id);
      setProject(p);
      setCurrentTab('overview');
      setSimRun(null);
    } catch (err: any) {
      alert(`Error loading project: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // 3. Run Behavioral Simulation & Tests
  const handleSimulate = async () => {
    if (!project) return;
    try {
      setSimulating(true);
      const run = await simulateProject(project.id);
      setSimRun(run);

      // Reload project state to reflect updated sim status
      const updatedProj = await fetchProject(project.id);
      setProject(updatedProj);

      if (run.status === 'passed') {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 }
        });
      } else if (run.status === 'failed') {
        // Automatically fetch diagnosis for failures
        const diag = await diagnoseProject(project.id);
        if ('root_cause' in diag) {
          setDiagnosis(diag as DebugDiagnosis);
        }
      }
    } catch (err: any) {
      alert(`Simulation error: ${err.message}`);
    } finally {
      setSimulating(false);
    }
  };

  // 4. Modify project via prompt (e.g. "Change warning threshold to 50 cm")
  const handleModify = async (instruction: string) => {
    if (!project) return;
    try {
      setModifying(true);
      const updated = await planProject(instruction, project.id);
      setProject(updated);
      setSimRun(null);
      refreshProjectsList();
    } catch (err: any) {
      alert(`Modification error: ${err.message}`);
    } finally {
      setModifying(false);
    }
  };

  // 5. Inject Demo Defect (Step 8 Scenario: Misassigned Buzzer Pin)
  const handleInjectDefect = async () => {
    if (!project) return;
    try {
      const defective = await injectDefect(project.id, 'misassigned_buzzer_pin');
      setProject(defective);
      
      // Immediately run simulation to capture defect evidence
      const run = await simulateProject(defective.id);
      setSimRun(run);
      
      // Analyze diagnosis
      const diag = await diagnoseProject(defective.id);
      if ('root_cause' in diag) {
        setDiagnosis(diag as DebugDiagnosis);
      }
      
      setCurrentTab('verification');
    } catch (err: any) {
      alert(`Error injecting defect: ${err.message}`);
    }
  };

  // 6. Open AI Debugger Modal
  const handleOpenDebugger = async () => {
    if (!project) return;
    const diag = await diagnoseProject(project.id);
    if ('root_cause' in diag) {
      setDiagnosis(diag as DebugDiagnosis);
      setDebuggerOpen(true);
    } else {
      alert('No active defects detected.');
    }
  };

  // 7. Apply Repair Patch & Re-Verify
  const handleApplyPatch = async (diag: DebugDiagnosis) => {
    if (!project) return;
    try {
      setApplyingPatch(true);
      const repaired = await applyRepairPatch(project.id, diag);
      setProject(repaired);
      setDebuggerOpen(false);
      setDiagnosis(null);

      // Re-run simulation immediately to prove the fix works!
      const run = await simulateProject(repaired.id);
      setSimRun(run);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });
      setCurrentTab('verification');
    } catch (err: any) {
      alert(`Error applying patch: ${err.message}`);
    } finally {
      setApplyingPatch(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '100vw', background: 'var(--bg-main)' }}>
      {/* Top Navbar */}
      <Navbar 
        project={project} 
        onSimulate={handleSimulate} 
        onNewProject={() => setProject(null)} 
        simulating={simulating}
      />

      {/* Main Layout */}
      {!project ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          <LandingView 
            onPlan={handlePlan} 
            loading={loading} 
            recentProjects={recentProjects} 
            onLoadProject={handleLoadProject} 
          />
        </div>
      ) : (
        <div className="app-container">
          {/* Left Sidebar */}
          <Sidebar 
            currentTab={currentTab} 
            onSelectTab={setCurrentTab} 
            unresolvedDefects={simRun?.status === 'failed'}
          />

          {/* Central Workspace */}
          <main className="workspace">
            {currentTab === 'overview' && (
              <OverviewView 
                project={project} 
                onSelectTab={setCurrentTab} 
                onSimulate={handleSimulate} 
              />
            )}
            {currentTab === 'components' && (
              <ComponentsView project={project} />
            )}
            {currentTab === 'wiring' && (
              <WiringView project={project} />
            )}
            {currentTab === 'firmware' && (
              <FirmwareView project={project} />
            )}
            {currentTab === 'simulation' && (
              <SimulationView 
                project={project} 
                simRun={simRun} 
                onSimulate={handleSimulate} 
                simulating={simulating} 
              />
            )}
            {currentTab === 'verification' && (
              <VerificationView 
                project={project} 
                simRun={simRun} 
                onSimulate={handleSimulate} 
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
            onSimulate={handleSimulate} 
            onInjectDefect={handleInjectDefect} 
            modifying={modifying} 
          />
        </div>
      )}

      {/* AI Debugger Modal */}
      {debuggerOpen && (
        <AiDebuggerModal 
          project={project!} 
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
