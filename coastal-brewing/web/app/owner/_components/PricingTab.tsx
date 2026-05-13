"use client";
import * as React from "react";
import { ConfirmModal } from "./ConfirmModal";

type PricingConfig = {
  cadences: Record<string, { discount: number; label?: string }>;
  tier_monthly_retail: Record<string, number>;
  tier_envelope_max_cents: Record<string, number>;
};

const TIERS = ["pooler-pass-standard", "pooler-pass-plus", "custee-card", "wood-stork-standard", "wood-stork-reserve"];
const CADENCES = ["monthly", "3mo", "6mo", "9mo"];

export function PricingTab() {
  const [original, setOriginal] = React.useState<PricingConfig | null>(null);
  const [draft, setDraft] = React.useState<PricingConfig | null>(null);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [err, setErr] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/v1/owner/pricing", { credentials: "include" })
      .then((r) => r.ok ? r.json() : Promise.reject(r.status))
      .then((data) => { setOriginal(data); setDraft(structuredClone(data)); })
      .catch((e) => setErr(String(e)));
  }, []);

  if (!draft || !original) return <div className="text-sm text-muted-foreground">Loading…</div>;

  const setTierRetail = (tier: string, v: number) => {
    setDraft({ ...draft, tier_monthly_retail: { ...draft.tier_monthly_retail, [tier]: v } });
  };
  const setEnvelope = (tier: string, v: number) => {
    setDraft({ ...draft, tier_envelope_max_cents: { ...draft.tier_envelope_max_cents, [tier]: v } });
  };
  const setCadenceDiscount = (cid: string, v: number) => {
    setDraft({
      ...draft,
      cadences: {
        ...draft.cadences,
        [cid]: { ...(draft.cadences[cid] ?? {}), discount: v },
      },
    });
  };

  const onReset = () => setDraft(structuredClone(original));

  const onSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const r = await fetch("/api/v1/owner/pricing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          tier_monthly_retail: draft.tier_monthly_retail,
          tier_envelope_max_cents: draft.tier_envelope_max_cents,
          cadence_discounts: Object.fromEntries(
            Object.entries(draft.cadences).map(([k, v]) => [k, v.discount]),
          ),
          confirmation_phrase: "CONFIRM PRICING CHANGE",
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

  const diff = (
    <ul className="font-mono text-xs space-y-1">
      {TIERS.map((tier) => {
        const o = original.tier_monthly_retail[tier];
        const d = draft.tier_monthly_retail[tier];
        if (o !== d) return <li key={tier}>{tier}: ${o?.toFixed(2)} → ${d?.toFixed(2)}/mo</li>;
        return null;
      })}
      {CADENCES.map((cid) => {
        const o = original.cadences[cid]?.discount;
        const d = draft.cadences[cid]?.discount;
        if (o !== d) return <li key={cid}>{cid} discount: {(o * 100).toFixed(0)}% → {(d * 100).toFixed(0)}%</li>;
        return null;
      })}
      {TIERS.map((tier) => {
        const o = original.tier_envelope_max_cents[tier];
        const d = draft.tier_envelope_max_cents[tier];
        if (o !== d) return <li key={tier}>{tier} envelope cap: ${(o / 100).toFixed(2)} → ${(d / 100).toFixed(2)}</li>;
        return null;
      })}
    </ul>
  );

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Tier monthly retail</h2>
        {TIERS.map((tier) => (
          <div key={tier} className="flex items-center gap-4 py-1">
            <label className="w-56 font-mono text-xs">{tier}</label>
            <input type="range" min={0.5} max={300} step={0.01}
              value={draft.tier_monthly_retail[tier] ?? 0}
              onChange={(e) => setTierRetail(tier, Number(e.target.value))}
              className="flex-1" />
            <span className="w-24 text-right font-mono text-sm">${(draft.tier_monthly_retail[tier] ?? 0).toFixed(2)}/mo</span>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Cadence discounts</h2>
        {CADENCES.map((cid) => (
          <div key={cid} className="flex items-center gap-4 py-1">
            <label className="w-56 font-mono text-xs">{cid}</label>
            <input type="range" min={0} max={0.40} step={0.01}
              value={draft.cadences[cid]?.discount ?? 0}
              onChange={(e) => setCadenceDiscount(cid, Number(e.target.value))}
              className="flex-1" />
            <span className="w-24 text-right font-mono text-sm">{((draft.cadences[cid]?.discount ?? 0) * 100).toFixed(0)}%</span>
          </div>
        ))}
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Envelope caps</h2>
        {TIERS.map((tier) => (
          <div key={tier} className="flex items-center gap-4 py-1">
            <label className="w-56 font-mono text-xs">{tier}</label>
            <input type="range" min={100} max={50000} step={100}
              value={draft.tier_envelope_max_cents[tier] ?? 0}
              onChange={(e) => setEnvelope(tier, Number(e.target.value))}
              className="flex-1" />
            <span className="w-24 text-right font-mono text-sm">${((draft.tier_envelope_max_cents[tier] ?? 0) / 100).toFixed(2)}</span>
          </div>
        ))}
      </section>

      {err && <p className="text-destructive text-xs font-mono">{err}</p>}

      <div className="flex gap-2">
        <button onClick={() => setConfirmOpen(true)}
          disabled={JSON.stringify(original) === JSON.stringify(draft) || saving}
          className="px-4 py-2 bg-foreground text-background disabled:opacity-50">
          {saving ? "Saving…" : "Save"}
        </button>
        <button onClick={onReset}
          className="px-4 py-2 border">Reset to canon</button>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title="Confirm pricing change"
        diff={diff}
        requiredPhrase="CONFIRM PRICING CHANGE"
        onConfirm={onSave}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
