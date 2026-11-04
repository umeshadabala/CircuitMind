import React, { useState } from 'react';
import {
  Layers,
  FileCode,
  Package,
  Code2,
  ShieldCheck,
  Activity,
  Wrench,
  Settings,
  Plus,
  PanelRightClose,
  PanelRightOpen,
  Sparkles,
} from 'lucide-react';
import { Project, CatalogComponent, SimulationArtifact, AIProvider, HealthResponse } from '../types';
import { CanvasPanel } from './panels/CanvasPanel';
import { InspectorPanel } from './panels/InspectorPanel';
import { NetlistPanel } from './panels/NetlistPanel';
import { BomPanel } from './panels/BomPanel';
import { FirmwarePanel } from './panels/FirmwarePanel';
import { ValidationPanel } from './panels/ValidationPanel';
import { SimulationPanel } from './panels/SimulationPanel';
import { AssemblyGuidePanel } from './panels/AssemblyGuidePanel';
import { SettingsPanel } from './panels/SettingsPanel';
import { CopilotDrawer } from './panels/CopilotDrawer';

interface WorkspaceViewProps {
  project: Project;
  catalog: CatalogComponent[];
  onUpdateProject: (data: Partial<Project>) => Promise<void>;
  onAddComponent: (catalogId: string) => Promise<void>;
  onRemoveComponent: (instanceId: string) => Promise<void>;
  onRefreshValidation: () => Promise<void>;
  onRunSimulation: (scenario?: string) => Promise<SimulationArtifact>;
  onCopilotChat: (message: string, provider?: AIProvider) => Promise<{ reply: string; actions_executed: string[]; provider?: string }>;
  isCopilotOpen: boolean;
  onToggleCopilot: () => void;
  onUpdatePosition?: (instanceId: string, position: { x: number; y: number }) => Promise<void>;
  onAutoLayout?: () => Promise<void>;
  onAutoRepair?: () => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
  health?: HealthResponse | null;
  onRefreshHealth?: () => Promise<void>;
}

type TabType = 'canvas' | 'netlist' | 'bom' | 'firmware' | 'validation' | 'simulation' | 'guide' | 'settings';

export const WorkspaceView: React.FC<WorkspaceViewProps> = ({
  project,
  catalog,
  onUpdateProject,
  onAddComponent,
  onRemoveComponent,
  onRefreshValidation,
  onRunSimulation,
  onCopilotChat,
  isCopilotOpen,
  onToggleCopilot,
  onUpdatePosition,
  onAutoLayout,
  onAutoRepair,
  onDeleteProject,
  health,
  onRefreshHealth,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('canvas');
  const [selectedInstanceId, setSelectedInstanceId] = useState<string | null>(null);
  const [selectedNetId, setSelectedNetId] = useState<string | null>(null);
  const [isInspectorOpen, setIsInspectorOpen] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  const handleNavigateToComponent = (instanceId: string) => {
    setSelectedInstanceId(instanceId);
    setIsInspectorOpen(true);
    setActiveTab('canvas');
  };

  const handleNavigateToNet = (netId: string) => {
    setSelectedNetId(netId);
    setActiveTab('canvas');
  };

  const selectedComponent = project.components.find((c) => c.instance_id === selectedInstanceId) || null;
  const selectedCatalogPart = selectedComponent
    ? catalog.find((p) => p.catalog_id === selectedComponent.catalog_id)
    : undefined;

  const handleRefreshValidation = async () => {
    setIsValidating(true);
    try {
      await onRefreshValidation();
    } finally {
      setIsValidating(false);
    }
  };

  const handleAutoRepair = async () => {
    if (onAutoRepair && !isRepairing) {
      setIsRepairing(true);
      try {
        await onAutoRepair();
      } finally {
        setIsRepairing(false);
      }
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode; badge?: string | number }[] = [
    { id: 'canvas', label: 'Circuit Canvas', icon: <Layers className="w-4 h-4" /> },
    { id: 'netlist', label: 'Netlist', icon: <FileCode className="w-4 h-4" />, badge: project.nets.length },
    { id: 'bom', label: 'BOM', icon: <Package className="w-4 h-4" />, badge: project.components.length },
    { id: 'firmware', label: 'Firmware', icon: <Code2 className="w-4 h-4" /> },
    {
      id: 'validation',
      label: 'DRC Validation',
      icon: <ShieldCheck className="w-4 h-4" />,
      badge: project.validation_report?.findings?.length || 0,
    },
    { id: 'simulation', label: 'Simulation', icon: <Activity className="w-4 h-4" /> },
    { id: 'guide', label: 'Assembly Guide', icon: <Wrench className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#09090B] overflow-hidden">
      {/* Workspace Sub-Header Tab Bar */}
      <div className="h-11 border-b border-[#2A2A35] bg-[#111116] px-4 flex items-center justify-between select-none z-20">
        <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar font-mono text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#18181F] text-[#FAFAFA] border border-[#7C3AED]/40 shadow-sm'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181F]/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] font-bold bg-[#18181F] border border-[#2A2A35] text-zinc-300 px-1.5 py-0.2 rounded-full ml-1">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </nav>

        <div className="flex items-center space-x-2">
          {activeTab === 'canvas' && (
            <>
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center space-x-1 bg-[#18181F] hover:bg-[#2A2A35] border border-[#2A2A35] text-white px-2.5 py-1 rounded text-xs font-mono transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Add Part</span>
              </button>

              <button
                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                className="p-1 text-[#A1A1AA] hover:text-white rounded hover:bg-[#18181F]"
                title={isInspectorOpen ? 'Collapse inspector' : 'Open inspector'}
              >
                {isInspectorOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Main Workspace Body */}
      <div className="flex-1 relative overflow-hidden flex">
        <div className="flex-1 h-full overflow-hidden">
          {activeTab === 'canvas' && (
            <CanvasPanel
              project={project}
              catalog={catalog}
              selectedInstanceId={selectedInstanceId}
              selectedNetId={selectedNetId}
              onSelectComponent={(id) => {
                setSelectedInstanceId(id);
                if (id) setIsInspectorOpen(true);
              }}
              onSelectNet={(netId) => setSelectedNetId(netId)}
              onUpdatePosition={onUpdatePosition}
              onAutoLayout={onAutoLayout}
            />
          )}

          {activeTab === 'netlist' && (
            <NetlistPanel
              project={project}
              onNavigateToComponent={handleNavigateToComponent}
              onNavigateToNet={handleNavigateToNet}
            />
          )}
          {activeTab === 'bom' && (
            <BomPanel
              project={project}
              catalog={catalog}
              onNavigateToComponent={handleNavigateToComponent}
            />
          )}
          {activeTab === 'firmware' && <FirmwarePanel project={project} />}
          {activeTab === 'validation' && (
            <ValidationPanel
              project={project}
              onRefreshValidation={handleRefreshValidation}
              isValidating={isValidating}
              onAutoRepair={onAutoRepair ? handleAutoRepair : undefined}
              isRepairing={isRepairing}
              onNavigateToComponent={handleNavigateToComponent}
              onNavigateToNet={handleNavigateToNet}
            />
          )}
          {activeTab === 'simulation' && (
            <SimulationPanel project={project} onRunSimulation={onRunSimulation} />
          )}
          {activeTab === 'guide' && <AssemblyGuidePanel project={project} />}
          {activeTab === 'settings' && (
            <SettingsPanel
              project={project}
              health={health}
              onUpdateProject={onUpdateProject}
              onDeleteProject={onDeleteProject}
              onRefreshHealth={onRefreshHealth}
            />
          )}
        </div>

        {/* Collapsible Component Inspector (Canvas Tab only) */}
        {activeTab === 'canvas' && isInspectorOpen && (
          <div className="w-80 h-full border-l border-[#2A2A35] bg-[#111116] z-10">
            <InspectorPanel
              component={selectedComponent}
              catalogPart={selectedCatalogPart}
              nets={project.nets}
              onRemoveComponent={async (id) => {
                await onRemoveComponent(id);
                setSelectedInstanceId(null);
              }}
              onClose={() => setIsInspectorOpen(false)}
            />
          </div>
        )}
      </div>

      {/* Copilot Drawer */}
      <CopilotDrawer
        project={project}
        isOpen={isCopilotOpen}
        onClose={onToggleCopilot}
        onSendMessage={onCopilotChat}
        health={health}
      />

      {/* Add Component Catalog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#111116] border border-[#2A2A35] rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2A2A35] pb-3">
              <h3 className="font-mono text-sm font-bold text-white">Select Component from Catalog</h3>
              <button onClick={() => setShowAddModal(false)} className="text-zinc-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {catalog.map((item) => (
                <div
                  key={item.catalog_id}
                  onClick={async () => {
                    await onAddComponent(item.catalog_id);
                    setShowAddModal(false);
                  }}
                  className="bg-[#18181F] hover:bg-[#2A2A35] border border-[#2A2A35] p-3 rounded-lg cursor-pointer transition-colors space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#A78BFA]">{item.catalog_id}</span>
                    <span className="text-[10px] uppercase text-zinc-400 bg-[#111116] px-1.5 py-0.5 rounded border border-[#2A2A35]">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs text-white font-medium">{item.name}</div>
                  <div className="text-[11px] text-[#A1A1AA] line-clamp-1">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

