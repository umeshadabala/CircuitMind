import React, { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Server,
  Database,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Cpu,
  Key,
  Eye,
  EyeOff,
  CheckCircle2,
  RefreshCw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { Project, HealthResponse } from '../../types';
import { api } from '../../api/client';

interface SettingsPanelProps {
  project: Project;
  health?: HealthResponse | null;
  onUpdateProject: (data: Partial<Project>) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
  onRefreshHealth?: () => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  project,
  health,
  onUpdateProject,
  onDeleteProject,
  onRefreshHealth,
}) => {
  // Project settings state
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [targetBoard, setTargetBoard] = useState(project.target_board);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // NVIDIA NIM BYOK state
  const [nvidiaKey, setNvidiaKey] = useState('');
  const [showNvidiaKey, setShowNvidiaKey] = useState(false);
  const [nvidiaModel, setNvidiaModel] = useState(health?.nvidia?.model || 'meta/muse-glimmer-30b');
  const [isSavingNvidia, setIsSavingNvidia] = useState(false);
  const [nvidiaSuccessMsg, setNvidiaSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    if (health?.nvidia?.model) {
      setNvidiaModel(health.nvidia.model);
    }
  }, [health]);

  const handleSubmitProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSavedSuccess(false);
    try {
      await onUpdateProject({ name, description, target_board: targetBoard });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } finally {
      setIsSaving(false);
    }
  };

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
          ? 'NVIDIA BYOK Key saved & active for Meta Muse Glimmer 30B!'
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

  return (
    <div className="h-full flex flex-col bg-[#09090B]">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A35] bg-[#111116] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-[#A78BFA]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white">Project & AI Engine Settings</h2>
            <div className="text-[11px] text-[#A1A1AA] font-mono">
              Configure project metadata, NVIDIA NIM BYOK keys, and inspect AI inference runtime
            </div>
          </div>
        </div>

        {onRefreshHealth && (
          <button
            onClick={() => onRefreshHealth()}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded bg-[#18181F] border border-[#2A2A35] text-[#A1A1AA] hover:text-white text-xs font-mono transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh Status</span>
          </button>
        )}
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full space-y-6">
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
        <div className="border border-[#2A2A35] rounded-lg p-5 bg-[#111116] space-y-3">
          <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2">
            <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#A78BFA]" />
              <span>Primary AI Engine Selection</span>
            </div>
            <span className="text-[11px] text-zinc-400 font-mono">
              Applies to both Project Synthesis & Copilot
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => handleSwitchProvider('local')}
              className={`p-4 rounded-lg border font-mono text-xs transition-all flex flex-col items-start gap-1 text-left ${
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
                Runs locally on your machine via Ollama endpoint. Performs normal project synthesis & Copilot.
              </div>
            </button>

            <button
              type="button"
              onClick={() => handleSwitchProvider('nvidia')}
              className={`p-4 rounded-lg border font-mono text-xs transition-all flex flex-col items-start gap-1 text-left ${
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

        {/* ================= 1. NVIDIA NIM (BRING YOUR OWN KEY) ================= */}
        <form onSubmit={handleSaveNvidiaByok} className="border border-[#2A2A35] rounded-lg p-5 bg-[#111116] space-y-4">
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
            Run Meta's advanced <strong className="text-white">Muse Glimmer 30B</strong> (<code className="text-[#A78BFA] font-mono">meta/muse-glimmer-30b</code>) model
            hosted on NVIDIA NIM via OpenAI-compatible endpoints. Supply your personal key for this session (never written to disk or database) or define <code className="text-[#A78BFA] font-mono">NVIDIA_API_KEY</code> in <code className="text-[#A78BFA] font-mono">.env</code>.
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
              <span>Keys remain server-side in runtime memory. Get a free key at build.nvidia.com</span>
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

          <div className="pt-2 flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-500">
              Status: <strong className={health?.nvidia?.configured ? 'text-emerald-400' : 'text-zinc-400'}>
                {health?.nvidia?.configured ? 'Ready for Copilot' : 'Awaiting Session Key'}
              </strong>
            </span>

            <button
              type="submit"
              disabled={isSavingNvidia || !nvidiaKey.trim()}
              className="flex items-center space-x-1.5 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50"
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

        {/* ================= 2. LOCAL OLLAMA (muse-spark-open:cloud) ================= */}
        <div className="border border-[#2A2A35] rounded-lg p-5 bg-[#111116] space-y-4">
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
            Local AI provider for hardware architecture extraction and offline copilot tasks.
            Ollama is strictly configured to execute <strong className="text-[#A78BFA] font-mono">muse-spark-open:cloud</strong>.
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
              <span>Model Enforcement:</span>
              <span className="text-emerald-400 font-bold">Locked (Only muse-spark-open:cloud allowed)</span>
            </div>
          </div>
        </div>

        {/* ================= 3. PROJECT FORM ================= */}
        <form onSubmit={handleSubmitProject} className="border border-[#2A2A35] rounded-lg p-5 bg-[#111116] space-y-4">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider border-b border-[#2A2A35] pb-2">
            General Configuration
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-xs font-mono text-[#A1A1AA]">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
              required
            />
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-xs font-mono text-[#A1A1AA]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C3AED]"
            />
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-xs font-mono text-[#A1A1AA]">Target Microcontroller Board</label>
            <select
              value={targetBoard}
              onChange={(e) => setTargetBoard(e.target.value)}
              className="w-full bg-[#18181F] border border-[#2A2A35] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#7C3AED] font-mono"
            >
              <option value="ESP32-DEVKIT-V1">ESP32 NodeMCU DevKit V1 (30-pin, Xtensa dual-core 3.3V)</option>
            </select>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <span className="font-mono text-[11px] text-zinc-500">
              Current Revision: <strong className="text-white">Rev {project.revision}</strong>
            </span>

            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center space-x-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Database & Persistence Info */}
        <div className="border border-[#2A2A35] rounded-lg p-5 bg-[#111116] space-y-2">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#2A2A35] pb-2">
            <Database className="w-4 h-4 text-[#A78BFA]" />
            <span>Persistence & Graph Integrity</span>
          </div>
          <p className="text-xs text-[#A1A1AA] font-sans leading-relaxed">
            Project state, component graphs, wiring nets, and simulation histories are stored in local SQLite (<code className="text-[#A78BFA] font-mono">circuitmind.db</code>).
            Every graph edit increments project revision and invalidates stale build artifacts.
          </p>
        </div>

        {/* Danger Zone: Delete Project */}
        {onDeleteProject && (
          <div className="border border-rose-900/50 rounded-lg p-5 bg-rose-950/10 space-y-3">
            <div className="font-mono text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2 border-b border-rose-900/40 pb-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>Danger Zone: Permanent Deletion</span>
            </div>
            <p className="text-xs text-zinc-300 font-sans leading-relaxed">
              Permanently delete this project, all associated component graphs, wiring netlists, firmware artifacts, and verification traces. This action cannot be reversed.
            </p>

            {showDeleteConfirm ? (
              <div className="bg-[#111116] border border-rose-800 p-4 rounded-lg space-y-3">
                <div className="text-xs text-white font-mono font-semibold">
                  Are you sure you want to delete <span className="text-rose-400">"{project.name}"</span> (Rev {project.revision})?
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded font-mono text-xs text-zinc-300 hover:text-white bg-[#18181F] border border-[#2A2A35]"
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
                      } finally {
                        setIsDeleting(false);
                      }
                    }}
                    className="flex items-center space-x-1.5 px-3 py-1.5 rounded font-mono text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{isDeleting ? 'Deleting...' : 'Permanently Delete Project'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center space-x-2 border border-rose-800/80 bg-rose-950/30 hover:bg-rose-900/50 text-rose-300 px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete This Project</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


