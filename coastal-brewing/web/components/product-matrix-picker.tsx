"use client";

/**
 * ProductMatrixPicker — the AIMS-matrix multi-select for tier signup.
 *
 * Custees pick the combination of products they want to receive within
 * their tier membership: tea / coffee / functional coffee / combo /
 * bulk / multi-location, etc. Available options vary by tier (consumer
 * tiers see consumer products; Wood Stork tiers see B2B options).
 *
 * Pure UI — selection is captured as a string[] and passed up via
 * onChange. Backend endpoints store the array in Stripe Checkout
 * Session metadata so /stripe/webhook can fulfill the shipment with
 * the right combo.
 */
import { cn } from "@/lib/utils";

export interface MatrixOption {
  id: string;
  label: string;
  description?: string;
}

interface Props {
  options: MatrixOption[];
  value: string[];
  onChange: (next: string[]) => void;
  legend?: string;
  disabled?: boolean;
  minSelect?: number;
}

export function ProductMatrixPicker({
  options,
  value,
  onChange,
  legend = "Products — pick any combination",
  disabled = false,
  minSelect = 1,
}: Props) {
  function toggle(id: string) {
    const isOn = value.includes(id);
    if (isOn) {
      const next = value.filter((v) => v !== id);
      if (next.length < minSelect) return;
      onChange(next);
    } else {
      onChange([...value, id]);
    }
  }

  return (
    <fieldset
      className="flex flex-col gap-2"
      disabled={disabled}
      data-matrix-picker="products"
    >
      <legend className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
        {legend}
      </legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {options.map((opt) => {
          const selected = value.includes(opt.id);
          return (
            <label
              key={opt.id}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-md border px-3 py-2.5 text-sm transition-colors",
                selected
                  ? "border-accent bg-accent/10 text-foreground"
                  : "border-border bg-background text-foreground/70 hover:border-foreground/40",
                disabled && "cursor-not-allowed opacity-60",
              )}
              data-matrix-option={opt.id}
              data-matrix-selected={selected ? "true" : "false"}
            >
              <input
                type="checkbox"
                checked={selected}
                onChange={() => toggle(opt.id)}
                disabled={disabled}
                className="mt-1 h-3.5 w-3.5 accent-accent"
              />
              <span className="flex flex-col gap-0.5">
                <span className="font-medium leading-tight">{opt.label}</span>
                {opt.description && (
                  <span className="text-[12px] leading-snug text-foreground/60">
                    {opt.description}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

// ─── Per-tier product menus (owner canon — 2026-05-11) ─────────────────

export const POOLER_PASS_PRODUCTS: MatrixOption[] = [
  { id: "tea", label: "Tea", description: "Lowcountry Tea, one tin per cycle" },
  { id: "coffee", label: "Coffee", description: "One 12oz bag per cycle, roast rotates" },
  {
    id: "functional-coffee",
    label: "Functional Coffee",
    description: "Specialty Arabica + Lion's Mane / Cordyceps / Reishi",
  },
  { id: "combo", label: "Combo (coffee + tea)", description: "One bag + one tin per cycle" },
];

export const CUSTEE_CARD_PRODUCTS: MatrixOption[] = [
  { id: "tea", label: "Tea", description: "Lowcountry Tea, one tin per cycle" },
  { id: "coffee", label: "Coffee", description: "One 12oz bag per cycle, roast rotates" },
  {
    id: "functional-coffee",
    label: "Functional Coffee",
    description: "Specialty Arabica + Lion's Mane / Cordyceps / Reishi",
  },
  { id: "combo", label: "Combo (coffee + tea)", description: "One bag + one tin per cycle" },
  { id: "sampler", label: "Sampler", description: "Six 2oz drip bags rotated per cycle" },
];

export const WOOD_STORK_PRODUCTS: MatrixOption[] = [
  { id: "bulk-coffee", label: "Bulk Coffee", description: "Whole-bean cases for the office or shop" },
  { id: "bulk-tea", label: "Bulk Tea", description: "Lowcountry Tea by the case" },
  {
    id: "multi-location",
    label: "Multi-Location",
    description: "Ship to multiple addresses on one membership",
  },
  {
    id: "whitelabel",
    label: "Whitelabel (Reserve only)",
    description: "Co-branded packaging for your own brand",
  },
];
