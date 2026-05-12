'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Hammer, Loader2, Sparkles, AlertCircle, CheckCircle2,
  Folder, ExternalLink, Activity,
} from 'lucide-react';
import Link from 'next/link';

interface PresetEntry {
  label: string;
  blurb: string;
  target_hawks: string[];
}

interface PresetsResponse {
  presets: Record<string, PresetEntry>;
}

interface BuildResult {
  ok?: boolean;
  verdict?: string;
  detail?: {
    ok?: boolean;
    task_id?: string;
    workspace_name?: string;
    workspace_path?: string;
    stack_preset?: string;
    target_hawks?: string[];
    squad_dispatch?: {
      ok?: boolean;
      dispatched?: boolean;
      error?: string;
      http_status?: number;
    };
    live_plan_hint?: string;
    deploy_hint?: string;
    error?: string;
  };
  receipt?: {
    receipt_id?: string;
    task_id?: string;
  };
}

const PRESET_ORDER: string[] = [
  'nextjs_fastapi',
  'nextjs_static',
  'fastapi_service',
  'dashboard',
  'fullstack_squad',
];

export default function BuilderPanel() {
  const [presets, setPresets] = useState<PresetsResponse | null>(null);
  const [workspaceName, setWorkspaceName] = useState('');
  const [brief, setBrief] = useState('');
  const [stackPreset, setStackPreset] = useState('nextjs_fastapi');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadPresets = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/builder/presets', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setPresets(await r.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }, []);

  useEffect(() => { loadPresets(); }, [loadPresets]);

  async function submit() {
    if (!workspaceName.trim() || !brief.trim()) {
      setError('Workspace name and brief are both required.');
      return;
    }
    setBusy(true); setResult(null); setError(null);
    try {
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'build_site',
          payload: {
            workspace_name: workspaceName.trim(),
            brief: brief.trim(),
            stack_preset: stackPreset,
          },
        }),
      });
      setResult(await r.json().catch(() => ({})));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  const taskId = result?.detail?.task_id;
  const workspacePath = result?.detail?.workspace_path;
  const squadOk = result?.detail?.squad_dispatch?.dispatched ?? result?.detail?.squad_dispatch?.ok;

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Builder</h1>
          <p className="text-foai-muted mt-2">
            Tell Chicken Hawk what to build. The squad scaffolds it into a workspace.
            Review the output. Ship from <Link href="/tools/deploy" className="text-foai-gold hover:underline">/tools/deploy</Link> when you&apos;re happy.
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-foai-gold/30 bg-foai-gold/5 p-4 mb-5 text-xs text-foai-gold flex items-start gap-3">
        <Sparkles className="size-4 mt-0.5 shrink-0" />
        <div>
          <div className="font-semibold mb-0.5">Build is safe. Deploy is the gate.</div>
          <p className="text-foai-muted">
            Builds write to <code className="font-mono">~/chicken-hawk-workspaces/&lt;name&gt;/</code> only.
            Nothing ships until you click Ship It in <Link href="/tools/deploy" className="text-foai-gold hover:underline">/tools/deploy</Link>,
            which goes through Telegram confirm.
          </p>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* ── Form column (2/3) ── */}
        <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 lg:col-span-2">
          <div className="flex items-center gap-2.5 mb-5">
            <Hammer className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Brief</h2>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs uppercase tracking-wider text-foai-muted mb-1.5">Workspace name</label>
              <input
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g. ny-tile-installer-site"
                className="w-full bg-foai-bg/60 border border-foai-border rounded-md px-3 py-2 text-sm font-mono focus:border-foai-gold/60 focus:outline-none"
                disabled={busy}
              />
              <p className="text-[10px] text-foai-muted mt-1">
                Becomes <code className="font-mono">~/chicken-hawk-workspaces/&lt;sanitized&gt;</code>. Lowercase, dashes, no slashes.
              </p>
            </div>

            <div>
              <label className="block text-xs uppercase tracking-wider text-foai-muted mb-1.5">What to build</label>
              <textarea
                value={brief}
                onChange={(e) => setBrief(e.target.value)}
                rows={8}
                placeholder="e.g. A booking site for a NY tile installer. Hero with phone CTA, services grid, portfolio gallery, contact form that emails to owner. Use the FOAI gold-on-slate palette."
                className="w-full bg-foai-bg/60 border border-foai-border rounded-md px-3 py-2 text-sm focus:border-foai-gold/60 focus:outline-none"
                disabled={busy}
              />
              <p className="text-[10px] text-foai-muted mt-1">
                Plain English. Mention pages, sections, integrations, brand notes. The squad will fill gaps with reasonable defaults.
              </p>
            </div>

            <button
              type="button"
              onClick={submit}
              disabled={busy || !workspaceName.trim() || !brief.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-semibold bg-foai-gold text-foai-bg hover:bg-foai-gold/90 transition-colors disabled:opacity-50"
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : <Hammer className="size-4" />}
              {busy ? 'Dispatching squad…' : 'Build it'}
            </button>

            {error && (
              <div className="flex items-start gap-2 text-xs text-foai-gold">
                <AlertCircle className="size-3.5 mt-0.5" /> {error}
              </div>
            )}
          </div>
        </section>

        {/* ── Preset column (1/3) ── */}
        <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
          <div className="flex items-center gap-2.5 mb-5">
            <Folder className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Stack preset</h2>
          </div>
          <div className="space-y-2">
            {PRESET_ORDER.map((key) => {
              const p = presets?.presets?.[key];
              if (!p) return null;
              const selected = stackPreset === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setStackPreset(key)}
                  disabled={busy}
                  className={`w-full text-left rounded-lg border p-3 transition-colors ${
                    selected
                      ? 'border-foai-gold/60 bg-foai-gold/10'
                      : 'border-foai-border hover:border-foai-gold/40 bg-foai-surface/40'
                  } disabled:opacity-50`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-semibold">{p.label}</span>
                    {selected && <CheckCircle2 className="size-3.5 text-foai-gold" />}
                  </div>
                  <p className="text-[11px] text-foai-muted mb-1.5">{p.blurb}</p>
                  <div className="flex flex-wrap gap-1">
                    {p.target_hawks.map((h) => (
                      <span key={h} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-foai-bg/60 text-foai-gold/80">
                        {h.replace('Lil_', '').replace('_Hawk', '')}
                      </span>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
          {!presets && (
            <div className="text-xs text-foai-muted py-4 text-center">
              <Loader2 className="size-3 animate-spin inline-block mr-1" /> Loading presets…
            </div>
          )}
        </section>
      </div>

      {/* ── Result section ── */}
      {result && (
        <section className="mt-6 rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <CheckCircle2 className={`size-4 ${result.detail?.ok ? 'text-foai-cyan' : 'text-foai-gold'}`} />
            <h2 className="font-semibold text-lg">Build dispatched</h2>
            {squadOk ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">
                squad active
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-gold/15 text-foai-gold">
                workspace ready, squad pending
              </span>
            )}
          </div>

          {result.detail?.error && (
            <div className="rounded-lg border border-foai-gold/40 bg-foai-gold/5 p-3 text-xs text-foai-gold mb-4 flex items-start gap-2">
              <AlertCircle className="size-3.5 mt-0.5" /> {result.detail.error}
            </div>
          )}

          {result.detail?.ok && (
            <div className="grid sm:grid-cols-2 gap-4 mb-4">
              <ResultKV label="Task ID" value={taskId || '—'} mono />
              <ResultKV label="Workspace" value={result.detail.workspace_name || '—'} mono />
              <ResultKV label="Preset" value={result.detail.stack_preset || '—'} mono />
              <ResultKV label="Squad" value={(result.detail.target_hawks || []).join(', ')} mono small />
            </div>
          )}

          {workspacePath && (
            <div className="rounded-lg border border-foai-border/40 bg-foai-bg/60 p-3 mb-4">
              <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1">Workspace path</div>
              <code className="font-mono text-xs text-foai-gold break-all">{workspacePath}</code>
            </div>
          )}

          <div className="flex flex-wrap gap-3">
            {taskId && (
              <Link
                href={`/tools/live-plan`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-foai-gold/15 text-foai-gold hover:bg-foai-gold/25 transition-colors"
              >
                <Activity className="size-3" />
                Watch squad in Live Plan
                <ExternalLink className="size-3" />
              </Link>
            )}
            <Link
              href="/tools/deploy"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold border border-foai-border text-foai-text hover:border-foai-gold/50 transition-colors"
            >
              Ship when ready → /tools/deploy
              <ExternalLink className="size-3" />
            </Link>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-[11px] uppercase tracking-wider text-foai-muted hover:text-foai-text">
              Raw response
            </summary>
            <pre className="mt-2 text-[10px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-3 rounded border border-foai-border/40 max-h-64 overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </details>
        </section>
      )}
    </>
  );
}

function ResultKV({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="rounded-lg border border-foai-border/40 bg-foai-bg/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${small ? 'text-[11px]' : 'text-sm'} text-foai-text break-all`}>{value}</div>
    </div>
  );
}
