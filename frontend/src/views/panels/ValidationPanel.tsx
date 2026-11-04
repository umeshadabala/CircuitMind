import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  HelpCircle,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
} from 'lucide-react';
import { Project } from '../../types';

interface ValidationPanelProps {
  project: Project;
  onRefreshValidation: () => Promise<void>;
  isValidating: boolean;
  onAutoRepair?: () => Promise<void>;
  isRepairing?: boolean;
  onNavigateToComponent?: (instanceId: string) => void;
  onNavigateToNet?: (netId: string) => void;
}

export const ValidationPanel: React.FC<ValidationPanelProps> = ({
  project,
  onRefreshValidation,
  isValidating,
  onAutoRepair,
  isRepairing = false,
  onNavigateToComponent,
  onNavigateToNet,
}) => {
  const [filter, setFilter] = useState<'ALL' | 'ERROR' | 'WARNING' | 'INFO'>('ALL');
  const [showUnsupported, setShowUnsupported] = useState(false);

  const report = project.validation_report;
  const findings = report?.findings || [];

  const errorCount = findings.filter((f) => f.severity === 'ERROR').length;
  const warnCount = findings.filter((f) => f.severity === 'WARNING').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  const filteredFindings = findings.filter((f) => {
    if (filter === 'ALL') return true;
    return f.severity === filter;
  });

  const implementedChecks = [
    'Single-Driver Power Integrity (Short-circuit prevention across 3.3V, 5V, GND)',
    'Voltage Domain Compatibility (3.3V GPIO over-voltage detection vs 5V sensors)',
    'Microcontroller Pin Capability Bounds (PWM, ADC, I2C, SPI hardware mapping)',
    'Missing Current-Limiting Resistors (LED & diode forward-bias burn-out prevention)',
    'Pull-up Resistor Presence (I2C SDA/SCL bus termination validation)',
    'Floating Input Detection (Unterminated digital inputs prone to spurious switching)',
    'Power Rail Fanout & Current Budgeting (Excessive load warning against onboard LDOs)',
  ];

  const unsupportedChecks = [
    'Dynamic Signal Integrity & High-Speed Impedance Matching (Requires 3D EM simulation)',
    'Thermal Dissipation & Junction Temperature Gradients (Requires CFD convection modeling)',
    'Radiated Electromagnetic Interference (EMI) & Shielding Compliance (Requires anechoic chamber verification)',
    'Mechanical Vibration & Structural Resonance Fatigue (Multirotor frame resonance damping requires physical logging)',
    'AC Mains Dielectric Breakdown & Galvanic Creepage Distances (Mains safety requires physical PCB clearance inspection)',
    'Component Tolerance Drift & Monte Carlo Aging Analysis (Worst-case temperature coefficient variance not modeled)',
  ];

  return (
    <div className="h-full flex flex-col bg-[#090D12] dark:bg-[#090D12] bg-[#F8FAFC] text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 transition-colors">
      {/* Header */}
      <div className="p-3.5 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-white flex items-center justify-between gap-3 flex-wrap z-10 transition-colors">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-[#5B9B8D]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 flex items-center space-x-2">
              <span>Design Rule Check (DRC)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#5B9B8D] border border-[#25332F] dark:border-[#25332F] border-slate-300">
                Rev {report?.revision || project.revision}
              </span>
            </h2>
            <div className="text-[11px] text-[#96A6A3] font-mono">
              Electrical rule checker & topological verification · {implementedChecks.length} rules active
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {findings.length > 0 && onAutoRepair && (
            <button
              onClick={onAutoRepair}
              disabled={isRepairing}
              className="flex items-center space-x-1.5 bg-[#356B62] hover:bg-[#2A564E] text-white px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors disabled:opacity-50 shadow-md shadow-[#356B62]/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>{isRepairing ? 'Repairing...' : 'Auto-Repair Graph'}</span>
            </button>
          )}

          <button
            onClick={onRefreshValidation}
            disabled={isValidating}
            className="flex items-center space-x-1.5 bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 hover:bg-[#1F2D3D] dark:hover:bg-[#1F2D3D] hover:bg-slate-200 border border-[#25332F] dark:border-[#25332F] border-slate-300 text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Validating...' : 'Re-run DRC'}</span>
          </button>
        </div>
      </div>

      {/* Status Summary Banner */}
      <div className="p-4 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720]/70 dark:bg-[#101720]/70 bg-slate-50 flex flex-wrap items-center justify-between gap-4 transition-colors">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              report?.valid
                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60'
                : 'bg-rose-950/50 text-rose-400 border border-rose-800/60'
            }`}
          >
            {report?.valid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-mono flex items-center space-x-2">
              <span>{report?.valid ? 'STATIC VALIDATION PASSED' : 'DRC FINDINGS DETECTED'}</span>
            </div>
            <div className="text-xs text-[#96A6A3] max-w-xl font-sans mt-0.5">
              {report?.valid
                ? `Zero violations detected across ${implementedChecks.length} implemented rules. (Note: physical bench testing is still required for unsupported dynamic checks).`
                : `${errorCount} critical error(s) and ${warnCount} warning(s) require attention.`}
            </div>
          </div>
        </div>

        {/* Severity Filter Tabs */}
        <div className="flex items-center space-x-1.5 font-mono text-xs flex-wrap gap-y-1">
          <button
            onClick={() => setFilter('ALL')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'ALL'
                ? 'bg-[#356B62] text-white border-[#356B62] font-bold'
                : 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#96A6A3] border-[#25332F] dark:border-[#25332F] border-slate-300 hover:text-[#F1F5F4]'
            }`}
          >
            ALL ({findings.length})
          </button>
          <button
            onClick={() => setFilter('ERROR')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'ERROR'
                ? 'bg-rose-900 text-rose-200 border-rose-700 font-bold'
                : 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-rose-400 border-[#25332F] dark:border-[#25332F] border-slate-300 hover:text-rose-200'
            }`}
          >
            ERRORS ({errorCount})
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={`px-2.5 py-1 rounded-lg border transition-colors ${
              filter === 'WARNING'
                ? 'bg-amber-900 text-amber-200 border-amber-700 font-bold'
                : 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-amber-400 border-[#25332F] dark:border-[#25332F] border-slate-300 hover:text-amber-200'
            }`}
          >
            WARNINGS ({warnCount})
          </button>
          {infoCount > 0 && (
            <button
              onClick={() => setFilter('INFO')}
              className={`px-2.5 py-1 rounded-lg border transition-colors ${
                filter === 'INFO'
                  ? 'bg-sky-900 text-sky-200 border-sky-700 font-bold'
                  : 'bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-sky-400 border-[#25332F] dark:border-[#25332F] border-slate-300'
              }`}
            >
              INFO ({infoCount})
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Unsupported Checks Accordion Callout */}
        <div className="border border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-white rounded-xl overflow-hidden transition-colors">
          <button
            onClick={() => setShowUnsupported(!showUnsupported)}
            className="w-full p-3 bg-[#151F2B]/40 dark:bg-[#151F2B]/40 bg-slate-50 hover:bg-[#151F2B] flex items-center justify-between text-xs font-mono text-[#96A6A3] hover:text-[#F1F5F4] transition-colors"
          >
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-[#5B9B8D]" />
              <span className="font-semibold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800">
                Audited Checks Scope: {implementedChecks.length} Implemented · {unsupportedChecks.length} Unsupported by Static Analysis
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span>{showUnsupported ? 'Hide' : 'Inspect Scope'}</span>
              {showUnsupported ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showUnsupported && (
            <div className="p-4 border-t border-[#25332F] dark:border-[#25332F] border-slate-200 space-y-3 font-sans text-xs bg-[#090D12]/40 dark:bg-[#090D12]/40 bg-slate-50">
              <div>
                <div className="font-mono text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                  ✓ Implemented Deterministic Checks ({implementedChecks.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 font-mono text-[11px] text-[#96A6A3]">
                  {implementedChecks.map((chk, i) => (
                    <div key={i} className="flex items-center space-x-1.5 py-0.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#25332F]/60 dark:border-[#25332F]/60 border-slate-200">
                <div className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                  ⚠ Checks Not Supported by Static Graph Analysis ({unsupportedChecks.length})
                </div>
                <div className="space-y-1 text-[#96A6A3]">
                  {unsupportedChecks.map((uchk, i) => (
                    <div key={i} className="flex items-start space-x-2 py-0.5">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span>{uchk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Findings List */}
        <div className="space-y-3">
          {filteredFindings.length === 0 ? (
            <div className="p-8 text-center text-[#96A6A3] font-mono text-xs border border-dashed border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-xl">
              <ShieldCheck className="w-8 h-8 mx-auto mb-2 text-emerald-400 opacity-60" />
              <div>No validation findings match filter: <strong>{filter}</strong></div>
              <div className="text-[11px] text-zinc-500 mt-1">
                All {implementedChecks.length} active static checks verified clean for this revision.
              </div>
            </div>
          ) : (
            filteredFindings.map((finding, idx) => (
              <div
                key={`${finding.rule_id}-${idx}`}
                className={`border rounded-xl p-4 space-y-2.5 font-sans ${
                  finding.severity === 'ERROR'
                    ? 'border-rose-900/60 bg-rose-950/20'
                    : finding.severity === 'WARNING'
                    ? 'border-amber-900/60 bg-amber-950/20'
                    : 'border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-white'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`font-mono text-xs font-bold px-2 py-0.5 rounded border ${
                        finding.severity === 'ERROR'
                          ? 'bg-rose-950 text-rose-300 border-rose-800'
                          : finding.severity === 'WARNING'
                          ? 'bg-amber-950 text-amber-300 border-amber-800'
                          : 'bg-sky-950 text-sky-300 border-sky-800'
                      }`}
                    >
                      {finding.rule_id}
                    </span>
                    <span className="font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 text-xs">{finding.title}</span>
                  </div>

                  <span className="font-mono text-[10px] uppercase text-[#96A6A3]">{finding.severity}</span>
                </div>

                <div className="text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 leading-relaxed">{finding.message}</div>

                {finding.remedy && (
                  <div className="bg-[#151F2B]/80 dark:bg-[#151F2B]/80 bg-slate-50 border border-[#25332F] dark:border-[#25332F] border-slate-200 rounded-lg p-2.5 text-xs text-[#5B9B8D] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#5B9B8D] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">Actionable Remedy: </span>
                      {finding.remedy}
                    </div>
                  </div>
                )}

                {/* Cross-Canvas & Netlist Interactive Badges */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1 text-[11px] font-mono">
                  {finding.affected_instances.map((id) => (
                    <button
                      key={id}
                      onClick={() => onNavigateToComponent && onNavigateToComponent(id)}
                      className="bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 hover:bg-[#25332F] text-zinc-200 hover:text-white dark:text-slate-700 dark:hover:text-slate-900 border border-[#25332F] dark:border-[#25332F] border-slate-300 px-2 py-0.5 rounded transition-colors flex items-center space-x-1"
                      title={`Inspect ${id} on Circuit Canvas`}
                    >
                      <span>Component: {id}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-[#5B9B8D]" />
                    </button>
                  ))}

                  {finding.affected_pins.map((pin) => (
                    <span key={pin} className="bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#96A6A3] border border-[#25332F] dark:border-[#25332F] border-slate-300 px-1.5 py-0.5 rounded">
                      Pin: {pin}
                    </span>
                  ))}

                  {finding.affected_nets.map((net) => (
                    <button
                      key={net}
                      onClick={() => onNavigateToNet && onNavigateToNet(net)}
                      className="bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 hover:bg-[#25332F] text-[#5B9B8D] hover:text-[#F1F5F4] border border-[#25332F] dark:border-[#25332F] border-slate-300 px-2 py-0.5 rounded transition-colors flex items-center space-x-1"
                      title={`Inspect ${net} on Canvas / Netlist`}
                    >
                      <span>Net: {net}</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
