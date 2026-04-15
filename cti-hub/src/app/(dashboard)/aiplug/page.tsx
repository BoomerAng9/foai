'use client';

/**
 * /aiplug — aiPLUG & Play launcher
 * ===================================
 * Public landing for the flagship demo plugs. First plug:
 * SMB Marketing (seeded in ensureAiplugTables).
 *
 * I-1 ships the list + detail pages + launch endpoint scaffolding.
 * I-2 wires the actual autonomous runtime.
 */

import Link from 'next/link';
import { useEffect, useState } from 'react';
import {
  Sparkles,
  Zap,
  Rocket,
  Star,
  ArrowRight,
  Package,
} from 'lucide-react';
import { BoomerangLoader } from '@/components/branding/BoomerangLoader';
import type { PlugRow } from '@/lib/aiplug/types';

function formatCents(cents: number): string {
  if (cents === 0) return 'Free demo';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function AiPlugLauncherPage() {
  const [plugs, setPlugs] = useState<PlugRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/aiplug')
      .then(async r => {
        if (!r.ok) {
          const body = await r.json().catch(() => ({}));
          throw new Error(body.error || `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: { plugs: PlugRow[] }) => {
        setPlugs(d.plugs || []);
        setLoading(false);
      })
      .catch(err => {
        setError(err instanceof Error ? err.message : 'Failed to load plugs');
        setLoading(false);
      });
  }, []);

  const featured = plugs.find(p => p.featured);
  const rest = plugs.filter(p => !p.featured);

  return (
    <div className="max-w-6xl">
      {/* Hero */}
      <div className="mb-10">
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.2em] uppercase text-fg-tertiary mb-3">
          <Sparkles className="w-3 h-3" />
          <span>aiPLUG &amp; Play Launcher</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg mb-3">
          Real agents. One click. Live.
        </h1>
        <p className="text-sm md:text-base text-fg-secondary max-w-2xl leading-relaxed">
          Production aiPLUGs that run autonomously on your behalf — multi-modal
          reasoning, live browser control, and owner-viewable execution logs.
          Pick one, launch it, and watch it work.
        </p>
      </div>

      {loading && (
        <BoomerangLoader
          layout="inline"
          size="md"
          className="py-16"
          label="Loading aiPLUGs..."
          labelClassName="text-xs tracking-[0.2em]"
        />
      )}

      {error && (
        <div className="p-4 border border-signal-error/40 bg-signal-error/10 rounded">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-signal-error mb-1">
            Error
          </div>
          <div className="text-sm text-fg">{error}</div>
        </div>
      )}

      {!loading && !error && plugs.length === 0 && (
        <div className="py-16 text-center">
          <Package className="w-10 h-10 text-fg-tertiary mx-auto mb-3" />
          <div className="text-sm text-fg-secondary">
            No plugs available yet. Check back soon.
          </div>
        </div>
      )}

      {!loading && !error && featured && (
        <Link
          href={`/aiplug/${featured.slug}`}
          className="group block mb-8 border border-border bg-bg-surface rounded-2xl overflow-hidden hover:border-accent transition-all"
        >
          <div className="p-8 md:p-10 relative">
            <div className="absolute top-5 right-5 flex items-center gap-1.5 text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 bg-accent text-bg rounded">
              <Star className="w-3 h-3" />
              Flagship
            </div>
            <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-2">
              {featured.category}
            </div>
            <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-fg group-hover:text-accent transition-colors mb-2">
              {featured.name}
            </h2>
            <p className="text-base text-fg-secondary max-w-2xl mb-5">
              {featured.tagline}
            </p>
            {featured.features.length > 0 && (
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-6 mb-6 max-w-2xl">
                {featured.features.slice(0, 6).map(f => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-fg"
                  >
                    <Zap className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex items-center gap-4">
              <span className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent text-bg text-xs font-mono font-bold tracking-wider uppercase rounded">
                <Rocket className="w-4 h-4" />
                Launch in One Click
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </span>
              <span className="text-[11px] font-mono text-fg-tertiary">
                {formatCents(featured.price_cents)}
              </span>
            </div>
          </div>
        </Link>
      )}

      {!loading && !error && rest.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rest.map(plug => (
            <Link
              key={plug.id}
              href={`/aiplug/${plug.slug}`}
              className="group block border border-border bg-bg-surface rounded-lg p-5 hover:border-accent transition-all"
            >
              <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-2">
                {plug.category}
              </div>
              <h3 className="text-base font-bold text-fg group-hover:text-accent transition-colors mb-1">
                {plug.name}
              </h3>
              <p className="text-xs text-fg-secondary line-clamp-3 mb-4">
                {plug.tagline}
              </p>
              <div className="flex items-center justify-between text-[10px] font-mono text-fg-tertiary">
                <span>{formatCents(plug.price_cents)}</span>
                <span className="group-hover:text-accent transition-colors">
                  Launch →
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
