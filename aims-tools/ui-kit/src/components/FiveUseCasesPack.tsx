/**
 * FiveUseCasesPack — GROC-ranked Five Use Cases Pack (full detail).
 *
 * The Charter attaches this at Step 6 (Purchase Order) as a
 * quality-of-life upgrade. Five cases per PO, each covering purpose,
 * how-to, usage bands (high/med/low), KPIs, risks, and a GROC 4-axis
 * score (Goal Fit / Risk Posture / Operational Value / Complexity).
 *
 * CharterDetailView renders a minimal inline version (title + purpose
 * + GROC). THIS component is the dedicated page/modal surface that
 * expands to the full detail set.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * 5 stacked cards, each collapsed by default showing title + purpose
 * + GROC micro-bars (mirrors the IIR pattern from PickerAngBomRenderer
 * for kit consistency). Click/keyboard to expand — reveals usage
 * bands, KPIs, and risks in a three-column grid. The highest-weighted
 * GROC axis gets a neon dot to the left of its label. No badges,
 * no gradient, no carousel.
 *
 * Conventional (5 single-column stacked cards with sections collapsed
 *   behind chevrons) — REJECTED for shadcn Accordion feel.
 * Experimental (carousel with dots + auto-advance) — REJECTED because
 *   Five Use Cases Pack is a review artifact, not a storybook.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - "Recommended" or star-ranked cards
 *   - Carousel with dots
 *   - Accordion with chevron rotation animations
 *   - Feature-matrix table beneath cards
 *   - Gradient accent colors
 *   - Step-wizard 1/2/3/4/5 numbering as primary treatment
 *
 * Uses @aims/brand-tokens classes.
 */

import * as React from 'react';

export interface GrocScore {
  goalFit: number;          // 0..1
  riskPosture: number;      // 0..1 (higher = lower risk / more stable)
  operationalValue: number; // 0..1
  complexity: number;       // 0..1 (higher = simpler to operate)
  /** Weighted composite (usually 0.35·goalFit + 0.25·risk + 0.25·opValue + 0.15·complexity). */
  weighted: number;
}

export interface UsageBandView {
  high: string;
  medium: string;
  low: string;
}

export interface UseCaseFullView {
  title: string;
  purpose: string;
  audience: string;
  howToImplement: string[];
  usageBands: UsageBandView;
  kpis: string[];
  risks: string[];
  groc: GrocScore;
}

export interface FiveUseCasesPackProps {
  /** Up to 5 use cases. Renders all provided; component does not truncate. */
  useCases: readonly UseCaseFullView[];
  /** Expand a specific index on initial mount. Defaults to none expanded. */
  initialExpanded?: number | null;
  /** Emitted when a case's expand toggle is clicked. */
  onToggle?: (index: number, expanded: boolean) => void;
  /** Optional mono header above the stack. */
  title?: string;
}

const GROC_AXES = [
  { key: 'goalFit', label: 'Goal Fit' },
  { key: 'riskPosture', label: 'Risk Posture' },
  { key: 'operationalValue', label: 'Operational Value' },
  { key: 'complexity', label: 'Complexity' },
] as const;

export function FiveUseCasesPack({
  useCases,
  initialExpanded = null,
  onToggle,
  title = 'Five Use Cases Pack · GROC-ranked',
}: FiveUseCasesPackProps): React.ReactElement {
  const [expanded, setExpanded] = React.useState<number | null>(initialExpanded);

  const toggle = (i: number) => {
    setExpanded((prev) => {
      const next = prev === i ? null : i;
      onToggle?.(i, next === i);
      return next;
    });
  };

  if (useCases.length === 0) {
    return (
      <section className="w-full bg-deploy-bg-deep p-8 text-deploy-text-muted font-body">
        <p className="font-mono text-xs tracking-[0.24em] uppercase">
          Five Use Cases Pack not yet attached (delivered with PO).
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label={title}
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      <header className="mb-4 flex flex-wrap items-baseline gap-3">
        <h3 className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
          {title}
        </h3>
        <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-text-subtle uppercase">
          weights: goal .35 · risk .25 · op .25 · complexity .15
        </span>
      </header>

      <ol role="list" className="flex flex-col gap-3">
        {useCases.map((uc, i) => (
          <UseCaseCard
            key={i}
            index={i}
            uc={uc}
            expanded={expanded === i}
            onToggle={() => toggle(i)}
          />
        ))}
      </ol>
    </section>
  );
}

// ── Card ───────────────────────────────────────────────────────────

function UseCaseCard({
  index,
  uc,
  expanded,
  onToggle,
}: {
  index: number;
  uc: UseCaseFullView;
  expanded: boolean;
  onToggle: () => void;
}): React.ReactElement {
  const regionId = `usecase-detail-${index}`;
  return (
    <li className="list-none">
      <article
        className={
          'flex flex-col gap-4 border bg-deploy-bg-surface p-5 transition-colors duration-200 ' +
          (expanded ? 'border-deploy-neon' : 'border-deploy-border-subtle')
        }
      >
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={regionId}
          className="flex flex-col gap-3 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
        >
          <header className="flex flex-wrap items-baseline justify-between gap-3">
            <div className="flex flex-col gap-1">
              <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
                Case {String(index + 1).padStart(2, '0')} · {uc.audience}
              </span>
              <h4 className="font-display text-[clamp(1.25rem,2vw,1.75rem)] leading-none tracking-[0.02em] uppercase text-deploy-text">
                {uc.title}
              </h4>
            </div>
            <span className="font-mono text-xs tabular-nums text-deploy-neon">
              GROC {uc.groc.weighted.toFixed(2)}
            </span>
          </header>

          <p className="max-w-[72ch] font-body text-sm leading-relaxed text-deploy-text-muted">
            {uc.purpose}
          </p>

          <GrocMeters groc={uc.groc} />
        </button>

        {expanded && (
          <div
            id={regionId}
            className="flex flex-col gap-4 border-t border-deploy-border-subtle pt-4"
          >
            <DetailSection label="How to implement">
              {uc.howToImplement.length ? (
                <ol className="flex flex-col gap-1 list-none">
                  {uc.howToImplement.map((step, si) => (
                    <li key={si} className="flex items-baseline gap-2 font-body text-sm text-deploy-text">
                      <span className="font-mono text-[0.625rem] tabular-nums text-deploy-text-subtle">
                        {String(si + 1).padStart(2, '0')}
                      </span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <span className="font-mono text-xs text-deploy-text-subtle">not recorded</span>
              )}
            </DetailSection>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <DetailSection label="Usage — high">
                <p className="font-body text-sm text-deploy-text">{uc.usageBands.high}</p>
              </DetailSection>
              <DetailSection label="Usage — medium">
                <p className="font-body text-sm text-deploy-text">{uc.usageBands.medium}</p>
              </DetailSection>
              <DetailSection label="Usage — low">
                <p className="font-body text-sm text-deploy-text">{uc.usageBands.low}</p>
              </DetailSection>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <DetailSection label="KPIs">
                <StringList items={uc.kpis} emptyLabel="none defined" />
              </DetailSection>
              <DetailSection label="Risks">
                <StringList items={uc.risks} emptyLabel="none flagged" />
              </DetailSection>
            </div>
          </div>
        )}
      </article>
    </li>
  );
}

// ── GROC meters (mirror IIR pattern from PickerAngBomRenderer) ────

function GrocMeters({ groc }: { groc: GrocScore }): React.ReactElement {
  const values = {
    goalFit: groc.goalFit,
    riskPosture: groc.riskPosture,
    operationalValue: groc.operationalValue,
    complexity: groc.complexity,
  };
  const topKey = GROC_AXES.reduce(
    (top, cur) => (values[cur.key] > values[top.key] ? cur : top),
    GROC_AXES[0],
  ).key;

  return (
    <div
      role="group"
      aria-label="GROC breakdown"
      className="grid grid-cols-1 gap-2 border-t border-deploy-border-subtle pt-3 md:grid-cols-4"
    >
      {GROC_AXES.map((axis) => (
        <div key={axis.key} className="flex items-center gap-2">
          <span
            aria-hidden="true"
            className={
              'inline-block h-1.5 w-1.5 rounded-full ' +
              (axis.key === topKey ? 'bg-deploy-neon' : 'bg-transparent')
            }
          />
          <div className="flex flex-1 flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-mono text-[0.625rem] tracking-[0.12em] text-deploy-text-subtle uppercase">
                {axis.label}
              </span>
              <span className="font-mono text-[0.625rem] tabular-nums text-deploy-text">
                {values[axis.key].toFixed(2)}
              </span>
            </div>
            <Bar value={values[axis.key]} />
          </div>
        </div>
      ))}
    </div>
  );
}

function Bar({ value }: { value: number }): React.ReactElement {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="relative h-[2px] w-full bg-deploy-border-subtle"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-deploy-neon"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Small reusable inside the card ─────────────────────────────────

function DetailSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
        {label}
      </span>
      {children}
    </div>
  );
}

function StringList({
  items,
  emptyLabel,
}: {
  items: readonly string[];
  emptyLabel: string;
}): React.ReactElement {
  if (!items.length) {
    return (
      <span className="font-mono text-xs text-deploy-text-subtle">{emptyLabel}</span>
    );
  }
  return (
    <ul className="flex flex-col gap-0.5">
      {items.map((s, i) => (
        <li key={i} className="font-body text-sm text-deploy-text">
          — {s}
        </li>
      ))}
    </ul>
  );
}
