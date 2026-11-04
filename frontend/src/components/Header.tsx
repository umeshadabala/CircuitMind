import React, { useState, useRef, useEffect } from 'react';
import { Cpu, ShieldCheck, AlertTriangle, Sparkles, ChevronDown, Check, X, Server, Settings } from 'lucide-react';
import { Project, HealthResponse } from '../types';
import { api } from '../api/client';

interface HeaderProps {
  project?: Project | null;
  health?: HealthResponse | null;
  onNavigate: (view: 'landing' | 'dashboard' | 'new-project' | 'workspace') => void;
  currentView: string;
  onOpenCopilot?: () => void;
  isCopilotOpen?: boolean;
  onRefreshHealth?: () => Promise<void>;
  onOpenSettings?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  health,
  onNavigate,
  currentView,
  onOpenCopilot,
  isCopilotOpen,
  onRefreshHealth,
  onOpenSettings,
}) => {
  const drcValid = project?.validation_report?.valid;
  const drcErrorCount = project?.validation_report?.findings?.filter((f) => f.severity === 'ERROR').length || 0;
  const drcWarnCount = project?.validation_report?.findings?.filter((f) => f.severity === 'WARNING').length || 0;

  // Model Picker Popover state
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

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

  // Click outside listener to dismiss popover
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsPickerOpen(false);
      }
    };
    if (isPickerOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isPickerOpen]);

  return (
    <header className="h-14 border-b border-[#2A2A35] bg-[#111116] px-4 flex items-center justify-between select-none z-30">
      <div className="flex items-center space-x-6">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center space-x-2.5 text-left focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#7C3AED]/20 border border-[#7C3AED]/40 flex items-center justify-center text-[#A78BFA] group-hover:border-[#7C3AED] transition-colors">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <div className="font-mono text-sm font-bold tracking-wider text-[#FAFAFA] flex items-center">
              CIRCUITMIND
            </div>
            <div className="text-[10px] text-[#A1A1AA] uppercase tracking-wider font-mono">
              Hardware Engine
            </div>
          </div>
        </button>

        <nav className="hidden md:flex items-center space-x-1 font-mono text-xs">
          <button
            onClick={() => onNavigate('dashboard')}
            className={`px-3 py-1.5 rounded-md transition-colors ${
              currentView === 'dashboard'
                ? 'bg-[#18181F] text-[#FAFAFA] border border-[#2A2A35]'
                : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
            }`}
          >
            PROJECTS
          </button>
          {project && (
            <button
              onClick={() => onNavigate('workspace')}
              className={`px-3 py-1.5 rounded-md transition-colors ${
                currentView === 'workspace'
                  ? 'bg-[#18181F] text-[#A78BFA] border border-[#7C3AED]/40'
                  : 'text-[#A1A1AA] hover:text-[#FAFAFA]'
              }`}
            >
              WORKSPACE: {project.name}
            </button>
          )}

          {onOpenSettings && (
            <button
              onClick={onOpenSettings}
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-md transition-colors text-[#A1A1AA] hover:text-[#FAFAFA] hover:bg-[#18181F]"
            >
              <Settings className="w-3.5 h-3.5 text-[#A78BFA]" />
              <span>SETTINGS</span>
            </button>
          )}
        </nav>
      </div>

      <div className="flex items-center space-x-3">
        {project && (
          <div className="hidden lg:flex items-center space-x-2 font-mono text-xs">
            <span className="bg-[#18181F] text-[#A1A1AA] px-2.5 py-1 rounded border border-[#2A2A35]">
              REV <span className="text-[#FAFAFA] font-bold">{project.revision}</span>
            </span>

            {project.validation_report && (
              <span
                className={`px-2.5 py-1 rounded border flex items-center gap-1.5 ${
                  drcValid
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                    : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                }`}
              >
                {drcValid ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {drcValid ? 'DRC CLEAN' : `DRC: ${drcErrorCount} ERR / ${drcWarnCount} WARN`}
              </span>
            )}
          </div>
        )}

        {/* Direct Settings button for small / all screens */}
        {onOpenSettings && (
          <button
            onClick={onOpenSettings}
            className="md:hidden flex items-center p-1.5 bg-[#18181F] border border-[#2A2A35] hover:border-[#7C3AED] rounded text-[#A1A1AA] hover:text-white transition-colors"
            title="Open Settings"
          >
            <Settings className="w-4 h-4 text-[#A78BFA]" />
          </button>
        )}

        {/* Interactive Engine Status Pill & Engine Switcher Popover */}
        <div className="relative" ref={popoverRef}>
          <button
            onClick={() => setIsPickerOpen(!isPickerOpen)}
            title="Click to switch between Local Ollama and NVIDIA NIM"
            className={`flex items-center space-x-1.5 bg-[#18181F] hover:bg-[#20202B] border px-2.5 py-1 rounded text-xs font-mono transition-colors focus:outline-none ${
              isNvidiaActive
                ? 'border-emerald-600/70 hover:border-emerald-500 shadow-sm shadow-emerald-950/50'
                : 'border-[#2A2A35] hover:border-[#7C3AED]/60'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                isNvidiaActive
                  ? health?.nvidia?.configured
                    ? 'bg-emerald-400 animate-pulse'
                    : 'bg-amber-400'
                  : health?.ollama?.status === 'connected'
                  ? 'bg-emerald-400 animate-pulse'
                  : 'bg-amber-400'
              }`}
            />
            <span className={isNvidiaActive ? 'text-emerald-400 font-bold' : 'text-[#A1A1AA]'}>
              {isNvidiaActive ? 'NVIDIA NIM:' : 'OLLAMA:'}
            </span>
            <span className="text-[#FAFAFA] font-semibold truncate max-w-[155px]">
              {isNvidiaActive
                ? health?.nvidia?.model || 'meta/muse-glimmer-30b'
                : health?.ollama?.configured_model || 'muse-spark-open:cloud'}
            </span>
            <ChevronDown className="w-3 h-3 text-[#A1A1AA]" />
          </button>

          {/* Quick Model Selector Popover */}
          {isPickerOpen && (
            <div className="absolute right-0 mt-2 w-84 bg-[#141419] border border-[#2A2A35] shadow-2xl rounded-lg p-3.5 text-xs font-mono z-50 animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="flex items-center justify-between border-b border-[#2A2A35] pb-2 mb-3">
                <div className="flex items-center space-x-1.5 text-white font-bold">
                  <Cpu className="w-3.5 h-3.5 text-[#A78BFA]" />
                  <span>Choose Active AI Engine</span>
                </div>
                <button
                  onClick={() => setIsPickerOpen(false)}
                  className="text-zinc-500 hover:text-white p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 2-Way Provider Selector */}
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#101015] border border-[#2A2A35] rounded-lg mb-3">
                <button
                  type="button"
                  onClick={() => handleSwitchProvider('local')}
                  className={`py-2 px-2 rounded font-mono text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                    !isNvidiaActive
                      ? 'bg-[#7C3AED] text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-[#18181F]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Server className="w-3 h-3" />
                    <span>Local Ollama</span>
                  </div>
                  <span className="text-[9px] font-normal opacity-80">muse-spark-open:cloud</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSwitchProvider('nvidia')}
                  className={`py-2 px-2 rounded font-mono text-xs font-bold transition-all flex flex-col items-center gap-0.5 ${
                    isNvidiaActive
                      ? 'bg-emerald-600 text-white shadow-md'
                      : 'text-zinc-400 hover:text-white hover:bg-[#18181F]'
                  }`}
                >
                  <div className="flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    <span>NVIDIA NIM</span>
                  </div>
                  <span className="text-[9px] font-normal opacity-80">Muse Glimmer 30B</span>
                </button>
              </div>

              {/* Active Engine Details Card */}
              {isNvidiaActive ? (
                <div className="bg-[#0D1815] border border-emerald-900/50 p-3 rounded-lg space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold">NVIDIA NIM Active</span>
                    <span className={`text-[10px] ${health?.nvidia?.configured ? 'text-emerald-300' : 'text-amber-400 font-bold'}`}>
                      {health?.nvidia?.configured ? '● BYOK Ready' : '⚠ Key Required'}
                    </span>
                  </div>
                  <div className="text-white font-bold text-xs">meta/muse-glimmer-30b</div>
                  <p className="text-[10px] text-zinc-300 font-sans leading-tight pt-0.5">
                    Powers all normal project synthesis & Copilot with Meta Muse Glimmer 30B hosted on NVIDIA NIM.
                  </p>
                </div>
              ) : (
                <div className="bg-[#1A1A23] border border-[#2A2A35] p-3 rounded-lg space-y-1.5 mb-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-[#A78BFA] uppercase tracking-wider font-bold">Local Ollama Active</span>
                    <span className={`text-[10px] ${health?.ollama?.status === 'connected' ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {health?.ollama?.status === 'connected' ? '● Connected' : '○ Offline'}
                    </span>
                  </div>
                  <div className="text-white font-bold text-xs">muse-spark-open:cloud</div>
                  <p className="text-[10px] text-zinc-300 font-sans leading-tight pt-0.5">
                    Powers local offline project synthesis & Copilot with muse-spark-open:cloud.
                  </p>
                </div>
              )}

              {/* Settings Action Footer */}
              {onOpenSettings && (
                <div className="pt-2 border-t border-[#2A2A35]">
                  <button
                    onClick={() => {
                      setIsPickerOpen(false);
                      onOpenSettings();
                    }}
                    className="w-full py-2 px-3 bg-[#18181F] hover:bg-[#20202B] border border-[#2A2A35] hover:border-[#7C3AED]/50 text-[#A78BFA] hover:text-white rounded text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Settings className="w-3.5 h-3.5" />
                    <span>Open Settings & Configure BYOK Keys →</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-mono text-xs font-semibold transition-all ${
              isCopilotOpen
                ? 'bg-[#7C3AED] text-white shadow-lg shadow-[#7C3AED]/20'
                : 'bg-[#18181F] text-[#A78BFA] border border-[#7C3AED]/40 hover:bg-[#7C3AED]/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>COPILOT</span>
          </button>
        )}
      </div>
    </header>
  );
};



