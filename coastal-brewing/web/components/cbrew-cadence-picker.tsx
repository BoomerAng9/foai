"use client";

import { useEffect, useState } from "react";

/**
 * C|Brew 3-6-9 cadence picker — shared by every C|Brew tier checkout form.
 *
 * Owner-ratified canon (`cbrew-369-pricing-canon-2026-05-11.md`):
 *   monthly : full retail, no commitment
 *   3mo     : 15% off, "supporting us"
 *   6mo     : 20% off, "buying into the mission"
 *   9mo     : 25% off, pay 9 receive 12 — "full support"
 *
 * Default selection = 9mo (best value, biggest headline savings).
 */

export type CadenceId = "monthly" | "3mo" | "6mo" | "9mo";

export interface CadenceRow {
  cadence_id: CadenceId;
  label: string;
  framing: string;
  discount_pct: number;
  months_paid: number;
  months_delivered: number;
  total_charge: number;
  monthly_equivalent: number;
  yearly_savings_pct: number;
}

interface CadencePickerProps {
  /**
   * Tier identifier — passed to `/api/membership/{flow}/cadence-pricing`.
   * `flow` is "wood-stork" or "pooler-pass".
   */
  tier: string;
  flow: "wood-stork" | "pooler-pass" | "custee-card";
  /** Initial selection (defaults to "9mo" — the best deal). */
  defaultCadence?: CadenceId;
  /** Fired when user picks a cadence. Parent stores this for checkout submit. */
  onChange: (cadence: CadenceId) => void;
  /** Disable picker (e.g., during form submit). */
  disabled?: boolean;
}

const ORDER: CadenceId[] = ["monthly", "3mo", "6mo", "9mo"];

export function CbrewCadencePicker({
  tier,
  flow,
  defaultCadence = "9mo",
  onChange,
  disabled,
}: CadencePickerProps) {
  const [rows, setRows] = useState<CadenceRow[] | null>(null);
  const [selected, setSelected] = useState<CadenceId>(defaultCadence);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setError(null);
      try {
        // Custee Card is single-tier — its endpoint takes no `tier` query
        // param and is public (no token). Other flows append ?tier=.
        const url =
          flow === "custee-card"
            ? `/api/membership/custee-card/cadence-pricing`
            : `/api/membership/${flow}/cadence-pricing?tier=${encodeURIComponent(tier)}`;
        const res = await fetch(url, { cache: "no-store" });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !Array.isArray(data?.cadences)) {
          if (!cancelled) {
            setError(
              "Could not load cadence pricing. Defaulting to month-to-month — pricing will appear at checkout.",
            );
          }
          return;
        }
        if (!cancelled) setRows(data.cadences as CadenceRow[]);
      } catch {
        if (!cancelled) {
          setError(
            "Network hiccup loading cadence pricing. Pricing will appear at checkout.",
          );
        }
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [tier, flow]);

  function pick(c: CadenceId) {
    if (disabled) return;
    setSelected(c);
    onChange(c);
  }

  // Always emit the default on mount so parent has the value before user clicks.
  useEffect(() => {
    onChange(defaultCadence);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        Choose your cadence — 3-6-9 plan
      </label>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {ORDER.map((cid) => {
          const row = rows?.find((r) => r.cadence_id === cid);
          const isSelected = selected === cid;
          const isBestDeal = cid === "9mo";
          return (
            <button
              key={cid}
              type="button"
              disabled={disabled}
              onClick={() => pick(cid)}
              className={`relative rounded-md border px-4 py-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                isSelected
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background text-foreground/70 hover:border-foreground/40"
              }`}
            >
              {isBestDeal && (
                <span className="absolute -top-2 right-2 rounded-full bg-accent px-2 py-0.5 text-[9px] font-semibold uppercase tracking-widest text-accent-foreground">
                  Best deal
                </span>
              )}
              <span className="block font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                {cid === "monthly" ? "Month-to-month" : cid === "3mo" ? "3-month" : cid === "6mo" ? "6-month" : "9-month (pay 9, get 12)"}
              </span>
              <span className="mt-1 block font-display text-xl font-semibold tracking-[-0.01em]">
                {row ? `$${row.total_charge.toFixed(2)}` : "…"}
              </span>
              <span className="mt-0.5 block text-[11px] text-foreground/60">
                {row ? (
                  cid === "monthly"
                    ? "billed every month"
                    : cid === "9mo"
                      ? `12 months access · save ${row.yearly_savings_pct}%/yr`
                      : `${row.months_delivered}-month plan · save ${row.yearly_savings_pct}%/yr`
                ) : "…"}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="font-mono text-[10px] text-muted-foreground">{error}</p>
      )}
    </div>
  );
}
