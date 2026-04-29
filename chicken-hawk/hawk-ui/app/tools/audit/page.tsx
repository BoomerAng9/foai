'use client';

import { useState } from 'react';

interface Receipt {
  receipt_id?: string;
  task_id?: string;
  action?: string;
  verdict?: string;
  decided_at?: string;
  elapsed_ms?: number;
}

interface Integrity {
  ok?: boolean;
  chain_length?: number;
  broken_at?: string | null;
}

export default function AuditPanel() {
  const [taskId, setTaskId] = useState('');
  const [receipts, setReceipts] = useState<Receipt[] | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [integrity, setIntegrity] = useState<Integrity | null>(null);
  const [integrityError, setIntegrityError] = useState<string | null>(null);

  async function lookup() {
    const t = taskId.trim();
    if (!t) return;
    setReceipts(null);
    setLookupError(null);
    try {
      const res = await fetch(`/api/gateway/audit/${encodeURIComponent(t)}`, { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        setLookupError(`HTTP ${res.status}`);
        return;
      }
      const data = await res.json();
      setReceipts(data.receipts || []);
    } catch (e) {
      setLookupError(e instanceof Error ? e.message : String(e));
    }
  }

  async function check() {
    setIntegrity(null);
    setIntegrityError(null);
    try {
      const res = await fetch('/api/gateway/audit/integrity-check', { credentials: 'same-origin' });
      if (res.status === 401) {
        window.location.href = '/login';
        return;
      }
      if (!res.ok) {
        setIntegrityError(`HTTP ${res.status}`);
        return;
      }
      setIntegrity(await res.json());
    } catch (e) {
      setIntegrityError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Audit Chain</h1>
        <p className="text-foai-muted mt-2">SHA256 tamper-evident receipt chain. Every dispatch leaves a receipt.</p>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6 mb-6">
        <h2 className="font-semibold text-lg mb-2">Look up a task</h2>
        <p className="text-sm text-foai-muted mb-3">Returns every receipt for a task_id — run, escalate, or deny.</p>
        <input
          value={taskId}
          onChange={(e) => setTaskId(e.target.value)}
          placeholder="task_abc123…"
          className="w-full bg-foai-bg border border-foai-border rounded-lg px-3 py-2 mb-3 focus:outline-none focus:border-foai-gold/60"
        />
        <div className="flex gap-2 mb-4">
          <button
            onClick={lookup}
            className="px-4 py-2 rounded-full bg-foai-gold text-foai-bg font-semibold text-sm hover:brightness-110 transition"
          >
            Look up
          </button>
          <button
            onClick={() => {
              setTaskId('');
              setReceipts(null);
              setLookupError(null);
            }}
            className="px-4 py-2 rounded-full border border-foai-border text-foai-text text-sm hover:bg-white/5 transition"
          >
            Clear
          </button>
        </div>

        {lookupError && (
          <div className="rounded-lg border border-foai-gold/40 bg-foai-gold/10 text-foai-gold px-4 py-3 text-sm">
            {lookupError}
          </div>
        )}
        {receipts && (
          <div>
            {receipts.length === 0 ? (
              <div className="text-foai-muted text-sm py-4 text-center">No receipts for that task.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs uppercase text-foai-muted">
                  <tr>
                    <th className="text-left py-2">Receipt</th>
                    <th className="text-left py-2">Action</th>
                    <th className="text-left py-2">Verdict</th>
                    <th className="text-left py-2">When</th>
                    <th className="text-left py-2">Elapsed</th>
                  </tr>
                </thead>
                <tbody>
                  {receipts.map((r, i) => (
                    <tr key={r.receipt_id || i} className="border-t border-foai-border/50">
                      <td className="py-2 font-mono text-xs text-foai-gold">{r.receipt_id || '—'}</td>
                      <td className="py-2">{r.action || '—'}</td>
                      <td className="py-2">
                        <span className="text-[11px] font-semibold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-white/10 text-foai-muted">
                          {r.verdict || '?'}
                        </span>
                      </td>
                      <td className="py-2 text-foai-muted">
                        {r.decided_at ? new Date(r.decided_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2 font-mono text-xs">{(r.elapsed_ms ?? 0).toFixed(1)} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </section>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <h2 className="font-semibold text-lg mb-2">Chain integrity</h2>
        <p className="text-sm text-foai-muted mb-4">Verifies the receipt buffer end-to-end.</p>
        <button
          onClick={check}
          className="px-4 py-2 rounded-full bg-foai-gold text-foai-bg font-semibold text-sm hover:brightness-110 transition"
        >
          Run integrity check
        </button>
        {integrityError && (
          <div className="mt-3 rounded-lg border border-foai-gold/40 bg-foai-gold/10 text-foai-gold px-4 py-3 text-sm">
            {integrityError}
          </div>
        )}
        {integrity && (
          <div className="mt-4 rounded-lg border border-foai-border bg-foai-bg p-4">
            <span
              className={`text-xs font-semibold uppercase tracking-wider px-3 py-1 rounded-full ${
                integrity.ok ? 'bg-foai-cyan/15 text-foai-cyan' : 'bg-foai-gold/15 text-foai-gold'
              }`}
            >
              {integrity.ok ? 'OK' : 'BROKEN'}
            </span>
            <div className="mt-2 text-sm">
              <strong>Chain length:</strong> {integrity.chain_length ?? '—'}
            </div>
            {integrity.broken_at && (
              <div className="text-sm">
                <strong>Broken at:</strong>{' '}
                <code className="font-mono text-xs px-1.5 py-0.5 rounded bg-foai-gold/10 text-foai-gold">
                  {integrity.broken_at}
                </code>
              </div>
            )}
          </div>
        )}
      </section>
    </>
  );
}
