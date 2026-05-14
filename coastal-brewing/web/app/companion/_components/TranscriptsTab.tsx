"use client";
import * as React from "react";
import { listSessions, postNotes, type SessionListRow } from "@/lib/companionApi";

export function TranscriptsTab() {
  const [rows, setRows] = React.useState<SessionListRow[]>([]);
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    try {
      const data = await listSessions(50);
      setRows(data.sessions);
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    }
  }, []);

  React.useEffect(() => { refresh(); }, [refresh]);

  async function generateNotes(sessionId: string) {
    setBusy(sessionId); setErr(null);
    try {
      const r = await postNotes(sessionId, "(transcript content for this session)", `Session ${sessionId}`);
      alert(`Notes saved to your workspace: doc ${r.taskade_doc_id}`);
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3 max-w-3xl">
      {err && <p className="text-destructive text-sm">{err}</p>}
      {rows.length === 0 && <p className="text-sm text-muted-foreground">No sessions yet.</p>}
      <table className="w-full text-sm">
        <thead className="border-b border-border text-xs uppercase tracking-widest text-muted-foreground">
          <tr>
            <th className="text-left py-2">Started</th>
            <th className="text-left py-2">Languages</th>
            <th className="text-right py-2">Minutes</th>
            <th className="text-left py-2">Tier</th>
            <th className="text-right py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.session_id} className="border-b border-border/30">
              <td className="py-1 font-mono text-xs">
                {new Date(r.started_at * 1000).toISOString().replace("T", " ").split(".")[0]}
              </td>
              <td className="py-1 font-mono text-xs">{r.source_lang} → {r.target_lang}</td>
              <td className="py-1 text-right font-mono text-xs">{r.minutes_used.toFixed(1)}</td>
              <td className="py-1 font-mono text-xs">{r.tier_at_start}</td>
              <td className="py-1 text-right">
                <button
                  onClick={() => generateNotes(r.session_id)}
                  disabled={busy === r.session_id || r.tier_at_start === "free"}
                  className="text-xs px-2 py-1 border disabled:opacity-50"
                  title={r.tier_at_start === "free" ? "Paid tier required" : "Save notes to workspace"}
                >
                  {busy === r.session_id ? "Saving…" : "Save notes"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
