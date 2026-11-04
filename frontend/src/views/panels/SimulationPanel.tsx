import React, { useState } from 'react';
import {
  Activity,
  CheckCircle,
  Clock,
  Download,
  ExternalLink,
  FileCode,
  Info,
  Play,
  Server,
  ShieldCheck,
  Terminal,
  Wrench,
  XCircle,
} from 'lucide-react';
import { Project, SimulationArtifact } from '../../types';

interface SimulationPanelProps {
  project: Project;
  onRunSimulation: (scenario?: string) => Promise<SimulationArtifact>;
}

export const SimulationPanel: React.FC<SimulationPanelProps> = ({ project, onRunSimulation }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'channels' | 'trace' | 'wokwi_bundle' | 'board_decision'>('channels');
  const [latestSim, setLatestSim] = useState<SimulationArtifact | null>(
    project.simulation_history && project.simulation_history.length > 0 ? project.simulation_history[0] : null
  );

  const handleRun = async () => {
    setIsRunning(true);
    try {
      const res = await onRunSimulation();
      setLatestSim(res);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PASSED':
      case 'COMPLETED':
        return (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border font-semibold bg-emerald-950/40 text-emerald-300 border-emerald-800/50">
            {status}
          </span>
        );
      case 'EXPORT_READY':
        return (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border font-semibold bg-sky-950/40 text-sky-300 border-sky-800/50">
            EXPORT READY
          </span>
        );
      case 'UNTESTED':
      case 'NOT_APPLICABLE':
      case 'NOT_CONFIGURED':
        return (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border font-semibold bg-zinc-800/40 text-zinc-400 border-zinc-700/50">
            {status.replace('_', ' ')}
          </span>
        );
      case 'WARNING':
        return (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border font-semibold bg-amber-950/40 text-amber-300 border-amber-800/50">
            WARNING
          </span>
        );
      default:
        return (
          <span className="font-mono text-[10px] px-2 py-0.5 rounded border font-semibold bg-rose-950/40 text-rose-300 border-rose-800/50">
            {status}
          </span>
        );
    }
  };

  const downloadFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col bg-[#09090B]">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A35] bg-[#111116] flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Activity className="w-5 h-5 text-[#A78BFA]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white">Unified Multi-Channel Simulation</h2>
            <div className="text-[11px] text-[#A1A1AA] font-mono">
              Static DRC · Firmware compilation · Wokwi circuit · PX4 SITL · Physical verification
            </div>
          </div>
        </div>

        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center space-x-1.5 bg-[#7C3AED] hover:bg-[#6D28D9] text-white px-3.5 py-1.5 rounded text-xs font-mono font-semibold transition-colors disabled:opacity-50 shadow-md shadow-[#7C3AED]/20"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-pulse' : ''}`} />
          <span>{isRunning ? 'Evaluating Channels...' : 'Execute Simulation Run'}</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[#2A2A35] bg-[#111116] text-xs font-mono px-4">
        <button
          onClick={() => setActiveTab('channels')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'channels'
              ? 'border-[#7C3AED] text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Verification Channels ({latestSim?.channels?.length || 5})
        </button>
        <button
          onClick={() => setActiveTab('trace')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'trace'
              ? 'border-[#7C3AED] text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Behavioral Trace ({latestSim?.steps?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('wokwi_bundle')}
          className={`py-2 px-3 border-b-2 transition-colors ${
            activeTab === 'wokwi_bundle'
              ? 'border-[#7C3AED] text-white font-bold'
              : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          Wokwi Export Package
        </button>
        {project.board_decision && (
          <button
            onClick={() => setActiveTab('board_decision')}
            className={`py-2 px-3 border-b-2 transition-colors ${
              activeTab === 'board_decision'
                ? 'border-[#7C3AED] text-white font-bold'
                : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            Board Decision Rationale
          </button>
        )}
      </div>

      {/* Disclosure Banner */}
      <div className="bg-[#111116] border-b border-[#2A2A35] px-4 py-2 flex items-start space-x-2 text-xs text-[#A1A1AA]">
        <Info className="w-4 h-4 text-sky-400 flex-shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-zinc-200">Honest Engineering Evidence: </span>
          <span>
            CircuitMind separates static validation, firmware compilation, cycle simulation (Wokwi), flight dynamics (PX4 SITL),
            and physical hardware. Hardware is never marked as tested unless physical bench tests occurred.
          </span>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {activeTab === 'channels' && (
          <div className="space-y-3">
            {latestSim?.channels && latestSim.channels.length > 0 ? (
              latestSim.channels.map((chan, idx) => (
                <div
                  key={idx}
                  className="bg-[#111116] border border-[#2A2A35] rounded-lg p-3.5 space-y-2 hover:border-[#3E3E4F] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2.5">
                      <div className="font-mono text-xs font-bold text-white uppercase">{chan.tool_name}</div>
                      <span className="text-[10px] text-zinc-500 font-mono">[{chan.channel}]</span>
                    </div>
                    {getStatusBadge(chan.status)}
                  </div>

                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">{chan.detail}</p>

                  {chan.evidence && Object.keys(chan.evidence).length > 0 && (
                    <div className="bg-[#09090B] p-2 rounded border border-[#2A2A35]/60 font-mono text-[11px] text-[#A78BFA]">
                      <span className="text-zinc-500 text-[10px] block uppercase mb-0.5">Evidence Metadata:</span>
                      <pre className="text-zinc-400 font-mono text-[10px] whitespace-pre-wrap">
                        {JSON.stringify(chan.evidence, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="bg-[#111116] border border-[#2A2A35] rounded-lg p-6 text-center space-y-2">
                <ShieldCheck className="w-8 h-8 text-[#7C3AED] mx-auto opacity-60" />
                <div className="text-sm font-bold text-white font-mono">Ready to Evaluate All 5 Engineering Channels</div>
                <p className="text-xs text-zinc-400 font-sans max-w-md mx-auto">
                  Click 'Execute Simulation Run' above to generate and inspect static DRC findings, compilation reports,
                  cycle-accurate Wokwi diagrams, and flight software parameter bundles.
                </p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'trace' && (
          <div className="space-y-4">
            {latestSim && latestSim.steps && latestSim.steps.length > 0 ? (
              <div className="border border-[#2A2A35] rounded-lg overflow-hidden bg-[#111116]">
                <div className="bg-[#18181F] px-4 py-2.5 border-b border-[#2A2A35] font-mono text-xs font-bold text-[#A1A1AA]">
                  Stimulus-Response Sequence ({latestSim.steps.length} Steps)
                </div>

                <div className="divide-y divide-[#2A2A35]/60 font-sans text-xs">
                  {latestSim.steps.map((step) => (
                    <div key={step.step_number} className="p-3.5 hover:bg-[#18181F]/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center space-x-2">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#18181F] text-[#A78BFA] border border-[#2A2A35]">
                            Step {step.step_number} · +{step.timestamp_ms}ms
                          </span>
                          <span className="font-semibold text-white">{step.action}</span>
                        </div>

                        <span
                          className={`font-mono text-[11px] px-2 py-0.5 rounded border font-semibold ${
                            step.passed
                              ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                              : 'bg-rose-950/40 text-rose-300 border-rose-800/50'
                          }`}
                        >
                          {step.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>

                      <div className="text-xs text-[#FAFAFA] mb-2 leading-relaxed">{step.detail}</div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 font-mono text-[11px] bg-[#09090B] p-2.5 rounded border border-[#2A2A35]/60">
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase">Input Stimuli</div>
                          <div className="text-[#A78BFA] truncate">{JSON.stringify(step.inputs)}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase">Expected State</div>
                          <div className="text-zinc-300 truncate">{JSON.stringify(step.expected_state)}</div>
                        </div>
                        <div>
                          <div className="text-zinc-500 text-[10px] uppercase">Actual State</div>
                          <div className="text-emerald-400 truncate">{JSON.stringify(step.actual_state)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-zinc-500 font-mono text-xs">No trace steps available. Run a simulation to evaluate stimuli.</div>
            )}
          </div>
        )}

        {activeTab === 'wokwi_bundle' && (
          <div className="space-y-4">
            <div className="bg-[#111116] border border-[#2A2A35] rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-mono text-xs font-bold text-white flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-[#A78BFA]" />
                    <span>Wokwi Embedded Circuit Configuration Bundle</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                    Standards-compliant diagram.json and wokwi.toml generated from canonical project graph.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      downloadFile(
                        'diagram.json',
                        JSON.stringify(latestSim?.diagram_json || {}, null, 2)
                      )
                    }
                    className="flex items-center gap-1.5 bg-[#18181F] hover:bg-[#252530] text-zinc-200 border border-[#2A2A35] px-2.5 py-1.5 rounded font-mono text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>diagram.json</span>
                  </button>
                  {latestSim?.wokwi_toml && (
                    <button
                      onClick={() => downloadFile('wokwi.toml', latestSim.wokwi_toml!)}
                      className="flex items-center gap-1.5 bg-[#18181F] hover:bg-[#252530] text-zinc-200 border border-[#2A2A35] px-2.5 py-1.5 rounded font-mono text-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>wokwi.toml</span>
                    </button>
                  )}
                </div>
              </div>

              {latestSim?.diagram_json ? (
                <div className="space-y-3">
                  <div className="bg-[#09090B] rounded border border-[#2A2A35] p-3">
                    <div className="text-[10px] font-mono text-zinc-400 uppercase mb-1">
                      diagram.json preview ({latestSim.diagram_json.parts?.length || 0} parts,{' '}
                      {latestSim.diagram_json.connections?.length || 0} connections):
                    </div>
                    <pre className="font-mono text-[10px] text-zinc-300 max-h-64 overflow-auto whitespace-pre-wrap">
                      {JSON.stringify(latestSim.diagram_json, null, 2)}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="text-zinc-500 font-mono text-xs text-center py-6">
                  Execute a simulation run to compile and inspect the Wokwi diagram package.
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'board_decision' && project.board_decision && (
          <div className="space-y-4">
            <div className="bg-[#111116] border border-[#7C3AED]/40 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-[#A78BFA] uppercase tracking-wider block">
                    Autonomous Engineering Decision
                  </span>
                  <h3 className="font-mono text-sm font-bold text-white mt-0.5">
                    Selected Controller: {project.board_decision.selected_board}
                  </h3>
                  <div className="text-xs text-zinc-400 font-mono">
                    Architecture Category: {project.board_decision.architecture_category}
                  </div>
                </div>

                <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#7C3AED]/20 text-[#A78BFA] border border-[#7C3AED]/50">
                  OPTIMAL MATCH
                </span>
              </div>

              <div className="bg-[#18181F] p-3 rounded border border-[#2A2A35] text-xs text-zinc-200 leading-relaxed font-sans">
                <span className="font-bold text-white block mb-1">Engineering Rationale:</span>
                {project.board_decision.selection_rationale}
              </div>

              {/* Candidates Evaluation Table */}
              {project.board_decision.evaluated_candidates && project.board_decision.evaluated_candidates.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-mono font-bold text-[#A1A1AA] uppercase">
                    Controller Candidate Matrix
                  </div>
                  <div className="divide-y divide-[#2A2A35] border border-[#2A2A35] rounded-lg overflow-hidden bg-[#18181F]">
                    {project.board_decision.evaluated_candidates.map((cand) => (
                      <div key={cand.board_id} className="p-3 text-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="font-mono font-bold text-white">
                            {cand.name} ({cand.board_id})
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[11px] text-zinc-400">Score: {cand.score.toFixed(1)}</span>
                            {cand.feasibility === 'FEASIBLE' ? (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/40 text-emerald-300 border border-emerald-800/40">
                                FEASIBLE
                              </span>
                            ) : (
                              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-rose-950/40 text-rose-300 border border-rose-800/40">
                                {cand.feasibility}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="text-[11px] text-zinc-400 font-sans">
                          {cand.architecture}
                        </div>

                        {cand.pros && cand.pros.length > 0 && (
                          <div className="text-[11px] text-emerald-400/90 font-mono">
                            + {cand.pros.join('; ')}
                          </div>
                        )}
                        {cand.cons && cand.cons.length > 0 && (
                          <div className="text-[11px] text-amber-400/80 font-mono">
                            - {cand.cons.join('; ')}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trade-offs */}
              {project.board_decision.trade_offs && project.board_decision.trade_offs.length > 0 && (
                <div className="space-y-1.5">
                  <div className="text-xs font-mono font-bold text-[#A1A1AA] uppercase">Identified Trade-offs</div>
                  <ul className="list-disc list-inside text-xs text-zinc-300 space-y-1 bg-[#18181F] p-3 rounded border border-[#2A2A35]">
                    {project.board_decision.trade_offs.map((t, i) => (
                      <li key={i}>{t}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
