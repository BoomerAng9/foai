'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Activity, Loader2, Play, AlertCircle, CheckCircle2,
  ChevronDown, ChevronUp, RefreshCw, Radio, Clock,
} from 'lucide-react';

type LaneId = 'lane-a' | 'lane-b' | 'lane-c5';

interface LaneSpec {
  id: LaneId;
  title: string;
  subtitle: string;
  action: string;
  description: string;
}

const LANES: LaneSpec[] = [
  {
    id: 'lane-a',
    title: 'Lane A',
    subtitle: 'ACHEEVY content monitor',
    action: 'lane_a_trigger',
    description: '26-source scan every 4h. Items roll up into the Monday topic-pick digest.',
  },
  {
    id: 'lane-b',
    title: 'Lane B',
    subtitle: 'Greg-framework opportunity scout',
    action: 'lane_b_trigger',
    description: 'Daily Apple RSS snapshot. After 30-day baseline, fall-events surface for Tuesday digest.',
  },
  {
    id: 'lane-c5',
    title: 'Lane C-5',
    subtitle: 'MindEdge daily owner digest',
    action: 'lane_c5_snapshot_fire',
    description: '3-service fan-out (EDU_ANG / SCOUT_ANG / affiliates) into one snapshot, fired pre-digest.',
  },
];

interface CacheResponse {
  ok: boolean;
  lane_id?: string;
  label?: string;
  source?: string;
  payload?: Record<string, unknown>;
  error?: string;
  filesystem_error?: string;
  proxy_error?: string;
  hint?: string;
}

interface DriftResponse {
  ok: boolean;
  lane_id?: string;
  status?: 'ok' | 'drift' | 'spec_not_found' | 'no_spec';
  spec_stages?: string[];
  implemented_stages?: string[];
  missing_in_spec?: string[];
  extra_in_spec?: string[];
  note?: string;
  error?: string;
}

interface LaneState {
  cache: CacheResponse | null;
  drift: DriftResponse | null;
  loading: boolean;
  busy: boolean;
  expanded: boolean;
  lastTrigger: unknown | null;
  triggerError: string | null;
}

const INITIAL: LaneState = {
  cache: null,
  drift: null,
  loading: true,
  busy: false,
  expanded: false,
  lastTrigger: null,
  triggerError: null,
};

export default function LanesPanel() {
  const [state, setState] = useState<Record<LaneId, LaneState>>({
    'lane-a': INITIAL,
    'lane-b': INITIAL,
    'lane-c5': INITIAL,
  });

  const loadLane = useCallback(async (laneId: LaneId) => {
    setState((cur) => ({ ...cur, [laneId]: { ...cur[laneId], loading: true } }));
    try {
      const [cacheR, driftR] = await Promise.all([
        fetch(`/api/gateway/lanes/${laneId}/cache`, { credentials: 'same-origin' }),
        fetch(`/api/gateway/lanes/${laneId}/drift`, { credentials: 'same-origin' }),
      ]);
      if (cacheR.status === 401 || driftR.status === 401) {
        window.location.href = '/login';
        return;
      }
      const cache: CacheResponse = await cacheR.json().catch(() => ({ ok: false, error: 'parse-failed' }));
      const drift: DriftResponse = await driftR.json().catch(() => ({ ok: false, error: 'parse-failed' }));
      setState((cur) => ({
        ...cur,
        [laneId]: { ...cur[laneId], cache, drift, loading: false },
      }));
    } catch (e) {
      setState((cur) => ({
        ...cur,
        [laneId]: {
          ...cur[laneId],
          loading: false,
          cache: { ok: false, error: e instanceof Error ? e.message : String(e) },
        },
      }));
    }
  }, []);

  useEffect(() => {
    LANES.forEach((l) => loadLane(l.id));
  }, [loadLane]);

  async function trigger(lane: LaneSpec) {
    setState((cur) => ({ ...cur, [lane.id]: { ...cur[lane.id], busy: true, triggerError: null, lastTrigger: null } }));
    try {
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: lane.action, payload: {} }),
      });
      const body = await r.json().catch(() => ({}));
      setState((cur) => ({
        ...cur,
        [lane.id]: { ...cur[lane.id], busy: false, lastTrigger: body },
      }));
      // Refresh cache after a successful trigger
      if (body?.ok || body?.verdict === 'allow') {
        setTimeout(() => loadLane(lane.id), 1500);
      }
    } catch (e) {
      setState((cur) => ({
        ...cur,
        [lane.id]: {
          ...cur[lane.id],
          busy: false,
          triggerError: e instanceof Error ? e.message : String(e),
        },
      }));
    }
  }

  function toggleExpand(laneId: LaneId) {
    setState((cur) => ({ ...cur, [laneId]: { ...cur[laneId], expanded: !cur[laneId].expanded } }));
  }

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Lanes</h1>
          <p className="text-foai-muted mt-2">
            Three concurrent lanes on the Sqwaadrun fleet. Fire ad-hoc runs, inspect cache, watch drift.
          </p>
        </div>
        <button
          type="button"
          onClick={() => LANES.forEach((l) => loadLane(l.id))}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border bg-foai-surface text-foai-text hover:border-foai-gold/50 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Refresh all
        </button>
      </header>

      <div className="grid gap-5 lg:grid-cols-1">
        {LANES.map((lane) => (
          <LaneCard
            key={lane.id}
            lane={lane}
            state={state[lane.id]}
            onTrigger={() => trigger(lane)}
            onToggleExpand={() => toggleExpand(lane.id)}
            onRefresh={() => loadLane(lane.id)}
          />
        ))}
      </div>
    </>
  );
}

function LaneCard({
  lane, state, onTrigger, onToggleExpand, onRefresh,
}: {
  lane: LaneSpec;
  state: LaneState;
  onTrigger: () => void;
  onToggleExpand: () => void;
  onRefresh: () => void;
}) {
  const cacheOk = state.cache?.ok ?? false;
  const payload = state.cache?.payload ?? {};
  const generatedAt = typeof payload.generated_at === 'string' ? payload.generated_at : undefined;
  const matchesCount =
    typeof payload.matches_count === 'number' ? payload.matches_count :
    typeof payload.items_count === 'number' ? payload.items_count :
    undefined;
  const baselineStatus = (payload.baseline_status ?? null) as
    { snapshots_captured?: number; diff_window_days?: number; ready?: boolean; note?: string } | null;
  const needsAttention = (payload.needs_attention ?? []) as Array<{ label: string; detail: string }>;

  return (
    <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur overflow-hidden">
      {/* ── header ── */}
      <div className="px-6 py-5 border-b border-foai-border/60 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Radio className="size-4 text-foai-gold" />
            <h2 className="text-lg font-semibold">{lane.title}</h2>
            <span className="text-xs font-mono text-foai-muted">{lane.id}</span>
          </div>
          <div className="text-sm font-medium text-foai-text">{lane.subtitle}</div>
          <p className="text-xs text-foai-muted mt-1 max-w-2xl">{lane.description}</p>
        </div>
        <div className="flex items-center gap-2">
          <DriftPill drift={state.drift} />
          <button
            type="button"
            onClick={onRefresh}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors"
            title="Refresh this lane"
          >
            <RefreshCw className={`size-3 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onTrigger}
            disabled={state.busy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-foai-gold text-foai-bg hover:bg-foai-gold/90 transition-colors disabled:opacity-50"
          >
            {state.busy ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
            Trigger
          </button>
        </div>
      </div>

      {/* ── stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foai-border/30">
        <Stat label="Last run" value={generatedAt ? new Date(generatedAt).toLocaleString() : '—'} mono small />
        <Stat label="Items" value={matchesCount?.toString() ?? '—'} mono />
        <Stat label="Source" value={state.cache?.source || (cacheOk ? 'ok' : 'unavailable')} small />
        <Stat label="State" value={cacheOk ? 'ready' : 'no cache'} small />
      </div>

      {/* ── Lane B baseline panel ── */}
      {lane.id === 'lane-b' && baselineStatus && (
        <div className="px-6 py-4 border-b border-foai-border/40">
          <div className="flex items-center justify-between text-xs mb-2">
            <span className="font-semibold uppercase tracking-wider text-foai-muted">Baseline</span>
            <span className={`font-mono ${baselineStatus.ready ? 'text-foai-cyan' : 'text-foai-gold'}`}>
              {baselineStatus.snapshots_captured ?? 0}/{baselineStatus.diff_window_days ?? 30} days
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-foai-bg overflow-hidden">
            <div
              className={`h-full ${baselineStatus.ready ? 'bg-foai-cyan' : 'bg-foai-gold'} transition-all`}
              style={{
                width: `${Math.min(100, Math.round(((baselineStatus.snapshots_captured ?? 0) / (baselineStatus.diff_window_days ?? 30)) * 100))}%`,
              }}
            />
          </div>
          {baselineStatus.note && (
            <p className="text-[11px] text-foai-muted mt-2">{baselineStatus.note}</p>
          )}
        </div>
      )}

      {/* ── Lane C-5 per-source pills ── */}
      {lane.id === 'lane-c5' && payload && (
        <div className="px-6 py-4 border-b border-foai-border/40">
          <div className="text-xs font-semibold uppercase tracking-wider text-foai-muted mb-2">Per-source health</div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <SourcePill name="enrollments" status={(payload.enrollments as { source_status?: string } | undefined)?.source_status} />
            <SourcePill name="open seats" status={(payload.open_seats as { source_status?: string } | undefined)?.source_status} />
            <SourcePill name="affiliates" status={(payload.affiliate_events as { source_status?: string } | undefined)?.source_status} />
            <SourcePill name="pipeline" status={(payload.pipeline as { status?: string } | undefined)?.status === 'tbd' ? 'tbd' : 'unknown'} />
          </div>
          {needsAttention.length > 0 && (
            <div className="mt-3 space-y-1">
              {needsAttention.map((item, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-foai-gold">
                  <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                  <span><span className="font-medium">{item.label}:</span> <span className="text-foai-muted">{item.detail}</span></span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── error / hint row ── */}
      {state.cache && !state.cache.ok && (
        <div className="px-6 py-3 bg-foai-gold/5 border-b border-foai-border/40 text-xs text-foai-gold flex items-start gap-2">
          <AlertCircle className="size-4 mt-0.5 shrink-0" />
          <div>
            <div>{state.cache.error}</div>
            {state.cache.hint && <div className="text-foai-muted mt-1">{state.cache.hint}</div>}
          </div>
        </div>
      )}

      {/* ── expand cache view ── */}
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full px-6 py-3 flex items-center justify-between text-xs font-medium text-foai-muted hover:text-foai-text hover:bg-foai-surface-2/40 transition-colors"
      >
        <span className="inline-flex items-center gap-1.5">
          <Activity className="size-3.5" />
          Cache contents
        </span>
        {state.expanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
      </button>

      {state.expanded && (
        <div className="px-6 pb-5">
          <pre className="text-[11px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-3 rounded border border-foai-border/40 max-h-96 overflow-auto">
            {state.cache?.payload ? JSON.stringify(state.cache.payload, null, 2) : '(no cache yet)'}
          </pre>
        </div>
      )}

      {/* ── trigger result ── */}
      {state.lastTrigger != null && (
        <div className="px-6 py-3 border-t border-foai-border/40">
          <div className="flex items-center gap-2 text-xs mb-2">
            <CheckCircle2 className="size-3.5 text-foai-cyan" />
            <span className="font-semibold uppercase tracking-wider">Trigger result</span>
            <Clock className="size-3 text-foai-muted ml-auto" />
            <span className="text-foai-muted">{new Date().toLocaleTimeString()}</span>
          </div>
          <pre className="text-[10px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-2 rounded border border-foai-border/40 max-h-40 overflow-auto">
            {JSON.stringify(state.lastTrigger, null, 2)}
          </pre>
        </div>
      )}
      {state.triggerError && (
        <div className="px-6 py-3 border-t border-foai-border/40 text-xs text-foai-gold">
          <AlertCircle className="size-3.5 inline mr-1" /> {state.triggerError}
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="px-4 py-3 bg-foai-surface/40">
      <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${small ? 'text-xs' : 'text-sm'} text-foai-text truncate`}>{value}</div>
    </div>
  );
}

function DriftPill({ drift }: { drift: DriftResponse | null }) {
  if (!drift) {
    return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-foai-muted">drift: —</span>;
  }
  const map: Record<string, { cls: string; label: string }> = {
    ok:              { cls: 'bg-foai-cyan/15 text-foai-cyan',     label: 'spec ok' },
    drift:           { cls: 'bg-red-500/15 text-red-400',         label: 'DRIFT' },
    spec_not_found:  { cls: 'bg-white/5 text-foai-muted',         label: 'no spec' },
    no_spec:         { cls: 'bg-white/5 text-foai-muted',         label: 'no spec' },
  };
  const e = map[drift.status ?? ''] ?? { cls: 'bg-white/10 text-foai-muted', label: drift.status || '—' };
  return <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${e.cls}`} title={drift.note}>{e.label}</span>;
}

function SourcePill({ name, status }: { name: string; status?: string }) {
  const isOk = status === 'ok';
  const isTbd = status === 'tbd';
  return (
    <div className={`rounded-md px-2.5 py-1.5 border text-[11px] ${
      isOk ? 'border-foai-cyan/30 bg-foai-cyan/5' :
      isTbd ? 'border-white/10 bg-white/5' :
      'border-foai-gold/30 bg-foai-gold/5'
    }`}>
      <div className="text-foai-muted mb-0.5">{name}</div>
      <div className={`font-semibold ${
        isOk ? 'text-foai-cyan' : isTbd ? 'text-foai-muted' : 'text-foai-gold'
      }`}>{status || 'unknown'}</div>
    </div>
  );
}
