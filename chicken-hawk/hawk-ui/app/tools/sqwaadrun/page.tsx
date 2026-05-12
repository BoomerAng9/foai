'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Network, RefreshCw, Loader2, AlertCircle, PlayCircle, History, Database, Clock,
} from 'lucide-react';
import Link from 'next/link';

interface ActiveMission {
  mission_id?: string;
  type?: string;
  targets?: string[];
  config?: Record<string, unknown>;
  started_at?: string;
  progress?: number;
  results_count?: number;
  [key: string]: unknown;
}

interface RecentMission {
  mission_id?: string;
  type?: string;
  status?: string;
  started_at?: string;
  completed_at?: string;
  results_count?: number;
  elapsed_seconds?: number;
  tokens_consumed?: number;
  [key: string]: unknown;
}

interface ActiveResponse {
  source_status?: string;
  missions: ActiveMission[];
  note?: string;
}

interface RecentResponse {
  source_status?: string;
  missions: RecentMission[];
  note?: string;
}

interface CacheStatsResponse {
  source_status?: string;
  stats?: {
    rows_total?: number;
    domains_total?: number;
    dedup_rate?: number;
    last_24h_rows?: number;
    oldest_row?: string;
    newest_row?: string;
    [key: string]: unknown;
  };
  note?: string;
}

export default function SqwaadrunPanel() {
  const [active, setActive] = useState<ActiveResponse | null>(null);
  const [recent, setRecent] = useState<RecentResponse | null>(null);
  const [cache, setCache] = useState<CacheStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [aR, rR, cR] = await Promise.all([
        fetch('/api/gateway/sqwaadrun/missions/active', { credentials: 'same-origin' }),
        fetch('/api/gateway/sqwaadrun/missions/recent?n=20', { credentials: 'same-origin' }),
        fetch('/api/gateway/sqwaadrun/cache/stats', { credentials: 'same-origin' }),
      ]);
      if (aR.status === 401 || rR.status === 401 || cR.status === 401) {
        window.location.href = '/login';
        return;
      }
      setActive(await aR.json().catch(() => ({ missions: [] })));
      setRecent(await rR.json().catch(() => ({ missions: [] })));
      setCache(await cR.json().catch(() => ({ stats: {} })));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(); }, [loadAll]);

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Sqwaadrun</h1>
          <p className="text-foai-muted mt-2">
            The 20-Hawk ops fleet. Active scrape missions, recent completions, scrape-cache stats.
            Roster lives under{' '}
            <Link href="/tools/lil-hawks" className="text-foai-gold hover:underline">/tools/lil-hawks → Ops fleet</Link>.
          </p>
        </div>
        <button
          type="button"
          onClick={loadAll}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border bg-foai-surface text-foai-text hover:border-foai-gold/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      {/* ── Cache stats row ── */}
      <CacheStatsSection cache={cache} loading={loading} />

      {/* ── Active missions ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <PlayCircle className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Active missions</h2>
            <span className="text-[11px] font-mono text-foai-muted">{active?.missions?.length ?? 0}</span>
            <SourceBadge status={active?.source_status} />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : active?.note && active.source_status !== 'ok' ? (
          <Empty note={active.note} />
        ) : (active?.missions || []).length === 0 ? (
          <div className="text-xs text-foai-muted py-4 text-center">No missions in flight.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2">Mission</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Targets</th>
                  <th className="text-left px-3 py-2">Progress</th>
                  <th className="text-left px-3 py-2">Started</th>
                </tr>
              </thead>
              <tbody>
                {(active?.missions || []).map((m, idx) => (
                  <tr key={m.mission_id || idx} className="border-t border-foai-border/40">
                    <td className="px-3 py-2 font-mono text-foai-gold text-[11px]">{m.mission_id || '—'}</td>
                    <td className="px-3 py-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">
                        {m.type || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-foai-muted text-[10px]">
                      {(m.targets || []).length} target{(m.targets || []).length === 1 ? '' : 's'}
                    </td>
                    <td className="px-3 py-2">
                      {m.progress != null ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1 rounded-full bg-foai-bg overflow-hidden max-w-[80px]">
                            <div className="h-full bg-foai-cyan" style={{ width: `${Math.min(100, Math.round((m.progress as number) * 100))}%` }} />
                          </div>
                          <span className="text-[10px] font-mono text-foai-muted">{Math.round((m.progress as number) * 100)}%</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-foai-muted">running</span>
                      )}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-foai-muted">
                      {m.started_at ? new Date(m.started_at).toLocaleTimeString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Recent missions ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <History className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Recent completions</h2>
            <span className="text-[11px] font-mono text-foai-muted">last {recent?.missions?.length ?? 0}</span>
            <SourceBadge status={recent?.source_status} />
          </div>
        </div>

        {loading ? (
          <Loading />
        ) : recent?.note && recent.source_status !== 'ok' ? (
          <Empty note={recent.note} />
        ) : (recent?.missions || []).length === 0 ? (
          <div className="text-xs text-foai-muted py-4 text-center">No completed missions yet.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2">Mission</th>
                  <th className="text-left px-3 py-2">Type</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Results</th>
                  <th className="text-left px-3 py-2">Elapsed</th>
                  <th className="text-left px-3 py-2">When</th>
                </tr>
              </thead>
              <tbody>
                {(recent?.missions || []).slice().reverse().map((m, idx) => (
                  <tr key={m.mission_id || idx} className="border-t border-foai-border/40">
                    <td className="px-3 py-2 font-mono text-foai-gold text-[11px]">{m.mission_id || '—'}</td>
                    <td className="px-3 py-2 text-foai-muted">{m.type || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        m.status === 'completed' ? 'bg-foai-cyan/15 text-foai-cyan' :
                        m.status === 'failed' ? 'bg-red-500/15 text-red-400' :
                        'bg-white/5 text-foai-muted'
                      }`}>
                        {m.status || '—'}
                      </span>
                    </td>
                    <td className="px-3 py-2 font-mono text-foai-muted">{m.results_count ?? '—'}</td>
                    <td className="px-3 py-2 font-mono text-foai-muted">
                      {m.elapsed_seconds != null ? `${m.elapsed_seconds.toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-[10px] text-foai-muted">
                      {m.completed_at ? new Date(m.completed_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function CacheStatsSection({ cache, loading }: { cache: CacheStatsResponse | null; loading: boolean }) {
  const s = cache?.stats || {};
  return (
    <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Database className="size-4 text-foai-gold" />
          <h2 className="font-semibold text-lg">Scrape cache</h2>
          <SourceBadge status={cache?.source_status} />
        </div>
      </div>
      {loading ? (
        <Loading />
      ) : cache?.note && cache.source_status !== 'ok' ? (
        <Empty note={cache.note} />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foai-border/30 rounded-lg overflow-hidden">
          <Stat label="Rows" value={fmtNum(s.rows_total as number | undefined)} mono />
          <Stat label="Domains" value={fmtNum(s.domains_total as number | undefined)} mono />
          <Stat label="Dedup rate" value={fmtPct(s.dedup_rate as number | undefined)} mono small />
          <Stat label="Last 24h rows" value={fmtNum(s.last_24h_rows as number | undefined)} mono small />
        </div>
      )}
      {(s.oldest_row || s.newest_row) && (
        <div className="grid grid-cols-2 gap-3 mt-3 text-[10px] font-mono text-foai-muted">
          {s.oldest_row && <div className="flex items-center gap-1"><Clock className="size-3" /> oldest: {String(s.oldest_row).slice(0, 19)}</div>}
          {s.newest_row && <div className="flex items-center gap-1"><Clock className="size-3" /> newest: {String(s.newest_row).slice(0, 19)}</div>}
        </div>
      )}
    </section>
  );
}

function SourceBadge({ status }: { status?: string }) {
  if (status === 'ok') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">live</span>;
  if (status === 'unavailable') return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-foai-gold/15 text-foai-gold">unavailable</span>;
  return <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-white/10 text-foai-muted">—</span>;
}

function Empty({ note }: { note: string }) {
  return (
    <div className="flex items-start gap-2 text-xs text-foai-muted py-4 px-1">
      <AlertCircle className="size-3.5 mt-0.5" /> {note}
    </div>
  );
}

function Loading() {
  return <div className="text-foai-muted text-sm py-6 text-center"><Loader2 className="size-4 animate-spin inline-block mr-2" /> Loading…</div>;
}

function Stat({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="px-4 py-3 bg-foai-surface/40">
      <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${small ? 'text-xs' : 'text-sm'} text-foai-text truncate`}>{value}</div>
    </div>
  );
}

function fmtNum(n: number | undefined): string {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function fmtPct(n: number | undefined): string {
  if (n == null) return '—';
  return `${(n * 100).toFixed(1)}%`;
}
