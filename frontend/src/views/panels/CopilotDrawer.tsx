import React, { useState } from 'react';
import {
  X,
  Send,
  Sparkles,
  Zap,
  CheckCircle2,
  Cpu,
  Bot,
  HelpCircle,
  ShieldCheck,
  Terminal,
  BookOpen,
} from 'lucide-react';
import { Project } from '../../types';

interface CopilotDrawerProps {
  project: Project;
  isOpen: boolean;
  onClose: () => void;
  onSendMessage: (
    message: string,
    provider: 'local' | 'meta'
  ) => Promise<{ reply: string; actions_executed: string[]; provider?: string }>;
}

type CopilotMode = 'copilot' | 'assistant';

interface Message {
  sender: 'user' | 'copilot';
  text: string;
  actions?: string[];
  mode?: CopilotMode;
  timestamp: string;
}

export const CopilotDrawer: React.FC<CopilotDrawerProps> = ({
  project,
  isOpen,
  onClose,
  onSendMessage,
}) => {
  const [mode, setMode] = useState<CopilotMode>('copilot');
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'copilot',
      text: `Hello! I am your CircuitMind Engineering Copilot, loaded with ${project.name} (Rev ${project.revision}).\n\nI can explain active pin assignments, interpret DRC findings, suggest hardware additions, or answer general electronics engineering questions.`,
      mode: 'copilot',
      timestamp: new Date().toLocaleTimeString(),
    },
  ]);

  if (!isOpen) return null;

  const handleSend = async (textToSend?: string) => {
    const msg = (textToSend || input).trim();
    if (!msg || isSubmitting) return;

    // Prepend mode prefix for context if in general assistant mode
    const promptToSend = mode === 'assistant' 
      ? `[General Electronics Question]: ${msg}`
      : msg;

    const userMsg: Message = {
      sender: 'user',
      text: msg,
      timestamp: new Date().toLocaleTimeString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsSubmitting(true);

    try {
      const res = await onSendMessage(promptToSend, 'local');
      const botMsg: Message = {
        sender: 'copilot',
        text: res.reply,
        actions: res.actions_executed,
        mode,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'copilot',
          text: `Request failed: ${err.message}`,
          mode,
          timestamp: new Date().toLocaleTimeString(),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 w-[420px] bg-[#090D12] dark:bg-[#090D12] bg-white border-l border-[#25332F] dark:border-[#25332F] border-slate-200 shadow-2xl flex flex-col z-40 animate-in slide-in-from-right duration-200">
      {/* Drawer Header */}
      <div className="p-3.5 border-b border-[#25332F] dark:border-[#25332F] border-slate-200 flex items-center justify-between bg-[#101720] dark:bg-[#101720] bg-slate-50">
        <div className="flex items-center space-x-2">
          <div className="w-6 h-6 rounded bg-[#356B62]/20 border border-[#356B62]/40 flex items-center justify-center text-[#5B9B8D]">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <div>
            <div className="font-mono text-xs font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-wide">
              CircuitMind Copilot
            </div>
            <div className="text-[10px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 font-mono">
              Ollama · gpt-oss:120b-cloud
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-[#96A6A3] hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] text-slate-500 hover:text-slate-900 p-1 rounded hover:bg-[#151F2B] transition-colors"
          title="Close Copilot"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="px-3 py-2 bg-[#101720] dark:bg-[#101720] bg-slate-100 border-b border-[#25332F] dark:border-[#25332F] border-slate-200">
        <div className="grid grid-cols-2 gap-1 p-0.5 bg-[#090D12] dark:bg-[#090D12] bg-slate-200 rounded-lg border border-[#25332F] dark:border-[#25332F] border-slate-300">
          <button
            type="button"
            onClick={() => setMode('copilot')}
            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-[11px] font-mono transition-all ${
              mode === 'copilot'
                ? 'bg-[#151F2B] dark:bg-[#151F2B] bg-white text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-medium shadow-sm border border-[#25332F] dark:border-[#25332F] border-slate-300'
                : 'text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-[#5B9B8D]" />
            <span>Engineering Copilot</span>
          </button>

          <button
            type="button"
            onClick={() => setMode('assistant')}
            className={`flex items-center justify-center space-x-1.5 py-1.5 px-2 rounded-md text-[11px] font-mono transition-all ${
              mode === 'assistant'
                ? 'bg-[#151F2B] dark:bg-[#151F2B] bg-white text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 font-medium shadow-sm border border-[#25332F] dark:border-[#25332F] border-slate-300'
                : 'text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 hover:text-[#F1F5F4] dark:hover:text-[#F1F5F4] hover:text-slate-900'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-400" />
            <span>Normal AI Assistant</span>
          </button>
        </div>
      </div>

      {/* Mode Context Notice */}
      <div className="px-3 py-1.5 bg-[#101720]/60 dark:bg-[#101720]/60 bg-slate-50 border-b border-[#25332F]/60 text-[10px] font-mono text-[#96A6A3] flex items-center justify-between">
        <span>
          {mode === 'copilot'
            ? `Active Project: ${project.name} (Rev ${project.revision})`
            : 'General Electronics Q&A & Programming Help'}
        </span>
        <span className="text-emerald-400 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online
        </span>
      </div>

      {/* Quick Action Chips */}
      <div className="px-3 py-2 border-b border-[#25332F]/60 bg-[#090D12] dark:bg-[#090D12] bg-white flex items-center space-x-1.5 overflow-x-auto text-[11px] font-mono no-scrollbar">
        {mode === 'copilot' ? (
          <>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('Add a red LED to the design')}
              className="bg-[#101720] hover:bg-[#151F2B] text-[#5B9B8D] px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors flex items-center gap-1 disabled:opacity-40"
            >
              <Zap className="w-3 h-3" />
              <span>+ LED</span>
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('Add an active buzzer to the design')}
              className="bg-[#101720] hover:bg-[#151F2B] text-[#5B9B8D] px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              + Buzzer
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('Explain all active pin assignments and voltage rails')}
              className="bg-[#101720] hover:bg-[#151F2B] text-slate-300 px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              Explain Pins
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('Check DRC findings and suggest fixes')}
              className="bg-[#101720] hover:bg-[#151F2B] text-emerald-400 px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              Check DRC
            </button>
          </>
        ) : (
          <>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('How does an I2C pull-up resistor work and why is 4.7kΩ standard?')}
              className="bg-[#101720] hover:bg-[#151F2B] text-amber-300 px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              I2C Pull-Ups
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('What are ESP32 strapping pins and why must they be protected?')}
              className="bg-[#101720] hover:bg-[#151F2B] text-amber-300 px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              Strapping Pins
            </button>
            <button
              disabled={isSubmitting}
              onClick={() => handleSend('How to calculate resistor values for an LED?')}
              className="bg-[#101720] hover:bg-[#151F2B] text-amber-300 px-2 py-1 rounded border border-[#25332F] whitespace-nowrap transition-colors disabled:opacity-40"
            >
              LED Resistor Formula
            </button>
          </>
        )}
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
                  ? 'bg-[#356B62] text-white rounded-br-none shadow-md'
                  : 'bg-[#101720] dark:bg-[#101720] bg-slate-100 border border-[#25332F] dark:border-[#25332F] border-slate-300 text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800 rounded-bl-none'
              }`}
            >
              {m.sender === 'copilot' && (
                <div className="flex items-center space-x-1.5 mb-1.5 pb-1 border-b border-[#25332F]/80 text-[10px] font-mono text-[#96A6A3]">
                  {m.mode === 'assistant' ? (
                    <>
                      <BookOpen className="w-3 h-3 text-amber-400" />
                      <span className="text-amber-300 font-medium">Normal AI Assistant</span>
                    </>
                  ) : (
                    <>
                      <Cpu className="w-3 h-3 text-[#5B9B8D]" />
                      <span className="text-[#5B9B8D] font-medium">Engineering Copilot</span>
                    </>
                  )}
                </div>
              )}

              <div className="whitespace-pre-wrap font-sans">{m.text}</div>

              {/* Executed graph actions pills */}
              {m.actions && m.actions.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#25332F] space-y-1">
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

            <span className="text-[9px] text-[#96A6A3] font-mono mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isSubmitting && (
          <div className="flex items-center space-x-2 text-xs font-mono text-[#96A6A3] bg-[#101720] border border-[#25332F] p-2.5 rounded-lg w-fit">
            <Sparkles className="w-3.5 h-3.5 text-[#5B9B8D] animate-spin" />
            <span>Analyzing with Ollama (gpt-oss:120b-cloud)...</span>
          </div>
        )}
      </div>

      {/* Input bar */}
      <div className="p-3 border-t border-[#25332F] dark:border-[#25332F] border-slate-200 bg-[#101720] dark:bg-[#101720] bg-slate-50">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center space-x-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'copilot'
                ? 'Ask Copilot or propose a circuit change...'
                : 'Ask general electronics or coding question...'
            }
            className="flex-1 bg-[#090D12] dark:bg-[#090D12] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-300 rounded-md px-3 py-2 text-xs text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 placeholder-slate-500 focus:outline-none focus:border-[#5B9B8D] font-sans"
            disabled={isSubmitting}
          />
          <button
            type="submit"
            disabled={isSubmitting || !input.trim()}
            className="p-2 rounded-md transition-colors disabled:opacity-40 text-white bg-[#356B62] hover:bg-[#2D5E56]"
            title="Send Message"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>
    </div>
  );
};
