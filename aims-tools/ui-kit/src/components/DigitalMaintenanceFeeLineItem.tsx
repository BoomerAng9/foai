/**
 * DigitalMaintenanceFeeLineItem — reusable Charter receipt row.
 *
 * Customer-safe rendering of the canonical $0.99 Digital Maintenance
 * Fee. Stacks into any invoice/quote/PO cost summary. NEVER surfaces
 * the internal Melanium Ingot split (70% vault / 30% customer). The
 * customer sees one generic line; Ledger carries the full allocation.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * a minimal flex-row — label left, amount right, optional canonical
 * explainer line underneath in body-sm muted. Mono throughout so it
 * slots into receipts without fighting their own type scale. No border,
 * no alt-row stripe — the container owns the surface. Optional inline
 * "(info)" affordance that renders when onInfoClick is provided,
 * otherwise the explainer line is always visible.
 *
 * Conventional (table <tr> with `<td>Label</td><td>$x</td>`) —
 *   REJECTED for QuickBooks/Wave receipt feel.
 * Experimental (animated receipt-tear transition on state change) —
 *   REJECTED for runtime animation dep out of scope.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - QuickBooks/Wave row with borders + alt-row striping
 *   - Big "fee" icon or question-mark circle badge
 *   - Tooltip popover that hides the explainer
 *   - "NEW!" / "Updated" badge
 *   - Dollar-sign prefix rendered with emphasis
 *
 * Uses @aims/brand-tokens classes (text-deploy-text,
 * text-deploy-text-muted, text-deploy-text-subtle, text-deploy-neon,
 * border-deploy-border-subtle, font-mono, font-body).
 */

import * as React from 'react';

export interface DigitalMaintenanceFeeLineItemProps {
  /** Fee amount. Defaults to the canonical $0.99. */
  amount?: number;
  /** ISO 4217 currency code. Defaults to USD. */
  currency?: string;
  /** Override the line label. Defaults to the canon form. */
  label?: string;
  /** Show the canonical explainer underneath. Defaults to true. Ignored when onInfoClick is provided. */
  showExplainer?: boolean;
  /** If provided, replaces the inline explainer with a mono "(info)" affordance. */
  onInfoClick?: () => void;
  /** Compact mode — removes the explainer entirely, label + amount only. */
  compact?: boolean;
  /** Optional wrapping HTML element. Defaults to "div" — use "li" inside an <ul> invoice list. */
  as?: 'div' | 'li';
}

function formatCurrency(value: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch {
    return `${currency} ${value.toFixed(2)}`;
  }
}

const CANONICAL_EXPLAINER =
  'Platform infrastructure maintenance — supports uptime, security, and ongoing development.';

export function DigitalMaintenanceFeeLineItem({
  amount = 0.99,
  currency = 'USD',
  label = 'Digital Maintenance Fee',
  showExplainer = true,
  onInfoClick,
  compact = false,
  as = 'div',
}: DigitalMaintenanceFeeLineItemProps): React.ReactElement {
  const Wrapper = as;
  const explainerVisible = !compact && !onInfoClick && showExplainer;

  return (
    <Wrapper className="flex flex-col gap-1 py-2 text-deploy-text font-body list-none">
      <div className="flex items-baseline justify-between gap-4">
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xs tracking-[0.08em] text-deploy-text">
            {label}
          </span>
          {onInfoClick && (
            <button
              type="button"
              onClick={onInfoClick}
              aria-label={`${label} — more information`}
              className="font-mono text-[0.625rem] tracking-[0.12em] text-deploy-text-subtle uppercase transition-colors hover:text-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
            >
              (info)
            </button>
          )}
        </span>
        <span className="font-mono text-xs tabular-nums text-deploy-text">
          {formatCurrency(amount, currency)}
        </span>
      </div>

      {explainerVisible && (
        <p className="max-w-[60ch] font-body text-[0.6875rem] leading-relaxed text-deploy-text-muted">
          {CANONICAL_EXPLAINER}
        </p>
      )}
    </Wrapper>
  );
}

/** Exported canonical copy so consumers building their own receipt surfaces can reuse the exact text. */
export const DIGITAL_MAINTENANCE_FEE_EXPLAINER = CANONICAL_EXPLAINER;
export const DIGITAL_MAINTENANCE_FEE_AMOUNT = 0.99;
export const DIGITAL_MAINTENANCE_FEE_LABEL = 'Digital Maintenance Fee';
