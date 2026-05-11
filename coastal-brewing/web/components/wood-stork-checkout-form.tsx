"use client";

import { useState } from "react";

import { CbrewCadencePicker, type CadenceId } from "@/components/cbrew-cadence-picker";

interface CheckoutResponse {
  ok?: boolean;
  redirect_url?: string;
  error?: string;
}

type WoodStorkTier = "standard" | "reserve";

const TIERS: Record<WoodStorkTier, { label: string }> = {
  standard: { label: "Wood Stork Standard" },
  reserve: { label: "Wood Stork Reserve" },
};

export function WoodStorkCheckoutForm() {
  const [email, setEmail] = useState("");
  const [businessName, setBusinessName] = useState("");
  const [tier, setTier] = useState<WoodStorkTier>("standard");
  const [cadence, setCadence] = useState<CadenceId>("9mo");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/membership/wood-stork/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, business_name: businessName, tier, cadence }),
      });
      const data: CheckoutResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect_url) {
        setError(
          data.error ||
            "We couldn't start checkout right now. Please email wholesale@coastalbrewing.co and we'll set you up directly.",
        );
        setSubmitting(false);
        return;
      }
      window.location.assign(data.redirect_url);
    } catch {
      setError(
        "Network hiccup. Please email wholesale@coastalbrewing.co and we'll set you up directly.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
      {/* Tier picker */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Tier
        </label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(Object.keys(TIERS) as WoodStorkTier[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTier(t)}
              disabled={submitting}
              className={`rounded-md border px-4 py-3 text-left text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                tier === t
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background text-foreground/70 hover:border-foreground/40"
              }`}
            >
              <span className="block font-medium">{TIERS[t].label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Cadence picker — keyed on tier so it refetches when tier changes */}
      <CbrewCadencePicker
        key={tier}
        tier={tier}
        flow="wood-stork"
        defaultCadence="9mo"
        onChange={setCadence}
        disabled={submitting}
      />

      {/* Business name + email + submit */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="text"
          name="business_name"
          required
          autoComplete="organization"
          placeholder="Business name"
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          disabled={submitting}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-60"
        />
      </div>

      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          name="email"
          required
          autoComplete="email"
          placeholder="you@your-business.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={submitting}
          className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={submitting || !email || !businessName}
          className="rounded-md bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Starting checkout…" : "Become a Wood Stork"}
        </button>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Charged at the cadence you choose · referral discount auto-applies on next product order
      </p>
    </form>
  );
}
