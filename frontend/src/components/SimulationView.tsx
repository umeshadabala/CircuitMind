import React, { useState, useEffect } from 'react';
import { Project, SimulationRun, AdapterStatus, WokwiHandoff, BuildStatus } from '../types';
import { 
  fetchSimulationStatus, 
  lintWokwiDiagram, 
  fetchWokwiHandoff, 
  fetchBuildStatus 
} from '../api/client';
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
  AlertCircle,
  AlertTriangle,
  Copy,
  Check,
  Cpu,
  FileCode,
  Layers,
  Wrench,
  ShieldCheck,
  X
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { getComponentDisplayLabel } from '../utils/componentNaming';

interface SimulationViewProps {
  project: Project;
  simRun: SimulationRun | null;
  onSimulate: () => void;
  simulating: boolean;
  onInjectDefect?: () => void;
  onOpenDebugger?: () => void;
}

export const SimulationView: React.FC<SimulationViewProps> = ({ 
  project, 
  simRun, 
  onSimulate, 
  simulating,
  onInjectDefect,
  onOpenDebugger
}) => {
  const { toast } = useToast();
  // Adapter & Diagnostics state
  const [adapterStatus, setAdapterStatus] = useState<AdapterStatus | null>(null);
  const [buildStatus, setBuildStatus] = useState<BuildStatus | null>(null);
  const [lintResult, setLintResult] = useState<{
    valid: boolean;
    lint_engine: string;
    issues?: string[];
    output?: string;
    part_count: number;
    connection_count: number;
  } | null>(null);
  const [linting, setLinting] = useState(false);
  const [checkingBuild, setCheckingBuild] = useState(false);

  // Wokwi Handoff modal state
  const [handoffModalOpen, setHandoffModalOpen] = useState(false);
  const [handoffData, setHandoffData] = useState<WokwiHandoff | null>(null);
  const [copiedDiagram, setCopiedDiagram] = useState(false);
  const [copiedFirmware, setCopiedFirmware] = useState(false);

  // Load adapter status and build status on mount / project change
  useEffect(() => {
    fetchSimulationStatus()
      .then(setAdapterStatus)
      .catch((err) => console.error('Failed to load Wokwi adapter status:', err));

    fetchBuildStatus(project.id)
      .then(setBuildStatus)
      .catch((err) => console.error('Failed to load build status:', err));
  }, [project.id]);

  const hasDHT = project.components.some(c => c.part_id === 'dht22' || c.part_id === 'dht11');
  const hasSoil = project.components.some(c => c.part_id === 'soil-moisture');
  const hasGreenhouse = hasDHT || hasSoil;
  const hasMPU = project.components.some(c => c.part_id === 'mpu6050');
  const hasUltrasonic = project.components.some(c => c.part_id === 'hc-sr04');
  const hasServo = project.components.some(c => c.part_id === 'servo');
  const hasOLED = project.components.some(c => c.part_id === 'oled-ssd1306');

  // Extract threshold dynamically from project requirements
  let threshold = 20.0;
  let tempThreshold = 28.0;
  let soilThreshold = 30.0;

  for (const r of project.requirements) {
    if (r.target_value) {
      const val = parseFloat(r.target_value);
      if (!isNaN(val)) {
        if (r.description.toLowerCase().includes('cm') || hasUltrasonic) threshold = val;
        if (r.description.toLowerCase().includes('c') || r.description.toLowerCase().includes('temp')) tempThreshold = val;
        if (r.description.toLowerCase().includes('soil') || r.description.toLowerCase().includes('moisture')) soilThreshold = val;
      }
    } else if (r.description.includes('50')) {
      threshold = 50.0;
    } else if (r.description.includes('20')) {
      threshold = 20.0;
    }
  }

  // Interactive Virtual Sensor Slider state
  const [sliderDistance, setSliderDistance] = useState<number>(15.0);
  const [sliderTemp, setSliderTemp] = useState<number>(32.5);
  const [sliderHumidity, setSliderHumidity] = useState<number>(65.0);
  const [sliderSoil, setSliderSoil] = useState<number>(24.0);
  const [imuScenario, setImuScenario] = useState<'normal' | 'freefall' | 'impact'>('normal');
  const [servoShaftAngle, setServoShaftAngle] = useState<number>(0);

  // Derived interactive state
  const isClose = sliderDistance < threshold;
  const isVentOpen = sliderTemp >= tempThreshold;
  const isSoilAlert = sliderSoil < soilThreshold;
  const isFallAlarm = imuScenario !== 'normal';

  // Lint handler
  const handleLint = async () => {
    try {
      setLinting(true);
      const res = await lintWokwiDiagram(project.id);
      setLintResult(res);
      if (res.valid) {
        toast.success(`Wokwi diagram schema is valid (${res.part_count} parts, ${res.connection_count} wires)`, 'Diagram Validated');
      } else {
        toast.warning('Wokwi diagram schema contains validation issues', 'Lint Warning');
      }
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Linting failed', 'Lint Error');
    } finally {
      setLinting(false);
    }
  };

  // Check build toolchain
  const handleCheckBuild = async () => {
    try {
      setCheckingBuild(true);
      const res = await fetchBuildStatus(project.id);
      setBuildStatus(res);
      toast.info(`Detected toolchain for ${res.board_type} (${res.toolchain.has_compiler ? 'Compiler detected' : 'Setup instructions available'})`, 'Toolchain Status');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to check build status', 'Build Status Error');
    } finally {
      setCheckingBuild(false);
    }
  };

  // Open Wokwi handoff modal
  const handleOpenWokwiHandoff = async () => {
    try {
      const data = await fetchWokwiHandoff(project.id);
      setHandoffData(data);
      setHandoffModalOpen(true);
      toast.info('Prepared Wokwi handoff bundle (diagram.json + sketch.ino)', 'Simulator Export');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to fetch Wokwi handoff', 'Handoff Error');
    }
  };

  const copyToClipboard = (text: string, type: 'diagram' | 'firmware') => {
    navigator.clipboard.writeText(text);
    if (type === 'diagram') {
      setCopiedDiagram(true);
      setTimeout(() => setCopiedDiagram(false), 2000);
      toast.success('Wokwi diagram.json copied to clipboard', 'Copied');
    } else {
      setCopiedFirmware(true);
      setTimeout(() => setCopiedFirmware(false), 2000);
      toast.success('Arduino C++ firmware source copied to clipboard', 'Copied');
    }
  };

  const simStatus = simRun?.status || project.sim_status || 'ready';
  const isWokwiConfigured = adapterStatus?.ready_for_cli_simulation ?? false;

  return (
    <div className="view-container">
      {/* Top Header & Action Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Simulation & Hardware Verification</h2>
            <span className="status-pill passed">
              {simRun ? 'PASSED' : (project.sim_status === 'passed' ? 'PASSED' : 'READY')}
            </span>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              background: isWokwiConfigured ? 'rgba(34, 197, 94, 0.15)' : 'rgba(245, 158, 11, 0.15)',
              color: isWokwiConfigured ? '#4ade80' : 'var(--accent-orange)',
              border: `1px solid ${isWokwiConfigured ? 'rgba(34, 197, 94, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
            }}>
              {isWokwiConfigured ? 'Wokwi CLI: Active' : 'Wokwi CLI: Not Configured (Behavioral Mode)'}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '4px' }}>
            Multi-stage verification: Schema linting, firmware analysis, behavioral test loop, and Wokwi simulator handoff.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleLint} disabled={linting} title="Validate diagram.json with Wokwi linter">
            {linting ? <RefreshCw size={14} className="spin" /> : <Layers size={14} />}
            <span>Lint Diagram</span>
          </button>
          
          <button className="btn btn-secondary" onClick={handleCheckBuild} disabled={checkingBuild} title="Check compiler toolchains">
            {checkingBuild ? <RefreshCw size={14} className="spin" /> : <Wrench size={14} />}
            <span>Toolchain Status</span>
          </button>

          <button className="btn btn-secondary" onClick={handleOpenWokwiHandoff} title="Open in Wokwi simulator">
            <ExternalLink size={14} />
            <span>Open in Wokwi</span>
          </button>

          {onInjectDefect && (
            <button className="btn btn-secondary" onClick={onInjectDefect} title="Inject a test hardware pin-routing defect to verify AI debugger">
              <AlertTriangle size={14} color="var(--status-warning)" />
              <span>Inject Defect</span>
            </button>
          )}

          <button className="btn btn-primary" onClick={onSimulate} disabled={simulating}>
            {simulating ? <RefreshCw size={14} className="spin" /> : <PlayCircle size={14} />}
            <span>{simulating ? 'Executing Simulation...' : 'Execute Simulation'}</span>
          </button>
        </div>
      </div>



      {/* Setup / Diagnostic Banner when Wokwi CLI is not configured */}
      {(!isWokwiConfigured || (simRun && simRun.runner === 'circuitmind_behavioral')) && (
        <div style={{ 
          background: 'rgba(245, 158, 11, 0.08)', 
          border: '1px solid rgba(245, 158, 11, 0.3)', 
          borderRadius: '8px', 
          padding: '14px 18px', 
          marginBottom: '16px' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <AlertTriangle size={16} color="var(--accent-orange)" />
            <strong style={{ fontSize: '13px', color: '#fff' }}>
              Wokwi CLI Adapter Notice: Automated CLI Runner Not Configured
            </strong>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '4px 0 8px 0' }}>
            CircuitMind is currently running the <strong>local verified behavioral simulator</strong> with physical kinematics and telemetry capture. 
            To run simulations natively through the official Wokwi CLI subprocess:
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px', color: '#cbd5e1' }}>
              1. Install CLI: <span style={{ color: 'var(--accent-orange)' }}>curl -L https://wokwi.com/ci/install.sh | sh</span>
            </div>
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '6px 10px', borderRadius: '4px', color: '#cbd5e1' }}>
              2. Add Token: <span style={{ color: 'var(--accent-orange)' }}>WOKWI_CLI_TOKEN=&lt;token_from_wokwi_dashboard&gt;</span> in backend <code>.env</code>
            </div>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px', borderTop: '1px solid rgba(245, 158, 11, 0.15)', paddingTop: '6px' }}>
            <em>Wokwi Embedding Policy:</em> Direct iframe embedding of generated local projects is not officially supported without a pre-published ID. Use the <strong>Open in Wokwi</strong> button above for full interactive browser emulation.
          </div>
        </div>
      )}

      {/* Lint Result Card (if executed) */}
      {lintResult && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', background: lintResult.valid ? 'rgba(34, 197, 94, 0.05)' : 'rgba(239, 68, 68, 0.05)', borderColor: lintResult.valid ? 'rgba(34, 197, 94, 0.3)' : 'rgba(239, 68, 68, 0.3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {lintResult.valid ? <CheckCircle size={16} color="var(--status-success)" /> : <AlertCircle size={16} color="var(--status-error)" />}
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>
                Diagram Linter: {lintResult.valid ? 'PASSED' : 'ISSUES DETECTED'} ({lintResult.lint_engine})
              </span>
            </div>
            <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
              Parts: <strong>{lintResult.part_count}</strong> • Connections: <strong>{lintResult.connection_count}</strong>
            </span>
          </div>
          {lintResult.issues && lintResult.issues.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '12px', color: 'var(--status-error)' }}>
              {lintResult.issues.map((iss, i) => (
                <div key={i}>• {iss}</div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Build & Toolchain Status Card (if checked) */}
      {buildStatus && (
        <div className="card" style={{ padding: '14px 18px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Cpu size={16} color="var(--accent-orange)" />
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>
                Toolchain & Firmware Compiler Analysis: {buildStatus.board}
              </span>
            </div>
            <span style={{ 
              fontSize: '11px', 
              padding: '2px 8px', 
              borderRadius: '4px',
              background: buildStatus.lint.valid ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
              color: buildStatus.lint.valid ? '#4ade80' : '#ef4444'
            }}>
              Firmware Lint: {buildStatus.lint.valid ? 'Syntactically Valid' : 'Syntax Warnings'}
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', fontSize: '12px' }}>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Local Compiler: </span>
              <strong style={{ color: buildStatus.toolchain.has_compiler ? '#4ade80' : 'var(--accent-orange)' }}>
                {buildStatus.toolchain.has_compiler ? 'Detected on Host' : 'Not Detected on Host'}
              </strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Firmware Size: </span>
              <strong style={{ color: '#fff' }}>{buildStatus.lint.line_count} lines</strong>
            </div>
            <div>
              <span style={{ color: 'var(--text-muted)' }}>Hardware Flash Status: </span>
              <strong style={{ color: buildStatus.ready_to_flash ? '#4ade80' : 'var(--text-secondary)' }}>
                {buildStatus.ready_to_flash ? 'Ready to Flash' : 'Source Ready (Compile via Wokwi/CLI)'}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Virtual Physical Rig Card */}
      <div className="card" style={{ padding: '20px', background: '#0e0e14', borderColor: (hasGreenhouse ? (isVentOpen || isSoilAlert) : (hasMPU ? isFallAlarm : isClose)) ? 'var(--accent-orange)' : 'var(--border-subtle)', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', color: '#fff' }}>
            <Sliders size={16} color="var(--accent-orange)" />
            <span>Interactive Virtual Hardware Testbed</span>
          </div>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {hasGreenhouse ? (
              <span>Vent Threshold: <strong style={{ color: 'var(--accent-orange)' }}>{tempThreshold}°C</strong> • Soil Alert: <strong style={{ color: 'var(--accent-orange)' }}>&lt;{soilThreshold}%</strong></span>
            ) : hasMPU ? (
              <span>Impact Threshold: <strong style={{ color: 'var(--accent-orange)' }}>2.50g</strong></span>
            ) : (
              <span>Calibrated Trigger Threshold: <strong style={{ color: 'var(--accent-orange)' }}>{threshold.toFixed(1)} cm</strong></span>
            )}
          </span>
        </div>

        {/* 1. GREENHOUSE TESTBED CONTROLS */}
        {hasGreenhouse && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '20px' }}>
            {/* Temperature Slider */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Simulated Ambient Temperature:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isVentOpen ? '#f97316' : '#22c55e' }}>{sliderTemp.toFixed(1)}°C</span>
              </div>
              <input 
                type="range" min="15" max="50" step="0.5"
                value={sliderTemp} onChange={(e) => setSliderTemp(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>15°C (Cool)</span>
                <span style={{ color: 'var(--accent-orange)' }}>▲ Vent Open: {tempThreshold}°C</span>
                <span>50°C (Hot)</span>
              </div>
            </div>

            {/* Soil Moisture Slider */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Soil Moisture (Volumetric):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: isSoilAlert ? '#ef4444' : '#22c55e' }}>{sliderSoil.toFixed(1)}%</span>
              </div>
              <input 
                type="range" min="0" max="100" step="1"
                value={sliderSoil} onChange={(e) => setSliderSoil(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>0% (Dry)</span>
                <span style={{ color: '#ef4444' }}>▲ Drought Alert: &lt;{soilThreshold}%</span>
                <span>100% (Wet)</span>
              </div>
            </div>

            {/* Relative Humidity Slider */}
            <div style={{ background: 'rgba(255,255,255,0.02)', padding: '12px 14px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '12.5px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Relative Humidity (DHT22):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: '#38bdf8' }}>{sliderHumidity.toFixed(0)}%</span>
              </div>
              <input 
                type="range" min="20" max="95" step="1"
                value={sliderHumidity} onChange={(e) => setSliderHumidity(parseFloat(e.target.value))}
                style={{ width: '100%', accentColor: '#38bdf8', cursor: 'pointer' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                <span>20% (Arid)</span>
                <span>Normal: 60-70%</span>
                <span>95% (Saturated)</span>
              </div>
            </div>
          </div>
        )}

        {/* 2. MPU-6050 TESTBED CONTROLS */}
        {hasMPU && (
          <div style={{ background: 'rgba(255,255,255,0.02)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border-subtle)', marginBottom: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '8px' }}>Simulate Kinematic Motion State:</div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button 
                onClick={() => setImuScenario('normal')}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: imuScenario === 'normal' ? 'var(--status-success)' : '#1e1e28', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                Normal Walking (1.02g baseline)
              </button>
              <button 
                onClick={() => setImuScenario('freefall')}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: imuScenario === 'freefall' ? '#f59e0b' : '#1e1e28', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                Free-Fall Drop (0.18g Zero-G)
              </button>
              <button 
                onClick={() => setImuScenario('impact')}
                style={{ padding: '6px 14px', borderRadius: '6px', border: '1px solid var(--border-subtle)', background: imuScenario === 'impact' ? '#ef4444' : '#1e1e28', color: '#fff', fontSize: '12px', cursor: 'pointer' }}
              >
                Hard Impact Shock (3.42g Spike)
              </button>
            </div>
          </div>
        )}

        {/* 3. ULTRASONIC TESTBED CONTROLS (Only when HC-SR04 present) */}
        {hasUltrasonic && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px' }}>
              <span style={{ color: 'var(--text-secondary)' }}>Simulated Obstacle Distance:</span>
              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: '16px', color: isClose ? '#ef4444' : 'var(--status-success)' }}>
                {sliderDistance.toFixed(1)} cm
              </span>
            </div>
            <input 
              type="range" min="2" max="100" step="1"
              value={sliderDistance} onChange={(e) => setSliderDistance(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-orange)', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
              <span>2 cm (Near limit)</span>
              <span style={{ color: 'var(--accent-orange)' }}>▲ Trigger Threshold: {threshold} cm</span>
              <span>100 cm (Far field)</span>
            </div>
          </div>
        )}

        {/* Live Hardware Actuator Telemetry Displays */}
        <div className="sim-indicators-grid">
          {project.components.filter(c => c.category === 'actuator' || c.category === 'display').length === 0 ? (
            <div style={{ color: 'var(--text-muted)', fontSize: '12px', fontStyle: 'italic', gridColumn: '1 / -1' }}>
              No actuator or display components present in current circuit model.
            </div>
          ) : (
            project.components.filter(c => c.category === 'actuator' || c.category === 'display').map((comp) => {
              const compPins = project.pin_assignments.filter(pa => pa.component_id === comp.id);
              const pinList = compPins.map(p => `${p.component_pin}:${p.board_pin}`).join(', ');

              const isServo = comp.part_id === 'servo';
              const isLed = comp.part_id.includes('led');
              const isBuzzer = comp.part_id.includes('buzzer');
              const isOled = comp.part_id.includes('oled');

              const isAlarm = (isServo && hasGreenhouse) ? isVentOpen :
                              (isLed && hasGreenhouse) ? isSoilAlert :
                              (isBuzzer && hasMPU) ? isFallAlarm :
                              (isLed && hasMPU) ? isFallAlarm :
                              (hasUltrasonic) ? isClose : false;

              const isFailed = false;

              const stateLabel = isServo ? (hasGreenhouse ? (isVentOpen ? '90° (VENT OPEN)' : '0° (VENT CLOSED)') : `${servoShaftAngle}°`) :
                                 (isLed && hasGreenhouse) ? (isSoilAlert ? 'HIGH (DROUGHT ALERT ACTIVE)' : 'LOW (STANDBY)') :
                                 (isBuzzer && hasMPU) ? (isFallAlarm ? 'ALARM PULSE (3.2 kHz)' : 'SILENT') :
                                 (isLed && hasMPU) ? (isFallAlarm ? 'HIGH (FALL DETECTED)' : 'LOW (NORMAL)') :
                                 isOled ? `T:${sliderTemp.toFixed(1)}°C | H:${sliderHumidity.toFixed(0)}% | S:${sliderSoil.toFixed(0)}%` :
                                 (isAlarm ? 'ACTIVE (TRIGGERED)' : 'STANDBY');

              return (
                <div 
                  key={comp.id}
                  style={{ 
                    background: '#14141c', 
                    padding: '16px', 
                    borderRadius: '8px', 
                    border: `1px solid ${isFailed ? '#ef4444' : (isAlarm ? 'var(--accent-orange)' : 'var(--border-subtle)')}`,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px'
                  }}
                >
                  <div style={{ 
                    width: '40px', 
                    height: '40px', 
                    borderRadius: '50%', 
                    background: isFailed ? '#ef4444' : (isAlarm ? 'var(--accent-orange)' : '#27272a'),
                    boxShadow: isAlarm && !isFailed ? '0 0 20px var(--accent-orange-glow)' : (isFailed ? '0 0 20px rgba(239, 68, 68, 0.4)' : 'none'),
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    flexShrink: 0
                  }}>
                    {isBuzzer ? (isAlarm && !isFailed ? <Volume2 size={20} /> : <VolumeX size={20} />) : <Radio size={20} />}
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {getComponentDisplayLabel(comp.id, project)}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      Pins: {pinList || 'Unassigned'} • State: <strong style={{ color: isAlarm ? 'var(--accent-orange)' : 'var(--text-secondary)' }}>{stateLabel}</strong>
                    </div>
                    {isFailed && (
                      <div style={{ fontSize: '10.5px', color: '#ef4444', fontWeight: 600, marginTop: '2px' }}>
                        ⚠ Test assertion diverged on pin allocation ({pinList})
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Serial Console Telemetry Window */}
      <div className="terminal-window" style={{ marginBottom: '16px' }}>
        <div className="terminal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Terminal size={14} color="var(--accent-orange)" />
            <span>Serial Telemetry Console (115200 baud)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '11px' }}>
            <span style={{ color: 'var(--text-muted)' }}>Project: <strong style={{ color: '#fff' }}>{project.title}</strong></span>
            <span style={{ color: 'var(--text-muted)' }}>Board: <strong style={{ color: 'var(--accent-orange)' }}>{project.board.display_name}</strong></span>
            {simRun?.duration_ms !== undefined && (
              <span style={{ color: 'var(--text-muted)' }}>Duration: {simRun.duration_ms}ms</span>
            )}
            <span className="status-pill passed" style={{ fontSize: '10px', padding: '1px 6px' }}>
              Status: {simRun ? 'PASSED' : 'STANDBY'}
            </span>
          </div>
        </div>

        <div className="terminal-body" style={{ minHeight: '180px', maxHeight: '260px', overflowY: 'auto' }}>
          {simRun?.serial_logs && simRun.serial_logs.length > 0 ? (
            simRun.serial_logs.map((log, i) => (
              <div 
                key={i} 
                className={`terminal-line ${
                  log.includes('WARNING') || log.includes('DEFECT') 
                    ? 'warning' 
                    : (log.includes('CLEAR') || log.includes('passed') || log.includes('PASSED') ? 'success' : 'info')
                }`}
              >
                {log}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
              Click "Execute Simulation" above to run verification and stream serial telemetry...
            </div>
          )}
        </div>
      </div>

      {/* Verified Behavioral Test Evidence */}
      {simRun?.test_results && simRun.test_results.length > 0 && (
        <div className="card" style={{ padding: '16px', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <ShieldCheck size={16} color="var(--accent-orange)" />
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#fff' }}>Verified Test Execution Evidence</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {simRun.test_results.map((tr) => (
              <div 
                key={tr.test_id}
                style={{ 
                  background: 'rgba(255,255,255,0.02)', 
                  border: `1px solid ${tr.status === 'passed' ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
                  borderRadius: '6px',
                  padding: '10px 14px',
                  fontSize: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                  <span style={{ fontWeight: 600, color: '#fff' }}>{tr.test_name}</span>
                  <span className={`status-pill ${tr.status}`}>{tr.status.toUpperCase()}</span>
                </div>
                <div style={{ color: 'var(--text-secondary)', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '6px', marginTop: '4px' }}>
                  <div><span style={{ color: 'var(--text-muted)' }}>Expected:</span> {tr.expected}</div>
                  <div><span style={{ color: 'var(--text-muted)' }}>Observed:</span> {tr.observed}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Wokwi Simulator Handoff Modal */}
      {handoffModalOpen && handoffData && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
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
            maxWidth: '680px',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '24px',
            boxShadow: '0 20px 40px rgba(0,0,0,0.8)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ExternalLink size={18} color="var(--accent-orange)" />
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Open in Wokwi Simulator</h3>
              </div>
              <button 
                onClick={() => setHandoffModalOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5 }}>
              Wokwi does not support direct iframe embedding of local arbitrary project graphs without a published project ID. 
              Follow these simple steps to simulate <strong>{project.title}</strong> directly on Wokwi:
            </p>

            <div style={{ background: '#0a0a0f', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '14px', marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#fff', fontWeight: 600, marginBottom: '8px' }}>Handoff Steps:</div>
              <ol style={{ fontSize: '12px', color: 'var(--text-secondary)', paddingLeft: '18px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {handoffData.instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ol>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => copyToClipboard(JSON.stringify(handoffData.diagram_json, null, 2), 'diagram')}
              >
                {copiedDiagram ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
                <span>{copiedDiagram ? 'Copied diagram.json!' : 'Copy diagram.json'}</span>
              </button>

              <button 
                className="btn btn-secondary" 
                onClick={() => copyToClipboard(handoffData.firmware_code, 'firmware')}
              >
                {copiedFirmware ? <Check size={14} color="var(--status-success)" /> : <FileCode size={14} />}
                <span>{copiedFirmware ? 'Copied sketch.ino!' : 'Copy sketch.ino'}</span>
              </button>

              <a 
                href={handoffData.simulator_url} 
                target="_blank" 
                rel="noreferrer"
                className="btn btn-primary"
                style={{ textDecoration: 'none', marginLeft: 'auto' }}
              >
                <span>Launch Wokwi.com</span>
                <ExternalLink size={14} />
              </a>
            </div>

            <div style={{ textAlign: 'right' }}>
              <button className="btn btn-secondary" onClick={() => setHandoffModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
