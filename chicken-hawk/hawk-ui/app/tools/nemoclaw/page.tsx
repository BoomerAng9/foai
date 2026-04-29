'use client';

import { useEffect, useState } from 'react';

interface Verdict {
  verdict?: string;
  basis?: string;
  reason?: string;
  matched_tags?: string[];
}

interface RiskEvent {
  recorded_at?: string;
  severity?: string;
  category?: string;
  description?: string;
}

const RISK_TAGS = [
  'legal',
  'money',
  'health',
  'certification',
  'customer_payment_data',
  'supplier_change',
  'final_public',
];

export default function PolicyGatePanel() {
  const [actionType, setActionType] = useState('');
  const [tags, setTags] = useState('');
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [verdictError, setVerdictError] = useState<string | null>(null);
  const [events, setEvents] = useState<RiskEvent[]>([]);
  const [eventsError, setEventsError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gateway/risk-events?limit=20', { credentials: 'same-origin' })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!r.ok) {
          setEventsError(`HTTP ${r.status}`);
          return;
        }
        const data = await r.json();
        setEvents(Array.isArray(data) ? data : data.events || []);
      })
      .catch((e: Error) => setEventsError(e.message));
  }, []);

  async function check() {
    if (!actionType.trim()) return;
    setVerdict(null);
    setVerdictError(null);
    try {
      const res = await fetch('/api/gateway/check', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: actionType.trim(),
          risk_tags: tags
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        setVerdictError(`HTTP ${res.status} — ${(await res.text()).slice(0, 200)}`);
        return;
      }
      setVerdict(await res.json());
    } catch (e) {
      setVerdictError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Policy Gate</h1>
        <p className="text-foai-muted mt-2">Ask "would this be allowed?" — without dispatching.</p>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <h2 className="font-semibold text-lg mb-1">Test a verdict</h2>
        <p className="text-sm text-foai-muted mb-4">Action verb + optional risk tags. No dispatch happens.</p>

        <label className="block text-xs uppercase tracking-wider text-foai-muted font-semibold mb-1">Action type</label>
        <input
          value={actionType}
          onChange={(e) => setActionType(e.target.value)}
          placeholder="e.g. summarize, recommend_bundle, send_payment"
          className="w-full bg-foai-bg border border-foai-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-foai-gold/60"
        />
        <label className="block text-xs uppercase tracking-wider text-foai-muted font-semibold mb-1">Risk tags (comma-separated)</label>
        <input
          value={tags}
          onChange={(e) => setTags(e.target.value)}
          placeholder="e.g. money, customer_payment_data"
          className="w-full bg-foai-bg border border-foai-border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:border-foai-gold/60"
        />
        <div className="flex gap-2">
          <button
            onClick={check}
            className="px-4 py-2 rounded-full bg-foai-gold text-foai-bg font-semibold text-sm hover:brightness-110 transition"
          >
            Check verdict
          </button>
          <button
            onClick={() => {
              setActionType('');
              setTags('');
              setVerdict(null);
              setVerdictError(null);
            }}
            className="px-4 py-2 rounded-full border border-foai-border text-foai-text text-sm hover:bg-white/5 transition"
          >
            Clear
          </button>
        </div>

        {verdictError && (
          <div className="mt-4 rounded-lg border border-foai-gold/40 bg-foai-gold/10 text-foai-gold px-4 py-3 text-sm">
            {verdictError}
          </div>
        )}
        {verdict && (
          <div className="mt-4 rounded-lg border border-foai-border bg-foai-bg p-4">
            <Pill verdict={verdict.verdict} />
            <div className="mt-2 text-sm">
              <strong>Basis:</strong> {verdict.basis || '—'}
            </div>
            <div className="text-sm">
              <strong>Reason:</strong> {verdict.reason || '—'}
            </div>
            {verdict.matched_tags?.length ? (
              <div className="text-sm mt-1">
                <strong>Matched tags:</strong>{' '}
                {verdict.matched_tags.map((t) => (
                  <code key={t} className="font-mono text-xs px-1.5 py-0.5 rounded bg-foai-gold/10 text-foai-gold mr-1">
                    {t}
                  </code>
                ))}
              </div>
            ) : null}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <h2 className="font-semibold text-lg mb-3">Risk tags catalog</h2>
        <div className="flex flex-wrap gap-2">
          {RISK_TAGS.map((t) => (
            <code key={t} className="text-xs font-mono px-2.5 py-1 rounded-full bg-foai-gold/10 text-foai-gold">
              {t}
            </code>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <h2 className="font-semibold text-lg mb-3">Recent risk events</h2>
        {eventsError ? (
          <div className="text-foai-gold text-sm">{eventsError}</div>
        ) : events.length === 0 ? (
          <div className="text-foai-muted text-sm py-6 text-center">No risk events recorded.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-foai-muted">
              <tr>
                <th className="text-left py-2">When</th>
                <th className="text-left py-2">Severity</th>
                <th className="text-left py-2">Category</th>
                <th className="text-left py-2">Description</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e, i) => (
                <tr key={i} className="border-t border-foai-border/50">
                  <td className="py-2">{e.recorded_at ? new Date(e.recorded_at).toLocaleString() : '—'}</td>
                  <td className="py-2">{e.severity || '?'}</td>
                  <td className="py-2 font-mono text-xs text-foai-gold">{e.category || '?'}</td>
                  <td className="py-2 text-foai-muted">{e.description || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </>
  );
}

function Pill({ verdict }: { verdict?: string }) {
  const v = verdict || 'unknown';
  const tone =
    v === 'allow'
      ? 'bg-foai-cyan/15 text-foai-cyan'
      : v === 'escalate'
      ? 'bg-foai-gold/15 text-foai-gold'
      : v === 'deny'
      ? 'bg-foai-gold/15 text-foai-gold'
      : 'bg-white/10 text-foai-muted';
  return <span className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${tone}`}>{v}</span>;
}
