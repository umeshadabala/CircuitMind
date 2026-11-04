import React, { useState } from 'react';
import { ArrowLeft, Sparkles, CheckCircle2, Loader2 } from 'lucide-react';

interface NewProjectViewProps {
  initialPrompt?: string;
  initialName?: string;
  onBack: () => void;
  onSubmit: (name: string, prompt: string, targetBoard: string) => Promise<void>;
}

export const NewProjectView: React.FC<NewProjectViewProps> = ({
  initialPrompt = '',
  initialName = '',
  onBack,
  onSubmit,
}) => {
  const [name, setName] = useState(initialName || '');
  const [prompt, setPrompt] = useState(initialPrompt || '');
  const [targetBoard, setTargetBoard] = useState('AUTO');
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStage, setCurrentStage] = useState(0);

  const stages = [
    'Stage A: Parsing Requirements via Ollama (gpt-oss:120b-cloud)',
    'Stage B: Autonomous Controller Selection & Architecture Planning',
    'Stage C: Resolving Components against Curated Catalog with Traceability',
    'Stage D: Executing Deterministic Multi-Board Pin Allocation',
    'Stage E: Generating Explicit Nets & Power Rails',
    'Stage F: Running Deterministic Electrical DRC Validation',
    'Stage G: Deriving Firmware, BOM & Multi-Channel Simulation Bundles',
  ];

  const handleStart = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isProcessing) return;

    setIsProcessing(true);

    // Simulate progress visualizer
    const interval = setInterval(() => {
      setCurrentStage((prev) => {
        if (prev < stages.length - 1) return prev + 1;
        return prev;
      });
    }, 400);

    try {
      await onSubmit(name, prompt, targetBoard);
    } finally {
      clearInterval(interval);
      setIsProcessing(false);
    }
  };

  return (
    <div className="py-8 px-6 max-w-3xl mx-auto space-y-6">
      <button
        onClick={onBack}
        disabled={isProcessing}
        className="flex items-center space-x-2 text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900 font-mono text-xs transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>BACK TO DASHBOARD</span>
      </button>

      <div className="space-y-1">
        <h1 className="font-mono text-xl font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-wide">
          CREATE VERIFIED EMBEDDED PROJECT
        </h1>
        <p className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans">
          Describe the physical system behavior, sensors, and actuators. CircuitMind synthesizes a canonical graph, allocates conflict-free GPIOs, and runs electrical DRC.
        </p>
      </div>

      <form
        onSubmit={handleStart}
        className="border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-xl p-6 bg-[#101720] dark:bg-[#101720] bg-white shadow-xl space-y-5 transition-colors"
      >
        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-700">Project Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={isProcessing}
            placeholder="e.g. Quadcopter Obstacle Sensing, Environmental Telemetry Badge, Traffic Controller..."
            className="w-full bg-[#151F2B] dark:bg-[#151F2B] bg-slate-50 border border-[#25332F] dark:border-[#25332F] border-slate-300 rounded-lg px-3.5 py-2 text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 placeholder-[#96A6A3]/60 focus:outline-none focus:border-[#356B62] focus:ring-1 focus:ring-[#356B62]"
            required
          />
        </div>

        <div className="space-y-1.5 font-sans">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-700">Hardware Controller & Architecture</label>
            <span className="text-[10px] font-mono text-[#5B9B8D]">Autonomous selection default</span>
          </div>
          <select
            value={targetBoard}
            onChange={(e) => setTargetBoard(e.target.value)}
            disabled={isProcessing}
            className="w-full bg-[#151F2B] dark:bg-[#151F2B] bg-slate-50 border border-[#25332F] dark:border-[#25332F] border-slate-300 rounded-lg px-3 py-2 text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 focus:outline-none focus:border-[#356B62] font-mono"
          >
            <option value="AUTO">⚡ Autonomous (CircuitMind selects controller based on requirements)</option>
            <option value="STM32F405-FC">STM32F405 Flight Controller (ARM Cortex-M4F 168MHz, 4x DShot, PX4 SITL)</option>
            <option value="ESP32-DEVKIT-V1">ESP32 NodeMCU DevKit V1 (Xtensa 240MHz, 3.3V logic, Wi-Fi/BLE, Wokwi)</option>
            <option value="ARDUINO-UNO-R3">Arduino Uno R3 (ATmega328P 16MHz, native 5V logic, Wokwi)</option>
            <option value="RPI-PICO">Raspberry Pi Pico (RP2040 dual-core 133MHz, 8x PIO state machines, Wokwi)</option>
          </select>
        </div>

        <div className="space-y-1.5 font-sans">
          <label className="block text-xs font-mono text-[#96A6A3] dark:text-[#96A6A3] text-slate-700">
            Natural Language Engineering Requirements
          </label>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            rows={5}
            disabled={isProcessing}
            placeholder="Describe the physical system behavior, sensors, actuators, and flight/computing constraints. (e.g. 'Build an autonomous obstacle avoidance quadcopter drone with flight controller and ultrasonic rangefinder' or 'Build a WiFi temperature telemetry logger with DS18B20 and OLED display')..."
            className="w-full bg-[#151F2B] dark:bg-[#151F2B] bg-slate-50 border border-[#25332F] dark:border-[#25332F] border-slate-300 rounded-lg p-3 text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 placeholder-[#96A6A3]/60 focus:outline-none focus:border-[#356B62] focus:ring-1 focus:ring-[#356B62] font-sans leading-relaxed"
            required
          />
          <div className="text-[11px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 font-mono">
            Tip: Specify physical inputs, sensors, outputs, and control loops. The engineering planner will autonomously choose matching components and controllers.
          </div>
        </div>

        {/* Pipeline Progress Stages */}
        {isProcessing && (
          <div className="border border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#090D12] dark:bg-[#090D12] bg-slate-50 p-4 rounded-xl space-y-2.5 font-mono text-xs">
            <div className="flex items-center space-x-2 text-[#5B9B8D] font-bold">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Executing Requirements-to-Design Pipeline...</span>
            </div>

            <div className="space-y-1.5 pt-2">
              {stages.map((stg, idx) => {
                const isDone = idx < currentStage;
                const isCurrent = idx === currentStage;

                return (
                  <div
                    key={idx}
                    className={`flex items-center space-x-2 text-[11px] ${
                      isDone
                        ? 'text-emerald-400'
                        : isCurrent
                        ? 'text-[#5B9B8D] font-semibold'
                        : 'text-[#96A6A3]/50 dark:text-[#96A6A3]/50 text-slate-400'
                    }`}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                    ) : isCurrent ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
                    ) : (
                      <div className="w-3.5 h-3.5 rounded-full border border-[#25332F] dark:border-[#25332F] border-slate-300 flex-shrink-0" />
                    )}
                    <span className="truncate">{stg}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={isProcessing || !prompt.trim()}
            className="flex items-center space-x-2 bg-[#356B62] hover:bg-[#2A564E] text-white px-6 py-2.5 rounded-lg font-mono text-xs font-bold transition-all shadow-md shadow-[#356B62]/20 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isProcessing ? 'SYNTHESIZING DESIGN...' : 'GENERATE HARDWARE DESIGN'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
