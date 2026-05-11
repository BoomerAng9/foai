"use client";

import { useState } from "react";

import { CbrewCadencePicker, type CadenceId } from "@/components/cbrew-cadence-picker";
import { ProductMatrixPicker, POOLER_PASS_PRODUCTS } from "@/components/product-matrix-picker";

interface EligibilityResponse {
  ok?: boolean;
  eligible?: boolean;
  band?: "local" | "extended" | "out_of_radius";
  distance_miles?: number;
  upsell_to?: "coastal_custee_card";
  message?: string;
  error?: string;
}

interface CheckoutResponse {
  ok?: boolean;
  redirect_url?: string;
  error?: string;
}

type PoolerTier = "standard" | "plus";

const TIERS: Record<PoolerTier, { label: string }> = {
  standard: { label: "Pooler Pass Standard" },
  plus: { label: "Pooler Pass Plus" },
};

const ZIP_REGEX = /^\d{5}$/;

export function PoolerPassCheckoutForm() {
  const [zip, setZip] = useState("");
  const [email, setEmail] = useState("");
  const [tier, setTier] = useState<PoolerTier>("standard");
  const [cadence, setCadence] = useState<CadenceId>("9mo");
  const [products, setProducts] = useState<string[]>(["coffee"]);
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function checkEligibility() {
    setError(null);
    setEligibility(null);
    if (!ZIP_REGEX.test(zip)) {
      setError("Please enter a valid 5-digit ZIP code.");
      return;
    }
    setChecking(true);
    try {
      const res = await fetch("/api/membership/pooler-pass/eligibility", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ zip }),
      });
      const data: EligibilityResponse = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "ZIP check failed. Please try again.");
        setChecking(false);
        return;
      }
      setEligibility(data);
    } catch {
      setError("Network hiccup. Please try again.");
    } finally {
      setChecking(false);
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (!eligibility?.eligible) {
      setError("Please check ZIP eligibility before continuing.");
      return;
    }
    if (products.length === 0) {
      setError("Pick at least one product to include in your Pooler Pass.");
      return;
    }
    setSubmitting(true);
    try {
      // /forms/* path bypasses nginx /api/* prefix-rule so the Next.js
      // proxy actually runs and injects the gateway token.
      const res = await fetch("/forms/membership/pooler-pass/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, zip, tier, cadence, products }),
      });
      const data: CheckoutResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect_url) {
        setError(
          data.error ||
            "We couldn't start checkout right now. Please email locals@coastalbrewing.co and we'll set you up directly.",
        );
        setSubmitting(false);
        return;
      }
      window.location.assign(data.redirect_url);
    } catch {
      setError(
        "Network hiccup. Please email locals@coastalbrewing.co and we'll set you up directly.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5" data-tier-checkout="pooler-pass">
      {/* ZIP gate */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Step 1 — ZIP gate (50–100 mi from Pooler 31322)
        </label>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="text"
            name="zip"
            inputMode="numeric"
            pattern="\d{5}"
            maxLength={5}
            required
            placeholder="ZIP code"
            value={zip}
            onChange={(e) => {
              setZip(e.target.value.replace(/\D/g, "").slice(0, 5));
              setEligibility(null);
            }}
            disabled={checking || submitting}
            className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-60"
          />
          <button
            type="button"
            onClick={checkEligibility}
            disabled={checking || submitting || !zip}
            className="rounded-md border border-border bg-background px-6 py-3 font-mono text-xs uppercase tracking-widest text-foreground transition-colors hover:border-foreground/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {checking ? "Checking…" : "Check eligibility"}
          </button>
        </div>
      </div>

      {/* Eligibility result */}
      {eligibility && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            eligibility.eligible
              ? "border-accent/40 bg-accent/[0.06] text-foreground"
              : "border-border bg-muted/20 text-foreground/80"
          }`}
        >
          <p>{eligibility.message}</p>
          {!eligibility.eligible && eligibility.upsell_to === "coastal_custee_card" && (
            <a
              href="/membership"
              className="mt-2 inline-block font-mono text-[11px] uppercase tracking-widest text-accent underline-offset-4 hover:underline"
            >
              See Coastal Custee Card →
            </a>
          )}
        </div>
      )}

      {/* Tier picker — gated on eligibility */}
      {eligibility?.eligible && (
        <>
          <div className="flex flex-col gap-3">
            <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
              Step 2 — Tier
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {(Object.keys(TIERS) as PoolerTier[]).map((t) => (
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

          {/* Step 3 — cadence picker */}
          <CbrewCadencePicker
            key={tier}
            tier={tier}
            flow="pooler-pass"
            defaultCadence="9mo"
            onChange={setCadence}
            disabled={submitting}
          />

          {/* Step 4 — product matrix */}
          <ProductMatrixPicker
            options={POOLER_PASS_PRODUCTS}
            value={products}
            onChange={setProducts}
            legend="Step 4 — what you want in your Pooler Pass (pick any combination)"
            disabled={submitting}
          />

          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              name="email"
              required
              autoComplete="email"
              placeholder="you@your-coast.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              className="flex-1 rounded-md border border-border bg-background px-4 py-3 text-base text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-60"
            />
            <button
              type="submit"
              disabled={submitting || !email || products.length === 0}
              className="rounded-md bg-accent px-6 py-3 font-mono text-xs uppercase tracking-widest text-accent-foreground transition-colors hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? "Starting checkout…" : "Get Pooler Pass"}
            </button>
          </div>
        </>
      )}

      {error && (
        <p className="font-mono text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Charged at the cadence you choose · ZIP re-verified at each renewal
      </p>
    </form>
  );
}
