import React, { useState } from 'react';
import { Sparkles, ArrowRight, Clock, Cpu, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface LandingViewProps {
  onPlan: (prompt: string) => void;
  loading: boolean;
  recentProjects: Array<{ id: string; title: string; description: string; board_type: string; version: number }>;
  onLoadProject: (id: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ 
  onPlan, 
  loading, 
  recentProjects,
  onLoadProject 
}) => {
  const [prompt, setPrompt] = useState('');

  const examples = [
    {
      title: "Smart Parking Sensor",
      badge: "Master Brief Demo",
      prompt: "Build a smart parking sensor using an ESP32. When an object is closer than 20 cm, activate a warning LED and buzzer. Explain the wiring and show me how to test it."
    },
    {
      title: "Temperature & Humidity Monitor",
      badge: "Environmental",
      prompt: "Build a temperature and humidity monitor using an ESP32, DHT22 sensor, and SSD1306 OLED display. Alert if temperature exceeds 30°C."
    },
    {
      title: "Button-Controlled Traffic Light",
      badge: "State Machine",
      prompt: "Build an interactive traffic light controller with Red, Yellow, and Green LEDs and a pedestrian crossing pushbutton."
    },
    {
      title: "Rotary Servo Controller",
      badge: "Analog Control",
      prompt: "Build a servo angle positioning system where a 10k rotary potentiometer controls an SG90 micro-servo from 0 to 180 degrees."
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading) {
      onPlan(prompt.trim());
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: '40px 0' }}>
      {/* Hero Header */}
      <div style={{ textAlign: 'center', marginBottom: '36px' }}>
        <div style={{ 
          display: 'inline-flex', 
          alignItems: 'center', 
          gap: '8px', 
          background: 'var(--accent-orange-soft)', 
          border: '1px solid var(--accent-orange-glow)', 
          padding: '6px 14px', 
          borderRadius: '20px', 
          color: 'var(--accent-orange)', 
          fontSize: '12px', 
          fontWeight: 600, 
          marginBottom: '16px' 
        }}>
          <Sparkles size={14} />
          <span>AI-Native Engineering IDE for Physical Systems</span>
        </div>

        <h1 style={{ fontSize: '38px', fontWeight: 800, letterSpacing: '-1px', marginBottom: '12px', lineHeight: 1.2 }}>
          Think it. Build it. <span style={{ color: 'var(--accent-orange)' }}>Prove it.</span>
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', maxWidth: '640px', margin: '0 auto', lineHeight: 1.6 }}>
          Transform natural-language requirements into verified physical circuits, Wokwi-ready simulations, Arduino firmware, and persistent engineering memory.
        </p>
      </div>

      {/* Main Prompt Card */}
      <div className="card" style={{ padding: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', borderColor: 'var(--border-subtle)' }}>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '10px' }}>
            What do you want to build?
          </label>
          <div style={{ display: 'flex', gap: '10px' }}>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Build a smart parking sensor using an ESP32. When an object is closer than 20 cm, activate a warning LED and buzzer..."
              rows={3}
              style={{
                flex: 1,
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                borderRadius: '8px',
                padding: '14px',
                color: '#fff',
                fontSize: '14px',
                fontFamily: 'inherit',
                resize: 'none',
                outline: 'none',
                lineHeight: 1.5
              }}
              onFocus={(e) => (e.target.style.borderColor = 'var(--accent-orange)')}
              onBlur={(e) => (e.target.style.borderColor = 'var(--border-subtle)')}
            />
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={loading || !prompt.trim()}
              style={{ alignSelf: 'stretch', padding: '0 24px', fontSize: '14px', fontWeight: 600 }}
            >
              {loading ? (
                <span>Planning...</span>
              ) : (
                <>
                  <span>Generate</span>
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Feature badges */}
        <div style={{ display: 'flex', gap: '20px', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)', fontSize: '12px', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CheckCircle2 size={14} color="var(--status-success)" />
            <span>Deterministic Pin Validation</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Zap size={14} color="var(--accent-orange)" />
            <span>Wokwi Simulation Compatible</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} color="var(--status-info)" />
            <span>DevMemoryAI Architecture Memory</span>
          </div>
        </div>
      </div>

      {/* Example Prompts Grid */}
      <div style={{ marginTop: '32px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Select a Demonstrable Project Template
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
          {examples.map((ex, idx) => (
            <div 
              key={idx}
              className="card"
              onClick={() => {
                setPrompt(ex.prompt);
                onPlan(ex.prompt);
              }}
              style={{ 
                margin: 0, 
                cursor: 'pointer', 
                transition: 'all 0.2s ease',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--accent-orange)')}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontWeight: 600, fontSize: '14px', color: '#fff' }}>{ex.title}</span>
                  <span style={{ 
                    fontSize: '10px', 
                    background: 'rgba(255,255,255,0.06)', 
                    padding: '2px 6px', 
                    borderRadius: '4px',
                    color: 'var(--accent-orange)',
                    fontFamily: 'var(--font-mono)'
                  }}>
                    {ex.badge}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                  {ex.prompt}
                </p>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--accent-orange)', fontWeight: 500, marginTop: '12px' }}>
                <span>Build this project</span>
                <ArrowRight size={12} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Projects */}
      {recentProjects.length > 0 && (
        <div style={{ marginTop: '36px' }}>
          <h3 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '14px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} />
            <span>Recent Projects in SQLite Store</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {recentProjects.map((p) => (
              <div 
                key={p.id}
                className="card"
                onClick={() => onLoadProject(p.id)}
                style={{ 
                  margin: 0, 
                  padding: '12px 16px', 
                  cursor: 'pointer', 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'space-between' 
                }}
              >
                <div>
                  <div style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>{p.title}</div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{p.board_type} • Version {p.version}</div>
                </div>
                <button className="btn btn-secondary" style={{ padding: '4px 10px', fontSize: '12px' }}>
                  Open IDE
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
