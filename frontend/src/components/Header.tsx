import React from 'react';
import { Cpu, ShieldCheck, AlertTriangle, Sparkles, Sun, Moon, ArrowRight, Plus } from 'lucide-react';
import { Project, HealthResponse } from '../types';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  project?: Project | null;
  health?: HealthResponse | null;
  onNavigate: (view: 'landing' | 'dashboard' | 'new-project' | 'workspace') => void;
  currentView: string;
  onOpenCopilot?: () => void;
  isCopilotOpen?: boolean;
  onStartNew?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  project,
  health,
  onNavigate,
  currentView,
  onOpenCopilot,
  isCopilotOpen,
  onStartNew,
}) => {
  const { theme, toggleTheme } = useTheme();
  const drcValid = project?.validation_report?.valid;
  const drcErrorCount = project?.validation_report?.findings?.filter((f) => f.severity === 'ERROR').length || 0;
  const drcWarnCount = project?.validation_report?.findings?.filter((f) => f.severity === 'WARNING').length || 0;

  const handleSectionClick = (e: React.MouseEvent<HTMLAnchorElement>, sectionId: string) => {
    e.preventDefault();
    if (currentView !== 'landing') {
      onNavigate('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const navSections = [
    { id: 'overview', label: 'Platform' },
    { id: 'workflow', label: 'Engineering' },
    { id: 'workspace', label: 'Workspace' },
    { id: 'hardware', label: 'Hardware' },
    { id: 'ai-engine', label: 'AI Assistant' },
    { id: 'transparency', label: 'Transparency' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full backdrop-blur-md bg-[#090D12]/90 dark:bg-[#090D12]/90 bg-white/90 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between select-none transition-colors">
      {/* Left: Brand Identity */}
      <div className="flex items-center space-x-6">
        <button
          onClick={() => onNavigate('landing')}
          className="flex items-center space-x-3 text-left focus:outline-none group"
        >
          <div className="w-8 h-8 rounded-lg bg-[#356B62]/20 border border-[#356B62]/40 flex items-center justify-center text-[#5B9B8D] group-hover:border-[#5B9B8D] transition-colors">
            <Cpu className="w-4 h-4" />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-mono text-sm font-bold tracking-wider text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">
              CIRCUITMIND
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 border border-[#25332F] dark:border-[#25332F] border-slate-300 text-[#96A6A3] dark:text-[#96A6A3] text-slate-600">
              v1.0.0
            </span>
          </div>
        </button>

        {/* Center / Left Navigation */}
        {currentView === 'landing' ? (
          <nav className="hidden lg:flex items-center space-x-5 text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-600">
            {navSections.map((sec) => (
              <a
                key={sec.id}
                href={`#${sec.id}`}
                onClick={(e) => handleSectionClick(e, sec.id)}
                className="hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900 transition-colors"
              >
                {sec.label}
              </a>
            ))}
            <div className="h-3 w-px bg-[#25332F] dark:border-[#25332F] border-slate-300" />
            <button
              onClick={() => onNavigate('dashboard')}
              className="text-[#5B9B8D] hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900 transition-colors font-semibold"
            >
              PROJECTS
            </button>
          </nav>
        ) : (
          <nav className="hidden md:flex items-center space-x-1.5 font-mono text-xs">
            <button
              onClick={() => onNavigate('landing')}
              className="px-2.5 py-1 rounded-md text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900 hover:bg-[#151F2B] dark:hover:bg-[#151F2B] hover:bg-slate-100 transition-colors"
            >
              OVERVIEW
            </button>
            <span className="text-[#96A6A3]/40">/</span>
            <button
              onClick={() => onNavigate('dashboard')}
              className={`px-2.5 py-1 rounded-md transition-colors ${
                currentView === 'dashboard'
                  ? 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 border border-[#25332F] dark:border-[#25332F] border-slate-300 font-semibold'
                  : 'text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900'
              }`}
            >
              PROJECTS
            </button>
            {project && (
              <>
                <span className="text-[#96A6A3]/40">/</span>
                <button
                  onClick={() => onNavigate('workspace')}
                  className={`px-2.5 py-1 rounded-md transition-colors truncate max-w-[200px] ${
                    currentView === 'workspace'
                      ? 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#5B9B8D] border border-[#356B62]/40 font-semibold'
                      : 'text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900'
                  }`}
                  title={project.name}
                >
                  {project.name}
                </button>
              </>
            )}
          </nav>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center space-x-3">
        {/* Project Validation / Rev Status (when project loaded and not on landing) */}
        {project && currentView !== 'landing' && (
          <div className="hidden xl:flex items-center space-x-2 font-mono text-xs">
            <span className="bg-[#101720] dark:bg-[#101720] bg-slate-50 text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 px-2 py-0.5 rounded border border-[#25332F] dark:border-[#25332F] border-slate-200">
              REV <span className="text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-bold">{project.revision}</span>
            </span>

            {project.validation_report && (
              <span
                className={`px-2 py-0.5 rounded border flex items-center gap-1.5 ${
                  drcValid
                    ? 'bg-emerald-950/40 text-emerald-400 border-emerald-800/50'
                    : 'bg-rose-950/40 text-rose-400 border-rose-800/50'
                }`}
              >
                {drcValid ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                {drcValid ? 'DRC CLEAN' : `DRC: ${drcErrorCount} ERR`}
              </span>
            )}
          </div>
        )}

        {/* Ollama status pill */}
        <div className="hidden sm:flex items-center space-x-1.5 bg-[#101720] dark:bg-[#101720] bg-slate-50 border border-[#25332F] dark:border-[#25332F] border-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono">
          <div
            className={`w-2 h-2 rounded-full ${
              health?.ollama?.status === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'
            }`}
          />
          <span className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 hidden md:inline">OLLAMA:</span>
          <span className="text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 truncate max-w-[130px]">
            {health?.ollama?.configured_model || 'gpt-oss:120b-cloud'}
          </span>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          className="p-1.5 rounded-lg border border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-slate-50 text-[#96A6A3] hover:text-[#F1F5F4] dark:text-[#96A6A3] dark:hover:text-[#F1F5F4] text-slate-600 hover:text-slate-900 transition-colors"
        >
          {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-700" />}
        </button>

        {/* Primary Action Button (Mode-dependent) */}
        {currentView === 'landing' ? (
          <button
            onClick={() => (onStartNew ? onStartNew() : onNavigate('dashboard'))}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-[#356B62] hover:bg-[#2D5E56] text-white font-mono text-xs font-semibold shadow-sm transition-all"
          >
            <span>Open Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : currentView === 'dashboard' ? (
          <button
            onClick={() => onNavigate('new-project')}
            className="flex items-center space-x-1 px-3.5 py-1.5 rounded-lg bg-[#356B62] hover:bg-[#2D5E56] text-white font-mono text-xs font-semibold shadow-sm transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Project</span>
          </button>
        ) : currentView === 'workspace' && onOpenCopilot ? (
          <button
            onClick={onOpenCopilot}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-xs font-semibold transition-all ${
              isCopilotOpen
                ? 'bg-[#356B62] text-white shadow-md shadow-[#356B62]/30'
                : 'bg-[#101720] dark:bg-[#101720] bg-slate-50 text-[#5B9B8D] border border-[#356B62]/40 hover:bg-[#356B62]/10'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>COPILOT</span>
          </button>
        ) : null}
      </div>
    </header>
  );
};
