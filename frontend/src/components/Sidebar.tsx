import React from 'react';
import { 
  LayoutDashboard, 
  Cpu, 
  Share2, 
  Code2, 
  PlayCircle, 
  CheckSquare, 
  BookOpen, 
  Database,
  Bug,
  Sliders
} from 'lucide-react';

export type TabType = 
  | 'overview' 
  | 'components' 
  | 'wiring' 
  | 'firmware' 
  | 'simulation' 
  | 'verification' 
  | 'guide' 
  | 'memory';

interface SidebarProps {
  currentTab: TabType;
  onSelectTab: (tab: TabType) => void;
  hasErrors?: boolean;
  unresolvedDefects?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab,
  hasErrors = false,
  unresolvedDefects = false
}) => {
  const tabs = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'components', label: 'Components', icon: Cpu },
    { id: 'wiring', label: 'Wiring Schematic', icon: Share2 },
    { id: 'firmware', label: 'Firmware Code', icon: Code2 },
    { id: 'simulation', label: 'Simulation', icon: PlayCircle },
    { 
      id: 'verification', 
      label: 'Verification & Tests', 
      icon: CheckSquare,
      badge: unresolvedDefects ? '!' : undefined,
      badgeColor: 'var(--status-error)'
    },
    { id: 'guide', label: 'Assembly Guide', icon: BookOpen },
    { id: 'memory', label: 'DMAI Memory', icon: Database }
  ];

  return (
    <aside className="sidebar">
      <div style={{ padding: '4px 8px 10px', fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        IDE Workspace
      </div>

      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = currentTab === tab.id;
        return (
          <button
            key={tab.id}
            className={`nav-item ${isActive ? 'active' : ''}`}
            onClick={() => onSelectTab(tab.id as TabType)}
          >
            <Icon size={16} />
            <span style={{ flex: 1 }}>{tab.label}</span>
            {tab.badge && (
              <span style={{ 
                background: tab.badgeColor, 
                color: '#fff', 
                fontSize: '10px', 
                fontWeight: 700, 
                padding: '1px 5px', 
                borderRadius: '4px' 
              }}>
                {tab.badge}
              </span>
            )}
          </button>
        );
      })}

      <div className="sidebar-divider" />

      <div style={{ marginTop: 'auto', padding: '12px 8px', fontSize: '11px', color: 'var(--text-muted)', background: 'rgba(255,255,255,0.02)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
        <div style={{ fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <Database size={12} color="var(--accent-orange)" />
          <span>DevMemoryAI</span>
        </div>
        <div>Persistent Event Graph active in local SQLite.</div>
      </div>
    </aside>
  );
};
