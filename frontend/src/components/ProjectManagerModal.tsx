import React, { useState } from 'react';
import { Project } from '../types';
import { StorageService } from '../services/storage';
import { 
  X, 
  FolderPlus, 
  Copy, 
  Edit3, 
  Trash2, 
  Download, 
  Upload, 
  Database, 
  AlertTriangle, 
  Check, 
  HardDrive
} from 'lucide-react';
import { useToast } from '../context/ToastContext';
import { deleteProject, resetDatabase } from '../api/client';

interface ProjectManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProject: Project | null;
  projectsList: Array<{ id: string; title: string; board_type?: string; version: number }>;
  onSelectProject: (id: string) => void;
  onRefreshProjects: () => void;
  onCreateProject: (title: string, boardType: string, description: string) => Promise<void>;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({
  isOpen,
  onClose,
  currentProject,
  projectsList,
  onSelectProject,
  onRefreshProjects,
  onCreateProject
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'manage' | 'create' | 'storage'>('manage');

  // Create form state
  const [newTitle, setNewTitle] = useState('');
  const [newBoard, setNewBoard] = useState('esp32-devkit-v1');
  const [newDesc, setNewDesc] = useState('');
  const [creating, setCreating] = useState(false);

  // Rename state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  // Delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error('Please enter a project title');
      return;
    }
    try {
      setCreating(true);
      await onCreateProject(newTitle.trim(), newBoard, newDesc.trim());
      setNewTitle('');
      setNewDesc('');
      setActiveTab('manage');
      onRefreshProjects();
      toast.success(`Project "${newTitle}" created successfully`);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create project';
      toast.error(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleDuplicate = async (id: string) => {
    try {
      const copy = await StorageService.duplicateProject(id);
      onRefreshProjects();
      onSelectProject(copy.id);
      toast.success(`Duplicated project as "${copy.title}"`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to duplicate project';
      toast.error(msg);
    }
  };

  const handleStartRename = (id: string, currentTitle: string) => {
    setEditingId(id);
    setEditTitle(currentTitle);
  };

  const handleSaveRename = async (id: string) => {
    if (!editTitle.trim()) return;
    try {
      await StorageService.renameProject(id, editTitle.trim());
      setEditingId(null);
      onRefreshProjects();
      toast.success('Project renamed successfully');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to rename project';
      toast.error(msg);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await StorageService.deleteProject(id);
      try {
        await deleteProject(id);
      } catch {
        // Project might have been local-only or already removed from backend
      }
      setConfirmDeleteId(null);
      onRefreshProjects();
      toast.success('Project deleted from storage');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete project';
      toast.error(msg);
    }
  };

  const handleExportJson = async (id: string) => {
    try {
      const jsonStr = await StorageService.exportProjectJson(id);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `circuitmind-project-${id}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Exported project JSON bundle');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      toast.error(msg);
    }
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;
        const imported = await StorageService.importProjectJson(content);
        onRefreshProjects();
        onSelectProject(imported.id);
        toast.success(`Imported "${imported.title}" successfully`);
      } catch {
        toast.error('Invalid CircuitMind project file format');
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = async () => {
    if (!window.confirm('WARNING: This will permanently erase all local IndexedDB projects, backend database records, simulation logs, and chat conversations. Are you sure?')) {
      return;
    }
    try {
      await StorageService.clearAllLocalData();
      try {
        await resetDatabase();
      } catch {
        // backend reset fallback
      }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch {
        // ignore storage access errors
      }
      onRefreshProjects();
      toast.warning('All workspace data and backend database records have been completely reset.');
      onClose();
    } catch {
      toast.error('Failed to clear storage');
    }
  };

  return (
    <div className="modal-overlay" style={{ zIndex: 1200 }} onClick={onClose}>
      <div 
        className="modal-content" 
        style={{ maxWidth: '640px', width: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }} 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <HardDrive size={18} color="var(--accent-orange)" />
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>Project & Storage Management</h3>
          </div>
          <button className="btn-icon" onClick={onClose} style={{ padding: '4px' }}>
            <X size={16} />
          </button>
        </div>

        {/* Tab switcher */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-subtle)', background: '#090d16', padding: '0 12px' }}>
          <button
            onClick={() => setActiveTab('manage')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'manage' ? '2px solid var(--accent-orange)' : '2px solid transparent',
              color: activeTab === 'manage' ? '#fff' : 'var(--text-secondary)',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            All Projects ({projectsList.length})
          </button>
          <button
            onClick={() => setActiveTab('create')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'create' ? '2px solid var(--accent-orange)' : '2px solid transparent',
              color: activeTab === 'create' ? '#fff' : 'var(--text-secondary)',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Create New Project
          </button>
          <button
            onClick={() => setActiveTab('storage')}
            style={{
              background: 'transparent',
              border: 'none',
              borderBottom: activeTab === 'storage' ? '2px solid var(--accent-orange)' : '2px solid transparent',
              color: activeTab === 'storage' ? '#fff' : 'var(--text-secondary)',
              padding: '10px 14px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Browser Storage & Data
          </button>
        </div>

        {/* Tab Body */}
        <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
          {activeTab === 'manage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Select an existing project or duplicate/export:</span>
                <label className="btn btn-secondary" style={{ fontSize: '11px', padding: '4px 10px', cursor: 'pointer' }}>
                  <Upload size={12} />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleImportJson} style={{ display: 'none' }} />
                </label>
              </div>

              {projectsList.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  No saved projects found. Create or synthesize a new project.
                </div>
              ) : (
                projectsList.map(proj => {
                  const isCurrent = currentProject?.id === proj.id;
                  const isEditing = editingId === proj.id;
                  const isConfirming = confirmDeleteId === proj.id;

                  return (
                    <div
                      key={proj.id}
                      style={{
                        background: isCurrent ? 'rgba(234, 88, 12, 0.08)' : '#0e121e',
                        border: isCurrent ? '1px solid rgba(234, 88, 12, 0.4)' : '1px solid var(--border-subtle)',
                        borderRadius: '6px',
                        padding: '12px 14px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px'
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        {isEditing ? (
                          <div style={{ display: 'flex', gap: '6px' }}>
                            <input
                              type="text"
                              value={editTitle}
                              onChange={e => setEditTitle(e.target.value)}
                              style={{
                                background: '#182032',
                                border: '1px solid var(--accent-orange)',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                fontSize: '13px',
                                flex: 1
                              }}
                            />
                            <button className="btn btn-primary" onClick={() => handleSaveRename(proj.id)} style={{ padding: '4px 8px' }}>
                              <Check size={12} />
                            </button>
                            <button className="btn btn-secondary" onClick={() => setEditingId(null)} style={{ padding: '4px 8px' }}>
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span 
                                onClick={() => { onSelectProject(proj.id); onClose(); }}
                                style={{ fontWeight: 600, color: '#fff', cursor: 'pointer', fontSize: '13.5px' }}
                              >
                                {proj.title}
                              </span>
                              <span className="version-chip">v{proj.version}</span>
                              {isCurrent && (
                                <span style={{ fontSize: '10px', background: 'var(--accent-orange)', color: '#fff', padding: '1px 5px', borderRadius: '3px', fontWeight: 700 }}>
                                  ACTIVE
                                </span>
                              )}
                            </div>
                            <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                              ID: {proj.id} • Board: {proj.board_type || 'ESP32'}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: '6px' }}>
                        {!isCurrent && (
                          <button
                            className="btn btn-secondary"
                            onClick={() => { onSelectProject(proj.id); onClose(); }}
                            style={{ fontSize: '11px', padding: '4px 8px' }}
                            title="Open project in workspace"
                          >
                            Open
                          </button>
                        )}
                        <button
                          className="btn-icon"
                          onClick={() => handleStartRename(proj.id, proj.title)}
                          title="Rename project"
                        >
                          <Edit3 size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDuplicate(proj.id)}
                          title="Duplicate project"
                        >
                          <Copy size={13} />
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleExportJson(proj.id)}
                          title="Export JSON"
                        >
                          <Download size={13} />
                        </button>

                        {isConfirming ? (
                          <div style={{ display: 'flex', gap: '4px' }}>
                            <button
                              className="btn btn-primary"
                              onClick={() => handleDelete(proj.id)}
                              style={{ background: '#ef4444', borderColor: '#ef4444', padding: '3px 6px', fontSize: '11px' }}
                            >
                              Confirm
                            </button>
                            <button
                              className="btn btn-secondary"
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ padding: '3px 6px', fontSize: '11px' }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            className="btn-icon"
                            onClick={() => setConfirmDeleteId(proj.id)}
                            title="Delete project"
                            style={{ color: 'var(--text-muted)' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Project Title *
                </label>
                <input
                  type="text"
                  placeholder="e.g., Autonomous Soil Moisture & Irrigation Controller"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Target Microcontroller Board *
                </label>
                <select
                  value={newBoard}
                  onChange={e => setNewBoard(e.target.value)}
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px'
                  }}
                >
                  <option value="esp32-devkit-v1">ESP32 DevKit V1 (Xtensa Dual-Core, 3.3V Logic, WiFi/BLE)</option>
                  <option value="arduino-uno">Arduino Uno R3 (ATmega328P, 5V Logic, 16MHz)</option>
                  <option value="raspberry-pi-pico">Raspberry Pi Pico (RP2040 Dual ARM Cortex-M0+, 3.3V)</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  System Architecture Description / Objectives
                </label>
                <textarea
                  placeholder="Describe sensor inputs, actuator outputs, and core control loop requirements..."
                  value={newDesc}
                  onChange={e => setNewDesc(e.target.value)}
                  rows={4}
                  style={{
                    width: '100%',
                    background: '#090d16',
                    border: '1px solid var(--border-subtle)',
                    color: '#fff',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    fontSize: '13px',
                    resize: 'vertical'
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '10px' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setActiveTab('manage')}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  <FolderPlus size={14} />
                  <span>{creating ? 'Creating...' : 'Initialize Project'}</span>
                </button>
              </div>
            </form>
          )}

          {activeTab === 'storage' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="card" style={{ padding: '14px', background: '#090d16' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600, color: '#fff' }}>
                  <Database size={16} color="var(--accent-orange)" />
                  <span>Browser-Native IndexedDB Architecture</span>
                </div>
                <p style={{ fontSize: '12.5px', color: 'var(--text-secondary)', lineHeight: 1.6, margin: 0 }}>
                  CircuitMind Studio operates in a local-first model. Every project, component instance, wiring connection, firmware file, simulation record, and chat transcript is securely stored in your browser's IndexedDB (database <code>CircuitMindStudio_v1</code>). Your workspace survives browser reloads and works 100% offline without mandatory cloud dependencies.
                </p>
              </div>

              <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#ef4444', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <AlertTriangle size={14} />
                  <span>Danger Zone: Local Data Cleanup</span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Clear all IndexedDB stores including projects, simulator logs, and event records.
                </p>
                <button
                  className="btn btn-secondary"
                  onClick={handleClearAllData}
                  style={{ color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.4)' }}
                >
                  <Trash2 size={13} />
                  <span>Erase All Local Data</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
