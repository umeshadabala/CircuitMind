import React from 'react';
import { Project } from '../types';
import { Cpu, Zap, ShieldAlert, Check } from 'lucide-react';

interface ComponentsViewProps {
  project: Project;
}

export const ComponentsView: React.FC<ComponentsViewProps> = ({ project }) => {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Bill of Materials & Component Catalog</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Curated components, electrical specifications, and pinout allocations for {project.title}.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(310px, 1fr))', gap: '16px' }}>
        {/* Microcontroller Board Card */}
        <div className="card" style={{ borderColor: 'var(--accent-orange-glow)', background: 'linear-gradient(135deg, #14141d 0%, #171317 100%)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            <Cpu size={18} color="var(--accent-orange)" />
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{project.board.display_name}</h3>
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
            {project.board.architecture}
          </div>
          <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
            <div><strong>Logic Voltage:</strong> {project.board.voltage_logic}V TTL</div>
            <div><strong>Supply Voltage:</strong> {project.board.voltage_supply}V via USB / VIN</div>
            <div><strong>Available Pins:</strong> {project.board.pins_available?.length || 29} Header Pins</div>
          </div>
        </div>

        {/* Peripheral Component Cards */}
        {project.components.map((comp) => {
          const compPins = project.pin_assignments.filter(pa => pa.component_id === comp.id);

          return (
            <div key={comp.id} className="card">
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{comp.name}</h3>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>part_id: {comp.part_id}</span>
                </div>
                <span style={{ 
                  fontSize: '10px', 
                  background: 'rgba(255,255,255,0.06)', 
                  padding: '2px 6px', 
                  borderRadius: '4px', 
                  textTransform: 'uppercase', 
                  color: 'var(--accent-orange)' 
                }}>
                  {comp.category}
                </span>
              </div>

              {comp.description && (
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                  {comp.description}
                </p>
              )}

              {/* Pin Mapping for this component */}
              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                  Pin Connections:
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                  {compPins.map((pa, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.02)', padding: '3px 6px', borderRadius: '4px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>{pa.component_pin}</span>
                      <span style={{ color: 'var(--accent-orange)' }}>➔ {pa.board_pin} ({pa.signal_type})</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
