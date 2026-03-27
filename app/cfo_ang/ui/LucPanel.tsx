/**
 * LucPanel — Display-only LUC account dashboard.
 * All math stays in luc_engine.py. This only renders state from GET /api/luc/state.
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

const LABELS: Record<string, string> = {
  llm_tokens_in: "LLM Input Tokens",
  llm_tokens_out: "LLM Output Tokens",
  n8n_executions: "n8n Executions",
  node_runtime_seconds: "Node Runtime (sec)",
  swarm_cycles: "Swarm Cycles",
  brave_queries: "Brave Queries",
  voice_chars: "Voice Characters",
  stt_minutes: "STT Minutes",
  container_hours: "Container Hours",
  storage_gb_month: "Storage (GB/mo)",
  bandwidth_gb: "Bandwidth (GB)",
};

export default function LucPanel({ userAccountId }: { userAccountId: string }) {
  const [state, setState] = useState<AccountState | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const resp = await fetch(`/api/luc/state/${userAccountId}`);
        if (!resp.ok) throw new Error(await resp.text());
        setState(await resp.json());
      } catch (e: any) {
        setError(e.message);
      }
    };
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [userAccountId]);

  if (error) return <div style={styles.error}>LUC Error: {error}</div>;
  if (!state) return <div style={styles.loading}>Loading LUC state...</div>;

  return (
    <div style={styles.panel}>
      <div style={styles.header}>
        <h2 style={styles.title}>LUC Dashboard</h2>
        <span style={styles.plan}>Plan: {state.plan_id}</span>
        <span style={styles.updated}>
          Updated: {new Date(state.last_updated).toLocaleTimeString()}
        </span>
      </div>
      <div style={styles.grid}>
        {Object.keys(LABELS).map((key) => {
          const used = state.usage[key] || 0;
          const limit = state.limits[key] || 0;
          const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
          const over = state.overage[key] || 0;

          return (
            <div key={key} style={styles.meter}>
              <div style={styles.meterLabel}>{LABELS[key]}</div>
              <div style={styles.barBg}>
                <div
                  style={{
                    ...styles.barFill,
                    width: `${pct}%`,
                    backgroundColor: over > 0 ? "#ef4444" : pct > 80 ? "#f59e0b" : "#22c55e",
                  }}
                />
              </div>
              <div style={styles.meterStats}>
                {used.toLocaleString()} / {limit.toLocaleString()}
                {over > 0 && <span style={styles.overage}> +{over.toLocaleString()} over</span>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  panel: { backgroundColor: "#111827", borderRadius: 12, padding: 24, border: "1px solid #1e293b" },
  header: { display: "flex", alignItems: "center", gap: 16, marginBottom: 20, flexWrap: "wrap" },
  title: { fontSize: 20, fontWeight: 700, color: "#f1f5f9", margin: 0 },
  plan: { fontSize: 13, color: "#3b82f6", backgroundColor: "#1e3a5f", padding: "2px 10px", borderRadius: 8 },
  updated: { fontSize: 11, color: "#64748b", marginLeft: "auto" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 },
  meter: { padding: 12, backgroundColor: "#0f172a", borderRadius: 8 },
  meterLabel: { fontSize: 12, color: "#94a3b8", marginBottom: 6, fontWeight: 600 },
  barBg: { height: 8, backgroundColor: "#1e293b", borderRadius: 4, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 4, transition: "width 0.5s ease" },
  meterStats: { fontSize: 11, color: "#64748b", marginTop: 4 },
  overage: { color: "#ef4444", fontWeight: 700 },
  error: { color: "#ef4444", padding: 20 },
  loading: { color: "#64748b", padding: 20 },
};
