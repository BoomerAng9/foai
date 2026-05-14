"use client";
import * as React from "react";
import { postByokKey, deleteByokKey } from "@/lib/companionApi";

export function ByokTab() {
  const [vendor, setVendor] = React.useState<"inworld" | "openai">("inworld");
  const [key, setKey] = React.useState("");
  const [state, setState] = React.useState<"idle" | "saving" | "saved" | "deleted" | "error">("idle");
  const [err, setErr] = React.useState<string | null>(null);

  async function onSave() {
    setState("saving"); setErr(null);
    try {
      await postByokKey(vendor, key);
      setState("saved");
      setKey("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  async function onDelete() {
    setState("saving"); setErr(null);
    try {
      await deleteByokKey(vendor);
      setState("deleted");
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
      setState("error");
    }
  }

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        Translation runs on your own model gateway key. Paste it once;
        it&apos;s encrypted at rest on our side and used to authenticate your
        translation sessions. Revoke at any time.
      </p>

      <div>
        <label className="block text-xs uppercase tracking-widest mb-1">Vendor</label>
        <select
          value={vendor}
          onChange={(e) => setVendor(e.target.value as "inworld" | "openai")}
          className="w-full border bg-background px-3 py-2 text-sm"
        >
          <option value="inworld">Model gateway (recommended)</option>
          <option value="openai">Direct (advanced)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs uppercase tracking-widest mb-1">API key</label>
        <input
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="paste your key"
          className="w-full border bg-background px-3 py-2 font-mono text-sm"
        />
      </div>

      <div className="flex gap-2">
        <button
          onClick={onSave}
          disabled={state === "saving" || key.length < 20}
          className="px-4 py-2 bg-foreground text-background disabled:opacity-50"
        >
          {state === "saving" ? "Saving…" : "Save key"}
        </button>
        <button onClick={onDelete} className="px-4 py-2 border">Revoke saved key</button>
      </div>

      {state === "saved" && <p className="text-accent text-sm">Saved.</p>}
      {state === "deleted" && <p className="text-accent text-sm">Revoked.</p>}
      {state === "error" && err && <p className="text-destructive text-sm">{err}</p>}
    </div>
  );
}
