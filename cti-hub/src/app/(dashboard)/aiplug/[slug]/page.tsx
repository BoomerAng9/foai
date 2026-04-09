'use client';

/**
 * /aiplug/[slug] — Plug detail + launch page
 * ==============================================
 * Product detail with one-click launch CTA. I-1 ships the surface
 * and the launch API returns a queued run; I-2 wires the actual
 * autonomous runtime that picks up queued rows.
 */

import { use, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Rocket,
  Loader2,
  Zap,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Clock,
  Tag,
} from 'lucide-react';
import type {
  PlugDetailResponse,
  PlugRow,
  PlugRunRow,
} from '@/lib/aiplug/types';

function formatCents(cents: number): string {
  if (cents === 0) return 'Free demo';
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PlugDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const [plug, setPlug] = useState<PlugRow | null>(null);
  const [recentRuns, setRecentRuns] = useState<PlugRunRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [lastLaunchId, setLastLaunchId] = useState<string | null>(null);
  const [launchError, setLaunchError] = useState<string | null>(null);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/aiplug/${slug}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const data = (await res.json()) as PlugDetailResponse;
      setPlug(data.plug);
      setRecentRuns(data.recentRuns || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load plug');
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  const handleLaunch = async () => {
    setLaunching(true);
    setLaunchError(null);
    try {
      const res = await fetch(`/api/aiplug/${slug}/launch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inputs: {} }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error || `Launch failed (HTTP ${res.status})`);
      }
      setLastLaunchId(body.run?.id ?? null);
    } catch (err) {
      setLaunchError(err instanceof Error ? err.message : 'Launch failed');
    } finally {
      setLaunching(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 text-center">
        <div className="inline-block w-6 h-6 rounded-full border-2 animate-spin border-border border-t-accent" />
        <div className="text-xs font-mono text-fg-tertiary mt-3">
          Loading plug…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-3xl">
        <div className="p-4 border border-signal-error/40 bg-signal-error/10 rounded">
          <div className="text-xs font-mono font-bold tracking-wider uppercase text-signal-error mb-1">
            Error
          </div>
          <div className="text-sm text-fg">{error}</div>
        </div>
        <Link
          href="/aiplug"
          className="inline-block mt-4 text-xs font-mono text-fg-secondary hover:text-accent"
        >
          ← All aiPLUGs
        </Link>
      </div>
    );
  }

  if (!plug) {
    return (
      <div className="py-16 text-center">
        <Sparkles className="w-10 h-10 text-fg-tertiary mx-auto mb-3" />
        <div className="text-sm text-fg-secondary">Plug not found.</div>
        <Link
          href="/aiplug"
          className="inline-block mt-4 text-xs font-mono text-accent hover:text-accent-hover"
        >
          ← All aiPLUGs
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      {/* Breadcrumb */}
      <div className="text-[10px] font-mono text-fg-tertiary mb-4 uppercase tracking-wider">
        <Link href="/aiplug" className="hover:text-accent transition-colors">
          aiPLUG &amp; Play
        </Link>
        <span className="mx-1.5 text-border-strong">/</span>
        <span className="text-fg-secondary">{plug.slug}</span>
      </div>

      {/* Header */}
      <header className="mb-8 pb-6 border-b border-border">
        <div className="flex items-center gap-2 text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-2">
          <Tag className="w-3 h-3" />
          {plug.category}
          <span className="opacity-50">·</span>
          <span>{plug.status}</span>
          {plug.featured && (
            <>
              <span className="opacity-50">·</span>
              <span className="text-accent">Flagship</span>
            </>
          )}
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-fg mb-3">
          {plug.name}
        </h1>
        <p className="text-base text-fg-secondary max-w-3xl leading-relaxed">
          {plug.tagline}
        </p>
      </header>

      {/* Two-column: description + launch CTA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-3">
              What it does
            </h2>
            <p className="text-sm text-fg-secondary leading-relaxed whitespace-pre-wrap">
              {plug.description}
            </p>
          </section>

          {plug.features.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-3">
                Features
              </h2>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
                {plug.features.map(f => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-fg"
                  >
                    <Zap className="w-3.5 h-3.5 text-accent shrink-0 mt-0.5" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {plug.tags.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-3">
                Tags
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {plug.tags.map(t => (
                  <span
                    key={t}
                    className="text-[10px] font-mono px-2 py-0.5 bg-bg-elevated text-fg-secondary rounded"
                  >
                    {t}
                  </span>
                ))}
              </div>
            </section>
          )}

          {recentRuns.length > 0 && (
            <section>
              <h2 className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-3">
                Recent runs
              </h2>
              <div className="space-y-1">
                {recentRuns.map(run => (
                  <div
                    key={run.id}
                    className="p-3 border border-border bg-bg-surface rounded flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-fg-tertiary" />
                      <span className="text-xs font-mono text-fg-secondary">
                        {new Date(run.created_at).toLocaleString()}
                      </span>
                    </div>
                    <span className="text-[9px] font-mono font-bold tracking-wider uppercase px-2 py-0.5 bg-bg-elevated text-fg-tertiary rounded">
                      {run.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Launch panel */}
        <aside className="lg:sticky lg:top-6 self-start">
          <div className="border border-border bg-bg-surface rounded-lg p-5">
            <div className="text-[10px] font-mono font-bold tracking-[0.18em] uppercase text-fg-tertiary mb-2">
              Launch
            </div>
            <div className="text-2xl font-extrabold text-fg mb-1">
              {formatCents(plug.price_cents)}
            </div>
            <div className="text-[11px] font-mono text-fg-tertiary mb-5">
              One-click deploy · runs autonomously
            </div>

            <button
              type="button"
              onClick={handleLaunch}
              disabled={launching || plug.status === 'archived'}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 bg-accent text-bg text-xs font-mono font-bold tracking-wider uppercase rounded hover:bg-accent-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {launching ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Launching…
                </>
              ) : (
                <>
                  <Rocket className="w-4 h-4" />
                  Launch {plug.name}
                </>
              )}
            </button>

            {lastLaunchId && (
              <div className="mt-3 p-2 bg-signal-live/10 border border-signal-live/40 rounded text-[11px] font-mono text-signal-live flex items-start gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">Queued</div>
                  <div className="opacity-80 text-[10px] break-all">
                    Run ID: {lastLaunchId.slice(0, 12)}…
                  </div>
                  <div className="opacity-70 text-[10px] mt-1">
                    The autonomous runtime will begin shortly. Logs will appear
                    in the Live Look In panel.
                  </div>
                </div>
              </div>
            )}

            {launchError && (
              <div className="mt-3 p-2 bg-signal-error/10 border border-signal-error/40 rounded text-[11px] font-mono text-signal-error flex items-start gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <div>{launchError}</div>
              </div>
            )}
          </div>

          <div className="mt-4 text-[10px] font-mono text-fg-tertiary text-center">
            Runtime: autonomous · heartbeat 60s · owner-viewable logs
          </div>
        </aside>
      </div>
    </div>
  );
}
