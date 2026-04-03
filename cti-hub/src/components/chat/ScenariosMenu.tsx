'use client';

import { useState } from 'react';
import {
  Presentation, FileText, BarChart3, PenTool, Palette, Search,
  Workflow, Trophy, Code2, Sparkles, Mic, Database,
} from 'lucide-react';

export interface ScenarioSelection {
  mode: 'auto' | 'specify';
  categories: string[];
  subOptions: string[];
}

interface ScenariosMenuProps {
  onSelect: (selection: ScenarioSelection) => void;
  onClose: () => void;
}

const PLUGIN_TILES = [
  { id: 'slides', label: 'Slide Builder', icon: Presentation, desc: 'Pitch decks, presentations' },
  { id: 'docs', label: 'Doc Writer', icon: FileText, desc: 'Reports, memos, proposals' },
  { id: 'data', label: 'Data Pipeline', icon: Database, desc: 'Dashboards, analysis' },
  { id: 'content', label: 'Content Calendar', icon: PenTool, desc: 'Social media, blogs, ads' },
  { id: 'brand', label: 'Brand Kit', icon: Palette, desc: 'Logo, colors, typography' },
  { id: 'sports', label: 'Scouting Report', icon: Trophy, desc: 'Per|Form sports analytics' },
  { id: 'media', label: 'Media Engine', icon: Mic, desc: 'Podcasts, video, audio' },
  { id: 'automation', label: 'Automation Flow', icon: Workflow, desc: 'Multi-step workflows' },
  { id: 'research', label: 'Research Brief', icon: Search, desc: 'Deep-dive sourced research' },
  { id: 'code', label: 'Code Builder', icon: Code2, desc: 'App scaffolding, APIs' },
  { id: 'csv', label: 'Data Analyzer', icon: BarChart3, desc: 'Upload and analyze data' },
  { id: 'voice', label: 'Voice Studio', icon: Mic, desc: 'Voice generation, cloning' },
];

const SCENARIO_CATEGORIES = [
  { id: 'presentations', label: 'Presentations', subs: ['Pitch Deck', 'Sales Deck', 'Training Deck', 'Investor Update'] },
  { id: 'documents', label: 'Documents', subs: ['Report', 'Memo', 'Proposal', 'Contract'] },
  { id: 'analytics', label: 'Data & Analytics', subs: ['Dashboard', 'Analysis Report', 'Data Pipeline'] },
  { id: 'content', label: 'Content', subs: ['Social Calendar', 'Blog Post', 'Ad Copy', 'Newsletter'] },
  { id: 'creative', label: 'Creative', subs: ['Brand Kit', 'Design Assets', 'Video', 'Audio'] },
  { id: 'research', label: 'Research', subs: ['Market Research', 'Competitive Analysis', 'Deep Brief'] },
  { id: 'automation', label: 'Automation', subs: ['Workflow', 'Triggers', 'Scheduled Tasks'] },
  { id: 'sports', label: 'Sports / Per|Form', subs: ['Scouting Report', 'Player Comparison', 'Game Analysis', 'Podcast Script'] },
  { id: 'code', label: 'Code & Deploy', subs: ['API', 'Web App', 'Mobile App', 'Deployment'] },
  { id: 'custom', label: 'Custom', subs: [] },
];

export function ScenariosMenu({ onSelect, onClose }: ScenariosMenuProps) {
  const [mode, setMode] = useState<'auto' | 'specify' | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [selectedSubs, setSelectedSubs] = useState<Set<string>>(new Set());

  function toggleCategory(id: string) {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  function toggleSub(sub: string) {
    setSelectedSubs(prev => {
      const next = new Set(prev);
      next.has(sub) ? next.delete(sub) : next.add(sub);
      return next;
    });
  }

  function handleConfirm() {
    onSelect({
      mode: mode || 'auto',
      categories: Array.from(selectedCategories),
      subOptions: Array.from(selectedSubs),
    });
  }

  // Initial view — Specify / Auto toggle
  if (mode === null) {
    return (
      <div className="w-[300px] bg-bg-surface border border-border shadow-lg p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-fg-secondary">Scenarios</span>
          <button onClick={onClose} className="text-fg-ghost hover:text-fg text-xs">x</button>
        </div>

        {/* Specify / Auto Toggle — one row, split in half */}
        <div className="flex border border-border mb-4">
          <button
            onClick={() => setMode('specify')}
            className="flex-1 py-3 text-center font-mono text-[11px] font-bold tracking-wider transition-colors hover:bg-bg-elevated"
          >
            SPECIFY
          </button>
          <div className="w-px bg-border" />
          <button
            onClick={() => { setMode('auto'); onSelect({ mode: 'auto', categories: [], subOptions: [] }); }}
            className="flex-1 py-3 text-center font-mono text-[11px] font-bold tracking-wider transition-colors hover:bg-bg-elevated"
          >
            AUTO
          </button>
        </div>

        <p className="text-[10px] text-fg-ghost text-center">
          <strong>Specify:</strong> Choose what you want built. <strong>Auto:</strong> Just describe it — ACHEEVY handles the rest.
        </p>
      </div>
    );
  }

  // Specify mode — category tiles
  return (
    <div className="w-[360px] max-h-[480px] overflow-y-auto bg-bg-surface border border-border shadow-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <button onClick={() => setMode(null)} className="text-fg-ghost hover:text-fg text-xs">&larr;</button>
          <span className="font-mono text-[10px] font-bold tracking-wider uppercase text-fg-secondary">Specify Scenario</span>
        </div>
        <button onClick={onClose} className="text-fg-ghost hover:text-fg text-xs">x</button>
      </div>

      {/* Category tiles — 2 columns */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        {SCENARIO_CATEGORIES.map(cat => (
          <button
            key={cat.id}
            onClick={() => toggleCategory(cat.id)}
            className={`p-3 text-left transition-all ${
              selectedCategories.has(cat.id)
                ? 'bg-accent/10 border border-accent/30'
                : 'bg-bg-elevated border border-border hover:border-fg-ghost'
            }`}
          >
            <span className="text-[11px] font-semibold block">{cat.label}</span>
            {cat.subs.length > 0 && (
              <span className="text-[8px] text-fg-ghost">{cat.subs.length} options</span>
            )}
          </button>
        ))}
      </div>

      {/* Sub-options for selected categories */}
      {Array.from(selectedCategories).map(catId => {
        const cat = SCENARIO_CATEGORIES.find(c => c.id === catId);
        if (!cat || cat.subs.length === 0) return null;
        return (
          <div key={catId} className="mb-3">
            <span className="font-mono text-[9px] text-fg-ghost uppercase tracking-wider block mb-1.5">{cat.label}</span>
            <div className="flex flex-wrap gap-1">
              {cat.subs.map(sub => (
                <button
                  key={sub}
                  onClick={() => toggleSub(sub)}
                  className={`px-2.5 py-1 text-[10px] transition-all ${
                    selectedSubs.has(sub)
                      ? 'bg-accent text-bg font-semibold'
                      : 'bg-bg-elevated text-fg-secondary hover:text-fg border border-border'
                  }`}
                >
                  {sub}
                </button>
              ))}
            </div>
          </div>
        );
      })}

      {/* Confirm */}
      {selectedCategories.size > 0 && (
        <button
          onClick={handleConfirm}
          className="w-full py-2.5 btn-solid font-mono text-[10px] tracking-wider mt-2"
        >
          BUILD THIS SCENARIO
        </button>
      )}
    </div>
  );
}

export { PLUGIN_TILES };
