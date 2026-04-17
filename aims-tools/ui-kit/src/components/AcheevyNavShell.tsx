/**
 * AcheevyNavShell — shared top-bar shell for Deploy by: ACHIEVEMOR
 * public surfaces. Pairs with HomeHero so the two-component entry set
 * reads as one visual language.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * wordmark centered at the top matching HomeHero's anchor point, nav
 * items split LEFT of the wordmark and RIGHT of the wordmark rather
 * than the standard logo-left-nav-center-cta-right pattern. Two subtle
 * mode pills ("manage" / "guide") optionally render under the
 * wordmark when an engagement is mid-flight — they glow neon for the
 * active mode, nothing for inactive.
 *
 * Conventional (logo-left SaaS nav) — REJECTED: generic, reads as
 *   Vercel/Linear/any-other-SaaS.
 * Experimental (floating glass shell + animated boomerang) — REJECTED:
 *   runtime deps + animation libs out of scope for PR 9.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Standard logo-left + nav-center + CTA-right
 *   - Gradient-backed primary CTA pill
 *   - shadcn default spacing / h-14 / Inter
 *   - Desktop hamburger menu
 *   - Any nav bar that could appear on a generic AI SaaS
 *
 * Uses @aims/brand-tokens Tailwind preset classes (text-deploy-neon,
 * bg-deploy-bg-deep, text-deploy-text, text-deploy-text-muted,
 * font-wordmark, font-body, border-deploy-border-subtle,
 * shadow-deploy-neon).
 */

import * as React from 'react';

export interface AcheevyNavItem {
  label: string;
  href: string;
  active?: boolean;
  /** Optional click handler — falls back to plain anchor navigation if absent. */
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
}

export interface AcheevyNavShellProps {
  /** Items rendered to the LEFT of the wordmark. Typically "Plugs", "Plans", "About". */
  leftItems?: AcheevyNavItem[];
  /** Items rendered to the RIGHT of the wordmark. Typically "Log in", "Get started". */
  rightItems?: AcheevyNavItem[];
  /** The current engagement mode, if any. Controls the mode-pill row. */
  activeMode?: 'manage' | 'guide' | null;
  /** Click handler for the mode pills — typically navigates into the engagement UI. */
  onModeClick?: (mode: 'manage' | 'guide') => void;
  /** Whitelabel override of the wordmark. Defaults to the canon form. */
  wordmark?: string;
  /** Children render in the scroll region below the shell. */
  children?: React.ReactNode;
}

export function AcheevyNavShell({
  leftItems = [],
  rightItems = [],
  activeMode = null,
  onModeClick,
  wordmark = 'Deploy by: ACHIEVEMOR',
  children,
}: AcheevyNavShellProps): React.ReactElement {
  // Canonical colon-split matches HomeHero.
  const colonIndex = wordmark.indexOf(':');
  const prefix = colonIndex >= 0 ? wordmark.slice(0, colonIndex) : wordmark;
  const suffix = colonIndex >= 0 ? wordmark.slice(colonIndex + 1) : '';

  return (
    <div className="flex min-h-screen w-full flex-col bg-deploy-bg-deep text-deploy-text font-body">
      <header
        className="relative z-20 w-full border-b border-deploy-border-subtle"
        aria-label="Deploy by ACHIEVEMOR — primary navigation"
      >
        {/* Top row: nav-left | wordmark | nav-right */}
        <div className="mx-auto grid w-full max-w-[96rem] grid-cols-[1fr_auto_1fr] items-center gap-6 px-6 py-5 md:px-10">
          <NavList items={leftItems} align="start" />

          <a
            href="/"
            aria-label={wordmark}
            className="justify-self-center font-wordmark text-[clamp(1.25rem,2vw,1.75rem)] leading-none tracking-wide text-deploy-text transition-opacity hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon"
          >
            <span>{prefix}</span>
            {colonIndex >= 0 && (
              <>
                <span className="text-deploy-neon">:</span>
                <span>{suffix}</span>
              </>
            )}
          </a>

          <NavList items={rightItems} align="end" />
        </div>

        {/* Optional mode-pill row — renders only when an engagement is live */}
        {activeMode !== undefined && activeMode !== null && (
          <div className="flex justify-center gap-3 pb-4">
            <ModePill
              mode="manage"
              active={activeMode === 'manage'}
              onClick={onModeClick}
            />
            <ModePill
              mode="guide"
              active={activeMode === 'guide'}
              onClick={onModeClick}
            />
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>
    </div>
  );
}

// ── Internal sub-components ────────────────────────────────────────

function NavList({
  items,
  align,
}: {
  items: AcheevyNavItem[];
  align: 'start' | 'end';
}): React.ReactElement {
  if (!items.length) {
    return <span className={align === 'start' ? 'justify-self-start' : 'justify-self-end'} />;
  }
  return (
    <ul
      className={
        'flex items-center gap-6 font-body text-sm tracking-[0.12em] uppercase ' +
        (align === 'start' ? 'justify-self-start' : 'justify-self-end')
      }
    >
      {items.map((item) => (
        <li key={item.href}>
          <a
            href={item.href}
            onClick={item.onClick}
            className={
              'relative inline-flex items-center py-1 transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
              (item.active
                ? 'text-deploy-neon'
                : 'text-deploy-text-muted hover:text-deploy-text')
            }
            aria-current={item.active ? 'page' : undefined}
          >
            {item.label}
            {item.active && (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 -bottom-1 h-px bg-deploy-neon"
              />
            )}
          </a>
        </li>
      ))}
    </ul>
  );
}

function ModePill({
  mode,
  active,
  onClick,
}: {
  mode: 'manage' | 'guide';
  active: boolean;
  onClick?: (mode: 'manage' | 'guide') => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={() => onClick?.(mode)}
      aria-pressed={active}
      className={
        'inline-flex items-center gap-2 rounded-none border px-4 py-1.5 font-body text-xs tracking-[0.18em] uppercase transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon ' +
        (active
          ? 'border-deploy-neon text-deploy-neon shadow-deploy-neon'
          : 'border-deploy-border-subtle text-deploy-text-muted hover:text-deploy-text')
      }
    >
      <span
        aria-hidden="true"
        className={
          'inline-block h-1.5 w-1.5 rounded-full ' +
          (active ? 'bg-deploy-neon' : 'bg-deploy-text-subtle')
        }
      />
      <span>{mode === 'manage' ? 'Manage it' : 'Guide me'}</span>
    </button>
  );
}
