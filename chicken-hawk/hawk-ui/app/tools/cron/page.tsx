'use client';

import { useCallback, useEffect, useState } from 'react';
import { Calendar, Loader2, Play, AlertCircle, CheckCircle2, RefreshCw } from 'lucide-react';

interface ScheduleEntry {
  name: string;
  cron?: string;
  source: 'sqwaadrun' | 'print_press' | string;
  status?: string;
  description?: string;
  interval_seconds?: number;
  last_run?: string | null;
  next_run?: string | null;
}

interface SchedulesResponse {
  schedules: ScheduleEntry[];
  total: number;
  sources: {
    sqwaadrun: 'ok' | 'unavailable';
    print_press: 'ok' | 'unavailable';
  };
}

interface RunReceipt {
  ok?: boolean;
  verdict?: string;
  detail?: {
    ok?: boolean;
    source?: string;
    name?: string;
    error?: string;
    http_status?: number;
    exit_code?: number;
  };
  receipt?: {
    receipt_id?: string;
    task_id?: string;
    action?: string;
    elapsed_ms?: number;
  };
}

export default function CronPanel() {
  const [data, setData] = useState<SchedulesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyJob, setBusyJob] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<{ name: string; receipt: RunReceipt } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch('/api/gateway/schedules', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      if (!r.ok) { setError(`HTTP ${r.status}`); return; }
      setData(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function runOnce(entry: ScheduleEntry) {
    setBusyJob(entry.name);
    setLastResult(null);
    try {
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'schedule_run_once',
          payload: { name: entry.name, source: entry.source },
        }),
      });
      const body = await r.json().catch(() => ({}));
      setLastResult({ name: entry.name, receipt: body });
    } catch (e) {
      setLastResult({ name: entry.name, receipt: { ok: false, detail: { error: String(e) } } });
    } finally {
      setBusyJob(null);
    }
  }

  const sqwaadrunStatus = data?.sources.sqwaadrun || 'unavailable';
  const printPressStatus = data?.sources.print_press || 'unavailable';

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Scheduled Jobs</h1>
          <p className="text-foai-muted mt-2">
            Merged registry — Sqwaadrun scrape cadence + Print_Press publish cadence.
            Run any job ad-hoc via the play button.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border bg-foai-surface text-foai-text hover:border-foai-gold/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <div className="flex items-center gap-3 mb-3">
          <Calendar className="size-5 text-foai-gold" />
          <h2 className="font-semibold text-lg">Source health</h2>
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <SourcePill name="Sqwaadrun" status={sqwaadrunStatus} />
          <SourcePill name="Print_Press" status={printPressStatus} />
        </div>
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <h2 className="font-semibold text-lg mb-3">Registered jobs</h2>
        {error ? (
          <div className="flex items-center gap-2 text-sm text-foai-gold">
            <AlertCircle className="size-4" /> {error}
          </div>
        ) : loading ? (
          <div className="text-foai-muted text-sm py-6 text-center">
            <Loader2 className="size-4 animate-spin inline-block mr-2" />
            Loading…
          </div>
        ) : (data?.schedules.length ?? 0) === 0 ? (
          <div className="text-foai-muted text-sm py-8 text-center">
            No schedules registered. Sources reachable: {sqwaadrunStatus === 'ok' ? 'Sqwaadrun ' : ''}
            {printPressStatus === 'ok' ? 'Print_Press' : ''}
            {sqwaadrunStatus === 'unavailable' && printPressStatus === 'unavailable' ? 'none' : ''}.
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-4 py-2.5">Name</th>
                  <th className="text-left px-4 py-2.5">Schedule</th>
                  <th className="text-left px-4 py-2.5">Source</th>
                  <th className="text-left px-4 py-2.5">Status</th>
                  <th className="text-right px-4 py-2.5">Run now</th>
                </tr>
              </thead>
              <tbody>
                {data?.schedules.map((s) => (
                  <tr key={`${s.source}:${s.name}`} className="border-t border-foai-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foai-gold">{s.name}</div>
                      {s.description && (
                        <div className="text-[11px] text-foai-muted mt-0.5 max-w-md">{s.description}</div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {s.cron ? (
                        <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-foai-bg text-foai-gold">{s.cron}</code>
                      ) : s.interval_seconds ? (
                        <span className="text-xs text-foai-muted">every {Math.round(s.interval_seconds / 60)}m</span>
                      ) : <span className="text-xs text-foai-muted">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/5 text-foai-muted uppercase tracking-wider">
                        {s.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">
                        {s.status || 'registered'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => runOnce(s)}
                        disabled={busyJob === s.name}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-foai-gold/15 text-foai-gold hover:bg-foai-gold/25 transition-colors disabled:opacity-50"
                      >
                        {busyJob === s.name ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
                        Run once
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-foai-muted mt-4">
          Run-once requests pass through NemoClaw. Live cadence stays on the upstream scheduler — this panel triggers
          ad-hoc runs only.
        </p>
      </section>

      {lastResult && (
        <section className="mt-6 rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className={`size-4 ${lastResult.receipt.ok ? 'text-foai-cyan' : 'text-foai-gold'}`} />
            <span className="font-semibold uppercase tracking-wider text-xs">Last run result</span>
            <span className="font-mono text-xs text-foai-gold">{lastResult.name}</span>
          </div>
          <pre className="text-[11px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-3 rounded border border-foai-border/40 max-h-64 overflow-auto">
            {JSON.stringify(lastResult.receipt, null, 2)}
          </pre>
        </section>
      )}
    </>
  );
}

function SourcePill({ name, status }: { name: string; status: 'ok' | 'unavailable' | string }) {
  const isOk = status === 'ok';
  return (
    <div className={`flex items-center justify-between rounded-lg border px-4 py-2.5 ${
      isOk ? 'border-foai-cyan/30 bg-foai-cyan/5' : 'border-foai-gold/30 bg-foai-gold/5'
    }`}>
      <span className="font-medium text-sm">{name}</span>
      <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
        isOk ? 'bg-foai-cyan/20 text-foai-cyan' : 'bg-foai-gold/20 text-foai-gold'
      }`}>
        {status}
      </span>
    </div>
  );
}
