/**
 * HomeHero — Deploy by: ACHIEVEMOR canonical landing hero.
 *
 * Differentiated approach (per Open Mind's three-approach rule):
 * asymmetric 50/50 split. The conventional pattern (centered hero +
 * two cards below) was rejected because it fails the brand floor and
 * would be indistinguishable from any other AI SaaS. The experimental
 * pattern (kinetic Spinner boomerang background + Live Look In peeks)
 * was rejected because it adds runtime dependencies that aren't in the
 * current package scope. Differentiated gives genuine distinction
 * inside tokens that ship in @aims/brand-tokens today.
 *
 * Pre-mortem blacklist the render must NOT match:
 *   - Gradient hero + feature grid
 *   - Centered pill CTA + three-column
 *   - Default shadcn spacing / Inter
 *   - A landing that could belong to Vercel / Linear / any other SaaS
 *
 * Accessibility: each half is a semantic <button>. Visible focus rings
 * are neon and match hover. Below 768px, the split collapses vertically
 * with the wordmark pinned to the top.
 *
 * Uses classes from @aims/brand-tokens Tailwind preset
 * (text-deploy-neon, bg-deploy-bg-deep, text-deploy-text,
 * text-deploy-text-muted, font-wordmark, font-body, font-display,
 * shadow-deploy-neon). Consumer app must have the preset applied.
 */

import * as React from 'react';

export interface HomeHeroProps {
  /** Fires when the user picks the hands-off "Manage it" mode. */
  onManage?: () => void;
  /** Fires when the user picks the collaborative "Guide me" mode. */
  onGuide?: () => void;
  /** Optional wordmark override for whitelabel surfaces — defaults to canon. */
  wordmark?: string;
}

type ActiveMode = 'manage' | 'guide' | null;

export function HomeHero({
  onManage,
  onGuide,
  wordmark = 'Deploy by: ACHIEVEMOR',
}: HomeHeroProps): React.ReactElement {
  const [active, setActive] = React.useState<ActiveMode>(null);

  // Split the wordmark on the canonical colon so we can color it.
  // "Deploy by:" + " ACHIEVEMOR".
  const colonIndex = wordmark.indexOf(':');
  const wordmarkPrefix =
    colonIndex >= 0 ? wordmark.slice(0, colonIndex) : wordmark;
  const wordmarkSuffix = colonIndex >= 0 ? wordmark.slice(colonIndex + 1) : '';

  const halfClass = (mode: 'manage' | 'guide') => {
    const base =
      'relative flex min-h-[50vh] flex-1 cursor-pointer flex-col items-start justify-end ' +
      'gap-4 px-8 py-14 text-left transition-all duration-500 ease-out ' +
      'focus:outline-none focus-visible:ring-2 focus-visible:ring-deploy-neon focus-visible:ring-offset-0 ' +
      'md:min-h-screen md:px-16 md:py-20';
    const dimmed = active !== null && active !== mode ? 'opacity-60' : 'opacity-100';
    const framed =
      active === mode
        ? 'border border-deploy-neon shadow-deploy-neon'
        : 'border border-transparent';
    return `${base} ${dimmed} ${framed}`;
  };

  const headlineClass = (mode: 'manage' | 'guide') =>
    'font-display text-[clamp(2.25rem,5vw,4.5rem)] leading-[1.02] tracking-[0.02em] ' +
    'uppercase text-deploy-text transition-transform duration-500 ease-out ' +
    (active === mode ? 'scale-[1.02]' : 'scale-100');

  return (
    <section
      className="relative flex min-h-screen w-full flex-col bg-deploy-bg-deep text-deploy-text font-body md:flex-row"
      aria-label="Deploy by ACHIEVEMOR — choose how to engage"
    >
      {/* Wordmark — top center, spans the divider on md+ */}
      <div
        className="pointer-events-none absolute left-1/2 top-6 z-10 -translate-x-1/2 select-none md:top-10"
        aria-hidden="false"
      >
        <h1 className="font-wordmark text-[clamp(1.5rem,3vw,2.5rem)] leading-none tracking-wide text-deploy-text">
          <span>{wordmarkPrefix}</span>
          {colonIndex >= 0 && (
            <>
              <span className="text-deploy-neon">:</span>
              <span>{wordmarkSuffix}</span>
            </>
          )}
        </h1>
      </div>

      {/* LEFT — Let ACHEEVY manage it */}
      <button
        type="button"
        onClick={onManage}
        onMouseEnter={() => setActive('manage')}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive('manage')}
        onBlur={() => setActive(null)}
        aria-label="Let ACHEEVY manage it — hands-off autonomous mode"
        className={halfClass('manage')}
      >
        <span className="font-body text-xs tracking-[0.24em] text-deploy-text-muted uppercase">
          Hands off
        </span>
        <span className={headlineClass('manage')}>
          Let ACHEEVY<br />manage it.
        </span>
        <span className="mt-2 max-w-[40ch] font-body text-base text-deploy-text-muted">
          ACHEEVY walks ahead of you. Risk and security gates come back for
          approval; everything else runs.
        </span>
        <span
          className={
            'mt-6 inline-flex items-center gap-3 font-body text-sm tracking-[0.12em] uppercase ' +
            (active === 'manage' ? 'text-deploy-neon' : 'text-deploy-text-muted')
          }
          aria-hidden="true"
        >
          <span>Engage</span>
          <span className="inline-block h-px w-10 bg-current" />
        </span>
      </button>

      {/* Divider (md+ only) */}
      <div
        className="hidden w-px self-stretch bg-deploy-border-subtle md:block"
        aria-hidden="true"
      />

      {/* RIGHT — Let ACHEEVY guide me */}
      <button
        type="button"
        onClick={onGuide}
        onMouseEnter={() => setActive('guide')}
        onMouseLeave={() => setActive(null)}
        onFocus={() => setActive('guide')}
        onBlur={() => setActive(null)}
        aria-label="Let ACHEEVY guide me — collaborative mode"
        className={halfClass('guide') + ' items-end text-right md:items-end'}
      >
        <span className="font-body text-xs tracking-[0.24em] text-deploy-text-muted uppercase">
          Alongside you
        </span>
        <span className={headlineClass('guide')}>
          Let ACHEEVY<br />guide me.
        </span>
        <span className="mt-2 max-w-[40ch] font-body text-base text-deploy-text-muted">
          In-session approvals at every gate. Micro-confirmations logged.
          You stay in the chair.
        </span>
        <span
          className={
            'mt-6 inline-flex items-center gap-3 font-body text-sm tracking-[0.12em] uppercase ' +
            (active === 'guide' ? 'text-deploy-neon' : 'text-deploy-text-muted')
          }
          aria-hidden="true"
        >
          <span className="inline-block h-px w-10 bg-current" />
          <span>Engage</span>
        </span>
      </button>
    </section>
  );
}
