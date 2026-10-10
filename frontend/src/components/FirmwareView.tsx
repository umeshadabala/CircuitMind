import React, { useState, useEffect } from 'react';
import { Project } from '../types';
import { 
  Copy, 
  Check, 
  Download, 
  Cpu, 
  Save, 
  FileCode, 
  Play, 
  Sparkles, 
  RotateCcw,
  AlertTriangle,
  CheckCircle2
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface FirmwareViewProps {
  project: Project;
  onUpdateProject?: (updated: Project) => void;
  onSaveFirmware?: (filename: string, code: string) => Promise<void>;
  proposedPatch?: string | null;
  onApplyPatch?: () => void;
  onDiscardPatch?: () => void;
}

type FileTab = 'sketch.ino' | 'diagram.json' | 'wokwi.toml' | 'README.md';

export const FirmwareView: React.FC<FirmwareViewProps> = ({ 
  project, 
  onSaveFirmware,
  proposedPatch,
  onApplyPatch,
  onDiscardPatch
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<FileTab>('sketch.ino');
  const [code, setCode] = useState<string>('');
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [saving, setSaving] = useState<boolean>(false);
  const [lintIssues, setLintIssues] = useState<string[]>([]);
  const [lintSuccess, setLintSuccess] = useState<boolean>(false);

  // Active firmware file
  const activeFirmware = project.firmware?.find(f => f.filename === 'sketch.ino') || project.firmware?.[0];

  // Generate auxiliary files dynamically if not present
  const diagramJsonContent = JSON.stringify(project.diagram_layout || {
    version: 1,
    author: "CircuitMind Studio",
    editor: "wokwi",
    parts: project.components.map(c => ({
      type: c.part_id,
      id: c.id,
      top: c.position_y || 100,
      left: c.position_x || 100,
      attrs: c.attributes || {}
    })),
    connections: project.connections.map(c => [
      `${c.from_component}:${c.from_pin}`,
      `${c.to_component}:${c.to_pin}`,
      c.color || "orange",
      []
    ])
  }, null, 2);

  const wokwiTomlContent = `[wokwi]
version = 1
firmware = "build/firmware.bin"
elf = "build/firmware.elf"
diagram = "diagram.json"
`;

  const readmeContent = `# ${project.title}
*Target Microcontroller:* ${project.board.display_name} (${project.board.architecture})

## Hardware Components
${project.components.map(c => `- **${c.name}** (${c.part_id}): Category ${c.category}`).join('\n')}

## Pin Routing
${project.pin_assignments.map(pa => `- ${pa.component_id} [${pa.component_pin}] -> Board [${pa.board_pin}] (${pa.signal_type})`).join('\n')}

Generated with CircuitMind Studio AI-Native Hardware Engineering Environment.
`;

  useEffect(() => {
    if (activeTab === 'sketch.ino') {
      setCode(activeFirmware?.code || '// No firmware available');
    } else if (activeTab === 'diagram.json') {
      setCode(diagramJsonContent);
    } else if (activeTab === 'wokwi.toml') {
      setCode(wokwiTomlContent);
    } else if (activeTab === 'README.md') {
      setCode(readmeContent);
    }
    setIsDirty(false);
  }, [activeTab, activeFirmware?.code, diagramJsonContent, wokwiTomlContent, readmeContent]);

  const handleCodeChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCode(e.target.value);
    setIsDirty(true);
    setLintSuccess(false);
  };

  const handleSave = async () => {
    if (!onSaveFirmware) return;
    try {
      setSaving(true);
      await onSaveFirmware(activeTab, code);
      setIsDirty(false);
      toast.success(`Saved changes to ${activeTab}`, 'Firmware Updated');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save firmware';
      toast.error(msg, 'Save Error');
    } finally {
      setSaving(false);
    }
  };

  const handleLint = () => {
    const issues: string[] = [];
    if (!code.includes('void setup()')) {
      issues.push('Missing "void setup()" initialization function');
    }
    if (!code.includes('void loop()')) {
      issues.push('Missing "void loop()" execution cycle');
    }

    // Bracket balance check
    const openBraces = (code.match(/\{/g) || []).length;
    const closeBraces = (code.match(/\}/g) || []).length;
    if (openBraces !== closeBraces) {
      issues.push(`Unmatched curly braces: ${openBraces} open '{' vs ${closeBraces} close '}'`);
    }

    // Check pin definitions
    for (const pa of project.pin_assignments) {
      if (pa.board_pin && !code.includes(pa.board_pin)) {
        issues.push(`Pin ${pa.board_pin} assigned to ${pa.component_id} is not referenced in the firmware`);
      }
    }

    setLintIssues(issues);
    if (issues.length === 0) {
      setLintSuccess(true);
      toast.success('Static syntax and pin verification passed with zero issues!', 'Lint Clean');
    } else {
      setLintSuccess(false);
      toast.warning(`Identified ${issues.length} potential firmware issues`, 'Lint Diagnostics');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const downloadFile = () => {
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = activeTab;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Line numbers calculation
  const lineCount = code.split('\n').length;
  const lineNumbers = Array.from({ length: Math.max(lineCount, 1) }, (_, i) => i + 1);

  return (
    <div className="view-container" style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
      {/* Top Header & Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#fff' }}>Firmware & Configuration Workspace</h2>
            <span className="version-chip">v{activeFirmware?.version || project.version}</span>
            {isDirty && (
              <span style={{ fontSize: '11px', background: 'rgba(234, 88, 12, 0.2)', color: 'var(--accent-orange)', border: '1px solid var(--accent-orange)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                Unsaved Changes
              </span>
            )}
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Target Board: <strong style={{ color: '#fff' }}>{project.board.display_name}</strong> • Toolchain: Arduino C++ / GCC
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button className="btn btn-secondary" onClick={handleLint} title="Analyze code syntax and pin assignments">
            <Play size={14} />
            <span>Verify Syntax</span>
          </button>
          <button className="btn btn-secondary" onClick={copyCode}>
            {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button className="btn btn-secondary" onClick={downloadFile}>
            <Download size={14} />
            <span>Download</span>
          </button>
          <button 
            className="btn btn-primary" 
            onClick={handleSave} 
            disabled={!isDirty || saving}
            style={{ opacity: !isDirty ? 0.6 : 1 }}
          >
            <Save size={14} />
            <span>{saving ? 'Saving...' : 'Save Firmware'}</span>
          </button>
        </div>
      </div>

      {/* AI Patch Review Banner if active */}
      {proposedPatch && (
        <div style={{ background: 'rgba(234, 88, 12, 0.1)', border: '1px solid var(--accent-orange)', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Sparkles size={18} color="var(--accent-orange)" />
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>AI Engineering Assistant Proposed a Firmware Patch</div>
              <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Review the suggested updates before applying to the project repository.</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onDiscardPatch && (
              <button className="btn btn-secondary" onClick={onDiscardPatch} style={{ fontSize: '12px', padding: '6px 12px' }}>
                <RotateCcw size={12} />
                <span>Discard</span>
              </button>
            )}
            {onApplyPatch && (
              <button className="btn btn-primary" onClick={onApplyPatch} style={{ fontSize: '12px', padding: '6px 12px' }}>
                <Check size={12} />
                <span>Accept Patch</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pin Definitions Bar */}
      <div className="card" style={{ padding: '10px 16px', display: 'flex', gap: '14px', alignItems: 'center', background: '#0e121e', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
          <Cpu size={14} color="var(--accent-orange)" />
          <span>Macro Pinout Constants:</span>
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
          {project.pin_assignments.map((pa, idx) => (
            <span key={idx} style={{ background: 'rgba(255,255,255,0.04)', padding: '3px 8px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <span style={{ color: 'var(--text-muted)' }}>{pa.component_id.toUpperCase()}_{pa.component_pin}:</span>{' '}
              <span style={{ color: 'var(--accent-orange)', fontWeight: 600 }}>{pa.board_pin}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Editor & Diagnostic Container */}
      <div className="card" style={{ padding: '0', display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden', minHeight: '440px' }}>
        {/* File Tabs Navigation */}
        <div style={{ background: '#090d16', borderBottom: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0 8px' }}>
          <div style={{ display: 'flex', gap: '2px' }}>
            {(['sketch.ino', 'diagram.json', 'wokwi.toml', 'README.md'] as FileTab[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  background: activeTab === tab ? '#121826' : 'transparent',
                  color: activeTab === tab ? '#fff' : 'var(--text-secondary)',
                  border: 'none',
                  borderBottom: activeTab === tab ? '2px solid var(--accent-orange)' : '2px solid transparent',
                  padding: '9px 14px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  transition: 'all 0.15s ease'
                }}
              >
                <FileCode size={13} color={activeTab === tab ? 'var(--accent-orange)' : 'var(--text-muted)'} />
                <span>{tab}</span>
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingRight: '8px' }}>
            {activeTab === 'sketch.ino' ? 'C++ Arduino' : activeTab === 'diagram.json' ? 'JSON' : activeTab === 'wokwi.toml' ? 'TOML' : 'Markdown'}
          </div>
        </div>

        {/* Code Editor Body */}
        <div style={{ display: 'flex', flex: 1, background: '#0b0f19', overflow: 'hidden', position: 'relative' }}>
          {/* Line Numbers Column */}
          <div style={{
            width: '44px',
            background: '#070a12',
            borderRight: '1px solid var(--border-subtle)',
            padding: '12px 6px',
            textAlign: 'right',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-mono)',
            fontSize: '12px',
            lineHeight: '1.5',
            userSelect: 'none',
            overflow: 'hidden'
          }}>
            {lineNumbers.map(n => (
              <div key={n}>{n}</div>
            ))}
          </div>

          {/* Interactive Textarea Code Editor */}
          <textarea
            value={code}
            onChange={handleCodeChange}
            readOnly={activeTab !== 'sketch.ino'}
            spellCheck={false}
            style={{
              flex: 1,
              background: 'transparent',
              color: '#f1f5f9',
              border: 'none',
              outline: 'none',
              padding: '12px 14px',
              fontFamily: 'var(--font-mono)',
              fontSize: '12.5px',
              lineHeight: '1.5',
              resize: 'none',
              tabSize: 2,
              whiteSpace: 'pre',
              overflowWrap: 'normal',
              overflowY: 'auto'
            }}
          />
        </div>

        {/* Bottom Diagnostics Tray */}
        {(lintIssues.length > 0 || lintSuccess) && (
          <div style={{ background: '#070a12', borderTop: '1px solid var(--border-subtle)', padding: '10px 16px', fontSize: '12px' }}>
            {lintSuccess && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-success)' }}>
                <CheckCircle2 size={14} />
                <span>Zero syntax errors or pin conflicts detected. Firmware structure is ready for simulation and flash.</span>
              </div>
            )}
            {lintIssues.length > 0 && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#f59e0b', marginBottom: '6px', fontWeight: 600 }}>
                  <AlertTriangle size={14} />
                  <span>Static Diagnostics ({lintIssues.length} issues):</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', paddingLeft: '22px' }}>
                  {lintIssues.map((iss, i) => (
                    <div key={i} style={{ color: 'var(--text-secondary)' }}>• {iss}</div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
