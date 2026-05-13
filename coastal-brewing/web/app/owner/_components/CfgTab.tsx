"use client";
import * as React from "react";
import { ConfirmModal } from "./ConfirmModal";

type CfgData = {
  voice_config: { persona_voice_ids?: Record<string, string> } & Record<string, unknown>;
  email_templates: { magic_link?: { subject_signup?: string; subject_login?: string; body?: string } } & Record<string, unknown>;
};

export function CfgTab() {
  const [original, setOriginal] = React.useState<CfgData | null>(null);
  const [draft, setDraft] = React.useState<CfgData | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/v1/owner/cfg", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { setOriginal(data); setDraft(structuredClone(data)); })
      .catch((e) => setErr(String(e)));
  }, []);

  if (!draft || !original) return <p className="text-sm text-muted-foreground">Loading…</p>;

  const setVoiceId = (persona: string, v: string) => {
    setDraft({
      ...draft,
      voice_config: {
        ...draft.voice_config,
        persona_voice_ids: { ...(draft.voice_config.persona_voice_ids ?? {}), [persona]: v },
      },
    });
  };

  const setTemplateField = (field: "subject_signup" | "subject_login" | "body", v: string) => {
    setDraft({
      ...draft,
      email_templates: {
        ...draft.email_templates,
        magic_link: { ...(draft.email_templates.magic_link ?? {}), [field]: v },
      },
    });
  };

  const onSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/v1/owner/cfg", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          voice_config: draft.voice_config,
          email_templates: draft.email_templates,
          confirmation_phrase: "CONFIRM CFG CHANGE",
        }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.detail ?? `status ${r.status}`);
      }
      const data = await r.json();
      setOriginal(data);
      setDraft(structuredClone(data));
      setConfirmOpen(false);
    } catch (e) {
      setErr(String(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Voice persona IDs</h2>
        {Object.entries(draft.voice_config.persona_voice_ids ?? {}).map(([persona, voiceId]) => (
          <div key={persona} className="flex items-center gap-3 py-1">
            <label className="w-40 font-mono text-xs">{persona}</label>
            <input className="flex-1 border bg-background px-2 py-1 text-xs font-mono"
              value={voiceId}
              onChange={(e) => setVoiceId(persona, e.target.value)} />
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Magic-link email template</h2>
        <div className="space-y-2">
          <label className="block text-xs">Subject (signup)</label>
          <input className="w-full border bg-background px-2 py-1 text-sm"
            value={draft.email_templates.magic_link?.subject_signup ?? ""}
            onChange={(e) => setTemplateField("subject_signup", e.target.value)} />
          <label className="block text-xs">Subject (login)</label>
          <input className="w-full border bg-background px-2 py-1 text-sm"
            value={draft.email_templates.magic_link?.subject_login ?? ""}
            onChange={(e) => setTemplateField("subject_login", e.target.value)} />
          <label className="block text-xs">Body (placeholders: {"{magic_link}"}, {"{ttl_minutes}"})</label>
          <textarea rows={8} className="w-full border bg-background px-2 py-1 text-xs font-mono"
            value={draft.email_templates.magic_link?.body ?? ""}
            onChange={(e) => setTemplateField("body", e.target.value)} />
        </div>
      </section>

      {err && <p className="text-destructive text-xs">{err}</p>}

      <div className="flex gap-2">
        <button onClick={() => setConfirmOpen(true)}
          disabled={JSON.stringify(original) === JSON.stringify(draft) || saving}
          className="px-4 py-2 bg-foreground text-background disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={() => setDraft(structuredClone(original))} className="px-4 py-2 border">Reset</button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm cfg change"
        diff={<p className="text-xs">Voice + email config will be written to disk and hot-reloaded.</p>}
        requiredPhrase="CONFIRM CFG CHANGE"
        onConfirm={onSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
