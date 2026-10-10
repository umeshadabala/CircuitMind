import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Cpu, 
  FolderOpen, 
  Trash2, 
  Copy, 
  Edit3, 
  Clock, 
  Layers, 
  CheckCircle, 
  AlertTriangle, 
  X, 
  Sparkles, 
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Check
} from 'lucide-react';
import { Project } from '../types';

export interface ProjectSummary {
  id: string;
  title: string;
  description?: string;
  board_type?: string;
  version: number;
  components_count?: number;
  status?: string;
  updated_at?: string;
}

interface DashboardViewProps {
  projects: ProjectSummary[];
  loading: boolean;
  onOpenProject: (id: string) => void;
  onNewProject: () => void;
  onDeleteProject: (id: string) => Promise<void>;
  onDuplicateProject: (id: string) => Promise<void>;
  onRenameProject: (id: string, newTitle: string) => Promise<void>;
  onLoadDemo: (type: string) => Promise<void>;
  onRefresh: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  loading,
  onOpenProject,
  onNewProject,
  onDeleteProject,
  onDuplicateProject,
  onRenameProject,
  onLoadDemo,
  onRefresh
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  
  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [renaming, setRenaming] = useState(false);

  // Delete modal state
  const [deleteConfirmProject, setDeleteConfirmProject] = useState<ProjectSummary | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Action feedback
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  // Filter projects by search query
  const filteredProjects = useMemo(() => {
    if (!searchQuery.trim()) return projects;
    const q = searchQuery.toLowerCase();
    return projects.filter(p => 
      p.title.toLowerCase().includes(q) || 
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.board_type && p.board_type.toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  const handleStartRename = (e: React.MouseEvent, p: ProjectSummary) => {
    e.stopPropagation();
    setEditingId(p.id);
    setEditingTitle(p.title);
  };

  const handleSaveRename = async (e: React.FormEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editingTitle.trim()) return;
    try {
      setRenaming(true);
      await onRenameProject(id, editingTitle.trim());
      setEditingId(null);
    } finally {
      setRenaming(false);
    }
  };

  const handleDuplicate = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      setActionLoadingId(id);
      await onDuplicateProject(id);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeleteClick = (e: React.MouseEvent, p: ProjectSummary) => {
    e.stopPropagation();
    setDeleteError(null);
    setDeleteConfirmProject(p);
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmProject) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await onDeleteProject(deleteConfirmProject.id);
      setDeleteConfirmProject(null);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete project');
    } finally {
      setDeleting(false);
    }
  };

  const formatBoardName = (board?: string) => {
    if (!board) return 'Microcontroller';
    if (board.includes('esp32')) return 'ESP32 DevKit';
    if (board.includes('pico') || board.includes('rp2040')) return 'RP2040 Pico';
    if (board.includes('uno') || board.includes('atmega')) return 'Arduino Uno';
    return board;
  };

  const formatTime = (iso?: string) => {
    if (!iso) return 'Recently';
    try {
      const d = new Date(iso);
      const now = new Date();
      const diffMs = now.getTime() - d.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      if (diffMins < 2) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays < 7) return `${diffDays}d ago`;
      return d.toLocaleDateString();
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="view-container" style={{ padding: '28px 20px', maxWidth: '1240px', margin: '0 auto' }}>
      {/* Dashboard Top Header */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'space-between', 
        flexWrap: 'wrap', 
        gap: '16px',
        marginBottom: '28px' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <img 
            src="/logo.svg" 
            alt="CircuitMind Studio Logo" 
            style={{ width: '40px', height: '40px', borderRadius: '8px' }} 
          />
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, letterSpacing: '-0.5px', color: '#fff' }}>
              Project Dashboard
            </h1>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '3px 0 0 0' }}>
              Hardware designs, firmware builds, and behavioral simulations
            </p>
          </div>
        </div>

        {/* Right CTA Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            onClick={onRefresh} 
            title="Refresh projects list"
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            <span>Refresh</span>
          </button>

          <button 
            className="btn btn-primary" 
            onClick={onNewProject}
            style={{ padding: '8px 18px', fontWeight: 600 }}
          >
            <Plus size={15} />
            <span>New Project</span>
          </button>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px', 
        marginBottom: '24px',
        background: 'var(--bg-card)',
        padding: '10px 16px',
        borderRadius: '8px',
        border: '1px solid var(--border-subtle)'
      }}>
        <Search size={16} color="var(--text-muted)" style={{ flexShrink: 0 }} />
        <input 
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search projects by name, description, or board..."
          style={{
            flex: 1,
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#fff',
            fontSize: '13.5px',
            fontFamily: 'inherit'
          }}
        />
        {searchQuery && (
          <button 
            className="btn-icon" 
            onClick={() => setSearchQuery('')}
            title="Clear search"
            style={{ padding: '4px' }}
          >
            <X size={14} />
          </button>
        )}
        <div style={{ 
          fontSize: '12px', 
          color: 'var(--text-muted)', 
          borderLeft: '1px solid var(--border-subtle)', 
          paddingLeft: '12px',
          whiteSpace: 'nowrap'
        }}>
          {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'}
        </div>
      </div>

      {/* Loading State */}
      {loading && projects.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '60px 20px', 
          color: 'var(--text-muted)',
          background: 'var(--bg-card)',
          borderRadius: '8px',
          border: '1px solid var(--border-subtle)'
        }}>
          <RefreshCw size={24} className="spin" style={{ color: 'var(--accent-orange)', marginBottom: '12px' }} />
          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-secondary)' }}>Loading projects from storage...</div>
        </div>
      )}

      {/* Empty State - No Projects */}
      {!loading && projects.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '64px 24px', 
          background: 'var(--bg-card)', 
          borderRadius: '12px', 
          border: '1px dashed var(--border-subtle)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
        }}>
          <div style={{ 
            width: '56px', 
            height: '56px', 
            borderRadius: '14px', 
            background: 'var(--accent-orange-soft)', 
            border: '1px solid var(--accent-orange-glow)',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: 'var(--accent-orange)'
          }}>
            <Layers size={26} />
          </div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, margin: '0 0 8px 0', color: '#fff' }}>
            No Projects Yet
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 24px auto', lineHeight: 1.5 }}>
            Create your first hardware project using natural-language AI synthesis, or load a verified demonstration fixture to get started immediately.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button 
              className="btn btn-primary" 
              onClick={onNewProject}
              style={{ padding: '10px 22px', fontSize: '13.5px', fontWeight: 600 }}
            >
              <Plus size={16} />
              <span>Create New Project</span>
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => onLoadDemo('parking')}
              style={{ padding: '10px 18px', fontSize: '13.5px' }}
            >
              <Sparkles size={15} color="var(--accent-orange)" />
              <span>Load Parking Sensor Demo</span>
            </button>
          </div>
        </div>
      )}

      {/* Empty State - Search Query Yielded No Results */}
      {!loading && projects.length > 0 && filteredProjects.length === 0 && (
        <div style={{ 
          textAlign: 'center', 
          padding: '48px 20px', 
          background: 'var(--bg-card)', 
          borderRadius: '8px', 
          border: '1px solid var(--border-subtle)'
        }}>
          <Search size={24} color="var(--text-muted)" style={{ marginBottom: '10px' }} />
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
            No matching projects found
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            No project matches "{searchQuery}". Try a different keyword or reset the search.
          </p>
          <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
            <span>Clear Search</span>
          </button>
        </div>
      )}

      {/* Project Cards Grid */}
      {filteredProjects.length > 0 && (
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', 
          gap: '16px' 
        }}>
          {filteredProjects.map((p) => {
            const isEditing = editingId === p.id;
            const isActionLoading = actionLoadingId === p.id;

            return (
              <div 
                key={p.id}
                className="card"
                onClick={() => !isEditing && onOpenProject(p.id)}
                style={{ 
                  margin: 0,
                  cursor: isEditing ? 'default' : 'pointer',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '18px 20px',
                  borderRadius: '10px',
                  border: '1px solid var(--border-subtle)',
                  background: 'var(--bg-card)',
                  transition: 'all 0.15s ease',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--accent-orange-glow)';
                  e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border-subtle)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Top Card Row */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '10px' }}>
                    {isEditing ? (
                      <form onSubmit={(e) => handleSaveRename(e, p.id)} style={{ display: 'flex', gap: '6px', flex: 1 }}>
                        <input 
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          autoFocus
                          style={{
                            flex: 1,
                            background: 'var(--bg-input)',
                            border: '1px solid var(--accent-orange)',
                            borderRadius: '4px',
                            color: '#fff',
                            padding: '4px 8px',
                            fontSize: '14px',
                            outline: 'none'
                          }}
                        />
                        <button type="submit" className="btn btn-primary" disabled={renaming} style={{ padding: '4px 8px' }}>
                          <Check size={14} />
                        </button>
                        <button type="button" className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); setEditingId(null); }} style={{ padding: '4px 8px' }}>
                          <X size={14} />
                        </button>
                      </form>
                    ) : (
                      <h3 style={{ 
                        fontSize: '15px', 
                        fontWeight: 600, 
                        color: '#fff', 
                        margin: 0, 
                        lineHeight: 1.3,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}>
                        <span>{p.title}</span>
                      </h3>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      <span className="version-chip" style={{ fontSize: '10px' }}>v{p.version}</span>
                    </div>
                  </div>

                  {/* Project Description */}
                  <p style={{ 
                    fontSize: '12.5px', 
                    color: 'var(--text-secondary)', 
                    margin: '0 0 16px 0', 
                    lineHeight: 1.45,
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                    minHeight: '36px'
                  }}>
                    {p.description || 'Custom hardware development and simulation project.'}
                  </p>
                </div>

                {/* Metadata & Actions Bar */}
                <div style={{ 
                  borderTop: '1px solid var(--border-subtle)', 
                  paddingTop: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '8px',
                  fontSize: '11.5px',
                  color: 'var(--text-muted)'
                }}>
                  {/* Left Metadata Chips */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Cpu size={12} color="var(--accent-orange)" />
                      <span>{formatBoardName(p.board_type)}</span>
                    </div>

                    {p.components_count !== undefined && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Layers size={12} />
                        <span>{p.components_count} parts</span>
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      <span>{formatTime(p.updated_at)}</span>
                    </div>
                  </div>

                  {/* Action Icons */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} onClick={(e) => e.stopPropagation()}>
                    <button 
                      className="btn-icon" 
                      onClick={(e) => handleStartRename(e, p)}
                      title="Rename project"
                      style={{ padding: '5px' }}
                    >
                      <Edit3 size={13} />
                    </button>

                    <button 
                      className="btn-icon" 
                      onClick={(e) => handleDuplicate(e, p.id)}
                      title="Duplicate project"
                      disabled={isActionLoading}
                      style={{ padding: '5px' }}
                    >
                      <Copy size={13} />
                    </button>

                    <button 
                      className="btn-icon" 
                      onClick={(e) => handleDeleteClick(e, p)}
                      title="Delete project"
                      style={{ padding: '5px', color: 'var(--status-error)' }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Demonstration Fixtures Quick-Load Section */}
      <div style={{ 
        marginTop: '36px', 
        paddingTop: '24px', 
        borderTop: '1px solid var(--border-subtle)' 
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div>
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="var(--accent-orange)" />
              <span>Verified Demonstration Fixtures</span>
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
              Instant pre-verified projects ready for simulation, firmware compilation, and behavioral debugging
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '12px' }}>
          <div 
            className="card"
            style={{ 
              margin: 0, 
              padding: '14px 16px', 
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'var(--border-subtle)'
            }}
            onClick={() => onLoadDemo('parking')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>Smart Parking Sensor</span>
              <span className="status-pill passed" style={{ fontSize: '9px', padding: '1px 5px' }}>Verified</span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              ESP32 with HC-SR04 sonar, warning buzzer, and active indicator LED.
            </p>
          </div>

          <div 
            className="card"
            style={{ 
              margin: 0, 
              padding: '14px 16px', 
              cursor: 'pointer',
              background: 'rgba(255,255,255,0.02)',
              borderColor: 'var(--border-subtle)'
            }}
            onClick={() => onLoadDemo('quadcopter')}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
              <span style={{ fontWeight: 600, fontSize: '13px', color: '#fff' }}>Quadcopter Flight Controller</span>
              <span className="status-pill passed" style={{ fontSize: '9px', padding: '1px 5px' }}>Verified</span>
            </div>
            <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', margin: 0, lineHeight: 1.4 }}>
              ESP32 with MPU6050 6-DOF IMU, 4 PWM ESC motor channels, and complementary filter.
            </p>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirmProject && (
        <div style={{ 
          position: 'fixed', 
          top: 0, 
          left: 0, 
          right: 0, 
          bottom: 0, 
          background: 'rgba(0,0,0,0.7)', 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center', 
          zIndex: 1000,
          backdropFilter: 'blur(3px)'
        }}>
          <div style={{ 
            background: 'var(--bg-card)', 
            border: '1px solid var(--border-subtle)', 
            borderRadius: '10px', 
            padding: '24px', 
            maxWidth: '420px', 
            width: '90%',
            boxShadow: '0 12px 40px rgba(0,0,0,0.5)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px', color: 'var(--status-error)' }}>
              <AlertTriangle size={20} />
              <h3 style={{ fontSize: '16px', fontWeight: 600, margin: 0, color: '#fff' }}>
                Delete Project?
              </h3>
            </div>

            <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5, margin: '0 0 16px 0' }}>
              Are you sure you want to delete <strong style={{ color: '#fff' }}>"{deleteConfirmProject.title}"</strong>? This will permanently remove its components, wiring, firmware, and engineering memory from storage.
            </p>

            {deleteError && (
              <div style={{ 
                background: 'var(--status-error-bg)', 
                border: '1px solid rgba(239, 68, 68, 0.3)', 
                color: 'var(--status-error)',
                padding: '8px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                marginBottom: '16px'
              }}>
                {deleteError}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setDeleteConfirmProject(null)}
                disabled={deleting}
              >
                Cancel
              </button>
              <button 
                className="btn" 
                onClick={handleConfirmDelete}
                disabled={deleting}
                style={{ background: 'var(--status-error)', color: '#fff', border: 'none' }}
              >
                {deleting ? 'Deleting...' : 'Delete Project'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
