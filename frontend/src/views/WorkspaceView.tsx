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
} from 'lucide-react';
import { Project, CatalogComponent, SimulationArtifact } from '../types';
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
  onCopilotChat: (message: string, provider?: 'local' | 'meta') => Promise<{ reply: string; actions_executed: string[]; provider?: string }>;
  isCopilotOpen: boolean;
  onToggleCopilot: () => void;
  onUpdatePosition?: (instanceId: string, position: { x: number; y: number }) => Promise<void>;
  onAutoLayout?: () => Promise<void>;
  onAutoRepair?: () => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
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
    <div className="h-[calc(100vh-3.5rem)] flex flex-col bg-[#090D12] dark:bg-[#090D12] bg-[#F8FAFC] overflow-hidden transition-colors">
      {/* Workspace Sub-Header Tab Bar */}
      <div className="h-11 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-white px-4 flex items-center justify-between select-none z-20 transition-colors">
        <nav className="flex items-center space-x-1 overflow-x-auto no-scrollbar font-mono text-xs">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 border border-[#356B62]/60 shadow-sm font-semibold'
                  : 'text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900 hover:bg-[#151F2B]/40 dark:hover:bg-[#151F2B]/40 hover:bg-slate-100'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span className="text-[10px] font-bold bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 text-[#5B9B8D] px-1.5 py-0.2 rounded-full ml-1">
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
                className="flex items-center space-x-1 bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 hover:bg-[#1F2D3D] dark:hover:bg-[#1F2D3D] hover:bg-slate-200 border border-[#25332F] dark:border-[#25332F] border-slate-300 text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 px-2.5 py-1 rounded-md text-xs font-mono transition-colors"
              >
                <Plus className="w-3.5 h-3.5 text-[#5B9B8D]" />
                <span className="hidden sm:inline">Add Part</span>
              </button>

              <button
                onClick={() => setIsInspectorOpen(!isInspectorOpen)}
                className="p-1 text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900 rounded-md hover:bg-[#151F2B] dark:hover:bg-[#151F2B] hover:bg-slate-100 transition-colors"
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
              onUpdateProject={onUpdateProject}
              onDeleteProject={onDeleteProject}
            />
          )}
        </div>

        {/* Collapsible Component Inspector (Canvas Tab only) */}
        {activeTab === 'canvas' && isInspectorOpen && (
          <div className="w-80 h-full border-l border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-white z-10 transition-colors">
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
      />

      {/* Add Component Catalog Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl transition-colors">
            <div className="flex items-center justify-between border-b border-[#25332F] dark:border-[#25332F] border-slate-200 pb-3">
              <h3 className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">
                Select Component from Catalog
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-[#96A6A3] hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] text-slate-500 hover:text-slate-900"
              >
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
                  className="bg-[#151F2B] dark:bg-[#151F2B] bg-slate-50 hover:border-[#356B62] border border-[#25332F] dark:border-[#25332F] border-slate-200 p-3 rounded-xl cursor-pointer transition-colors space-y-1 group"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#5B9B8D]">{item.catalog_id}</span>
                    <span className="text-[10px] uppercase text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 bg-[#101720] dark:bg-[#101720] bg-white px-2 py-0.5 rounded border border-[#25332F] dark:border-[#25332F] border-slate-200">
                      {item.category}
                    </span>
                  </div>
                  <div className="text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-medium">{item.name}</div>
                  <div className="text-[11px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 line-clamp-1">{item.description}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
