'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  FileJson, RefreshCw, AlertCircle, X, Loader2, Eye, GitBranch,
} from 'lucide-react';

interface MissionEntry {
  mission_id: string | null;
  title: string;
  version?: string;
  spec_path: string;
  executable: boolean;
  runtime_module?: string;
  lane_id?: string;
  pipeline_stage_count?: number;
  pipeline_stages?: string[];
  drift_status?: 'ok' | 'drift' | 'spec_not_found' | 'no_spec' | 'no_runtime' | 'spec_parse_failed' | string;
  drift?: {
    missing_in_spec?: string[];
    spec_stages?: string[];
    implemented_stages?: string[];
  };
  schedule_cron?: string | null;
  owner_agent?: string;
}

interface MissionsResponse {
  ok: boolean;
  missions: MissionEntry[];
  count: number;
  spec_dir?: string;
  error?: string;
  scanned_at?: string;
}

interface SpecResponse {
  ok: boolean;
  mission_id?: string;
  spec_path?: string;
  spec?: Record<string, unknown>;
  error?: string;
}

export default function MissionsPanel() {
  const [data, setData] = useState<MissionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [openSpec, setOpenSpec] = useState<MissionEntry | null>(null);
  const [specBody, setSpecBody] = useState<SpecResponse | null>(null);
  const [specLoading, setSpecLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch('/api/gateway/missions', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setData(await r.json());
    } catch (e) {
      setData({ ok: false, missions: [], count: 0, error: String(e) });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function openSpecModal(entry: MissionEntry) {
    setOpenSpec(entry);
    setSpecBody(null);
    if (!entry.mission_id) return;
    setSpecLoading(true);
    try {
      const r = await fetch(`/api/gateway/missions/${encodeURIComponent(entry.mission_id)}/spec`, { credentials: 'same-origin' });
      setSpecBody(await r.json());
    } catch (e) {
      setSpecBody({ ok: false, error: String(e) });
    } finally {
      setSpecLoading(false);
    }
  }

  function closeSpec() { setOpenSpec(null); setSpecBody(null); }

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Missions</h1>
          <p className="text-foai-muted mt-2">
            Mission spec registry. Specs are inert documentation — runtime is hardcoded Python.
            Drift status compares Python implementation against the JSON spec.
          </p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border bg-foai-surface text-foai-text hover:border-foai-gold/50 transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
        </button>
      </header>

      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <FileJson className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Registered missions</h2>
            <span className="text-[11px] font-mono text-foai-muted">{data?.count ?? 0} spec{(data?.count ?? 0) === 1 ? '' : 's'}</span>
          </div>
          {data?.spec_dir && (
            <code className="text-[10px] font-mono text-foai-muted truncate max-w-md">{data.spec_dir}</code>
          )}
        </div>

        {data?.error ? (
          <div className="flex items-start gap-2 text-sm text-foai-gold py-4">
            <AlertCircle className="size-4 mt-0.5" /> {data.error}
          </div>
        ) : loading ? (
          <div className="text-foai-muted text-sm py-6 text-center">
            <Loader2 className="size-4 animate-spin inline-block mr-2" /> Loading…
          </div>
        ) : (data?.missions.length ?? 0) === 0 ? (
          <div className="text-foai-muted text-sm py-6 text-center">No mission specs found.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-sm">
              <thead className="text-xs uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-4 py-2.5">Mission</th>
                  <th className="text-left px-4 py-2.5">Runtime</th>
                  <th className="text-left px-4 py-2.5">Pipeline</th>
                  <th className="text-left px-4 py-2.5">Drift</th>
                  <th className="text-left px-4 py-2.5">Cron</th>
                  <th className="text-right px-4 py-2.5">Action</th>
                </tr>
              </thead>
              <tbody>
                {data!.missions.map((m, idx) => (
                  <tr key={`${m.mission_id}-${idx}`} className="border-t border-foai-border/50 hover:bg-white/[0.02] transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono text-xs text-foai-gold">{m.mission_id || m.title}</div>
                      <div className="text-[10px] text-foai-muted mt-0.5">{m.title}</div>
                    </td>
                    <td className="px-4 py-3">
                      {m.runtime_module ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono text-foai-text">
                          <GitBranch className="size-3 text-foai-cyan/70" />
                          {m.runtime_module}
                        </span>
                      ) : (
                        <span className="text-[11px] text-foai-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-[11px] font-mono text-foai-muted">
                      {(m.pipeline_stages || []).length > 0 ? m.pipeline_stages!.join(' → ') : '—'}
                    </td>
                    <td className="px-4 py-3"><DriftPill status={m.drift_status} drift={m.drift} /></td>
                    <td className="px-4 py-3">
                      {m.schedule_cron ? (
                        <code className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-foai-bg text-foai-gold">{m.schedule_cron}</code>
                      ) : <span className="text-[11px] text-foai-muted">—</span>}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => openSpecModal(m)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-foai-gold/15 text-foai-gold hover:bg-foai-gold/25 transition-colors"
                      >
                        <Eye className="size-3" /> Spec
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="text-xs text-foai-muted mt-4">
          Drift = Python <code className="font-mono">IMPLEMENTED_STAGES</code> vs JSON spec <code className="font-mono">pipeline[].stage</code>.
          <span className="text-foai-cyan"> ok</span> = implemented is a subset of spec (intended).
          <span className="text-red-400"> drift</span> = Python claims a stage the spec dropped.
        </p>
      </section>

      {openSpec && (
        <SpecDrawer entry={openSpec} body={specBody} loading={specLoading} onClose={closeSpec} />
      )}
    </>
  );
}

function DriftPill({ status, drift }: { status?: string; drift?: MissionEntry['drift'] }) {
  const map: Record<string, { cls: string; label: string }> = {
    ok:                { cls: 'bg-foai-cyan/15 text-foai-cyan',  label: 'spec ok' },
    drift:             { cls: 'bg-red-500/15 text-red-400',      label: 'DRIFT' },
    spec_not_found:    { cls: 'bg-white/5 text-foai-muted',      label: 'no spec' },
    no_spec:           { cls: 'bg-white/5 text-foai-muted',      label: 'no spec' },
    no_runtime:        { cls: 'bg-white/5 text-foai-muted',      label: 'spec only' },
    spec_parse_failed: { cls: 'bg-foai-gold/15 text-foai-gold',  label: 'parse err' },
  };
  const e = map[status ?? ''] ?? { cls: 'bg-white/10 text-foai-muted', label: status || '—' };
  const tooltip =
    status === 'drift' && drift?.missing_in_spec
      ? `Missing in spec: ${drift.missing_in_spec.join(', ')}`
      : status === 'ok'
      ? 'Implemented is a subset of spec'
      : '';
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${e.cls}`} title={tooltip}>
      {e.label}
    </span>
  );
}

function SpecDrawer({
  entry, body, loading, onClose,
}: {
  entry: MissionEntry;
  body: SpecResponse | null;
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="relative h-full w-full max-w-3xl bg-foai-bg border-l border-foai-border shadow-2xl flex flex-col" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-center justify-between border-b border-foai-border px-5 py-4">
          <div>
            <h2 className="text-sm font-semibold tracking-tight">{entry.title}</h2>
            <p className="text-xs font-mono text-foai-gold">{entry.mission_id}</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-md p-1.5 text-foai-muted hover:bg-white/5 hover:text-foai-text">
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Drift detail */}
          {entry.drift && (entry.drift.spec_stages?.length || 0) > 0 && (
            <div className="rounded-lg border border-foai-border/60 bg-foai-surface/40 p-4">
              <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-2">Drift comparison</div>
              <div className="space-y-2 text-xs">
                <div>
                  <span className="text-foai-muted w-32 inline-block">Spec stages:</span>
                  <code className="font-mono text-foai-text">{(entry.drift.spec_stages || []).join(' → ')}</code>
                </div>
                <div>
                  <span className="text-foai-muted w-32 inline-block">Implemented:</span>
                  <code className="font-mono text-foai-cyan">{(entry.drift.implemented_stages || []).join(' → ')}</code>
                </div>
                {(entry.drift.missing_in_spec || []).length > 0 && (
                  <div className="text-red-400">
                    <span className="text-red-400/70 w-32 inline-block">Missing in spec:</span>
                    <code className="font-mono">{entry.drift.missing_in_spec!.join(', ')}</code>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Spec body */}
          <div>
            <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-2 flex items-center justify-between">
              <span>Full spec</span>
              {body?.spec_path && <code className="font-mono text-foai-muted/70 normal-case tracking-normal">{body.spec_path.split(/[\\/]/).pop()}</code>}
            </div>
            {loading ? (
              <div className="text-foai-muted text-sm py-6 text-center">
                <Loader2 className="size-4 animate-spin inline-block mr-2" /> Loading…
              </div>
            ) : body?.spec ? (
              <pre className="text-[11px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-3 rounded border border-foai-border/40 max-h-[60vh] overflow-auto">
                {JSON.stringify(body.spec, null, 2)}
              </pre>
            ) : (
              <div className="text-foai-gold text-sm flex items-center gap-2">
                <AlertCircle className="size-4" />
                {body?.error || 'Spec not loaded'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
