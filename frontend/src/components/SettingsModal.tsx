import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Sparkles,
  Server,
  ShieldCheck,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Cpu,
  Lock,
  Save,
  Trash2,
  AlertTriangle,
} from 'lucide-react';
import { Project, HealthResponse } from '../types';
import { api } from '../api/client';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project?: Project | null;
  health?: HealthResponse | null;
  onRefreshHealth?: () => Promise<void>;
  onUpdateProject?: (data: Partial<Project>) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  health,
  onRefreshHealth,
  onUpdateProject,
  onDeleteProject,
}) => {
  // NVIDIA NIM BYOK State
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [nvidiaModel, setNvidiaModel] = useState(health?.nvidia?.model || 'meta/muse-glimmer-30b');
  const [isSavingNvidia, setIsSavingNvidia] = useState(false);
  const [nvidiaSuccessMsg, setNvidiaSuccessMsg] = useState<string | null>(null);

  // Project Settings State (if opened with an active project)
  const [projectName, setProjectName] = useState(project?.name || '');
  const [projectDesc, setProjectDesc] = useState(project?.description || '');
  const [isSavingProject, setIsSavingProject] = useState(false);
  const [projectSuccessMsg, setProjectSuccessMsg] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (health?.nvidia?.model) {
      setNvidiaModel(health.nvidia.model);
    }
    if (project) {
      setProjectName(project.name);
      setProjectDesc(project.description || '');
    }
  }, [health?.nvidia?.model, project]);

  if (!isOpen) return null;

  const activeProvider = health?.active_provider || 'local';
  const isNvidiaActive = activeProvider === 'nvidia';

  const handleSwitchProvider = async (provider: 'local' | 'nvidia') => {
    try {
      await api.updateAIModels({ active_provider: provider });
      if (onRefreshHealth) await onRefreshHealth();
    } catch (err: any) {
      alert(`Failed to switch AI engine: ${err.message}`);
    }
  };

  const handleSaveNvidiaByok = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingNvidia(true);
    setNvidiaSuccessMsg(null);
    try {
      await api.updateAIModels({
        nvidia_api_key: nvidiaKey.trim(),
        nvidia_model: nvidiaModel.trim() || 'meta/muse-glimmer-30b',
        active_provider: nvidiaKey.trim() ? 'nvidia' : 'local',
      });
      if (onRefreshHealth) await onRefreshHealth();
      setNvidiaSuccessMsg(
        nvidiaKey.trim()
          ? 'NVIDIA API key configured & activated for Meta Muse Glimmer 30B!'
          : 'NVIDIA API key cleared for this session.'
      );
      setNvidiaKey('');
      setTimeout(() => setNvidiaSuccessMsg(null), 4000);
    } catch (err: any) {
      alert(`Failed to configure NVIDIA BYOK: ${err.message}`);
    } finally {
      setIsSavingNvidia(false);
    }
  };

  const handleSaveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project || !onUpdateProject) return;
    setIsSavingProject(true);
    setProjectSuccessMsg(false);
    try {
      await onUpdateProject({ name: projectName, description: projectDesc });
      setProjectSuccessMsg(true);
      setTimeout(() => setProjectSuccessMsg(false), 3000);
    } finally {
      setIsSavingProject(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#111116] border border-[#2A2A35] rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="p-4 border-b border-[#2A2A35] flex items-center justify-between bg-[#141419] rounded-t-xl">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#A78BFA]">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-mono text-sm font-bold text-white">CircuitMind Settings & Configuration</h2>
              <p className="text-[11px] text-[#A1A1AA] font-mono">
                Manage AI engines, NVIDIA NIM BYOK, and project metadata
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            {onRefreshHealth && (
              <button
                onClick={() => onRefreshHealth()}
                title="Refresh Engine Health"
                className="p-1.5 rounded-lg bg-[#18181F] border border-[#2A2A35] text-[#A1A1AA] hover:text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-[#18181F] border border-[#2A2A35] text-[#A1A1AA] hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* PRIVACY & SECURITY BANNER */}
          <div className="bg-[#18181F]/90 border border-[#7C3AED]/30 rounded-lg p-4 space-y-2">
            <div className="flex items-center space-x-2 text-[#A78BFA] font-mono text-xs font-bold uppercase tracking-wider">
              <Lock className="w-4 h-4 text-[#A78BFA]" />
              <span>Zero Personal Data Retention & No API Key Database</span>
            </div>
            <p className="text-xs text-[#D4D4D8] font-sans leading-relaxed">
              CircuitMind does <strong>not</strong> collect or store any personal data. There is <strong>no database</strong> storing API keys or credentials.
              All API keys are held strictly in temporary server runtime memory for your session or read directly from your backend <code className="text-[#A78BFA] font-mono">.env</code> file.
              You will always be asked to supply your API key per session for BYOK external cloud inference.
            </p>
          </div>

          {/* PRIMARY ENGINE SELECTOR */}
          <div className="border border-[#2A2A35] rounded-lg p-4 bg-[#141419] space-y-3">
            <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2">
              <span className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#A78BFA]" />
                <span>Primary AI Engine Selection</span>
              </span>
              <span className="text-[11px] text-zinc-400 font-mono">
                Applies to both Project Synthesis & Copilot
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                type="button"
                onClick={() => handleSwitchProvider('local')}
                className={`p-3.5 rounded-lg border font-mono text-xs transition-all flex flex-col items-start gap-1 text-left ${
                  !isNvidiaActive
                    ? 'bg-[#7C3AED]/20 border-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/10'
                    : 'bg-[#18181F] border-[#2A2A35] text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm w-full">
                  <Server className="w-4 h-4 text-[#A78BFA]" />
                  <span>Local Ollama</span>
                  {!isNvidiaActive && (
                    <span className="ml-auto text-[10px] bg-[#7C3AED] text-white px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-[#A78BFA] font-bold">muse-spark-open:cloud</div>
                <div className="text-[10px] text-zinc-400 font-sans pt-1">
                  Runs locally on your machine. Performs normal project synthesis & Copilot with zero cloud costs.
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSwitchProvider('nvidia')}
                className={`p-3.5 rounded-lg border font-mono text-xs transition-all flex flex-col items-start gap-1 text-left ${
                  isNvidiaActive
                    ? 'bg-emerald-950/40 border-emerald-500 text-white shadow-lg shadow-emerald-950/20'
                    : 'bg-[#18181F] border-[#2A2A35] text-zinc-400 hover:text-white hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center gap-1.5 font-bold text-sm w-full">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>NVIDIA NIM</span>
                  {isNvidiaActive && (
                    <span className="ml-auto text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded font-bold">
                      ACTIVE
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-emerald-300 font-bold">meta/muse-glimmer-30b</div>
                <div className="text-[10px] text-zinc-400 font-sans pt-1">
                  Cloud inference with Meta's 30B model via personal NVIDIA key. Powers normal synthesis & Copilot.
                </div>
              </button>
            </div>
          </div>

          {/* 1. NVIDIA NIM BYOK CONFIGURATION */}
          <form
            onSubmit={handleSaveNvidiaByok}
            className="border border-[#2A2A35] rounded-lg p-4 bg-[#141419] space-y-3.5"
          >
            <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2">
              <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>NVIDIA NIM — Meta Muse Glimmer 30B (BYOK)</span>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  health?.nvidia?.configured
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                }`}
              >
                {health?.nvidia?.configured ? 'SESSION KEY ACTIVE' : 'NO KEY SET'}
              </span>
            </div>

            <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed">
              Provide your personal NVIDIA API Key to use Meta's <strong className="text-white">Muse Glimmer 30B</strong> (<code className="text-[#A78BFA] font-mono">meta/muse-glimmer-30b</code>) via NVIDIA NIM.
              Because credentials are not stored in any database, please supply your key for this session or set <code className="text-[#A78BFA] font-mono">NVIDIA_API_KEY</code> in your root <code className="text-[#A78BFA] font-mono">.env</code>.
            </p>

            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-[#A1A1AA]">NVIDIA API Key (BYOK)</label>
              <div className="relative">
                <input
                  type={showNvidiaKey ? 'text' : 'password'}
                  placeholder={health?.nvidia?.configured ? '•••••••••••••••••••••••• (Configured in memory)' : 'nvapi-...'}
                  value={nvidiaKey}
                  onChange={(e) => setNvidiaKey(e.target.value)}
                  className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 pr-10 text-white placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="button"
                  onClick={() => setShowNvidiaKey(!showNvidiaKey)}
                  className="absolute right-3 top-2.5 text-zinc-500 hover:text-white"
                >
                  {showNvidiaKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex justify-between items-center text-[10px] text-zinc-500">
                <span>Held in runtime memory only. Free keys available at build.nvidia.com</span>
                {health?.nvidia?.configured && (
                  <button
                    type="button"
                    onClick={() => {
                      setNvidiaKey('');
                      api.updateAIModels({ nvidia_api_key: '' }).then(() => onRefreshHealth?.());
                    }}
                    className="text-rose-400 hover:underline"
                  >
                    Clear Key
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-[#A1A1AA]">Designated Model ID</label>
              <input
                type="text"
                value={nvidiaModel}
                onChange={(e) => setNvidiaModel(e.target.value)}
                className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 text-white focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="pt-1 flex items-center justify-between">
              <span className="font-mono text-[11px] text-zinc-500">
                Status: <strong className={health?.nvidia?.configured ? 'text-emerald-400' : 'text-zinc-400'}>
                  {health?.nvidia?.configured ? 'Ready for Copilot' : 'Awaiting Session Key'}
                </strong>
              </span>

              <button
                type="submit"
                disabled={isSavingNvidia || !nvidiaKey.trim()}
                className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-40"
              >
                <Key className="w-3.5 h-3.5" />
                <span>{isSavingNvidia ? 'Applying...' : 'Apply NVIDIA Key'}</span>
              </button>
            </div>

            {nvidiaSuccessMsg && (
              <div className="flex items-center gap-2 p-2.5 bg-emerald-950/40 border border-emerald-800/60 rounded text-emerald-300 font-mono text-xs">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>{nvidiaSuccessMsg}</span>
              </div>
            )}
          </form>

          {/* 2. LOCAL OLLAMA CONFIGURATION */}
          <div className="border border-[#2A2A35] rounded-lg p-4 bg-[#141419] space-y-3">
            <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2">
              <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Server className="w-4 h-4 text-[#A78BFA]" />
                <span>Local Ollama AI Runtime</span>
              </div>

              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                  health?.ollama?.status === 'connected'
                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    : 'bg-amber-950 text-amber-300 border border-amber-800'
                }`}
              >
                {health?.ollama?.status?.toUpperCase() || 'OFFLINE'}
              </span>
            </div>

            <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed">
              CircuitMind uses Ollama for local hardware architecture extraction and offline copilot synthesis.
              Per project specifications, the designated local model is strictly locked to <strong className="text-[#A78BFA] font-mono">muse-spark-open:cloud</strong>.
            </p>

            <div className="text-xs space-y-2 text-[#A1A1AA] font-mono bg-[#18181F] p-3 rounded border border-[#2A2A35]">
              <div className="flex justify-between">
                <span>Endpoint:</span>
                <span className="text-white">{health?.ollama?.base_url || 'http://localhost:11434'}</span>
              </div>
              <div className="flex justify-between">
                <span>Designated Model:</span>
                <span className="text-[#A78BFA] font-bold">muse-spark-open:cloud</span>
              </div>
              <div className="flex justify-between">
                <span>Model Lock:</span>
                <span className="text-emerald-400 font-bold">Active (Ollama exclusively runs muse-spark-open:cloud)</span>
              </div>
            </div>
          </div>

          {/* 3. PROJECT SETTINGS (IF OPENED WITH ACTIVE PROJECT) */}
          {project && onUpdateProject && (
            <form onSubmit={handleSaveProject} className="border border-[#2A2A35] rounded-lg p-4 bg-[#141419] space-y-3">
              <div className="font-mono text-xs font-bold text-white uppercase tracking-wider border-b border-[#2A2A35] pb-2">
                Active Project: {project.name}
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-mono text-[#A1A1AA]">Project Name</label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                  required
                />
              </div>

              <div className="space-y-1.5 font-sans">
                <label className="block text-xs font-mono text-[#A1A1AA]">Description</label>
                <textarea
                  value={projectDesc}
                  onChange={(e) => setProjectDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="font-mono text-[11px] text-zinc-500">
                  Revision: <strong className="text-white">Rev {project.revision}</strong>
                </span>

                <button
                  type="submit"
                  disabled={isSavingProject}
                  className="flex items-center space-x-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSavingProject ? 'Saving...' : projectSuccessMsg ? 'Saved!' : 'Save Project Details'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 4. DANGER ZONE (IF ACTIVE PROJECT) */}
          {project && onDeleteProject && (
            <div className="border border-rose-900/40 rounded-lg p-4 bg-rose-950/10 space-y-3">
              <div className="font-mono text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2 border-b border-rose-900/30 pb-2">
                <AlertTriangle className="w-4 h-4 text-rose-400" />
                <span>Delete Project</span>
              </div>
              {showDeleteConfirm ? (
                <div className="flex items-center space-x-3">
                  <span className="text-xs text-white font-mono">Confirm deletion?</span>
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1 rounded font-mono text-xs bg-[#18181F] text-zinc-300 border border-[#2A2A35]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={async () => {
                      setIsDeleting(true);
                      try {
                        await onDeleteProject(project.id);
                        onClose();
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    className="px-3 py-1 rounded font-mono text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white"
                  >
                    {isDeleting ? 'Deleting...' : 'Confirm Delete'}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center space-x-1.5 border border-rose-800/80 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 px-3 py-1.5 rounded text-xs font-mono transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete This Project</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 border-t border-[#2A2A35] bg-[#141419] flex justify-end rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-[#18181F] border border-[#2A2A35] text-white hover:bg-[#22222B] text-xs font-mono transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

