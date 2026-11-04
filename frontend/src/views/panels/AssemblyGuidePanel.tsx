import React, { useMemo, useState } from 'react';
import {
  Wrench,
  ShieldAlert,
  Printer,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info,
  ListOrdered,
  ChevronRight,
  BookOpen,
} from 'lucide-react';
import { Project } from '../../types';

interface AssemblyGuidePanelProps {
  project: Project;
}

export const AssemblyGuidePanel: React.FC<AssemblyGuidePanelProps> = ({ project }) => {
  const guideMarkdown = project.assembly_guide || '';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSection, setActiveSection] = useState<string | null>(null);

  // Parse Table of Contents from markdown headings
  const tocItems = useMemo(() => {
    const items: { id: string; title: string; level: number }[] = [];
    const lines = guideMarkdown.split('\n');
    lines.forEach((line) => {
      const match = line.match(/^(#{2,3})\s+(.+)$/);
      if (match) {
        const level = match[1].length;
        const rawTitle = match[2].trim();
        // Generate an anchor id
        const id = rawTitle
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        items.push({ id, title: rawTitle, level });
      }
    });
    return items;
  }, [guideMarkdown]);

  const handleDownload = () => {
    const blob = new Blob([guideMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.name.toLowerCase().replace(/\s+/g, '_')}_assembly_guide_rev${project.revision}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  const scrollToHeading = (id: string) => {
    setActiveSection(id);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Helper to render inline markdown (bold, code, links)
  const renderInline = (text: string): React.ReactNode => {
    // Split by code spans first
    const parts = text.split(/(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g);
    return parts.map((part, idx) => {
      if (part.startsWith('`') && part.endsWith('`')) {
        const codeText = part.slice(1, -1);
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 rounded bg-[#151F2B] border border-[#25332F] font-mono text-[11px] text-[#5B9B8D]"
          >
            {codeText}
          </code>
        );
      }
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={idx} className="font-semibold text-white">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith('*') && part.endsWith('*')) {
        return <em key={idx} className="italic text-zinc-300">{part.slice(1, -1)}</em>;
      }
      return part;
    });
  };

  // Structured Markdown Parser Component
  const renderStructuredMarkdown = () => {
    if (!guideMarkdown) {
      return (
        <div className="p-8 text-center text-[#96A6A3] font-mono">
          No assembly guide generated yet for this revision. Synthesize the project to generate instructions.
        </div>
      );
    }

    const lines = guideMarkdown.split('\n');
    const elements: React.ReactNode[] = [];
    let inTable = false;
    let tableRows: string[][] = [];
    let tableHeader: string[] = [];
    let inCallout = false;
    let calloutType: 'IMPORTANT' | 'WARNING' | 'NOTE' = 'NOTE';
    let calloutLines: string[] = [];

    const flushTable = (key: string) => {
      if (tableHeader.length > 0) {
        elements.push(
          <div key={key} className="my-4 border border-[#25332F] rounded-lg overflow-x-auto bg-[#101720]">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#151F2B] border-b border-[#25332F] text-[#96A6A3]">
                <tr>
                  {tableHeader.map((h, i) => (
                    <th key={i} className="py-2.5 px-3 whitespace-nowrap font-semibold">
                      {renderInline(h.trim())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#25332F]/50">
                {tableRows.map((row, rIdx) => (
                  <tr key={rIdx} className="hover:bg-[#151F2B]/40 transition-colors">
                    {row.map((cell, cIdx) => (
                      <td key={cIdx} className="py-2 px-3 text-zinc-300 font-sans text-xs">
                        {renderInline(cell.trim())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      }
      tableHeader = [];
      tableRows = [];
      inTable = false;
    };

    const flushCallout = (key: string) => {
      let icon = <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />;
      let borderStyle = 'border-sky-800/60 bg-sky-950/20 text-sky-200';
      if (calloutType === 'WARNING') {
        icon = <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />;
        borderStyle = 'border-amber-800/60 bg-amber-950/20 text-amber-200';
      } else if (calloutType === 'IMPORTANT') {
        icon = <ShieldAlert className="w-4 h-4 text-[#5B9B8D] flex-shrink-0" />;
        borderStyle = 'border-[#356B62]/50 bg-[#356B62]/10 text-purple-200';
      }

      elements.push(
        <div key={key} className={`my-4 border rounded-lg p-3.5 flex items-start space-x-3 text-xs ${borderStyle}`}>
          {icon}
          <div className="space-y-1 leading-relaxed font-sans">
            {calloutLines.map((cl, i) => (
              <p key={i}>{renderInline(cl)}</p>
            ))}
          </div>
        </div>
      );
      calloutLines = [];
      inCallout = false;
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Table parsing
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        const cells = line
          .trim()
          .slice(1, -1)
          .split('|');

        // Check if separator line (| --- | :---: |)
        if (cells.every((c) => c.trim().match(/^:?-+:?$/))) {
          inTable = true;
          continue;
        }

        if (!inTable) {
          tableHeader = cells;
          inTable = true;
        } else {
          tableRows.push(cells);
        }
        continue;
      } else if (inTable) {
        flushTable(`table-${i}`);
      }

      // Callout parsing (> [!IMPORTANT], > [!WARNING])
      if (line.startsWith('> [!')) {
        if (inCallout) flushCallout(`callout-pre-${i}`);
        inCallout = true;
        if (line.includes('IMPORTANT')) calloutType = 'IMPORTANT';
        else if (line.includes('WARNING')) calloutType = 'WARNING';
        else calloutType = 'NOTE';
        continue;
      } else if (inCallout && line.startsWith('>')) {
        calloutLines.push(line.replace(/^>\s?/, ''));
        continue;
      } else if (inCallout) {
        flushCallout(`callout-${i}`);
      }

      // Headers
      if (line.startsWith('# ')) {
        elements.push(
          <h1 key={i} className="text-xl font-bold font-mono text-white tracking-tight pb-2 border-b border-[#25332F]">
            {renderInline(line.slice(2))}
          </h1>
        );
        continue;
      }

      if (line.startsWith('## ')) {
        const title = line.slice(3).trim();
        const id = title
          .toLowerCase()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-');
        elements.push(
          <div key={i} id={id} className="pt-6 scroll-mt-6">
            <h2 className="text-base font-bold font-mono text-white flex items-center space-x-2 pb-1.5 border-b border-[#25332F]/60">
              <span className="w-2 h-2 rounded-full bg-[#356B62]" />
              <span>{renderInline(title)}</span>
            </h2>
          </div>
        );
        continue;
      }

      if (line.startsWith('### ')) {
        elements.push(
          <h3 key={i} className="text-sm font-semibold font-mono text-[#5B9B8D] pt-3 pb-1">
            {renderInline(line.slice(4))}
          </h3>
        );
        continue;
      }

      // Horizontal separator
      if (line.trim() === '---') {
        elements.push(<hr key={i} className="border-[#25332F] my-4" />);
        continue;
      }

      // Checklists (- [ ] or - [x])
      if (line.trim().startsWith('- [ ]') || line.trim().startsWith('- [x]')) {
        const isChecked = line.trim().startsWith('- [x]');
        const text = line.trim().slice(5).trim();
        elements.push(
          <div key={i} className="flex items-start space-x-2.5 text-xs text-zinc-300 py-1 font-sans">
            <CheckCircle2
              className={`w-4 h-4 flex-shrink-0 mt-0.5 ${isChecked ? 'text-emerald-400' : 'text-zinc-600'}`}
            />
            <span className={isChecked ? 'line-through text-zinc-500' : ''}>{renderInline(text)}</span>
          </div>
        );
        continue;
      }

      // Unordered lists
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        elements.push(
          <div key={i} className="flex items-start space-x-2 text-xs text-zinc-300 py-0.5 font-sans pl-2">
            <span className="text-[#5B9B8D] font-bold">•</span>
            <span className="leading-relaxed">{renderInline(line.trim().slice(2))}</span>
          </div>
        );
        continue;
      }

      // Numbered lists (1. , 2. )
      const numMatch = line.trim().match(/^(\d+)\.\s+(.+)$/);
      if (numMatch) {
        elements.push(
          <div key={i} className="flex items-start space-x-2 text-xs text-zinc-300 py-1 font-sans pl-1">
            <span className="font-mono text-[#5B9B8D] font-bold text-[11px] min-w-[20px]">{numMatch[1]}.</span>
            <span className="leading-relaxed">{renderInline(numMatch[2])}</span>
          </div>
        );
        continue;
      }

      // Plain paragraph (skip empty lines)
      if (line.trim().length > 0) {
        elements.push(
          <p key={i} className="text-xs text-zinc-300 font-sans leading-relaxed my-1">
            {renderInline(line)}
          </p>
        );
      }
    }

    if (inTable) flushTable('table-end');
    if (inCallout) flushCallout('callout-end');

    return elements;
  };

  return (
    <div className="h-full flex flex-col bg-[#090D12] text-[#F1F5F4]">
      {/* Top Header & Toolbar */}
      <div className="p-3.5 border-b border-[#25332F] bg-[#101720] flex items-center justify-between gap-3 z-10 flex-wrap">
        <div className="flex items-center space-x-3">
          <Wrench className="w-5 h-5 text-[#5B9B8D]" />
          <div>
            <h2 className="font-mono text-sm font-bold text-white flex items-center space-x-2">
              <span>Assembly & Testing Guide</span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-[#151F2B] text-[#5B9B8D] border border-[#25332F]">
                Rev {project.revision}
              </span>
            </h2>
            <div className="text-[11px] text-[#96A6A3] font-mono">
              Target: `{project.target_board}` · Derived from canonical project graph
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#96A6A3] absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search guide..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#151F2B] border border-[#25332F] text-xs font-mono rounded pl-8 pr-3 py-1.5 text-white placeholder-zinc-500 focus:outline-none focus:border-[#356B62] w-40 sm:w-56"
            />
          </div>

          <button
            onClick={handleDownload}
            title="Download full Markdown document"
            className="flex items-center space-x-1.5 bg-[#151F2B] hover:bg-[#25332F] text-zinc-300 hover:text-white px-3 py-1.5 rounded text-xs font-mono border border-[#25332F] transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Download .MD</span>
          </button>

          <button
            onClick={handlePrint}
            title="Print or export as PDF"
            className="flex items-center space-x-1.5 bg-[#356B62]/20 hover:bg-[#356B62]/30 text-[#5B9B8D] px-3 py-1.5 rounded text-xs font-mono border border-[#356B62]/40 transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Guide</span>
          </button>
        </div>
      </div>

      {/* Main Content Layout with Sticky TOC Sidebar */}
      <div className="flex-1 overflow-hidden flex">
        {/* Table of Contents Sidebar */}
        <div className="hidden lg:block w-72 h-full border-r border-[#25332F] bg-[#101720]/60 p-4 overflow-y-auto font-mono text-xs">
          <div className="flex items-center space-x-2 text-[#96A6A3] uppercase tracking-wider text-[11px] font-bold mb-3">
            <BookOpen className="w-3.5 h-3.5 text-[#5B9B8D]" />
            <span>Contents</span>
          </div>
          <div className="space-y-1">
            {tocItems.map((item, idx) => (
              <button
                key={idx}
                onClick={() => scrollToHeading(item.id)}
                className={`w-full text-left py-1 px-2 rounded transition-colors text-[11px] truncate flex items-center space-x-1.5 ${
                  activeSection === item.id
                    ? 'bg-[#151F2B] text-[#5B9B8D] font-bold border-l-2 border-[#356B62]'
                    : 'text-[#96A6A3] hover:text-white hover:bg-[#151F2B]/40'
                }`}
              >
                <ChevronRight className="w-3 h-3 text-zinc-600 flex-shrink-0" />
                <span className="truncate">{item.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Document Body */}
        <div className="flex-1 h-full overflow-y-auto p-6 lg:p-8 max-w-4xl mx-auto w-full space-y-4 print:p-0 print:max-w-none">
          <div className="bg-[#101720] border border-[#25332F] rounded-xl p-6 sm:p-8 shadow-xl print:border-none print:bg-white print:text-black">
            {renderStructuredMarkdown()}
          </div>
        </div>
      </div>
    </div>
  );
};
