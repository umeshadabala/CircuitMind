import React, { useState } from 'react';
import { Settings, Save, Server, Database, Trash2, AlertCircle, AlertTriangle } from 'lucide-react';
import { Project, HealthResponse } from '../../types';

interface SettingsPanelProps {
  project: Project;
  health?: HealthResponse | null;
  onUpdateProject: (data: Partial<Project>) => Promise<void>;
  onDeleteProject?: (projectId: string) => Promise<void>;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({
  project,
  health,
  onUpdateProject,
  onDeleteProject,
}) => {
  const [name, setName] = useState(project.name);
  const [description, setDescription] = useState(project.description);
  const [targetBoard, setTargetBoard] = useState(project.target_board);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
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

  return (
    <div className="h-full flex flex-col bg-[#090D12]">
      {/* Header */}
      <div className="p-4 border-b border-[#25332F] bg-[#101720] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Settings className="w-5 h-5 text-[#5B9B8D]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white">Project & Environment Settings</h2>
            <div className="text-[11px] text-[#96A6A3] font-mono">
              Configure project metadata and inspect local AI inference runtime
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Project Form */}
        <form onSubmit={handleSubmit} className="border border-[#25332F] rounded-lg p-5 bg-[#101720] space-y-4">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider border-b border-[#25332F] pb-2">
            General Configuration
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-xs font-mono text-[#96A6A3]">Project Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-[#151F2B] border border-[#25332F] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#356B62]"
              required
            />
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-xs font-mono text-[#96A6A3]">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full bg-[#151F2B] border border-[#25332F] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#356B62]"
            />
          </div>

          <div className="space-y-1.5 font-sans">
            <label className="block text-xs font-mono text-[#96A6A3]">Target Microcontroller Board</label>
            <select
              value={targetBoard}
              onChange={(e) => setTargetBoard(e.target.value)}
              className="w-full bg-[#151F2B] border border-[#25332F] rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-[#356B62] font-mono"
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
              className="flex items-center space-x-1.5 bg-[#356B62] hover:bg-[#2A564E] text-white px-4 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Saving...' : savedSuccess ? 'Saved!' : 'Save Changes'}</span>
            </button>
          </div>
        </form>

        {/* Local AI Engine Status card */}
        <div className="border border-[#25332F] rounded-lg p-5 bg-[#101720] space-y-3">
          <div className="flex items-center justify-between border-b border-[#25332F] pb-2">
            <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Server className="w-4 h-4 text-[#5B9B8D]" />
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

          <div className="text-xs space-y-2 text-[#96A6A3] font-mono">
            <div className="flex justify-between">
              <span>Endpoint:</span>
              <span className="text-white">{health?.ollama?.base_url || 'http://localhost:11434'}</span>
            </div>
            <div className="flex justify-between">
              <span>Configured Model:</span>
              <span className="text-[#5B9B8D] font-bold">
                {health?.ollama?.configured_model || 'gpt-oss:120b-cloud'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Model Availability:</span>
              <span className={health?.ollama?.model_available ? 'text-emerald-400' : 'text-amber-400'}>
                {health?.ollama?.model_available ? 'Verified Installed locally' : 'Pending local verification'}
              </span>
            </div>
          </div>
        </div>

        {/* Database & Persistence Info */}
        <div className="border border-[#25332F] rounded-lg p-5 bg-[#101720] space-y-2">
          <div className="font-mono text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 border-b border-[#25332F] pb-2">
            <Database className="w-4 h-4 text-[#5B9B8D]" />
            <span>Persistence & Graph Integrity</span>
          </div>
          <p className="text-xs text-[#96A6A3] font-sans leading-relaxed">
            Project state, component graphs, wiring nets, and simulation histories are stored in local SQLite (<code className="text-[#5B9B8D] font-mono">circuitmind.db</code>).
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
              <div className="bg-[#101720] border border-rose-800 p-4 rounded-lg space-y-3">
                <div className="text-xs text-white font-mono font-semibold">
                  Are you sure you want to delete <span className="text-rose-400">"{project.name}"</span> (Rev {project.revision})?
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-1.5 rounded font-mono text-xs text-zinc-300 hover:text-white bg-[#151F2B] border border-[#25332F]"
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

