'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

/* ── Types ──────────────────────────────────────────────── */
interface MarketplugPlug {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  model_id?: string;
  install_count: number;
}

const CATEGORIES = [
  'All',
  'Business',
  'Creative',
  'Research',
  'Education',
  'Finance',
  'Marketing',
  'Tech',
] as const;

type Category = (typeof CATEGORIES)[number];

/* ── Skeleton Card ──────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-bg-surface border border-border p-4 animate-pulse">
      <div className="h-4 w-2/3 bg-bg-elevated rounded mb-3" />
      <div className="h-3 w-16 bg-bg-elevated rounded mb-3" />
      <div className="space-y-2 mb-4">
        <div className="h-3 w-full bg-bg-elevated rounded" />
        <div className="h-3 w-4/5 bg-bg-elevated rounded" />
      </div>
      <div className="flex items-center justify-between">
        <div className="h-3 w-12 bg-bg-elevated rounded" />
        <div className="h-8 w-20 bg-bg-elevated rounded" />
      </div>
    </div>
  );
}

/* ── Plug Card ──────────────────────────────────────────── */
function PlugCard({
  plug,
  installed,
  onInstall,
  installing,
}: {
  plug: MarketplugPlug;
  installed: boolean;
  onInstall: (slug: string) => void;
  installing: boolean;
}) {
  const isFree = plug.model_id?.includes(':free');
  const tier = isFree ? 'FREE' : 'PRO';

  return (
    <div className="bg-bg-surface border border-border p-4 flex flex-col justify-between hover:border-accent/40 transition-colors">
      {/* Header */}
      <div>
        <h3 className="font-mono font-bold text-sm text-fg truncate">{plug.name}</h3>

        <div className="flex items-center gap-2 mt-2">
          <span className="font-mono text-[10px] px-2 py-0.5 bg-bg-elevated border border-border text-fg-secondary uppercase tracking-wide">
            {plug.category}
          </span>
          <span
            className={`font-mono text-[10px] px-2 py-0.5 border tracking-wide ${
              isFree
                ? 'border-signal-live/40 text-signal-live bg-signal-live/5'
                : 'border-accent/40 text-accent bg-accent/5'
            }`}
          >
            {tier}
          </span>
        </div>

        <p className="font-mono text-xs text-fg-secondary mt-3 line-clamp-2 leading-relaxed">
          {plug.description}
        </p>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border">
        <span className="font-mono text-[10px] text-fg-tertiary">
          <Download className="w-3 h-3 inline mr-1 -mt-px" />
          {plug.install_count.toLocaleString()} installs
        </span>

        {installed ? (
          <button
            disabled
            className="font-mono text-[10px] px-3 py-1.5 bg-signal-live/10 text-signal-live border border-signal-live/30 flex items-center gap-1.5 cursor-default"
          >
            <Check className="w-3 h-3" />
            INSTALLED
          </button>
        ) : (
          <button
            onClick={() => onInstall(plug.slug)}
            disabled={installing}
            className="font-mono text-[10px] px-3 py-1.5 bg-accent text-bg border border-accent hover:bg-accent/90 transition-colors flex items-center gap-1.5 disabled:opacity-50"
          >
            {installing ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Download className="w-3 h-3" />
            )}
            INSTALL
          </button>
        )}
      </div>
    </div>
  );
}

/* ── Page ───────────────────────────────────────────────── */
export default function MarketplacePage() {
  const { user } = useAuth();

  const [plugs, setPlugs] = useState<MarketplugPlug[]>([]);
  const [installedSlugs, setInstalledSlugs] = useState<Set<string>>(new Set());
  const [activeCategory, setActiveCategory] = useState<Category>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [installingSlug, setInstallingSlug] = useState<string | null>(null);

  /* ── Fetch plugs ─────────────────────────────────────── */
  const fetchPlugs = useCallback(async () => {
    setLoading(true);
    try {
      const catParam =
        activeCategory !== 'All' ? `?category=${activeCategory.toLowerCase()}` : '';
      const [allRes, mineRes] = await Promise.all([
        fetch(`/api/plugs${catParam}`),
        fetch('/api/plugs?mine=true'),
      ]);

      if (allRes.ok) {
        const data = await allRes.json();
        setPlugs(data.plugs ?? []);
      }

      if (mineRes.ok) {
        const mineData = await mineRes.json();
        const slugs = (mineData.plugs ?? []).map((p: MarketplugPlug) => p.slug);
        setInstalledSlugs(new Set(slugs));
      }
    } catch {
      // silent — API may not be wired yet
    } finally {
      setLoading(false);
    }
  }, [activeCategory]);

  useEffect(() => {
    fetchPlugs();
  }, [fetchPlugs]);

  /* ── Install handler ─────────────────────────────────── */
  const handleInstall = async (slug: string) => {
    setInstallingSlug(slug);
    try {
      const res = await fetch(`/api/plugs/${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'install' }),
      });
      if (res.ok) {
        setInstalledSlugs((prev) => new Set([...prev, slug]));
      }
    } catch {
      // silent
    } finally {
      setInstallingSlug(null);
    }
  };

  /* ── Filter by search ────────────────────────────────── */
  const filtered = plugs.filter((p) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.description.toLowerCase().includes(q)
    );
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* ── Hero ───────────────────────────────────────── */}
      <div>
        <h1 className="font-mono text-xl font-bold tracking-wide text-fg">
          MARKETPLACE
        </h1>
        <p className="font-mono text-xs text-fg-secondary mt-1">
          Browse and install AI plugs built by the community
        </p>
      </div>

      {/* ── Category filter bar ────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={`font-mono text-[10px] tracking-wide px-3 py-1.5 border transition-colors ${
              activeCategory === cat
                ? 'bg-accent text-bg border-accent'
                : 'bg-bg-surface text-fg-secondary border-border hover:text-fg hover:border-fg-tertiary'
            }`}
          >
            {cat.toUpperCase()}
          </button>
        ))}
      </div>

      {/* ── Search ─────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-fg-tertiary" />
        <input
          type="text"
          placeholder="Search plugs by name or description..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-bg-surface border border-border text-fg font-mono text-xs pl-9 pr-4 py-2.5 placeholder:text-fg-tertiary focus:outline-none focus:border-accent transition-colors"
        />
      </div>

      {/* ── Grid ───────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-mono text-xs text-fg-tertiary">
            {searchQuery
              ? 'No plugs match your search.'
              : 'No plugs available in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((plug) => (
            <PlugCard
              key={plug.id}
              plug={plug}
              installed={installedSlugs.has(plug.slug)}
              onInstall={handleInstall}
              installing={installingSlug === plug.slug}
            />
          ))}
        </div>
      )}
    </div>
  );
}
