import React, { useState } from 'react';
import { Code2, Copy, Check, Info, AlertCircle } from 'lucide-react';
import { Project } from '../../types';

interface FirmwarePanelProps {
  project: Project;
}

export const FirmwarePanel: React.FC<FirmwarePanelProps> = ({ project }) => {
  const [copied, setCopied] = useState(false);
  const firmware = project.firmware;

  const handleCopy = () => {
    if (!firmware?.source_code) return;
    navigator.clipboard.writeText(firmware.source_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isStale = firmware && firmware.revision < project.revision;

  return (
    <div className="h-full flex flex-col bg-[#090D12]">
      {/* Header */}
      <div className="p-4 border-b border-[#25332F] bg-[#101720] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Code2 className="w-5 h-5 text-[#5B9B8D]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white">Generated Embedded Firmware</h2>
            <div className="text-[11px] text-[#96A6A3] font-mono flex items-center gap-2">
              <span>Target: {project.target_board} (C++/Arduino)</span>
              <span>·</span>
              <span>Revision {firmware?.revision || 1}</span>
              {isStale && (
                <span className="text-amber-400 bg-amber-950/40 border border-amber-800/50 px-1.5 py-0.2 rounded text-[10px]">
                  STALE REVISION
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-[#151F2B] hover:bg-[#25332F] border border-[#25332F] text-[#F1F5F4] px-3 py-1 rounded text-xs font-mono transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Source'}</span>
          </button>
        </div>
      </div>

      {/* Compiler / Toolchain Disclosure Alert */}
      <div className="bg-[#101720] border-b border-[#25332F] px-4 py-2.5 flex items-start space-x-2.5 text-xs text-[#96A6A3]">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-200">Honest Build Status: </span>
          <span>{firmware?.compilation_status || 'Generated from canonical graph; no local host compiler was invoked.'} </span>
          <span className="text-zinc-500">
            Copy into Arduino IDE or PlatformIO with ESP32 board support to flash physical hardware.
          </span>
        </div>
      </div>

      {/* Code Editor view */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-[#25332F] rounded-lg overflow-hidden bg-[#101720] font-mono text-xs">
          <div className="bg-[#151F2B] px-4 py-2 border-b border-[#25332F] text-zinc-400 text-[11px] flex justify-between items-center">
            <span>firmware_main.ino</span>
            <span>{firmware?.source_code.split('\n').length || 0} lines</span>
          </div>
          <pre className="p-4 text-[#F1F5F4] leading-relaxed overflow-x-auto selection:bg-[#356B62]">
            {firmware?.source_code || '// No firmware generated for current project state.'}
          </pre>
        </div>
      </div>
    </div>
  );
};

