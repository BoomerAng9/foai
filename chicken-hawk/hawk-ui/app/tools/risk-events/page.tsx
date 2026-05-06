'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface RiskEvent {
  event_id?: string;
  recorded_at?: string;
  severity?: 'low' | 'medium' | 'high' | 'critical' | string;
  category?: string;
  description?: string;
  task_id?: string;
  actor?: string;
}

const SEVERITY_ORDER = ['critical', 'high', 'medium', 'low'] as const;
const SEVERITY_STYLE: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/40',
  high:     'bg-foai-gold/20 text-foai-gold border-foai-gold/40',
  medium:   'bg-foai-cyan/15 text-foai-cyan border-foai-cyan/30',
  low:      'bg-white/5 text-foai-muted border-foai-border',
};

export default function RiskEventsPanel() {
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [limit, setLimit] = useState(50);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/gateway/risk-events?limit=${limit}`, { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) { setError(`HTTP ${r.status}`); return; }
      const data = await r.json();
      setEvents(Array.isArray(data) ? data : data.events || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); /* eslint-disable-next-line */ }, [limit]);

  const filtered = useMemo(() => {
    if (filter === 'all') return events;
    return events.filter((e) => (e.severity || '').toLowerCase() === filter);
  }, [events, filter]);

  const counts = useMemo(() => {
    const acc: Record<string, number> = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const e of events) {
      const s = (e.severity || 'low').toLowerCase();
      acc[s] = (acc[s] || 0) + 1;
    }
    return acc;
  }, [events]);

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Risk Events</h1>
          <p className="text-foai-muted mt-2">
            Every NemoClaw policy denial, hardening trip, and audit anomaly. Sorted newest-first.
          </p>
        </div>
        <button type="button" onClick={() => void load()}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full text-foai-muted hover:text-foai-text hover:bg-white/5 transition-colors">
          {loading ? <Loader2 className="size-3 animate-spin" /> : <RefreshCw className="size-3" />}
          Refresh
        </button>
      </header>

      <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
        {SEVERITY_ORDER.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)}
            className={cn(
              'rounded-xl border bg-foai-surface/60 backdrop-blur p-4 text-left transition-colors',
              filter === s ? 'border-foai-gold/60' : 'border-foai-border hover:border-foai-border/80',
            )}>
            <div className={cn('inline-block text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border', SEVERITY_STYLE[s])}>{s}</div>
            <div className="mt-2 text-2xl font-semibold tabular-nums">{counts[s] || 0}</div>
          </button>
        ))}
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3 border-b border-foai-border/60">
          <div className="text-xs uppercase tracking-wider text-foai-muted">
            {filter === 'all' ? `Showing ${filtered.length} events` : `Filter: ${filter} · ${filtered.length} of ${events.length}`}
          </div>
          <div className="flex items-center gap-1.5">
            {filter !== 'all' && (
              <button type="button" onClick={() => setFilter('all')}
                className="text-xs px-3 py-1 rounded-full text-foai-muted hover:text-foai-text hover:bg-white/5">
                Clear filter
              </button>
            )}
            <select value={limit} onChange={(e) => setLimit(Number(e.target.value))}
              className="text-xs bg-foai-surface/60 border border-foai-border rounded-md px-2 py-1 text-foai-text">
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
            </select>
          </div>
        </div>

        {error ? (
          <div className="px-5 py-6 text-sm text-foai-gold">{error}</div>
        ) : loading ? (
          <div className="px-5 py-12 text-center text-foai-muted">
            <Loader2 className="size-4 animate-spin inline mr-2" /> Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center text-foai-muted text-sm">
            <AlertTriangle className="size-5 inline mr-2 opacity-50" /> No events match this filter.
          </div>
        ) : (
          <ul className="divide-y divide-foai-border/40">
            {filtered.map((e, idx) => (
              <li key={e.event_id || `${e.recorded_at}-${idx}`} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                <div className="flex items-start gap-3">
                  <span className={cn('shrink-0 text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full border mt-0.5', SEVERITY_STYLE[(e.severity || 'low').toLowerCase()] || SEVERITY_STYLE.low)}>
                    {e.severity || 'low'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-foai-text leading-snug">{e.description || '(no description)'}</div>
                    <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-[11px] text-foai-muted font-mono">
                      {e.category && <span>cat: {e.category}</span>}
                      {e.task_id && <span>task: {e.task_id}</span>}
                      {e.actor && <span>actor: {e.actor}</span>}
                      {e.recorded_at && <span>{new Date(e.recorded_at).toLocaleString()}</span>}
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
