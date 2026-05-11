"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Cadence = "monthly" | "3mo" | "6mo" | "9mo";

// Cadence display matches scripts/cadence.py canon (3-6-9, owner-ratified 2026-05-11).
const CADENCES: { id: Cadence; label: string; discountPct: number; note: string }[] = [
  { id: "monthly", label: "Month-to-month", discountPct: 0, note: "Standard. No commitment." },
  { id: "3mo", label: "3-month plan", discountPct: 15, note: "Save 15%." },
  { id: "6mo", label: "6-month plan", discountPct: 20, note: "Save 20%." },
  { id: "9mo", label: "9-month plan", discountPct: 25, note: "Save 25%. Pay 9, get 12." },
];

interface Props {
  sku: string;
  ctaLabel: string;
  monthlyRetailCents: number;
  variant?: "accent" | "ghost";
}

interface SubscribeResponse {
  ok?: boolean;
  redirect_url?: string;
  intent_id?: string;
  total_cents?: number;
  error?: string;
}

function cadenceTotal(monthlyCents: number, cadenceId: Cadence): number {
  const c = CADENCES.find((x) => x.id === cadenceId)!;
  const months = cadenceId === "monthly" ? 1 : Number(cadenceId.replace("mo", ""));
  return Math.round(months * monthlyCents * (1 - c.discountPct / 100));
}

export function SubscriptionCheckoutButton({ sku, ctaLabel, monthlyRetailCents, variant = "ghost" }: Props) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [cadence, setCadence] = useState<Cadence>("monthly");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceInitiationCents = 654;
  const subTotal = cadenceTotal(monthlyRetailCents, cadence);
  const grandTotal = subTotal + serviceInitiationCents;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/membership/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, sku, cadence }),
      });
      const data: SubscribeResponse = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect_url) {
        setError(
          data.error ||
            "We couldn't start checkout. Email members@coastalbrewing.co and we'll set you up directly.",
        );
        setSubmitting(false);
        return;
      }
      window.location.assign(data.redirect_url);
    } catch {
      setError("Network hiccup. Email members@coastalbrewing.co and we'll set you up directly.");
      setSubmitting(false);
    }
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant={variant}
        size="lg"
        className="w-full font-mono text-[11px] uppercase tracking-widest"
        onClick={() => setOpen(true)}
        data-pricing-cta={`subscription-${sku}`}
      >
        {ctaLabel}
        <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
      </Button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-3">
      <input
        type="email"
        name="email"
        required
        autoComplete="email"
        placeholder="you@your-coast.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        disabled={submitting}
        className="rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:border-accent focus:outline-none disabled:opacity-60"
      />

      <fieldset className="flex flex-col gap-1.5" disabled={submitting}>
        <legend className="font-mono text-[9px] uppercase tracking-[0.2em] text-muted-foreground">
          Cadence
        </legend>
        {CADENCES.map((c) => {
          const total = cadenceTotal(monthlyRetailCents, c.id);
          const selected = cadence === c.id;
          return (
            <label
              key={c.id}
              className={cn(
                "flex cursor-pointer items-center justify-between gap-2 rounded border border-border/60 px-3 py-1.5 text-xs transition-colors",
                selected ? "border-accent bg-accent/10" : "hover:border-border",
              )}
            >
              <span className="flex items-center gap-2">
                <input
                  type="radio"
                  name="cadence"
                  value={c.id}
                  checked={selected}
                  onChange={() => setCadence(c.id)}
                  className="h-3 w-3 accent-accent"
                />
                <span className="text-foreground/90">{c.label}</span>
              </span>
              <span className="font-mono text-[10px] text-foreground/70">
                ${(total / 100).toFixed(2)}
              </span>
            </label>
          );
        })}
      </fieldset>

      <div className="rounded border border-border/40 bg-card/40 p-2 text-[11px] leading-snug">
        <div className="flex justify-between">
          <span className="text-foreground/70">Subscription</span>
          <span className="font-mono">${(subTotal / 100).toFixed(2)}</span>
        </div>
        <div className="flex justify-between text-foreground/60">
          <span>Service initiation (one-time)</span>
          <span className="font-mono">$6.54</span>
        </div>
        <div className="mt-1 flex justify-between border-t border-border/30 pt-1 font-semibold">
          <span>Today</span>
          <span className="font-mono">${(grandTotal / 100).toFixed(2)}</span>
        </div>
      </div>

      <Button
        type="submit"
        variant={variant}
        size="lg"
        disabled={submitting || !email}
        className="w-full font-mono text-[11px] uppercase tracking-widest"
      >
        {submitting ? "Starting checkout…" : `Continue · $${(grandTotal / 100).toFixed(2)}`}
      </Button>

      {error && (
        <p className="font-mono text-[10px] text-destructive" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => setOpen(false)}
        disabled={submitting}
        className="text-center font-mono text-[9px] uppercase tracking-widest text-muted-foreground hover:text-foreground disabled:opacity-50"
      >
        Cancel
      </button>
    </form>
  );
}
