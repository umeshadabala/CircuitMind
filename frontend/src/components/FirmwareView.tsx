import React, { useState } from 'react';
import { Project } from '../types';
import { Code2, Copy, Check, Download, Cpu, Terminal } from 'lucide-react';

interface FirmwareViewProps {
  project: Project;
}

export const FirmwareView: React.FC<FirmwareViewProps> = ({ project }) => {
  const [copied, setCopied] = useState(false);
  const firmware = project.firmware?.[0];
  const code = firmware?.code || '// No firmware generated yet.';

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadSketch = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = firmware?.filename || 'sketch.ino';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Generated Firmware Source</h2>
            <span className="version-chip">v{firmware?.version || project.version}</span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Target: {project.board.display_name} • File: {firmware?.filename || 'sketch.ino'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-secondary" onClick={copyCode}>
            {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy Code'}</span>
          </button>
          <button className="btn btn-primary" onClick={downloadSketch}>
            <Download size={14} />
            <span>Download .ino</span>
          </button>
        </div>
      </div>

      {/* Firmware Pin Architecture Legend */}
      <div className="card" style={{ padding: '14px 18px', display: 'flex', gap: '24px', alignItems: 'center', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600, color: '#fff' }}>
          <Cpu size={16} color="var(--accent-orange)" />
          <span>Macro Definitions:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
          {project.pin_assignments.map((pa, idx) => (
            <span key={idx} style={{ background: 'rgba(255,255,255,0.05)', padding: '3px 8px', borderRadius: '4px' }}>
              <span style={{ color: 'var(--text-muted)' }}>{pa.component_id.toUpperCase()}_{pa.component_pin}:</span>{' '}
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{pa.board_pin}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Code Editor Window with Line Numbers */}
      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <div style={{ background: '#0e0e14', padding: '10px 16px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Code2 size={14} color="var(--accent-orange)" />
            <span>{firmware?.filename || 'sketch.ino'}</span>
          </div>
          <span>C++ (Arduino Toolchain)</span>
        </div>

        <pre className="code-box" style={{ borderRadius: 0, border: 'none', maxHeight: '520px' }}>
          <code>{code}</code>
        </pre>
      </div>
    </div>
  );
};
