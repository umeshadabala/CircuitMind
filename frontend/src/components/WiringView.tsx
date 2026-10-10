import React, { useState } from 'react';
import { Project } from '../types';
import { Share2, Copy, Check, ExternalLink, Cpu } from 'lucide-react';

interface WiringViewProps {
  project: Project;
}

export const WiringView: React.FC<WiringViewProps> = ({ project }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'diagram' | 'table' | 'wokwi_json'>('diagram');

  const copyWokwiJson = () => {
    // Generate wokwi diagram payload
    const payload = {
      version: 1,
      author: "CircuitMind AI Engineering IDE",
      editor: "wokwi",
      parts: [
        { type: "wokwi-esp32-devkit-v1", id: "board", top: 100, left: 100, attrs: {} },
        ...project.components.map((c, i) => ({
          type: c.part_id === "hc-sr04" ? "wokwi-hc-sr04" : (c.part_id.includes("led") ? "wokwi-led" : (c.part_id.includes("buzzer") ? "wokwi-buzzer" : `wokwi-${c.part_id}`)),
          id: c.id,
          top: 80 + i * 110,
          left: 360,
          attrs: c.attributes || {}
        }))
      ],
      connections: project.connections.map(c => [
        `${c.from_component}:${c.from_pin}`,
        `${c.to_component}:${c.to_pin}`,
        c.color || "orange",
        ["v0"]
      ])
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* View Header with Sub-tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Physical Wiring & Interconnections</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Circuit connection graph mapped to {project.board.display_name} GPIO pins.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button 
            className={`btn ${viewMode === 'diagram' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('diagram')}
          >
            Visual Diagram
          </button>
          <button 
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
          >
            Wiring Table
          </button>
          <button 
            className={`btn ${viewMode === 'wokwi_json' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('wokwi_json')}
          >
            Wokwi diagram.json
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive Visual Schematic Diagram */}
      {viewMode === 'diagram' && (
        <div className="card" style={{ padding: '24px', background: '#0b0b11', overflow: 'hidden' }}>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between' }}>
            <span>Interactive Visual Schematic Graph</span>
            <span style={{ color: 'var(--accent-orange)' }}>● {project.connections.length} Routed Wires</span>
          </div>

          <div style={{ position: 'relative', width: '100%', height: '420px', background: '#07070a', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
            {/* SVG Wire Lines */}
            <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none' }}>
              {project.connections.map((conn, idx) => {
                // Calculate y positions based on components
                const fromY = 80 + idx * 36;
                const toY = 60 + idx * 40;
                const wireColor = conn.color === 'red' ? '#ef4444' : (conn.color === 'black' ? '#64748b' : (conn.color === 'blue' ? '#3b82f6' : (conn.color === 'cyan' ? '#06b6d4' : (conn.color === 'yellow' ? '#eab308' : '#f97316'))));
                return (
                  <path
                    key={conn.id}
                    d={`M 260 ${fromY} C 360 ${fromY}, 440 ${toY}, 540 ${toY}`}
                    stroke={wireColor}
                    strokeWidth="2.5"
                    fill="none"
                    strokeDasharray={conn.signal_type.includes('PWM') ? "4 2" : "none"}
                    opacity="0.85"
                  />
                );
              })}
            </svg>

            {/* Left Block: Microcontroller Board */}
            <div style={{
              position: 'absolute',
              top: '40px',
              left: '40px',
              width: '220px',
              background: '#13131c',
              border: '2px solid #2d2d3d',
              borderRadius: '8px',
              padding: '16px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #2d2d3d', paddingBottom: '8px', marginBottom: '12px' }}>
                <Cpu size={18} color="var(--accent-orange)" />
                <span style={{ fontWeight: 700, fontSize: '13px', color: '#fff' }}>{project.board.display_name}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                {Array.from(new Set(project.pin_assignments.map(p => p.board_pin))).map((pin) => (
                  <div key={pin} style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.03)', padding: '4px 8px', borderRadius: '4px' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>PIN:</span>
                    <span style={{ fontWeight: 600, color: pin.includes('V') ? '#ef4444' : (pin.includes('GND') ? '#94a3b8' : 'var(--accent-orange)') }}>
                      {pin}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Block: Peripherals & Sensors */}
            <div style={{
              position: 'absolute',
              top: '30px',
              right: '40px',
              width: '260px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {project.components.map((comp) => (
                <div 
                  key={comp.id}
                  style={{
                    background: '#13131c',
                    border: '1px solid #2d2d3d',
                    borderRadius: '6px',
                    padding: '10px 14px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)'
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: '12px', color: '#fff', marginBottom: '4px' }}>
                    {comp.name}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                    {comp.pins.map(p => (
                      <span key={p} style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '2px 5px', borderRadius: '3px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Wiring Table */}
      {viewMode === 'table' && (
        <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}>
            <thead>
              <tr style={{ background: '#0e0e14', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                <th style={{ padding: '12px 16px' }}>Origin Endpoint</th>
                <th style={{ padding: '12px 16px' }}>Target Endpoint</th>
                <th style={{ padding: '12px 16px' }}>Signal Type</th>
                <th style={{ padding: '12px 16px' }}>Wire Color</th>
              </tr>
            </thead>
            <tbody>
              {project.connections.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)' }}>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: '#fff' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{c.from_component}:</span>{c.from_pin}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>
                    <span style={{ color: 'var(--text-muted)' }}>{c.to_component}:</span>{c.to_pin}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '4px' }}>
                      {c.signal_type}
                    </span>
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '12px', 
                        height: '12px', 
                        borderRadius: '50%', 
                        background: c.color === 'red' ? '#ef4444' : (c.color === 'black' ? '#1e293b' : (c.color === 'blue' ? '#3b82f6' : (c.color === 'cyan' ? '#06b6d4' : (c.color === 'yellow' ? '#eab308' : '#f97316')))),
                        border: '1px solid rgba(255,255,255,0.2)'
                      }} />
                      <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{c.color}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mode 3: Wokwi diagram.json */}
      {viewMode === 'wokwi_json' && (
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div>
              <span style={{ fontWeight: 600, color: '#fff', fontSize: '14px' }}>Wokwi Simulator diagram.json</span>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Directly importable into Wokwi Web Simulator.
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn btn-secondary" onClick={copyWokwiJson}>
                {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
                <span>{copied ? 'Copied!' : 'Copy diagram.json'}</span>
              </button>
              <a 
                href="https://wokwi.com" 
                target="_blank" 
                rel="noreferrer" 
                className="btn btn-primary"
                style={{ textDecoration: 'none' }}
              >
                <span>Open Wokwi</span>
                <ExternalLink size={14} />
              </a>
            </div>
          </div>

          <pre className="code-box" style={{ maxHeight: '380px' }}>
            {JSON.stringify({
              version: 1,
              author: "CircuitMind AI Engineering IDE",
              editor: "wokwi",
              parts: [
                { type: "wokwi-esp32-devkit-v1", id: "board", top: 100, left: 100, attrs: {} },
                ...project.components.map((c, i) => ({
                  type: c.part_id === "hc-sr04" ? "wokwi-hc-sr04" : (c.part_id.includes("led") ? "wokwi-led" : (c.part_id.includes("buzzer") ? "wokwi-buzzer" : `wokwi-${c.part_id}`)),
                  id: c.id,
                  top: 80 + i * 110,
                  left: 360,
                  attrs: c.attributes || {}
                }))
              ],
              connections: project.connections.map(c => [
                `${c.from_component}:${c.from_pin}`,
                `${c.to_component}:${c.to_pin}`,
                c.color || "orange",
                ["v0"]
              ])
            }, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
