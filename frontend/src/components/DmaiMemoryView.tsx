import React, { useState, useEffect, useCallback } from 'react';
import { Project, MemoryEvent } from '../types';
import { fetchProjectMemory, askDmai } from '../api/client';
import { Database, Search, Send, Sparkles, Clock, RefreshCw } from 'lucide-react';

interface DmaiMemoryViewProps {
  project: Project;
}

export const DmaiMemoryView: React.FC<DmaiMemoryViewProps> = ({ project }) => {
  const [events, setEvents] = useState<MemoryEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Ask DMAI state
  const [question, setQuestion] = useState('');
  const [asking, setAsking] = useState(false);
  const [answer, setAnswer] = useState<{ answer: string; source: string } | null>(null);

  const loadMemory = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchProjectMemory(project.id, filterType || undefined, searchQuery || undefined);
      setEvents(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [project.id, filterType, searchQuery]);

  useEffect(() => {
    loadMemory();
  }, [loadMemory]);

  const handleAsk = async (q: string) => {
    if (!q.trim()) return;
    setAsking(true);
    setAnswer(null);
    try {
      const res = await askDmai(project.id, q);
      setAnswer(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAsking(false);
    }
  };

  const quickQuestions = [
    "Why is the piezo buzzer connected to GPIO19?",
    "Why is the OLED connected to GPIO21 and GPIO22?",
    "What is the calibrated obstacle distance threshold?"
  ];

  return (
    <div className="view-container">
      <div style={{ marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Database size={20} color="var(--accent-orange)" />
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Project Memory Layer</h2>
        </div>
        <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
          Persistent project events, architectural decisions, and verification history stored in SQLite.
        </p>
      </div>

      {/* Ask DMAI Section */}
      <div className="card" style={{ padding: '20px', background: 'linear-gradient(135deg, #101018 0%, #151119 100%)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', fontSize: '14px', fontWeight: 600, color: '#fff' }}>
          <Sparkles size={16} color="var(--accent-orange)" />
          <span>Ask Engineering Memory</span>
        </div>

        {/* Quick Question Chips */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '14px' }}>
          {quickQuestions.map((qq, i) => (
            <button
              key={i}
              className="btn btn-secondary"
              onClick={() => {
                setQuestion(qq);
                handleAsk(qq);
              }}
              style={{ fontSize: '11px', padding: '4px 10px', borderRadius: '14px' }}
            >
              {qq}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleAsk(question); }} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask why a component was selected, why a pin was chosen, or review history..."
            style={{
              flex: 1,
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '6px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none'
            }}
          />
          <button type="submit" className="btn btn-primary" disabled={asking || !question.trim()}>
            <Send size={14} />
            <span>{asking ? 'Thinking...' : 'Query'}</span>
          </button>
        </form>

        {/* Answer Box */}
        {answer && (
          <div style={{ marginTop: '16px', background: '#09090e', border: '1px solid var(--accent-orange-glow)', borderRadius: '8px', padding: '16px' }}>
            <div style={{ fontSize: '11px', color: 'var(--accent-orange)', fontWeight: 600, marginBottom: '6px', textTransform: 'uppercase' }}>
              Source: {answer.source}
            </div>
            <div style={{ fontSize: '13px', color: '#f8fafc', lineHeight: 1.6 }}>
              {answer.answer}
            </div>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '6px', overflowX: 'auto' }}>
          {['', 'REQUIREMENT_ADDED', 'COMPONENT_SELECTED', 'SIMULATION_RUN', 'DEFECT_DETECTED', 'PATCH_APPLIED', 'PROJECT_MODIFIED'].map((type) => (
            <button
              key={type}
              className={`btn ${filterType === type ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => setFilterType(type)}
              style={{ fontSize: '11px', padding: '4px 10px', whiteSpace: 'nowrap' }}
            >
              {type ? type.replace('_', ' ') : 'All Events'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 8px' }}>
          <Search size={14} color="var(--text-muted)" />
          <input
            type="text"
            placeholder="Search events..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadMemory()}
            style={{ background: 'transparent', border: 'none', color: '#fff', fontSize: '12px', outline: 'none', width: '140px' }}
          />
        </div>
      </div>

      {/* Events Timeline Stream */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <RefreshCw size={14} className="spin" style={{ animation: 'spin 1s linear infinite' }} />
            <span>Loading engineering memory events...</span>
          </div>
        ) : events.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)', fontSize: '13px' }}>
            No engineering memory events found for this filter.
          </div>
        ) : (
          events.map((evt, idx) => (
            <div 
              key={evt.id || idx}
              className="card"
              style={{ 
                margin: 0, 
                padding: '12px 16px', 
                display: 'flex', 
                alignItems: 'flex-start', 
                gap: '12px',
                borderLeft: `3px solid ${
                  evt.event_type.includes('PATCH') ? 'var(--status-success)' : 
                  (evt.event_type.includes('DEFECT') ? 'var(--status-error)' : 
                  (evt.event_type.includes('SIMULATION') ? 'var(--status-info)' : 'var(--accent-orange)'))
                }`
              }}
            >
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '10px', 
                      fontFamily: 'var(--font-mono)', 
                      background: 'rgba(255,255,255,0.06)', 
                      padding: '2px 6px', 
                      borderRadius: '4px',
                      color: 'var(--text-secondary)'
                    }}>
                      {evt.event_type}
                    </span>
                    <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>
                      {evt.summary}
                    </span>
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={10} />
                    <span>v{evt.project_version}</span>
                  </span>
                </div>

                {evt.rationale && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px', lineHeight: 1.4 }}>
                    Rationale: {evt.rationale}
                  </p>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
