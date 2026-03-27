/**
 * StatusStrip — Compact horizontal LUC status bar.
 * Display-only. All math in luc_engine.py.
 */

import React, { useEffect, useState } from "react";

interface AccountState {
  user_account_id: string;
  plan_id: string;
  usage: Record<string, number>;
  limits: Record<string, number>;
  remaining: Record<string, number>;
  overage: Record<string, number>;
  last_updated: string;
}

const KEY_RESOURCES = [
  { key: "llm_tokens_out", label: "LLM Out" },
  { key: "container_hours", label: "Containers" },
  { key: "swarm_cycles", label: "Swarms" },
  { key: "n8n_executions", label: "n8n" },
];

export default function StatusStrip({ userAccountId }: { userAccountId: string }) {
  const [state, setState] = useState<AccountState | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`/api/luc/state/${userAccountId}`);
        if (resp.ok) setState(await resp.json());
      } catch {}
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [userAccountId]);

  if (!state) return null;

  return (
    <div style={styles.strip}>
      <span style={styles.label}>LUC</span>
      {KEY_RESOURCES.map(({ key, label }) => {
        const used = state.usage[key] || 0;
        const limit = state.limits[key] || 0;
        const pct = limit > 0 ? (used / limit) * 100 : 0;
        const color = pct > 90 ? "#ef4444" : pct > 70 ? "#f59e0b" : "#22c55e";

        return (
          <div key={key} style={styles.item}>
            <span style={styles.itemLabel}>{label}</span>
            <div style={styles.miniBar}>
              <div style={{ ...styles.miniFill, width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
            </div>
            <span style={{ ...styles.pct, color }}>{Math.round(pct)}%</span>
          </div>
        );
      })}
      <span style={styles.plan}>{state.plan_id}</span>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  strip: {
    display: "flex",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#0f172a",
    padding: "8px 16px",
    borderRadius: 8,
    border: "1px solid #1e293b",
    flexWrap: "wrap",
  },
  label: { fontSize: 11, fontWeight: 700, color: "#3b82f6", letterSpacing: 1 },
  item: { display: "flex", alignItems: "center", gap: 6 },
  itemLabel: { fontSize: 10, color: "#64748b", minWidth: 50 },
  miniBar: { width: 40, height: 4, backgroundColor: "#1e293b", borderRadius: 2, overflow: "hidden" },
  miniFill: { height: "100%", borderRadius: 2 },
  pct: { fontSize: 10, fontWeight: 700, minWidth: 28 },
  plan: { fontSize: 10, color: "#475569", marginLeft: "auto" },
};
