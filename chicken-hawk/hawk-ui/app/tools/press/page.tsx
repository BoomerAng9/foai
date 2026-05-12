'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  Heart, Activity, Play, AlertCircle, CheckCircle2, RefreshCw, Loader2,
  ScrollText, KeyRound, ShieldCheck, Megaphone, Send,
} from 'lucide-react';

interface HeartbeatResponse {
  ok: boolean;
  source?: 'http' | 'file' | 'none';
  alive?: boolean;
  heartbeat?: Record<string, unknown>;
  age_seconds?: number | null;
  error?: string;
  checked_at?: string;
}

interface ReceiptEntry {
  receipt_id?: string;
  config_name?: string;
  timestamp?: string;
  targets?: Array<{ platform?: string; target?: string; ok?: boolean; error?: string | null }>;
  status?: string;
  [key: string]: unknown;
}

interface ReceiptsResponse {
  ok: boolean;
  source?: string;
  receipts: ReceiptEntry[];
  count: number;
  error?: string;
}

interface PlatformEntry {
  name?: string;
  description?: string;
  targets?: string[];
  credential_keys?: string[];
}

interface AuthResponse {
  ok: boolean;
  platforms: PlatformEntry[] | string[];
  error?: string;
}

interface TokenEntry {
  name: string;
  tier: string;
  has_secret: boolean;
}

interface TokensResponse {
  ok: boolean;
  tokens: TokenEntry[];
  count: number;
  error?: string;
}

export default function PressPanel() {
  const [hb, setHb] = useState<HeartbeatResponse | null>(null);
  const [hbLoading, setHbLoading] = useState(true);
  const [receipts, setReceipts] = useState<ReceiptsResponse | null>(null);
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [tokens, setTokens] = useState<TokensResponse | null>(null);
  const [daemonBusy, setDaemonBusy] = useState(false);
  const [daemonResult, setDaemonResult] = useState<unknown>(null);
  const [authTestBusy, setAuthTestBusy] = useState<string | null>(null);
  const [authTestResult, setAuthTestResult] = useState<{ platform: string; data: unknown } | null>(null);

  const loadHeartbeat = useCallback(async () => {
    setHbLoading(true);
    try {
      const r = await fetch('/api/gateway/press/heartbeat', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setHb(await r.json());
    } catch (e) {
      setHb({ ok: false, error: e instanceof Error ? e.message : String(e) });
    } finally {
      setHbLoading(false);
    }
  }, []);

  const loadReceipts = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/press/receipts?n=20', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setReceipts(await r.json());
    } catch (e) {
      setReceipts({ ok: false, receipts: [], count: 0, error: String(e) });
    }
  }, []);

  const loadAuth = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/press/auth', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setAuth(await r.json());
    } catch (e) {
      setAuth({ ok: false, platforms: [], error: String(e) });
    }
  }, []);

  const loadTokens = useCallback(async () => {
    try {
      const r = await fetch('/api/gateway/press/tokens', { credentials: 'same-origin' });
      if (r.status === 401) { window.location.href = '/login'; return; }
      setTokens(await r.json());
    } catch (e) {
      setTokens({ ok: false, tokens: [], count: 0, error: String(e) });
    }
  }, []);

  useEffect(() => { loadHeartbeat(); loadReceipts(); loadAuth(); loadTokens(); },
    [loadHeartbeat, loadReceipts, loadAuth, loadTokens]);

  async function startDaemon() {
    setDaemonBusy(true);
    setDaemonResult(null);
    try {
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'press_daemon_start', payload: {} }),
      });
      setDaemonResult(await r.json().catch(() => ({})));
    } catch (e) {
      setDaemonResult({ error: e instanceof Error ? e.message : String(e) });
    } finally {
      setDaemonBusy(false);
      setTimeout(loadHeartbeat, 2500);
    }
  }

  async function testAuth(platform: string, target?: string) {
    const key = `${platform}:${target ?? ''}`;
    setAuthTestBusy(key);
    setAuthTestResult(null);
    try {
      const r = await fetch('/api/gateway/run', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'press_auth_test',
          payload: target ? { platform, target } : { platform },
        }),
      });
      const data = await r.json().catch(() => ({}));
      setAuthTestResult({ platform: key, data });
    } catch (e) {
      setAuthTestResult({ platform: key, data: { error: String(e) } });
    } finally {
      setAuthTestBusy(null);
    }
  }

  return (
    <>
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Print_Press</h1>
          <p className="text-foai-muted mt-2">
            Press_Ang publishing pipeline — daemon, schedules, receipts, credentials, token index.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { loadHeartbeat(); loadReceipts(); loadAuth(); loadTokens(); }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium border border-foai-border bg-foai-surface text-foai-text hover:border-foai-gold/50 transition-colors"
        >
          <RefreshCw className="size-3.5" /> Refresh all
        </button>
      </header>

      {/* ── Daemon section ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <Heart className={`size-4 ${hb?.alive ? 'text-foai-cyan' : 'text-foai-gold'}`} />
              <h2 className="font-semibold text-lg">Daemon</h2>
              <LivenessPill hb={hb} loading={hbLoading} />
            </div>
            <p className="text-xs text-foai-muted">
              Long-running process at <code className="font-mono text-foai-gold">127.0.0.1:8472</code>.
              Owns the scheduler tick, heartbeat thread, HTTP trigger, file-drop inbox.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadHeartbeat}
              disabled={hbLoading}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`size-3 ${hbLoading ? 'animate-spin' : ''}`} />
            </button>
            <button
              type="button"
              onClick={startDaemon}
              disabled={daemonBusy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-foai-gold text-foai-bg hover:bg-foai-gold/90 transition-colors disabled:opacity-50"
            >
              {daemonBusy ? <Loader2 className="size-3 animate-spin" /> : <Play className="size-3" />}
              Start daemon
            </button>
          </div>
        </div>

        {hb?.heartbeat ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-foai-border/30 rounded-lg overflow-hidden">
            <Stat label="Source" value={hb.source || '—'} small />
            <Stat
              label="Last tick"
              value={hb.age_seconds != null ? `${Math.round(hb.age_seconds)}s ago` : '—'}
              mono small
            />
            <Stat
              label="PID"
              value={String((hb.heartbeat as { pid?: unknown }).pid ?? '—')}
              mono small
            />
            <Stat
              label="Started at"
              value={String((hb.heartbeat as { started_at?: unknown; emitted_at?: unknown }).started_at ?? (hb.heartbeat as { emitted_at?: unknown }).emitted_at ?? '—').slice(0, 19)}
              mono small
            />
          </div>
        ) : (
          <div className="text-xs text-foai-muted py-3 px-1">
            {hb?.error || 'No heartbeat detected. Click "Start daemon" to bring it up.'}
          </div>
        )}

        {daemonResult != null && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1.5">Last daemon-start result</div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-3 rounded border border-foai-border/40 max-h-40 overflow-auto">
              {JSON.stringify(daemonResult, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* ── Receipts section ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ScrollText className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Receipts</h2>
            <span className="text-[11px] font-mono text-foai-muted">last {receipts?.count ?? 0}</span>
          </div>
          <button type="button" onClick={loadReceipts}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors">
            <RefreshCw className="size-3" />
          </button>
        </div>

        {receipts?.error ? (
          <div className="text-xs text-foai-gold flex items-center gap-2"><AlertCircle className="size-3.5" /> {receipts.error}</div>
        ) : (receipts?.receipts.length ?? 0) === 0 ? (
          <div className="text-xs text-foai-muted py-4 text-center">No receipts yet. Send a cycle and they show up here.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2">When</th>
                  <th className="text-left px-3 py-2">Cycle</th>
                  <th className="text-left px-3 py-2">Targets</th>
                  <th className="text-left px-3 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {receipts!.receipts.slice().reverse().map((r, idx) => {
                  const allOk = (r.targets || []).every((t) => t.ok);
                  const targets = r.targets || [];
                  return (
                    <tr key={r.receipt_id || idx} className="border-t border-foai-border/40">
                      <td className="px-3 py-2 font-mono text-[10px] text-foai-muted">
                        {r.timestamp ? new Date(r.timestamp).toLocaleString() : '—'}
                      </td>
                      <td className="px-3 py-2 font-mono text-foai-gold">{r.config_name || '—'}</td>
                      <td className="px-3 py-2 space-x-1">
                        {targets.length === 0 ? <span className="text-foai-muted">—</span> : targets.map((t, i) => (
                          <span key={i} className={`inline-block text-[10px] px-1.5 py-0.5 rounded font-mono ${
                            t.ok ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-red-500/15 text-red-400'
                          }`}>
                            {t.platform}:{t.target}
                          </span>
                        ))}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                          allOk ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-red-500/15 text-red-400'
                        }`}>
                          {allOk ? 'ok' : 'partial'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Auth section ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="size-4 text-foai-gold" />
            <h2 className="font-semibold text-lg">Configured platforms</h2>
          </div>
          <button type="button" onClick={loadAuth}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors">
            <RefreshCw className="size-3" />
          </button>
        </div>

        {auth?.error ? (
          <div className="text-xs text-foai-gold flex items-center gap-2"><AlertCircle className="size-3.5" /> {auth.error}</div>
        ) : (auth?.platforms || []).length === 0 ? (
          <div className="text-xs text-foai-muted py-4">
            No platforms configured. Run <code className="font-mono">pp auth add &lt;platform&gt;</code> on the host first.
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {(auth!.platforms as PlatformEntry[]).map((p, idx) => {
              const name = typeof p === 'string' ? p : (p.name || 'unknown');
              const targets = typeof p === 'string' ? [] : (p.targets || []);
              const desc = typeof p === 'string' ? '' : (p.description || '');
              return (
                <div key={`${name}-${idx}`} className="rounded-lg border border-foai-border/60 bg-foai-surface/40 p-3">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="font-semibold text-sm flex items-center gap-1.5">
                      <Megaphone className="size-3 text-foai-gold" />
                      {name}
                    </div>
                    <span className="text-[10px] font-mono text-foai-muted">{targets.length} target{targets.length === 1 ? '' : 's'}</span>
                  </div>
                  {desc && <p className="text-[11px] text-foai-muted mb-2">{desc}</p>}
                  <div className="flex flex-wrap gap-1.5">
                    {targets.length === 0 ? (
                      <button
                        type="button"
                        onClick={() => testAuth(name)}
                        disabled={authTestBusy === `${name}:`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-foai-gold/15 text-foai-gold hover:bg-foai-gold/25 transition-colors disabled:opacity-50"
                      >
                        {authTestBusy === `${name}:` ? <Loader2 className="size-2.5 animate-spin" /> : <Send className="size-2.5" />}
                        Test
                      </button>
                    ) : targets.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => testAuth(name, t)}
                        disabled={authTestBusy === `${name}:${t}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-foai-gold/15 text-foai-gold hover:bg-foai-gold/25 transition-colors disabled:opacity-50"
                      >
                        {authTestBusy === `${name}:${t}` ? <Loader2 className="size-2.5 animate-spin" /> : <Send className="size-2.5" />}
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {authTestResult && (
          <div className="mt-4">
            <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1.5">
              Last test — <code className="font-mono">{authTestResult.platform}</code>
            </div>
            <pre className="text-[11px] font-mono whitespace-pre-wrap bg-foai-bg/60 p-3 rounded border border-foai-border/40 max-h-40 overflow-auto">
              {JSON.stringify(authTestResult.data, null, 2)}
            </pre>
          </div>
        )}
      </section>

      {/* ── Tokens section ── */}
      <section className="rounded-2xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="flex items-center gap-2.5">
              <KeyRound className="size-4 text-foai-gold" />
              <h2 className="font-semibold text-lg">Caller-token index</h2>
              <span className="text-[11px] font-mono text-foai-muted">{tokens?.count ?? 0} callers</span>
            </div>
            <p className="text-xs text-foai-muted mt-1">
              HMAC tokens per fleet caller. Presence only — secret values are never exposed by this panel.
            </p>
          </div>
          <button type="button" onClick={loadTokens}
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs border border-foai-border text-foai-muted hover:text-foai-text hover:border-foai-gold/50 transition-colors">
            <RefreshCw className="size-3" />
          </button>
        </div>

        {tokens?.error ? (
          <div className="text-xs text-foai-gold flex items-center gap-2"><AlertCircle className="size-3.5" /> {tokens.error}</div>
        ) : (tokens?.tokens || []).length === 0 ? (
          <div className="text-xs text-foai-muted py-4">No tokens registered yet.</div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-foai-border/50">
            <table className="w-full text-xs">
              <thead className="text-[10px] uppercase text-foai-muted bg-white/[0.02]">
                <tr>
                  <th className="text-left px-3 py-2">Caller</th>
                  <th className="text-left px-3 py-2">Tier</th>
                  <th className="text-left px-3 py-2">Secret</th>
                </tr>
              </thead>
              <tbody>
                {tokens!.tokens.map((t) => (
                  <tr key={t.name} className="border-t border-foai-border/40">
                    <td className="px-3 py-2 font-mono text-foai-gold">{t.name}</td>
                    <td className="px-3 py-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${tierClass(t.tier)}`}>
                        {t.tier}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {t.has_secret ? (
                        <span className="inline-flex items-center gap-1 text-foai-cyan text-[10px]">
                          <CheckCircle2 className="size-3" /> minted
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-foai-gold text-[10px]">
                          <AlertCircle className="size-3" /> empty
                        </span>
                      )}
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

function LivenessPill({ hb, loading }: { hb: HeartbeatResponse | null; loading: boolean }) {
  if (loading) return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-white/10 text-foai-muted inline-flex items-center gap-1"><Loader2 className="size-2.5 animate-spin" />checking</span>;
  if (hb?.alive) return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan inline-flex items-center gap-1"><Activity className="size-2.5" />alive</span>;
  return <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-gold/15 text-foai-gold">down</span>;
}

function Stat({ label, value, mono = false, small = false }: { label: string; value: string; mono?: boolean; small?: boolean }) {
  return (
    <div className="px-4 py-3 bg-foai-surface/40">
      <div className="text-[10px] uppercase tracking-wider text-foai-muted mb-1">{label}</div>
      <div className={`${mono ? 'font-mono' : ''} ${small ? 'text-xs' : 'text-sm'} text-foai-text truncate`}>{value}</div>
    </div>
  );
}

function tierClass(tier: string): string {
  switch (tier) {
    case 'ACHEEVY':       return 'bg-foai-gold/20 text-foai-gold';
    case 'Chicken_Hawk':  return 'bg-foai-gold/15 text-foai-gold';
    case 'Boomer_Ang':    return 'bg-foai-cyan/15 text-foai-cyan';
    case 'Lil_Hawk':      return 'bg-white/10 text-foai-muted';
    case 'External':      return 'bg-red-500/15 text-red-400';
    default:              return 'bg-white/5 text-foai-muted';
  }
}
