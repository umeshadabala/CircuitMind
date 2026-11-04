import React, { useEffect, useMemo, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Node,
  Edge,
  NodeTypes,
  useNodesState,
  useEdgesState,
  useReactFlow,
  ReactFlowProvider,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { Maximize2, RotateCcw, ZoomIn, ZoomOut, Sparkles, LayoutGrid } from 'lucide-react';
import { Project, CatalogComponent } from '../../types';
import { ComponentNode } from '../../components/ComponentNode';

interface CanvasPanelProps {
  project: Project;
  catalog: CatalogComponent[];
  selectedInstanceId?: string | null;
  selectedNetId?: string | null;
  onSelectComponent: (instanceId: string | null) => void;
  onSelectNet?: (netId: string | null) => void;
  onUpdatePosition?: (instanceId: string, position: { x: number; y: number }) => Promise<void>;
  onAutoLayout?: () => Promise<void>;
}

const nodeTypes: NodeTypes = {
  componentNode: ComponentNode as any,
};

const CanvasInner: React.FC<CanvasPanelProps> = ({
  project,
  catalog,
  selectedInstanceId,
  selectedNetId,
  onSelectComponent,
  onSelectNet,
  onUpdatePosition,
  onAutoLayout,
}) => {
  const { fitView, zoomIn, zoomOut, setViewport, getZoom } = useReactFlow();
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isLayingOut, setIsLayingOut] = useState<boolean>(false);

  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogComponent>();
    catalog.forEach((item) => map.set(item.catalog_id, item));
    return map;
  }, [catalog]);

  // Initial nodes
  const initialNodes: Node[] = useMemo(() => {
    return project.components.map((c) => ({
      id: c.instance_id,
      type: 'componentNode',
      position: { x: c.position.x, y: c.position.y },
      data: {
        instance: c,
        catalogPart: catalogMap.get(c.catalog_id),
        isSelected: c.instance_id === selectedInstanceId,
      },
    }));
  }, [project.components, catalogMap, selectedInstanceId]);

  // Initial edges
  const initialEdges: Edge[] = useMemo(() => {
    const edgeList: Edge[] = [];
    project.nets.forEach((net) => {
      if (net.pins.length < 2) return;

      const isConnectedToSelected = selectedInstanceId
        ? net.pins.some((p) => p.instance_id === selectedInstanceId)
        : false;
      const isNetSelected = selectedNetId === net.net_id;
      const isHighlighted = isConnectedToSelected || isNetSelected;

      const rootPin = net.pins[0];
      for (let i = 1; i < net.pins.length; i++) {
        const targetPin = net.pins[i];

        let strokeColor = '#356B62';
        if (net.net_type === 'POWER') strokeColor = '#EF4444';
        else if (net.net_type === 'GROUND') strokeColor = '#71717A';
        else if (net.net_type === 'I2C') strokeColor = '#38BDF8';
        else if (net.net_type === 'SPI') strokeColor = '#818CF8';
        else if (net.net_type === 'UART') strokeColor = '#FBBF24';
        else if (net.net_type === 'ANALOG') strokeColor = '#2DD4BF';

        edgeList.push({
          id: `${net.net_id}-${rootPin.instance_id}.${rootPin.pin_id}-${targetPin.instance_id}.${targetPin.pin_id}`,
          source: rootPin.instance_id,
          target: targetPin.instance_id,
          sourceHandle: `${rootPin.pin_id}-out`,
          targetHandle: `${targetPin.pin_id}-in`,
          type: 'smoothstep',
          animated: isHighlighted || net.net_type === 'SIGNAL' || net.net_type === 'I2C',
          style: {
            stroke: isHighlighted ? '#5B9B8D' : strokeColor,
            strokeWidth: isHighlighted ? 3.5 : 2,
            filter: isHighlighted ? 'drop-shadow(0 0 8px rgba(91, 155, 141, 0.8))' : undefined,
          },
          label: net.name,
          labelStyle: { fill: isHighlighted ? '#F1F5F4' : '#96A6A3', fontSize: 10, fontFamily: 'monospace' },
          labelBgStyle: { fill: '#101720', fillOpacity: 0.85 },
        });
      }
    });
    return edgeList;
  }, [project.nets, selectedInstanceId, selectedNetId]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync nodes & edges when project or selection changes
  useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  // Initial auto-fit
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView({ padding: 0.2, duration: 400 });
      setZoomLevel(Math.round(getZoom() * 100));
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView, getZoom]);

  const handleNodeDragStop = (_: any, node: Node) => {
    if (onUpdatePosition) {
      onUpdatePosition(node.id, { x: node.position.x, y: node.position.y });
    }
  };

  const handleAutoLayout = async () => {
    if (onAutoLayout && !isLayingOut) {
      setIsLayingOut(true);
      try {
        await onAutoLayout();
        setTimeout(() => fitView({ padding: 0.2, duration: 400 }), 100);
      } finally {
        setIsLayingOut(false);
      }
    }
  };

  return (
    <div className="w-full h-full relative bg-[#090D12]">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={(_, node) => onSelectComponent(node.id)}
        onEdgeClick={(_, edge) => {
          const netId = edge.id.split('-')[0];
          if (onSelectNet) onSelectNet(netId);
        }}
        onPaneClick={() => {
          onSelectComponent(null);
          if (onSelectNet) onSelectNet(null);
        }}
        onMoveEnd={() => setZoomLevel(Math.round(getZoom() * 100))}
        minZoom={0.2}
        maxZoom={2.2}
        fitView
      >
        <Background color="#25332F" gap={24} size={1} />
        <MiniMap
          nodeColor="#356B62"
          maskColor="rgba(9, 13, 18, 0.75)"
          className="!bg-[#101720] !border-[#25332F]"
        />
      </ReactFlow>

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 right-4 bg-[#101720]/90 backdrop-blur border border-[#25332F] p-1.5 rounded-lg flex items-center space-x-1.5 z-10 shadow-lg text-xs font-mono">
        <button
          onClick={handleAutoLayout}
          disabled={isLayingOut}
          title="Auto-arrange components neatly without changing wiring"
          className="flex items-center space-x-1 bg-[#151F2B] hover:bg-[#25332F] text-[#5B9B8D] px-2.5 py-1 rounded border border-[#356B62]/40 transition-colors disabled:opacity-50"
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          <span>Auto Layout</span>
        </button>

        <div className="h-4 w-px bg-[#25332F]" />

        <button
          onClick={() => {
            zoomIn({ duration: 300 });
            setTimeout(() => setZoomLevel(Math.round(getZoom() * 100)), 350);
          }}
          className="p-1.5 text-zinc-300 hover:text-white rounded hover:bg-[#151F2B] transition-colors"
          title="Zoom In"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>

        <span className="text-[11px] text-[#96A6A3] w-10 text-center font-bold">{zoomLevel}%</span>

        <button
          onClick={() => {
            zoomOut({ duration: 300 });
            setTimeout(() => setZoomLevel(Math.round(getZoom() * 100)), 350);
          }}
          className="p-1.5 text-zinc-300 hover:text-white rounded hover:bg-[#151F2B] transition-colors"
          title="Zoom Out"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        <button
          onClick={() => fitView({ padding: 0.2, duration: 400 })}
          className="p-1.5 text-zinc-300 hover:text-white rounded hover:bg-[#151F2B] transition-colors"
          title="Fit view to all components"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Floating Canvas Legend */}
      <div className="absolute bottom-4 left-4 bg-[#101720]/90 backdrop-blur border border-[#25332F] p-2.5 rounded-lg text-[11px] font-mono flex items-center space-x-4 pointer-events-none z-10 shadow-lg">
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-rose-500 inline-block" />
          <span className="text-[#96A6A3]">Power (3.3V/5V)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-zinc-500 inline-block" />
          <span className="text-[#96A6A3]">Ground (GND)</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-[#356B62] inline-block" />
          <span className="text-[#96A6A3]">Logic Signal</span>
        </div>
        <div className="flex items-center space-x-1.5">
          <span className="w-2.5 h-0.5 bg-sky-400 inline-block" />
          <span className="text-[#96A6A3]">I2C Bus</span>
        </div>
      </div>
    </div>
  );
};

export const CanvasPanel: React.FC<CanvasPanelProps> = (props) => {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
};
