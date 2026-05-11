"use client";

import { useState } from "react";

import { CbrewCadencePicker, type CadenceId } from "@/components/cbrew-cadence-picker";
import { ProductMatrixPicker, CUSTEE_CARD_PRODUCTS } from "@/components/product-matrix-picker";

interface CheckoutResponse {
  ok?: boolean;
  redirect_url?: string;
  error?: string;
}

export function MembershipCheckoutForm() {
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<CadenceId>("9mo");
  const [products, setProducts] = useState<string[]>(["coffee"]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (products.length === 0) {
      setError("Pick at least one product to include in your Custee Card.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/forms/membership/custee-card/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, cadence, products }),
      });
      const data: CheckoutResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect_url) {
        setError(
          data.error ||
            "We couldn't start checkout right now. Please email members@coastalbrewing.co and we'll set you up directly.",
        );
        setSubmitting(false);
        return;
      }
      window.location.assign(data.redirect_url);
    } catch {
      setError(
        "Network hiccup. Please email members@coastalbrewing.co and we'll set you up directly.",
      );
      setSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-6 flex flex-col gap-5"
      data-membership-checkout="custee-card"
    >
      {/* Step 1 — cadence */}
      <CbrewCadencePicker
        tier="custee-card"
        flow="custee-card"
        defaultCadence="9mo"
        onChange={setCadence}
        disabled={submitting}
      />

      {/* Step 2 — product matrix */}
      <ProductMatrixPicker
        options={CUSTEE_CARD_PRODUCTS}
        value={products}
        onChange={setProducts}
        legend="Step 2 — what you want in your Custee Card (pick any combination)"
        disabled={submitting}
      />

      {/* Step 3 — email + submit */}
      <div className="flex flex-col gap-3">
        <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
          Step 3 — your email
        </label>
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
            {submitting ? "Starting checkout…" : "Get Custee Card"}
          </button>
        </div>
      </div>

      {error && (
        <p className="font-mono text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Charged at the cadence you choose · cancel anytime within 7 days for a full refund
        (pre-shipment)
      </p>
    </form>
  );
}
