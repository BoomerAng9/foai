/**
 * GradeDisplay
 * =============
 * THE unified grade rendering component. Reads canonical bands, labels,
 * and colors from @aims/tie-matrix. Replaces per-page inline grade
 * pills and the two legacy badge components for plain grade display.
 *
 * Variants:
 *   - `minimal`   — letter + icon only, inline  ("A+ 🚀")
 *   - `badge`     — pill shape, color-coded, no label text
 *   - `full`      — pill + vertical tier label + context subtext
 *
 * Props:
 *   - score      — numeric 0-107+ (required)
 *   - vertical   — TIE vertical (default SPORTS)
 *   - variant    — display mode (default 'badge')
 *   - primeSubTags — optional Prime tags (rendered after grade in full/minimal)
 *   - className  — additional wrapper classes
 */

'use client';

import {
  getGradeForScore,
  getVerticalTierLabel,
  getPrimeSubTag,
  type PrimeSubTag,
  type Vertical,
} from '@aims/tie-matrix';

type Variant = 'minimal' | 'badge' | 'full';

export interface GradeDisplayProps {
  score: number;
  vertical?: Vertical;
  variant?: Variant;
  primeSubTags?: PrimeSubTag[];
  className?: string;
}

export function GradeDisplay({
  score,
  vertical = 'SPORTS',
  variant = 'badge',
  primeSubTags,
  className = '',
}: GradeDisplayProps) {
  const band = getGradeForScore(score);
  const tierLabel = getVerticalTierLabel(band.tier, vertical);
  const showPrime = score >= 101 && primeSubTags && primeSubTags.length > 0;

  if (variant === 'minimal') {
    return (
      <span className={className} style={{ color: band.badgeColor, fontWeight: 600 }}>
        {band.grade} {band.icon}
        {showPrime && (
          <span style={{ marginLeft: 4 }}>
            {primeSubTags!.map((t) => getPrimeSubTag(t).icon).join(' ')}
          </span>
        )}
      </span>
    );
  }

  const pill = (
    <span
      className={variant === 'badge' ? className : ''}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px',
        borderRadius: 999,
        background: `${band.badgeColor}22`,
        border: `1px solid ${band.badgeColor}`,
        color: band.badgeColor,
        fontWeight: 700,
        fontSize: 12,
        letterSpacing: 0.5,
        whiteSpace: 'nowrap',
      }}
    >
      <span aria-hidden>{band.icon}</span>
      <span>{band.grade}</span>
      {showPrime && (
        <span aria-hidden style={{ opacity: 0.85 }}>
          {primeSubTags!.map((t) => getPrimeSubTag(t).icon).join(' ')}
        </span>
      )}
    </span>
  );

  if (variant === 'badge') return pill;

  return (
    <div className={className} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {pill}
        <span style={{ color: 'var(--pf-text)', fontWeight: 600, fontSize: 13 }}>
          {tierLabel.label}
        </span>
      </div>
      <span style={{ color: 'var(--pf-muted, #94a3b8)', fontSize: 11 }}>
        {tierLabel.context}
      </span>
    </div>
  );
}

export default GradeDisplay;
