import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Project, ComponentCatalogItem } from '../types';
import { 
  Plus, 
  Trash2, 
  RotateCw, 
  Save, 
  Undo, 
  Redo, 
  ZoomIn, 
  ZoomOut, 
  Maximize2, 
  Grid, 
  Copy, 
  Check, 
  Cpu, 
  Layers, 
  X,
  Search
} from 'lucide-react';
import { 
  updateProjectLayout, 
  addComponentToProject, 
  deleteComponentFromProject, 
  addConnectionToProject, 
  deleteConnectionFromProject,
  fetchCatalogComponents
} from '../api/client';
import { useToast } from '../context/ToastContext';
import { getComponentDisplayLabel, formatTerminalLabel } from '../utils/componentNaming';

interface WiringViewProps {
  project: Project;
  onUpdateProject?: (updated: Project) => void;
}

interface ComponentPos {
  x: number;
  y: number;
  rotation: number;
}

interface WiringState {
  fromComponent: string;
  fromPin: string;
  startX: number;
  startY: number;
}

export const WiringView: React.FC<WiringViewProps> = ({ project, onUpdateProject }) => {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<'canvas' | 'table' | 'wokwi_json'>('canvas');

  // Canvas Viewport Transform
  const [zoom, setZoom] = useState<number>(1);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 40, y: 30 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [snapToGrid, setSnapToGrid] = useState<boolean>(true);

  // Component Positions State
  const [positions, setPositions] = useState<Record<string, ComponentPos>>(() => {
    const initial: Record<string, ComponentPos> = {};
    // Board position
    initial['board'] = { x: 80, y: 80, rotation: 0 };
    // Component positions
    project.components.forEach((c, idx) => {
      initial[c.id] = {
        x: c.position_x ?? (440 + (idx % 2) * 220),
        y: c.position_y ?? (70 + Math.floor(idx / 2) * 160),
        rotation: c.rotation ?? 0
      };
    });
    return initial;
  });

  // Dragging State
  const [draggingCompId, setDraggingCompId] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Wiring In-Progress State
  const [wiringState, setWiringState] = useState<WiringState | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // Selection State
  const [selectedCompId, setSelectedCompId] = useState<string | null>(null);
  const [selectedConnId, setSelectedConnId] = useState<string | null>(null);

  // Add Component Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [catalogItems, setCatalogItems] = useState<ComponentCatalogItem[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogCategory, setCatalogCategory] = useState<string>('all');
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // History Stack for Undo/Redo
  const [history, setHistory] = useState<Array<Record<string, ComponentPos>>>([]);
  const [redoStack, setRedoStack] = useState<Array<Record<string, ComponentPos>>>([]);

  // Clipboard Copied State
  const [copied, setCopied] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const isArduino = project.board.type.includes('arduino');
  const boardLeftPins = isArduino
    ? ['5V', '3V3', 'GND', 'VIN', 'RESET', 'A0', 'A1', 'A2', 'A3', 'A4', 'A5']
    : ['3V3', 'GND', 'D15', 'D2', 'D4', 'D5', 'D18', 'D19', 'D21', 'D22', 'D23'];
  const boardRightPins = isArduino
    ? ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', 'GND.2', 'AREF']
    : ['VIN', 'GND.2', 'TX0', 'RX0', 'D32', 'D33', 'D25', 'D26', 'D27', 'D14', 'D12', 'D13'];

  // Reset positions on project ID switch to prevent component/connection leakage
  useEffect(() => {
    const next: Record<string, ComponentPos> = {};
    next['board'] = { x: 80, y: 80, rotation: 0 };
    project.components.forEach((c, idx) => {
      next[c.id] = {
        x: c.position_x ?? (440 + (idx % 2) * 220),
        y: c.position_y ?? (70 + Math.floor(idx / 2) * 160),
        rotation: c.rotation ?? 0
      };
    });
    setPositions(next);
    setSelectedCompId(null);
    setSelectedConnId(null);
    setWiringState(null);
    setHistory([]);
    setRedoStack([]);
  }, [project.id]);

  // Sync positions when project components change in same project
  useEffect(() => {
    setPositions((prev) => {
      const next = { ...prev };
      if (!next['board']) next['board'] = { x: 80, y: 80, rotation: 0 };
      project.components.forEach((c, idx) => {
        if (!next[c.id]) {
          next[c.id] = {
            x: c.position_x ?? (440 + (idx % 2) * 220),
            y: c.position_y ?? (70 + Math.floor(idx / 2) * 160),
            rotation: c.rotation ?? 0
          };
        }
      });
      return next;
    });
  }, [project.components]);

  // Load catalog for add modal
  useEffect(() => {
    if (isAddModalOpen && catalogItems.length === 0) {
      setLoadingCatalog(true);
      fetchCatalogComponents()
        .then((items) => setCatalogItems(items))
        .catch((e) => console.error(e))
        .finally(() => setLoadingCatalog(false));
    }
  }, [isAddModalOpen, catalogItems.length]);

  // Helper: Grid Snapping
  const snap = (val: number, step: number = 20) => {
    return snapToGrid ? Math.round(val / step) * step : val;
  };

  // Screen to Canvas Coordinates Converter
  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    return {
      x: (clientX - rect.left - pan.x) / zoom,
      y: (clientY - rect.top - pan.y) / zoom
    };
  }, [pan, zoom]);

  // Push history step
  const pushHistory = (snapshot?: Record<string, ComponentPos>) => {
    setHistory((prev) => [...prev.slice(-20), snapshot || positions]);
    setRedoStack([]);
  };

  // Undo / Redo
  const handleUndo = () => {
    if (history.length === 0) return;
    const prev = history[history.length - 1];
    setRedoStack((r) => [...r, positions]);
    setPositions(prev);
    setHistory((h) => h.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setHistory((h) => [...h, positions]);
    setPositions(next);
    setRedoStack((r) => r.slice(0, -1));
  };

  // Mouse Handlers for Pan & Drag
  const handleMouseDown = (e: React.MouseEvent) => {
    // If clicking background, start pan
    if (e.target === svgRef.current || (e.target as HTMLElement).tagName === 'svg') {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
      setSelectedCompId(null);
      setSelectedConnId(null);
      if (wiringState) setWiringState(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvasPos = getCanvasCoords(e.clientX, e.clientY);
    setMouseCanvasPos(canvasPos);

    if (isPanning) {
      setPan({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y
      });
    } else if (draggingCompId) {
      setPositions((prev) => {
        const cur = prev[draggingCompId] || { x: 0, y: 0, rotation: 0 };
        return {
          ...prev,
          [draggingCompId]: {
            ...cur,
            x: snap(canvasPos.x - dragOffset.x),
            y: snap(canvasPos.y - dragOffset.y)
          }
        };
      });
    }
  };

  const handleMouseUp = () => {
    if (isPanning) {
      setIsPanning(false);
    }
    if (draggingCompId) {
      pushHistory(positions);
      setDraggingCompId(null);
    }
  };

  // Zoom Handlers
  const handleZoom = (delta: number) => {
    setZoom((prev) => Math.min(2.2, Math.max(0.4, Number((prev + delta).toFixed(2)))));
  };

  const handleResetView = () => {
    setZoom(1);
    setPan({ x: 40, y: 30 });
  };

  // Save Layout to Backend
  const handleSaveLayout = async () => {
    try {
      await updateProjectLayout(project.id, { zoom, pan }, positions);
      toast.success('Circuit diagram layout saved to project memory.', 'Layout Saved');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to save layout', 'Save Error');
    }
  };

  // Rotate Selected Component
  const handleRotate = (compId: string) => {
    setPositions((prev) => {
      const cur = prev[compId] || { x: 100, y: 100, rotation: 0 };
      const nextRot = (cur.rotation + 90) % 360;
      const updated = {
        ...prev,
        [compId]: { ...cur, rotation: nextRot }
      };
      pushHistory(updated);
      return updated;
    });
  };

  // Pin Absolute Position Calculator
  const getPinCoordinates = (compId: string, pinName: string): { x: number; y: number } => {
    const pos = positions[compId] || { x: 100, y: 100, rotation: 0 };

    if (compId === 'board') {
      const lIdx = boardLeftPins.indexOf(pinName);
      if (lIdx !== -1) {
        return { x: pos.x, y: pos.y + 40 + lIdx * 20 };
      }
      const rIdx = boardRightPins.indexOf(pinName);
      if (rIdx !== -1) {
        return { x: pos.x + 180, y: pos.y + 40 + rIdx * 20 };
      }
      return { x: pos.x + 90, y: pos.y };
    }

    // Component Pins: Distributed along bottom or sides
    const comp = project.components.find((c) => c.id === compId);
    if (!comp) return { x: pos.x + 70, y: pos.y + 35 };

    const pinList = comp.pins || ['1', '2'];
    const pIdx = pinList.indexOf(pinName);
    const count = pinList.length;

    const spacing = 140 / Math.max(count + 1, 2);
    const offsetX = spacing * ((pIdx !== -1 ? pIdx : 0) + 1);

    return {
      x: pos.x + offsetX,
      y: pos.y + 70
    };
  };

  // Pin Wiring Start & Drop
  const handlePinClick = async (compId: string, pinName: string, e: React.MouseEvent) => {
    e.stopPropagation();

    if (!wiringState) {
      // Start Wiring
      const coords = getPinCoordinates(compId, pinName);
      setWiringState({
        fromComponent: compId,
        fromPin: pinName,
        startX: coords.x,
        startY: coords.y
      });
      toast.info(`Wiring from ${compId}:${pinName}. Click target pin to connect.`, 'Wiring Active');
    } else {
      // Complete Wiring
      if (wiringState.fromComponent === compId && wiringState.fromPin === pinName) {
        setWiringState(null);
        return;
      }

      try {
        const updated = await addConnectionToProject(
          project.id,
          wiringState.fromComponent,
          wiringState.fromPin,
          compId,
          pinName
        );
        if (onUpdateProject) onUpdateProject(updated);
        toast.success(`Connected ${wiringState.fromComponent}:${wiringState.fromPin} to ${compId}:${pinName}`, 'Wire Connected');
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : 'Connection failed', 'Wiring Error');
      } finally {
        setWiringState(null);
      }
    }
  };

  // Delete Selected Connection
  const handleDeleteConnection = async (connId: string) => {
    try {
      const updated = await deleteConnectionFromProject(project.id, connId);
      if (onUpdateProject) onUpdateProject(updated);
      setSelectedConnId(null);
      toast.info('Removed wire connection.', 'Wire Deleted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to delete connection', 'Delete Error');
    }
  };

  // Delete Selected Component
  const handleDeleteComponent = async (compId: string) => {
    if (compId === 'board') return;
    try {
      const updated = await deleteComponentFromProject(project.id, compId);
      if (onUpdateProject) onUpdateProject(updated);
      setSelectedCompId(null);
      toast.info(`Removed component '${compId}' and related connections.`, 'Component Deleted');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to remove component', 'Delete Error');
    }
  };

  // Add Component from Catalog
  const handleAddCatalogPart = async (partId: string) => {
    try {
      const updated = await addComponentToProject(
        project.id,
        partId,
        undefined,
        420 + Math.random() * 80,
        140 + Math.random() * 80
      );
      if (onUpdateProject) onUpdateProject(updated);
      setIsAddModalOpen(false);
      toast.success(`Added ${partId} to circuit canvas!`, 'Component Added');
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to add component', 'Add Error');
    }
  };

  // Copy Wokwi diagram JSON
  const copyWokwiJson = () => {
    const payload = {
      version: 1,
      author: "CircuitMind AI Engineering IDE",
      editor: "wokwi",
      parts: [
        { 
          type: project.board.type.includes('esp32') ? "wokwi-esp32-devkit-v1" : "wokwi-arduino-uno", 
          id: "board", 
          top: Math.round(positions['board']?.y || 80), 
          left: Math.round(positions['board']?.x || 80), 
          attrs: {} 
        },
        ...project.components.map((c) => ({
          type: c.part_id === "hc-sr04" ? "wokwi-hc-sr04" : (c.part_id.includes("led") ? "wokwi-led" : (c.part_id.includes("buzzer") ? "wokwi-buzzer" : `wokwi-${c.part_id}`)),
          id: c.id,
          top: Math.round(positions[c.id]?.y || 120),
          left: Math.round(positions[c.id]?.x || 380),
          attrs: c.attributes || {}
        }))
      ],
      connections: project.connections.map(c => [
        `${c.from_component}:${c.from_pin}`,
        `${c.to_component}:${c.to_pin}`,
        c.color || "orange",
        ["v0"]
      ])
    };

    navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
    setCopied(true);
    toast.success('Wokwi diagram.json copied to clipboard!', 'Export Ready');
    setTimeout(() => setCopied(false), 2000);
  };

  // Keyboard Shortcuts (Delete, Undo, Redo, Zoom)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedConnId) {
        handleDeleteConnection(selectedConnId);
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCompId && selectedCompId !== 'board') {
        handleDeleteComponent(selectedCompId);
      } else if (e.key === 'z' && (e.metaKey || e.ctrlKey) && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if ((e.key === 'y' && (e.metaKey || e.ctrlKey)) || (e.key === 'z' && (e.metaKey || e.ctrlKey) && e.shiftKey)) {
        e.preventDefault();
        handleRedo();
      } else if (e.key === '+' || e.key === '=') {
        handleZoom(0.1);
      } else if (e.key === '-') {
        handleZoom(-0.1);
      } else if (e.key === '0' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleResetView();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedConnId, selectedCompId, history, redoStack, handleDeleteConnection, handleDeleteComponent, handleUndo, handleRedo]);

  const selectedConn = project.connections.find((c) => c.id === selectedConnId);
  const selectedComp = project.components.find((c) => c.id === selectedCompId);

  return (
    <div className="view-container" style={{ padding: '0', display: 'flex', flexDirection: 'column', height: '100%', minHeight: 'calc(100vh - 120px)' }}>
      {/* CAD Toolbar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '10px 16px',
        background: '#0d0d14',
        borderBottom: '1px solid var(--border-subtle)',
        flexWrap: 'wrap',
        gap: '10px',
        zIndex: 10
      }}>
        {/* Left: View Modes */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <button 
            className={`btn ${viewMode === 'canvas' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('canvas')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <Layers size={14} />
            <span>Interactive Canvas</span>
          </button>
          <button 
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('table')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <span>Netlist Table</span>
          </button>
          <button 
            className={`btn ${viewMode === 'wokwi_json' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setViewMode('wokwi_json')}
            style={{ fontSize: '12px', padding: '6px 12px' }}
          >
            <span>Wokwi diagram.json</span>
          </button>
        </div>

        {/* Center: CAD Controls (Canvas only) */}
        {viewMode === 'canvas' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255,255,255,0.03)', padding: '3px 8px', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
            <button 
              className="btn btn-secondary" 
              onClick={() => setIsAddModalOpen(true)}
              style={{ fontSize: '12px', padding: '5px 10px', background: 'var(--accent-orange)', color: '#fff', borderColor: 'transparent' }}
              title="Add hardware component from catalog"
            >
              <Plus size={14} />
              <span>Add Part</span>
            </button>

            <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />

            <button className="btn btn-secondary" onClick={() => handleZoom(0.1)} style={{ padding: '5px' }} title="Zoom In (+)">
              <ZoomIn size={14} />
            </button>
            <span style={{ fontSize: '11px', fontFamily: 'var(--font-mono)', minWidth: '40px', textAlign: 'center', color: 'var(--text-secondary)' }}>
              {Math.round(zoom * 100)}%
            </span>
            <button className="btn btn-secondary" onClick={() => handleZoom(-0.1)} style={{ padding: '5px' }} title="Zoom Out (-)">
              <ZoomOut size={14} />
            </button>
            <button className="btn btn-secondary" onClick={handleResetView} style={{ padding: '5px' }} title="Reset View (100%)">
              <Maximize2 size={14} />
            </button>

            <div style={{ width: '1px', height: '18px', background: 'var(--border-subtle)', margin: '0 4px' }} />

            <button 
              className={`btn ${snapToGrid ? 'btn-primary' : 'btn-secondary'}`} 
              onClick={() => setSnapToGrid(!snapToGrid)} 
              style={{ padding: '5px' }} 
              title={snapToGrid ? "Snap to Grid: ON" : "Snap to Grid: OFF"}
            >
              <Grid size={14} />
            </button>

            <button className="btn btn-secondary" onClick={handleUndo} disabled={history.length === 0} style={{ padding: '5px' }} title="Undo (Cmd+Z)">
              <Undo size={14} />
            </button>
            <button className="btn btn-secondary" onClick={handleRedo} disabled={redoStack.length === 0} style={{ padding: '5px' }} title="Redo (Cmd+Shift+Z)">
              <Redo size={14} />
            </button>
          </div>
        )}

        {/* Right: Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {viewMode === 'canvas' && (
            <button className="btn btn-secondary" onClick={handleSaveLayout} style={{ fontSize: '12px', padding: '6px 12px' }}>
              <Save size={14} />
              <span>Save Layout</span>
            </button>
          )}

          <button className="btn btn-secondary" onClick={copyWokwiJson} style={{ fontSize: '12px', padding: '6px 12px' }}>
            {copied ? <Check size={14} color="var(--status-success)" /> : <Copy size={14} />}
            <span>{copied ? 'Copied' : 'Export Wokwi'}</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Interactive CAD Canvas */}
      {viewMode === 'canvas' && (
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{
            flex: 1,
            position: 'relative',
            background: '#07070a',
            overflow: 'hidden',
            cursor: isPanning ? 'grabbing' : (wiringState ? 'crosshair' : 'default'),
            userSelect: 'none'
          }}
        >
          {/* Status HUD / Info Strip */}
          <div style={{
            position: 'absolute',
            top: 12,
            left: 12,
            zIndex: 5,
            display: 'flex',
            gap: '8px',
            pointerEvents: 'none'
          }}>
            <div style={{
              background: 'rgba(13, 13, 20, 0.85)',
              border: '1px solid var(--border-subtle)',
              backdropFilter: 'blur(8px)',
              padding: '6px 12px',
              borderRadius: '6px',
              fontSize: '11px',
              color: 'var(--text-secondary)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span style={{ color: 'var(--accent-orange)' }}>●</span>
              <span>{project.board.display_name}</span>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <span>{project.components.length} Components</span>
              <span style={{ color: 'var(--border-subtle)' }}>|</span>
              <span>{project.connections.length} Wires</span>
            </div>

            {wiringState && (
              <div style={{
                background: 'rgba(234, 88, 12, 0.2)',
                border: '1px solid var(--accent-orange)',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '11px',
                color: '#fff',
                fontWeight: 600
              }}>
                Wiring: {wiringState.fromComponent}:{wiringState.fromPin} → Click target pin
              </div>
            )}
          </div>

          {/* SVG Canvas for Grid & Routed Wires */}
          <svg
            ref={svgRef}
            style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
          >
            <defs>
              {/* Dot Grid Pattern */}
              <pattern id="cadGrid" width={20 * zoom} height={20 * zoom} patternUnits="userSpaceOnUse" x={pan.x % (20 * zoom)} y={pan.y % (20 * zoom)}>
                <circle cx={1} cy={1} r={1} fill="rgba(255,255,255,0.08)" />
              </pattern>
            </defs>

            {/* Background Grid */}
            <rect width="100%" height="100%" fill="url(#cadGrid)" />

            {/* SVG Content Group (Scaled & Panned) */}
            <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
              {/* 1. Routed Connection Wires */}
              {project.connections.map((conn) => {
                const fromCoords = getPinCoordinates(conn.from_component, conn.from_pin);
                const toCoords = getPinCoordinates(conn.to_component, conn.to_pin);
                const isSelected = selectedConnId === conn.id;

                const wireColor = conn.color === 'red' ? '#ef4444' : 
                                 (conn.color === 'black' ? '#64748b' : 
                                 (conn.color === 'blue' ? '#3b82f6' : 
                                 (conn.color === 'green' ? '#10b981' : 
                                 (conn.color === 'cyan' ? '#06b6d4' : 
                                 (conn.color === 'purple' ? '#a855f7' : '#f97316')))));

                // Smooth Bezier Curve Routing
                const dx = Math.abs(toCoords.x - fromCoords.x) * 0.5;
                const pathD = `M ${fromCoords.x} ${fromCoords.y} C ${fromCoords.x + dx} ${fromCoords.y}, ${toCoords.x - dx} ${toCoords.y}, ${toCoords.x} ${toCoords.y}`;

                return (
                  <g key={conn.id} style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); setSelectedConnId(conn.id); }}>
                    {/* Wider transparent hit-test line for easy clicking */}
                    <path d={pathD} stroke="transparent" strokeWidth={14} fill="none" />

                    {/* Outer Glow when selected */}
                    {isSelected && (
                      <path d={pathD} stroke="rgba(249, 115, 22, 0.4)" strokeWidth={7} fill="none" strokeLinecap="round" />
                    )}

                    {/* Actual Wire Line */}
                    <path
                      d={pathD}
                      stroke={isSelected ? '#fff' : wireColor}
                      strokeWidth={isSelected ? 3.5 : 2.5}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={conn.signal_type.includes('PWM') ? "4 2" : "none"}
                    />

                    {/* Terminal Connection Dots */}
                    <circle cx={fromCoords.x} cy={fromCoords.y} r={3} fill={wireColor} />
                    <circle cx={toCoords.x} cy={toCoords.y} r={3} fill={wireColor} />
                  </g>
                );
              })}

              {/* 2. Active Rubberband Wire (during wiring) */}
              {wiringState && (
                <path
                  d={`M ${wiringState.startX} ${wiringState.startY} C ${wiringState.startX + 60} ${wiringState.startY}, ${mouseCanvasPos.x - 60} ${mouseCanvasPos.y}, ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
                  stroke="var(--accent-orange)"
                  strokeWidth={2.5}
                  strokeDasharray="4 3"
                  fill="none"
                />
              )}
            </g>
          </svg>

          {/* HTML Overlay for Interactive Component Cards */}
          <div 
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              pointerEvents: 'none'
            }}
          >
            <div 
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: '0 0',
                position: 'relative',
                width: '100%',
                height: '100%'
              }}
            >
              {/* Board Card Node */}
              <div
                style={{
                  position: 'absolute',
                  left: positions['board']?.x || 80,
                  top: positions['board']?.y || 80,
                  width: 180,
                  background: '#11111a',
                  border: '1.5px solid #27273a',
                  borderRadius: '10px',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
                  pointerEvents: 'auto',
                  cursor: draggingCompId === 'board' ? 'grabbing' : 'grab',
                  zIndex: selectedCompId === 'board' ? 8 : 2
                }}
                onMouseDown={(e) => {
                  if ((e.target as HTMLElement).dataset.pin) return;
                  setDraggingCompId('board');
                  const pos = positions['board'] || { x: 80, y: 80, rotation: 0 };
                  const canvas = getCanvasCoords(e.clientX, e.clientY);
                  setDragOffset({ x: canvas.x - pos.x, y: canvas.y - pos.y });
                  setSelectedCompId('board');
                }}
              >
                {/* Board Header */}
                <div style={{
                  padding: '8px 10px',
                  background: 'linear-gradient(180deg, rgba(234, 88, 12, 0.15) 0%, transparent 100%)',
                  borderBottom: '1px solid #27273a',
                  borderRadius: '9px 9px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  <Cpu size={14} color="var(--accent-orange)" />
                  <span style={{ fontSize: '11px', fontWeight: 700, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {project.board.display_name}
                  </span>
                </div>

                {/* Board Pin Headers (Left & Right) */}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 4px 14px' }}>
                  {/* Left Column Pins */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {boardLeftPins.map((pin) => (
                      <div 
                        key={pin}
                        data-pin={pin}
                        onClick={(e) => handlePinClick('board', pin, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          padding: '0 4px',
                          borderRadius: '3px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: (pin === '3V3' || pin === '5V' || pin === 'VIN') ? '#ef4444' : (pin.includes('GND') ? '#64748b' : (pin.startsWith('A') ? '#a855f7' : '#3b82f6')),
                          border: '1.5px solid #fff'
                        }} />
                        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pin}</span>
                      </div>
                    ))}
                  </div>

                  {/* Right Column Pins */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    {boardRightPins.map((pin) => (
                      <div 
                        key={pin}
                        data-pin={pin}
                        onClick={(e) => handlePinClick('board', pin, e)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          cursor: 'pointer',
                          padding: '0 4px',
                          borderRadius: '3px'
                        }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <span style={{ fontSize: '9px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{pin}</span>
                        <div style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          background: (pin === '5V' || pin === '3V3' || pin === 'VIN') ? '#ef4444' : (pin.includes('GND') ? '#64748b' : '#3b82f6'),
                          border: '1.5px solid #fff'
                        }} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Component Nodes */}
              {project.components.map((comp) => {
                const pos = positions[comp.id] || { x: 380, y: 120, rotation: 0 };
                const isSelected = selectedCompId === comp.id;

                return (
                  <div
                    key={comp.id}
                    style={{
                      position: 'absolute',
                      left: pos.x,
                      top: pos.y,
                      width: 140,
                      background: '#12121c',
                      border: isSelected ? '1.5px solid var(--accent-orange)' : '1px solid #232334',
                      borderRadius: '8px',
                      boxShadow: isSelected ? '0 0 16px rgba(249,115,22,0.3)' : '0 6px 20px rgba(0,0,0,0.5)',
                      pointerEvents: 'auto',
                      cursor: draggingCompId === comp.id ? 'grabbing' : 'grab',
                      transform: `rotate(${pos.rotation}deg)`,
                      transition: draggingCompId === comp.id ? 'none' : 'box-shadow 0.15s ease',
                      zIndex: isSelected ? 9 : 3
                    }}
                    onMouseDown={(e) => {
                      if ((e.target as HTMLElement).dataset.pin) return;
                      setDraggingCompId(comp.id);
                      const canvas = getCanvasCoords(e.clientX, e.clientY);
                      setDragOffset({ x: canvas.x - pos.x, y: canvas.y - pos.y });
                      setSelectedCompId(comp.id);
                      setSelectedConnId(null);
                    }}
                  >
                    {/* Component Header */}
                    <div style={{
                      padding: '8px 10px 4px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      borderBottom: '1px solid rgba(255,255,255,0.06)'
                    }}>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {getComponentDisplayLabel(comp.id, project)}
                      </span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRotate(comp.id); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '2px' }}
                        title="Rotate 90 deg"
                      >
                        <RotateCw size={11} />
                      </button>
                    </div>

                    {/* Part ID Subtitle */}
                    <div style={{ padding: '0 10px 6px', fontSize: '9px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                      {comp.part_id}
                    </div>

                    {/* Component Contact Pins */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-around',
                      padding: '4px 6px 8px',
                      background: 'rgba(0,0,0,0.2)',
                      borderRadius: '0 0 7px 7px'
                    }}>
                      {(comp.pins || ['1', '2']).map((pin) => (
                        <div
                          key={pin}
                          data-pin={pin}
                          onClick={(e) => handlePinClick(comp.id, pin, e)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            borderRadius: '3px'
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
                          onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                          title={`Pin: ${pin}`}
                        >
                          <span style={{ fontSize: '8px', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)', marginBottom: '2px' }}>{pin}</span>
                          <div style={{
                            width: '8px',
                            height: '8px',
                            borderRadius: '50%',
                            background: (pin === 'V+' || pin.includes('VCC') || pin.includes('5V') || pin.includes('3V3')) ? '#ef4444' : (pin.includes('GND') ? '#64748b' : '#3b82f6'),
                            border: '1.5px solid #fff'
                          }} />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Item Floating Inspector Drawer */}
          {(selectedComp || selectedConn) && (
            <div style={{
              position: 'absolute',
              bottom: 16,
              right: 16,
              width: 280,
              background: '#0d0d16',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '14px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              zIndex: 20
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  {selectedComp ? 'Component Inspector' : 'Wire Inspector'}
                </span>
                <button
                  onClick={() => { setSelectedCompId(null); setSelectedConnId(null); }}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
                >
                  <X size={14} />
                </button>
              </div>

              {selectedComp && (
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>
                    {getComponentDisplayLabel(selectedComp.id, project)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                    Part ID: {selectedComp.part_id}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-secondary)', marginBottom: '12px', lineHeight: 1.4 }}>
                    {selectedComp.description || 'Hardware part instance.'}
                  </div>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleRotate(selectedComp.id)}
                      style={{ flex: 1, fontSize: '11px', padding: '6px' }}
                    >
                      <RotateCw size={12} />
                      <span>Rotate 90°</span>
                    </button>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDeleteComponent(selectedComp.id)}
                      style={{ fontSize: '11px', padding: '6px 10px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                      title="Delete component from circuit"
                    >
                      <Trash2 size={12} />
                      <span>Delete</span>
                    </button>
                  </div>
                </div>
              )}

              {selectedConn && (
                <div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    From: <strong style={{ color: '#fff' }}>{formatTerminalLabel(selectedConn.from_component, selectedConn.from_pin, project)}</strong>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    To: <strong style={{ color: '#fff' }}>{formatTerminalLabel(selectedConn.to_component, selectedConn.to_pin, project)}</strong>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '12px' }}>
                    Signal Type: <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>{selectedConn.signal_type}</span>
                  </div>

                  <button
                    className="btn btn-secondary"
                    onClick={() => handleDeleteConnection(selectedConn.id)}
                    style={{ width: '100%', fontSize: '11px', padding: '6px', color: '#ef4444', borderColor: 'rgba(239,68,68,0.3)' }}
                  >
                    <Trash2 size={12} />
                    <span>Delete Connection</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Mode 2: Netlist Wiring Table */}
      {viewMode === 'table' && (
        <div style={{ flex: 1, padding: '20px', background: '#0b0b11', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Point-to-Point Electrical Netlist</h3>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{project.connections.length} Total Routed Nets</span>
          </div>

          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)', height: '34px' }}>
                <th style={{ padding: '8px 12px' }}>Wire ID</th>
                <th style={{ padding: '8px 12px' }}>From Node</th>
                <th style={{ padding: '8px 12px' }}>Terminal</th>
                <th style={{ padding: '8px 12px' }}>To Node</th>
                <th style={{ padding: '8px 12px' }}>Terminal</th>
                <th style={{ padding: '8px 12px' }}>Signal Type</th>
                <th style={{ padding: '8px 12px' }}>Color</th>
                <th style={{ padding: '8px 12px', textAlign: 'right' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {project.connections.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', height: '40px' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{c.id}</td>
                  <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 500 }}>
                    {getComponentDisplayLabel(c.from_component, project)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>
                    {c.from_pin}
                  </td>
                  <td style={{ padding: '8px 12px', color: '#fff', fontWeight: 500 }}>
                    {getComponentDisplayLabel(c.to_component, project)}
                  </td>
                  <td style={{ padding: '8px 12px', fontFamily: 'var(--font-mono)', color: 'var(--accent-orange)' }}>
                    {c.to_pin}
                  </td>
                  <td style={{ padding: '8px 12px', color: 'var(--text-secondary)' }}>{c.signal_type}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: c.color }} />
                      <span style={{ textTransform: 'capitalize' }}>{c.color}</span>
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', textAlign: 'right' }}>
                    <button
                      className="btn btn-secondary"
                      onClick={() => handleDeleteConnection(c.id)}
                      style={{ padding: '4px 8px', fontSize: '11px', color: '#ef4444' }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Mode 3: Wokwi diagram.json */}
      {viewMode === 'wokwi_json' && (
        <div style={{ flex: 1, padding: '20px', background: '#0b0b11', overflowY: 'auto' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <div>
              <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>Exported Wokwi diagram.json</h3>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Synchronized dynamically with current canvas positions.</p>
            </div>
            <button className="btn btn-primary" onClick={copyWokwiJson} style={{ fontSize: '12px' }}>
              {copied ? <Check size={14} /> : <Copy size={14} />}
              <span>{copied ? 'Copied!' : 'Copy diagram.json'}</span>
            </button>
          </div>

          <pre style={{
            background: '#07070a',
            border: '1px solid var(--border-subtle)',
            borderRadius: '8px',
            padding: '16px',
            color: '#a5b4fc',
            fontSize: '12px',
            fontFamily: 'var(--font-mono)',
            overflowX: 'auto',
            lineHeight: 1.5
          }}>
            {JSON.stringify({
              version: 1,
              author: "CircuitMind AI Engineering IDE",
              editor: "wokwi",
              parts: [
                { 
                  type: project.board.type.includes('esp32') ? "wokwi-esp32-devkit-v1" : "wokwi-arduino-uno", 
                  id: "board", 
                  top: Math.round(positions['board']?.y || 80), 
                  left: Math.round(positions['board']?.x || 80), 
                  attrs: {} 
                },
                ...project.components.map((c) => ({
                  type: c.part_id === "hc-sr04" ? "wokwi-hc-sr04" : (c.part_id.includes("led") ? "wokwi-led" : (c.part_id.includes("buzzer") ? "wokwi-buzzer" : `wokwi-${c.part_id}`)),
                  id: c.id,
                  top: Math.round(positions[c.id]?.y || 120),
                  left: Math.round(positions[c.id]?.x || 380),
                  attrs: c.attributes || {}
                }))
              ],
              connections: project.connections.map(c => [
                `${c.from_component}:${c.from_pin}`,
                `${c.to_component}:${c.to_pin}`,
                c.color || "orange",
                ["v0"]
              ])
            }, null, 2)}
          </pre>
        </div>
      )}

      {/* Add Component Modal */}
      {isAddModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(4px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '680px',
            maxHeight: '85vh',
            background: '#0d0d16',
            border: '1px solid var(--border-subtle)',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: '0 20px 60px rgba(0,0,0,0.8)'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '16px 20px',
              borderBottom: '1px solid var(--border-subtle)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div>
                <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: 0 }}>Hardware Parts Catalogue</h3>
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: '2px 0 0' }}>Select a virtual component to place on the circuit canvas.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Search & Category Filter */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <div style={{ flex: '1 1 240px', position: 'relative' }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: 11, color: 'var(--text-muted)' }} />
                <input
                  type="text"
                  placeholder="Search parts by name, model, or type..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                  style={{
                    width: '100%',
                    background: 'var(--bg-input)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: '6px',
                    padding: '8px 12px 8px 34px',
                    color: '#fff',
                    fontSize: '13px',
                    outline: 'none'
                  }}
                />
              </div>

              <select
                value={catalogCategory}
                onChange={(e) => setCatalogCategory(e.target.value)}
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '6px',
                  padding: '8px 12px',
                  color: '#fff',
                  fontSize: '13px',
                  outline: 'none'
                }}
              >
                <option value="all">All Categories</option>
                <option value="sensor">Sensors</option>
                <option value="actuator">Actuators</option>
                <option value="display">Displays</option>
                <option value="passive">Passives</option>
              </select>
            </div>

            {/* Parts Grid */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
              {loadingCatalog ? (
                <div style={{ gridColumn: '1 / -1', padding: '40px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Loading component registry catalog...
                </div>
              ) : (
                catalogItems
                  .filter((item) => {
                    const matchesSearch = item.canonical_name.toLowerCase().includes(catalogSearch.toLowerCase()) || 
                                          item.part_id.toLowerCase().includes(catalogSearch.toLowerCase());
                    const matchesCat = catalogCategory === 'all' || item.category === catalogCategory;
                    return matchesSearch && matchesCat;
                  })
                  .map((item) => (
                  <div
                    key={item.part_id}
                    className="card"
                    style={{
                      margin: 0,
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      border: '1px solid var(--border-subtle)',
                      background: 'rgba(255,255,255,0.02)'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{item.canonical_name}</span>
                        <span style={{ fontSize: '10px', background: 'rgba(255,255,255,0.06)', padding: '2px 6px', borderRadius: '4px', color: 'var(--accent-orange)' }}>
                          {item.category}
                        </span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '8px' }}>
                        ID: {item.part_id}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>
                        {item.pins ? `${Object.keys(item.pins).length} Pins` : '2 Pins'}
                      </span>
                      <button
                        className="btn btn-primary"
                        onClick={() => handleAddCatalogPart(item.part_id)}
                        style={{ fontSize: '11px', padding: '5px 12px' }}
                      >
                        <Plus size={12} />
                        <span>Add Part</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
