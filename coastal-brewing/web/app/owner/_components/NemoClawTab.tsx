"use client";
import * as React from "react";

type PendingTask = { task_id: string; status: string; risk_tags?: string; reason?: string; created_at?: string; payload?: unknown };

export function NemoClawTab() {
  const [tasks, setTasks] = React.useState<PendingTask[]>([]);
  const [err, setErr] = React.useState<string | null>(null);

  const fetchQueue = React.useCallback(async () => {
    try {
      const r = await fetch("/api/v1/owner/nemoclaw/queue", { credentials: "include" });
      if (!r.ok) throw new Error(`status ${r.status}`);
      const data = await r.json();
      setTasks(data.pending ?? []);
      setErr(null);
    } catch (e) {
      setErr(String(e));
    }
  }, []);

  React.useEffect(() => { fetchQueue(); const id = setInterval(fetchQueue, 5000); return () => clearInterval(id); }, [fetchQueue]);

  const decide = async (task_id: string, action: "approve" | "reject") => {
    try {
      const r = await fetch(`/api/v1/owner/nemoclaw/${task_id}/${action}`, {
        method: "POST",
        credentials: "include",
      });
      if (!r.ok) throw new Error(`status ${r.status}`);
      await fetchQueue();
    } catch (e) {
      setErr(String(e));
    }
  };

  return (
    <div className="space-y-3">
      {err && <p className="text-destructive text-xs">{err}</p>}
      {tasks.length === 0 && <p className="text-sm text-muted-foreground">No pending approvals.</p>}
      {tasks.map((t) => (
        <div key={t.task_id} className="border border-border p-3 flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-mono text-xs">{t.task_id}</p>
            <p className="text-xs text-muted-foreground mt-1">risk_tags: {t.risk_tags || "—"}</p>
            <p className="text-sm mt-1">{t.reason || "(no reason)"}</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => decide(t.task_id, "approve")} className="px-3 py-1 bg-foreground text-background text-xs">Approve</button>
            <button onClick={() => decide(t.task_id, "reject")} className="px-3 py-1 border text-xs">Reject</button>
          </div>
        </div>
      ))}
    </div>
  );
}
