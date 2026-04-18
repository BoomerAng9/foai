/**
 * PickerAngBomRenderer — customer-safe Bill of Materials display.
 *
 * Renders the Picker_Ang Step-3 output (BoM + Security Addendum) from
 * @aims/contracts + @aims/picker-ang. Always operates on the
 * customer-safe copy — internal_only tools arrive pre-relabeled by
 * Picker_Ang's engine (e.g. Manus → "External Tool Coordination").
 * This component applies NO special treatment to relabeled entries;
 * they read identically to named tools. That invisibility IS the
 * canonical guarantee.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * card stack where each BoM entry gets its own card with a three-bar
 * IIR meter (Impact / Integration-fit / Risk) in neon mini-bars. The
 * highest-weighted axis per tool gets a subtle neon dot next to its
 * label so the visual hierarchy follows the math. Security Addendum
 * sits in an outlined block below the card stack with a mono tag list
 * for scan profiles.
 *
 * Conventional (data-grid table with columns Tool / License / IIR /
 *   Rationale) — REJECTED for generic enterprise feel.
 * Experimental (radar chart per tool with 3-axis IIR overlay) —
 *   REJECTED for runtime viz-lib dependency + doesn't fit Charter row.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Data-grid with pagination
 *   - shadcn default Table look
 *   - Gradient progress bars for IIR scores
 *   - Star ratings
 *   - "Recommended" or "Best choice" badges
 *
 * Uses @aims/brand-tokens classes: bg-deploy-bg-deep, bg-deploy-bg-surface,
 * text-deploy-text, text-deploy-text-muted, text-deploy-text-subtle,
 * text-deploy-neon, border-deploy-neon, border-deploy-border-subtle,
 * font-display, font-mono, font-body, shadow-deploy-neon.
 */

import * as React from 'react';

// Types mirror @aims/contracts BomEntry + SecurityAddendum but stay
// inlined so the component is portable to scratch / Storybook apps.
export interface BomIir {
  impact: number;              // 0..1
  integrationFit: number;      // 0..1
  risk: number;                // 0..1
}

export interface BomEntryView {
  toolId: string;
  toolName: string;
  classification: string;
  license?: string;
  rationale: string;
  iir: BomIir;
  rating?: string | null;
}

export type BomScanProfile = 'SBOM' | 'SAST' | 'DAST' | 'OPA_Rego' | 'Performance';

export interface SecurityAddendumView {
  threatModel: string;
  controlsRequired: string[];
  scanProfiles: BomScanProfile[];
  farmerCertificationRequired: boolean;
}

export interface PickerAngBomRendererProps {
  /** Ordered array of customer-safe BoM entries. Picker_Ang is responsible for relabeling internal-only tools before this renders. */
  entries: readonly BomEntryView[];
  /** Security Addendum derived from the BoM + security tier. */
  securityAddendum: SecurityAddendumView;
  /** Optional click handler per tool for drilling into details. */
  onToolClick?: (toolId: string) => void;
  /** Show the IIR meters. Default true. */
  showIirScores?: boolean;
  /** Title rendered above the card stack. Optional. */
  title?: string;
}

export function PickerAngBomRenderer({
  entries,
  securityAddendum,
  onToolClick,
  showIirScores = true,
  title,
}: PickerAngBomRendererProps): React.ReactElement {
  if (entries.length === 0) {
    return (
      <section className="w-full bg-deploy-bg-deep p-8 text-deploy-text-muted font-body">
        <p className="font-mono text-xs tracking-[0.24em] uppercase">
          No Bill of Materials produced yet.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-label="Bill of Materials"
      className="w-full bg-deploy-bg-deep text-deploy-text font-body"
    >
      {title && (
        <h3 className="mb-6 font-body text-xs tracking-[0.24em] text-deploy-text-muted uppercase">
          {title}
        </h3>
      )}

      <ul className="flex flex-col gap-4">
        {entries.map((entry) => (
          <BomCard
            key={entry.toolId}
            entry={entry}
            showIirScores={showIirScores}
            onToolClick={onToolClick}
          />
        ))}
      </ul>

      <SecurityAddendumBlock addendum={securityAddendum} />
    </section>
  );
}

// ── Card ───────────────────────────────────────────────────────────

function BomCard({
  entry,
  showIirScores,
  onToolClick,
}: {
  entry: BomEntryView;
  showIirScores: boolean;
  onToolClick?: (toolId: string) => void;
}): React.ReactElement {
  const interactive = !!onToolClick;
  const Tag = interactive ? 'button' : 'div';
  const props = interactive
    ? {
        type: 'button' as const,
        onClick: () => onToolClick(entry.toolId),
      }
    : {};

  return (
    <li className="list-none">
      <Tag
        {...props}
        className={
          'group flex w-full flex-col gap-4 border border-deploy-border-subtle bg-deploy-bg-surface p-6 text-left transition-colors duration-200 ' +
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
          (interactive ? 'hover:border-deploy-neon cursor-pointer' : '')
        }
        aria-label={interactive ? `${entry.toolName} — view details` : undefined}
      >
        <header className="flex flex-wrap items-baseline justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h4 className="font-display text-[clamp(1.25rem,2vw,1.75rem)] leading-none tracking-[0.02em] uppercase text-deploy-text">
              {entry.toolName}
            </h4>
            <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-muted uppercase">
              {entry.classification}
            </span>
          </div>
          {entry.license && (
            <span className="font-mono text-[0.625rem] tracking-[0.12em] text-deploy-text-subtle uppercase">
              {entry.license}
            </span>
          )}
        </header>

        <p className="max-w-[72ch] font-body text-sm leading-relaxed text-deploy-text-muted">
          {entry.rationale}
        </p>

        {showIirScores && <IirMeters iir={entry.iir} />}
      </Tag>
    </li>
  );
}

// ── IIR Meters ─────────────────────────────────────────────────────

function IirMeters({ iir }: { iir: BomIir }): React.ReactElement {
  // Identify the highest-weighted axis to mark with a neon dot.
  const axes: Array<{ key: 'impact' | 'integrationFit' | 'risk'; label: string; short: string; value: number }> = [
    { key: 'impact', label: 'Impact', short: 'I', value: iir.impact },
    { key: 'integrationFit', label: 'Integration', short: 'F', value: iir.integrationFit },
    // For risk we display 1-risk so higher = better like the other axes.
    { key: 'risk', label: 'Risk (inverse)', short: 'R', value: 1 - iir.risk },
  ];
  const topAxis = axes.reduce((top, cur) => (cur.value > top.value ? cur : top), axes[0]);

  return (
    <div
      className="flex flex-col gap-2 pt-2 border-t border-deploy-border-subtle"
      role="group"
      aria-label="IIR score breakdown"
    >
      {axes.map((axis) => (
        <div key={axis.key} className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className={
              'inline-block h-1.5 w-1.5 rounded-full ' +
              (axis.key === topAxis.key ? 'bg-deploy-neon' : 'bg-transparent')
            }
          />
          <span className="w-24 font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
            {axis.label}
          </span>
          <Bar value={axis.value} label={axis.short} />
          <span className="w-10 text-right font-mono text-[0.625rem] tabular-nums text-deploy-text">
            {axis.value.toFixed(2)}
          </span>
        </div>
      ))}
    </div>
  );
}

function Bar({ value, label }: { value: number; label: string }): React.ReactElement {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div
      className="relative h-[2px] flex-1 bg-deploy-border-subtle"
      role="progressbar"
      aria-valuenow={Math.round(pct)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`${label} score`}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 left-0 bg-deploy-neon"
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ── Security Addendum ──────────────────────────────────────────────

function SecurityAddendumBlock({
  addendum,
}: {
  addendum: SecurityAddendumView;
}): React.ReactElement {
  return (
    <aside
      aria-label="Security Addendum"
      className="mt-8 flex flex-col gap-4 border border-deploy-border-subtle bg-deploy-bg-elevated p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
          Security Addendum
        </h4>
        {addendum.farmerCertificationRequired && (
          <span className="font-mono text-[0.625rem] tracking-[0.18em] text-deploy-accent-gold uppercase">
            Farmer certification required
          </span>
        )}
      </header>

      {addendum.threatModel && (
        <pre className="whitespace-pre-wrap font-body text-xs leading-relaxed text-deploy-text-muted">
          {addendum.threatModel}
        </pre>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:gap-8">
        <div className="flex-1">
          <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
            Controls required
          </span>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {addendum.controlsRequired.map((c) => (
              <li
                key={c}
                className="font-mono text-[0.625rem] tracking-[0.08em] text-deploy-text uppercase border border-deploy-border-subtle px-2 py-0.5"
              >
                {c}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1">
          <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
            Scan profiles
          </span>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {addendum.scanProfiles.map((p) => (
              <li
                key={p}
                className="font-mono text-[0.625rem] tracking-[0.12em] text-deploy-neon uppercase border border-deploy-neon px-2 py-0.5"
              >
                {p}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </aside>
  );
}
