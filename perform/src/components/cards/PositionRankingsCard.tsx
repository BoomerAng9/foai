/**
 * PositionRankingsCard
 * =====================
 * Server-renderable CSS/SVG card showing the top 5 prospects at a position
 * group. Data-driven from `perform_players` (caller passes the sorted rows).
 * Zero AI hallucination — every label comes from @aims/tie-matrix or the DB.
 *
 * Two modes:
 *   - `share` (default): 3:4 portrait share graphic with featured player
 *     helmet glyph (no face — uses tactical silhouette badge), rank bars 2–5.
 *   - `embed`:   Compact horizontal module for embedding in /rankings pages.
 *
 * Styling follows Per|Form brand canon: navy/black background,
 * #FF6B00 orange accent line, Bebas-Neue-family bold condensed headers,
 * canonical tier badge colors from getGradeForScore().
 *
 * Branding:
 *   - Per|Form wordmark (pipe character), rendered as text (no AI logo risk)
 *   - Crown-variant hint rendered ONLY when featured.grade >= 101
 *   - NEVER renders "NFL Draft", "Bud Light", or any sponsor copy
 */

import {
  getGradeForScore,
  getVerticalTierLabel,
  type Vertical,
} from '@aims/tie-matrix';

export interface RankingsCardRow {
  name: string;
  school: string;
  position: string;
  overall_rank: number | null;
  grade: number | null;
  drafted_by_team?: string | null;
  jersey_number?: number | null;
}

export interface PositionRankingsCardProps {
  positionGroup: string;          // e.g., "SAFETY", "QUARTERBACK"
  levelLabel: string;              // e.g., "2026 NFL DRAFT"
  players: RankingsCardRow[];      // 1–5 rows, pre-sorted by overall_rank
  analystName?: string;            // optional, e.g., "PER|FORM STAFF"
  mode?: 'share' | 'embed';
  vertical?: Vertical;
  className?: string;
}

const ACCENT = '#FF6B00';   // Per|Form orange
const NAVY = '#0A1426';     // deep navy background
const NAVY_DEEP = '#050A14'; // lowest canvas

export function PositionRankingsCard({
  positionGroup,
  levelLabel,
  players,
  analystName = 'PER|FORM',
  mode = 'share',
  vertical = 'SPORTS',
  className = '',
}: PositionRankingsCardProps) {
  if (players.length === 0) {
    return (
      <div
        className={className}
        style={{
          padding: 20,
          borderRadius: 12,
          background: NAVY_DEEP,
          color: 'rgba(255,255,255,0.6)',
          fontSize: 12,
          textAlign: 'center',
        }}
      >
        No ranked players available for this position.
      </div>
    );
  }

  const featured = players[0];
  const featuredBand = featured.grade != null ? getGradeForScore(featured.grade) : null;
  const featuredTier =
    featuredBand ? getVerticalTierLabel(featuredBand.tier, vertical) : null;
  const showCrown = (featured.grade ?? 0) >= 101;

  // Compact embed variant — horizontal list, no hero glyph
  if (mode === 'embed') {
    return (
      <div
        className={className}
        style={{
          borderRadius: 14,
          background: `linear-gradient(150deg, ${NAVY} 0%, ${NAVY_DEEP} 100%)`,
          border: `1px solid ${ACCENT}44`,
          padding: 16,
          color: 'white',
          fontFamily: 'var(--font-body, Geist, Inter, system-ui, sans-serif)',
        }}
      >
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            marginBottom: 10,
            paddingBottom: 8,
            borderBottom: `1px solid ${ACCENT}33`,
          }}
        >
          <span
            style={{
              fontFamily: 'var(--font-display, "Bebas Neue", Impact, sans-serif)',
              fontSize: 20,
              letterSpacing: 1,
              color: 'white',
            }}
          >
            {analystName} · TOP {players.length}
          </span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: 1.5,
              color: ACCENT,
              fontWeight: 700,
            }}
          >
            {positionGroup.toUpperCase()} · {levelLabel.toUpperCase()}
          </span>
        </div>
        {players.map((p, i) => (
          <RankRow key={`${p.name}-${p.school}`} rank={i + 1} player={p} vertical={vertical} compact />
        ))}
      </div>
    );
  }

  // Share / portrait variant (3:4)
  return (
    <article
      className={className}
      style={{
        position: 'relative',
        aspectRatio: '3 / 4',
        width: '100%',
        maxWidth: 600,
        borderRadius: 18,
        overflow: 'hidden',
        background: `linear-gradient(160deg, ${NAVY} 0%, ${NAVY_DEEP} 70%, ${ACCENT}18 100%)`,
        border: `1.5px solid ${ACCENT}`,
        boxShadow: `0 0 38px ${ACCENT}33, 0 10px 36px rgba(0,0,0,0.55)`,
        color: 'white',
        fontFamily: 'var(--font-body, Geist, Inter, system-ui, sans-serif)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Accent rim top */}
      <div aria-hidden style={{ height: 4, background: ACCENT }} />

      {/* Header block */}
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          padding: '18px 22px 12px',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <span
            style={{
              fontSize: 11,
              letterSpacing: 3,
              fontWeight: 800,
              color: ACCENT,
              marginBottom: 2,
            }}
          >
            {analystName}
          </span>
          <span
            style={{
              fontFamily: 'var(--font-display, "Bebas Neue", Impact, sans-serif)',
              fontSize: 68,
              lineHeight: 0.9,
              letterSpacing: -1,
              color: 'white',
              textTransform: 'uppercase',
            }}
          >
            Top 5
          </span>
          <span
            style={{
              fontSize: 13,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.85)',
              fontWeight: 700,
              marginTop: 4,
            }}
          >
            {positionGroup.toUpperCase()} PROSPECTS
          </span>
          <span
            style={{
              fontSize: 10,
              letterSpacing: 2,
              color: 'rgba(255,255,255,0.5)',
              fontWeight: 600,
              marginTop: 2,
            }}
          >
            {levelLabel.toUpperCase()}
          </span>
        </div>

        {/* Featured hero glyph — anonymous helmet silhouette, no face */}
        <div
          aria-hidden
          style={{
            width: 140,
            height: 140,
            borderRadius: 12,
            background: `radial-gradient(circle at 50% 45%, ${featuredBand?.badgeColor ?? ACCENT}55 0%, transparent 70%)`,
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${featuredBand?.badgeColor ?? ACCENT}55`,
          }}
        >
          {/* Minimal helmet silhouette SVG — tactical, no face, no team mark */}
          <HelmetSilhouette color={featuredBand?.badgeColor ?? ACCENT} crown={showCrown} />
          {featured.jersey_number != null && (
            <span
              style={{
                position: 'absolute',
                bottom: -2,
                right: 6,
                fontSize: 32,
                fontWeight: 900,
                color: 'rgba(255,255,255,0.9)',
                lineHeight: 1,
                textShadow: `0 0 12px ${featuredBand?.badgeColor ?? ACCENT}88`,
              }}
            >
              {featured.jersey_number}
            </span>
          )}
        </div>
      </header>

      {/* Rank bars */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6, padding: '6px 18px 14px' }}>
        {players.map((p, i) => (
          <RankRow
            key={`${p.name}-${p.school}`}
            rank={i + 1}
            player={p}
            vertical={vertical}
            featured={i === 0}
          />
        ))}
      </div>

      {/* Footer strip */}
      <div
        style={{
          borderTop: `1px solid ${ACCENT}33`,
          padding: '10px 22px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.35)',
        }}
      >
        <span
          style={{
            fontSize: 10,
            letterSpacing: 2,
            color: 'rgba(255,255,255,0.55)',
            fontWeight: 700,
          }}
        >
          AT YOUR BEST
        </span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 900,
            letterSpacing: 1,
            color: 'white',
          }}
        >
          Per<span style={{ color: ACCENT }}>|</span>Form
          {showCrown && <span style={{ marginLeft: 4, fontSize: 13 }}>👑</span>}
        </span>
      </div>
    </article>
  );
}

/* ── Sub-components ─────────────────────────────────────────────── */

function RankRow({
  rank,
  player,
  vertical,
  featured = false,
  compact = false,
}: {
  rank: number;
  player: RankingsCardRow;
  vertical: Vertical;
  featured?: boolean;
  compact?: boolean;
}) {
  const band = player.grade != null ? getGradeForScore(player.grade) : null;
  const tier = band ? getVerticalTierLabel(band.tier, vertical) : null;
  const accent = band?.badgeColor ?? ACCENT;

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: compact
          ? '32px 1fr auto'
          : featured
            ? '44px 1fr auto'
            : '36px 1fr auto',
        alignItems: 'center',
        gap: 12,
        padding: compact ? '6px 8px' : featured ? '10px 12px' : '7px 10px',
        borderRadius: 8,
        background: featured ? `${accent}24` : 'rgba(255,255,255,0.04)',
        border: featured ? `1px solid ${accent}` : '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-display, "Bebas Neue", Impact, sans-serif)',
          fontSize: compact ? 22 : featured ? 32 : 24,
          lineHeight: 1,
          color: accent,
          textAlign: 'center',
          fontWeight: 900,
        }}
      >
        {rank}
      </span>
      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <span
          style={{
            fontSize: compact ? 13 : featured ? 17 : 14,
            fontWeight: 800,
            letterSpacing: 0.3,
            color: 'white',
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {player.name}
        </span>
        <span
          style={{
            fontSize: compact ? 10 : 11,
            color: 'rgba(255,255,255,0.6)',
            letterSpacing: 1,
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {player.school}
        </span>
      </div>
      {band && tier && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span
            style={{
              fontSize: compact ? 11 : 12,
              fontWeight: 900,
              color: accent,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <span aria-hidden>{band.icon}</span>
            {band.grade}
          </span>
          {!compact && (
            <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.5)', letterSpacing: 1 }}>
              {tier.label.toUpperCase()}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

function HelmetSilhouette({ color, crown }: { color: string; crown: boolean }) {
  // Minimal tactical helmet glyph — anonymous, no face visible, no team marks.
  // Pure SVG so the card renders identically server-side and client-side.
  return (
    <svg width="90" height="90" viewBox="0 0 100 100" aria-hidden>
      {crown && (
        <path
          d="M30 14 L38 6 L46 14 L54 6 L62 14 L70 6 L66 22 L34 22 Z"
          fill="#FFD700"
          opacity={0.9}
        />
      )}
      {/* Helmet dome */}
      <path
        d="M20 55 Q20 25 50 25 Q80 25 80 55 L80 68 L20 68 Z"
        fill={color}
        opacity={0.85}
      />
      {/* Visor (fully opaque — the "no face" rule) */}
      <rect x="30" y="40" width="40" height="14" rx="3" fill="#000" />
      {/* Facemask bar */}
      <path
        d="M28 62 L72 62 M32 68 L68 68"
        stroke="#111"
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Shoulder pad hint */}
      <path
        d="M12 78 Q50 72 88 78 L88 92 L12 92 Z"
        fill="#111"
        opacity={0.85}
      />
      {/* Accent stripe on helmet */}
      <path
        d="M50 26 L50 55"
        stroke="white"
        strokeWidth="2"
        opacity={0.4}
      />
    </svg>
  );
}

export default PositionRankingsCard;
