import React from 'react';
import { Cpu, ShieldCheck, AlertTriangle, Terminal, Sparkles } from 'lucide-react';
import { Project, HealthResponse } from '../types';

interface HeaderProps {
  project?: Project | null;
  health?: HealthResponse | null;
  onNavigate: (view: 'landing' | 'dashboard' | 'new-project' | 'workspace') => void;
  currentView: string;
  onOpenCopilot?: () => void;
  isCopilotOpen?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  health,
  onNavigate,
  currentView,
  onOpenCopilot,
  isCopilotOpen,
}) => {
  const drcValid = project?.validation_report?.valid;
  const drcErrorCount = project?.validation_report?.findings?.filter((f) => f.severity === 'ERROR').length || 0;
  const drcWarnCount = project?.validation_report?.findings?.filter((f) => f.severity === 'WARNING').length || 0;

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

        {/* Ollama status pill */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-[#18181F] border border-[#2A2A35] px-2.5 py-1 rounded text-xs font-mono">
          <div
            className={`w-2 h-2 rounded-full ${
              health?.ollama?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="text-[#A1A1AA]">OLLAMA:</span>
          <span className="text-[#FAFAFA] truncate max-w-[130px]">
            {health?.ollama?.configured_model || 'gpt-oss:120b-cloud'}
          </span>
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

