import React from 'react';
import { Project } from '../types';
import { AlertTriangle, CheckCircle, Wrench, ShieldAlert } from 'lucide-react';

interface GuideViewProps {
  project: Project;
}

export const GuideView: React.FC<GuideViewProps> = ({ project }) => {
  const guide = project.build_guide;

  if (!guide) {
    return (
      <div style={{ maxWidth: '800px', margin: '40px auto', textAlign: 'center', color: 'var(--text-muted)' }}>
        No build guide available for this project.
      </div>
    );
  }

  return (
    <div className="view-container">
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '22px', fontWeight: 700, color: '#fff', marginBottom: '6px' }}>{guide.title}</h2>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{guide.summary}</p>
      </div>

      {/* Electrical Cautions */}
      {guide.electrical_cautions?.length > 0 && (
        <div className="card" style={{ background: 'var(--status-warning-bg)', borderColor: 'rgba(245, 158, 11, 0.4)', padding: '16px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--status-warning)', fontWeight: 700, fontSize: '13px', marginBottom: '8px' }}>
            <ShieldAlert size={16} />
            <span>Physical Build Cautions & Electrical Safety</span>
          </div>
          <ul style={{ paddingLeft: '20px', fontSize: '12px', color: '#fef3c7', lineHeight: 1.6 }}>
            {guide.electrical_cautions.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Ordered Steps */}
      <div style={{ marginBottom: '32px' }}>
        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>
          Step-by-Step Hardware Assembly
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {guide.steps.map((step) => (
            <div key={step.step_number} className="card" style={{ padding: '18px', display: 'flex', gap: '16px' }}>
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '50%', 
                background: 'var(--accent-orange-soft)', 
                color: 'var(--accent-orange)', 
                border: '1px solid var(--accent-orange-glow)', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                fontWeight: 700, 
                fontSize: '14px',
                flexShrink: 0
              }}>
                {step.step_number}
              </div>

              <div style={{ flex: 1 }}>
                <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
                  {step.title}
                </h4>
                <p style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: 1.6, marginBottom: '10px' }}>
                  {step.instructions}
                </p>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--status-success)', background: 'var(--status-success-bg)', padding: '6px 10px', borderRadius: '4px' }}>
                  <CheckCircle size={14} />
                  <span><strong>Expected Result:</strong> {step.expected_result}</span>
                </div>

                {step.safety_caution && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', color: 'var(--status-warning)', marginTop: '8px' }}>
                    <AlertTriangle size={12} />
                    <span>{step.safety_caution}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Troubleshooting Matrix */}
      {guide.troubleshooting?.length > 0 && (
        <div className="card" style={{ padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 600, fontSize: '14px', color: '#fff', marginBottom: '12px' }}>
            <Wrench size={16} color="var(--accent-orange)" />
            <span>Field Troubleshooting Matrix</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {guide.troubleshooting.map((item, idx) => (
              <div key={idx} style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', fontSize: '12px' }}>
                <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '2px' }}>
                  Issue: {item.issue}
                </div>
                <div style={{ color: 'var(--text-secondary)' }}>
                  Actionable Fix: {item.fix}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
