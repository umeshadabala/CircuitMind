import React, { useState, useMemo } from 'react';
import {
  Cpu,
  ShieldCheck,
  Activity,
  Code2,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  Layers,
  Terminal,
  Zap,
  Lock,
  Globe,
  Sliders,
  FileText,
  ChevronRight,
  AlertTriangle,
  Play,
  Check,
  Search,
  Copy,
  Server,
  Microchip,
  Gauge,
  Workflow,
  Radio,
  BookOpen,
  Bot,
  Sun,
  Moon,
  Info,
  Wrench,
  Boxes,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { CatalogComponent } from '../types';

interface LandingViewProps {
  onStartNew: () => void;
  onSelectSample: (prompt: string, name: string) => void;
  catalog: CatalogComponent[];
}

export const LandingView: React.FC<LandingViewProps> = ({
  onStartNew,
  onSelectSample,
  catalog,
}) => {
  const [activeDemoTab, setActiveDemoTab] = useState<'canvas' | 'netlist' | 'bom' | 'validation' | 'guide' | 'firmware'>('canvas');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [activeNode, setActiveNode] = useState<string>('U1');

  const bentoCapabilities = [
    {
      title: 'Requirement-Driven Design',
      category: 'Intent Parser',
      description: 'Transforms natural-language product briefs into formal system requirements, interface counts, and electrical constraints.',
      icon: <Terminal className="w-5 h-5 text-[#5B9B8D]" />,
      badge: 'Structured NLP',
      colSpan: 'md:col-span-1',
    },
    {
      title: 'Autonomous Controller Selection',
      category: 'Resource Budgeting',
      description: 'Algorithmically matches compute headroom, peripheral timers, ADC resolution, and hardware buses across ESP32, RP2040, Arduino Uno, and STM32F405.',
      icon: <Cpu className="w-5 h-5 text-[#5B9B8D]" />,
      badge: '4 MCU Families',
      colSpan: 'md:col-span-2',
    },
    {
      title: 'Deterministic Pin Allocation',
      category: 'Constraint Solver',
      description: 'Solves physical GPIO mappings algorithmically. Strictly avoids bootstrapping pins (GPIO 0, 2, 12, 15) and input-only pins (GPIO 34-39) to eliminate flash boot failures.',
      icon: <Workflow className="w-5 h-5 text-[#5B9B8D]" />,
      badge: 'Anti-Strapping Protected',
      colSpan: 'md:col-span-2',
    },
    {
      title: 'Electrical Routing & Nets',
      category: 'Graph Synthesis',
      description: 'Constructs canonical electrical nets, isolates 5V and 3.3V power rails, and connects pull-ups and ground references.',
      icon: <Layers className="w-5 h-5 text-[#5B9B8D]" />,
      badge: 'Power Domain Isolation',
      colSpan: 'md:col-span-1',
    },
    {
      title: 'Static Design Rule Checks (DRC)',
      category: 'Safety Verification',
      description: 'Audits power-ground shorts, logic-level overvoltage, missing LED current-limiting resistors, and open-drain I2C pull-ups.',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      badge: 'Mathematical Verification',
      colSpan: 'md:col-span-1',
    },
    {
      title: 'Target-Specific C++ Firmware',
      category: 'Code Provenance',
      description: 'Produces clean, non-blocking Arduino and ESP-IDF C++ code mapped to exact canonical pin registers with interrupt-safe state machines.',
      icon: <Code2 className="w-5 h-5 text-[#5B9B8D]" />,
      badge: 'Zero Hallucinated Pins',
      colSpan: 'md:col-span-1',
    },
    {
      title: 'KiCad Netlist & BOM Generation',
      category: 'Manufacturing Ready',
      description: 'Generates industry-standard KiCad S-expression netlists and procurement-ready CSV/tabular Bills of Materials with verified manufacturer footprints.',
      icon: <FileText className="w-5 h-5 text-[#5B9B8D]" />,
      badge: 'KiCad 7/8 Compatible',
      colSpan: 'md:col-span-1',
    },
    {
      title: 'Breadboard Assembly Documentation',
      category: 'Physical Assembly',
      description: 'Provides pin-by-pin hookup instructions with color-coded jumper assignments and voltage precautions for foolproof bench assembly.',
      icon: <Wrench className="w-5 h-5 text-[#5B9B8D]" />,
      badge: 'Step-by-Step Hookup',
      colSpan: 'md:col-span-3',
    },
  ];

  const workflowStages = [
    {
      step: '01',
      title: 'Requirements Analysis',
      desc: 'Natural language is parsed into structured inputs, outputs, power domains, and operating states.',
      tool: 'Structured Prompt Parser',
      type: 'AI Assisted',
    },
    {
      step: '02',
      title: 'Board Selection',
      desc: 'Algorithm matches compute requirements, GPIO counts, and hardware peripheral timers.',
      tool: 'Resource Budgeting Matcher',
      type: 'Deterministic',
    },
    {
      step: '03',
      title: 'Hardware Architecture',
      desc: 'Resolves catalog parts, isolates voltage domains, and inserts required passive attenuators.',
      tool: 'Canonical Graph Builder',
      type: 'Deterministic',
    },
    {
      step: '04',
      title: 'Pin Allocation',
      desc: 'Constraint solver allocates pins, avoiding strapping pins (GPIO 0, 2, 12, 15) and flash buses.',
      tool: 'GPIO Constraint Solver',
      type: 'Deterministic',
    },
    {
      step: '05',
      title: 'Electrical Net Generation',
      desc: 'Resolves all signal endpoints, VCC rails, common ground paths, and bus terminations.',
      tool: 'Netlist Compiler',
      type: 'Deterministic',
    },
    {
      step: '06',
      title: 'DRC Validation',
      desc: 'Static electrical verification checks for shorts, logic-level mismatch, and unresisted LEDs.',
      tool: 'Algorithmic DRC Validator',
      type: 'Deterministic',
    },
    {
      step: '07',
      title: 'Engineering Outputs',
      desc: 'Exports KiCad netlists, procurement BOM, target C++ firmware, and assembly guides.',
      tool: 'Artifact Derivation Engine',
      type: 'Deterministic',
    },
  ];

  const sampleDesigns = [
    {
      title: 'ESP32 Ultrasonic Security Alarm',
      badge: 'Security / Sensing',
      prompt: 'Build an ESP32 ultrasonic anti-theft perimeter system with HC-SR04 distance sensor, buzzer alarm, and reset button',
      description: 'Ultrasonic proximity trigger with 5V-to-3.3V divider protection, active buzzer alarm, and armed state machine.',
      mcu: 'ESP32-DEVKIT-V1',
      components: 'HC-SR04, Active Buzzer, Push Button, Red LED, Resistors',
    },
    {
      title: 'Digital Temperature Monitor',
      badge: 'Telemetry / Display',
      prompt: 'Build a temperature monitoring system with DS18B20 1-Wire sensor, OLED SSD1306 display, and alert LED',
      description: 'Precision temperature telemetry with I2C OLED display, threshold warning indicators, and pull-up resistor verification.',
      mcu: 'ESP32-DEVKIT-V1',
      components: 'DS18B20, SSD1306 OLED, 4.7kΩ Pull-Up, Status LED',
    },
    {
      title: '3-Phase Traffic Light Controller',
      badge: 'State Machine / Safety',
      prompt: 'Create an automated traffic light controller with Red, Yellow, and Green LEDs, pedestrian button, and fail-safe timing',
      description: 'Deterministic sequential state machine with non-overlapping clearance intervals and current-limited outputs.',
      mcu: 'Raspberry Pi Pico (RP2040)',
      components: 'Red/Yellow/Green LEDs, 220Ω Resistors, Pedestrian Button',
    },
  ];

  const validationChecks = [
    {
      title: 'Power and Ground Short Protection',
      issue: 'VCC power rail accidentally bridged to ground net.',
      resolution: 'DRC isolates net endpoints, flagging zero-ohm short before power is connected.',
      status: 'VERIFIED',
    },
    {
      title: '5V to 3.3V Logic Level Protection',
      issue: '5V HC-SR04 ECHO signal connected directly to 3.3V ESP32 GPIO.',
      resolution: 'DRC enforces 1kΩ / 2kΩ voltage attenuation divider bounding input to 3.33V.',
      status: 'ENFORCED',
    },
    {
      title: 'Strapping Pin Boot Protection',
      issue: 'Switches or pull-downs wired to ESP32 bootstrapping pins (GPIO 0, 2, 12, 15).',
      resolution: 'Constraint solver locks strapping pins, preventing bootloader crash states.',
      status: 'LOCKED',
    },
    {
      title: 'LED Current-Limiting Resistor Checks',
      issue: 'Forward-biased LED connected directly to power rail without series resistance.',
      resolution: 'DRC flags missing current limiter and calculates required series resistor (220Ω–330Ω).',
      status: 'CALCULATED',
    },
    {
      title: 'I2C Bus Pull-Up Termination',
      issue: 'Open-drain I2C communication lines left floating without bus pull-ups.',
      resolution: 'DRC audits SDA/SCL lines, verifying 4.7kΩ pull-ups for reliable 400kHz operation.',
      status: 'TERMINATED',
    },
    {
      title: 'Input-Only GPIO Restrictions',
      issue: 'Actuator or output signal assigned to ESP32 GPI pins (GPIO 34–39).',
      resolution: 'Constraint solver restricts GPIO 34–39 strictly to analog or digital inputs.',
      status: 'RESTRICTED',
    },
  ];

  const categories = [
    { id: 'all', label: 'All Parts' },
    { id: 'mcu', label: 'Controllers' },
    { id: 'sensor', label: 'Sensors' },
    { id: 'display', label: 'Displays' },
    { id: 'actuator', label: 'Actuators' },
    { id: 'passive', label: 'Passives' },
  ];

  const filteredCatalog = useMemo(() => {
    return catalog.filter((c) => {
      const matchesCategory = selectedCatalogCategory === 'all' || c.category === selectedCatalogCategory;
      const matchesSearch =
        searchQuery === '' ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.catalog_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [catalog, selectedCatalogCategory, searchQuery]);

  const copyKiCadCode = () => {
    const code = `(export (version D)
  (components
    (comp (ref U1) (value ESP32-WROOM-32D) (footprint RF_Module:ESP32-WROOM-32))
    (comp (ref S1) (value HC-SR04) (footprint Sensor_Ultrasonic:HC-SR04))
    (comp (ref R1) (value 1k) (footprint Resistor_THT:R_Axial_DIN0207_L6.3mm))
    (comp (ref R2) (value 2k) (footprint Resistor_THT:R_Axial_DIN0207_L6.3mm))
    (comp (ref BZ1) (value BUZZER_ACTIVE) (footprint Buzzer_Beeper:Buzzer_12x9.5RM7.6))
  )
  (nets
    (net (code 1) (name "NET_GND") (node (ref U1) (pin 1)) (node (ref S1) (pin 4)) (node (ref R2) (pin 2)))
    (net (code 2) (name "NET_5V") (node (ref U1) (pin 19)) (node (ref S1) (pin 1)))
    (net (code 3) (name "NET_TRIG") (node (ref U1) (pin 23)) (node (ref S1) (pin 2)))
    (net (code 4) (name "NET_ECHO_ATTENUATED") (node (ref U1) (pin 24)) (node (ref R1) (pin 2)) (node (ref R2) (pin 1)))
  )
)`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#090D12] dark:bg-[#090D12] bg-[#F8FAFC] text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-sans selection:bg-[#356B62] selection:text-white transition-colors">
      {/* ================= HERO SECTION ================= */}
      <section className="relative pt-16 pb-24 px-6 max-w-7xl mx-auto w-full flex flex-col items-center text-center">
        {/* Subtle Aceternity Spotlight Background Radial Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[450px] bg-gradient-to-b from-[#356B62]/20 via-[#5B9B8D]/5 to-transparent blur-3xl pointer-events-none -z-10" />

        {/* Small Understated Product Descriptor */}
        <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#101720] dark:bg-[#101720] bg-slate-100 border border-[#25332F] dark:border-[#25332F] border-slate-200 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-[#5B9B8D] animate-pulse" />
          <span>AI-assisted Embedded Hardware & Firmware Engineering Workspace</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-mono leading-[1.15] max-w-4xl">
          From engineering requirements to <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#5B9B8D] via-[#85C4B7] to-teal-200">
            validated circuits.
          </span>
        </h1>

        {/* Supporting Text */}
        <p className="mt-6 text-sm sm:text-base lg:text-lg text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto font-sans leading-relaxed">
          CircuitMind transforms natural-language hardware requirements into structured circuit designs,
          deterministic pin allocations, electrical netlists, firmware, and engineering documentation.
        </p>

        {/* CTA Buttons */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <button
            onClick={onStartNew}
            className="flex items-center space-x-2 px-7 py-3.5 rounded-xl text-xs font-mono font-bold text-white bg-[#356B62] hover:bg-[#2D5E56] shadow-lg shadow-[#356B62]/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>Start Designing</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#workspace"
            className="flex items-center space-x-2 px-6 py-3.5 rounded-xl text-xs font-mono font-medium text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 bg-[#101720] dark:bg-[#101720] bg-slate-100 border border-[#25332F] dark:border-[#25332F] border-slate-300 hover:border-[#356B62] transition-colors"
          >
            <span>Explore the Platform</span>
          </a>
        </div>

        {/* Hero Visual: Realistic Workspace Representation */}
        <div className="mt-14 w-full max-w-5xl bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-left font-mono text-xs">
          {/* Chrome Bar */}
          <div className="bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 px-4 py-2.5 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80" />
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80" />
              <span className="ml-3 text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 text-[11px] font-semibold">
                CircuitMind Workspace — ESP32 Ultrasonic Security System (Rev 3)
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 text-[10px] font-bold">
                ✔ DRC CLEAN (0 ERRORS)
              </span>
            </div>
          </div>

          {/* Workspace Body Simulation */}
          <div className="p-6 bg-[#090D12] dark:bg-[#090D12] bg-slate-50 grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Node 1: Controller */}
            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#356B62]/60 rounded-xl p-4 space-y-2.5 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">U1 · ESP32-WROOM-32D</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#5B9B8D] border border-[#25332F]">3.3V MCU</span>
              </div>
              <div className="space-y-1 text-[11px]">
                <div className="flex justify-between py-1 px-2 bg-[#090D12] dark:bg-[#090D12] bg-slate-100 rounded">
                  <span className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">GPIO23</span>
                  <span className="text-emerald-400 font-semibold">TRIG_PIN → S1:TRIG</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-[#090D12] dark:bg-[#090D12] bg-slate-100 rounded">
                  <span className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">GPIO18</span>
                  <span className="text-emerald-400 font-semibold">ECHO_DIV ← R2:OUT</span>
                </div>
                <div className="flex justify-between py-1 px-2 bg-[#090D12] dark:bg-[#090D12] bg-slate-100 rounded">
                  <span className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">GPIO21 / 22</span>
                  <span className="text-cyan-400 font-semibold">I2C SDA / SCL</span>
                </div>
              </div>
            </div>

            {/* Node 2: Sensor & Attenuation Divider */}
            <div className="space-y-3">
              <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-xl p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">S1 · HC-SR04</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">5V Sensor</span>
                </div>
                <div className="text-[10px] space-y-1">
                  <div className="flex justify-between text-[#96A6A3] dark:text-[#96A6A3] text-slate-600">
                    <span>ECHO Output</span>
                    <span className="text-amber-400">5V Pulse → Divider</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-emerald-500/30 rounded-xl p-3 space-y-1">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> 1kΩ / 2kΩ Divider Protection
                </div>
                <p className="text-[10px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans">
                  5V signal attenuated to 3.33V. ESP32 input safely protected from overvoltage.
                </p>
              </div>
            </div>

            {/* Compact Copilot Preview */}
            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-xl p-4 space-y-2.5">
              <div className="flex items-center justify-between text-[11px] pb-1.5 border-b border-[#25332F] dark:border-[#25332F] border-slate-200">
                <span className="text-[#5B9B8D] font-bold flex items-center gap-1">
                  <Sparkles className="w-3 h-3" /> Copilot Context
                </span>
                <span className="text-[10px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">gpt-oss:120b-cloud</span>
              </div>
              <p className="text-[11px] text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 font-sans leading-relaxed">
                "Pin allocation verified. Bootstrapping pins GPIO 0, 2, 12, 15 are unassigned. 4.7kΩ I2C pull-ups confirmed on SDA/SCL."
              </p>
              <div className="text-[10px] text-emerald-400 flex items-center gap-1 pt-1 border-t border-[#25332F]/50">
                <Check className="w-3 h-3" /> Ready for Breadboard Wiring
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION C: PRODUCT OVERVIEW (BENTO GRID) ================= */}
      <section id="overview" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#356B62]/10 border border-[#356B62]/30 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase">
            <span>UNIFIED SYSTEM ARCHITECTURE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
            Everything your engineering workflow needs.
          </h2>
          <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto">
            CircuitMind connects requirements, components, pins, electrical connections, validation, and engineering outputs through a canonical project graph.
          </p>
        </div>

        {/* Aceternity Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {bentoCapabilities.map((item, idx) => (
            <div
              key={idx}
              className={`${item.colSpan} bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 hover:border-[#356B62] rounded-2xl p-6 space-y-3.5 transition-all group flex flex-col justify-between`}
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-xl bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 border border-[#25332F] dark:border-[#25332F] border-slate-200 flex items-center justify-center">
                    {item.icon}
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#5B9B8D] px-2 py-0.5 rounded border border-[#25332F] dark:border-[#25332F] border-slate-200">
                    {item.badge}
                  </span>
                </div>

                <div>
                  <div className="text-[10px] font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 uppercase tracking-wider">{item.category}</div>
                  <h3 className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 group-hover:text-[#5B9B8D] transition-colors mt-0.5">
                    {item.title}
                  </h3>
                </div>

                <p className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans leading-relaxed">
                  {item.description}
                </p>
              </div>

              <div className="pt-3 border-t border-[#25332F]/50 dark:border-[#25332F]/50 border-slate-200/50 flex items-center text-[10px] font-mono text-[#5B9B8D]">
                <span>Synchronized with Canonical Graph</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION D: ENGINEERING WORKFLOW ================= */}
      <section id="workflow" className="py-20 px-6 bg-[#101720]/60 dark:bg-[#101720]/60 bg-slate-100 border-y border-[#25332F] dark:border-[#25332F] border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#356B62]/10 border border-[#356B62]/30 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase">
              <span>SYSTEMATIC PIPELINE</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
              From an idea to an engineered system.
            </h2>
            <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto">
              AI assists with high-level interpretation, while deterministic algorithms handle constraint-based engineering operations.
            </p>
          </div>

          {/* Visual Timeline / Stepper */}
          <div className="grid grid-cols-1 md:grid-cols-7 gap-3 relative">
            {workflowStages.map((stage) => (
              <div
                key={stage.step}
                className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 p-4 rounded-xl space-y-2 flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#5B9B8D]">{stage.step}</span>
                    <span className={`text-[9px] font-mono px-1.5 py-0.2 rounded border ${
                      stage.type === 'AI Assisted' 
                        ? 'bg-purple-950/40 text-purple-300 border-purple-800/40' 
                        : 'bg-emerald-950/40 text-emerald-400 border-emerald-800/40'
                    }`}>
                      {stage.type}
                    </span>
                  </div>
                  <h4 className="font-mono text-xs font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 leading-tight">
                    {stage.title}
                  </h4>
                  <p className="text-[11px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans leading-snug">
                    {stage.desc}
                  </p>
                </div>

                <div className="pt-2 border-t border-[#25332F]/60 text-[9px] font-mono text-[#96A6A3] truncate">
                  {stage.tool}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-[#151F2B] dark:bg-[#151F2B] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-300 p-3.5 rounded-xl flex items-center justify-between text-xs font-mono text-[#96A6A3]">
            <span>Deterministic Guarantee: Physical pins, voltage rails, and netlists are resolved by code algorithms, not probability.</span>
            <span className="text-[#5B9B8D] font-bold">100% REPRODUCIBLE</span>
          </div>
        </div>
      </section>

      {/* ================= SECTION E: THE ENGINEERING WORKSPACE ================= */}
      <section id="workspace" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-10">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#356B62]/10 border border-[#356B62]/30 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase">
            <span>SYNCHRONIZED ENGINEERING IDE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
            One source of truth. Multiple synchronized views.
          </h2>
          <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto">
            These views are connected to the same canonical Project Graph. A mutation in one reflects immediately across the rest.
          </p>
        </div>

        {/* Tabbed Interactive Showcase */}
        <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-2xl shadow-xl overflow-hidden font-mono text-xs">
          <div className="bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 px-4 flex space-x-1 overflow-x-auto">
            {[
              { id: 'canvas', label: 'Circuit Canvas' },
              { id: 'netlist', label: 'Netlist' },
              { id: 'bom', label: 'Bill of Materials' },
              { id: 'validation', label: 'Validation Panel' },
              { id: 'guide', label: 'Assembly Guide' },
              { id: 'firmware', label: 'Firmware View' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemoTab(tab.id as any)}
                className={`py-3.5 px-4 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeDemoTab === tab.id
                    ? 'border-[#5B9B8D] text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 bg-[#101720] dark:bg-[#101720] bg-white'
                    : 'border-transparent text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4]'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="p-6 bg-[#090D12] dark:bg-[#090D12] bg-slate-50 min-h-[380px]">
            {activeDemoTab === 'canvas' && (
              <div className="space-y-4">
                <div className="text-[#96A6A3] text-[11px]">Visual representation of active nodes, pins, and nets:</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#356B62]/60 p-4 rounded-xl space-y-2">
                    <span className="font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">U1 · ESP32-WROOM-32D</span>
                    <div className="text-[11px] text-[#96A6A3] space-y-1">
                      <div>GPIO5: TRIG → S1:TRIG</div>
                      <div>GPIO18: ECHO_DIV ← R2:OUT</div>
                      <div>GPIO21/22: I2C SDA/SCL</div>
                    </div>
                  </div>
                  <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] p-4 rounded-xl space-y-2">
                    <span className="font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">S1 · HC-SR04</span>
                    <div className="text-[11px] text-[#96A6A3] space-y-1">
                      <div>VCC: 5V Rail</div>
                      <div>ECHO: → 1k/2k Divider</div>
                    </div>
                  </div>
                  <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-emerald-500/40 p-4 rounded-xl space-y-2">
                    <span className="font-bold text-emerald-400">R1 / R2 · Voltage Divider</span>
                    <div className="text-[11px] text-[#96A6A3] space-y-1">
                      <div>1kΩ / 2kΩ Attenuation</div>
                      <div>Safe Output: 3.33V</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'netlist' && (
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[11px] text-[#96A6A3]">
                  <span>KiCad S-Expression PCB Netlist:</span>
                  <button onClick={copyKiCadCode} className="px-2 py-1 bg-[#151F2B] border border-[#25332F] rounded text-slate-200 hover:text-white">
                    {copiedCode ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <pre className="bg-[#101720] dark:bg-[#101720] bg-white p-4 rounded-xl border border-[#25332F] text-[11px] text-[#96A6A3] overflow-x-auto">
{`(export (version D)
  (components
    (comp (ref U1) (value ESP32-WROOM-32D) (footprint RF_Module:ESP32-WROOM-32))
    (comp (ref S1) (value HC-SR04) (footprint Sensor_Ultrasonic:HC-SR04))
    (comp (ref R1) (value 1k) (footprint Resistor_THT:R_Axial_DIN0207_L6.3mm))
    (comp (ref R2) (value 2k) (footprint Resistor_THT:R_Axial_DIN0207_L6.3mm))
  )
  (nets
    (net (code 1) (name "NET_GND") (node (ref U1) (pin 1)) (node (ref S1) (pin 4)) (node (ref R2) (pin 2)))
    (net (code 2) (name "NET_5V") (node (ref U1) (pin 19)) (node (ref S1) (pin 1)))
    (net (code 3) (name "NET_TRIG") (node (ref U1) (pin 23)) (node (ref S1) (pin 2)))
    (net (code 4) (name "NET_ECHO_ATTENUATED") (node (ref U1) (pin 24)) (node (ref R1) (pin 2)) (node (ref R2) (pin 1)))
  )
)`}
                </pre>
              </div>
            )}

            {activeDemoTab === 'bom' && (
              <table className="w-full text-left text-xs font-mono">
                <thead>
                  <tr className="border-b border-[#25332F] text-[#96A6A3]">
                    <th className="py-2.5 px-3">Ref</th>
                    <th className="py-2.5 px-3">Part Name</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Specs</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#25332F]/50 text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800">
                  <tr>
                    <td className="py-2 px-3 text-[#5B9B8D] font-bold">U1</td>
                    <td className="py-2 px-3">ESP32-DEVKIT-V1</td>
                    <td className="py-2 px-3 text-[#96A6A3]">MCU</td>
                    <td className="py-2 px-3">3.3V Logic, 240MHz</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-[#5B9B8D] font-bold">S1</td>
                    <td className="py-2 px-3">HC-SR04</td>
                    <td className="py-2 px-3 text-[#96A6A3]">Sensor</td>
                    <td className="py-2 px-3">5V VCC, 40kHz</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 text-[#5B9B8D] font-bold">R1, R2</td>
                    <td className="py-2 px-3">1kΩ, 2kΩ Resistors</td>
                    <td className="py-2 px-3 text-[#96A6A3]">Passive Divider</td>
                    <td className="py-2 px-3">1/4W 5% Carbon Film</td>
                    <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                  </tr>
                </tbody>
              </table>
            )}

            {activeDemoTab === 'validation' && (
              <div className="space-y-3">
                <div className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> All Electrical Rules Pass (0 Errors, 0 Warnings)
                </div>
                <div className="space-y-2 text-xs text-[#96A6A3]">
                  <div className="bg-[#101720] dark:bg-[#101720] bg-white p-3 rounded-lg border border-[#25332F]">
                    <span className="text-white font-semibold">Strapping Pin Isolation: </span>
                    <span>GPIO 0, 2, 12, 15 are unassigned to eliminate flash boot failures.</span>
                  </div>
                  <div className="bg-[#101720] dark:bg-[#101720] bg-white p-3 rounded-lg border border-[#25332F]">
                    <span className="text-white font-semibold">Voltage Domain Protection: </span>
                    <span>HC-SR04 5V Echo line attenuated via 1kΩ/2kΩ divider. Safe at 3.33V.</span>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'guide' && (
              <div className="space-y-2 text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800">
                <div className="p-2.5 bg-[#101720] dark:bg-[#101720] bg-white rounded border border-[#25332F]">
                  Step 1: Seat ESP32 across breadboard trench with Pin 1 at Row 1.
                </div>
                <div className="p-2.5 bg-[#101720] dark:bg-[#101720] bg-white rounded border border-[#25332F]">
                  Step 2: Connect VIN (5V) to Red Rail (+) and GND to Blue Rail (-).
                </div>
                <div className="p-2.5 bg-[#101720] dark:bg-[#101720] bg-white rounded border border-[#25332F]">
                  Step 3: Connect HC-SR04 VCC to 5V and GND to GND.
                </div>
                <div className="p-2.5 bg-[#101720] dark:bg-[#101720] bg-white rounded border border-[#25332F]">
                  Step 4: Form voltage divider: ECHO to 1kΩ, opposite side to 2kΩ & GPIO18.
                </div>
              </div>
            )}

            {activeDemoTab === 'firmware' && (
              <pre className="bg-[#101720] dark:bg-[#101720] bg-white p-4 rounded-xl border border-[#25332F] text-[11px] text-[#5B9B8D] overflow-x-auto">
{`/**
 * CircuitMind Generated Embedded Firmware
 * Project: ESP32 Security Perimeter
 * Target Platform: ESP32-DEVKIT-V1
 */
#include <Arduino.h>

#define PIN_S1_TRIG 23
#define PIN_S1_ECHO 18
#define PIN_BZ1_POS 19

void setup() {
  Serial.begin(115200);
  pinMode(PIN_S1_TRIG, OUTPUT);
  pinMode(PIN_S1_ECHO, INPUT);
  pinMode(PIN_BZ1_POS, OUTPUT);
}

void loop() {
  // Non-blocking distance evaluation state machine
}`}
              </pre>
            )}
          </div>
        </div>
      </section>

      {/* ================= SECTION F: HARDWARE SUPPORT ================= */}
      <section id="hardware" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#356B62]/10 border border-[#356B62]/30 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase">
              <span>PHYSICAL HARDWARE SUPPORT</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
              Designed around real hardware.
            </h2>
            <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-xl">
              Curated library of supported controllers, sensors, displays, actuators, and passives with documented electrical specifications.
            </p>
          </div>

          {/* Search & Categories */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search catalog parts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-300 rounded-lg pl-8 pr-3 py-2 text-xs font-mono text-white dark:text-white text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#5B9B8D] w-full sm:w-52"
              />
            </div>

            <div className="flex items-center space-x-1 overflow-x-auto text-[11px] font-mono bg-[#101720] dark:bg-[#101720] bg-slate-100 p-1 rounded-lg border border-[#25332F] dark:border-[#25332F] border-slate-300">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCatalogCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-md uppercase transition-colors whitespace-nowrap ${
                    selectedCatalogCategory === cat.id
                      ? 'bg-[#356B62] text-white font-semibold'
                      : 'text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCatalog.slice(0, 12).map((comp) => (
            <div
              key={comp.catalog_id}
              className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 hover:border-[#356B62] p-4 rounded-xl space-y-2.5 transition-colors flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#96A6A3] px-2 py-0.5 rounded border border-[#25332F]">
                    {comp.category}
                  </span>
                  <span className="text-[10px] font-mono text-[#5B9B8D]">
                    {comp.pins?.length || 0} Pins
                  </span>
                </div>

                <div>
                  <h4 className="font-mono text-xs font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 truncate">{comp.name}</h4>
                  <p className="text-[11px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans line-clamp-2 mt-1">
                    {comp.description}
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-[#25332F]/50 flex items-center justify-between text-[10px] font-mono text-[#96A6A3]">
                <span>{comp.part_number || 'Standard'}</span>
                <span className="text-emerald-400 font-medium">
                  {comp.supply_voltage_min === comp.supply_voltage_max
                    ? `${comp.supply_voltage_min}V`
                    : `${comp.supply_voltage_min}V - ${comp.supply_voltage_max}V`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ================= SECTION G: ELECTRICAL VALIDATION ================= */}
      <section className="py-20 px-6 bg-[#101720]/60 dark:bg-[#101720]/60 bg-slate-100 border-y border-[#25332F] dark:border-[#25332F] border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-mono tracking-wider uppercase">
              <span>ACTIVE DRC RULES</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
              Catch engineering mistakes before assembly.
            </h2>
            <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto">
              CircuitMind audits static rules across power rails, signal levels, and peripheral requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {validationChecks.map((v, idx) => (
              <div
                key={idx}
                className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 p-5 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                    {v.status}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                </div>
                <h4 className="font-mono text-xs font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">{v.title}</h4>
                <div className="space-y-1.5 text-[11px] font-sans">
                  <div className="text-rose-400">
                    <span className="font-semibold font-mono">Risk: </span>{v.issue}
                  </div>
                  <div className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-600">
                    <span className="font-semibold font-mono text-[#5B9B8D]">DRC: </span>{v.resolution}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ================= SECTION H: AI ASSISTANT ================= */}
      <section id="ai-engine" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#356B62]/10 border border-[#356B62]/30 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase">
            <span>AI CONFIGURATION & INFERENCE</span>
          </div>
          <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
            Engineering assistance, built into the workflow.
          </h2>
          <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto">
            Powered by Ollama with <code className="text-[#5B9B8D] font-mono">gpt-oss:120b-cloud</code>.
            Two distinct experiences for system design and technical learning.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {/* Experience 1: Normal AI Assistant */}
          <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-2xl p-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <BookOpen className="w-4 h-4" />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">Normal AI Assistant</h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-amber-950/40 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded">
                  Educational
                </span>
              </div>

              <p className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans leading-relaxed">
                A technical guide for understanding electronic principles, calculating passive values, and explaining embedded protocols.
              </p>

              <div className="space-y-2 text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-700 pt-2 border-t border-[#25332F]/50">
                <div className="flex items-center space-x-2">
                  <span className="text-amber-400 font-mono">▸</span>
                  <span>General electronics explanations and component theory</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-amber-400 font-mono">▸</span>
                  <span>Technical datasheet and interface questions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-amber-400 font-mono">▸</span>
                  <span>C++ programming & driver library assistance</span>
                </div>
              </div>
            </div>

            <div className="bg-[#090D12] dark:bg-[#090D12] bg-slate-100 p-3 rounded-lg border border-[#25332F] dark:border-[#25332F] border-slate-200 text-[10px] font-mono text-[#96A6A3]">
              Role: Electronics Reference & Learning
            </div>
          </div>

          {/* Experience 2: Engineering Copilot */}
          <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#356B62]/60 rounded-2xl p-7 space-y-5 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-8 h-8 rounded-lg bg-[#356B62]/20 border border-[#356B62]/40 flex items-center justify-center text-[#5B9B8D]">
                    <Bot className="w-4 h-4" />
                  </div>
                  <h3 className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">Engineering Copilot</h3>
                </div>
                <span className="text-[10px] font-mono uppercase bg-[#151F2B] text-[#5B9B8D] border border-[#356B62]/40 px-2 py-0.5 rounded">
                  Graph Aware
                </span>
              </div>

              <p className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans leading-relaxed">
                Directly connected to the active project graph. Proposes graph mutations, explains active pin assignments, and interprets DRC findings.
              </p>

              <div className="space-y-2 text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-700 pt-2 border-t border-[#25332F]/50">
                <div className="flex items-center space-x-2">
                  <span className="text-[#5B9B8D] font-mono">▸</span>
                  <span>Context-aware project graph discussions</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[#5B9B8D] font-mono">▸</span>
                  <span>Circuit mutation suggestions (+LED, +Buzzer)</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-[#5B9B8D] font-mono">▸</span>
                  <span>Component compatibility and DRC findings explanation</span>
                </div>
              </div>
            </div>

            <div className="bg-[#090D12] dark:bg-[#090D12] bg-slate-100 p-3 rounded-lg border border-[#25332F] dark:border-[#25332F] border-slate-200 text-[10px] font-mono text-[#96A6A3]">
              Active Model: Ollama · <span className="text-[#5B9B8D]">gpt-oss:120b-cloud</span>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION I: ENGINEERING OUTPUTS ================= */}
      <section className="py-20 px-6 bg-[#101720]/60 dark:bg-[#101720]/60 bg-slate-100 border-y border-[#25332F] dark:border-[#25332F] border-slate-200">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-[#356B62]/10 border border-[#356B62]/30 text-[#5B9B8D] text-xs font-mono tracking-wider uppercase">
              <span>PRODUCTION ARTIFACTS</span>
            </div>
            <h2 className="text-2xl sm:text-4xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
              From structured designs to usable engineering artifacts.
            </h2>
            <p className="text-xs sm:text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-2xl mx-auto">
              Every project generates concrete files and code you can use immediately on your workbench.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] p-4 rounded-xl space-y-2">
              <FileText className="w-5 h-5 text-[#5B9B8D]" />
              <h4 className="font-mono text-xs font-bold text-white dark:text-white text-slate-900">KiCad PCB Netlist</h4>
              <p className="text-[11px] text-[#96A6A3] font-sans">S-expression export compatible with KiCad 7 and 8.</p>
            </div>

            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] p-4 rounded-xl space-y-2">
              <Layers className="w-5 h-5 text-[#5B9B8D]" />
              <h4 className="font-mono text-xs font-bold text-white dark:text-white text-slate-900">Bill of Materials</h4>
              <p className="text-[11px] text-[#96A6A3] font-sans">Reference designators, footprints, and part numbers.</p>
            </div>

            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] p-4 rounded-xl space-y-2">
              <Code2 className="w-5 h-5 text-[#5B9B8D]" />
              <h4 className="font-mono text-xs font-bold text-white dark:text-white text-slate-900">Target C++ Firmware</h4>
              <p className="text-[11px] text-[#96A6A3] font-sans">Non-blocking Arduino/ESP-IDF C++ mapped to active pins.</p>
            </div>

            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] p-4 rounded-xl space-y-2">
              <Wrench className="w-5 h-5 text-[#5B9B8D]" />
              <h4 className="font-mono text-xs font-bold text-white dark:text-white text-slate-900">Assembly Guide</h4>
              <p className="text-[11px] text-[#96A6A3] font-sans">Step-by-step breadboard wiring instructions.</p>
            </div>

            <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] p-4 rounded-xl space-y-2">
              <Activity className="w-5 h-5 text-[#5B9B8D]" />
              <h4 className="font-mono text-xs font-bold text-white dark:text-white text-slate-900">Simulation Traces</h4>
              <p className="text-[11px] text-[#96A6A3] font-sans">Trace logs testing sensor excursions and alarms.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= SECTION J: LIMITATIONS & TRANSPARENCY ================= */}
      <section id="transparency" className="py-16 px-6 max-w-5xl mx-auto w-full">
        <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 p-7 rounded-2xl space-y-4">
          <div className="flex items-center space-x-2 text-[#5B9B8D]">
            <Info className="w-5 h-5" />
            <h3 className="font-mono text-sm font-bold uppercase tracking-wider text-white dark:text-white text-slate-900">
              Engineering Limitations & Transparency Disclosures
            </h3>
          </div>

          <div className="space-y-3 text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans leading-relaxed">
            <p>
              • <strong>Behavioral Simulation vs SPICE:</strong> CircuitMind's behavioral simulator validates logical state machines,
              threshold triggers, and pin mappings. It does not replace continuous-time SPICE solvers, RF transmission-line analysis, or EMC testing.
            </p>
            <p>
              • <strong>AI Assistance vs Deterministic Safety:</strong> AI recommendations do not replace deterministic electrical validation.
              Physical pin assignments and voltage safety are verified by code rules, not generative probability.
            </p>
            <p>
              • <strong>Physical Testing Review:</strong> Physical prototypes should always be reviewed and tested with appropriate bench equipment
              before applying live power.
            </p>
          </div>
        </div>
      </section>

      {/* ================= SECTION K: FINAL CTA & FOOTER ================= */}
      <section className="py-20 px-6 max-w-5xl mx-auto w-full text-center space-y-6">
        <h2 className="text-3xl sm:text-5xl font-extrabold font-mono text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-tight">
          Start building with CircuitMind.
        </h2>
        <p className="text-sm text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-xl mx-auto leading-relaxed">
          Bring your hardware requirements. Build a structured design. Validate it systematically.
        </p>

        <div>
          <button
            onClick={onStartNew}
            className="inline-flex items-center space-x-2 px-8 py-4 rounded-xl text-xs font-mono font-bold text-white bg-[#356B62] hover:bg-[#2D5E56] shadow-lg shadow-[#356B62]/20 transition-all transform hover:-translate-y-0.5"
          >
            <span>Open CircuitMind Workspace</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </section>

      <footer className="border-t border-[#25332F] dark:border-[#25332F] border-slate-200 py-12 px-6 bg-[#090D12] dark:bg-[#090D12] bg-white">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-[#356B62]/20 border border-[#356B62]/40 flex items-center justify-center text-[#5B9B8D]">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white dark:text-white text-slate-900">CircuitMind</span>
            <span>· Embedded Hardware Engineering Workspace</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#101720] border border-[#25332F]">v1.0.0</span>
          </div>

          <div className="flex items-center space-x-6">
            <a href="#overview" className="hover:text-white transition-colors">Platform</a>
            <a href="#workflow" className="hover:text-white transition-colors">Workflow</a>
            <a href="#hardware" className="hover:text-white transition-colors">Catalog</a>
            <a href="#ai-engine" className="hover:text-white transition-colors">Ollama AI</a>
          </div>

          <div>
            © 2026 CircuitMind Systems. Apache 2.0 License.
          </div>
        </div>
      </footer>
    </div>
  );
};
