import React, { useState, useEffect } from 'react';
import {
  X,
  Send,
  Sparkles,
  Zap,
  CheckCircle2,
  Cpu,
  Globe,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';
import { Project, MetaTrialStatus, AIProvider, HealthResponse } from '../../types';
import { api } from '../../api/client';

interface CopilotDrawerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (
    message: string,
    provider: AIProvider
  ) => Promise<{ reply: string; actions_executed: string[]; provider?: string }>;
  health?: HealthResponse | null;
}

interface Message {
  sender: 'user' | 'copilot';
  text: string;
  actions?: string[];
  provider?: string;
  timestamp: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  project,
  isOpen,
  onClose,
  onSendMessage,
  health,
}) => {
  const [provider, setProvider] = useState<AIProvider>(health?.active_provider || 'local');

  useEffect(() => {
    if (health?.active_provider) {
      setProvider(health.active_provider);
    }
  }, [health?.active_provider]);
  const [trialStatus, setTrialStatus] = useState<MetaTrialStatus | null>(null);
  const [isLoadingTrial, setIsLoadingTrial] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string>('');

  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'copilot',
      text: `Hello! I am CircuitMind Copilot, configured with ${project.name} (Rev ${project.revision}). I can explain electrical rules, suggest components, or execute mutations on your circuit graph.`,
      provider: 'local',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  // Fetch trial status when drawer is opened or provider is changed to a cloud provider
  useEffect(() => {
    if (isOpen) {
      fetchTrialStatus(provider);
    }
  }, [isOpen, provider]);

  const fetchTrialStatus = async (targetProvider: AIProvider = provider) => {
    if (targetProvider === 'local') {
      setTrialStatus(null);
      return;
    }
    try {
      setIsLoadingTrial(true);
      const status = targetProvider === 'nvidia'
        ? await api.getNvidiaTrialStatus()
        : await api.getMetaTrialStatus();
      setTrialStatus(status);
    } catch (err) {
      console.error(`Failed to fetch ${targetProvider} trial status`, err);
    } finally {
      setIsLoadingTrial(false);
    }
  };

  if (!isOpen) return null;

  const isCloudProvider = provider === 'nvidia' || provider === 'meta';
  const isTrialConsumed = isCloudProvider && trialStatus && !trialStatus.trial_available;

  const handleInitiateSend = (textToSend?: string) => {
    const msg = (textToSend || input).trim();
    if (!msg || isSubmitting) return;

    if (isCloudProvider) {
      if (trialStatus && !trialStatus.trial_available) {
        // Trial consumed or unconfigured
        return;
      }
      // Require user confirmation before consuming the single trial
      setPendingMessage(msg);
      setShowConfirmModal(true);
      return;
    }

    // Local AI sends directly
    executeSend(msg, 'local');
  };

  const executeSend = async (msg: string, activeProvider: AIProvider) => {
    setShowConfirmModal(false);
    setPendingMessage('');

    const userMsg: Message = {
      sender: 'user',
      text: msg,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSubmitting(true);

    try {
      const res = await onSendMessage(msg, activeProvider);
      const botMsg: Message = {
        sender: 'copilot',
        text: res.reply,
        actions: res.actions_executed,
        provider: res.provider || activeProvider,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMsg]);

      // If a cloud provider was used, refresh trial status to reflect consumed state
      if (activeProvider !== 'local') {
        fetchTrialStatus(activeProvider);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: `Request failed: ${err.message}`,
          provider: activeProvider,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
      if (activeProvider !== 'local') {
        fetchTrialStatus(activeProvider);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#0E0E12] border-l border-[#262631] shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-[#262631] flex items-center justify-between bg-[#15151B]">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#6366F1]/20 border border-[#6366F1]/40 flex items-center justify-center text-[#818CF8]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-white tracking-wide">CircuitMind Copilot</div>
            <div className="text-[10px] text-zinc-400 font-mono">Multi-Engine Hardware Assistant</div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-zinc-400 hover:text-white p-1 rounded hover:bg-[#262631] transition-colors"
          title="Close Copilot"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Provider Selector Switcher */}
      <div className="px-3 py-2.5 bg-[#121217] border-b border-[#262631]">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 font-semibold">
            Inference Provider
          </span>
          {isCloudProvider && trialStatus && (
            <span
              className={`text-[9px] font-mono px-2 py-0.5 rounded-full border ${
                trialStatus.trial_available
                  ? provider === 'nvidia'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/60'
                    : 'bg-purple-950/60 text-purple-300 border-purple-800/60'
                  : 'bg-zinc-800 text-zinc-400 border-zinc-700'
              }`}
            >
              {trialStatus.trial_available ? '1 Trial Available' : 'Trial Consumed'}
            </span>
          )}
          {provider === 'local' && (
            <span className="text-[9px] font-mono text-emerald-400 bg-emerald-950/50 px-2 py-0.5 rounded-full border border-emerald-800/50">
              Unlimited
            </span>
          )}
        </div>

        <div className="grid grid-cols-3 gap-1 p-1 bg-[#0A0A0D] rounded-lg border border-[#22222B]">
          <button
            type="button"
            onClick={() => setProvider('local')}
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-md text-[10px] font-mono transition-all ${
              provider === 'local'
                ? 'bg-[#1E1E28] text-white font-medium shadow-sm border border-[#3E3E52]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Cpu className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="truncate">Local (Ollama)</span>
          </button>

          <button
            type="button"
            onClick={() => setProvider('nvidia')}
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-md text-[10px] font-mono transition-all ${
              provider === 'nvidia'
                ? 'bg-[#1E1E28] text-white font-medium shadow-sm border border-[#3E3E52]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Zap className="w-3 h-3 text-emerald-400 flex-shrink-0" />
            <span className="truncate">NVIDIA (Muse 30B)</span>
          </button>

          <button
            type="button"
            onClick={() => setProvider('meta')}
            className={`flex items-center justify-center space-x-1 py-1.5 px-1.5 rounded-md text-[10px] font-mono transition-all ${
              provider === 'meta'
                ? 'bg-[#1E1E28] text-white font-medium shadow-sm border border-[#3E3E52]'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Globe className="w-3 h-3 text-purple-400 flex-shrink-0" />
            <span className="truncate">Meta AI (API)</span>
          </button>
        </div>
      </div>

      {/* Cloud Provider Notice / Status Banner */}
      {provider === 'nvidia' && (
        <div className="px-3 py-2 bg-[#101A16] border-b border-[#1E382A] text-[11px]">
          {trialStatus?.configured === false ? (
            <div className="flex items-start space-x-2 text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">NVIDIA NIM not configured on server</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">
                  Set NVIDIA_API_KEY in .env on the backend to activate Muse Glimmer 30B inference.
                </p>
              </div>
            </div>
          ) : isTrialConsumed ? (
            <div className="space-y-1.5">
              <div className="flex items-start space-x-2 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Single-Use Trial Consumed</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Your trial for cloud inference has been used for this browser session.
                    Local AI (Ollama) is 100% active and unlimited.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProvider('local')}
                className="w-full mt-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 py-1 px-2 rounded text-[10px] font-mono flex items-center justify-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Switch to Unlimited Local AI</span>
              </button>
            </div>
          ) : (
            <div className="flex items-start space-x-2 text-emerald-200">
              <Zap className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-white">NVIDIA NIM Meta Model Trial</span>
                <p className="text-[10px] text-emerald-300/80 leading-snug">
                  Meta's Muse Glimmer 30B ({trialStatus?.model || 'meta/muse-glimmer-30b'}) via NVIDIA NIM.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {provider === 'meta' && (
        <div className="px-3 py-2 bg-[#171422] border-b border-[#2C2442] text-[11px]">
          {trialStatus?.configured === false ? (
            <div className="flex items-start space-x-2 text-amber-300">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Meta AI not configured on server</p>
                <p className="text-[10px] text-amber-400/80 mt-0.5">
                  Set MODEL_API_KEY on the backend to activate Meta AI inference.
                </p>
              </div>
            </div>
          ) : isTrialConsumed ? (
            <div className="space-y-1.5">
              <div className="flex items-start space-x-2 text-zinc-300">
                <ShieldCheck className="w-4 h-4 text-zinc-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-white">Single-Use Trial Consumed</p>
                  <p className="text-[10px] text-zinc-400 leading-snug">
                    Your trial for cloud inference has been used for this browser session.
                    Local AI (Ollama) is 100% active and unlimited.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setProvider('local')}
                className="w-full mt-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 py-1 px-2 rounded text-[10px] font-mono flex items-center justify-center space-x-1 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Switch to Unlimited Local AI</span>
              </button>
            </div>
          ) : (
            <div className="flex items-start space-x-2 text-purple-200">
              <Sparkles className="w-3.5 h-3.5 text-purple-400 flex-shrink-0 mt-0.5" />
              <div>
                <span className="font-medium text-white">Official Meta Model API Trial</span>
                <p className="text-[10px] text-purple-300/80 leading-snug">
                  Official Meta API inference ({trialStatus?.model || 'muse-spark-1.3-contributor'}).
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Quick Action Chips */}
      <div className="px-3 py-2 border-b border-[#262631]/60 bg-[#0E0E12] flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
        <button
          disabled={isTrialConsumed || isSubmitting}
          onClick={() => handleInitiateSend('Add a red LED to the design')}
          className="bg-[#15151B] hover:bg-[#262631] text-[#818CF8] px-2 py-1 rounded border border-[#262631] whitespace-nowrap transition-colors flex items-center gap-1 disabled:opacity-40"
        >
          <Zap className="w-3 h-3" />
          <span>+ LED</span>
        </button>
        <button
          disabled={isTrialConsumed || isSubmitting}
          onClick={() => handleInitiateSend('Add a buzzer to the design')}
          className="bg-[#15151B] hover:bg-[#262631] text-[#818CF8] px-2 py-1 rounded border border-[#262631] whitespace-nowrap transition-colors disabled:opacity-40"
        >
          + Buzzer
        </button>
        <button
          disabled={isTrialConsumed || isSubmitting}
          onClick={() => handleInitiateSend('Run DRC validation')}
          className="bg-[#15151B] hover:bg-[#262631] text-emerald-400 px-2 py-1 rounded border border-[#262631] whitespace-nowrap transition-colors disabled:opacity-40"
        >
          Check DRC
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${m.sender === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[88%] rounded-lg p-3 text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#4F46E5] text-white rounded-br-none shadow-md'
                  : 'bg-[#15151B] border border-[#262631] text-[#FAFAFA] rounded-bl-none'
              }`}
            >
              {m.sender === 'copilot' && (
                <div className="flex items-center space-x-1.5 mb-1.5 pb-1 border-b border-[#262631]/80 text-[10px] font-mono text-zinc-400">
                  {m.provider === 'nvidia' ? (
                    <>
                      <Zap className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">NVIDIA NIM (Muse 30B)</span>
                    </>
                  ) : m.provider === 'meta' ? (
                    <>
                      <Globe className="w-3 h-3 text-purple-400" />
                      <span className="text-purple-300 font-medium">Meta Model API</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-300 font-medium">Local AI (Ollama)</span>
                    </>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap font-sans">{m.text}</div>

              {/* Executed graph actions pills */}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#262631] space-y-1">
                  {m.actions.map((act, aIdx) => (
                    <div
                      key={aIdx}
                      className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 rounded px-2 py-1 flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3 h-3 flex-shrink-0" />
                      <span>{act}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <span className="text-[9px] text-zinc-500 font-mono mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isSubmitting && (
          <div className="flex items-center space-x-2 text-xs font-mono text-[#A1A1AA] bg-[#15151B] border border-[#262631] p-2.5 rounded-lg w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#818CF8] animate-spin" />
            <span>
              {provider === 'nvidia'
                ? 'Querying NVIDIA NIM (Muse Glimmer 30B)...'
                : provider === 'meta'
                ? 'Querying Meta Model API...'
                : 'Processing with Local Ollama...'}
            </span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-[#262631] bg-[#15151B]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleInitiateSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              isTrialConsumed
                ? 'Trial consumed. Switch to Local AI to continue...'
                : provider === 'nvidia'
                ? 'Ask NVIDIA NIM Muse 30B Copilot (1 trial)...'
                : provider === 'meta'
                ? 'Ask Meta AI Copilot (1 trial)...'
                : 'Ask Local Copilot or propose a change...'
            }
            className="flex-1 bg-[#0E0E12] border border-[#262631] rounded-md px-3 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-[#6366F1] font-sans disabled:opacity-50"
            disabled={isSubmitting || (isTrialConsumed ?? false)}
          />
          <button
            type="submit"
            disabled={isSubmitting || !input.trim() || (isTrialConsumed ?? false)}
            className={`p-2 rounded-md transition-colors disabled:opacity-40 text-white ${
              provider === 'nvidia'
                ? 'bg-emerald-600 hover:bg-emerald-500'
                : provider === 'meta'
                ? 'bg-purple-600 hover:bg-purple-500'
                : 'bg-[#4F46E5] hover:bg-[#4338CA]'
            }`}
            title={
              provider === 'nvidia'
                ? 'Send with NVIDIA NIM'
                : provider === 'meta'
                ? 'Send with Meta AI'
                : 'Send with Local AI'
            }
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Trial Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-[#15151B] border border-emerald-500/40 rounded-xl max-w-sm w-full p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-lg bg-emerald-950/80 border border-emerald-700/50 flex items-center justify-center text-emerald-300 flex-shrink-0">
                <Zap className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white font-mono">
                  {provider === 'nvidia' ? 'Use NVIDIA NIM Single Trial?' : 'Use Meta AI Single Trial?'}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                  This action consumes your <strong>single trial</strong> for {provider === 'nvidia' ? "Meta's Muse Glimmer 30B through NVIDIA NIM" : 'official Meta Model API'} inference.
                </p>
              </div>
            </div>

            <div className="bg-[#0E0E12] border border-[#262631] p-3 rounded-lg text-[11px] text-zinc-300 space-y-2">
              <div className="flex items-center space-x-2 text-emerald-300 font-mono text-[10px]">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Stateless Signed Browser Identity</span>
              </div>
              <p className="text-[10px] text-zinc-400">
                Once consumed, subsequent requests can be routed without limits to your local Ollama engine.
              </p>
              <div className="pt-1.5 border-t border-[#262631] text-[11px] font-mono text-zinc-200">
                <span className="text-zinc-500">Query: </span>"{pendingMessage}"
              </div>
            </div>

            <div className="flex space-x-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  setShowConfirmModal(false);
                  setPendingMessage('');
                }}
                className="flex-1 px-3 py-2 bg-[#22222C] hover:bg-[#2A2A38] text-zinc-300 text-xs font-mono rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => executeSend(pendingMessage, provider)}
                className={`flex-1 px-3 py-2 text-white text-xs font-mono font-medium rounded-lg shadow-lg transition-all flex items-center justify-center space-x-1 ${
                  provider === 'nvidia'
                    ? 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-600/30'
                    : 'bg-purple-600 hover:bg-purple-500 shadow-purple-600/30'
                }`}
              >
                <span>Confirm & Send</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
