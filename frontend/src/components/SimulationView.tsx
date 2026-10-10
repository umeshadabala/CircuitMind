import React, { useState } from 'react';
import { Project, SimulationRun } from '../types';
import { 
  PlayCircle, 
  RefreshCw, 
  Terminal, 
  Sliders, 
  ExternalLink, 
  Volume2, 
  VolumeX, 
  Radio, 
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface SimulationViewProps {
  project: Project;
  simRun: SimulationRun | null;
  onSimulate: () => void;
  simulating: boolean;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ 
  project, 
  simRun, 
  onSimulate, 
  simulating 
}) => {
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

  // Interactive Virtual Sensor Slider state
  const [sliderDistance, setSliderDistance] = useState<number>(15.0);

  // Check interactive state
  const isClose = sliderDistance < threshold;
  const pinDefs = Object.fromEntries(project.pin_assignments.map(pa => [`${pa.component_id}_${pa.component_pin}`, pa.board_pin]));
  const buzzerPin = pinDefs['buzzer_2'] || pinDefs['buzzer_SIG'] || 'D19';
  const ledPin = pinDefs['warning_led_A'] || 'D23';
  
  // Note: if buzzer is misassigned to D4 (demo failure scenario), it won't sound!
  const isBuzzerWiredCorrectly = buzzerPin === 'D19';
  const buzzerActive = isClose && isBuzzerWiredCorrectly;
  const ledActive = isClose;

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Physical System Simulation</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Behavioral verification against physical kinematics and microcontroller firmware control loop.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="btn btn-primary" onClick={onSimulate} disabled={simulating}>
            {simulating ? <RefreshCw size={14} className="spin" /> : <PlayCircle size={14} />}
            <span>{simulating ? 'Executing Simulation...' : 'Run Behavioral Simulation'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Virtual Physical Rig Card */}
      <div className="card" style={{ padding: '20px', background: '#0e0e14', borderColor: isClose ? 'var(--accent-orange)' : 'var(--border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>
            <Sliders size={16} color="var(--accent-orange)" />
            <span>Interactive Virtual Physical Testbed</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Calibrated Threshold: <strong style={{ color: 'var(--accent-orange)' }}>{threshold.toFixed(1)} cm</strong>
          </span>
        </div>

        {/* Distance Slider */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
            <span style={{ color: 'var(--text-secondary)' }}>Simulated Obstacle Distance:</span>
            <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: isClose ? '#ef4444' : 'var(--status-success)' }}>
              {sliderDistance.toFixed(1)} cm
            </span>
          </div>
          <input 
            type="range" 
            min="2" 
            max="100" 
            step="1"
            value={sliderDistance} 
            onChange={(e) => setSliderDistance(parseFloat(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
            <span>2 cm (Near limit)</span>
            <span style={{ color: 'var(--accent-orange)' }}>▲ Threshold {threshold} cm</span>
            <span>100 cm (Far field)</span>
          </div>
        </div>

        {/* Live Hardware Actuator Telemetry Displays */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          {/* LED Optical Indicator */}
          <div style={{ 
            background: '#14141c', 
            padding: '16px', 
            borderRadius: '8px', 
            border: `1px solid ${ledActive ? '#ef4444' : 'var(--border-subtle)'}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: ledActive ? '#ef4444' : '#27272a',
              boxShadow: ledActive ? '0 0 24px #ef4444' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              <Radio size={20} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>Optical Alarm LED</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Pin: {ledPin} • State: <strong style={{ color: ledActive ? '#ef4444' : 'var(--text-secondary)' }}>{ledActive ? 'HIGH (ON)' : 'LOW (OFF)'}</strong></div>
            </div>
          </div>

          {/* Piezo Buzzer Acoustic Indicator */}
          <div style={{ 
            background: '#14141c', 
            padding: '16px', 
            borderRadius: '8px', 
            border: `1px solid ${buzzerActive ? '#eab308' : (isClose && !isBuzzerWiredCorrectly ? '#ef4444' : 'var(--border-subtle)')}`,
            display: 'flex',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{ 
              width: '40px', 
              height: '40px', 
              borderRadius: '50%', 
              background: buzzerActive ? '#eab308' : '#27272a',
              boxShadow: buzzerActive ? '0 0 24px #eab308' : 'none',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff'
            }}>
              {buzzerActive ? <Volume2 size={20} /> : <VolumeX size={20} />}
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>Piezo Buzzer (Acoustic)</div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                Pin: {buzzerPin} • State: <strong style={{ color: buzzerActive ? '#eab308' : 'var(--text-secondary)' }}>{buzzerActive ? 'HIGH (PWM ON)' : 'LOW (OFF)'}</strong>
              </div>
              {!isBuzzerWiredCorrectly && isClose && (
                <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                  ⚠ DEFECT: Buzzer routed to {buzzerPin} instead of PWM GPIO19!
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Serial Console Telemetry Window */}
      <div className="terminal-window" style={{ marginBottom: '16px' }}>
        <div className="terminal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} color="var(--accent-orange)" />
            <span>Serial Telemetry Console (115200 baud)</span>
          </div>
          <span>Status: {simRun ? simRun.status.toUpperCase() : 'STANDBY'}</span>
        </div>

        <div className="terminal-body" style={{ minHeight: '180px' }}>
          {simRun?.serial_logs && simRun.serial_logs.length > 0 ? (
            simRun.serial_logs.map((log, i) => (
              <div 
                key={i} 
                className={`terminal-line ${log.includes('WARNING') ? 'warning' : (log.includes('CLEAR') || log.includes('passed') ? 'success' : 'info')}`}
              >
                {log}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Click "Run Behavioral Simulation" above to execute the firmware control loop and stream verified telemetry logs...
            </div>
          )}
        </div>
      </div>

      {/* Wokwi Cloud Simulation Integration Card */}
      <div className="card" style={{ padding: '16px', background: 'rgba(255,255,255,0.02)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: '14px', color: '#fff', marginBottom: '4px' }}>
              Wokwi Web Simulator Handoff
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              CircuitMind generates certified <code>diagram.json</code> and Arduino firmware ready for full browser emulation.
            </p>
          </div>
          <a 
            href="https://wokwi.com" 
            target="_blank" 
            rel="noreferrer" 
            className="btn btn-secondary"
            style={{ textDecoration: 'none' }}
          >
            <span>Launch Wokwi</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
};
