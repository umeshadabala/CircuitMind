import React from 'react';
import { 
  Download, 
  Play, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle, 
  Menu, 
  Sparkles,
  LayoutDashboard,
  Plus
} from 'lucide-react';
import { Project } from '../types';
import { getExportBundleUrl } from '../api/client';

interface NavbarProps {
  project: Project | null;
  onSimulate: () => void;
  onNewProject: () => void;
  onOpenDashboard: () => void;
  simulating: boolean;
  onToggleSidebar?: () => void;
  onToggleCopilot?: () => void;
  isCopilotOpen?: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  project, 
  onSimulate, 
  onNewProject,
  onOpenDashboard,
  simulating,
  onToggleSidebar,
  onToggleCopilot,
  isCopilotOpen = true
}) => {
  return (
    <header className="topbar">
      {/* Brand Section */}
      <div className="brand-section">

        <div 
          className="brand-logo" 
          onClick={onOpenDashboard} 
          title="CircuitMind Studio Dashboard" 
          style={{ cursor: 'pointer' }}
        >
          <img 
            src="/logo.svg" 
            alt="CircuitMind Studio" 
            style={{ width: '26px', height: '26px', borderRadius: '6px' }} 
          />
          <span>CircuitMind</span>
        </div>
        <span className="brand-tagline">Studio</span>
      </div>

      {/* Center Context & Badges (Workspace Context) */}
      {project && (
        <div className="topbar-center">
          {/* Clickable project selector / title */}
          <div 
            className="project-title-badge" 
            onClick={onOpenDashboard}
            title="Switch project on Dashboard"
            style={{ cursor: 'pointer' }}
          >
            <span style={{ fontWeight: 600 }}>{project.title}</span>
            <span className="version-chip">v{project.version}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
              ({project.board.type === 'esp32-devkit-v1' ? 'ESP32' : project.board.type === 'raspberry-pi-pico' ? 'RP2040' : 'Uno'})
            </span>
          </div>

          {/* Design Rules / DRC Status */}
          <div className={`status-pill ${project.validation?.status || 'draft'}`} title="Design Rule Check & Static Electrical Constraints">
            {project.validation?.status === 'validated' && <CheckCircle size={11} />}
            {project.validation?.status === 'warning' && <AlertTriangle size={11} />}
            {project.validation?.status === 'error' && <AlertTriangle size={11} />}
            <span>DRC: {project.validation?.status === 'validated' ? 'Rules Passed' : project.validation?.status === 'warning' ? 'Warnings' : project.validation?.status === 'error' ? 'Errors' : 'Draft'}</span>
          </div>

          {/* Simulation Status */}
          {project.sim_status === 'passed' && (
            <div className="status-pill passed" title="Behavioral Circuit Simulation Verified">
              <CheckCircle size={11} />
              <span>Simulation: Passed</span>
            </div>
          )}
        </div>
      )}

      {/* Right Controls & Actions */}
      <div className="topbar-actions">
        {project && (
          <>
            <button 
              className="btn btn-primary" 
              onClick={onSimulate} 
              disabled={simulating}
              title="Run Behavioral Simulation"
            >
              {simulating ? <RefreshCw size={13} className="spin" /> : <Play size={13} />}
              <span>{simulating ? 'Simulating...' : 'Simulate'}</span>
            </button>

            <a 
              href={getExportBundleUrl(project.id)} 
              className="btn btn-secondary" 
              download={`circuitmind-${project.id}.zip`}
              title="Export complete project ZIP bundle"
            >
              <Download size={13} />
              <span>Export</span>
            </a>

            {/* Copilot Toggle Button */}
            <button 
              className={`btn-icon ${isCopilotOpen ? 'active' : ''}`}
              onClick={onToggleCopilot}
              title={isCopilotOpen ? "Hide AI Copilot" : "Show AI Copilot"}
              style={{ padding: '6px 8px' }}
            >
              <Sparkles size={16} />
            </button>
          </>
        )}

        <button 
          className="btn btn-secondary" 
          onClick={onOpenDashboard}
          title="Go to Project Dashboard"
        >
          <LayoutDashboard size={13} />
          <span>Dashboard</span>
        </button>

        <button 
          className="btn btn-secondary" 
          onClick={onNewProject}
          title="Create New Project"
          style={{ borderColor: 'var(--accent-orange-glow)', color: 'var(--accent-orange)' }}
        >
          <Plus size={13} />
          <span>New</span>
        </button>
      </div>
    </header>
  );
};
