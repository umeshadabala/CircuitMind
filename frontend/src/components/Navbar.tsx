import React from 'react';
import { Cpu, Download, Play, RefreshCw, AlertTriangle, CheckCircle, Flame } from 'lucide-react';
import { Project } from '../types';
import { getExportBundleUrl } from '../api/client';

interface NavbarProps {
  project: Project | null;
  onSimulate: () => void;
  onNewProject: () => void;
  simulating: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({ project, onSimulate, onNewProject, simulating }) => {
  return (
    <header className="topbar">
      <div className="brand-section">
        <div className="brand-logo" onClick={onNewProject} style={{ cursor: 'pointer' }}>
          <Cpu className="logo-icon" size={20} />
          <span>CircuitMind</span>
        </div>
        <span className="brand-tagline">Think it. Build it. Prove it.</span>
      </div>

      {project && (
        <div className="topbar-center">
          <div className="project-title-badge">
            <span>{project.title}</span>
            <span className="version-chip">v{project.version}</span>
            <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>({project.board.display_name})</span>
          </div>

          {/* LLM Model Indicator */}
          <div style={{
            fontSize: '11px',
            background: 'rgba(56, 189, 248, 0.1)',
            color: '#38bdf8',
            border: '1px solid rgba(56, 189, 248, 0.3)',
            padding: '2px 8px',
            borderRadius: '4px',
            fontFamily: 'var(--font-mono)',
            display: 'flex',
            alignItems: 'center',
            gap: '5px'
          }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8' }} />
            <span>Ollama: gpt-oss:120b-cloud</span>
          </div>

          {/* Validation Status */}
          <div className={`status-pill ${project.validation?.status || 'draft'}`}>
            {project.validation?.status === 'validated' && <CheckCircle size={12} />}
            {project.validation?.status === 'warning' && <AlertTriangle size={12} />}
            {project.validation?.status === 'error' && <AlertTriangle size={12} />}
            <span>Hardware: {project.validation?.status || 'Draft'}</span>
          </div>

          {/* Simulation Status */}
          <div className={`status-pill ${project.sim_status || 'draft'}`}>
            <span>Sim: {project.sim_status || 'Draft'}</span>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {project && (
          <>
            <button className="btn btn-primary" onClick={onSimulate} disabled={simulating}>
              {simulating ? <RefreshCw size={14} className="spin" /> : <Play size={14} />}
              <span>{simulating ? 'Simulating...' : 'Run Simulation'}</span>
            </button>

            <a 
              href={getExportBundleUrl(project.id)} 
              className="btn btn-secondary" 
              download={`circuitmind-${project.id}.zip`}
              title="Download complete engineering bundle (diagram.json, sketch.ino, tests.json, README)"
            >
              <Download size={14} />
              <span>Export ZIP</span>
            </a>
          </>
        )}

        <button className="btn btn-secondary" onClick={onNewProject}>
          <span>+ New Project</span>
        </button>
      </div>
    </header>
  );
};
