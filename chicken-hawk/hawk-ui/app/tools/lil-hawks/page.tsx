'use client';

import { useEffect, useState } from 'react';

const HAWK_DESCRIPTIONS: Record<string, string> = {
  Lil_TRAE_Hawk: 'Heavy coding, repo-wide refactors',
  Lil_Coding_Hawk: 'Plan-first feature work',
  Lil_Agent_Hawk: 'OS / browser / CLI workflows',
  Lil_Flow_Hawk: 'SaaS / CRM / payment automation',
  Lil_Sand_Hawk: 'Safe containerized code execution',
  Lil_Memory_Hawk: 'Long-term RAG memory',
  Lil_Graph_Hawk: 'Stateful conditional workflows',
  Lil_Back_Hawk: 'Backend scaffolding, auth, APIs',
  Lil_Viz_Hawk: 'Monitoring dashboards',
  Lil_Blend_Hawk: '3D modeling, rendering',
  Lil_Deep_Hawk: 'SuperAgent · Squad mode',
};

export default function LilHawksPanel() {
  const [hawks, setHawks] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/gateway/hawks', { credentials: 'same-origin' })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = '/login';
          return;
        }
        if (!r.ok) {
          setError(`HTTP ${r.status}`);
          return;
        }
        const data = await r.json();
        setHawks(data.hawks || []);
      })
      .catch((e: Error) => setError(e.message));
  }, []);

  return (
    <>
      <header className="mb-8">
        <h1 className="text-3xl font-semibold tracking-tight">Lil_Hawks</h1>
        <p className="text-foai-muted mt-2">Specialist agents under Chicken Hawk. Read-only roster for now.</p>
      </header>

      <section className="rounded-xl border border-foai-border bg-foai-surface/60 backdrop-blur p-6">
        <h2 className="font-semibold text-lg mb-3">Roster</h2>
        {error ? (
          <div className="text-foai-gold text-sm">{error}</div>
        ) : hawks.length === 0 ? (
          <div className="text-foai-muted text-sm py-6 text-center">Loading roster…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-foai-muted">
              <tr>
                <th className="text-left py-2">Name</th>
                <th className="text-left py-2">Specialty</th>
                <th className="text-left py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {hawks.map((h) => (
                <tr key={h} className="border-t border-foai-border/50">
                  <td className="py-2 font-mono text-xs text-foai-gold">{h}</td>
                  <td className="py-2 text-foai-muted">{HAWK_DESCRIPTIONS[h] || '—'}</td>
                  <td className="py-2">
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-foai-cyan/15 text-foai-cyan">
                      Configured
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="text-xs text-foai-muted mt-4">Spawn / inspect / retire write actions arrive in the next pass.</p>
      </section>
    </>
  );
}
