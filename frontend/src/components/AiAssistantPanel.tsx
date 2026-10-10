import React, { useState, useEffect, useRef } from 'react';
import { Project } from '../types';
import { askDmai, chatWithProject, checkHealth } from '../api/client';
import { MarkdownContent } from './MarkdownContent';
import { 
  Sparkles, 
  Send, 
  Cpu, 
  ArrowRight,
  RefreshCw,
  X,
  Bot,
  User,
  ShieldCheck,
  PlayCircle,
  RotateCcw,
  AlertCircle
} from 'lucide-react';

export interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  source?: string;
  timestamp: string;
  isError?: boolean;
  failedQuery?: string;
}

interface AiAssistantPanelProps {
  project: Project | null;
  onModify: (instruction: string) => Promise<void> | void;
  onUpdateProject?: (updated: Project) => void;
  onSimulate: () => void;
  onInjectDefect: () => void;
  modifying: boolean;
  isOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_PREFIX = 'circuitmind_chat_';

export const AiAssistantPanel: React.FC<AiAssistantPanelProps> = ({ 
  project, 
  onModify, 
  onUpdateProject,
  onSimulate, 
  modifying,
  isOpen = true,
  onClose
}) => {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [asking, setAsking] = useState(false);
  const [aiMode, setAiMode] = useState<string>('Ollama / Local Knowledge');
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load AI health info
  useEffect(() => {
    checkHealth()
      .then((h) => {
        if (h.ai_mode) setAiMode(h.ai_mode);
      })
      .catch(() => setAiMode('Deterministic Knowledge Graph'));
  }, []);

  // Initialize or restore conversation when project changes
  useEffect(() => {
    if (!project) return;
    const storageKey = `${STORAGE_PREFIX}${project.id}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch {
        // Fall back to new init message
      }
    }

    const initMsg: Message = {
      id: 'msg-init',
      sender: 'assistant',
      text: `CircuitMind AI ready for **${project.title}** (v${project.version}). Target board is **${project.board.display_name}**.\n\nAsk questions about hardware architecture, pin allocations, firmware routines, or type instructions to modify the circuit.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    setMessages([initMsg]);
  }, [project?.id]);

  // Save messages to project-specific storage
  useEffect(() => {
    if (!project || messages.length === 0) return;
    try {
      localStorage.setItem(`${STORAGE_PREFIX}${project.id}`, JSON.stringify(messages));
    } catch {
      // Ignore localStorage quotas if any
    }
  }, [messages, project?.id]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, asking, modifying]);

  if (!project) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || input).trim();
    if (!query || asking || modifying) return;

    const userMsg: Message = {
      id: `usr-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) setInput('');

    try {
      setAsking(true);
      const res = await chatWithProject(project.id, query);

      // If a project modification occurred, propagate updated project graph to active state!
      if (res.action_applied && res.updated_project && onUpdateProject) {
        onUpdateProject(res.updated_project);
      }

      if (res.intent === 'simulate' && res.simulation_run) {
        onSimulate();
      }

      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: res.message,
        source: res.action_applied ? 'CircuitMind Changeset Engine' : (res.intent === 'simulate' ? 'Simulation Engine' : 'Ollama (gpt-oss:120b-cloud)'),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: unknown) {
      const errText = e instanceof Error ? e.message : 'Failed to process request';
      const assistantMsg: Message = {
        id: `asst-${Date.now()}`,
        sender: 'assistant',
        text: `Error processing request "${query}": ${errText}`,
        isError: true,
        failedQuery: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } finally {
      setAsking(false);
    }
  };

  const executeQuery = async (query: string) => {
    await handleSendMessage(query);
  };

  const handleRetry = async (failedMsgId: string, failedQuery: string) => {
    if (asking || modifying || !failedQuery) return;
    // Remove the failed message without duplicating the user query
    setMessages((prev) => prev.filter((m) => m.id !== failedMsgId));
    await executeQuery(failedQuery);
  };

  const dynamicSuggestions = [
    { label: 'Why were these pins allocated?', query: 'Why were these specific microcontroller pins chosen?' },
    { label: 'Verify hardware constraints', query: 'What electrical constraints and validation checks are active?' },
    { label: 'Explain firmware logic', query: 'How does the generated firmware loop and interrupt handler work?' }
  ];

  return (
    <aside className={`assistant-panel ${isOpen ? 'drawer-open' : ''}`}>
      {/* Panel Header */}
      <div className="panel-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Sparkles size={16} color="var(--accent-orange)" />
          <span>AI Engineering Copilot</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span 
            style={{ 
              fontSize: '10.5px', 
              background: 'rgba(56, 189, 248, 0.1)', 
              color: '#38bdf8', 
              padding: '2px 8px', 
              borderRadius: '4px', 
              fontFamily: 'var(--font-mono)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              maxWidth: '180px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap'
            }}
            title={aiMode}
          >
            {aiMode}
          </span>

          {onClose && (
            <button 
              className="btn-icon" 
              onClick={onClose}
              title="Close Panel"
              style={{ padding: '4px' }}
            >
              <X size={15} />
            </button>
          )}
        </div>
      </div>

      {/* Project Context Summary Bar */}
      <div style={{ 
        padding: '10px 14px', 
        background: 'rgba(255, 255, 255, 0.02)', 
        borderBottom: '1px solid var(--border-subtle)',
        fontSize: '11.5px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Cpu size={13} color="var(--accent-orange)" />
          <strong style={{ color: '#fff' }}>{project.title}</strong>
          <span className="version-chip">v{project.version}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <ShieldCheck size={13} color="var(--status-success)" />
          <span style={{ color: 'var(--text-muted)' }}>{project.components.length} parts</span>
        </div>
      </div>

      {/* Conversation Thread */}
      <div className="panel-body" style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto' }}>
        {messages.map((m) => (
          <div 
            key={m.id}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
              maxWidth: '92%'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontSize: '10.5px', color: 'var(--text-muted)', alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start' }}>
              {m.sender === 'user' ? <User size={12} /> : <Bot size={12} color="var(--accent-orange)" />}
              <span>{m.sender === 'user' ? 'You' : 'Copilot'}</span>
              <span>•</span>
              <span>{m.timestamp}</span>
            </div>

            <div 
              style={{
                background: m.sender === 'user' 
                  ? 'var(--accent-orange-soft)' 
                  : m.isError 
                  ? 'var(--status-error-bg)' 
                  : 'var(--bg-card)',
                border: `1px solid ${
                  m.sender === 'user' 
                    ? 'var(--accent-orange-glow)' 
                    : m.isError 
                    ? 'rgba(239, 68, 68, 0.4)' 
                    : 'var(--border-subtle)'
                }`,
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '12.5px',
                lineHeight: 1.5,
                color: '#f8fafc',
                wordBreak: 'break-word'
              }}
            >
              {m.sender === 'user' ? (
                <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
              ) : (
                <MarkdownContent content={m.text} />
              )}

              {m.isError && m.failedQuery && (
                <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--status-error)', fontSize: '11px' }}>
                    <AlertCircle size={12} />
                    <span>Provider error occurred</span>
                  </div>
                  <button
                    className="btn btn-secondary"
                    onClick={() => handleRetry(m.id, m.failedQuery!)}
                    disabled={asking || modifying}
                    style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px' }}
                    type="button"
                  >
                    <RotateCcw size={10} />
                    <span>Retry</span>
                  </button>
                </div>
              )}
            </div>

            {m.source && (
              <div style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '3px', alignSelf: 'flex-start', fontStyle: 'italic' }}>
                Source: {m.source}
              </div>
            )}
          </div>
        ))}

        {(asking || modifying) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-orange)', fontSize: '12px', padding: '6px 0' }}>
            <RefreshCw size={14} className="spin" />
            <span>{modifying ? 'Synthesizing circuit changes...' : 'Reasoning with hardware models...'}</span>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Suggested Quick Queries */}
      <div style={{ padding: '8px 14px', borderTop: '1px solid var(--border-subtle)', background: 'rgba(0,0,0,0.15)', flexShrink: 0 }}>
        <div style={{ fontSize: '10.5px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase' }}>
          Suggested Inquiries:
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
          {dynamicSuggestions.map((s, idx) => (
            <button
              key={idx}
              className="btn btn-secondary"
              onClick={() => handleSendMessage(s.query)}
              disabled={asking || modifying}
              style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}
            >
              <span>{s.label}</span>
              <ArrowRight size={10} color="var(--accent-orange)" />
            </button>
          ))}
          <button
            className="btn btn-secondary"
            onClick={onSimulate}
            style={{ fontSize: '11px', padding: '3px 8px', borderRadius: '4px' }}
            title="Execute test simulation"
          >
            <PlayCircle size={11} color="var(--status-success)" />
            <span>Run Simulation</span>
          </button>
        </div>
      </div>

      {/* Panel Footer Input Form */}
      <div className="panel-footer">
        <form 
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
          style={{ display: 'flex', gap: '8px' }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about wiring, or instruct e.g. 'Change threshold to 40 cm'..."
            disabled={asking || modifying}
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '8px 12px',
              color: '#fff',
              fontSize: '12.5px',
              outline: 'none',
              minWidth: 0
            }}
          />
          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={asking || modifying || !input.trim()} 
            style={{ padding: '0 14px', flexShrink: 0 }}
          >
            {asking || modifying ? <RefreshCw size={13} className="spin" /> : <Send size={13} />}
          </button>
        </form>
      </div>
    </aside>
  );
};
