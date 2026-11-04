import React, { useMemo, useState } from 'react';
import {
  FileCode,
  Search,
  Filter,
  Copy,
  Check,
  Download,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  AlertTriangle,
  ArrowUpDown,
  Zap,
} from 'lucide-react';
import { Project, NetType } from '../../types';

interface NetlistPanelProps {
  project: Project;
  onNavigateToComponent?: (instanceId: string) => void;
  onNavigateToNet?: (netId: string) => void;
}

export const NetlistPanel: React.FC<NetlistPanelProps> = ({
  project,
  onNavigateToComponent,
  onNavigateToNet,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<string>('ALL');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'table' | 'kicad'>('table');
  const [expandedNetIds, setExpandedNetIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'net_id' | 'name' | 'type' | 'voltage' | 'nodes'>('net_id');
  const [sortAsc, setSortAsc] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  // Map instances for fast metadata lookup
  const instMap = useMemo(() => {
    const map = new Map<string, any>();
    project.components.forEach((c) => map.set(c.instance_id, c));
    return map;
  }, [project.components]);

  // KiCad S-Expression Format
  const kicadText = useMemo(() => {
    const lines = [
      `(export (version D) (project "${project.name}") (revision ${project.revision})`,
      '  (components',
    ];
    project.components.forEach((c) => {
      lines.push(`    (comp (ref "${c.instance_id}") (value "${c.catalog_id}") (footprint "Module"))`);
    });
    lines.push('  )');
    lines.push('  (nets');
    project.nets.forEach((n) => {
      lines.push(`    (net (code "${n.net_id}") (name "${n.name}")`);
      n.pins.forEach((p) => {
        lines.push(`      (node (ref "${p.instance_id}") (pin "${p.pin_id}"))`);
      });
      lines.push('    )');
    });
    lines.push('  )');
    lines.push(')');
    return lines.join('\n');
  }, [project]);

  // Toggle net expansion
  const toggleExpand = (netId: string) => {
    setExpandedNetIds((prev) => {
      const next = new Set(prev);
      if (next.has(netId)) next.delete(netId);
      else next.add(netId);
      return next;
    });
  };

  // Filter & Search logic
  const filteredNets = useMemo(() => {
    return project.nets
      .filter((net) => {
        // Type filter
        if (selectedTypeFilter !== 'ALL' && net.net_type !== selectedTypeFilter) {
          return false;
        }

        // Status filter (CONNECTED >= 2 pins, FLOATING < 2 pins)
        if (selectedStatusFilter === 'CONNECTED' && net.pins.length < 2) return false;
        if (selectedStatusFilter === 'FLOATING' && net.pins.length >= 2) return false;

        // Search query (Net ID, Name, Component Ref, Pin ID)
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesId = net.net_id.toLowerCase().includes(q);
          const matchesName = net.name.toLowerCase().includes(q);
          const matchesRationale = (net.rationale || '').toLowerCase().includes(q);
          const matchesPin = net.pins.some(
            (p) =>
              p.instance_id.toLowerCase().includes(q) ||
              p.pin_id.toLowerCase().includes(q) ||
              `${p.instance_id}.${p.pin_id}`.toLowerCase().includes(q)
          );
          return matchesId || matchesName || matchesRationale || matchesPin;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a.net_id;
        let valB: any = b.net_id;

        if (sortField === 'name') {
          valA = a.name;
          valB = b.name;
        } else if (sortField === 'type') {
          valA = a.net_type;
          valB = b.net_type;
        } else if (sortField === 'voltage') {
          valA = a.voltage ?? -1;
          valB = b.voltage ?? -1;
        } else if (sortField === 'nodes') {
          valA = a.pins.length;
          valB = b.pins.length;
        }

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [project.nets, selectedTypeFilter, selectedStatusFilter, searchQuery, sortField, sortAsc]);

  const handleSort = (field: 'net_id' | 'name' | 'type' | 'voltage' | 'nodes') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(kicadText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleExportCSV = () => {
    const headers = ['Net ID', 'Net Name', 'Signal Type', 'Voltage (V)', 'Node Count', 'Endpoints', 'Engineering Rationale'];
    const rows = filteredNets.map((n) => [
      `"${n.net_id}"`,
      `"${n.name}"`,
      `"${n.net_type}"`,
      n.voltage !== undefined && n.voltage !== null ? n.voltage : 'N/A',
      n.pins.length,
      `"${n.pins.map((p) => `${p.instance_id}.${p.pin_id}`).join(', ')}"`,
      `"${(n.rationale || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_netlist_rev${project.revision}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getTypeBadgeColor = (type: NetType | string) => {
    switch (type) {
      case 'POWER':
        return 'bg-rose-950/40 text-rose-300 border-rose-800/50';
      case 'GROUND':
        return 'bg-zinc-800/60 text-zinc-300 border-zinc-700/50';
      case 'I2C':
        return 'bg-sky-950/40 text-sky-300 border-sky-800/50';
      case 'SPI':
        return 'bg-indigo-950/40 text-indigo-300 border-indigo-800/50';
      case 'UART':
        return 'bg-amber-950/40 text-amber-300 border-amber-800/50';
      case 'ANALOG':
        return 'bg-teal-950/40 text-teal-300 border-teal-800/50';
      default:
        return 'bg-[#356B62]/20 text-[#5B9B8D] border-[#356B62]/40';
    }
  };

  return (
    <div className="h-full flex flex-col bg-[#090D12] text-[#F1F5F4]">
      {/* Top Controls Bar */}
      <div className="p-3.5 border-b border-[#25332F] bg-[#101720] flex items-center justify-between gap-3 flex-wrap z-10">
        <div className="flex items-center space-x-3">
          <FileCode className="w-5 h-5 text-[#5B9B8D]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
              <span>Electrical Netlist</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#151F2B] text-[#5B9B8D] border border-[#25332F]">
                {filteredNets.length} of {project.nets.length} Nets
              </span>
            </h2>
            <div className="text-[11px] text-[#96A6A3] font-mono">
              Interconnection matrix · Revision {project.revision}
            </div>
          </div>
        </div>

        {/* View Switcher & Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <div className="bg-[#151F2B] p-0.5 rounded border border-[#25332F] flex text-xs font-mono">
            <button
              onClick={() => setViewMode('table')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'table' ? 'bg-[#356B62] text-white font-bold' : 'text-[#96A6A3] hover:text-white'
              }`}
            >
              Interactive Table
            </button>
            <button
              onClick={() => setViewMode('kicad')}
              className={`px-3 py-1 rounded transition-colors ${
                viewMode === 'kicad' ? 'bg-[#356B62] text-white font-bold' : 'text-[#96A6A3] hover:text-white'
              }`}
            >
              KiCad Netlist
            </button>
          </div>

          <button
            onClick={handleExportCSV}
            title="Export netlist to CSV"
            className="flex items-center space-x-1.5 bg-[#151F2B] hover:bg-[#25332F] text-zinc-300 hover:text-white px-3 py-1 rounded text-xs font-mono border border-[#25332F] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handleCopy}
            className="flex items-center space-x-1.5 bg-[#151F2B] hover:bg-[#25332F] border border-[#25332F] text-[#F1F5F4] px-3 py-1 rounded text-xs font-mono transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy Text'}</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar (Table View) */}
      {viewMode === 'table' && (
        <div className="px-4 py-2.5 border-b border-[#25332F] bg-[#101720]/60 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
            <div className="relative flex-1 max-w-md">
              <Search className="w-3.5 h-3.5 text-[#96A6A3] absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search by net name, component ref (e.g. U1, D1), or pin..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-[#151F2B] border border-[#25332F] text-xs font-mono rounded pl-8 pr-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#356B62]"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 font-mono text-xs">
            <span className="text-[#96A6A3] text-[11px] flex items-center space-x-1">
              <Filter className="w-3 h-3" />
              <span>Type:</span>
            </span>
            <select
              value={selectedTypeFilter}
              onChange={(e) => setSelectedTypeFilter(e.target.value)}
              className="bg-[#151F2B] border border-[#25332F] text-xs rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-[#356B62]"
            >
              <option value="ALL">All Types</option>
              <option value="POWER">POWER (VCC/VBAT)</option>
              <option value="GROUND">GROUND (GND)</option>
              <option value="SIGNAL">SIGNAL (Logic)</option>
              <option value="I2C">I2C Bus</option>
              <option value="SPI">SPI Bus</option>
              <option value="UART">UART / Serial</option>
              <option value="ANALOG">ANALOG</option>
            </select>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-[#151F2B] border border-[#25332F] text-xs rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-[#356B62]"
            >
              <option value="ALL">All Statuses</option>
              <option value="CONNECTED">Connected (≥2 nodes)</option>
              <option value="FLOATING">Floating (&lt;2 nodes)</option>
            </select>
          </div>
        </div>
      )}

      {/* Table Content */}
      <div className="flex-1 overflow-auto p-4">
        {viewMode === 'table' ? (
          <div className="border border-[#25332F] rounded-lg overflow-hidden bg-[#101720]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#151F2B] border-b border-[#25332F] text-[#96A6A3]">
                <tr>
                  <th className="py-2.5 px-3 w-8"></th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('net_id')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Net ID</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors font-sans"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Signal Name</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('type')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Classification</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                    onClick={() => handleSort('voltage')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Voltage</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th
                    className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-center"
                    onClick={() => handleSort('nodes')}
                  >
                    <div className="flex items-center justify-center space-x-1">
                      <span>Nodes</span>
                      <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                    </div>
                  </th>
                  <th className="py-2.5 px-3">Endpoints (Click to Inspect)</th>
                  <th className="py-2.5 px-3 font-sans">Engineering Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25332F]/50">
                {filteredNets.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#96A6A3] font-mono">
                      No electrical nets match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredNets.map((net) => {
                    const isExpanded = expandedNetIds.has(net.net_id);
                    const isFloating = net.pins.length < 2;

                    return (
                      <React.Fragment key={net.net_id}>
                        <tr
                          className={`hover:bg-[#151F2B]/60 transition-colors ${
                            isFloating ? 'bg-amber-950/10' : ''
                          }`}
                        >
                          <td className="py-2 px-2 text-center">
                            <button
                              onClick={() => toggleExpand(net.net_id)}
                              className="p-1 hover:text-white text-zinc-500 rounded"
                              title="Toggle detailed endpoint breakdown"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-3.5 h-3.5 text-[#5B9B8D]" />
                              ) : (
                                <ChevronRight className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </td>
                          <td className="py-2 px-3 font-bold text-[#5B9B8D]">
                            <button
                              onClick={() => onNavigateToNet && onNavigateToNet(net.net_id)}
                              className="hover:underline flex items-center space-x-1 text-left"
                              title="Click to highlight net on Circuit Canvas"
                            >
                              <span>{net.net_id}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-zinc-500 opacity-60" />
                            </button>
                          </td>
                          <td className="py-2 px-3 text-white font-sans font-medium">
                            <div className="flex items-center space-x-1.5">
                              {isFloating && (
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                              )}
                              <span>{net.name}</span>
                            </div>
                          </td>
                          <td className="py-2 px-3">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-mono border ${getTypeBadgeColor(
                                net.net_type
                              )}`}
                            >
                              {net.net_type}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-[#96A6A3]">
                            {net.voltage !== undefined && net.voltage !== null ? `${net.voltage}V` : '—'}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isFloating
                                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                  : 'bg-[#151F2B] text-zinc-300 border border-[#25332F]'
                              }`}
                            >
                              {net.pins.length}
                            </span>
                          </td>
                          <td className="py-2 px-3">
                            <div className="flex flex-wrap gap-1">
                              {net.pins.map((p) => (
                                <button
                                  key={`${p.instance_id}.${p.pin_id}`}
                                  onClick={() => onNavigateToComponent && onNavigateToComponent(p.instance_id)}
                                  className="bg-[#151F2B] hover:bg-[#25332F] hover:text-white px-2 py-0.5 rounded border border-[#25332F] text-[11px] text-[#5B9B8D] transition-colors flex items-center space-x-1"
                                  title={`Navigate to ${p.instance_id} on canvas`}
                                >
                                  <span>
                                    {p.instance_id}.{p.pin_id}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </td>
                          <td className="py-2 px-3 text-[#96A6A3] font-sans text-xs max-w-xs truncate">
                            {net.rationale || '—'}
                          </td>
                        </tr>

                        {/* Expanded Node Detail Row */}
                        {isExpanded && (
                          <tr className="bg-[#151F2B]/40 border-b border-[#25332F]/60">
                            <td colSpan={8} className="p-3 pl-10">
                              <div className="space-y-2 text-xs">
                                <div className="font-semibold text-zinc-400 font-sans text-[11px] uppercase tracking-wider">
                                  Endpoint Node Breakdown ({net.pins.length} Terminals)
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                  {net.pins.map((p) => {
                                    const comp = instMap.get(p.instance_id);
                                    return (
                                      <div
                                        key={`${p.instance_id}.${p.pin_id}`}
                                        className="bg-[#101720] border border-[#25332F] p-2.5 rounded flex items-start justify-between"
                                      >
                                        <div>
                                          <div className="flex items-center space-x-1.5">
                                            <span className="font-bold text-[#5B9B8D]">{p.instance_id}</span>
                                            <span className="text-zinc-500">·</span>
                                            <span className="font-mono text-white">{p.pin_id}</span>
                                          </div>
                                          <div className="text-[11px] text-zinc-400 font-sans mt-0.5 truncate max-w-[180px]">
                                            {comp ? comp.name : 'Unknown Component'}
                                          </div>
                                        </div>
                                        <button
                                          onClick={() => onNavigateToComponent && onNavigateToComponent(p.instance_id)}
                                          className="text-[10px] text-[#5B9B8D] hover:text-white bg-[#151F2B] hover:bg-[#25332F] px-2 py-1 rounded border border-[#25332F] transition-colors flex items-center space-x-1"
                                        >
                                          <span>Inspect</span>
                                          <ExternalLink className="w-2.5 h-2.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <pre className="p-4 bg-[#101720] border border-[#25332F] rounded-lg font-mono text-xs text-[#F1F5F4] leading-relaxed overflow-x-auto selection:bg-[#356B62]">
            {kicadText}
          </pre>
        )}
      </div>
    </div>
  );
};
