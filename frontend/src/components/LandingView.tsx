import React, { useState, useEffect, useRef } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  Cpu, 
  CheckCircle2, 
  ShieldCheck, 
  Zap, 
  Code2, 
  Share2, 
  Terminal, 
  Download, 
  Layers, 
  Check, 
  Clock, 
  ChevronRight, 
  Menu, 
  X, 
  Play, 
  Activity,
  FileCode,
  HardDrive
} from 'lucide-react';
import './LandingView.css';

interface LandingViewProps {
  onPlan: (prompt: string) => void;
  loading: boolean;
  recentProjects?: Array<{ id: string; title: string; description?: string; board_type?: string; version: number }>;
  onLoadProject: (id: string) => void;
  onLoadDemo?: (type: string) => void;
  onNewProject?: () => void;
  onNavigateToDashboard?: () => void;
  onNavigateToProject?: (id: string) => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ 
  onPlan, 
  loading, 
  recentProjects = [],
  onLoadProject,
  onLoadDemo,
  onNewProject,
  onNavigateToDashboard,
  onNavigateToProject
}) => {
  const [prompt, setPrompt] = useState('');
  const [navScrolled, setNavScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [activeStoryStep, setActiveStoryStep] = useState(0);
  const [activeCodeTab, setActiveCodeTab] = useState<'ino' | 'diagram' | 'guide'>('ino');

  // Interactive Storytelling Refs for Scroll-Triggered Reveals
  const storyStepRefs = useRef<(HTMLDivElement | null)[]>([]);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  // Navigation scroll observer
  useEffect(() => {
    const viewport = viewportRef.current;
    const handleScroll = () => {
      const scrollPos = viewport ? viewport.scrollTop : window.scrollY;
      setNavScrolled(scrollPos > 20);
    };

    if (viewport) {
      viewport.addEventListener('scroll', handleScroll, { passive: true });
    }
    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      if (viewport) {
        viewport.removeEventListener('scroll', handleScroll);
      }
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // IntersectionObserver for Storytelling Steps
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            const idx = Number(entry.target.getAttribute('data-step-index') || 0);
            setActiveStoryStep(idx);
          }
        });
      },
      { 
        root: viewportRef.current || null,
        threshold: 0.2, 
        rootMargin: '0px 0px -50px 0px' 
      }
    );

    storyStepRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  // Subtle Mouse Parallax on Hero Preview
  const handleHeroMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    setMousePos({ x, y });
  };

  const handleHeroMouseLeave = () => {
    setMousePos({ x: 0, y: 0 });
  };

  // Example Prompt Templates from authentic engineering specs
  const promptExamples = [
    {
      title: "Smart Parking Sensor",
      tag: "Master Brief ESP32",
      board: "ESP32 DevKit V1",
      prompt: "Build a smart parking sensor using an ESP32. When an object is closer than 20 cm, activate a warning LED and buzzer. Explain the wiring and show me how to test it."
    },
    {
      title: "Hospital Patient Monitor",
      tag: "Medical IoT",
      board: "ESP32 DevKit V1",
      prompt: "Build a continuous hospital patient monitor with DHT22 temperature/humidity sensor, SSD1306 OLED, alert LED, acoustic buzzer, and nurse call emergency button."
    },
    {
      title: "Traffic Light State Machine",
      tag: "Deterministic Control",
      board: "Arduino Uno",
      prompt: "Build an interactive traffic light controller with Red, Yellow, and Green LEDs and a pedestrian crossing pushbutton with timed state transitions."
    },
    {
      title: "Rotary Servo Positioner",
      tag: "Analog Closed-Loop",
      board: "ESP32 DevKit V1",
      prompt: "Build a servo angle positioning system where a 10k rotary potentiometer controls an SG90 micro-servo from 0 to 180 degrees with smoothing."
    }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (prompt.trim() && !loading) {
      onPlan(prompt.trim());
    }
  };

  const scrollToSection = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleExploreWorkspace = () => {
    if (recentProjects && recentProjects.length > 0) {
      onLoadProject(recentProjects[0].id);
    } else if (onLoadDemo) {
      onLoadDemo('parking');
    } else if (onNavigateToDashboard) {
      onNavigateToDashboard();
    }
  };

  return (
    <div 
      className="landing-viewport" 
      ref={viewportRef}
      onScroll={(e) => {
        setNavScrolled(e.currentTarget.scrollTop > 20);
      }}
    >
      {/* 1. Cinematic Background & Animated PCB Canvas */}
      <div className="landing-bg-canvas" aria-hidden="true">
        <div className="landing-grid-pattern" />
        <div className="landing-glow-orb-1" />
        <div className="landing-glow-orb-2" />
        <div className="landing-glow-orb-3" />

        {/* Ambient Animated Circuit Bus Lines */}
        <svg 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.4 }} 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <linearGradient id="landingTraceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#ea580c" stopOpacity="0.1" />
            </linearGradient>
            <filter id="nodeGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>

          {/* Left Bus Track */}
          <path 
            d="M -100 180 H 220 L 320 280 V 700 L 400 780 H 600" 
            stroke="url(#landingTraceGrad)" 
            strokeWidth="1.5" 
            fill="none" 
            className="wire-trace" 
          />
          <circle cx="320" cy="280" r="3.5" fill="#f97316" filter="url(#nodeGlow)" />
          <circle cx="400" cy="780" r="3.5" fill="#f97316" filter="url(#nodeGlow)" />

          {/* Right Bus Track */}
          <path 
            d="M 1600 240 H 1180 L 1080 340 V 900 L 980 1000 H 700" 
            stroke="rgba(249, 115, 22, 0.35)" 
            strokeWidth="1.5" 
            fill="none" 
            className="wire-trace" 
          />
          <circle cx="1080" cy="340" r="3.5" fill="#38bdf8" filter="url(#nodeGlow)" />
          <circle cx="980" cy="1000" r="3.5" fill="#38bdf8" filter="url(#nodeGlow)" />

          {/* Center Vertical Signal Arteries */}
          <path 
            d="M 50% 0 V 100%" 
            stroke="rgba(255, 255, 255, 0.02)" 
            strokeWidth="1" 
            fill="none" 
          />
        </svg>
      </div>

      {/* 2. Fixed Responsive Navigation Bar */}
      <header className={`landing-nav ${navScrolled ? 'scrolled' : ''}`}>
        <div 
          className="landing-nav-brand" 
          onClick={() => {
            if (viewportRef.current) {
              viewportRef.current.scrollTo({ top: 0, behavior: 'smooth' });
            } else {
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          role="button"
          tabIndex={0}
          aria-label="CircuitMind Studio Home"
        >
          <img src="/logo.svg" alt="CircuitMind Studio Logo" />
          <div className="landing-nav-title">
            <span>CircuitMind</span>
            <span className="landing-nav-badge">Studio</span>
          </div>
        </div>

        {/* Desktop Nav Links */}
        <nav aria-label="Main Navigation">
          <ul className="landing-nav-links">
            <li>
              <a 
                className="landing-nav-link" 
                onClick={(e) => { e.preventDefault(); scrollToSection('storytelling'); }}
                href="#storytelling"
              >
                Workflow
              </a>
            </li>
            <li>
              <a 
                className="landing-nav-link" 
                onClick={(e) => { e.preventDefault(); scrollToSection('bento-features'); }}
                href="#bento-features"
              >
                Capabilities
              </a>
            </li>
            <li>
              <a 
                className="landing-nav-link" 
                onClick={(e) => { e.preventDefault(); scrollToSection('pipeline'); }}
                href="#pipeline"
              >
                Architecture
              </a>
            </li>
            <li>
              <a 
                className="landing-nav-link" 
                onClick={(e) => { e.preventDefault(); scrollToSection('hardware-catalog'); }}
                href="#hardware-catalog"
              >
                Hardware Catalog
              </a>
            </li>
            {onNavigateToDashboard && (
              <li>
                <a 
                  className="landing-nav-link" 
                  onClick={(e) => { e.preventDefault(); onNavigateToDashboard(); }}
                  href="#/dashboard"
                >
                  Dashboard
                </a>
              </li>
            )}
          </ul>
        </nav>

        {/* CTA Buttons */}
        <div className="landing-nav-actions">
          <button 
            className="landing-btn-secondary" 
            onClick={handleExploreWorkspace}
            title="Explore active workspace or demonstration project"
          >
            <Activity size={15} color="var(--accent-orange)" />
            <span>Explore Workspace</span>
          </button>

          <button 
            className="landing-btn-primary" 
            onClick={() => onNewProject ? onNewProject() : scrollToSection('prompt-card')}
            title="Start building a new circuit"
          >
            <span>Start Building</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      <div className={`landing-mobile-drawer ${mobileMenuOpen ? 'open' : ''}`}>
        <a className="landing-nav-link" onClick={() => scrollToSection('storytelling')}>Workflow</a>
        <a className="landing-nav-link" onClick={() => scrollToSection('bento-features')}>Capabilities</a>
        <a className="landing-nav-link" onClick={() => scrollToSection('pipeline')}>Architecture</a>
        <a className="landing-nav-link" onClick={() => scrollToSection('hardware-catalog')}>Hardware Catalog</a>
        {onNavigateToDashboard && (
          <a className="landing-nav-link" onClick={() => { setMobileMenuOpen(false); onNavigateToDashboard(); }}>
            Dashboard
          </a>
        )}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
          <button className="landing-btn-secondary" onClick={() => { setMobileMenuOpen(false); handleExploreWorkspace(); }}>
            Explore Workspace
          </button>
          <button className="landing-btn-primary" onClick={() => { setMobileMenuOpen(false); onNewProject ? onNewProject() : scrollToSection('prompt-card'); }}>
            Start Building
          </button>
        </div>
      </div>

      {/* 3. Hero Section */}
      <section 
        className="landing-hero" 
        onMouseMove={handleHeroMouseMove} 
        onMouseLeave={handleHeroMouseLeave}
      >
        {/* Category Pill */}
        <div className="landing-hero-pill">
          <Sparkles size={14} />
          <span>AI-Powered Electronics Engineering Environment</span>
        </div>

        {/* Polished Line-by-Line Headline */}
        <h1 className="landing-headline">
          <span className="landing-headline-line">
            <span className="landing-headline-line-inner">From an idea</span>
          </span>
          <span className="landing-headline-line">
            <span className="landing-headline-line-inner">
              to a <span className="landing-gradient-text">working circuit.</span>
            </span>
          </span>
        </h1>

        {/* Supporting Copy */}
        <p className="landing-subhead">
          Design electronics with AI. Generate components, wiring, firmware, and engineering artifacts in one workspace.
        </p>

        {/* Primary & Secondary CTAs */}
        <div className="landing-cta-group">
          <button 
            className="landing-cta-btn-primary" 
            onClick={() => onNewProject ? onNewProject() : scrollToSection('prompt-card')}
          >
            <span>Start Building</span>
            <ArrowRight size={17} />
          </button>

          <button 
            className="landing-cta-btn-secondary" 
            onClick={handleExploreWorkspace}
          >
            <Cpu size={17} color="#f97316" />
            <span>Explore the Workspace</span>
          </button>
        </div>

        {/* Interactive Prompt Input Bar directly in Hero */}
        <div id="prompt-card" style={{ maxWidth: '780px', margin: '0 auto 50px', textAlign: 'left' }}>
          <div style={{
            background: 'rgba(15, 17, 24, 0.92)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            borderRadius: '14px',
            padding: '18px 20px',
            boxShadow: '0 16px 40px -10px rgba(0, 0, 0, 0.7), 0 0 30px rgba(249, 115, 22, 0.08)',
            backdropFilter: 'blur(20px)'
          }}>
            <form onSubmit={handleSubmit}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono)' }}>
                  Natural Language Prompt Synthesizer
                </span>
                <span style={{ fontSize: '11px', color: '#f97316', background: 'rgba(249,115,22,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
                  Zero-Hallucination DRC
                </span>
              </div>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g. Build an ESP32 smart parking sensor: when an object is closer than 20 cm, activate a warning LED and buzzer..."
                  rows={2}
                  style={{
                    flex: '1 1 360px',
                    minWidth: '240px',
                    background: '#090a0d',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    color: '#fff',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'none',
                    outline: 'none',
                    lineHeight: 1.5,
                    transition: 'border-color 0.2s ease'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#f97316')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)')}
                />
                <button
                  type="submit"
                  className="landing-btn-primary"
                  disabled={loading || !prompt.trim()}
                  style={{ alignSelf: 'stretch', padding: '0 24px', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {loading ? (
                    <span>Synthesizing...</span>
                  ) : (
                    <>
                      <span>Synthesize</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Quick Template Chips */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '14px', flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: '#64748b' }}>Templates:</span>
              {promptExamples.slice(0, 3).map((ex, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setPrompt(ex.prompt)}
                  style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '6px',
                    padding: '3px 10px',
                    color: '#cbd5e1',
                    fontSize: '11px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#f97316';
                    e.currentTarget.style.color = '#fff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  {ex.title}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* 4. Layered 3D Perspective Hero Preview of ACTUAL CircuitMind Studio */}
        <div className="landing-preview-perspective-wrap">
          <div 
            className="landing-preview-container interactive"
            style={{
              '--rot-x': `${mousePos.y * -10}deg`,
              '--rot-y': `${mousePos.x * 12}deg`
            } as React.CSSProperties}
          >
            {/* Studio Topbar */}
            <div className="landing-preview-topbar">
              <div className="landing-preview-dots">
                <span className="landing-dot red" />
                <span className="landing-dot yellow" />
                <span className="landing-dot green" />
              </div>

              <div className="landing-preview-title">
                <Cpu size={14} color="#f97316" />
                <span>proj-smart-parking-esp32 • ESP32 DevKit V1 • v1</span>
              </div>

              <div className="landing-preview-status">
                <CheckCircle2 size={13} />
                <span>Deterministic DRC Passed</span>
              </div>
            </div>

            {/* Studio Multi-Layer Canvas Body */}
            <div className="landing-preview-body">
              {/* Layer 1: Component Graph */}
              <div className="landing-layer-graph">
                <div className="landing-layer-title">
                  <Layers size={13} />
                  <span>Component Instances</span>
                </div>

                <div className="landing-comp-card">
                  <div className="landing-comp-icon">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <div className="landing-comp-name">ESP32 DevKit V1</div>
                    <div className="landing-comp-role">Microcontroller • 3.3V Logic</div>
                  </div>
                </div>

                <div className="landing-comp-card">
                  <div className="landing-comp-icon">
                    <Activity size={18} />
                  </div>
                  <div>
                    <div className="landing-comp-name">HC-SR04 Ultrasonic</div>
                    <div className="landing-comp-role">Range Sensor • Trig / Echo</div>
                  </div>
                </div>

                <div className="landing-comp-card">
                  <div className="landing-comp-icon">
                    <Zap size={18} />
                  </div>
                  <div>
                    <div className="landing-comp-name">Piezo Buzzer</div>
                    <div className="landing-comp-role">Acoustic Actuator • PWM</div>
                  </div>
                </div>

                <div className="landing-comp-card">
                  <div className="landing-comp-icon">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <div className="landing-comp-name">Red Warning LED</div>
                    <div className="landing-comp-role">Optical Actuator • 220Ω In-line</div>
                  </div>
                </div>
              </div>

              {/* Layer 2: Central Circuit Netlist Schematic Canvas */}
              <div className="landing-layer-canvas">
                <svg className="landing-canvas-svg" viewBox="0 0 500 360">
                  <defs>
                    <linearGradient id="wireGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#f97316" />
                      <stop offset="100%" stopColor="#ff8c37" />
                    </linearGradient>
                    <linearGradient id="cyanGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#38bdf8" />
                      <stop offset="100%" stopColor="#818cf8" />
                    </linearGradient>
                  </defs>

                  {/* ESP32 Controller Box */}
                  <rect x="30" y="50" width="130" height="260" rx="8" fill="#14161f" stroke="#2a2e3d" strokeWidth="1.5" />
                  <text x="95" y="75" fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">ESP32 DevKit</text>
                  
                  {/* Pin labels */}
                  <text x="145" y="110" fill="#f97316" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">GPIO 5</text>
                  <text x="145" y="150" fill="#38bdf8" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">GPIO 18</text>
                  <text x="145" y="190" fill="#f97316" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">GPIO 19</text>
                  <text x="145" y="230" fill="#f97316" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">GPIO 21</text>
                  <text x="145" y="270" fill="#64748b" fontSize="9" textAnchor="end" fontFamily="var(--font-mono)">GND</text>

                  {/* Ultrasonic Sensor Box */}
                  <rect x="320" y="50" width="140" height="80" rx="8" fill="#14161f" stroke="#2a2e3d" strokeWidth="1.5" />
                  <text x="390" y="75" fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">HC-SR04 Sensor</text>
                  <text x="335" y="105" fill="#f97316" fontSize="9" fontFamily="var(--font-mono)">TRIG</text>
                  <text x="335" y="120" fill="#38bdf8" fontSize="9" fontFamily="var(--font-mono)">ECHO</text>

                  {/* Buzzer Box */}
                  <rect x="320" y="160" width="140" height="60" rx="8" fill="#14161f" stroke="#2a2e3d" strokeWidth="1.5" />
                  <text x="390" y="185" fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">Piezo Buzzer</text>
                  <text x="335" y="205" fill="#f97316" fontSize="9" fontFamily="var(--font-mono)">PWM</text>

                  {/* Warning LED Box */}
                  <rect x="320" y="245" width="140" height="65" rx="8" fill="#14161f" stroke="#2a2e3d" strokeWidth="1.5" />
                  <text x="390" y="270" fill="#f8fafc" fontSize="11" fontWeight="700" textAnchor="middle">Red Warning LED</text>
                  <text x="335" y="295" fill="#f97316" fontSize="9" fontFamily="var(--font-mono)">ANODE</text>

                  {/* Wiring Netlist Lines (Connecting Pins) */}
                  {/* Wire 1: GPIO5 -> TRIG */}
                  <path d="M 150 106 H 230 V 102 H 330" stroke="url(#wireGrad)" strokeWidth="2" fill="none" className="wire-trace" />
                  <circle cx="150" cy="106" r="3" fill="#f97316" />
                  <circle cx="330" cy="102" r="3" fill="#f97316" />

                  {/* Wire 2: GPIO18 -> ECHO */}
                  <path d="M 150 146 H 220 V 117 H 330" stroke="url(#cyanGrad)" strokeWidth="2" fill="none" className="wire-trace" />
                  <circle cx="150" cy="146" r="3" fill="#38bdf8" />
                  <circle cx="330" cy="117" r="3" fill="#38bdf8" />

                  {/* Wire 3: GPIO21 -> BUZZER PWM */}
                  <path d="M 150 226 H 240 V 202 H 330" stroke="url(#wireGrad)" strokeWidth="2" fill="none" className="wire-trace" />
                  <circle cx="150" cy="226" r="3" fill="#f97316" />
                  <circle cx="330" cy="202" r="3" fill="#f97316" />

                  {/* Wire 4: GPIO19 -> LED ANODE */}
                  <path d="M 150 186 H 260 V 292 H 330" stroke="url(#wireGrad)" strokeWidth="2" fill="none" className="wire-trace" />
                  <circle cx="150" cy="186" r="3" fill="#f97316" />
                  <circle cx="330" cy="292" r="3" fill="#f97316" />
                </svg>

                {/* Floating DRC badge */}
                <div className="landing-floating-drc">
                  <div className="landing-floating-drc-icon">
                    <Check size={18} />
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700, color: '#fff' }}>Deterministic DRC: 0 Violations</div>
                    <div style={{ fontSize: '10.5px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                      Voltage 3.3V Safe • 100% Tests Passed (54ms)
                    </div>
                  </div>
                </div>
              </div>

              {/* Layer 3: Generated Firmware Preview */}
              <div className="landing-layer-firmware">
                <div className="landing-layer-title">
                  <Code2 size={13} />
                  <span>Generated Firmware</span>
                </div>

                <div className="landing-code-card">
                  <div><span className="code-keyword">#define</span> TRIG_PIN <span className="code-num">5</span></div>
                  <div><span className="code-keyword">#define</span> ECHO_PIN <span className="code-num">18</span></div>
                  <div><span className="code-keyword">#define</span> BUZZER_PIN <span className="code-num">21</span></div>
                  <div><span className="code-keyword">#define</span> LED_PIN <span className="code-num">19</span></div>
                  <br />
                  <div><span className="code-keyword">void</span> <span className="code-func">setup</span>() &#123;</div>
                  <div>&nbsp;&nbsp;<span className="code-func">pinMode</span>(TRIG_PIN, OUTPUT);</div>
                  <div>&nbsp;&nbsp;<span className="code-func">pinMode</span>(ECHO_PIN, INPUT);</div>
                  <div>&nbsp;&nbsp;<span className="code-func">pinMode</span>(BUZZER_PIN, OUTPUT);</div>
                  <div>&nbsp;&nbsp;<span className="code-func">pinMode</span>(LED_PIN, OUTPUT);</div>
                  <div>&#125;</div>
                  <br />
                  <div><span className="code-keyword">void</span> <span className="code-func">loop</span>() &#123;</div>
                  <div>&nbsp;&nbsp;<span className="code-keyword">float</span> dist = <span className="code-func">readDistance</span>();</div>
                  <div>&nbsp;&nbsp;<span className="code-keyword">if</span> (dist &lt; <span className="code-num">20.0</span>) &#123;</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="code-func">digitalWrite</span>(LED_PIN, HIGH);</div>
                  <div>&nbsp;&nbsp;&nbsp;&nbsp;<span className="code-func">tone</span>(BUZZER_PIN, <span className="code-num">1200</span>);</div>
                  <div>&nbsp;&nbsp;&#125;</div>
                  <div>&#125;</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Scroll Storytelling Section (Visually Connected Pipeline) */}
      <section id="storytelling" className="landing-storytelling">
        <div className="landing-section-header">
          <span className="landing-section-tag">Interactive Pipeline</span>
          <h2 className="landing-section-title">From Prompt to Verified Hardware</h2>
          <p className="landing-section-desc">
            Watch how CircuitMind synthesizes natural language into verifiable electronics, netlists, firmware, and simulation tests.
          </p>
        </div>

        <div className="landing-story-timeline">
          {/* Step 1: Describe the circuit */}
          <div 
            className="landing-story-step"
            data-step-index={1}
            ref={(el) => (storyStepRefs.current[0] = el)}
          >
            <div className="landing-story-node-indicator">01</div>
            <div className="landing-story-content">
              <span className="landing-step-badge">Phase 1: Synthesis</span>
              <h3 className="landing-step-heading">Describe the Circuit</h3>
              <p className="landing-step-paragraph">
                Provide natural-language requirements. CircuitMind extracts measurable engineering constraints, identifies sensor modalities, and selects catalog-bound hardware.
              </p>
              <div className="landing-step-feature-list">
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Extracts functional criteria and target threshold values</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Identifies required MCU peripherals (PWM, ADC, I2C, SPI)</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Maps to authentic components from verified datasheets</span>
                </div>
              </div>
            </div>

            <div className="landing-story-visual">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <Terminal size={16} color="#f97316" />
                <span style={{ fontSize: '12px', fontFamily: 'var(--font-mono)', color: '#fff', fontWeight: 600 }}>Requirement Extraction Log</span>
              </div>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '12px', lineHeight: 1.8, color: '#cbd5e1' }}>
                <div style={{ color: '#64748b' }}>&gt; INPUT PROMPT: "Smart parking sensor, distance &lt; 20cm"</div>
                <div><span style={{ color: '#10b981' }}>[OK]</span> REQ-001: Measure obstacle distance via HC-SR04</div>
                <div><span style={{ color: '#10b981' }}>[OK]</span> REQ-002: Object &lt; 20 cm triggers warning LED</div>
                <div><span style={{ color: '#10b981' }}>[OK]</span> REQ-003: Object &lt; 20 cm triggers acoustic buzzer</div>
                <div style={{ color: '#f97316', marginTop: '6px' }}>Target MCU Selected: ESP32 DevKit V1 (Xtensa Dual-Core)</div>
              </div>
            </div>
          </div>

          {/* Step 2: Build the design */}
          <div 
            className="landing-story-step"
            data-step-index={2}
            ref={(el) => (storyStepRefs.current[1] = el)}
          >
            <div className="landing-story-node-indicator">02</div>
            <div className="landing-story-content">
              <span className="landing-step-badge">Phase 2: Topology</span>
              <h3 className="landing-step-heading">Build the Design</h3>
              <p className="landing-step-paragraph">
                The canonical project graph resolves component instances and constructs deterministic netlists. Pins are assigned adhering to hardware electrical constraints.
              </p>
              <div className="landing-step-feature-list">
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Enforces GPIO pin functions (avoiding reserved SPI boot strapping pins)</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Assigns power distribution rails (3.3V logic vs. 5.0V supply)</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Inserts protective series resistors for LEDs and voltage dividers</span>
                </div>
              </div>
            </div>

            <div className="landing-story-visual">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Deterministic Pin Netlist</span>
                <span style={{ fontSize: '11px', color: '#10b981', background: 'rgba(16,185,129,0.1)', padding: '2px 8px', borderRadius: '4px' }}>DRC Clear</span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '12px', fontFamily: 'var(--font-mono)' }}>
                <div style={{ background: '#090a0f', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#f97316', fontWeight: 600 }}>ESP32:GPIO5</div>
                  <div style={{ color: '#94a3b8' }}>➔ HC-SR04:TRIG (Output)</div>
                </div>
                <div style={{ background: '#090a0f', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#38bdf8', fontWeight: 600 }}>ESP32:GPIO18</div>
                  <div style={{ color: '#94a3b8' }}>➔ HC-SR04:ECHO (Input)</div>
                </div>
                <div style={{ background: '#090a0f', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#f97316', fontWeight: 600 }}>ESP32:GPIO21</div>
                  <div style={{ color: '#94a3b8' }}>➔ Buzzer:POS (PWM)</div>
                </div>
                <div style={{ background: '#090a0f', padding: '10px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <div style={{ color: '#f97316', fontWeight: 600 }}>ESP32:GPIO19</div>
                  <div style={{ color: '#94a3b8' }}>➔ 220Ω ➔ LED:ANODE</div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3: Generate firmware */}
          <div 
            className="landing-story-step"
            data-step-index={3}
            ref={(el) => (storyStepRefs.current[2] = el)}
          >
            <div className="landing-story-node-indicator">03</div>
            <div className="landing-story-content">
              <span className="landing-step-badge">Phase 3: Code Synthesis</span>
              <h3 className="landing-step-heading">Generate Firmware</h3>
              <p className="landing-step-paragraph">
                Synthesizes complete, compilation-ready C++ firmware matching the resolved project graph. Every pin macro binds exactly to the schematic wiring.
              </p>
              <div className="landing-step-feature-list">
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Zero hardcoded magic numbers; strict macro pin definitions</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Includes sensor timing loops and non-blocking state updates</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Serial monitor diagnostics for physical debugging</span>
                </div>
              </div>
            </div>

            <div className="landing-story-visual">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button 
                  onClick={() => setActiveCodeTab('ino')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    background: activeCodeTab === 'ino' ? 'rgba(249,115,22,0.2)' : 'transparent',
                    color: activeCodeTab === 'ino' ? '#f97316' : '#94a3b8',
                    border: '1px solid',
                    borderColor: activeCodeTab === 'ino' ? '#f97316' : 'transparent'
                  }}
                >
                  sketch.ino
                </button>
                <button 
                  onClick={() => setActiveCodeTab('diagram')}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '5px',
                    fontSize: '11px',
                    fontFamily: 'var(--font-mono)',
                    cursor: 'pointer',
                    background: activeCodeTab === 'diagram' ? 'rgba(249,115,22,0.2)' : 'transparent',
                    color: activeCodeTab === 'diagram' ? '#f97316' : '#94a3b8',
                    border: '1px solid',
                    borderColor: activeCodeTab === 'diagram' ? '#f97316' : 'transparent'
                  }}
                >
                  diagram.json
                </button>
              </div>
              <div style={{ background: '#090a0d', padding: '14px', borderRadius: '8px', fontFamily: 'var(--font-mono)', fontSize: '11.5px', color: '#e2e8f0', lineHeight: 1.6, maxHeight: '180px', overflowY: 'auto' }}>
                {activeCodeTab === 'ino' ? (
                  <>
                    <div><span style={{ color: '#f97316' }}>#define</span> TRIG_PIN 5</div>
                    <div><span style={{ color: '#f97316' }}>#define</span> ECHO_PIN 18</div>
                    <div><span style={{ color: '#38bdf8' }}>float</span> readDistanceCm() &#123;</div>
                    <div>&nbsp;&nbsp;digitalWrite(TRIG_PIN, HIGH);</div>
                    <div>&nbsp;&nbsp;delayMicroseconds(10);</div>
                    <div>&nbsp;&nbsp;digitalWrite(TRIG_PIN, LOW);</div>
                    <div>&nbsp;&nbsp;<span style={{ color: '#a78bfa' }}>return</span> pulseIn(ECHO_PIN, HIGH) * 0.034 / 2;</div>
                    <div>&#125;</div>
                  </>
                ) : (
                  <>
                    <div>&#123;</div>
                    <div>&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"version"</span>: 1,</div>
                    <div>&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"author"</span>: <span style={{ color: '#10b981' }}>"CircuitMind Studio"</span>,</div>
                    <div>&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"parts"</span>: [ <span style={{ color: '#f97316' }}>"esp32"</span>, <span style={{ color: '#f97316' }}>"hc-sr04"</span>, <span style={{ color: '#f97316' }}>"buzzer"</span>, <span style={{ color: '#f97316' }}>"led"</span> ],</div>
                    <div>&nbsp;&nbsp;<span style={{ color: '#38bdf8' }}>"connections"</span>: [ ["esp:5", "sensor:trig", "orange"] ]</div>
                    <div>&#125;</div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Step 4: Validate the design */}
          <div 
            className="landing-story-step"
            data-step-index={4}
            ref={(el) => (storyStepRefs.current[3] = el)}
          >
            <div className="landing-story-node-indicator">04</div>
            <div className="landing-story-content">
              <span className="landing-step-badge">Phase 4: Verification</span>
              <h3 className="landing-step-heading">Validate the Design</h3>
              <p className="landing-step-paragraph">
                Executes automated design rule checks (DRC) against genuine hardware constraints, runs behavioral simulation test suites, and logs results into the Project Memory Layer.
              </p>
              <div className="landing-step-feature-list">
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Voltage domain safety checks (verifies 3.3V GPIO tolerance)</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Detects multiple outputs driving the same net</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Behavioral simulation passes requirement assertions</span>
                </div>
              </div>
            </div>

            <div className="landing-story-visual">
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600, color: '#fff' }}>Electrical DRC & Test Runner</span>
                <span style={{ fontSize: '11px', color: '#10b981', fontWeight: 600 }}>PASSED</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090a0f', padding: '10px 12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>GPIO Conflict Detection</span>
                  </div>
                  <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>0 Errors</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090a0f', padding: '10px 12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>ESP32 Strapping Pin Protection</span>
                  </div>
                  <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>Verified</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#090a0f', padding: '10px 12px', borderRadius: '6px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle2 size={15} color="#10b981" />
                    <span>Behavioral Test: Object &lt; 20cm</span>
                  </div>
                  <span style={{ color: '#10b981', fontFamily: 'var(--font-mono)' }}>PASS (54ms)</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 5: Continue in the workspace */}
          <div 
            className="landing-story-step"
            data-step-index={5}
            ref={(el) => (storyStepRefs.current[4] = el)}
          >
            <div className="landing-story-node-indicator">05</div>
            <div className="landing-story-content">
              <span className="landing-step-badge">Phase 5: Studio Workspace</span>
              <h3 className="landing-step-heading">Continue in the Workspace</h3>
              <p className="landing-step-paragraph">
                Transition seamlessly into CircuitMind Studio. Inspect interactive pin diagrams, edit code, execute Wokwi simulation runs, and export build guides.
              </p>
              <div className="landing-step-feature-list">
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Interactive canvas to reassign pins and inspect electrical nets</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>State-aware AI Assistant to modify hardware requirements</span>
                </div>
                <div className="landing-step-feature-item">
                  <Check size={16} />
                  <span>Export complete project package (ZIP) with BOM and assembly manual</span>
                </div>
              </div>
            </div>

            <div className="landing-story-visual" style={{ textAlign: 'center', padding: '36px 20px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(249,115,22,0.15)', color: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                <Play size={24} />
              </div>
              <h4 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>Studio Workspace Ready</h4>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: '0 0 20px' }}>
                Your circuit schematic, verified pin assignments, and firmware are synchronized.
              </p>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                <button 
                  className="landing-btn-primary" 
                  onClick={handleExploreWorkspace}
                >
                  <span>Launch Workspace</span>
                  <ArrowRight size={14} />
                </button>
                <button 
                  className="landing-btn-secondary"
                  onClick={() => onNewProject ? onNewProject() : scrollToSection('prompt-card')}
                >
                  <span>New Custom Project</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Bento Grid Feature Presentation */}
      <section id="bento-features" className="landing-bento-section">
        <div className="landing-section-header">
          <span className="landing-section-tag">Engineering Capabilities</span>
          <h2 className="landing-section-title">Built for Physical Systems</h2>
          <p className="landing-section-desc">
            A deterministic engineering suite built from first principles for microcontrollers, sensors, and actuators.
          </p>
        </div>

        <div className="landing-bento-grid">
          {/* Card 1: Deterministic Pin DRC (2 cols) */}
          <div className="landing-bento-card col-span-2">
            <div className="landing-bento-header">
              <div className="landing-bento-icon">
                <ShieldCheck size={22} />
              </div>
              <h3 className="landing-bento-title">Deterministic Electrical DRC</h3>
              <p className="landing-bento-desc">
                Never hallucinate a pinout. Real microcontroller electrical rules prevent short circuits, protect flash-strapping pins (ESP32 GPIO6-11), and enforce voltage logic levels.
              </p>
            </div>
            <div className="landing-bento-illustration">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: '#94a3b8', fontFamily: 'var(--font-mono)' }}>
                <span>[CHECK: GPIO_VOLTAGE] 3.3V Logic Safe</span>
                <span style={{ color: '#10b981' }}>0 Pin Collisions</span>
                <span style={{ color: '#38bdf8' }}>I2C Pull-Up Verified</span>
              </div>
            </div>
          </div>

          {/* Card 2: Single Canonical Project Graph */}
          <div className="landing-bento-card">
            <div className="landing-bento-header">
              <div className="landing-bento-icon">
                <Layers size={22} />
              </div>
              <h3 className="landing-bento-title">Canonical Project Graph</h3>
              <p className="landing-bento-desc">
                Firmware, schematic, BOM, and simulation diagrams derive from a single versioned hardware graph. Changing a wire automatically updates firmware and assembly instructions.
              </p>
            </div>
          </div>

          {/* Card 3: Wokwi Simulation Ready */}
          <div className="landing-bento-card">
            <div className="landing-bento-header">
              <div className="landing-bento-icon">
                <Zap size={22} />
              </div>
              <h3 className="landing-bento-title">Wokwi Simulation Native</h3>
              <p className="landing-bento-desc">
                Generates authentic Wokwi <code style={{ color: '#f97316' }}>diagram.json</code> formats and runs behavioral assertions with serial telemetry logs.
              </p>
            </div>
          </div>

          {/* Card 4: Authentic Component Catalog */}
          <div className="landing-bento-card">
            <div className="landing-bento-header">
              <div className="landing-bento-icon">
                <Cpu size={22} />
              </div>
              <h3 className="landing-bento-title">Authentic Component Catalog</h3>
              <p className="landing-bento-desc">
                Every component references genuine manufacturer specifications, pinout constraints, and operating limits.
              </p>
            </div>
          </div>

          {/* Card 5: Project Memory Layer */}
          <div className="landing-bento-card">
            <div className="landing-bento-header">
              <div className="landing-bento-icon">
                <HardDrive size={22} />
              </div>
              <h3 className="landing-bento-title">Project Memory Layer</h3>
              <p className="landing-bento-desc">
                Every engineering trade-off, architectural choice, and defect fix is permanently recorded with provenance in local memory.
              </p>
            </div>
          </div>

          {/* Card 6: Complete Artifact Export (2 cols) */}
          <div className="landing-bento-card col-span-2">
            <div className="landing-bento-header">
              <div className="landing-bento-icon">
                <Download size={22} />
              </div>
              <h3 className="landing-bento-title">Complete Artifact Bundle Export</h3>
              <p className="landing-bento-desc">
                Export your entire engineering workspace as a standalone ZIP containing Arduino <code style={{ color: '#f97316' }}>.ino</code> source, Wokwi simulation diagram, detailed Bill of Materials (<code style={{ color: '#f97316' }}>bom.csv</code>), and step-by-step assembly guide.
              </p>
            </div>
            <div className="landing-bento-illustration">
              <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '11px', fontFamily: 'var(--font-mono)' }}>
                <span style={{ color: '#10b981' }}>✓ sketch.ino</span>
                <span style={{ color: '#10b981' }}>✓ diagram.json</span>
                <span style={{ color: '#10b981' }}>✓ bom.csv</span>
                <span style={{ color: '#10b981' }}>✓ assembly_guide.md</span>
                <span style={{ color: '#10b981' }}>✓ test_report.json</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Hardware Platforms & Demonstration Catalog */}
      <section id="hardware-catalog" className="landing-hardware-section">
        <div className="landing-section-header">
          <span className="landing-section-tag" id="pipeline">Hardware Registry</span>
          <h2 className="landing-section-title">Supported Microcontrollers & Peripherals</h2>
          <p className="landing-section-desc">
            Proven physical components ready for immediate circuit generation and simulation.
          </p>
        </div>

        <div className="landing-hardware-grid">
          <div className="landing-hardware-card">
            <h4>
              <Cpu size={18} color="#f97316" />
              <span>Microcontroller Boards</span>
            </h4>
            <p>
              <strong>ESP32 DevKit V1:</strong> Xtensa Dual-Core 240MHz, 3.3V logic, hardware PWM, ADC, hardware I2C.<br />
              <strong>Arduino Uno R3:</strong> ATmega328P, 5.0V logic, 16MHz clock, standard Arduino shield form factor.<br />
              <strong>Raspberry Pi Pico:</strong> RP2040 Dual ARM Cortex-M0+, 3.3V logic.
            </p>
          </div>

          <div className="landing-hardware-card">
            <h4>
              <Activity size={18} color="#38bdf8" />
              <span>Sensors & Transducers</span>
            </h4>
            <p>
              <strong>HC-SR04:</strong> Ultrasonic distance sensor (2cm to 400cm).<br />
              <strong>DHT22:</strong> High-precision digital temperature & relative humidity.<br />
              <strong>MPU-6050:</strong> 6-axis accelerometer & gyroscope with I2C bus.<br />
              <strong>Rotary Potentiometers:</strong> 10kΩ linear analog control.
            </p>
          </div>

          <div className="landing-hardware-card">
            <h4>
              <Zap size={18} color="#10b981" />
              <span>Actuators & Displays</span>
            </h4>
            <p>
              <strong>SSD1306:</strong> 0.96" 128x64 I2C Graphic OLED Display.<br />
              <strong>SG90 Micro Servo:</strong> 180° PWM position control.<br />
              <strong>Piezo Buzzers:</strong> PWM tone frequency generator.<br />
              <strong>Optical LEDs:</strong> 5mm Red, Green, Yellow with in-line current limiting resistors.
            </p>
          </div>
        </div>

        {/* Demo Templates Selector */}
        <div style={{ marginTop: '48px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '14px', textTransform: 'uppercase', letterSpacing: '0.6px', fontFamily: 'var(--font-mono)' }}>
            One-Click Demonstration Fixtures
          </h3>
          <div className="landing-demos-grid">
            {promptExamples.map((ex, idx) => (
              <div 
                key={idx}
                className="landing-demo-card"
                onClick={() => {
                  setPrompt(ex.prompt);
                  if (onLoadDemo && ex.tag.includes('ESP32')) {
                    onLoadDemo('parking');
                  } else {
                    onPlan(ex.prompt);
                  }
                }}
              >
                <div>
                  <div className="landing-demo-header">
                    <span className="landing-demo-title">{ex.title}</span>
                    <span className="landing-demo-tag">{ex.board}</span>
                  </div>
                  <p className="landing-demo-desc">{ex.prompt}</p>
                </div>
                <div className="landing-demo-action">
                  <span>Launch in Studio</span>
                  <ChevronRight size={14} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Saved Projects in Workspace (if any exist) */}
        {recentProjects.length > 0 && (
          <div style={{ marginTop: '48px', padding: '24px', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={16} color="#f97316" />
                <h4 style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: 0 }}>Saved Projects in Your Workspace</h4>
              </div>
              {onNavigateToDashboard && (
                <button 
                  className="landing-btn-secondary" 
                  onClick={onNavigateToDashboard}
                  style={{ padding: '4px 12px', fontSize: '12px' }}
                >
                  View All in Dashboard
                </button>
              )}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '10px' }}>
              {recentProjects.slice(0, 4).map((p) => (
                <div 
                  key={p.id}
                  onClick={() => onLoadProject(p.id)}
                  style={{
                    background: '#090a0f',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '8px',
                    padding: '12px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'border-color 0.2s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#f97316')}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.06)')}
                >
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{p.title}</div>
                    <div style={{ fontSize: '11px', color: '#64748b', fontFamily: 'var(--font-mono)' }}>{p.board_type} • v{p.version}</div>
                  </div>
                  <ChevronRight size={14} color="#f97316" />
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 8. Final Polished Call to Action */}
      <section className="landing-final-cta">
        <div className="landing-final-card">
          <h2 className="landing-final-title">Start Engineering in CircuitMind</h2>
          <p className="landing-final-subhead">
            Turn your ideas into deterministic schematics, verified firmware, and Wokwi simulation runs with full engineering memory.
          </p>

          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="landing-cta-btn-primary" 
              onClick={() => onNewProject ? onNewProject() : scrollToSection('prompt-card')}
            >
              <span>Start Building Free</span>
              <ArrowRight size={16} />
            </button>

            <button 
              className="landing-cta-btn-secondary" 
              onClick={handleExploreWorkspace}
            >
              <Sparkles size={16} color="#f97316" />
              <span>Explore Master Brief Demo</span>
            </button>
          </div>
        </div>
      </section>

      {/* 9. Technical Engineering Footer */}
      <footer className="landing-footer">
        <div className="landing-footer-left">
          <img src="/logo.svg" alt="CircuitMind Studio" />
          <div>
            <span style={{ fontWeight: 700, color: '#fff' }}>CircuitMind Studio</span>
            <span style={{ color: '#64748b', marginLeft: '6px' }}>• Canonical Graph-Driven Physical Systems IDE</span>
          </div>
        </div>

        <div className="landing-footer-badges">
          <span><ShieldCheck size={14} color="#10b981" /> Zero Hallucination DRC</span>
          <span><Zap size={14} color="#f97316" /> Wokwi Diagram v1</span>
          <span><HardDrive size={14} color="#38bdf8" /> Project Memory Layer</span>
        </div>
      </footer>
    </div>
  );
};
