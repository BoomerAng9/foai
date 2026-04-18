/**
 * TeslaVortexPricingPicker — A.I.M.S. core 3-6-9 Vortex pricing.
 *
 * Renders the canonical Tesla 3-6-9 Vortex Plan:
 *   Frequency (3 / 6 / 9 months) × V.I.B.E. Group (Individual / Family
 *   / Team / Enterprise) × 3 Pillars (Confidence Shield, Convenience
 *   Boost, Security Vault) stacking add-ons. Max stacked uplift +130%.
 *
 * Source of truth: feedback_billing_correction.md and
 * aims-tools/aims-pricing-matrix. Metaphysical branding:
 *   3 = entry / 6 = balance / 9 = completion.
 * "Axis of Balance" label sits under the 6-month card, canonical.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * a three-zone "vortex" — three progressive rows, each a refinement
 * of the one above. Row 1: Frequency cards with big Bebas Neue 3/6/9
 * numerals. Row 2: V.I.B.E. Group chips. Row 3: 3 Pillars with 3 tier
 * selectors each. Summary strip at the bottom shows computed monthly
 * total in font-display with the stacking breakdown in mono. Neon
 * only on the active selection per row + the total number.
 *
 * Conventional (side-by-side pricing cards with "Most Popular" badge
 *   + monthly/annual toggle + "Start Free Trial" CTA) — REJECTED as
 *   generic SaaS pricing page.
 * Experimental (rotating 3D torus as user selects) — REJECTED for 3D
 *   runtime dep.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Standard SaaS 3-column pricing with "Most Popular" badge
 *   - Monthly/Annual toggle pill
 *   - "Start Free Trial" primary CTA
 *   - "Compare plans" table
 *   - Tooltip (?) circles
 *   - Gradient-backed tier cards
 *
 * Uses @aims/brand-tokens Tailwind preset classes.
 */

import * as React from 'react';

// ── Canonical constants ────────────────────────────────────────────

export const TESLA_VORTEX_FREQUENCIES = [
  { id: '3', label: '3', months: 3, baseMonthly: 19.99, tokens: 100_000, agents: 5, concurrent: 2, motto: 'Entry' },
  { id: '6', label: '6', months: 6, baseMonthly: 17.99, tokens: 250_000, agents: 15, concurrent: 5, motto: 'Axis of Balance' },
  { id: '9', label: '9', months: 9, baseMonthly: 14.99, tokens: 500_000, agents: 50, concurrent: 25, motto: 'Completion · Pay 9, get 12' },
] as const;
export type TeslaVortexFrequency = (typeof TESLA_VORTEX_FREQUENCIES)[number]['id'];

export const TESLA_VORTEX_GROUPS = [
  { id: 'individual', label: 'Individual', seats: '1', multiplier: 1.0, perSeatAdd: 0 },
  { id: 'family', label: 'Family', seats: 'up to 4', multiplier: 1.5, perSeatAdd: 0 },
  { id: 'team', label: 'Team', seats: '5–20', multiplier: 2.5, perSeatAdd: 10 },
  { id: 'enterprise', label: 'Enterprise', seats: '21+', multiplier: 0, perSeatAdd: 0, custom: true },
] as const;
export type TeslaVortexGroup = (typeof TESLA_VORTEX_GROUPS)[number]['id'];

export const TESLA_VORTEX_PILLARS = {
  confidence: {
    glyph: '◈',
    label: 'Confidence Shield',
    tiers: [
      { id: 'standard', label: 'Standard', uplift: 0 },
      { id: 'verified', label: 'Verified', uplift: 0.15 },
      { id: 'guaranteed', label: 'Guaranteed', uplift: 0.35 },
    ],
  },
  convenience: {
    glyph: '◉',
    label: 'Convenience Boost',
    tiers: [
      { id: 'standard', label: 'Standard', uplift: 0 },
      { id: 'priority', label: 'Priority', uplift: 0.2 },
      { id: 'instant', label: 'Instant', uplift: 0.45 },
    ],
  },
  security: {
    glyph: '◆',
    label: 'Security Vault',
    tiers: [
      { id: 'essential', label: 'Essential', uplift: 0 },
      { id: 'professional', label: 'Professional', uplift: 0.25 },
      { id: 'fortress', label: 'Fortress', uplift: 0.5 },
    ],
  },
} as const;

export type ConfidencePillar = 'standard' | 'verified' | 'guaranteed';
export type ConveniencePillar = 'standard' | 'priority' | 'instant';
export type SecurityPillar = 'essential' | 'professional' | 'fortress';

export interface TeslaVortexPillarSelection {
  confidence: ConfidencePillar;
  convenience: ConveniencePillar;
  security: SecurityPillar;
}

export interface TeslaVortexQuote {
  frequency: TeslaVortexFrequency;
  group: TeslaVortexGroup;
  pillars: TeslaVortexPillarSelection;
  /** Monthly base before any group multiplier or pillar uplift. */
  base: number;
  /** Group-adjusted monthly (base × group.multiplier + perSeatAdd). */
  groupAdjusted: number;
  /** Total uplift fraction applied to groupAdjusted (0 – 1.30). */
  pillarUpliftFraction: number;
  /** Final monthly rate. null when Enterprise (custom quote). */
  monthlyTotal: number | null;
  /** True when the Enterprise group is selected and a custom quote is required. */
  isCustomQuote: boolean;
}

export interface TeslaVortexPricingPickerProps {
  initialFrequency?: TeslaVortexFrequency;
  initialGroup?: TeslaVortexGroup;
  initialPillars?: TeslaVortexPillarSelection;
  onQuoteChange?: (quote: TeslaVortexQuote) => void;
  onCustomQuoteRequest?: () => void;
  title?: string;
}

// ── Helper functions ───────────────────────────────────────────────

function computeQuote(
  frequency: TeslaVortexFrequency,
  group: TeslaVortexGroup,
  pillars: TeslaVortexPillarSelection,
): TeslaVortexQuote {
  const freq = TESLA_VORTEX_FREQUENCIES.find((f) => f.id === frequency)!;
  const grp = TESLA_VORTEX_GROUPS.find((g) => g.id === group)!;

  const confidenceUplift = TESLA_VORTEX_PILLARS.confidence.tiers.find((t) => t.id === pillars.confidence)!.uplift;
  const convenienceUplift = TESLA_VORTEX_PILLARS.convenience.tiers.find((t) => t.id === pillars.convenience)!.uplift;
  const securityUplift = TESLA_VORTEX_PILLARS.security.tiers.find((t) => t.id === pillars.security)!.uplift;
  const pillarUpliftFraction = confidenceUplift + convenienceUplift + securityUplift;

  if (grp.custom) {
    return {
      frequency,
      group,
      pillars,
      base: freq.baseMonthly,
      groupAdjusted: 0,
      pillarUpliftFraction,
      monthlyTotal: null,
      isCustomQuote: true,
    };
  }

  const groupAdjusted = freq.baseMonthly * grp.multiplier + grp.perSeatAdd;
  const monthlyTotal = groupAdjusted * (1 + pillarUpliftFraction);

  return {
    frequency,
    group,
    pillars,
    base: freq.baseMonthly,
    groupAdjusted: round2(groupAdjusted),
    pillarUpliftFraction,
    monthlyTotal: round2(monthlyTotal),
    isCustomQuote: false,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function formatMoney(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

// ── Main component ─────────────────────────────────────────────────

export function TeslaVortexPricingPicker({
  initialFrequency = '6',
  initialGroup = 'individual',
  initialPillars = { confidence: 'standard', convenience: 'standard', security: 'essential' },
  onQuoteChange,
  onCustomQuoteRequest,
  title = 'A.I.M.S. · 3-6-9 Vortex Plan',
}: TeslaVortexPricingPickerProps): React.ReactElement {
  const [frequency, setFrequency] = React.useState<TeslaVortexFrequency>(initialFrequency);
  const [group, setGroup] = React.useState<TeslaVortexGroup>(initialGroup);
  const [pillars, setPillars] = React.useState<TeslaVortexPillarSelection>(initialPillars);

  const quote = React.useMemo(
    () => computeQuote(frequency, group, pillars),
    [frequency, group, pillars],
  );

  const onQuoteChangeRef = React.useRef(onQuoteChange);
  onQuoteChangeRef.current = onQuoteChange;
  React.useEffect(() => {
    onQuoteChangeRef.current?.(quote);
  }, [quote]);

  const setPillar = <K extends keyof TeslaVortexPillarSelection>(
    key: K,
    value: TeslaVortexPillarSelection[K],
  ) => {
    setPillars((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <section
      aria-label={title}
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      <header className="mb-8 flex flex-wrap items-baseline gap-3">
        <h3 className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
          {title}
        </h3>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text-subtle uppercase">
          3 = entry · 6 = balance · 9 = completion
        </span>
      </header>

      {/* ─── Zone 1 — Frequency ──────────────────────────────── */}
      <div className="mb-10">
        <ZoneLabel index="I" title="Frequency" />
        <ul
          role="radiogroup"
          aria-label="Frequency"
          className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3"
        >
          {TESLA_VORTEX_FREQUENCIES.map((f) => {
            const active = frequency === f.id;
            return (
              <li key={f.id} className="list-none">
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setFrequency(f.id)}
                  className={
                    'group flex w-full flex-col items-start gap-3 border p-6 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
                    (active
                      ? 'border-deploy-neon bg-deploy-bg-surface shadow-deploy-neon'
                      : 'border-deploy-border-subtle bg-deploy-bg-surface hover:border-deploy-neon')
                  }
                >
                  <span
                    className={
                      'font-display leading-none tracking-[0.04em] tabular-nums text-[clamp(4rem,10vw,7rem)] ' +
                      (active ? 'text-deploy-neon' : 'text-deploy-text')
                    }
                  >
                    {f.label}
                  </span>
                  <span className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-subtle uppercase">
                    {f.motto}
                  </span>
                  <div className="flex flex-col gap-0.5 pt-2 border-t border-deploy-border-subtle w-full">
                    <MonoLine label="Base" value={`${formatMoney(f.baseMonthly)}/mo`} />
                    <MonoLine label="Tokens" value={`${Math.round(f.tokens / 1000)}K / mo`} />
                    <MonoLine label="Agents" value={`${f.agents} · ${f.concurrent} concurrent`} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ─── Zone 2 — V.I.B.E. Group ─────────────────────────── */}
      <div className="mb-10">
        <ZoneLabel index="II" title="V.I.B.E. Group" subtitle="Seat multiplier" />
        <ul
          role="radiogroup"
          aria-label="V.I.B.E. Group"
          className="mt-4 flex flex-wrap gap-2"
        >
          {TESLA_VORTEX_GROUPS.map((g) => {
            const active = group === g.id;
            return (
              <li key={g.id} className="list-none">
                <button
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setGroup(g.id)}
                  className={
                    'flex flex-col items-start gap-0.5 border px-4 py-3 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
                    (active
                      ? 'border-deploy-neon text-deploy-neon shadow-deploy-neon bg-deploy-bg-surface'
                      : 'border-deploy-border-subtle text-deploy-text hover:border-deploy-neon bg-deploy-bg-surface')
                  }
                >
                  <span className="font-body text-sm tracking-[0.04em]">{g.label}</span>
                  <span className="font-mono text-[0.625rem] tracking-[0.12em] text-deploy-text-subtle uppercase">
                    {g.seats} seat{g.seats === '1' ? '' : 's'}
                    {!g.custom && ` · ${g.multiplier}× base`}
                    {!!g.perSeatAdd && ` · +$${g.perSeatAdd}/seat`}
                    {g.custom && ' · custom quote'}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {/* ─── Zone 3 — 3 Pillars ──────────────────────────────── */}
      <div className="mb-10">
        <ZoneLabel index="III" title="Three Pillars" subtitle="Stacking add-ons · max +130%" />
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <PillarColumn
            definition={TESLA_VORTEX_PILLARS.confidence}
            selected={pillars.confidence}
            onChange={(v) => setPillar('confidence', v as ConfidencePillar)}
          />
          <PillarColumn
            definition={TESLA_VORTEX_PILLARS.convenience}
            selected={pillars.convenience}
            onChange={(v) => setPillar('convenience', v as ConveniencePillar)}
          />
          <PillarColumn
            definition={TESLA_VORTEX_PILLARS.security}
            selected={pillars.security}
            onChange={(v) => setPillar('security', v as SecurityPillar)}
          />
        </div>
      </div>

      {/* ─── Summary strip ──────────────────────────────────── */}
      <QuoteSummary quote={quote} onCustomQuoteRequest={onCustomQuoteRequest} />
    </section>
  );
}

// ── Sub-components ─────────────────────────────────────────────────

function ZoneLabel({
  index,
  title,
  subtitle,
}: {
  index: string;
  title: string;
  subtitle?: string;
}): React.ReactElement {
  return (
    <div className="flex items-baseline gap-4">
      <span
        aria-hidden="true"
        className="font-display text-2xl leading-none tracking-[0.06em] text-deploy-text-subtle"
      >
        {index}
      </span>
      <h4 className="font-body text-base tracking-[0.08em] uppercase text-deploy-text">
        {title}
      </h4>
      {subtitle && (
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
          {subtitle}
        </span>
      )}
    </div>
  );
}

function MonoLine({ label, value }: { label: string; value: string }): React.ReactElement {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
        {label}
      </span>
      <span className="font-mono text-[0.625rem] tabular-nums text-deploy-text">
        {value}
      </span>
    </div>
  );
}

function PillarColumn({
  definition,
  selected,
  onChange,
}: {
  definition: { glyph: string; label: string; tiers: ReadonlyArray<{ id: string; label: string; uplift: number }> };
  selected: string;
  onChange: (v: string) => void;
}): React.ReactElement {
  return (
    <fieldset className="flex flex-col gap-2 border border-deploy-border-subtle bg-deploy-bg-surface p-4">
      <legend className="flex items-center gap-2 px-1">
        <span aria-hidden="true" className="font-display text-lg text-deploy-text">
          {definition.glyph}
        </span>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text uppercase">
          {definition.label}
        </span>
      </legend>
      <ul className="flex flex-col gap-1.5" role="radiogroup" aria-label={definition.label}>
        {definition.tiers.map((t) => {
          const active = selected === t.id;
          return (
            <li key={t.id} className="list-none">
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onChange(t.id)}
                className={
                  'flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
                  (active
                    ? 'border-deploy-neon text-deploy-neon'
                    : 'border-deploy-border-subtle text-deploy-text hover:border-deploy-neon')
                }
              >
                <span className="font-body text-sm">{t.label}</span>
                <span className="font-mono text-[0.625rem] tabular-nums">
                  {t.uplift === 0 ? 'incl.' : `+${Math.round(t.uplift * 100)}%`}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </fieldset>
  );
}

function QuoteSummary({
  quote,
  onCustomQuoteRequest,
}: {
  quote: TeslaVortexQuote;
  onCustomQuoteRequest?: () => void;
}): React.ReactElement {
  return (
    <div className="mt-6 flex flex-col gap-4 border-t-2 border-deploy-neon bg-deploy-bg-elevated p-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-col gap-1">
          <span className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-subtle uppercase">
            Monthly total
          </span>
          {quote.isCustomQuote ? (
            <span className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-[0.02em] text-deploy-neon">
              CUSTOM
            </span>
          ) : (
            <span className="font-display text-[clamp(2rem,5vw,3.5rem)] leading-none tracking-[0.02em] text-deploy-neon tabular-nums">
              {formatMoney(quote.monthlyTotal!)}
            </span>
          )}
        </div>
        <div className="flex flex-col gap-1 text-right">
          <MonoLine label="Base" value={formatMoney(quote.base) + '/mo'} />
          {!quote.isCustomQuote && (
            <MonoLine label="Group-adjusted" value={formatMoney(quote.groupAdjusted) + '/mo'} />
          )}
          <MonoLine
            label="Pillar stack"
            value={`+${Math.round(quote.pillarUpliftFraction * 100)}% (max +130%)`}
          />
        </div>
      </div>

      {quote.isCustomQuote && onCustomQuoteRequest && (
        <button
          type="button"
          onClick={onCustomQuoteRequest}
          className="self-start border border-deploy-neon px-4 py-2 font-mono text-xs tracking-[0.18em] uppercase text-deploy-neon transition-all hover:shadow-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
        >
          Request custom quote →
        </button>
      )}
    </div>
  );
}
