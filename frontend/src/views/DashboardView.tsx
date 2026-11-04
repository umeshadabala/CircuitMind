import React, { useState } from 'react';
import { Plus, Trash2, ShieldCheck, AlertTriangle, ArrowRight, FolderKanban, AlertCircle, X } from 'lucide-react';
import { Project } from '../types';

interface DashboardViewProps {
  projects: Project[];
  onOpenProject: (projectId: string) => void;
  onNewProject: () => void;
  onDeleteProject: (projectId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onDeleteProject,
}) => {
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  return (
    <div className="py-8 px-6 max-w-6xl mx-auto space-y-6">
      {/* Dashboard Top bar */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-mono text-xl font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 tracking-wide">
            ENGINEERING PROJECTS
          </h1>
          <div className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 font-mono mt-0.5">
            {projects.length} project(s) synchronized in local database
          </div>
        </div>

        <button
          onClick={onNewProject}
          className="flex items-center space-x-2 bg-[#356B62] hover:bg-[#2D5E56] text-white px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all shadow-md shadow-[#356B62]/20"
        >
          <Plus className="w-4 h-4" />
          <span>NEW PROJECT</span>
        </button>
      </div>

      {/* Projects List */}
      {projects.length === 0 ? (
        <div className="border border-dashed border-[#25332F] dark:border-[#25332F] border-slate-300 rounded-xl p-16 text-center space-y-4 bg-[#101720]/50 dark:bg-[#101720]/50 bg-slate-50">
          <FolderKanban className="w-12 h-12 mx-auto text-[#5B9B8D] opacity-40" />
          <div className="space-y-1">
            <h3 className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900">No Projects Found</h3>
            <p className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 max-w-sm mx-auto font-sans">
              Create your first project from a physical system idea or select one of the verified sample designs.
            </p>
          </div>
          <button
            onClick={onNewProject}
            className="bg-[#151F2B] dark:bg-[#151F2B] bg-white hover:bg-[#25332F] text-white dark:text-white text-slate-800 border border-[#25332F] dark:border-[#25332F] border-slate-300 px-4 py-2 rounded-lg font-mono text-xs font-semibold"
          >
            Create Initial Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((proj) => {
            const drcValid = proj.validation_report?.valid;
            const errorCount = proj.validation_report?.findings?.filter((f) => f.severity === 'ERROR').length || 0;

            return (
              <div
                key={proj.id}
                className="bg-[#101720] dark:bg-[#101720] bg-white border border-[#25332F] dark:border-[#25332F] border-slate-200 hover:border-[#356B62] rounded-xl p-5 flex flex-col justify-between space-y-4 group transition-all"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 text-[#96A6A3] px-2 py-0.5 rounded border border-[#25332F] dark:border-[#25332F] border-slate-200">
                      {proj.target_board}
                    </span>
                    <span className="font-mono text-[10px] text-[#96A6A3] font-bold">
                      REV {proj.revision}
                    </span>
                  </div>

                  <h3
                    onClick={() => onOpenProject(proj.id)}
                    className="font-mono text-sm font-bold text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-900 group-hover:text-[#5B9B8D] transition-colors cursor-pointer truncate"
                  >
                    {proj.name}
                  </h3>

                  <p className="text-xs text-[#96A6A3] dark:text-[#96A6A3] text-slate-600 font-sans line-clamp-2">
                    {proj.description || 'No description provided.'}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-[#25332F]/60 dark:border-[#25332F]/60 border-slate-200/60 font-mono text-xs">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">Components:</span>
                    <span className="text-[#F1F5F4] dark:text-[#F1F5F4] text-slate-800">{proj.components.length} parts</span>
                  </div>

                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#96A6A3] dark:text-[#96A6A3] text-slate-500">DRC Status:</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold ${
                        drcValid ? 'text-emerald-400' : 'text-rose-400'
                      }`}
                    >
                      {drcValid ? <ShieldCheck className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      {drcValid ? 'Passed' : `${errorCount} error(s)`}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => onOpenProject(proj.id)}
                      className="flex items-center space-x-1.5 text-xs text-[#5B9B8D] hover:text-white font-mono font-semibold transition-colors"
                    >
                      <span>OPEN WORKSPACE</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setProjectToDelete(proj);
                      }}
                      className="text-[#96A6A3] hover:text-rose-400 p-1.5 rounded transition-colors"
                      title="Delete project"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Explicit Project Deletion Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#101720] dark:bg-[#101720] bg-white border border-rose-900/60 rounded-xl max-w-md w-full p-6 space-y-5 shadow-2xl animate-in fade-in zoom-in duration-150">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-lg bg-rose-950/50 border border-rose-800/80 flex items-center justify-center text-rose-400 flex-shrink-0">
                  <AlertCircle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-mono text-sm font-bold text-white dark:text-white text-slate-900">Permanently Delete Project</h3>
                  <div className="text-[11px] font-mono text-rose-400">Irreversible Action</div>
                </div>
              </div>
              <button
                onClick={() => setProjectToDelete(null)}
                className="text-[#96A6A3] hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-xs font-sans text-slate-300 dark:text-slate-300 text-slate-700 bg-[#151F2B] dark:bg-[#151F2B] bg-slate-50 p-3.5 rounded-lg border border-[#25332F] dark:border-[#25332F] border-slate-200">
              <div className="font-mono text-xs text-white dark:text-white text-slate-900 font-semibold">
                Project: <span className="text-[#5B9B8D]">{projectToDelete.name}</span> (Rev {projectToDelete.revision})
              </div>
              <p className="text-[11px] text-[#96A6A3] dark:text-[#96A6A3] text-slate-500 leading-relaxed">
                The canonical project graph, wiring netlists, pin assignments, generated firmware, and simulation traces will be permanently removed from local SQLite storage.
              </p>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2">
              <button
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 rounded-lg font-mono text-xs text-[#96A6A3] hover:text-white bg-[#151F2B] dark:bg-[#151F2B] bg-slate-100 hover:bg-[#25332F] border border-[#25332F] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const id = projectToDelete.id;
                  setProjectToDelete(null);
                  onDeleteProject(id);
                }}
                className="px-4 py-2 rounded-lg font-mono text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 shadow-lg shadow-rose-900/30 transition-colors"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
