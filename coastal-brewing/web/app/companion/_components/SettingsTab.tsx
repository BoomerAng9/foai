"use client";
import * as React from "react";
import { getWorkspaceMe, startBillingCheckout, openBillingPortal, type WorkspaceMe } from "@/lib/companionApi";

export function SettingsTab() {
  const [me, setMe] = React.useState<WorkspaceMe | null>(null);
  const [email, setEmail] = React.useState("");
  const [err, setErr] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => { getWorkspaceMe().then(setMe).catch((e) => setErr(String(e))); }, []);

  async function onUpgrade() {
    if (!email.trim()) { setErr("email required"); return; }
    setBusy(true); setErr(null);
    try {
      const r = await startBillingCheckout(email.trim());
      window.location.href = r.redirect_url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  async function onPortal() {
    setBusy(true); setErr(null);
    try {
      const r = await openBillingPortal();
      window.location.href = r.url;
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  if (!me) return <p className="text-sm text-muted-foreground">Loading…</p>;

  return (
    <div className="space-y-6 max-w-md">
      <div>
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Current tier</p>
        <p className="text-lg font-semibold">{me.is_paid_tier ? "Paid (Notes activated)" : "Free (translation only)"}</p>
      </div>

      {!me.is_paid_tier ? (
        <div className="space-y-3 border border-border p-4">
          <p className="text-sm">
            Upgrade to unlock meeting notes, summaries, and your private workspace as
            a permanent second brain.
          </p>
          <input
            type="email" autoComplete="email"
            value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="email for receipt"
            className="w-full border bg-background px-3 py-2 text-sm"
          />
          <button onClick={onUpgrade} disabled={busy} className="w-full px-4 py-2 bg-foreground text-background disabled:opacity-50">
            {busy ? "Loading…" : "Upgrade →"}
          </button>
        </div>
      ) : (
        <button onClick={onPortal} disabled={busy} className="px-4 py-2 border">
          Manage billing →
        </button>
      )}

      {err && <p className="text-destructive text-sm">{err}</p>}
    </div>
  );
}
