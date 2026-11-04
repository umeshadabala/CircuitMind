import React, { useMemo, useState } from 'react';
import {
  Package,
  ExternalLink,
  Search,
  Filter,
  Download,
  Printer,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ArrowUpDown,
  Tag,
} from 'lucide-react';
import { Project, CatalogComponent } from '../../types';

interface BomPanelProps {
  project: Project;
  catalog: CatalogComponent[];
  onNavigateToComponent?: (instanceId: string) => void;
}

export const BomPanel: React.FC<BomPanelProps> = ({
  project,
  catalog,
  onNavigateToComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedCatalogIds, setExpandedCatalogIds] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<'catalogId' | 'name' | 'quantity' | 'category'>('catalogId');
  const [sortAsc, setSortAsc] = useState<boolean>(true);

  const catalogMap = useMemo(() => {
    const map = new Map<string, CatalogComponent>();
    catalog.forEach((item) => map.set(item.catalog_id, item));
    return map;
  }, [catalog]);

  // Group components by catalog ID
  const groupedItems = useMemo(() => {
    const map = new Map<string, any[]>();
    project.components.forEach((c) => {
      const list = map.get(c.catalog_id) || [];
      list.push(c);
      map.set(c.catalog_id, list);
    });

    return Array.from(map.entries()).map(([catalogId, instances]) => {
      const part = catalogMap.get(catalogId);
      const designators = instances.map((c) => c.instance_id).sort();

      // Extract verified rating
      let valueRating = 'Standard Spec';
      if (part) {
        if ('resistance_ohms' in part.default_properties) {
          valueRating = `${part.default_properties['resistance_ohms']}Ω`;
        } else if ('clock_mhz' in part.default_properties) {
          valueRating = `${part.default_properties['clock_mhz']} MHz`;
        } else if ('kv_rating' in part.default_properties) {
          valueRating = `${part.default_properties['kv_rating']} KV`;
        } else if ('max_current_a' in part.default_properties) {
          valueRating = `${part.default_properties['max_current_a']}A Max`;
        } else if (part.supply_voltage_max > 0) {
          valueRating = `${part.supply_voltage_min}V–${part.supply_voltage_max}V`;
        }
      }

      // Package / footprint
      let pkg = 'Module / Board';
      if (part) {
        if (part.category === 'passive') pkg = 'Through-Hole 0.25W / Axial';
        else if (catalogId.includes('LED')) pkg = 'Through-Hole 5mm Round';
        else if (catalogId.includes('FC') || catalogId.includes('ESC')) pkg = '30.5x30.5mm Mounting';
      }

      return {
        catalogId,
        name: part?.name || catalogId,
        category: part?.category || 'custom',
        partNumber: part?.part_number || 'N/A',
        manufacturer: part?.manufacturer || 'Curated Library',
        valueRating,
        package: pkg,
        description: part?.description || '',
        quantity: designators.length,
        designators,
        instances,
        datasheetUrl: part?.datasheet_url,
        isVerified: !!part,
      };
    });
  }, [project.components, catalogMap]);

  // Categories list for filter dropdown
  const categories = useMemo(() => {
    const set = new Set<string>();
    groupedItems.forEach((item) => set.add(item.category));
    return ['ALL', ...Array.from(set).sort()];
  }, [groupedItems]);

  const toggleExpand = (catalogId: string) => {
    setExpandedCatalogIds((prev) => {
      const next = new Set(prev);
      if (next.has(catalogId)) next.delete(catalogId);
      else next.add(catalogId);
      return next;
    });
  };

  // Filtered and sorted line items
  const filteredItems = useMemo(() => {
    return groupedItems
      .filter((item) => {
        if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
          return false;
        }

        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchesId = item.catalogId.toLowerCase().includes(q);
          const matchesName = item.name.toLowerCase().includes(q);
          const matchesMfg = item.manufacturer.toLowerCase().includes(q);
          const matchesPn = item.partNumber.toLowerCase().includes(q);
          const matchesDesignators = item.designators.some((d: string) => d.toLowerCase().includes(q));
          return matchesId || matchesName || matchesMfg || matchesPn || matchesDesignators;
        }

        return true;
      })
      .sort((a, b) => {
        let valA: any = a[sortField];
        let valB: any = b[sortField];

        if (valA < valB) return sortAsc ? -1 : 1;
        if (valA > valB) return sortAsc ? 1 : -1;
        return 0;
      });
  }, [groupedItems, selectedCategory, searchQuery, sortField, sortAsc]);

  const handleSort = (field: 'catalogId' | 'name' | 'quantity' | 'category') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Line Item',
      'Catalog ID',
      'Part Number',
      'Component Name',
      'Category',
      'Value / Rating',
      'Package',
      'Quantity',
      'Designators',
      'Manufacturer',
      'Verification Status',
      'Datasheet',
    ];
    const rows = filteredItems.map((item, idx) => [
      idx + 1,
      `"${item.catalogId}"`,
      `"${item.partNumber}"`,
      `"${item.name}"`,
      `"${item.category}"`,
      `"${item.valueRating}"`,
      `"${item.package}"`,
      item.quantity,
      `"${item.designators.join(', ')}"`,
      `"${item.manufacturer}"`,
      item.isVerified ? '"Verified Catalog Part"' : '"Unverified Custom Part"',
      item.datasheetUrl ? `"${item.datasheetUrl}"` : '"N/A"',
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_bom_rev${project.revision}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col bg-[#090D12] text-[#F1F5F4]">
      {/* Top Header Controls */}
      <div className="p-3.5 border-b border-[#25332F] bg-[#101720] flex items-center justify-between gap-3 flex-wrap z-10">
        <div className="flex items-center space-x-3">
          <Package className="w-5 h-5 text-[#5B9B8D]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
              <span>Bill of Materials (BOM)</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#151F2B] text-[#5B9B8D] border border-[#25332F]">
                {project.components.length} parts ({filteredItems.length} unique)
              </span>
            </h2>
            <div className="text-[11px] text-[#96A6A3] font-mono">
              Sourcing & Part Inventory · Revision {project.revision}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center space-x-2">
          <button
            onClick={handleExportCSV}
            title="Download BOM as CSV"
            className="flex items-center space-x-1.5 bg-[#151F2B] hover:bg-[#25332F] text-zinc-300 hover:text-white px-3 py-1.5 rounded text-xs font-mono border border-[#25332F] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print or export clean BOM"
            className="flex items-center space-x-1.5 bg-[#356B62]/20 hover:bg-[#356B62]/30 text-[#5B9B8D] px-3 py-1.5 rounded text-xs font-mono border border-[#356B62]/40 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print BOM</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-4 py-2.5 border-b border-[#25332F] bg-[#101720]/60 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center space-x-2 flex-1 min-w-[240px]">
          <div className="relative flex-1 max-w-md">
            <Search className="w-3.5 h-3.5 text-[#96A6A3] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search by part name, ID, designator (e.g. U1, R1)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#151F2B] border border-[#25332F] text-xs font-mono rounded pl-8 pr-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#356B62]"
            />
          </div>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span className="text-[#96A6A3] text-[11px] flex items-center space-x-1">
            <Filter className="w-3 h-3" />
            <span>Category:</span>
          </span>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-[#151F2B] border border-[#25332F] text-xs rounded px-2.5 py-1 text-zinc-200 focus:outline-none focus:border-[#356B62]"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat === 'ALL' ? 'All Categories' : cat.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Interactive Table Content */}
      <div className="flex-1 overflow-auto p-4">
        <div className="border border-[#25332F] rounded-lg overflow-hidden bg-[#101720] print:border-none print:bg-white print:text-black">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#151F2B] border-b border-[#25332F] text-[#96A6A3] print:bg-gray-100 print:text-black">
              <tr>
                <th className="py-2.5 px-3 w-8"></th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors"
                  onClick={() => handleSort('catalogId')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Part ID</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors font-sans"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center space-x-1">
                    <span>Component & Specs</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th
                  className="py-2.5 px-3 cursor-pointer hover:text-white transition-colors text-center"
                  onClick={() => handleSort('quantity')}
                >
                  <div className="flex items-center justify-center space-x-1">
                    <span>Qty</span>
                    <ArrowUpDown className="w-3 h-3 text-zinc-500" />
                  </div>
                </th>
                <th className="py-2.5 px-3">Designators (Click to Navigate)</th>
                <th className="py-2.5 px-3 font-sans">Manufacturer / Part #</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Datasheet</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#25332F]/50 print:divide-gray-200">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-[#96A6A3] font-mono">
                    No components match the selected query.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isExpanded = expandedCatalogIds.has(item.catalogId);

                  return (
                    <React.Fragment key={item.catalogId}>
                      <tr className="hover:bg-[#151F2B]/40 transition-colors">
                        <td className="py-2.5 px-2 text-center">
                          <button
                            onClick={() => toggleExpand(item.catalogId)}
                            className="p-1 hover:text-white text-zinc-500 rounded"
                            title="Expand instances"
                          >
                            {isExpanded ? (
                              <ChevronDown className="w-3.5 h-3.5 text-[#5B9B8D]" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#5B9B8D]">{item.catalogId}</td>
                        <td className="py-2.5 px-3">
                          <div className="text-white font-sans font-medium">{item.name}</div>
                          <div className="flex items-center space-x-2 text-[10px] text-[#96A6A3] mt-0.5 font-mono">
                            <span className="uppercase text-purple-400">{item.category}</span>
                            <span>·</span>
                            <span>{item.valueRating}</span>
                            <span>·</span>
                            <span>{item.package}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-white text-sm">
                          {item.quantity}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="flex flex-wrap gap-1">
                            {item.designators.map((d: string) => (
                              <button
                                key={d}
                                onClick={() => onNavigateToComponent && onNavigateToComponent(d)}
                                className="bg-[#151F2B] hover:bg-[#25332F] text-[#5B9B8D] hover:text-white border border-[#25332F] px-2 py-0.5 rounded text-[11px] font-mono transition-colors flex items-center space-x-1"
                                title={`Select ${d} on Circuit Canvas`}
                              >
                                <span>{d}</span>
                              </button>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-sans text-xs">
                          <div className="text-zinc-200">{item.manufacturer}</div>
                          <div className="text-[10px] font-mono text-zinc-400">{item.partNumber}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {item.isVerified ? (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-emerald-950/40 text-emerald-400 border border-emerald-800/40 font-mono">
                              <ShieldCheck className="w-3 h-3" />
                              <span>Verified</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded text-[10px] bg-amber-950/40 text-amber-400 border border-amber-800/40 font-mono">
                              <AlertCircle className="w-3 h-3" />
                              <span>Custom</span>
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {item.datasheetUrl ? (
                            <a
                              href={item.datasheetUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center space-x-1 text-[#5B9B8D] hover:text-white transition-colors"
                            >
                              <span>PDF</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>

                      {/* Expandable Instances Row */}
                      {isExpanded && (
                        <tr className="bg-[#151F2B]/40 border-b border-[#25332F]/60">
                          <td colSpan={8} className="p-3 pl-10">
                            <div className="space-y-2">
                              <div className="font-semibold text-zinc-400 font-sans text-[11px] uppercase tracking-wider">
                                Individual Instances ({item.instances.length})
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {item.instances.map((inst: any) => (
                                  <div
                                    key={inst.instance_id}
                                    className="bg-[#101720] border border-[#25332F] p-2.5 rounded flex items-center justify-between"
                                  >
                                    <div>
                                      <div className="font-bold text-[#5B9B8D]">{inst.instance_id}</div>
                                      <div className="text-[11px] text-zinc-400 font-sans truncate max-w-[160px]">
                                        {inst.name}
                                      </div>
                                      <div className="text-[10px] font-mono text-zinc-500">
                                        Canvas: ({Math.round(inst.position.x)}, {Math.round(inst.position.y)})
                                      </div>
                                    </div>
                                    <button
                                      onClick={() => onNavigateToComponent && onNavigateToComponent(inst.instance_id)}
                                      className="text-[10px] text-[#5B9B8D] hover:text-white bg-[#151F2B] hover:bg-[#25332F] px-2 py-1 rounded border border-[#25332F] transition-colors flex items-center space-x-1"
                                    >
                                      <span>Select on Canvas</span>
                                      <ExternalLink className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                ))}
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
      </div>
    </div>
  );
};
