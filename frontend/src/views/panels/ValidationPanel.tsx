import React, { useState } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  ExternalLink,
  Info,
  HelpCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react';
import { Project, Severity } from '../../types';

interface ValidationPanelProps {
  project: Project;
  onRefreshValidation: () => void;
  isValidating?: boolean;
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
  isRepairing,
  onNavigateToComponent,
  onNavigateToNet,
}) => {
  const [filter, setFilter] = useState<Severity | 'ALL' | 'UNSUPPORTED'>('ALL');
  const [showUnsupported, setShowUnsupported] = useState<boolean>(false);
  const report = project.validation_report;
  const findings = report?.findings || [];

  const errorCount = findings.filter((f) => f.severity === 'ERROR').length;
  const warnCount = findings.filter((f) => f.severity === 'WARNING').length;
  const infoCount = findings.filter((f) => f.severity === 'INFO').length;

  const filteredFindings = findings.filter((f) => {
    if (filter === 'ALL') return true;
    return f.severity === filter;
  });

  const implementedChecks = report?.implemented_checks || [
    'DRC-E001 (Power Ground Short)',
    'DRC-E002 (Missing Power)',
    'DRC-E003 (Missing Ground)',
    'DRC-E004 (Invalid Pin Reference)',
    'DRC-E005 (GPIO Contention)',
    'DRC-E006 (Input Only As Output)',
    'DRC-E007 (Voltage Overstress)',
    'DRC-E008 (Unsupported Part)',
    'DRC-E009 (Missing Critical Subsystem)',
    'DRC-W001 (Missing Current Limiter)',
    'DRC-W002 (Strapping Pin Used)',
    'DRC-W003 (Missing Pullup)',
    'DRC-W004 (Floating Net)',
    'DRC-W005 (Untraceable Component)',
    'DRC-I001 (Stale Artifact)',
  ];

  const unsupportedChecks = report?.unsupported_checks || [
    'High-Frequency RF Impedance Matching & Return Loss (50Ω trace geometry not verified by static netlist)',
    'Continuous Dynamic Thermal Dissipation & Junction Temperature (Requires thermal FEA under airflow load)',
    'Radiated Electromagnetic Interference (EMI) & Shielding Compliance (Requires anechoic chamber verification)',
    'Mechanical Vibration & Structural Resonance Fatigue (Multirotor frame resonance damping requires physical logging)',
    'AC Mains Dielectric Breakdown & Galvanic Creepage Distances (Mains safety requires physical PCB clearance inspection)',
    'Component Tolerance Drift & Monte Carlo Aging Analysis (Worst-case temperature coefficient variance not modeled)',
  ];

  return (
    <div className="h-full flex flex-col bg-[#09090B] text-[#FAFAFA]">
      {/* Header */}
      <div className="p-3.5 border-b border-[#2A2A35] bg-[#111116] flex items-center justify-between gap-3 flex-wrap z-10">
        <div className="flex items-center space-x-3">
          <ShieldCheck className="w-5 h-5 text-[#A78BFA]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
              <span>Design Rule Check (DRC)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#18181F] text-[#A78BFA] border border-[#2A2A35]">
                Rev {report?.revision || project.revision}
              </span>
            </h2>
            <div className="text-[11px] text-[#A1A1AA] font-mono">
              Electrical rule checker & topological verification · {implementedChecks.length} rules active
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {findings.length > 0 && onAutoRepair && (
            <button
              onClick={onAutoRepair}
              disabled={isRepairing}
              className="flex items-center space-x-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50 shadow-md shadow-[#7C3AED]/20"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRepairing ? 'animate-spin' : ''}`} />
              <span>{isRepairing ? 'Repairing...' : 'Auto-Repair Graph'}</span>
            </button>
          )}

          <button
            onClick={onRefreshValidation}
            disabled={isValidating}
            className="flex items-center space-x-1.5 bg-[#18181F] hover:bg-[#2A2A35] border border-[#2A2A35] text-[#FAFAFA] px-3 py-1.5 rounded text-xs font-mono transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            <span>{isValidating ? 'Validating...' : 'Re-run DRC'}</span>
          </button>
        </div>
      </div>

      {/* Status Summary Banner */}
      <div className="p-4 border-b border-[#2A2A35] bg-[#111116]/60 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center ${
              report?.valid
                ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/60'
                : 'bg-rose-950/50 text-rose-400 border border-rose-800/60'
            }`}
          >
            {report?.valid ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
          </div>

          <div>
            <div className="text-sm font-bold text-white font-mono flex items-center space-x-2">
              <span>{report?.valid ? 'STATIC VALIDATION PASSED' : 'DRC FINDINGS DETECTED'}</span>
            </div>
            <div className="text-xs text-[#A1A1AA] max-w-xl font-sans mt-0.5">
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
            className={`px-2.5 py-1 rounded border transition-colors ${
              filter === 'ALL'
                ? 'bg-[#7C3AED] text-white border-[#7C3AED] font-bold'
                : 'bg-[#18181F] text-[#A1A1AA] border-[#2A2A35] hover:text-white'
            }`}
          >
            ALL ({findings.length})
          </button>
          <button
            onClick={() => setFilter('ERROR')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filter === 'ERROR'
                ? 'bg-rose-900 text-rose-200 border-rose-700 font-bold'
                : 'bg-[#18181F] text-rose-400 border-[#2A2A35] hover:text-rose-200'
            }`}
          >
            ERRORS ({errorCount})
          </button>
          <button
            onClick={() => setFilter('WARNING')}
            className={`px-2.5 py-1 rounded border transition-colors ${
              filter === 'WARNING'
                ? 'bg-amber-900 text-amber-200 border-amber-700 font-bold'
                : 'bg-[#18181F] text-amber-400 border-[#2A2A35] hover:text-amber-200'
            }`}
          >
            WARNINGS ({warnCount})
          </button>
          {infoCount > 0 && (
            <button
              onClick={() => setFilter('INFO')}
              className={`px-2.5 py-1 rounded border transition-colors ${
                filter === 'INFO'
                  ? 'bg-sky-900 text-sky-200 border-sky-700 font-bold'
                  : 'bg-[#18181F] text-sky-400 border-[#2A2A35]'
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
        <div className="border border-[#2A2A35] bg-[#111116] rounded-lg overflow-hidden">
          <button
            onClick={() => setShowUnsupported(!showUnsupported)}
            className="w-full p-3 bg-[#18181F]/40 hover:bg-[#18181F] flex items-center justify-between text-xs font-mono text-[#A1A1AA] hover:text-white transition-colors"
          >
            <div className="flex items-center space-x-2">
              <HelpCircle className="w-4 h-4 text-[#A78BFA]" />
              <span className="font-semibold text-zinc-300">
                Audited Checks Scope: {implementedChecks.length} Implemented · {unsupportedChecks.length} Unsupported by Static Analysis
              </span>
            </div>
            <div className="flex items-center space-x-1">
              <span>{showUnsupported ? 'Hide' : 'Inspect Scope'}</span>
              {showUnsupported ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
            </div>
          </button>

          {showUnsupported && (
            <div className="p-4 border-t border-[#2A2A35] space-y-3 font-sans text-xs bg-[#0E0E12]">
              <div>
                <div className="font-mono text-[11px] font-bold text-emerald-400 uppercase tracking-wider mb-1.5">
                  ✓ Implemented Deterministic Checks ({implementedChecks.length})
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-1 font-mono text-[11px] text-zinc-300">
                  {implementedChecks.map((chk, i) => (
                    <div key={i} className="flex items-center space-x-1.5 py-0.5">
                      <span className="text-emerald-400 font-bold">✓</span>
                      <span>{chk}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 border-t border-[#2A2A35]/60">
                <div className="font-mono text-[11px] font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                  ⚠ Checks Not Supported by Static Graph Analysis ({unsupportedChecks.length})
                </div>
                <div className="space-y-1 text-zinc-400">
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
            <div className="p-8 text-center text-[#A1A1AA] font-mono text-xs border border-dashed border-[#2A2A35] rounded-lg">
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
                className={`border rounded-lg p-4 space-y-2.5 font-sans ${
                  finding.severity === 'ERROR'
                    ? 'border-rose-900/60 bg-rose-950/20'
                    : finding.severity === 'WARNING'
                    ? 'border-amber-900/60 bg-amber-950/20'
                    : 'border-[#2A2A35] bg-[#111116]'
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
                    <span className="font-bold text-white text-xs">{finding.title}</span>
                  </div>

                  <span className="font-mono text-[10px] uppercase text-zinc-400">{finding.severity}</span>
                </div>

                <div className="text-xs text-[#FAFAFA] leading-relaxed">{finding.message}</div>

                {finding.remedy && (
                  <div className="bg-[#111116]/80 border border-[#2A2A35] rounded p-2.5 text-xs text-[#A78BFA] flex items-start gap-2">
                    <AlertCircle className="w-3.5 h-3.5 text-[#A78BFA] flex-shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold text-white">Actionable Remedy: </span>
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
                      className="bg-[#18181F] hover:bg-[#2A2A35] text-zinc-200 hover:text-white border border-[#2A2A35] px-2 py-0.5 rounded transition-colors flex items-center space-x-1"
                      title={`Inspect ${id} on Circuit Canvas`}
                    >
                      <span>Component: {id}</span>
                      <ExternalLink className="w-2.5 h-2.5 text-[#A78BFA]" />
                    </button>
                  ))}

                  {finding.affected_pins.map((pin) => (
                    <span key={pin} className="bg-[#18181F] text-zinc-400 border border-[#2A2A35] px-1.5 py-0.5 rounded">
                      Pin: {pin}
                    </span>
                  ))}

                  {finding.affected_nets.map((net) => (
                    <button
                      key={net}
                      onClick={() => onNavigateToNet && onNavigateToNet(net)}
                      className="bg-[#18181F] hover:bg-[#2A2A35] text-[#A78BFA] hover:text-white border border-[#2A2A35] px-2 py-0.5 rounded transition-colors flex items-center space-x-1"
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
