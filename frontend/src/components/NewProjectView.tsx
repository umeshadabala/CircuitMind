import React, { useState } from 'react';
import { 
  Sparkles, 
  ArrowLeft, 
  ArrowRight, 
  Cpu, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Zap, 
  ShieldCheck,
  Lightbulb
} from 'lucide-react';

interface NewProjectViewProps {
  onGenerate: (prompt: string) => Promise<void>;
  onCancel: () => void;
  onCancelSynthesis?: () => void;
  loading: boolean;
}

export const NewProjectView: React.FC<NewProjectViewProps> = ({
  onGenerate,
  onCancel,
  onCancelSynthesis,
  loading
}) => {
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Self-heal: If NewProjectView is entered with 0 characters and loading is true, clear the orphaned lock
  React.useEffect(() => {
    if (loading && !prompt.trim() && onCancelSynthesis) {
      onCancelSynthesis();
    }
  }, []);

  const inspirationExamples = [
    {
      title: "Smart Parking Sensor",
      text: "Build a smart parking sensor using an ESP32. When an obstacle is closer than 20 cm, trigger an active warning LED and acoustic buzzer."
    },
    {
      title: "Hospital Patient Monitor",
      text: "Build a continuous hospital patient monitor with DHT22 temperature/humidity sensor, SSD1306 OLED, status LED, alert buzzer, and nurse emergency button."
    },
    {
      title: "ESP32 Quadcopter Flight Controller",
      text: "Build an ESP32 quadcopter flight controller with MPU6050 6-axis gyro/accelerometer over I2C, 4 PWM ESC motor channels, and complementary filter."
    },
    {
      title: "Rotary Servo Controller",
      text: "Build a servo angle positioning system where a 10k rotary potentiometer controls an SG90 micro-servo from 0 to 180 degrees on an Arduino Uno."
    }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || loading) return;

    setError(null);
    try {
      await onGenerate(prompt.trim());
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Project synthesis failed. Please review your description and try again.');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Cmd+Enter or Ctrl+Enter submits
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="view-container" style={{ padding: '28px 20px', maxWidth: '840px', margin: '0 auto' }}>
      {/* Top Header with Back / Cancel */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <button 
          className="btn btn-secondary" 
          onClick={() => {
            if (loading && onCancelSynthesis) onCancelSynthesis();
            onCancel();
          }}
          style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px' }}
        >
          <ArrowLeft size={15} />
          <span>Back to Dashboard</span>
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <img 
            src="/logo.svg" 
            alt="CircuitMind Studio" 
            style={{ width: '28px', height: '28px', borderRadius: '6px' }} 
          />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)' }}>
            CircuitMind Studio
          </span>
        </div>
      </div>

      {/* Main Creation Card */}
      <div className="card" style={{ 
        padding: '36px 32px', 
        borderRadius: '12px', 
        border: '1px solid var(--border-subtle)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
        background: 'var(--bg-card)'
      }}>
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'var(--accent-orange-soft)', 
            border: '1px solid var(--accent-orange-glow)', 
            padding: '4px 10px', 
            borderRadius: '14px', 
            color: 'var(--accent-orange)', 
            fontSize: '11.5px', 
            fontWeight: 600, 
            marginBottom: '12px' 
          }}>
            <Sparkles size={13} />
            <span>AI Circuit Synthesis</span>
          </div>

          <h1 style={{ fontSize: '26px', fontWeight: 700, margin: '0 0 8px 0', letterSpacing: '-0.5px', color: '#fff' }}>
            Create a New Project
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
            Describe your electronics project in plain English. CircuitMind will synthesize the parts, assign compatible pins, write firmware, and configure the simulation graph.
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div style={{ 
            background: 'var(--status-error-bg)', 
            border: '1px solid rgba(239, 68, 68, 0.3)', 
            color: 'var(--status-error)', 
            padding: '12px 16px', 
            borderRadius: '8px', 
            fontSize: '13px', 
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            gap: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <div style={{ fontWeight: 600, marginBottom: '2px' }}>Synthesis Notice</div>
                <div style={{ wordBreak: 'break-word', lineHeight: 1.4 }}>{error}</div>
              </div>
            </div>
            <button 
              type="button" 
              onClick={() => setError(null)} 
              className="btn btn-secondary"
              style={{ padding: '2px 8px', fontSize: '11px', height: '26px' }}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Primary Prompt Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <label 
              htmlFor="project-prompt-input"
              style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}
            >
              Hardware & Behavior Requirements
            </label>
            <textarea
              id="project-prompt-input"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={loading}
              placeholder="Describe the electronics project you want to build. Include the hardware, behavior, and any constraints you have in mind..."
              rows={6}
              style={{
                width: '100%',
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '16px',
                color: '#fff',
                fontSize: '14.5px',
                fontFamily: 'inherit',
                resize: 'vertical',
                outline: 'none',
                lineHeight: 1.6,
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.2)'
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-orange)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
              <span>Press <kbd style={{ background: 'rgba(255,255,255,0.08)', padding: '2px 5px', borderRadius: '4px' }}>⌘ + Enter</kbd> to generate</span>
              <span>{prompt.length} characters</span>
            </div>
          </div>

          {/* Action Row */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button 
              type="button" 
              className="btn btn-secondary" 
              onClick={() => {
                if (loading && onCancelSynthesis) {
                  onCancelSynthesis();
                } else {
                  onCancel();
                }
              }}
              style={{ padding: '10px 18px', fontSize: '13.5px' }}
            >
              {loading ? 'Cancel Synthesis' : 'Cancel'}
            </button>

            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !prompt.trim()}
              style={{ padding: '10px 24px', fontSize: '13.5px', fontWeight: 600, minWidth: '160px' }}
            >
              {loading ? (
                <>
                  <RefreshCw size={15} className="spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <span>Generate Project</span>
                  <ArrowRight size={15} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Loading Progress State */}
        {loading && (
          <div style={{ 
            marginTop: '24px', 
            padding: '16px 20px', 
            background: 'rgba(249, 115, 22, 0.05)', 
            border: '1px solid var(--accent-orange-glow)', 
            borderRadius: '8px' 
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <RefreshCw size={16} className="spin" color="var(--accent-orange)" />
                <span style={{ fontSize: '13.5px', fontWeight: 600, color: '#fff' }}>
                  Synthesizing Project Graph & Firmware...
                </span>
              </div>
              {onCancelSynthesis && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={onCancelSynthesis}
                  style={{ padding: '3px 10px', fontSize: '12px', height: '28px' }}
                >
                  Cancel
                </button>
              )}
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.4 }}>
              Resolving hardware catalogue items, calculating pin assignments, generating deterministic C++ firmware, and building the Wokwi diagram.
            </p>
          </div>
        )}

        {/* Engineering Guarantees */}
        <div style={{ 
          display: 'flex', 
          gap: '20px', 
          marginTop: '28px', 
          paddingTop: '20px', 
          borderTop: '1px solid var(--border-subtle)', 
          fontSize: '12px', 
          color: 'var(--text-muted)', 
          flexWrap: 'wrap' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="var(--status-success)" />
            <span>Deterministic Pin Allocations</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="var(--accent-orange)" />
            <span>Wokwi Behavioral Simulation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--status-info)" />
            <span>Project Memory Layer Traceability</span>
          </div>
        </div>
      </div>

      {/* Inspiration Examples */}
      <div style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px', color: 'var(--text-secondary)', fontSize: '13px', fontWeight: 600 }}>
          <Lightbulb size={14} color="var(--accent-orange)" />
          <span>Or start from an example prompt:</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '12px' }}>
          {inspirationExamples.map((item, idx) => (
            <div 
              key={idx}
              className="card"
              style={{ 
                margin: 0, 
                padding: '14px 16px', 
                cursor: loading ? 'default' : 'pointer',
                background: 'var(--bg-card)',
                transition: 'all 0.15s ease'
              }}
              onClick={() => {
                if (!loading) setPrompt(item.text);
              }}
              onMouseEnter={(e) => {
                if (!loading) e.currentTarget.style.borderColor = 'var(--accent-orange)';
              }}
              onMouseLeave={(e) => {
                if (!loading) e.currentTarget.style.borderColor = 'var(--border-subtle)';
              }}
            >
              <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff', marginBottom: '4px' }}>
                {item.title}
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
                "{item.text}"
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
