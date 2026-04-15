/**
 * SamplePreview
 * ==============
 * Lightweight SEO-friendly card preview. Pure CSS/SVG — no remote
 * image generation, no client-side JS required to render. Used on
 * /cards index, per-style sample pages, and the result step of the
 * /cards/generate flow before the user opts into a download.
 *
 * Reads grade band/icon/color from @aims/tie-matrix so styling stays
 * aligned with every other surface.
 */

import {
  getGradeForScore,
  getVerticalTierLabel,
  type Vertical,
} from '@aims/tie-matrix';
import { positionColor, positionLabel } from '@/lib/ui/positions';

interface Props {
  name: string;
  position: string;
  school: string;
  sport: string;
  jerseyNumber?: number;
  score: number;
  styleName: string;
  vertical?: Vertical;
}

export function SamplePreview({
  name,
  position,
  school,
  sport,
  jerseyNumber,
  score,
  styleName,
  vertical = 'SPORTS',
}: Props) {
  const band = getGradeForScore(score);
  const tierLabel = getVerticalTierLabel(band.tier, vertical);
  const posColor = positionColor(position);
  const posLabel = positionLabel(position);

  return (
    <article
      style={{
        position: 'relative',
        width: '100%',
        maxWidth: 360,
        aspectRatio: '3 / 4',
        borderRadius: 18,
        overflow: 'hidden',
        background: `linear-gradient(160deg, var(--pf-navy) 0%, var(--pf-navy-deep) 60%, ${band.badgeColor}26 100%)`,
        border: `1.5px solid ${band.badgeColor}`,
        boxShadow: `0 0 30px ${band.badgeColor}33, 0 8px 32px rgba(0,0,0,0.4)`,
        color: 'var(--pf-text)',
        fontFamily: 'Outfit, Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
      }}
    >
      {/* Top strip — style + grade pill */}
      <header
        style={{
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 800,
            letterSpacing: '0.18em',
            color: 'var(--pf-gold)',
            textTransform: 'uppercase',
          }}
        >
          {styleName}
        </span>
        <span
          aria-label={`${band.grade} ${tierLabel.label}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            padding: '3px 9px',
            borderRadius: 999,
            background: `${band.badgeColor}22`,
            border: `1px solid ${band.badgeColor}`,
            color: band.badgeColor,
            fontWeight: 800,
            fontSize: 12,
          }}
        >
          <span aria-hidden>{band.icon}</span>
          <span>{band.grade}</span>
        </span>
      </header>

      {/* Middle — silhouette + jersey number, large position color block */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div
          aria-hidden
          style={{
            position: 'absolute',
            inset: 0,
            background: `radial-gradient(circle at 50% 38%, ${posColor}55 0%, transparent 65%)`,
          }}
        />
        {jerseyNumber !== undefined && (
          <div
            style={{
              position: 'relative',
              fontSize: 116,
              fontWeight: 900,
              lineHeight: 1,
              color: 'rgba(255,255,255,0.95)',
              textShadow: `0 0 20px ${posColor}88`,
              letterSpacing: '-0.04em',
            }}
          >
            {jerseyNumber}
          </div>
        )}
      </div>

      {/* Footer — name, position color tag, school */}
      <footer
        style={{
          padding: '12px 14px',
          background: 'rgba(0,0,0,0.45)',
          borderTop: `2px solid ${band.badgeColor}`,
          display: 'flex',
          flexDirection: 'column',
          gap: 4,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: 'space-between',
          }}
        >
          <h3
            style={{
              fontSize: 18,
              fontWeight: 800,
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.1,
            }}
          >
            {name}
          </h3>
          <span
            style={{
              fontSize: 10,
              fontWeight: 800,
              padding: '2px 6px',
              borderRadius: 4,
              background: `${posColor}22`,
              color: posColor,
              border: `1px solid ${posColor}55`,
              letterSpacing: '0.1em',
            }}
            title={posLabel}
          >
            {position.toUpperCase()}
          </span>
        </div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: 11,
            color: 'rgba(255,255,255,0.65)',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          <span>{school}</span>
          <span>{sport.replace('_', ' ')}</span>
        </div>
        <div
          style={{
            fontSize: 11,
            color: band.badgeColor,
            fontWeight: 700,
            marginTop: 2,
            letterSpacing: '0.05em',
          }}
        >
          {tierLabel.label} · {tierLabel.context}
        </div>
      </footer>
    </article>
  );
}

export default SamplePreview;
