import React, { useState } from 'react';
import { Project } from '../types';
import { 
  Sparkles, 
  Send, 
  Cpu, 
  Sliders, 
  AlertTriangle, 
  CheckCircle2, 
  ArrowRight,
  RefreshCw,
  Terminal
} from 'lucide-react';

interface AiAssistantPanelProps {
  project: Project | null;
  onModify: (instruction: string) => void;
  onSimulate: () => void;
  onInjectDefect: () => void;
  modifying: boolean;
}

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ 
  project, 
  onModify, 
  onSimulate, 
  onInjectDefect,
  modifying 
}) => {
  const [input, setInput] = useState('');

  if (!project) return null;

  // Extract threshold
  let threshold = 20.0;
  for (const r of project.requirements) {
    if (r.target_value) {
      threshold = parseFloat(r.target_value) || 20.0;
    } else if (r.description.includes('50')) {
      threshold = 50.0;
    } else if (r.description.includes('20')) {
      threshold = 20.0;
    }
  }

  const suggestedActions = [
    {
      label: `Change warning threshold to 50 cm`,
      prompt: `Change the warning threshold to 50 cm.`
    },
    {
      label: `Change warning threshold to 20 cm`,
      prompt: `Change the warning threshold to 20 cm.`
    },
    {
      label: `Inject demo defect (Buzzer Pin)`,
      action: onInjectDefect
    },
    {
      label: `Re-run behavioral simulation`,
      action: onSimulate
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !modifying) {
      onModify(input.trim());
      setInput('');
    }
  };

  return (
    <aside className="assistant-panel">
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-orange)" />
          <span>AI Engineering Copilot</span>
        </div>
        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--text-muted)' }}>
          State-Aware
        </span>
      </div>

      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Project Context Box */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '12px' }}>
          <div style={{ fontWeight: 600, color: '#fff', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Cpu size={14} color="var(--accent-orange)" />
            <span>Active Project State</span>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', color: 'var(--text-secondary)' }}>
            <div>Project: <strong style={{ color: '#fff' }}>{project.title}</strong></div>
            <div>Version: <strong style={{ color: 'var(--accent-orange)' }}>v{project.version}</strong></div>
            <div>Threshold: <strong style={{ color: '#fff' }}>{threshold.toFixed(1)} cm</strong></div>
            <div>Validation: <strong style={{ color: project.validation?.status === 'validated' ? 'var(--status-success)' : 'var(--status-warning)' }}>{project.validation?.status}</strong></div>
          </div>
        </div>

        {/* Suggested Quick Actions */}
        <div>
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Suggested Actions:
          </span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {suggestedActions.map((act, i) => (
              <button
                key={i}
                className="btn btn-secondary"
                onClick={() => {
                  if (act.action) {
                    act.action();
                  } else if (act.prompt) {
                    onModify(act.prompt);
                  }
                }}
                disabled={modifying}
                style={{ 
                  justifyContent: 'space-between', 
                  fontSize: '11px', 
                  padding: '7px 10px', 
                  textAlign: 'left' 
                }}
              >
                <span>{act.label}</span>
                <ArrowRight size={12} color="var(--accent-orange)" />
              </button>
            ))}
          </div>
        </div>

        {/* Closed Engineering Loop Explanation */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '12px', fontSize: '11px', color: 'var(--text-muted)', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px' }}>Closed Engineering Loop</div>
          Describe ➔ Design ➔ Generate ➔ Simulate ➔ Test ➔ Diagnose ➔ Repair ➔ Verify ➔ Remember.
        </div>
      </div>

      {/* Input Box for Modifications */}
      <div style={{ padding: '14px', borderTop: '1px solid var(--border-subtle)', background: 'var(--bg-sidebar)' }}>
        <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '6px' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Change threshold to 50 cm..."
            disabled={modifying}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '8px 10px',
              color: '#fff',
              fontSize: '12px',
              outline: 'none'
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={modifying || !input.trim()} style={{ padding: '0 12px' }}>
            {modifying ? <RefreshCw size={12} className="spin" /> : <Send size={12} />}
          </button>
        </form>
      </div>
    </aside>
  );
};
