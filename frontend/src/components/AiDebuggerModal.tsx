import React from 'react';
import { Project, DebugDiagnosis } from '../types';
import { Bug, Wrench, ArrowRight, X } from 'lucide-react';

interface AiDebuggerModalProps {
  project: Project;
  diagnosis: DebugDiagnosis | null;
  onApplyPatch: (diagnosis: DebugDiagnosis) => void;
  onClose: () => void;
  applying: boolean;
}

export const AiDebuggerModal: React.FC<AiDebuggerModalProps> = ({ 
  project, 
  diagnosis, 
  onApplyPatch, 
  onClose,
  applying 
}) => {
  if (!diagnosis) return null;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(0,0,0,0.75)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        background: '#121218',
        border: '1px solid var(--border-subtle)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '720px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.8)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          background: '#181822',
          borderBottom: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              background: 'rgba(239, 68, 68, 0.15)', 
              color: '#ef4444', 
              padding: '6px', 
              borderRadius: '6px' 
            }}>
              <Bug size={18} />
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>
                AI Engineering Debugger & Root Cause Analysis
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                {project.title} (v{project.version}) • Hardware/Firmware Diagnostics
              </div>
            </div>
          </div>

          <button 
            onClick={onClose}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px' }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '20px', overflowY: 'auto', maxHeight: '70vh' }}>
          {/* Defect Title & Root Cause */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ 
              fontSize: '11px', 
              fontWeight: 700, 
              color: '#ef4444', 
              textTransform: 'uppercase', 
              letterSpacing: '0.5px' 
            }}>
              Identified Defect
            </span>
            <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginTop: '4px', marginBottom: '8px' }}>
              {diagnosis.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
              {diagnosis.root_cause}
            </p>
          </div>

          {/* Evidence Gathered */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Supporting Evidence:
            </span>
            <ul style={{ marginTop: '6px', paddingLeft: '20px', fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.6 }}>
              {diagnosis.evidence.map((ev, i) => (
                <li key={i}>{ev}</li>
              ))}
            </ul>
          </div>

          {/* Affected Artifacts */}
          <div style={{ marginBottom: '18px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
              Affected System Entities:
            </span>
            <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
              {diagnosis.affected_entities.map((ent, i) => (
                <span key={i} style={{ 
                  background: 'rgba(249, 115, 22, 0.1)', 
                  color: 'var(--accent-orange)', 
                  border: '1px solid var(--accent-orange-glow)', 
                  padding: '3px 8px', 
                  borderRadius: '4px', 
                  fontSize: '11px', 
                  fontFamily: 'var(--font-mono)' 
                }}>
                  {ent}
                </span>
              ))}
            </div>
          </div>

          {/* Proposed Patch Diff */}
          <div style={{ marginBottom: '20px' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
              Proposed Engineering Patch:
            </span>
            <pre className="code-box" style={{ 
              background: '#08080c', 
              borderColor: '#262635', 
              fontSize: '12px', 
              lineHeight: 1.5, 
              color: '#34d399' 
            }}>
              {diagnosis.patch_diff}
            </pre>
          </div>

          {/* Explanation */}
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', background: 'rgba(56, 189, 248, 0.08)', padding: '12px', borderRadius: '6px', border: '1px solid rgba(56, 189, 248, 0.2)' }}>
            <strong>Remediation Strategy: </strong>
            {diagnosis.remediation_explanation}
          </div>
        </div>

        {/* Modal Footer with 1-Click Repair */}
        <div style={{
          padding: '16px 20px',
          background: '#181822',
          borderTop: '1px solid var(--border-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>

          <button 
            className="btn btn-primary" 
            onClick={() => onApplyPatch(diagnosis)}
            disabled={applying}
            style={{ background: 'var(--status-success)', borderColor: 'var(--status-success)' }}
          >
            <Wrench size={16} />
            <span>{applying ? 'Applying & Re-Verifying...' : 'Apply Repair Patch & Re-Verify'}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
