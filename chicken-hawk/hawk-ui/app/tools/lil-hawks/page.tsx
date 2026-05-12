'use client';

import { useCallback, useEffect, useState } from 'react';
import { ChevronRight, Loader2, X, Send, AlertCircle, CheckCircle2, Bird, Network } from 'lucide-react';

const HAWK_DESCRIPTIONS: Record<string, string> = {
  Lil_TRAE_Hawk:    'Heavy coding, repo-wide refactors',
  Lil_Coding_Hawk:  'Plan-first feature work',
  Lil_Agent_Hawk:   'OS / browser / CLI workflows',
  Lil_Flow_Hawk:    'SaaS / CRM / payment automation',
  Lil_Sand_Hawk:    'Safe containerized code execution',
  Lil_Memory_Hawk:  'Long-term RAG memory',
  Lil_Graph_Hawk:   'Stateful conditional workflows',
  Lil_Back_Hawk:    'Backend scaffolding, auth, APIs',
  Lil_Viz_Hawk:     'Monitoring dashboards',
  Lil_Blend_Hawk:   '3D modeling, rendering',
  Lil_Deep_Hawk:    'SuperAgent · Squad mode',
};

// Suggested action verbs per hawk class. The /run endpoint accepts arbitrary
// strings — these are common starts so the operator doesn't stare at a blank
// field. NemoClaw policy-gates every dispatch regardless.
const SUGGESTED_ACTIONS: Record<string, string[]> = {
  Lil_TRAE_Hawk:    ['code_refactor', 'repo_audit'],
  Lil_Coding_Hawk:  ['feature_plan', 'code_review'],
  Lil_Agent_Hawk:   ['browser_task', 'cli_run'],
  Lil_Flow_Hawk:    ['payment_flow', 'crm_sync'],
  Lil_Sand_Hawk:    ['sandboxed_exec'],
  Lil_Memory_Hawk:  ['rag_query', 'rag_index'],
  Lil_Graph_Hawk:   ['workflow_run'],
  Lil_Back_Hawk:    ['scaffold_api', 'add_auth'],
  Lil_Viz_Hawk:     ['render_dashboard'],
  Lil_Blend_Hawk:   ['render_3d'],
  Lil_Deep_Hawk:    ['squad_mission'],
};

type Tab = 'customer' | 'ops';

interface DispatchReceipt {
  receipt_id?: string;
  task_id?: string;
  action?: string;
  verdict?: string;
  reason?: string;
  basis?: string;
  decided_at?: string;
  next_action?: string;
  detail?: unknown;
}

interface OpsHawk {
  name: string;
  specialty: string;
  status: string;
  missions_run: number;
  last_active: string | null;
}

interface OpsHawksResponse {
  hawks: OpsHawk[];
  total: number;
  source_status: 'ok' | 'unavailable';
  note?: string;
}

export default function LilHawksPanel() {
  const [tab, setTab] = useState<Tab>('customer');
  const [customerHawks, setCustomerHawks] = useState<string[]>([]);
  const [opsHawks, setOpsHawks] = useState<OpsHawksResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [opsError, setOpsError] = useState<string | null>(null);
  const [openHawk, setOpenHawk] = useState<string | null>(null);
  const [action, setAction] = useState('');
  const [payload, setPayload] = useState('{}');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState<DispatchReceipt | null>(null);
  const [dispatchError, setDispatchError] = useState<string | null>(null);

  const loadCustomer = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/hawks', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) { setError(`HTTP ${r.status}`); return; }
      const data = await r.json();
      setCustomerHawks(data.hawks || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  const loadOps = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/sqwaadrun/hawks', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) { setOpsError(`HTTP ${r.status}`); return; }
      const data: OpsHawksResponse = await r.json();
      setOpsHawks(data);
    } catch (e) {
      setOpsError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { loadCustomer(); }, [loadCustomer]);
  useEffect(() => { if (tab === 'ops' && !opsHawks) loadOps(); }, [tab, opsHawks, loadOps]);

  function openDispatch(hawk: string) {
    setOpenHawk(hawk);
    setAction(SUGGESTED_ACTIONS[hawk]?.[0] || '');
    setPayload('{}');
    setReceipt(null);
    setDispatchError(null);
  }

  function closeDispatch() {
    setOpenHawk(null);
    setReceipt(null);
    setDispatchError(null);
    setBusy(false);
  }

  async function submitDispatch() {
    if (!action.trim()) { setDispatchError('action required'); return; }
    let parsedPayload: Record<string, unknown> = {};
    try { parsedPayload = JSON.parse(payload || '{}'); }
    catch { setDispatchError('payload must be valid JSON'); return; }
    setBusy(true);
    setReceipt(null);
    setDispatchError(null);
    try {
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.trim(),
          payload: { ...parsedPayload, target_hawk: openHawk },
        }),
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) {
        setDispatchError(`HTTP ${r.status}: ${data?.detail || data?.error || 'dispatch failed'}`);
      }
      setReceipt(data?.receipt || data);
    } catch (e) {
      setDispatchError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <header className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Lil_Hawks</h1>
          <p className="text-foai-muted mt-2">
            Two rosters under Chicken Hawk — customer-facing specialists, and the Sqwaadrun ops fleet.
          </p>
        </div>
      </header>

      <div className="mb-6 inline-flex items-center gap-1 rounded-lg border border-foai-border bg-foai-surface/60 p-1">
        <TabButton active={tab === 'customer'} onClick={() => setTab('customer')} icon={<Bird className="size-3.5" />}>
          Customer helpers
          <span className="ml-1.5 text-[10px] font-mono opacity-70">({customerHawks.length})</span>
        </TabButton>
        <TabButton active={tab === 'ops'} onClick={() => setTab('ops')} icon={<Network className="size-3.5" />}>
          Ops fleet
          <span className="ml-1.5 text-[10px] font-mono opacity-70">
            ({opsHawks?.total ?? '—'})
          </span>
        </TabButton>
      </div>

      {tab === 'customer' ? (
        <CustomerHawksTable hawks={customerHawks} error={error} onDispatch={openDispatch} />
      ) : (
        <OpsHawksTable data={opsHawks} error={opsError} />
      )}

      {openHawk && (
        <DispatchDrawer
          hawk={openHawk}
          action={action}
          setAction={setAction}
          payload={payload}
          setPayload={setPayload}
          suggestedActions={SUGGESTED_ACTIONS[openHawk] || []}
          busy={busy}
          receipt={receipt}
          error={dispatchError}
          onSubmit={submitDispatch}
          onClose={closeDispatch}
        />
      )}
    </>
  );
}

function TabButton({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-colors ${
        active
          ? 'bg-foai-gold/15 text-foai-gold'
          : 'text-foai-muted hover:text-foai-text hover:bg-foai-surface-2/50'
      }`}
    >
      {icon}
      {children}
    </button>
  );
}

function CustomerHawksTable({ hawks, error, onDispatch }: { hawks: string[]; error: string | null; onDispatch: (h: string) => void }) {
  return (
    <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
      <h2 className="font-semibold text-lg mb-1">Customer-helper roster</h2>
      <p className="text-xs text-foai-muted mb-3">Eleven specialists Chicken Hawk dispatches via /run. NemoClaw policy-gates every call.</p>
      {error ? (
        <div className="text-foai-gold text-sm">{error}</div>
      ) : hawks.length === 0 ? (
        <div className="text-foai-muted text-sm py-6 text-center">Loading roster…</div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-foai-border/50">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-foai-muted bg-white/[0.02]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Specialty</th>
                <th className="text-left px-4 py-2.5">Status</th>
                <th className="text-right px-4 py-2.5">Action</th>
              </tr>
            </thead>
            <tbody>
              {hawks.map((h) => (
                <tr key={h} className="border-t border-foai-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foai-gold">{h}</td>
                  <td className="px-4 py-3 text-foai-muted">{HAWK_DESCRIPTIONS[h] || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">
                      Configured
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => onDispatch(h)}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold bg-foai-gold/15 text-foai-gold hover:bg-foai-gold/25 transition-colors"
                    >
                      Dispatch <ChevronRight className="size-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-foai-muted mt-4">200 = allowed, 202 = escalation, 403 = denied.</p>
    </section>
  );
}

function OpsHawksTable({ data, error }: { data: OpsHawksResponse | null; error: string | null }) {
  if (error) {
    return (
      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <div className="flex items-center gap-2 text-sm text-foai-gold">
          <AlertCircle className="size-4" /> {error}
        </div>
      </section>
    );
  }
  if (!data) {
    return (
      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <div className="text-foai-muted text-sm py-6 text-center">
          <Loader2 className="size-4 animate-spin inline-block mr-2" />
          Loading ops fleet…
        </div>
      </section>
    );
  }

  return (
    <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="font-semibold text-lg">Sqwaadrun ops-fleet roster</h2>
          <p className="text-xs text-foai-muted mt-1">
            Scrape + automation specialists. Dispatched via Sqwaadrun missions, not the /run endpoint.
          </p>
        </div>
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
          data.source_status === 'ok' ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-foai-gold/15 text-foai-gold'
        }`}>
          {data.source_status}
        </span>
      </div>

      {data.hawks.length === 0 ? (
        <div className="text-foai-muted text-sm py-8 text-center">
          {data.note || 'No ops hawks reported. Sqwaadrun gateway may be offline.'}
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-foai-border/50">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-foai-muted bg-white/[0.02]">
              <tr>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-left px-4 py-2.5">Specialty</th>
                <th className="text-left px-4 py-2.5">Missions run</th>
                <th className="text-left px-4 py-2.5">Last active</th>
                <th className="text-left px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.hawks.map((h) => (
                <tr key={h.name} className="border-t border-foai-border/50 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-foai-gold">{h.name}</td>
                  <td className="px-4 py-3 text-foai-muted">{h.specialty || '—'}</td>
                  <td className="px-4 py-3 text-foai-muted font-mono text-xs">{h.missions_run ?? 0}</td>
                  <td className="px-4 py-3 text-foai-muted text-xs">{h.last_active ? new Date(h.last_active).toLocaleString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">
                      {h.status || 'configured'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs text-foai-muted mt-4">
        Trigger ops missions from /tools/lanes (Lane A/B/C) or /tools/press once those panels land.
      </p>
    </section>
  );
}

interface DrawerProps {
  hawk: string;
  action: string;
  setAction: (v: string) => void;
  payload: string;
  setPayload: (v: string) => void;
  suggestedActions: string[];
  busy: boolean;
  receipt: DispatchReceipt | null;
  error: string | null;
  onSubmit: () => void;
  onClose: () => void;
}

function DispatchDrawer({ hawk, action, setAction, payload, setPayload, suggestedActions, busy, receipt, error, onSubmit, onClose }: DrawerProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative h-full w-full max-w-lg bg-foai-bg border-l border-foai-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-foai-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">Dispatch</h2>
            <p className="text-xs font-mono text-foai-gold">{hawk}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-foai-muted hover:bg-white/5 hover:text-foai-text">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <div>
            <label className="block text-xs uppercase tracking-wider text-foai-muted mb-1.5">Action</label>
            <input
              value={action}
              onChange={(e) => setAction(e.target.value)}
              placeholder="e.g. code_review"
              className="w-full bg-foai-surface/60 border border-foai-border rounded-md px-3 py-2 text-sm font-mono focus:border-foai-gold/60 focus:outline-none"
            />
            {suggestedActions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {suggestedActions.map((s) => (
                  <button key={s} type="button" onClick={() => setAction(s)}
                    className="text-[11px] font-mono px-2 py-0.5 rounded-full border border-foai-border/60 text-foai-muted hover:border-foai-gold/40 hover:text-foai-gold transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs uppercase tracking-wider text-foai-muted mb-1.5">Payload (JSON)</label>
            <textarea
              value={payload}
              onChange={(e) => setPayload(e.target.value)}
              rows={6}
              className="w-full bg-foai-surface/60 border border-foai-border rounded-md px-3 py-2 text-xs font-mono focus:border-foai-gold/60 focus:outline-none"
            />
            <p className="text-[11px] text-foai-muted mt-1">{`{ "task_id": "...", "risk_tags": ["legal"], ... }`}</p>
          </div>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-foai-gold/40 bg-foai-gold/10 px-3 py-2 text-sm text-foai-gold">
              <AlertCircle className="size-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {receipt && (
            <div className="rounded-lg border border-foai-border bg-foai-surface/40 px-4 py-3 text-xs space-y-1.5">
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className={`size-4 ${receipt.verdict === 'allow' ? 'text-foai-cyan' : 'text-foai-gold'}`} />
                <span className="font-semibold uppercase tracking-wider">Receipt</span>
                {receipt.verdict && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    receipt.verdict === 'allow' ? 'bg-foai-cyan/15 text-foai-cyan'
                    : receipt.verdict === 'escalate' ? 'bg-foai-gold/15 text-foai-gold'
                    : 'bg-red-500/15 text-red-400'
                  }`}>
                    {receipt.verdict}
                  </span>
                )}
              </div>
              {receipt.task_id && <KV k="task_id" v={receipt.task_id} mono />}
              {receipt.receipt_id && <KV k="receipt_id" v={receipt.receipt_id} mono />}
              {receipt.action && <KV k="action" v={receipt.action} mono />}
              {receipt.reason && <KV k="reason" v={receipt.reason} />}
              {receipt.basis && <KV k="basis" v={receipt.basis} />}
              {receipt.next_action && <KV k="next" v={receipt.next_action} />}
              {receipt.decided_at && <KV k="decided_at" v={receipt.decided_at} />}
            </div>
          )}
        </div>

        <footer className="border-t border-foai-border px-5 py-4 flex items-center justify-between gap-2">
          <button type="button" onClick={onClose}
            className="text-xs px-4 py-2 rounded-full text-foai-muted hover:text-foai-text">
            Close
          </button>
          <button type="button" onClick={onSubmit} disabled={busy || !action.trim()}
            className="inline-flex items-center gap-2 text-xs font-semibold px-4 py-2 rounded-full bg-foai-gold text-foai-bg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-foai-gold/90 transition-colors">
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
            {busy ? 'Dispatching…' : 'Dispatch'}
          </button>
        </footer>
      </div>
    </div>
  );
}

function KV({ k, v, mono = false }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex gap-2">
      <span className="text-foai-muted shrink-0 w-20">{k}</span>
      <span className={mono ? 'font-mono text-foai-text break-all' : 'text-foai-text'}>{v}</span>
    </div>
  );
}
