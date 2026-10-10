import React from 'react';
import { 
  LayoutDashboard, 
  PlusCircle,
  Share2, 
  FileText,
  Cpu, 
  Code2, 
  PlayCircle, 
  BookOpen, 
  Database,
  PanelLeftClose,
  PanelLeftOpen,
  X,
  Sparkles
} from 'lucide-react';
import { Project } from '../types';
import { TabType } from '../types';
export type { TabType };

interface SidebarProps {
  currentRoute: string; // e.g. '#/', '#/new', '#/project/...'
  onNavigate: (route: string) => void;
  project: Project | null;
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  unresolvedDefects?: boolean;
  isOpenOnMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentRoute,
  onNavigate,
  project,
  currentTab, 
  onSelectTab,
  isCollapsed,
  onToggleCollapse,
  unresolvedDefects = false,
  isOpenOnMobile = false,
  onCloseMobile
}) => {
  const isDashboard = currentRoute === '#/dashboard';
  const isLanding = currentRoute === '#/' || currentRoute === '' || currentRoute === '#' || currentRoute === '#/landing';
  const isNewProject = currentRoute === '#/new';
  const isWorkspace = currentRoute.startsWith('#/project');

  const workspaceTabs = [
    { id: 'wiring', label: 'Circuit Canvas', icon: Share2 },
    { id: 'overview', label: 'Architecture & Specs', icon: FileText },
    { id: 'components', label: 'Components & BOM', icon: Cpu },
    { id: 'firmware', label: 'Firmware Editor', icon: Code2 },
    { 
      id: 'simulation', 
      label: 'Simulation & Tests', 
      icon: PlayCircle,
      badge: unresolvedDefects ? '!' : undefined,
      badgeColor: 'var(--status-error)'
    },
    { id: 'guide', label: 'Assembly Guide', icon: BookOpen },
    { id: 'memory', label: 'Engineering Memory', icon: Database }
  ];

  return (
    <aside 
      className={`sidebar ${isCollapsed ? 'collapsed' : ''} ${isOpenOnMobile ? 'mobile-open' : ''}`}
      aria-label="Application Navigation"
    >
      {/* Top Header Row with Title & Collapse Toggle */}
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: isCollapsed ? 'center' : 'space-between', 
        padding: isCollapsed ? '6px 0 10px 0' : '4px 6px 10px 8px',
        borderBottom: '1px solid var(--border-subtle)',
        marginBottom: '8px'
      }}>
        {!isCollapsed && (
          <span style={{ 
            fontSize: '11px', 
            fontWeight: 700, 
            letterSpacing: '0.6px', 
            color: 'var(--text-muted)', 
            textTransform: 'uppercase' 
          }}>
            Navigation
          </span>
        )}

        {/* Mobile Close Button */}
        {isOpenOnMobile ? (
          <button 
            className="btn-icon" 
            onClick={onCloseMobile}
            title="Close navigation drawer"
            style={{ padding: '4px' }}
          >
            <X size={16} />
          </button>
        ) : (
          /* Desktop Collapse / Expand Button */
          <button
            className="btn-icon"
            onClick={onToggleCollapse}
            title={isCollapsed ? "Expand sidebar (Ctrl+[)" : "Collapse sidebar (Ctrl+[)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            style={{ 
              padding: '5px', 
              color: 'var(--text-muted)',
              borderRadius: '6px'
            }}
          >
            {isCollapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
          </button>
        )}
      </div>

      {/* Main Global Navigation Links */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
        <button
          className={`nav-item ${isLanding ? 'active' : ''}`}
          onClick={() => {
            onNavigate('#/');
            if (onCloseMobile) onCloseMobile();
          }}
          title={isCollapsed ? "Overview Landing Page" : undefined}
          aria-label="Overview Landing Page"
        >
          <Sparkles size={16} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Landing Page</span>}
        </button>

        <button
          className={`nav-item ${isDashboard ? 'active' : ''}`}
          onClick={() => {
            onNavigate('#/dashboard');
            if (onCloseMobile) onCloseMobile();
          }}
          title={isCollapsed ? "Project Dashboard" : undefined}
          aria-label="Project Dashboard"
        >
          <LayoutDashboard size={16} style={{ flexShrink: 0 }} />
          {!isCollapsed && <span>Dashboard</span>}
        </button>
      </div>

      {/* Workspace Context & Tabs (Visible when project is loaded) */}
      {project && (
        <>
          <div className="sidebar-divider" style={{ margin: '8px 0' }} />

          {!isCollapsed && (
            <div style={{ 
              padding: '4px 8px 6px', 
              fontSize: '11px', 
              fontWeight: 700, 
              color: 'var(--text-muted)', 
              textTransform: 'uppercase', 
              letterSpacing: '0.6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <span>Workspace</span>
              <span className="version-chip" style={{ fontSize: '9px', padding: '1px 4px' }}>v{project.version}</span>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            {workspaceTabs.map((tab) => {
              const Icon = tab.icon;
              const isActive = isWorkspace && currentTab === tab.id;

              return (
                <button
                  key={tab.id}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  onClick={() => {
                    if (!isWorkspace) {
                      onNavigate(`#/project/${project.id}`);
                    }
                    onSelectTab(tab.id as TabType);
                    if (onCloseMobile) onCloseMobile();
                  }}
                  title={isCollapsed ? tab.label : undefined}
                  aria-label={tab.label}
                >
                  <Icon size={16} style={{ flexShrink: 0 }} />
                  {!isCollapsed && <span>{tab.label}</span>}
                  {!isCollapsed && tab.badge && (
                    <span style={{ 
                      background: tab.badgeColor, 
                      color: '#fff', 
                      fontSize: '10px', 
                      fontWeight: 700, 
                      padding: '1px 5px', 
                      borderRadius: '4px',
                      marginLeft: 'auto'
                    }}>
                      {tab.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </>
      )}

      {/* Persistent Bottom Footer */}
      {!isCollapsed ? (
        <div className="sidebar-footer">
          <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Database size={12} color="var(--accent-orange)" />
            <span>Project Memory Layer</span>
          </div>
          <div>Persistent Event Graph in IndexedDB & SQLite.</div>
        </div>
      ) : (
        <div style={{ marginTop: 'auto', padding: '12px 0', textAlign: 'center' }}>
          <span 
            title="Project Memory Layer Active" 
            style={{ display: 'inline-block', cursor: 'pointer' }}
            onClick={() => {
              if (project) {
                onNavigate(`#/project/${project.id}`);
                onSelectTab('memory');
              }
            }}
          >
            <Database size={16} color="var(--accent-orange)" />
          </span>
        </div>
      )}
    </aside>
  );
};
