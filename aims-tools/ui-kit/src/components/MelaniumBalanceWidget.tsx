/**
 * MelaniumBalanceWidget — customer platform currency surface.
 *
 * Renders the customer's Melanium Ingot balance (the 30% share of every
 * $0.99 Digital Maintenance Fee — the canonical Savings Plan allocation
 * per the 2026-04-17 arbitration). Values come from @aims/melanium's
 * customer_balances table via `getCustomerBalance()` or a server-side
 * projection into the consumer page.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * three-band vertical card.
 *   Band 1 — current balance in font-display (Bebas Neue), USD mono
 *     label, neon only on the balance number.
 *   Band 2 — lifetime earned + lifetime spent as two mono columns
 *     sharing a subtle divider. No arrows, no delta badges.
 *   Band 3 — canonical explainer text: "Platform currency earned from
 *     the Digital Maintenance Fee — your Savings Plan allocation." In
 *     body-sm muted.
 *
 * Conventional (Stripe-style credit-card rectangle with icon +
 *   transactions list) — REJECTED for generic fintech feel.
 * Experimental (live-updating ticker + WebSocket feed) — REJECTED for
 *   runtime infrastructure dependency out of this PR's scope.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Stripe / Plaid / banking card look
 *   - Coin / emoji / dollar-sign icon
 *   - Gradient on the balance number
 *   - Green up-arrow / red down-arrow
 *   - "Add funds" primary CTA
 *   - Sparkline for the balance history
 *
 * Uses @aims/brand-tokens classes (bg-deploy-bg-surface,
 * text-deploy-text, text-deploy-text-muted, text-deploy-text-subtle,
 * text-deploy-neon, border-deploy-border-subtle, font-display, font-mono,
 * font-body).
 */

import * as React from 'react';

export interface MelaniumBalanceWidgetProps {
  /** The customer's current platform currency balance. */
  balance: number;
  /** Total credits earned over the lifetime of the account. */
  lifetimeEarned: number;
  /** Total credits spent over the lifetime of the account. */
  lifetimeSpent: number;
  /** ISO 4217 currency code for display. Defaults to USD. */
  currency?: string;
  /** Optional customer id label (shown in mono subtle above the card). */
  customerId?: string | null;
  /** Optional handler when the "View history" affordance is clicked. Hides the link if absent. */
  onHistoryClick?: () => void;
  /** Short headline above the card. Defaults to "Savings Plan — Platform Currency". */
  title?: string;
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
    // Fallback if the runtime doesn't know the currency code.
    return `${currency} ${value.toFixed(2)}`;
  }
}

export function MelaniumBalanceWidget({
  balance,
  lifetimeEarned,
  lifetimeSpent,
  currency = 'USD',
  customerId,
  onHistoryClick,
  title = 'Savings Plan — Platform Currency',
}: MelaniumBalanceWidgetProps): React.ReactElement {
  return (
    <section
      aria-label={title}
      className="flex w-full max-w-md flex-col gap-4 border border-deploy-border-subtle bg-deploy-bg-surface p-6 text-deploy-text font-body"
    >
      <header className="flex items-baseline justify-between gap-3">
        <h3 className="font-mono text-[0.625rem] tracking-[0.24em] text-deploy-text-muted uppercase">
          {title}
        </h3>
        {customerId && (
          <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
            {customerId}
          </span>
        )}
      </header>

      {/* Band 1 — current balance */}
      <div className="flex flex-col gap-1">
        <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
          Balance
        </span>
        <div className="flex items-baseline gap-2">
          <span
            className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-none tracking-[0.02em] text-deploy-neon tabular-nums"
            aria-live="polite"
          >
            {formatCurrency(balance, currency)}
          </span>
          <span className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
            {currency}
          </span>
        </div>
      </div>

      {/* Band 2 — lifetime earned + spent */}
      <dl
        className="grid grid-cols-2 gap-0 border-t border-deploy-border-subtle pt-4"
        role="list"
      >
        <Stat label="Earned" value={formatCurrency(lifetimeEarned, currency)} />
        <Stat
          label="Spent"
          value={formatCurrency(lifetimeSpent, currency)}
          leftDivider
        />
      </dl>

      {/* Band 3 — canonical explainer + optional history link */}
      <footer className="flex flex-col gap-2 border-t border-deploy-border-subtle pt-3">
        <p className="font-body text-xs leading-relaxed text-deploy-text-muted">
          Platform currency earned from the Digital Maintenance Fee — your
          Savings Plan allocation.
        </p>
        {onHistoryClick && (
          <button
            type="button"
            onClick={onHistoryClick}
            className="self-start font-mono text-[0.625rem] tracking-[0.18em] uppercase text-deploy-text-muted transition-colors hover:text-deploy-neon focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
          >
            View history →
          </button>
        )}
      </footer>
    </section>
  );
}

function Stat({
  label,
  value,
  leftDivider = false,
}: {
  label: string;
  value: string;
  leftDivider?: boolean;
}): React.ReactElement {
  return (
    <div
      className={
        'flex flex-col gap-1 ' +
        (leftDivider ? 'pl-4 border-l border-deploy-border-subtle' : '')
      }
    >
      <dt className="font-mono text-[0.625rem] tracking-[0.16em] text-deploy-text-subtle uppercase">
        {label}
      </dt>
      <dd className="font-mono text-sm text-deploy-text tabular-nums">
        {value}
      </dd>
    </div>
  );
}
