import React from 'react';
import { 
  Project, 
  TabType 
} from '../types';
import { 
  Cpu, 
  CheckCircle2, 
  AlertTriangle, 
  Share2, 
  Code2, 
  PlayCircle, 
  ShieldCheck, 
  ListChecks,
  ExternalLink,
  Zap
} from 'lucide-react';

interface OverviewViewProps {
  project: Project;
  onSelectTab: (tab: any) => void;
  onSimulate: () => void;
}

export const OverviewView: React.FC<OverviewViewProps> = ({ 
  project, 
  onSelectTab,
  onSimulate 
}) => {
  const issues = project.validation?.issues || [];
  const errors = issues.filter(i => i.severity === 'error');
  const warnings = issues.filter(i => i.severity === 'warning');

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Hero Project Card */}
      <div className="card" style={{ padding: '24px', background: 'linear-gradient(135deg, #141419 0%, #1a151b 100%)', borderColor: 'var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#fff' }}>{project.title}</h2>
              <span className="version-chip">v{project.version}</span>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.6, maxWidth: '700px' }}>
              {project.description}
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn btn-primary" onClick={onSimulate}>
              <PlayCircle size={16} />
              <span>Simulate</span>
            </button>
            <button className="btn btn-secondary" onClick={() => onSelectTab('wiring')}>
              <Share2 size={16} />
              <span>Wiring</span>
            </button>
          </div>
        </div>

        {/* Microcontroller spec bar */}
        <div style={{ display: 'flex', gap: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '13px' }}>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Target Microcontroller: </span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{project.board.display_name}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Architecture: </span>
            <span style={{ fontWeight: 600, color: 'var(--accent-orange)' }}>{project.board.architecture}</span>
          </div>
          <div>
            <span style={{ color: 'var(--text-muted)' }}>Logic Voltage: </span>
            <span style={{ fontWeight: 600, color: '#fff' }}>{project.board.voltage_logic}V TTL</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
        {/* Left Column: Requirements & Hardware Inventory */}
        <div>
          {/* Hardware Validation Status */}
          <div className="card">
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="var(--accent-orange)" />
                <span>Deterministic Hardware Validator</span>
              </div>
              <span className={`status-pill ${project.validation?.status || 'draft'}`}>
                {project.validation?.status}
              </span>
            </div>

            {issues.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--status-success)', fontSize: '13px', padding: '8px 0' }}>
                <CheckCircle2 size={16} />
                <span>All electrical constraints, pin allocations, and voltage limits passed validation.</span>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
                {issues.map((issue, idx) => (
                  <div 
                    key={idx}
                    style={{ 
                      padding: '10px 12px', 
                      borderRadius: '6px', 
                      background: issue.severity === 'error' ? 'var(--status-error-bg)' : 'var(--status-warning-bg)',
                      border: `1px solid ${issue.severity === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`,
                      fontSize: '12px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600, color: issue.severity === 'error' ? 'var(--status-error)' : 'var(--status-warning)' }}>
                      <AlertTriangle size={14} />
                      <span>{issue.code}</span>
                    </div>
                    <div style={{ marginTop: '4px', color: '#e2e8f0', lineHeight: 1.4 }}>{issue.message}</div>
                    {issue.remediation && (
                      <div style={{ marginTop: '4px', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                        Remediation: {issue.remediation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Requirements Card */}
          <div className="card">
            <div className="card-title">
              <ListChecks size={18} color="var(--accent-orange)" />
              <span>Project Requirements & Target Behaviors</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {project.requirements.map((req) => (
                <div 
                  key={req.id} 
                  style={{ 
                    padding: '10px 12px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    border: '1px solid var(--border-subtle)', 
                    borderRadius: '6px',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '10px'
                  }}
                >
                  <span style={{ 
                    fontFamily: 'var(--font-mono)', 
                    fontSize: '11px', 
                    color: 'var(--accent-orange)', 
                    background: 'var(--accent-orange-soft)', 
                    padding: '2px 6px', 
                    borderRadius: '4px' 
                  }}>
                    {req.id}
                  </span>
                  <div style={{ flex: 1, fontSize: '13px', lineHeight: 1.5 }}>
                    {req.description}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Component Inventory & Build Checklist */}
        <div>
          {/* Components BOM Card */}
          <div className="card">
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Cpu size={18} color="var(--accent-orange)" />
                <span>Components Inventory ({project.components.length})</span>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => onSelectTab('components')} 
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                View Catalog
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {project.components.map((comp) => (
                <div 
                  key={comp.id}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between',
                    padding: '8px 10px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, color: '#fff' }}>{comp.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>part_id: {comp.part_id}</div>
                  </div>
                  <span style={{ 
                    fontSize: '10px', 
                    color: 'var(--text-muted)', 
                    background: 'rgba(255,255,255,0.05)', 
                    padding: '2px 6px', 
                    borderRadius: '4px' 
                  }}>
                    {comp.pins.length} pins
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Verification Plan Card */}
          <div className="card">
            <div className="card-title" style={{ justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={18} color="var(--accent-orange)" />
                <span>Verification Suite ({project.tests.length} tests)</span>
              </div>
              <button 
                className="btn btn-secondary" 
                onClick={() => onSelectTab('verification')} 
                style={{ padding: '3px 8px', fontSize: '11px' }}
              >
                Inspect
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {project.tests.map((tc) => (
                <div 
                  key={tc.id}
                  style={{ 
                    padding: '8px 10px', 
                    background: 'rgba(255, 255, 255, 0.02)', 
                    borderRadius: '6px',
                    fontSize: '12px'
                  }}
                >
                  <div style={{ fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{tc.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                    Expectation: {tc.then}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
