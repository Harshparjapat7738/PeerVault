import React, { useState } from 'react';
import { 
  BookOpen, 
  Search, 
  Copy, 
  Check, 
  Download, 
  Code, 
  Database, 
  ShieldCheck, 
  Layers, 
  Workflow, 
  Sparkles, 
  Terminal 
} from 'lucide-react';
import { ARCHITECTURE_SECTIONS, ArchitectureDeliverable } from '../data/architectureDocs';

export const ArchitectureSuite: React.FC = () => {
  const [selectedSectionId, setSelectedSectionId] = useState<string>(ARCHITECTURE_SECTIONS[0].id);
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [copiedSection, setCopiedSection] = useState(false);

  const categories = ['All', 'Strategic', 'Architecture', 'Security', 'Flows', 'System Design', 'Execution'];

  const filteredSections = ARCHITECTURE_SECTIONS.filter(s => {
    const matchesCategory = categoryFilter === 'All' ? true : s.category === categoryFilter;
    const matchesSearch = 
      s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.content.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesCategory && matchesSearch;
  });

  const selectedSection = ARCHITECTURE_SECTIONS.find(s => s.id === selectedSectionId) || ARCHITECTURE_SECTIONS[0];

  const handleCopy = () => {
    navigator.clipboard?.writeText(selectedSection.content);
    setCopiedSection(true);
    setTimeout(() => setCopiedSection(false), 2000);
  };

  const handleDownloadFullReport = () => {
    const fullText = ARCHITECTURE_SECTIONS.map(s => `# Section ${s.sectionNumber}: ${s.title}\n\n${s.content}\n\n---\n`).join('\n');
    const blob = new Blob([fullText], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'PeerVault_Architecture_and_ADR_Specification.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      
      {/* Header Bar */}
      <div className="bg-slate-900/80 p-5 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center space-x-2">
            <BookOpen className="w-5 h-5 text-cyan-400" />
            <span>Architectural Blueprint, ADRs & Claude Build Suite</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Full 36-section system specification, PostgreSQL DDL schemas, STRIDE matrix, and sequential Claude Code implementation prompts.
          </p>
        </div>

        <button
          onClick={handleDownloadFullReport}
          className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-md transition-colors cursor-pointer shrink-0"
        >
          <Download className="w-4 h-4" />
          <span>Export Blueprint (.md)</span>
        </button>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Section List Navigation */}
        <div className="space-y-3">
          
          {/* Search & Category Filter */}
          <div className="space-y-2 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search specs, DDL, flows, ADRs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex flex-wrap gap-1">
              {categories.map((c) => (
                <button
                  key={c}
                  onClick={() => setCategoryFilter(c)}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium transition-colors cursor-pointer ${
                    categoryFilter === c
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-400 hover:text-slate-200 bg-slate-950'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Section Cards */}
          <div className="space-y-2 max-h-[580px] overflow-y-auto pr-1">
            {filteredSections.map((sec) => {
              const isSelected = selectedSectionId === sec.id;
              return (
                <div
                  key={sec.id}
                  onClick={() => setSelectedSectionId(sec.id)}
                  className={`p-3 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800/90 border-cyan-500/40 shadow-md'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-mono text-cyan-400 font-bold">
                      #{sec.sectionNumber}
                    </span>
                    <span className="text-[10px] bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded border border-slate-800">
                      {sec.category}
                    </span>
                  </div>
                  <h4 className="font-semibold text-xs text-slate-200 truncate">{sec.title}</h4>
                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">{sec.summary}</p>
                </div>
              );
            })}
          </div>

        </div>

        {/* Right Section Content Reader */}
        <div className="lg:col-span-2 bg-slate-900/80 rounded-2xl border border-slate-800 p-6 space-y-4 shadow-xl overflow-hidden flex flex-col">
          
          <div className="flex items-start justify-between border-b border-slate-800 pb-4">
            <div>
              <div className="flex items-center space-x-2 text-xs font-mono text-cyan-400">
                <span>Deliverable #{selectedSection.sectionNumber}</span>
                <span>•</span>
                <span>{selectedSection.category}</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1">{selectedSection.title}</h3>
            </div>

            <button
              onClick={handleCopy}
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer shrink-0"
            >
              {copiedSection ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedSection ? 'Copied' : 'Copy Content'}</span>
            </button>
          </div>

          {/* Render Content */}
          <div className="overflow-y-auto max-h-[520px] space-y-4 text-xs text-slate-300 leading-relaxed font-sans pr-2">
            <div className="bg-slate-950/70 p-5 rounded-xl border border-slate-800/80 font-mono text-[11px] whitespace-pre-wrap leading-relaxed shadow-inner">
              {selectedSection.content}
            </div>
          </div>

          {/* CLAUDE.md Continuity Notice */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center">
              <Sparkles className="w-3.5 h-3.5 mr-1 text-cyan-400" />
              CLAUDE.md Execution Memory Synchronized
            </span>
            <span className="text-emerald-400">Ready for Claude Code Tooling</span>
          </div>

        </div>

      </div>

    </div>
  );
};
