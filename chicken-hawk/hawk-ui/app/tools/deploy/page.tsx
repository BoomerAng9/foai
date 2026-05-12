'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Rocket, RotateCcw, RefreshCw, Loader2, CheckCircle2, AlertCircle,
  Globe, Network, Database, ShieldCheck, Clock, Send,
} from 'lucide-react';

type TargetId = 'hawk-ui' | 'gateway' | 'sqwaadrun';

interface DeployTarget {
  id: TargetId;
  title: string;
  action: string;
  rollbackAction: string;
  blurb: string;
  preflight?: string;
  icon: React.ReactNode;
}

const TARGETS: DeployTarget[] = [
  {
    id: 'hawk-ui',
    title: 'hawk-ui',
    action: 'deploy_hawk_ui',
    rollbackAction: 'deploy_rollback',
    blurb: 'Next.js bundle rebuild + force-recreate container on myclaw-vps.',
    preflight: 'npm run typecheck && npm run lint',
    icon: <Globe className="size-4 text-foai-gold" />,
  },
  {
    id: 'gateway',
    title: 'gateway',
    action: 'deploy_gateway',
    rollbackAction: 'deploy_rollback',
    blurb: 'rsync gateway/ to myclaw-vps + docker restart (bind-mount; no rebuild).',
    icon: <Network className="size-4 text-foai-gold" />,
  },
  {
    id: 'sqwaadrun',
    title: 'sqwaadrun',
    action: 'deploy_sqwaadrun',
    rollbackAction: 'deploy_rollback',
    blurb: 'rsync sqwaadrun service to aims-vps + systemctl restart.',
    icon: <Database className="size-4 text-foai-gold" />,
  },
];

interface DeployHistoryEntry {
  action?: string;
  started_at?: string;
  finished_at?: string;
  elapsed_seconds?: number;
  ok?: boolean;
  exit_code?: number;
  actor?: string;
  approval_id?: string | null;
  stderr_excerpt?: string;
}

interface HistoryResponse {
  ok: boolean;
  deploys: DeployHistoryEntry[];
  count: number;
  error?: string;
}

interface DeployState {
  busy: boolean;
  lastResult: unknown | null;
  needsApproval: boolean;
  approvalId: string;
  error: string | null;
}

const INITIAL_STATE: DeployState = {
  busy: false,
  lastResult: null,
  needsApproval: false,
  approvalId: '',
  error: null,
};

export default function DeployPanel() {
  const [history, setHistory] = useState<HistoryResponse | null>(null);
  const [state, setState] = useState<Record<TargetId, DeployState>>({
    'hawk-ui': INITIAL_STATE,
    gateway: INITIAL_STATE,
    sqwaadrun: INITIAL_STATE,
  });

  const loadHistory = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/deploy/history?n=20', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setHistory(await r.json());
    } catch (e) {
      setHistory({ ok: false, deploys: [], count: 0, error: String(e) });
    }
  }, []);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  async function fire(target: DeployTarget, withApproval?: string) {
    setState((cur) => ({ ...cur, [target.id]: { ...cur[target.id], busy: true, error: null, lastResult: null } }));
    try {
      const payload: Record<string, unknown> = {};
      if (withApproval) payload.approval_id = withApproval;
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: target.action, payload }),
      });
      const body = await r.json().catch(() => ({}));
      const needsApproval = r.status === 202 || body?.verdict === 'escalated' || body?.verdict === 'escalate';
      setState((cur) => ({
        ...cur,
        [target.id]: {
          ...cur[target.id],
          busy: false,
          lastResult: body,
          needsApproval,
          approvalId: needsApproval ? cur[target.id].approvalId : '',
        },
      }));
      if (!needsApproval && body?.ok) {
        setTimeout(loadHistory, 1500);
      }
    } catch (e) {
      setState((cur) => ({
        ...cur,
        [target.id]: { ...cur[target.id], busy: false, error: e instanceof Error ? e.message : String(e) },
      }));
    }
  }

  function setApprovalId(targetId: TargetId, value: string) {
    setState((cur) => ({ ...cur, [targetId]: { ...cur[targetId], approvalId: value } }));
  }

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Deploy</h1>
          <p className="text-foai-muted mt-2">
            One-click ship — gateway-routed through NemoClaw + Telegram confirm + audit chain.
            Same sequence you run by hand, with the safety rails on.
          </p>
        </div>
        <button
          type="button"
          onClick={loadHistory}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border bg-foai-surface text-foai-text hover:border-foai-gold/50 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Refresh history
        </button>
      </header>

      <section className="rounded-2xl border border-foai-gold/30 bg-foai-gold/5 p-4 mb-5 text-xs text-foai-gold flex items-start gap-3">
        <ShieldCheck className="size-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold mb-0.5">Two-step deploy with Telegram confirm</div>
          <p className="text-foai-muted">
            First click returns <code className="font-mono">202 escalation</code> + Telegram message with an approval ID.
            Paste the approval ID and re-click to actually ship. Pre-flight (typecheck + lint) runs automatically on hawk-ui.
          </p>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-3 mb-8">
        {TARGETS.map((t) => (
          <TargetCard
            key={t.id}
            target={t}
            state={state[t.id]}
            onFire={(approval) => fire(t, approval)}
            onSetApproval={(v) => setApprovalId(t.id, v)}
          />
        ))}
      </div>

      {/* ── History section ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <Clock className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Deploy history</h2>
            <span className="text-[11px] font-mono text-foai-muted">last {history?.count ?? 0}</span>
          </div>
        </div>

        {history?.error ? (
          <div className="text-xs text-foai-gold flex items-center gap-2"><AlertCircle className="size-3.5" /> {history.error}</div>
        ) : (history?.deploys.length ?? 0) === 0 ? (
          <div className="text-xs text-foai-muted py-4 text-center">No deploys yet.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Target</th>
                  <th className="text-left px-3 py-2">Elapsed</th>
                  <th className="text-left px-3 py-2">Exit</th>
                  <th className="text-left px-3 py-2">Actor</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(history?.deploys ?? []).slice().reverse().map((d, idx) => (
                  <tr key={idx} className="border-t border-foai-border/40">
                    <td className="px-3 py-2 font-mono text-[10px] text-foai-muted">
                      {d.started_at ? new Date(d.started_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-foai-gold">{d.action || '—'}</td>
                    <td className="px-3 py-2 font-mono text-foai-muted">
                      {d.elapsed_seconds != null ? `${d.elapsed_seconds.toFixed(1)}s` : '—'}
                    </td>
                    <td className="px-3 py-2 font-mono text-foai-muted">{d.exit_code ?? '—'}</td>
                    <td className="px-3 py-2 text-foai-muted">{d.actor || '—'}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        d.ok ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-red-500/15 text-red-400'
                      }`}>
                        {d.ok ? 'success' : 'failed'}
                      </span>
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

function TargetCard({
  target, state, onFire, onSetApproval,
}: {
  target: DeployTarget;
  state: DeployState;
  onFire: (approval?: string) => void;
  onSetApproval: (v: string) => void;
}) {
  return (
    <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-5 flex flex-col">
      <div className="flex items-center gap-2.5 mb-2">
        {target.icon}
        <h3 className="font-semibold text-base">{target.title}</h3>
      </div>
      <p className="text-xs text-foai-muted mb-3 min-h-[2.5rem]">{target.blurb}</p>
      {target.preflight && (
        <div className="text-[10px] font-mono text-foai-cyan/80 mb-3 inline-flex items-center gap-1">
          <ShieldCheck className="size-3" />
          pre-flight: {target.preflight}
        </div>
      )}

      <button
        type="button"
        onClick={() => onFire()}
        disabled={state.busy}
        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-2 rounded-md text-sm font-semibold bg-foai-gold text-foai-bg hover:bg-foai-gold/90 transition-colors disabled:opacity-50 mb-2"
      >
        {state.busy ? <Loader2 className="size-3.5 animate-spin" /> : <Rocket className="size-3.5" />}
        Ship it
      </button>
      <button
        type="button"
        disabled={state.busy}
        className="inline-flex items-center justify-center gap-1.5 w-full px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors disabled:opacity-50"
        onClick={() => {
          if (target.id === 'hawk-ui') {
            onFire(); // rollback prompt comes from approval — wire payload in V2
          }
        }}
      >
        <RotateCcw className="size-3" /> Rollback
      </button>

      {state.needsApproval && (
        <div className="mt-4 rounded-lg border border-foai-gold/30 bg-foai-gold/5 p-3">
          <div className="text-[10px] uppercase tracking-wider font-semibold text-foai-gold mb-1.5 inline-flex items-center gap-1">
            <Send className="size-3" /> Telegram confirm pending
          </div>
          <p className="text-[11px] text-foai-muted mb-2">
            Check Telegram for the approval ID, paste below, click Ship it again.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={state.approvalId}
              onChange={(e) => onSetApproval(e.target.value)}
              placeholder="approval ID"
              className="flex-1 bg-foai-bg border border-foai-border rounded px-2 py-1 text-[11px] font-mono focus:border-foai-gold/60 focus:outline-none"
            />
            <button
              type="button"
              onClick={() => onFire(state.approvalId)}
              disabled={!state.approvalId || state.busy}
              className="px-3 py-1 rounded text-[11px] font-semibold bg-foai-gold text-foai-bg disabled:opacity-50 hover:bg-foai-gold/90"
            >
              {state.busy ? <Loader2 className="size-3 animate-spin" /> : 'Ship'}
            </button>
          </div>
        </div>
      )}

      {state.error && (
        <div className="mt-3 text-xs text-foai-gold flex items-start gap-1.5">
          <AlertCircle className="size-3.5 mt-0.5 shrink-0" /> {state.error}
        </div>
      )}

      {state.lastResult != null && (
        <div className="mt-3">
          <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-foai-muted mb-1.5">
            <CheckCircle2 className="size-3 text-foai-cyan" />
            Last result
          </div>
          <pre className="text-[10px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-2 rounded border border-foai-border/40 max-h-40 overflow-auto">
            {JSON.stringify(state.lastResult, null, 2)}
          </pre>
        </div>
      )}
    </section>
  );
}
