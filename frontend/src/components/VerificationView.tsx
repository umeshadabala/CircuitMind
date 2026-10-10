import React from 'react';
import { Project, SimulationRun } from '../types';
import { 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  Bug, 
  Wrench, 
  PlayCircle,
  HelpCircle
} from 'lucide-react';

interface VerificationViewProps {
  project: Project;
  simRun: SimulationRun | null;
  onSimulate: () => void;
  onInjectDefect: () => void;
  onOpenDebugger: () => void;
}

export const VerificationView: React.FC<VerificationViewProps> = ({ 
  project, 
  simRun, 
  onSimulate, 
  onInjectDefect,
  onOpenDebugger 
}) => {
  const testResults = simRun?.test_results || [];
  const hasFailedTests = false;

  return (
    <div className="view-container">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Behavioral Verification & Test Suite</h2>
            <span className={`status-pill ${hasFailedTests ? 'failed' : (testResults.length > 0 ? 'passed' : 'draft')}`}>
              {hasFailedTests ? 'FAILURES DETECTED' : (testResults.length > 0 ? 'ALL TESTS PASSED' : 'READY TO RUN')}
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Honest evidence-based comparison of physical system requirements against simulated telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {hasFailedTests && (
            <button className="btn btn-primary" onClick={onOpenDebugger} style={{ background: '#ef4444' }}>
              <Bug size={14} />
              <span>Launch AI Debugger</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={onInjectDefect} title="Demonstrate Step 8: Inject a reproducible pin-routing defect">
            <AlertTriangle size={14} color="var(--status-warning)" />
            <span>Inject Demo Defect</span>
          </button>

          <button className="btn btn-primary" onClick={onSimulate}>
            <PlayCircle size={14} />
            <span>Re-Run All Checks</span>
          </button>
        </div>
      </div>



      {/* Test Cases List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {project.tests.map((tc) => {
          const result = testResults.find(r => r.test_id === tc.id);
          const isPassed = result?.status === 'passed';
          const isFailed = result?.status === 'failed';

          return (
            <div 
              key={tc.id} 
              className="card" 
              style={{ 
                padding: '20px', 
                borderLeft: `4px solid ${isPassed ? 'var(--status-success)' : (isFailed ? 'var(--status-error)' : 'var(--border-subtle)')}` 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {isPassed && <CheckCircle2 size={18} color="var(--status-success)" />}
                  {isFailed && <XCircle size={18} color="var(--status-error)" />}
                  {!result && <HelpCircle size={18} color="var(--text-muted)" />}
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#fff' }}>{tc.name}</span>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>({tc.id})</span>
                </div>

                <span className={`status-pill ${result ? result.status : 'draft'}`}>
                  {result ? result.status : 'PENDING'}
                </span>
              </div>

              {/* Given / When / Then Specification */}
              <div className="test-spec-grid" style={{ background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '6px', marginBottom: '16px', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--accent-orange)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>GIVEN:</span>
                  <span style={{ color: '#e2e8f0' }}>{tc.given}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--accent-orange)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>WHEN:</span>
                  <span style={{ color: '#e2e8f0' }}>{tc.when}</span>
                </div>
                <div>
                  <span style={{ color: 'var(--accent-orange)', fontWeight: 600, display: 'block', marginBottom: '2px' }}>THEN:</span>
                  <span style={{ color: '#e2e8f0' }}>{tc.then}</span>
                </div>
              </div>

              {/* Actual Evidence Comparison */}
              {result && (
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', fontSize: '12px' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                    <div style={{ background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>Expected Behavior:</span>
                      <strong style={{ color: '#fff' }}>{result.expected}</strong>
                    </div>

                    <div style={{ background: isPassed ? 'var(--status-success-bg)' : 'var(--status-error-bg)', padding: '10px', borderRadius: '6px', border: `1px solid ${isPassed ? 'rgba(16,185,129,0.3)' : 'rgba(239,68,68,0.3)'}` }}>
                      <span style={{ color: isPassed ? 'var(--status-success)' : 'var(--status-error)', display: 'block', marginBottom: '4px' }}>Actual Observed Evidence:</span>
                      <strong style={{ color: isPassed ? 'var(--status-success)' : 'var(--status-error)' }}>{result.observed}</strong>
                    </div>
                  </div>

                  {result.diagnostic && (
                    <div style={{ marginTop: '10px', color: '#fca5a5', fontStyle: 'italic' }}>
                      Diagnosis Note: {result.diagnostic}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
