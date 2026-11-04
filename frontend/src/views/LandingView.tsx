import React, { useState } from 'react';
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
  Wrench,
  AlertTriangle,
  Play,
  Share2,
  Check,
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
  const [activeDemoTab, setActiveDemoTab] = useState<'canvas' | 'netlist' | 'bom' | 'guide' | 'drc'>('canvas');
  const [selectedCatalogCategory, setSelectedCatalogCategory] = useState<string>('all');

  const sampleProjects = [
    {
      title: 'ESP32 Anti-Theft Security Alarm',
      badge: 'Security / Sensing',
      prompt: 'Build an ESP32 ultrasonic anti-theft perimeter system with HC-SR04 distance sensor, buzzer alarm, and reset button',
      description: 'Ultrasonic proximity trigger with 5V-to-3.3V divider protection, active buzzer alarm, and armed state machine.',
      mcu: 'ESP32-WROOM-32D',
      components: 'HC-SR04, Active Buzzer, Push Button, Red LED, Resistors',
    },
    {
      title: 'Digital Temperature Monitor',
      badge: 'Telemetry / Display',
      prompt: 'Build a temperature monitoring system with DS18B20 1-Wire sensor, OLED SSD1306 display, and alert LED',
      description: 'Precision temperature telemetry with I2C OLED display, threshold warning indicators, and pull-up resistor verification.',
      mcu: 'ESP32-WROOM-32D',
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

  const workflowSteps = [
    {
      num: '01',
      title: 'Requirements Extraction',
      desc: 'Parses natural language into formal I/O requirements, interfaces, electrical limits, and functional operating states.',
      tag: 'Structured AI Parser',
    },
    {
      num: '02',
      title: 'Autonomous Board Selection',
      desc: 'Evaluates controller resource constraints (GPIO count, hardware I2C/SPI/UART buses, ADC channels, and clock speeds).',
      tag: 'Deterministic Matcher',
    },
    {
      num: '03',
      title: 'Hardware Architecture',
      desc: 'Constructs component topology, isolates power domains (5V / 3.3V), and identifies required passives and pull-ups.',
      tag: 'Topology Engine',
    },
    {
      num: '04',
      title: 'Deterministic Pin Allocation',
      desc: 'Assigns pins algorithmically while strictly protecting bootstrapping pins (GPIO 0, 2, 12, 15) and input-only pins.',
      tag: 'Constraint Solver',
    },
    {
      num: '05',
      title: 'Electrical Routing & Netlist',
      desc: 'Resolves all nets, endpoints, and signal paths to export industry-standard KiCad format netlists.',
      tag: 'KiCad Netlist Generator',
    },
    {
      num: '06',
      title: 'DRC Validation & Firmware',
      desc: 'Executes static design rule checks and generates production-ready C++ firmware mapped to exact hardware registers.',
      tag: 'Algorithmic DRC + C++',
    },
  ];

  const capabilities = [
    {
      icon: <Cpu className="w-5 h-5 text-indigo-400" />,
      title: 'Deterministic Hardware Synthesis',
      desc: 'Eliminates AI hallucinations by separating natural-language intent parsing from physical circuit synthesis. Pins and nets are mapped algorithmically.',
    },
    {
      icon: <Layers className="w-5 h-5 text-emerald-400" />,
      title: '28-Component Verified Catalog',
      desc: 'Curated library of microcontrollers, I2C/SPI sensors, displays, and actuators with exact pinouts, electrical constraints, and footprint specs.',
    },
    {
      icon: <ShieldCheck className="w-5 h-5 text-cyan-400" />,
      title: 'Static Design Rule Checking (DRC)',
      desc: 'Automated verification audits voltage domains, strapping pin conflicts, floating nets, missing pull-ups, and LED current-limiting resistors.',
    },
    {
      icon: <Code2 className="w-5 h-5 text-violet-400" />,
      title: 'Target-Specific C++ Firmware',
      desc: 'Produces non-blocking, interrupt-safe C++ firmware configured to the exact assigned pin mapping and peripheral peripheral buses.',
    },
    {
      icon: <Activity className="w-5 h-5 text-amber-400" />,
      title: 'Trace-Based Behavioral Simulation',
      desc: 'Validates system logic through multi-channel trace simulations, testing threshold breaches, sensor excursions, and state transitions.',
    },
    {
      icon: <Globe className="w-5 h-5 text-purple-400" />,
      title: 'Dual-AI Provider Architecture',
      desc: 'Choose between 100% private Local AI (Ollama) or official high-reasoning Meta Model API with HMAC-signed stateless trial authentication.',
    },
  ];

  const categories = ['all', 'mcu', 'sensor', 'display', 'actuator', 'passive'];
  const filteredCatalog = selectedCatalogCategory === 'all'
    ? catalog
    : catalog.filter((c) => c.category === selectedCatalogCategory);

  return (
    <div className="min-h-screen bg-[#0A0A0D] text-zinc-100 flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* Hero Section */}
      <section className="relative pt-16 pb-20 px-6 overflow-hidden border-b border-[#1E1E2A]">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#16162215_1px,transparent_1px),linear-gradient(to_bottom,#16162215_1px,transparent_1px)] bg-[size:32px_32px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center space-y-6 relative z-10">
          <div className="inline-flex items-center space-x-2 bg-[#14141E] border border-indigo-500/30 rounded-full px-4 py-1.5 text-xs font-mono text-indigo-300 shadow-xl shadow-indigo-500/10">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>AUTONOMOUS EMBEDDED SYSTEM SYNTHESIS · HARDWARE-AWARE AI</span>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white font-mono leading-tight max-w-4xl mx-auto">
            Transform Natural Language into <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-300 to-indigo-200">
              Production-Grade Embedded Circuits
            </span>
          </h1>

          <p className="text-sm sm:text-base text-zinc-400 max-w-2xl mx-auto leading-relaxed font-sans">
            CircuitMind synthesizes system requirements into verified pin assignments,
            KiCad netlists, deterministic C++ firmware, and actionable electrical validation across
            ESP32, RP2040, and Arduino architectures.
          </p>

          <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
            <button
              onClick={onStartNew}
              className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-500 text-white font-mono text-xs font-bold px-7 py-3.5 rounded-xl shadow-xl shadow-indigo-600/30 transition-all transform hover:-translate-y-0.5"
            >
              <span>START NEW PROJECT</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <a
              href="#catalog"
              className="flex items-center space-x-2 bg-[#151520] hover:bg-[#1E1E2C] border border-[#2B2B3D] text-zinc-300 font-mono text-xs font-medium px-6 py-3.5 rounded-xl transition-colors"
            >
              <span>Explore 28 Hardware Components</span>
            </a>
          </div>

          {/* Quick Metrics Bar */}
          <div className="pt-8 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto text-left font-mono">
            <div className="bg-[#12121A] border border-[#22222E] p-3.5 rounded-lg">
              <div className="text-lg font-bold text-white">28 Parts</div>
              <div className="text-[11px] text-zinc-400">Verified Component Library</div>
            </div>
            <div className="bg-[#12121A] border border-[#22222E] p-3.5 rounded-lg">
              <div className="text-lg font-bold text-emerald-400">0 Hallucinations</div>
              <div className="text-[11px] text-zinc-400">Deterministic Pin Allocation</div>
            </div>
            <div className="bg-[#12121A] border border-[#22222E] p-3.5 rounded-lg">
              <div className="text-lg font-bold text-indigo-400">Dual AI</div>
              <div className="text-[11px] text-zinc-400">Local Ollama + Meta AI</div>
            </div>
            <div className="bg-[#12121A] border border-[#22222E] p-3.5 rounded-lg">
              <div className="text-lg font-bold text-purple-400">KiCad Ready</div>
              <div className="text-[11px] text-zinc-400">Industry Standard Netlist</div>
            </div>
          </div>
        </div>
      </section>

      {/* Interactive IDE Showcase Preview */}
      <section id="demo" className="py-20 px-6 max-w-7xl mx-auto w-full">
        <div className="text-center space-y-3 mb-10">
          <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
            Interactive IDE Workspace
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
            Inspect Every Level of Your Physical Design
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
            Switch between views to see how requirements are synthesized into canvas topology,
            netlists, BOMs, assembly steps, and DRC validation.
          </p>
        </div>

        {/* IDE Mockup Window */}
        <div className="bg-[#0E0E14] border border-[#282838] rounded-2xl shadow-2xl overflow-hidden">
          {/* Window Titlebar */}
          <div className="bg-[#14141E] border-b border-[#222232] px-4 py-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full bg-red-500/80" />
              <div className="w-3 h-3 rounded-full bg-amber-500/80" />
              <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
              <span className="ml-3 font-mono text-xs text-zinc-300 font-medium">
                CircuitMind IDE — ESP32 Ultrasonic Security System (Rev 3)
              </span>
            </div>

            <div className="flex items-center space-x-2 text-[10px] font-mono">
              <span className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 flex items-center gap-1">
                <Check className="w-3 h-3" /> DRC: PASS (0 Errors)
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-950/60 border border-indigo-800/60 text-indigo-300">
                ESP32-WROOM-32D
              </span>
            </div>
          </div>

          {/* IDE Sub-Header Tabs */}
          <div className="bg-[#111118] border-b border-[#222232] px-4 flex space-x-2 overflow-x-auto text-xs font-mono">
            {[
              { id: 'canvas', label: 'Circuit Canvas' },
              { id: 'netlist', label: 'Netlist (KiCad)' },
              { id: 'bom', label: 'Bill of Materials' },
              { id: 'guide', label: 'Assembly Guide' },
              { id: 'drc', label: 'Electrical DRC' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveDemoTab(tab.id as any)}
                className={`py-3 px-3.5 border-b-2 font-medium transition-colors whitespace-nowrap ${
                  activeDemoTab === tab.id
                    ? 'border-indigo-500 text-white bg-[#181822]'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* IDE Main Canvas Screen */}
          <div className="p-6 bg-[#0A0A0E] min-h-[420px] font-mono text-xs">
            {activeDemoTab === 'canvas' && (
              <div className="space-y-6">
                <div className="flex items-center justify-between text-zinc-400 text-[11px] pb-2 border-b border-[#1E1E2A]">
                  <span>Visual Component Topology & Pin Assignments</span>
                  <span className="text-indigo-400">Interactive Node Graph</span>
                </div>

                {/* Circuit Nodes Visual Simulation */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                  {/* Microcontroller Node */}
                  <div className="bg-[#13131C] border border-indigo-500/40 rounded-xl p-4 shadow-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-white font-bold">U1 · ESP32-WROOM-32D</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-indigo-950 text-indigo-300 rounded border border-indigo-800/50">MCU</span>
                    </div>
                    <div className="space-y-1.5 text-[10px] text-zinc-300">
                      <div className="flex justify-between py-0.5 px-2 bg-[#1A1A26] rounded">
                        <span className="text-zinc-400">Pin 23 (GPIO5)</span>
                        <span className="text-emerald-400 font-semibold">TRIG_PIN → S1:TRIG</span>
                      </div>
                      <div className="flex justify-between py-0.5 px-2 bg-[#1A1A26] rounded">
                        <span className="text-zinc-400">Pin 24 (GPIO18)</span>
                        <span className="text-emerald-400 font-semibold">ECHO_DIV → R2:OUT</span>
                      </div>
                      <div className="flex justify-between py-0.5 px-2 bg-[#1A1A26] rounded">
                        <span className="text-zinc-400">Pin 25 (GPIO19)</span>
                        <span className="text-amber-400 font-semibold">BUZZER_PWM → BZ1:POS</span>
                      </div>
                      <div className="flex justify-between py-0.5 px-2 bg-[#1A1A26] rounded">
                        <span className="text-zinc-400">Pin 26 (GPIO21)</span>
                        <span className="text-cyan-400 font-semibold">I2C_SDA → DISP1:SDA</span>
                      </div>
                      <div className="flex justify-between py-0.5 px-2 bg-[#1A1A26] rounded">
                        <span className="text-zinc-400">Pin 29 (GPIO22)</span>
                        <span className="text-cyan-400 font-semibold">I2C_SCL → DISP1:SCL</span>
                      </div>
                    </div>
                  </div>

                  {/* Sensor & Voltage Divider */}
                  <div className="space-y-4">
                    <div className="bg-[#13131C] border border-[#2A2A3C] rounded-xl p-4 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">S1 · HC-SR04 Ultrasonic</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-zinc-800 text-zinc-300 rounded">Sensor (5V)</span>
                      </div>
                      <div className="text-[10px] text-zinc-300 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">VCC</span>
                          <span className="text-red-400">5V Power Rail</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">TRIG</span>
                          <span className="text-emerald-400">GPIO5</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">ECHO (5V)</span>
                          <span className="text-amber-400">→ Voltage Divider (R1:1k/R2:2k)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#13131C] border border-emerald-500/30 rounded-xl p-3 shadow-lg text-[10px] space-y-1">
                      <div className="text-emerald-400 font-bold flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5" /> 5V → 3.3V Logic Protection
                      </div>
                      <p className="text-zinc-400 text-[10px] font-sans">
                        Echo output attenuated via 1kΩ / 2kΩ voltage divider. ESP32 input receives safe 3.33V signal.
                      </p>
                    </div>
                  </div>

                  {/* Output Peripherals */}
                  <div className="space-y-4">
                    <div className="bg-[#13131C] border border-[#2A2A3C] rounded-xl p-4 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">DISP1 · SSD1306 OLED</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-cyan-950 text-cyan-300 rounded border border-cyan-800/40">I2C (0x3C)</span>
                      </div>
                      <div className="text-[10px] text-zinc-300 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">SDA</span>
                          <span className="text-cyan-400">GPIO21 (4.7kΩ pull-up verified)</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">SCL</span>
                          <span className="text-cyan-400">GPIO22 (4.7kΩ pull-up verified)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-[#13131C] border border-[#2A2A3C] rounded-xl p-4 shadow-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-white font-bold">BZ1 · Active Buzzer</span>
                        <span className="text-[10px] px-1.5 py-0.5 bg-amber-950 text-amber-300 rounded border border-amber-800/40">Alarm</span>
                      </div>
                      <div className="text-[10px] text-zinc-300 flex justify-between">
                        <span className="text-zinc-500">POS</span>
                        <span className="text-amber-400">GPIO19 (PWM Alert)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeDemoTab === 'netlist' && (
              <div className="bg-[#08080C] p-4 rounded-xl border border-[#1E1E28] font-mono text-[11px] text-zinc-300 space-y-2 overflow-x-auto">
                <div className="text-zinc-500">// Generated KiCad PCB Netlist</div>
                <div>(export (version D)</div>
                <div className="pl-4 text-purple-300">(components</div>
                <div className="pl-8 text-zinc-300">(comp (ref U1) (value ESP32-WROOM-32D) (footprint RF_Module:ESP32-WROOM-32))</div>
                <div className="pl-8 text-zinc-300">(comp (ref S1) (value HC-SR04) (footprint Sensor_Ultrasonic:HC-SR04))</div>
                <div className="pl-8 text-zinc-300">(comp (ref R1) (value 1k) (footprint Resistor_THT:R_Axial_DIN0207_L6.3mm))</div>
                <div className="pl-8 text-zinc-300">(comp (ref R2) (value 2k) (footprint Resistor_THT:R_Axial_DIN0207_L6.3mm))</div>
                <div className="pl-8 text-zinc-300">(comp (ref BZ1) (value BUZZER_ACTIVE) (footprint Buzzer_Beeper:Buzzer_12x9.5RM7.6))</div>
                <div className="pl-4 text-purple-300">)</div>
                <div className="pl-4 text-emerald-300">(nets</div>
                <div className="pl-8 text-zinc-300">(net (code 1) (name "NET_GND") (node (ref U1) (pin 1)) (node (ref S1) (pin 4)) (node (ref R2) (pin 2)))</div>
                <div className="pl-8 text-zinc-300">(net (code 2) (name "NET_5V") (node (ref U1) (pin 19)) (node (ref S1) (pin 1)))</div>
                <div className="pl-8 text-zinc-300">(net (code 3) (name "NET_TRIG") (node (ref U1) (pin 23)) (node (ref S1) (pin 2)))</div>
                <div className="pl-8 text-zinc-300">(net (code 4) (name "NET_ECHO_ATTENUATED") (node (ref U1) (pin 24)) (node (ref R1) (pin 2)) (node (ref R2) (pin 1)))</div>
                <div className="pl-4 text-emerald-300">)</div>
                <div>)</div>
              </div>
            )}

            {activeDemoTab === 'bom' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead>
                    <tr className="border-b border-[#222232] text-zinc-400">
                      <th className="py-2.5 px-3">Ref</th>
                      <th className="py-2.5 px-3">Part Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Voltage / Specs</th>
                      <th className="py-2.5 px-3">Package / Footprint</th>
                      <th className="py-2.5 px-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1A1A24] text-zinc-300">
                    <tr>
                      <td className="py-2 px-3 text-indigo-400 font-bold">U1</td>
                      <td className="py-2 px-3 font-semibold text-white">ESP32-WROOM-32D</td>
                      <td className="py-2 px-3 text-zinc-400">Microcontroller</td>
                      <td className="py-2 px-3">3.3V Logic, 240MHz Dual-Core</td>
                      <td className="py-2 px-3 text-zinc-500">Module (38-pin DIP)</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-indigo-400 font-bold">S1</td>
                      <td className="py-2 px-3 font-semibold text-white">HC-SR04</td>
                      <td className="py-2 px-3 text-zinc-400">Ultrasonic Sensor</td>
                      <td className="py-2 px-3">5V VCC, 40kHz Transducer</td>
                      <td className="py-2 px-3 text-zinc-500">4-pin 2.54mm Header</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-indigo-400 font-bold">DISP1</td>
                      <td className="py-2 px-3 font-semibold text-white">SSD1306 0.96" OLED</td>
                      <td className="py-2 px-3 text-zinc-400">Display</td>
                      <td className="py-2 px-3">3.3V-5V, I2C 128x64</td>
                      <td className="py-2 px-3 text-zinc-500">4-pin I2C Header</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-indigo-400 font-bold">BZ1</td>
                      <td className="py-2 px-3 font-semibold text-white">Active Piezo Buzzer</td>
                      <td className="py-2 px-3 text-zinc-400">Actuator</td>
                      <td className="py-2 px-3">3.3V-5V, 2.3kHz Tone</td>
                      <td className="py-2 px-3 text-zinc-500">THT Radial 7.6mm</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3 text-indigo-400 font-bold">R1, R2</td>
                      <td className="py-2 px-3 font-semibold text-white">1kΩ, 2kΩ Resistors</td>
                      <td className="py-2 px-3 text-zinc-400">Passive (Divider)</td>
                      <td className="py-2 px-3">1/4W 5% Carbon Film</td>
                      <td className="py-2 px-3 text-zinc-500">Axial 6.3mm THT</td>
                      <td className="py-2 px-3 text-emerald-400 font-semibold">Verified</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}

            {activeDemoTab === 'guide' && (
              <div className="space-y-4">
                <div className="text-zinc-400 text-xs">Step-by-step breadboard hookup instructions:</div>
                <div className="space-y-2">
                  {[
                    { step: '1', title: 'Mount ESP32 Development Board across center breadboard trench (Pin 1 at row 1).' },
                    { step: '2', title: 'Connect USB 5V (VIN) rail to breadboard Red Power Rail (+) and GND to Blue Rail (-).' },
                    { step: '3', title: 'Connect HC-SR04 VCC to 5V rail and GND to breadboard GND rail.' },
                    { step: '4', title: 'Wire ESP32 GPIO5 to HC-SR04 TRIG pin.' },
                    { step: '5', title: 'Form voltage divider: HC-SR04 ECHO pin to R1 (1kΩ). Connect other end of R1 to R2 (2kΩ) and ESP32 GPIO18. Connect other end of R2 to GND.' },
                    { step: '6', title: 'Wire SSD1306 OLED: VDD to 3.3V, GND to GND, SDA to GPIO21, SCL to GPIO22.' },
                    { step: '7', title: 'Wire Active Buzzer positive lead to GPIO19 and negative lead to GND.' },
                  ].map((s) => (
                    <div key={s.step} className="flex items-start space-x-3 bg-[#13131C] p-3 rounded-lg border border-[#222232]">
                      <span className="w-5 h-5 rounded-full bg-indigo-900/60 text-indigo-300 border border-indigo-700/50 flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5">
                        {s.step}
                      </span>
                      <span className="text-zinc-200 text-xs font-sans">{s.title}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeDemoTab === 'drc' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>All Electrical Design Rules Satisfied (0 Errors, 0 Warnings)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div className="bg-[#12121A] border border-[#222232] p-3 rounded-lg space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Strapping Pin Isolation
                    </div>
                    <p className="text-zinc-400 text-[11px] font-sans">
                      GPIO 0, 2, 12, 15 are unassigned to prevent flash boot failures and strapping conflicts.
                    </p>
                  </div>
                  <div className="bg-[#12121A] border border-[#222232] p-3 rounded-lg space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Voltage Level Matching
                    </div>
                    <p className="text-zinc-400 text-[11px] font-sans">
                      5V HC-SR04 ECHO signal protected by 1kΩ/2kΩ divider. All inputs within 3.3V limits.
                    </p>
                  </div>
                  <div className="bg-[#12121A] border border-[#222232] p-3 rounded-lg space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Input-Only Pin Compliance
                    </div>
                    <p className="text-zinc-400 text-[11px] font-sans">
                      GPIO 34-39 are reserved strictly for high-impedance inputs; outputs mapped to GPIO 5, 18, 19.
                    </p>
                  </div>
                  <div className="bg-[#12121A] border border-[#222232] p-3 rounded-lg space-y-1">
                    <div className="text-white font-semibold flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5 text-emerald-400" /> Bus Integrity & Pull-Ups
                    </div>
                    <p className="text-zinc-400 text-[11px] font-sans">
                      I2C bus (GPIO 21/22) validated with verified pull-up resistors for 400kHz operation.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* 6-Stage Autonomous Engineering Pipeline */}
      <section id="workflow" className="py-20 px-6 bg-[#0E0E14] border-y border-[#1E1E2A]">
        <div className="max-w-7xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
              Deterministic Methodology
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
              The 6-Stage Hardware Synthesis Pipeline
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
              From natural language to validated physical circuits. AI reasons about requirements;
              deterministic rules guarantee electrical safety.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {workflowSteps.map((step) => (
              <div
                key={step.num}
                className="bg-[#12121B] border border-[#242436] hover:border-indigo-500/50 p-6 rounded-xl space-y-3 transition-all relative group"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-extrabold text-indigo-500/40 group-hover:text-indigo-400 transition-colors">
                    {step.num}
                  </span>
                  <span className="text-[10px] font-mono uppercase bg-indigo-950/60 border border-indigo-800/40 text-indigo-300 px-2 py-0.5 rounded">
                    {step.tag}
                  </span>
                </div>
                <h3 className="font-mono text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                  {step.title}
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  {step.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Capabilities Grid */}
      <section id="capabilities" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-12">
        <div className="text-center space-y-3">
          <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
            Engineered For Hardware Professionals
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
            Built with Engineering Integrity
          </h2>
          <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
            Not a prompt playground or chatbot wrapper. CircuitMind is a verifiable hardware compiler.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {capabilities.map((cap, idx) => (
            <div
              key={idx}
              className="bg-[#111118] border border-[#222230] hover:border-[#383850] p-6 rounded-xl space-y-3.5 transition-colors"
            >
              <div className="w-10 h-10 rounded-lg bg-[#181824] border border-[#2C2C3E] flex items-center justify-center">
                {cap.icon}
              </div>
              <h3 className="font-mono text-sm font-bold text-white">{cap.title}</h3>
              <p className="text-xs text-zinc-400 font-sans leading-relaxed">{cap.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Dual AI Provider Architecture Comparison */}
      <section id="dual-ai" className="py-20 px-6 bg-[#0C0C12] border-y border-[#1E1E2A]">
        <div className="max-w-6xl mx-auto space-y-12">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
              Hybrid Inference Infrastructure
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
              Dual-AI Provider Architecture
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-2xl mx-auto">
              CircuitMind isolates AI reasoning from hardware synthesis. Select the right model engine
              for your security and latency requirements.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
            {/* Local AI Engine */}
            <div className="bg-[#12121A] border border-emerald-500/30 rounded-2xl p-7 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-emerald-950/60 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
                      <Cpu className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white">Local AI (Ollama)</h3>
                      <span className="text-[10px] font-mono text-emerald-400">Default Production Engine</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-emerald-950 text-emerald-300 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    Unlimited
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Runs locally on your development machine or private server via Ollama.
                  Provides zero-leakage, offline engineering synthesis with infinite prompt iterations.
                </p>

                <div className="space-y-2 text-xs font-mono text-zinc-300 pt-2 border-t border-[#20202E]">
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>100% Private, zero telemetry or cloud logging</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Unlimited design iterations & Copilot queries</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Full support for deepseek-r1, llama3, qwen2.5</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Works fully offline without internet connection</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0E] p-3 rounded-lg border border-[#20202E] text-[11px] font-mono text-zinc-400">
                Active Endpoint: <span className="text-emerald-400">http://localhost:11434</span>
              </div>
            </div>

            {/* Meta Model API Engine */}
            <div className="bg-[#12121A] border border-purple-500/30 rounded-2xl p-7 space-y-5 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2.5">
                    <div className="w-8 h-8 rounded-lg bg-purple-950/60 border border-purple-700/60 flex items-center justify-center text-purple-300">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="font-mono text-sm font-bold text-white">Meta AI (Official API)</h3>
                      <span className="text-[10px] font-mono text-purple-300">Cloud Model Reasoning</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono uppercase bg-purple-950 text-purple-300 border border-purple-800/60 px-2 py-0.5 rounded-full">
                    1 Trial / Identity
                  </span>
                </div>

                <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                  Integrates with official Meta Model API for ultra-high-parameter hardware reasoning.
                  Enforces strict stateless single-trial authorization using HMAC-signed cookies.
                </p>

                <div className="space-y-2 text-xs font-mono text-zinc-300 pt-2 border-t border-[#20202E]">
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-purple-400" />
                    <span>Official Meta endpoint: https://api.meta.ai/v1</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-purple-400" />
                    <span>Stateless HMAC-SHA256 browser trial protection</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-purple-400" />
                    <span>Zero database storage: 100% cryptographic token</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Check className="w-3.5 h-3.5 text-purple-400" />
                    <span>In-process race condition guard & rate limiting</span>
                  </div>
                </div>
              </div>

              <div className="bg-[#0A0A0E] p-3 rounded-lg border border-[#20202E] text-[11px] font-mono text-zinc-400">
                Model: <span className="text-purple-300">meta-ai/llama-3.3-70b-instruct</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Verified Hardware Catalog Section */}
      <section id="catalog" className="py-20 px-6 max-w-7xl mx-auto w-full space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
              Curated Component Database
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
              Supported Hardware Catalog ({catalog.length} Components)
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl">
              Every part in the catalog contains verified pin counts, logic levels, packages,
              and peripheral bus definitions.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono bg-[#111118] p-1 rounded-lg border border-[#222230]">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCatalogCategory(cat)}
                className={`px-3 py-1.5 rounded-md uppercase transition-colors whitespace-nowrap ${
                  selectedCatalogCategory === cat
                    ? 'bg-indigo-600 text-white font-semibold'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Catalog Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {filteredCatalog.slice(0, 16).map((comp) => (
            <div
              key={comp.catalog_id}
              className="bg-[#111118] border border-[#222230] hover:border-[#383850] p-4 rounded-xl space-y-2.5 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase bg-[#181824] text-zinc-400 px-2 py-0.5 rounded border border-[#2A2A3A]">
                  {comp.category}
                </span>
                <span className="text-[10px] font-mono text-indigo-400">
                  {comp.pins?.length || 0} pins
                </span>
              </div>

              <div>
                <h4 className="font-mono text-xs font-bold text-white truncate">{comp.name}</h4>
                <p className="text-[10px] text-zinc-400 font-sans line-clamp-2 mt-1">
                  {comp.description}
                </p>
              </div>

              <div className="pt-2 border-t border-[#1C1C28] flex items-center justify-between text-[10px] font-mono text-zinc-500">
                <span>{comp.part_number || comp.manufacturer || 'Standard'}</span>
                <span className="text-emerald-400">
                  {comp.supply_voltage_min === comp.supply_voltage_max
                    ? `${comp.supply_voltage_min}V`
                    : `${comp.supply_voltage_min}V - ${comp.supply_voltage_max}V`}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick-Start Verified Designs */}
      <section className="py-20 px-6 bg-[#0E0E14] border-t border-[#1E1E2A]">
        <div className="max-w-6xl mx-auto space-y-10">
          <div className="text-center space-y-3">
            <div className="text-xs font-mono text-indigo-400 uppercase tracking-widest font-semibold">
              Ready-To-Synthesize Blueprints
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold font-mono text-white">
              Launch Verified Quick-Start Projects
            </h2>
            <p className="text-xs sm:text-sm text-zinc-400 max-w-xl mx-auto">
              Synthesize a complete verified circuit in 1-click. Inspect the generated graph,
              netlist, and firmware immediately.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sampleProjects.map((sample) => (
              <div
                key={sample.title}
                onClick={() => onSelectSample(sample.prompt, sample.title)}
                className="bg-[#12121A] hover:bg-[#161622] border border-[#242436] hover:border-indigo-500/60 p-6 rounded-2xl cursor-pointer transition-all space-y-4 group flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono uppercase bg-indigo-950/60 text-indigo-300 px-2 py-0.5 rounded border border-indigo-800/40">
                      {sample.badge}
                    </span>
                    <ArrowRight className="w-4 h-4 text-zinc-500 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                  </div>

                  <h3 className="font-mono text-sm font-bold text-white group-hover:text-indigo-300 transition-colors">
                    {sample.title}
                  </h3>

                  <p className="text-xs text-zinc-400 font-sans leading-relaxed">
                    {sample.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-[#1E1E2C] text-[10px] font-mono space-y-1 text-zinc-400">
                  <div>MCU: <span className="text-white">{sample.mcu}</span></div>
                  <div>Parts: <span className="text-zinc-500">{sample.components}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Engineering Footer */}
      <footer className="bg-[#08080C] border-t border-[#1A1A26] py-12 px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs font-mono text-zinc-500">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
              <Cpu className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white">CircuitMind</span>
            <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded border border-zinc-700">v1.0.0</span>
            <span>· Verifiable Embedded Hardware Synthesis</span>
          </div>

          <div className="flex flex-wrap items-center gap-6">
            <span>Dual-AI Architecture (Local + Meta)</span>
            <span>Zero-DB Stateless Security</span>
            <span>KiCad Compatible</span>
          </div>

          <div className="text-zinc-600">
            © 2026 CircuitMind Systems. MIT License.
          </div>
        </div>
      </footer>
    </div>
  );
};
