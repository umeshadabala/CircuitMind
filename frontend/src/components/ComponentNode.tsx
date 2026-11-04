import React from 'react';
import { Handle, Position } from '@xyflow/react';
import { ComponentInstance, CatalogComponent } from '../types';

interface ComponentNodeData {
  instance: ComponentInstance;
  catalogPart?: CatalogComponent;
  isSelected?: boolean;
}

export const ComponentNode: React.FC<{ data: ComponentNodeData }> = ({ data }) => {
  const { instance, catalogPart, isSelected } = data;

  const getCategoryColor = (category?: string) => {
    switch (category) {
      case 'microcontroller':
        return 'border-[#356B62] bg-[#151F2B]/95 text-[#5B9B8D]';
      case 'sensor':
        return 'border-sky-500/60 bg-[#101720]/95 text-sky-400';
      case 'actuator':
        return 'border-amber-500/60 bg-[#101720]/95 text-amber-400';
      case 'passive':
        return 'border-zinc-500/60 bg-[#101720]/95 text-zinc-300';
      case 'display':
        return 'border-emerald-500/60 bg-[#101720]/95 text-emerald-400';
      case 'logic':
        return 'border-teal-500/60 bg-[#101720]/95 text-teal-300';
      default:
        return 'border-[#25332F] bg-[#101720] text-[#F1F5F4]';
    }
  };

  const pins = catalogPart?.pins || [];

  return (
    <div
      className={`min-w-[190px] rounded-lg border shadow-xl transition-all font-mono text-xs ${getCategoryColor(
        catalogPart?.category
      )} ${isSelected ? 'ring-2 ring-[#356B62] shadow-[#356B62]/30' : ''}`}
    >
      {/* Node Header */}
      <div className="px-3 py-2 border-b border-[#25332F]/60 bg-[#101720]/80 flex items-center justify-between">
        <span className="font-bold text-sm tracking-wide text-white">{instance.instance_id}</span>
        <span className="text-[10px] uppercase px-1.5 py-0.5 rounded bg-[#151F2B] text-[#96A6A3] border border-[#25332F]">
          {catalogPart?.category || 'module'}
        </span>
      </div>

      {/* Part description */}
      <div className="px-3 py-1.5 text-[11px] font-sans text-[#96A6A3] border-b border-[#25332F]/40 truncate">
        {catalogPart?.name || instance.catalog_id}
      </div>

      {/* Pins list */}
      <div className="py-1">
        {pins.map((pin, idx) => {
          const isPower = pin.role === 'POWER' || pin.pin_id === 'VCC' || pin.pin_id === '3V3';
          const isGround = pin.role === 'GROUND' || pin.pin_id.includes('GND');

          return (
            <div
              key={pin.pin_id}
              className="relative px-3 py-1 flex items-center justify-between text-[11px] hover:bg-[#151F2B]/70"
            >
              <Handle
                type="target"
                position={Position.Left}
                id={`${pin.pin_id}-in`}
                className="!bg-[#356B62] !w-2 !h-2"
              />

              <div className="flex items-center space-x-1.5">
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    isPower
                      ? 'bg-rose-500'
                      : isGround
                      ? 'bg-zinc-400'
                      : pin.direction === 'INPUT'
                      ? 'bg-sky-400'
                      : 'bg-emerald-400'
                  }`}
                />
                <span className="text-[#F1F5F4] font-mono">{pin.pin_id}</span>
              </div>

              <span className="text-[9px] text-[#96A6A3] font-sans truncate max-w-[80px]">
                {pin.direction}
              </span>

              <Handle
                type="source"
                position={Position.Right}
                id={`${pin.pin_id}-out`}
                className="!bg-[#356B62] !w-2 !h-2"
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

