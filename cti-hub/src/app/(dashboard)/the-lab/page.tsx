'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Search, Filter, ArrowUpDown, Star, Zap, Crown, Gem, Cpu,
  Image as ImageIcon, Video, Volume2, Mic, Code2, Layers,
  ExternalLink, Pin, ChevronDown,
} from 'lucide-react';

/* ── types ─────────────────────────────────────────────── */

type Sector = 'llm' | 'image' | 'video' | 'audio' | 'tts' | 'stt' | 'embed' | 'mcp' | 'service';
type Tier = 'open-source' | 'fast' | 'standard' | 'premium' | 'flagship';

interface ToolTile {
  id: string;
  title: string;
  provider: string;
  sector: Sector;
  tier: Tier;
  costLuc: number;
  overview: string;
  bestCase: string;
  isLatest: boolean;
  routingPriority?: number;
}

/* ── catalog ───────────────────────────────────────────── */

// User-facing names only — no model IDs, no provider names, no internal tool names.
// Per CLAUDE.md: users see agent names, quality scores, token counts, costs. That's it.
const TOOLS: ToolTile[] = [
  // Design chain
  { id: 'design-studio', title: 'Design Studio', provider: 'Premium', sector: 'image', tier: 'premium', costLuc: 2, overview: 'AI design tool — portable specs for web/mobile/marketplace.', bestCase: 'Component design + multi-surface export', isLatest: true, routingPriority: 1 },
  { id: 'page-builder', title: 'Page Builder', provider: 'Premium', sector: 'mcp', tier: 'premium', costLuc: 5, overview: 'AI page builder — mockups from filtered intent.', bestCase: 'Full page mockup generation', isLatest: true, routingPriority: 2 },
  { id: 'vector-engine', title: 'Vector Engine', provider: 'Standard', sector: 'image', tier: 'standard', costLuc: 1, overview: 'Vector gen, multiple styles, API compatible.', bestCase: 'Logo and vector asset generation', isLatest: true, routingPriority: 3 },
  { id: 'graphics-engine', title: 'Graphics Engine', provider: 'Standard', sector: 'image', tier: 'standard', costLuc: 1, overview: 'Generate, remix, edit, reframe with character refs.', bestCase: 'Text-in-image and stylized graphics', isLatest: true, routingPriority: 4 },
  { id: 'multi-surface', title: 'Multi-Surface', provider: 'Standard', sector: 'service', tier: 'standard', costLuc: 3, overview: 'Multi-surface: decks, docs, webpages, social, brochures.', bestCase: 'Presentation and multi-format content', isLatest: true, routingPriority: 5 },
  { id: 'diagram-gen', title: 'Diagram Generator', provider: 'Fast', sector: 'image', tier: 'fast', costLuc: 1, overview: 'Diagrams and visuals from text descriptions.', bestCase: 'Quick concept diagrams', isLatest: true, routingPriority: 6 },
  { id: 'photo-engine', title: 'Photo Engine', provider: 'Premium', sector: 'image', tier: 'premium', costLuc: 2, overview: 'Flagship photorealistic image generation.', bestCase: 'Photorealistic image generation', isLatest: true, routingPriority: 7 },

  // Intelligence
  { id: 'fast-intel', title: 'Fast Intelligence', provider: 'Fast', sector: 'llm', tier: 'fast', costLuc: 1, overview: 'Latest fast model. Real-time multimodal.', bestCase: 'Fast reasoning + multimodal input', isLatest: true },
  { id: 'deep-intel', title: 'Deep Intelligence', provider: 'Flagship', sector: 'llm', tier: 'flagship', costLuc: 6, overview: 'Flagship intelligence. #1 ranked.', bestCase: 'Complex reasoning, research, analysis', isLatest: true },
  { id: 'standard-chat', title: 'Standard Chat', provider: 'Open Source', sector: 'llm', tier: 'open-source', costLuc: 1, overview: 'Open-source intelligence. Default chat engine.', bestCase: 'General chat, cost-efficient tasks', isLatest: true },
  { id: 'precision-code', title: 'Precision Code', provider: 'Flagship', sector: 'llm', tier: 'flagship', costLuc: 9, overview: '1M context. Top-tier code + reasoning.', bestCase: 'Complex code, long-context analysis', isLatest: true },
  { id: 'free-tier', title: 'Free Tier', provider: 'Open Source', sector: 'llm', tier: 'open-source', costLuc: 0, overview: 'Free-tier intelligence for demo plugs and agents.', bestCase: 'Demo runtimes, cost-free tasks', isLatest: true },

  // Video
  { id: 'video-prime', title: 'Video Prime', provider: 'Premium', sector: 'video', tier: 'premium', costLuc: 5, overview: 'Flagship video generation. Character-consistent.', bestCase: 'Short-form video with character refs', isLatest: true },
  { id: 'video-motion', title: 'Video Motion', provider: 'Premium', sector: 'video', tier: 'premium', costLuc: 4, overview: 'High-quality video gen with motion control.', bestCase: 'Dynamic motion and camera control', isLatest: true },
  { id: 'video-broadcast', title: 'Video Broadcast', provider: 'Flagship', sector: 'video', tier: 'flagship', costLuc: 8, overview: 'Flagship broadcast-grade video generation.', bestCase: 'Broadcast-grade video generation', isLatest: true },

  // Voice / Audio
  { id: 'voice-premium', title: 'Voice Premium', provider: 'Premium', sector: 'tts', tier: 'premium', costLuc: 3, overview: 'Best-in-class TTS. Cloning, multi-speaker dialogue.', bestCase: 'Character voices, podcast production', isLatest: true },
  { id: 'voice-standard', title: 'Voice Standard', provider: 'Standard', sector: 'tts', tier: 'standard', costLuc: 1, overview: '5 voices, fast API. Agent voice map.', bestCase: 'Chat read-aloud, agent voices', isLatest: true },
  { id: 'transcription', title: 'Transcription', provider: 'Standard', sector: 'stt', tier: 'standard', costLuc: 1, overview: 'Sub-200ms speech-to-text. 46 voices for TTS.', bestCase: 'Real-time transcription', isLatest: true },
  { id: 'voice-persona', title: 'Voice Persona', provider: 'Premium', sector: 'tts', tier: 'premium', costLuc: 2, overview: '16 voices, 170ms latency, full-duplex.', bestCase: 'Solo voice agent personas', isLatest: true },
];

/* ── helpers ───────────────────────────────────────────── */

const SECTOR_ICONS: Record<Sector, React.ElementType> = {
  llm: Cpu, image: ImageIcon, video: Video, audio: Volume2,
  tts: Volume2, stt: Mic, embed: Layers, mcp: Code2, service: Zap,
};

const TIER_CONFIG: Record<Tier, { color: string; icon: React.ElementType }> = {
  'open-source': { color: '#10B981', icon: Star },
  'fast': { color: '#06B6D4', icon: Zap },
  'standard': { color: '#8B5CF6', icon: Star },
  'premium': { color: '#E8A020', icon: Crown },
  'flagship': { color: '#EF4444', icon: Gem },
};

const SECTORS: Sector[] = ['llm', 'image', 'video', 'tts', 'stt', 'mcp', 'service'];

type SortKey = 'priority' | 'price-asc' | 'price-desc' | 'newest';

/* ── page ──────────────────────────────────────────────── */

export default function TheLabPage() {
  const [search, setSearch] = useState('');
  const [sectorFilter, setSectorFilter] = useState<Sector | 'all'>('all');
  const [tierFilter, setTierFilter] = useState<Tier | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('priority');
  const [filterOpen, setFilterOpen] = useState(false);

  const filtered = useMemo(() => {
    let list = TOOLS.filter(t => {
      if (sectorFilter !== 'all' && t.sector !== sectorFilter) return false;
      if (tierFilter !== 'all' && t.tier !== tierFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.title.toLowerCase().includes(q) || t.provider.toLowerCase().includes(q) || t.overview.toLowerCase().includes(q);
      }
      return true;
    });

    list.sort((a, b) => {
      if (sortKey === 'price-asc') return a.costLuc - b.costLuc;
      if (sortKey === 'price-desc') return b.costLuc - a.costLuc;
      if (sortKey === 'priority') return (a.routingPriority || 99) - (b.routingPriority || 99);
      return 0; // newest = default order
    });

    return list;
  }, [search, sectorFilter, tierFilter, sortKey]);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-bg-surface">
        <div className="flex items-center gap-3">
          <Cpu className="w-4 h-4 text-accent" />
          <h1 className="font-mono text-sm font-bold tracking-wider uppercase">The Lab</h1>
          <span className="font-mono text-[10px] text-fg-ghost">{filtered.length} tools</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-fg-ghost" />
            <input
              type="text"
              placeholder="Search tools..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-7 pr-3 py-1 text-[11px] font-mono bg-bg-elevated border border-border focus:border-accent/50 outline-none w-48"
            />
          </div>
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-mono bg-bg-elevated border border-border hover:border-accent/50"
          >
            <Filter className="w-3 h-3" /> Filters <ChevronDown className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* Filters bar */}
      {filterOpen && (
        <div className="px-4 py-2 border-b border-border bg-bg-elevated flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-fg-ghost uppercase">Sector:</span>
            <button onClick={() => setSectorFilter('all')} className={`px-1.5 py-0.5 text-[9px] font-mono ${sectorFilter === 'all' ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'}`}>All</button>
            {SECTORS.map(s => (
              <button key={s} onClick={() => setSectorFilter(s)} className={`px-1.5 py-0.5 text-[9px] font-mono uppercase ${sectorFilter === s ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'}`}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-fg-ghost uppercase">Tier:</span>
            <button onClick={() => setTierFilter('all')} className={`px-1.5 py-0.5 text-[9px] font-mono ${tierFilter === 'all' ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'}`}>All</button>
            {(Object.keys(TIER_CONFIG) as Tier[]).map(t => (
              <button key={t} onClick={() => setTierFilter(t)} className={`px-1.5 py-0.5 text-[9px] font-mono ${tierFilter === t ? 'text-bg' : 'text-fg-secondary hover:text-fg'}`} style={tierFilter === t ? { background: TIER_CONFIG[t].color } : {}}>{t}</button>
            ))}
          </div>
          <div className="flex items-center gap-1">
            <span className="font-mono text-[9px] text-fg-ghost uppercase">Sort:</span>
            {([['priority', 'Routing Priority'], ['price-asc', 'Price ↑'], ['price-desc', 'Price ↓'], ['newest', 'Newest']] as [SortKey, string][]).map(([k, label]) => (
              <button key={k} onClick={() => setSortKey(k)} className={`px-1.5 py-0.5 text-[9px] font-mono ${sortKey === k ? 'bg-accent text-bg' : 'text-fg-secondary hover:text-fg'}`}>{label}</button>
            ))}
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filtered.map(tool => {
            const SectorIcon = SECTOR_ICONS[tool.sector];
            const tierCfg = TIER_CONFIG[tool.tier];
            const TierIcon = tierCfg.icon;

            return (
              <div key={tool.id} className="border border-border bg-bg-surface hover:border-fg-ghost transition-colors group">
                <div className="p-3">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <SectorIcon className="w-3.5 h-3.5 text-fg-tertiary" />
                      <span className="font-mono text-[11px] font-bold text-fg">{tool.title}</span>
                    </div>
                    {tool.isLatest && (
                      <span className="font-mono text-[8px] text-green-500 bg-green-500/10 px-1 py-0.5">LATEST</span>
                    )}
                  </div>

                  {/* Provider + Tier */}
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-mono text-[9px] text-fg-ghost">{tool.provider}</span>
                    <span className="flex items-center gap-0.5 font-mono text-[8px] px-1 py-0.5" style={{ color: tierCfg.color, background: `${tierCfg.color}15`, border: `1px solid ${tierCfg.color}30` }}>
                      <TierIcon className="w-2.5 h-2.5" /> {tool.tier}
                    </span>
                  </div>

                  {/* Overview */}
                  <p className="text-[10px] text-fg-secondary mb-2 line-clamp-2">{tool.overview}</p>

                  {/* Best case */}
                  <p className="text-[9px] text-fg-ghost italic mb-3">Best for: {tool.bestCase}</p>

                  {/* Footer */}
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold" style={{ color: tierCfg.color }}>
                      {tool.costLuc === 0 ? 'FREE' : `${tool.costLuc} LUC`}
                    </span>
                    <div className="flex items-center gap-1">
                      <button className="p-1 text-fg-ghost hover:text-fg transition-colors opacity-0 group-hover:opacity-100" title="Pin">
                        <Pin className="w-3 h-3" />
                      </button>
                      <Link
                        href={`/the-chamber?tool=${tool.id}`}
                        className="px-2 py-1 text-[9px] font-mono font-bold bg-accent/10 text-accent border border-accent/30 hover:bg-accent/20 transition-colors"
                      >
                        TRY
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
