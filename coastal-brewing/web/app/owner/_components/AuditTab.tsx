"use client";
import * as React from "react";

const TABLES = ["", "task_packets", "action_receipts", "risk_events", "used_tokens", "owner_passkeys", "approval_decisions"];

type Row = { event_type?: string; ts?: number; created_at?: string; source_id?: string; payload?: unknown };

export function AuditTab() {
  const [table, setTable] = React.useState("");
  const [page, setPage] = React.useState(1);
  const [rows, setRows] = React.useState<Row[]>([]);
  const [total, setTotal] = React.useState(0);
  const [drawer, setDrawer] = React.useState<Row | null>(null);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    const q = new URLSearchParams({ table, page: String(page), per_page: "50" });
    if (!table) q.delete("table");
    fetch(`/api/v1/owner/audit?${q.toString()}`, { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { setRows(data.rows ?? []); setTotal(data.total ?? 0); setErr(null); })
      .catch((e) => setErr(String(e)));
  }, [table, page]);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <select value={table} onChange={(e) => { setTable(e.target.value); setPage(1); }} className="border bg-background px-2 py-1 text-sm">
          {TABLES.map((t) => <option key={t} value={t}>{t || "All tables"}</option>)}
        </select>
        <span className="text-xs text-muted-foreground">{total} rows total · page {page}</span>
        <div className="ml-auto flex gap-1">
          <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className="px-2 py-1 border text-xs disabled:opacity-50">← prev</button>
          <button onClick={() => setPage(page + 1)} disabled={page * 50 >= total} className="px-2 py-1 border text-xs disabled:opacity-50">next →</button>
        </div>
      </div>
      {err && <p className="text-destructive text-xs">{err}</p>}
      <table className="w-full text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <tr><th className="text-left py-2">When</th><th className="text-left py-2">Type</th><th className="text-left py-2">Source</th><th className="text-left py-2">Snippet</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} onClick={() => setDrawer(r)} className="border-b border-border/30 cursor-pointer hover:bg-muted/30">
              <td className="py-1 font-mono text-xs">{r.created_at || (r.ts ? new Date(Number(r.ts) * 1000).toISOString() : "—")}</td>
              <td className="py-1 font-mono text-xs">{r.event_type || "—"}</td>
              <td className="py-1 font-mono text-xs">{r.source_id || "—"}</td>
              <td className="py-1 text-xs text-muted-foreground truncate max-w-md">{typeof r.payload === "string" ? r.payload : JSON.stringify(r.payload)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {drawer && (
        <div className="fixed inset-0 z-40 flex items-end bg-black/40" onClick={() => setDrawer(null)}>
          <div className="bg-card border border-border p-4 w-full max-h-[60vh] overflow-auto" onClick={(e) => e.stopPropagation()}>
            <pre className="text-xs whitespace-pre-wrap break-all">{JSON.stringify(drawer, null, 2)}</pre>
            <button onClick={() => setDrawer(null)} className="mt-3 px-3 py-1 border text-xs">Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
