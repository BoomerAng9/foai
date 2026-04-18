/**
 * PerformSportsPricingSelector — Per|Form sports pricing.
 *
 * Canonical BMAC / Lite / Medium / Heavy / Superior (Grok-4) tiers per
 * master-canon-pricing.md. Never conflate with A.I.M.S. core 3-6-9
 * Vortex (that's TeslaVortexPricingPicker #15 — separate product line).
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * 5 cards in a horizontal row with progressive visual weight — entry
 * tiers are compact, Heavy + Superior get more real estate. No "Most
 * Popular" badge on any tier. Superior carries the explicit
 * "Grok-4 · latest-resolved" note — the ONLY place the canon permits
 * a vendor/model name to appear in customer copy (per
 * master-canon-pricing.md "Superior (Grok-4)" + vendor-neutral UI
 * exception).
 *
 * Conventional (5 same-size cards with "Most Popular" badge on
 *   Medium/Heavy + Monthly/Annual toggle + "Start Free Trial" CTA)
 *   — REJECTED as generic SaaS pricing page.
 * Experimental (vertical timeline of tiers with ascending visual
 *   weight) — REJECTED because sports-pricing pages expect a
 *   horizontal row for cross-tier comparison.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - "Most Popular" / "Recommended" / "Best Value" badge
 *   - Monthly / Annual toggle pill
 *   - Gradient card backgrounds
 *   - Check/cross feature-matrix beneath cards
 *   - Tooltip (?) circles on feature rows
 *   - "Start Free Trial" / "Get Started" primary CTA on every card
 *
 * Uses @aims/brand-tokens classes throughout.
 */

import * as React from 'react';

// ── Canonical tiers (from docs/canon/master-canon-pricing.md) ─────

export const PERFORM_SPORTS_TIERS = [
  {
    id: 'bmac',
    label: 'BMAC',
    longLabel: 'Buy Me a Coffee',
    monthlyFee: 7.0,
    tokenPool: 25_000,
    overagePer1k: 0.06,
    weight: 1,
    bestFor: 'Hobbyist exploring a single plug · basic lookup.',
    vendorNote: null as string | null,
  },
  {
    id: 'lite',
    label: 'Lite',
    longLabel: 'Lite',
    monthlyFee: 19.99,
    tokenPool: 200_000,
    overagePer1k: 0.06,
    weight: 1,
    bestFor: 'Startup prototypes & daily reports · basic player grading.',
    vendorNote: null,
  },
  {
    id: 'medium',
    label: 'Medium',
    longLabel: 'Medium',
    monthlyFee: 79.99,
    tokenPool: 600_000,
    overagePer1k: 0.06,
    weight: 2,
    bestFor: 'Agencies managing several client plugs · 1 autonomous job.',
    vendorNote: null,
  },
  {
    id: 'heavy',
    label: 'Heavy',
    longLabel: 'Heavy',
    monthlyFee: 149.99,
    tokenPool: 1_500_000,
    overagePer1k: 0.06,
    weight: 3,
    bestFor: 'Enterprises automating full workflows · 5 autonomous jobs · swarm delegation.',
    vendorNote: null,
  },
  {
    id: 'superior',
    label: 'Superior',
    longLabel: 'Superior (Grok-4)',
    monthlyFee: 149.99,
    upkeepFee: 150.0,
    tokenPool: 1_500_000,
    overagePer1k: 0.04,
    weight: 3,
    bestFor: 'R&D teams · digital-twin orgs · unlimited sports automation · NIL tracking.',
    vendorNote: 'Grok-4 · always resolves to the latest-supported model at runtime.',
  },
] as const;

export type PerformTier = (typeof PERFORM_SPORTS_TIERS)[number]['id'];

export interface PerformSportsPricingSelectorProps {
  initialTier?: PerformTier;
  onSelect?: (tier: PerformTier) => void;
  /** Hide the explicit Grok-4 vendor note on Superior (internal previews only). Defaults to show. */
  hideVendorNote?: boolean;
  title?: string;
}

// ── Helpers ────────────────────────────────────────────────────────

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toLocaleString('en-US', { maximumFractionDigits: 1 })}M`;
  if (tokens >= 1_000) return `${Math.round(tokens / 1_000)}K`;
  return String(tokens);
}

// ── Main component ─────────────────────────────────────────────────

export function PerformSportsPricingSelector({
  initialTier,
  onSelect,
  hideVendorNote = false,
  title = 'Per|Form · Sports Tiers',
}: PerformSportsPricingSelectorProps): React.ReactElement {
  const [selected, setSelected] = React.useState<PerformTier | null>(initialTier ?? null);

  const onSelectRef = React.useRef(onSelect);
  onSelectRef.current = onSelect;

  const select = (tier: PerformTier) => {
    setSelected(tier);
    onSelectRef.current?.(tier);
  };

  return (
    <section
      aria-label={title}
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      <header className="mb-6 flex flex-wrap items-baseline gap-3">
        <h3 className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
          {title}
        </h3>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text-subtle uppercase">
          5 tiers · overage applies above pool
        </span>
      </header>

      <ul
        role="radiogroup"
        aria-label={title}
        className="grid grid-cols-1 gap-4 md:grid-cols-5"
      >
        {PERFORM_SPORTS_TIERS.map((tier) => {
          const active = selected === tier.id;
          const upkeep = 'upkeepFee' in tier ? (tier.upkeepFee ?? 0) : 0;
          const showVendorNote = tier.vendorNote && !hideVendorNote;
          // Progressive weight — weight 1/2/3 → grid column span hint via min-height.
          const weightClass =
            tier.weight === 3 ? 'min-h-[22rem]' : tier.weight === 2 ? 'min-h-[20rem]' : 'min-h-[18rem]';
          return (
            <li key={tier.id} className="list-none">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => select(tier.id)}
                className={
                  `group flex w-full flex-col gap-4 border p-5 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ${weightClass} ` +
                  (active
                    ? 'border-deploy-neon bg-deploy-bg-surface shadow-deploy-neon'
                    : 'border-deploy-border-subtle bg-deploy-bg-surface hover:border-deploy-neon')
                }
              >
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-subtle uppercase">
                    {tier.longLabel}
                  </span>
                  <span
                    className={
                      'font-display text-[clamp(1.75rem,3vw,2.5rem)] leading-none tracking-[0.02em] uppercase ' +
                      (active ? 'text-deploy-neon' : 'text-deploy-text')
                    }
                  >
                    {tier.label}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 pt-3 border-t border-deploy-border-subtle">
                  <span className="flex items-baseline gap-1">
                    <span
                      className={
                        'font-display text-[clamp(1.5rem,2.5vw,2rem)] leading-none tracking-[0.02em] tabular-nums ' +
                        (active ? 'text-deploy-neon' : 'text-deploy-text')
                      }
                    >
                      {formatMoney(tier.monthlyFee)}
                    </span>
                    <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
                      /mo
                    </span>
                  </span>
                  {upkeep > 0 && (
                    <span className="font-mono text-[0.625rem] text-deploy-text-muted">
                      + {formatMoney(upkeep)}/mo upkeep
                    </span>
                  )}
                </div>

                <dl className="flex flex-col gap-1.5 pt-3 border-t border-deploy-border-subtle">
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
                      Pool
                    </dt>
                    <dd className="font-mono text-xs tabular-nums text-deploy-text">
                      {formatTokens(tier.tokenPool)} tokens
                    </dd>
                  </div>
                  <div className="flex items-baseline justify-between gap-2">
                    <dt className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
                      Overage
                    </dt>
                    <dd className="font-mono text-xs tabular-nums text-deploy-text">
                      ${tier.overagePer1k.toFixed(2)}/1K
                    </dd>
                  </div>
                </dl>

                <p className="font-body text-xs leading-relaxed text-deploy-text-muted mt-auto">
                  {tier.bestFor}
                </p>

                {showVendorNote && (
                  <p className="font-mono text-[0.625rem] leading-relaxed tracking-[0.06em] text-deploy-neon border-t border-deploy-border-subtle pt-2">
                    {tier.vendorNote}
                  </p>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
