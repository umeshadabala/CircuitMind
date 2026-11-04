import React from 'react';
import { Trash2, ExternalLink, Zap, Info } from 'lucide-react';
import { ComponentInstance, CatalogComponent, Net } from '../../types';

interface InspectorPanelProps {
  component: ComponentInstance | null;
  catalogPart?: CatalogComponent;
  nets: Net[];
  onRemoveComponent: (instanceId: string) => void;
  onClose: () => void;
}

export const InspectorPanel: React.FC<InspectorPanelProps> = ({
  component,
  catalogPart,
  nets,
  onRemoveComponent,
  onClose,
}) => {
  if (!component) {
    return (
      <div className="p-6 text-center text-[#A1A1AA] font-mono text-xs">
        <Info className="w-8 h-8 mx-auto mb-2 opacity-40 text-[#7C3AED]" />
        Select a component on the circuit canvas to inspect pinouts, electrical constraints, and net connections.
      </div>
    );
  }

  // Find all nets connected to this component
  const connectedNets = nets.filter((n) =>
    n.pins.some((p) => p.instance_id === component.instance_id)
  );

  return (
    <div className="h-full flex flex-col font-sans text-xs">
      {/* Header */}
      <div className="p-4 border-b border-[#2A2A35] flex items-center justify-between bg-[#111116]">
        <div>
          <div className="font-mono text-base font-bold text-white flex items-center gap-2">
            <span>{component.instance_id}</span>
            <span className="text-[10px] font-normal uppercase bg-[#18181F] text-[#A78BFA] px-2 py-0.5 rounded border border-[#7C3AED]/40">
              {component.catalog_id}
            </span>
          </div>
          <div className="text-[#A1A1AA] text-xs truncate max-w-[240px] mt-0.5">
            {catalogPart?.name || component.name}
          </div>
        </div>

        <button
          onClick={() => onRemoveComponent(component.instance_id)}
          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/30 rounded border border-transparent hover:border-rose-800/40 transition-colors"
          title="Remove component"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        {/* Architectural Traceability */}
        {component.traceability && (
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#A78BFA] uppercase tracking-wider mb-2 flex items-center justify-between">
              <span>Requirement Traceability</span>
              <span className="text-[10px] bg-[#7C3AED]/20 text-[#A78BFA] px-1.5 py-0.5 rounded border border-[#7C3AED]/30">
                {component.traceability.requirement_id}
              </span>
            </div>
            <div className="bg-[#18181F] border border-[#7C3AED]/30 rounded-lg p-3 space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Subsystem:</span>
                <span className="font-mono text-white font-medium">{component.traceability.subsystem}</span>
              </div>
              <div>
                <span className="text-[#A1A1AA] block text-[10px] uppercase font-mono mt-1 mb-0.5">Rationale:</span>
                <p className="text-zinc-300 text-[11px] leading-relaxed italic">
                  "{component.traceability.reason}"
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Component Overview */}
        <div>
          <div className="font-mono text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2">
            Specification & Ratings
          </div>
          <div className="bg-[#111116] border border-[#2A2A35] rounded-lg p-3 space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Category:</span>
              <span className="font-mono text-[#FAFAFA] capitalize">{catalogPart?.category || component.role || 'Module'}</span>
            </div>
            {catalogPart?.manufacturer && (
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Manufacturer:</span>
                <span className="font-mono text-[#FAFAFA]">{catalogPart.manufacturer}</span>
              </div>
            )}
            {catalogPart?.provenance && (
              <div className="flex justify-between">
                <span className="text-[#A1A1AA]">Provenance:</span>
                <span className="font-mono text-emerald-400 text-[10px] bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                  {catalogPart.provenance}
                </span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-[#A1A1AA]">Supply Voltage:</span>
              <span className="font-mono text-[#FAFAFA]">
                {catalogPart?.supply_voltage_min}V – {catalogPart?.supply_voltage_max}V
              </span>
            </div>
            {catalogPart?.datasheet_url && (
              <div className="pt-1 border-t border-[#2A2A35]/40 flex justify-between items-center">
                <span className="text-[#A1A1AA]">Datasheet:</span>
                <a
                  href={catalogPart.datasheet_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#A78BFA] hover:text-white flex items-center gap-1 font-mono text-[11px]"
                >
                  <span>PDF Link</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Notes & Constraints */}
        {catalogPart?.notes && (
          <div>
            <div className="font-mono text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-1.5">
              Engineering Notes
            </div>
            <div className="bg-[#18181F]/70 border border-[#2A2A35] rounded-lg p-2.5 text-[11px] text-[#A1A1AA] leading-relaxed">
              {catalogPart.notes}
            </div>
          </div>
        )}

        {/* Pinout & Net Connections */}
        <div>
          <div className="font-mono text-[11px] font-semibold text-[#A1A1AA] uppercase tracking-wider mb-2 flex items-center justify-between">
            <span>Pinout ({catalogPart?.pins?.length || 0})</span>
            <span className="text-[10px] text-zinc-500">Connected Net</span>
          </div>

          <div className="space-y-1.5">
            {catalogPart?.pins.map((pin) => {
              const connectedNet = nets.find((n) =>
                n.pins.some((p) => p.instance_id === component.instance_id && p.pin_id === pin.pin_id)
              );

              return (
                <div
                  key={pin.pin_id}
                  className="bg-[#111116] border border-[#2A2A35] rounded p-2 flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-mono font-bold text-white flex items-center gap-1.5">
                      <span>{pin.pin_id}</span>
                      <span className="text-[10px] font-normal text-zinc-500 font-sans">({pin.direction})</span>
                    </div>
                    <div className="text-[10px] text-zinc-400 font-mono">
                      {pin.voltage_min}V – {pin.voltage_max}V
                    </div>
                  </div>

                  <div>
                    {connectedNet ? (
                      <span className="font-mono text-[11px] text-[#A78BFA] bg-[#18181F] px-2 py-0.5 rounded border border-[#7C3AED]/40">
                        {connectedNet.net_id}
                      </span>
                    ) : (
                      <span className="font-mono text-[10px] text-zinc-600 italic">Unconnected</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

