import React, { useState, useEffect } from 'react';
import { Project, ComponentCatalogItem } from '../types';
import { fetchCatalogComponents, deleteComponentFromProject } from '../api/client';
import { useToast } from '../context/ToastContext';
import { getComponentDisplayLabel } from '../utils/componentNaming';
import { 
  Cpu, 
  ExternalLink, 
  Search, 
  FileText,
  Trash2
} from 'lucide-react';

interface ComponentsViewProps {
  project: Project;
  onUpdateProject?: (updated: Project) => void;
}

export const ComponentsView: React.FC<ComponentsViewProps> = ({ project, onUpdateProject }) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'project_bom' | 'global_catalog'>('project_bom');
  const [catalogItems, setCatalogItems] = useState<ComponentCatalogItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  useEffect(() => {
    if (activeTab === 'global_catalog' && catalogItems.length === 0) {
      setLoadingCatalog(true);
      fetchCatalogComponents()
        .then(setCatalogItems)
        .catch((err) => console.error('Failed to load component catalog:', err))
        .finally(() => setLoadingCatalog(false));
    }
  }, [activeTab, catalogItems.length]);

  const filteredCatalog = catalogItems.filter((item) => {
    const matchesSearch = 
      item.canonical_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.part_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.manufacturer && item.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || item.category.toLowerCase() === selectedCategory.toLowerCase();
    return matchesSearch && matchesCat;
  });

  const handleDeleteComp = async (compId: string) => {
    try {
      const updated = await deleteComponentFromProject(project.id, compId);
      if (onUpdateProject) onUpdateProject(updated);
      toast.info(`Removed component '${compId}' from BOM`, 'Component Deleted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete component', 'Delete Error');
    }
  };

  return (
    <div className="view-container">
      {/* Header and View Toggle */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#fff' }}>Component Catalog & Engineering BOM</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Data-driven component registry backed by manufacturer datasheets and physical characteristics.
          </p>
        </div>

        {/* Tab switch */}
        <div style={{ display: 'flex', background: '#121218', padding: '4px', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setActiveTab('project_bom')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'project_bom' ? 'var(--accent-orange)' : 'transparent',
              color: activeTab === 'project_bom' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Project BOM ({project.components.length})
          </button>
          <button
            onClick={() => setActiveTab('global_catalog')}
            style={{
              padding: '6px 14px',
              borderRadius: '6px',
              border: 'none',
              background: activeTab === 'global_catalog' ? 'var(--accent-orange)' : 'transparent',
              color: activeTab === 'global_catalog' ? '#fff' : 'var(--text-secondary)',
              fontSize: '12.5px',
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Data-Driven Catalog Registry
          </button>
        </div>
      </div>

      {/* 1. PROJECT BOM VIEW */}
      {activeTab === 'project_bom' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 300px), 1fr))', gap: '16px' }}>
          {/* Microcontroller Board Card */}
          <div className="card" style={{ borderColor: 'var(--accent-orange-glow)', background: 'linear-gradient(135deg, #14141d 0%, #171317 100%)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Cpu size={18} color="var(--accent-orange)" />
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{project.board.display_name}</h3>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px' }}>
              {project.board.architecture}
            </div>
            <div style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
              <div><strong>Logic Voltage:</strong> {project.board.voltage_logic}V TTL</div>
              <div><strong>Supply Voltage:</strong> {project.board.voltage_supply}V via USB / VIN</div>
              <div><strong>Available Pins:</strong> {project.board.pins_available?.length || 29} Header Pins</div>
            </div>
          </div>

          {/* Project Component Instances */}
          {project.components.length === 0 ? (
            <div style={{ gridColumn: '1 / -1', padding: '36px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}>
              No components placed in this project yet. Use Circuit Canvas to place parts or prompt the AI Copilot.
            </div>
          ) : (
            project.components.map((comp) => {
              const compPins = project.pin_assignments.filter((pa) => pa.component_id === comp.id);

              return (
                <div key={comp.id} className="card">
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div>
                      <h3 style={{ fontSize: '14px', fontWeight: 700, color: '#fff' }}>{getComponentDisplayLabel(comp.id, project)}</h3>
                      <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>part_id: {comp.part_id}</span>
                    </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ 
                      fontSize: '10px', 
                      background: 'rgba(255,255,255,0.06)', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      textTransform: 'uppercase', 
                      color: 'var(--accent-orange)' 
                    }}>
                      {comp.category}
                    </span>
                    {onUpdateProject && (
                      <button 
                        onClick={() => handleDeleteComp(comp.id)}
                        title={`Remove ${comp.name} from project`}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: 'var(--text-muted)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                        onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-muted)')}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>

                {comp.description && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {comp.description}
                  </p>
                )}

                {/* Pin Mapping for this component */}
                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                    Pin Connections:
                  </span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
                    {compPins.map((pa, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', fontFamily: 'var(--font-mono)', background: 'rgba(255,255,255,0.02)', padding: '3px 6px', borderRadius: '4px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>{pa.component_pin}</span>
                        <span style={{ color: 'var(--accent-orange)' }}>➔ {pa.board_pin} ({pa.signal_type})</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      )}

      {/* 2. GLOBAL COMPONENT REGISTRY CATALOG VIEW */}
      {activeTab === 'global_catalog' && (
        <div>
          {/* Search & Filter Bar */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: '1', minWidth: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input
                type="text"
                placeholder="Search catalog by name, part ID, manufacturer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 10px 8px 32px',
                  background: '#121218',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  color: '#fff',
                  fontSize: '13px'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {['all', 'sensor', 'actuator', 'display', 'passive', 'input'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-subtle)',
                    background: selectedCategory === cat ? 'rgba(245, 158, 11, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                    color: selectedCategory === cat ? 'var(--accent-orange)' : 'var(--text-secondary)',
                    fontSize: '11.5px',
                    cursor: 'pointer',
                    textTransform: 'capitalize'
                  }}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {loadingCatalog ? (
            <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
              Loading data-driven component registry...
            </div>
          ) : filteredCatalog.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}>
              No components found in catalogue matching "{searchQuery}" {selectedCategory !== 'all' ? `(Category: ${selectedCategory})` : ''}.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(min(100%, 340px), 1fr))', gap: '16px' }}>
              {filteredCatalog.map((item) => (
                <div key={item.part_id} className="card" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div>
                      <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#fff', margin: 0 }}>
                        {item.canonical_name}
                      </h4>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                        ID: {item.part_id} {item.manufacturer && `• ${item.manufacturer}`}
                      </div>
                    </div>
                    <span style={{ 
                      fontSize: '10px', 
                      background: 'rgba(245, 158, 11, 0.15)', 
                      color: 'var(--accent-orange)', 
                      padding: '2px 6px', 
                      borderRadius: '4px', 
                      textTransform: 'uppercase' 
                    }}>
                      {item.category}
                    </span>
                  </div>

                  {/* Electrical Characteristics */}
                  <div style={{ 
                    background: 'rgba(0,0,0,0.25)', 
                    padding: '8px 10px', 
                    borderRadius: '6px', 
                    fontSize: '11.5px', 
                    margin: '8px 0',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '4px'
                  }}>
                    {item.electrical_characteristics && Object.entries(item.electrical_characteristics).slice(0, 4).map(([k, v]) => (
                      <div key={k} style={{ color: 'var(--text-secondary)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{k.replace(/_/g, ' ')}:</span> {String(v)}
                      </div>
                    ))}
                  </div>

                  {/* Pin count & Simulator Part */}
                  <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <span>Pins: <strong>{item.pins ? item.pins.length : 0} defined</strong></span>
                    {item.wokwi_part_id && (
                      <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        Wokwi: <code>{item.wokwi_part_id}</code>
                      </span>
                    )}
                  </div>

                  {/* Datasheet Link */}
                  {item.datasheet_url && (
                    <div style={{ marginTop: 'auto', paddingTop: '10px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <a 
                        href={item.datasheet_url} 
                        target="_blank" 
                        rel="noreferrer"
                        style={{ fontSize: '11.5px', color: 'var(--accent-orange)', display: 'flex', alignItems: 'center', gap: '4px', textDecoration: 'none' }}
                      >
                        <FileText size={12} />
                        <span>Official Datasheet</span>
                        <ExternalLink size={10} />
                      </a>
                      {item.firmware_libraries && item.firmware_libraries.length > 0 && (
                        <span style={{ fontSize: '10.5px', color: 'var(--text-muted)' }}>
                          Lib: {item.firmware_libraries[0]}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
