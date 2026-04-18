/**
 * Per|Form Position Rankings Card
 * =================================
 * 18th card style. Inspired visually by Bucky Brooks' "Top 5" format (bold
 * position header + numbered ranking bars + featured #1 player on the right)
 * but re-skinned to Per|Form brand canon:
 *
 *   - Per|Form pipe-character wordmark (NOT NFL Draft logo, NOT Bud Light)
 *   - Lion branding — crown variant only for grade >= 101 PRIME featured player
 *   - Helmet-on / no-face rule (facelessRule) enforced for featured player
 *   - No team names or logos — only team colorways and canonical palette
 *   - Canonical TIE tier labels from @aims/tie-matrix (no invented tiers)
 *
 * Two render paths:
 *   1. AI-generated share graphic — `buildPositionRankingsPrompt()` produces
 *      a Recraft V4 / Ideogram V3 prompt for social share assets.
 *   2. CSS/SVG server component — `<PositionRankingsCard>` (in
 *      components/cards/PositionRankingsCard.tsx) renders the live list
 *      from DB data. Zero hallucination, SEO-friendly, tier-label driven.
 *
 * Data contract: caller passes the top-5 rows for a (position, level, class)
 * already sorted by overall_rank ASC. This file never hits the DB.
 */

import { resolveHelmet, type HelmetResolution } from './team-helmet-resolver';

export interface RankedPlayer {
  name: string;
  school: string;
  position: string;
  overall_rank: number;
  grade: number;
  tier: string;                          // canonical TIETier from tie-matrix
  tierLabel: string;                     // label from SPORTS_LABELS
  tierContext: string;                   // context from SPORTS_LABELS
  projection?: string;                   // projection from SPORTS_LABELS
  badgeColor: string;                    // band.badgeColor from tie-matrix
  badgeIcon: string;                     // band.icon emoji
  drafted_by_team?: string | null;
  college_color_phrase?: string | null;
}

export interface PositionRankingsInput {
  positionGroup: string;                 // e.g., "SAFETY", "QUARTERBACK", "WR"
  levelLabel: string;                    // e.g., "2026 NFL Draft", "2027 Recruits"
  players: RankedPlayer[];               // exactly 5 entries, rank 1-5, pre-sorted
  season?: string;                       // e.g., "2026"
}

/**
 * Analyst variant — the card can be attributed to a Per|Form analyst by name
 * (when we want the "X's Top 5" attribution format from the reference image).
 * Leave undefined for a plain Per|Form-branded card.
 */
export interface PositionRankingsAnalyst {
  analystName?: string;                  // e.g., "Per|Form Staff", "The Colonel"
  analystTitle?: string;                 // e.g., "Senior Draft Analyst"
}

/**
 * Build the AI-generated share-graphic prompt. The featured player (#1) is
 * depicted helmet-on / face-hidden per facelessRule. Other ranks appear only
 * as text rows — no portraits. Perfect for 1080x1350 social share.
 */
export function buildPositionRankingsPrompt(
  input: PositionRankingsInput,
  analyst?: PositionRankingsAnalyst,
): { prompt: string; negativePrompt: string; engine: 'ideogram' | 'recraft'; aspectRatio: string } {
  const [featured, ...rest] = input.players;
  if (!featured) throw new Error('position-rankings-card: players[0] required');

  const helmet: HelmetResolution = resolveHelmet({
    school: featured.school,
    drafted_by_team: featured.drafted_by_team,
    college_color_phrase: featured.college_color_phrase,
  });

  const showCrown = featured.grade >= 101;
  const headerAttribution = analyst?.analystName
    ? `${analyst.analystName.toUpperCase()}'S`
    : 'PER|FORM';
  const headerMain = 'TOP 5';
  const headerSubhead = `${input.positionGroup.toUpperCase()} PROSPECTS`;
  const seasonTag = input.season ? ` ${input.season}` : '';

  const bars = rest.map((p, i) => {
    const rank = i + 2; // 2..5
    return `RANK ${rank} BAR: Horizontal ribbon, "${rank}" numeral in dark panel left, "${p.name.toUpperCase()}" bold condensed uppercase, "${p.school.toUpperCase()}" smaller caption below name, subtle ${p.badgeColor} tier-color accent on the right edge.`;
  }).join('\n');

  const prompt = `Per|Form Position Rankings trading-card graphic, portrait 3:4 aspect, social-share ready, broadcast-quality sports composition.

BACKGROUND: Deep navy and black gradient with subtle diagonal halftone texture and faint orange rim glow from bottom-left (Per|Form #FF6B00 accent).

HEADER (top-left, ~40% width): "${headerAttribution}" in smaller bold condensed uppercase; below it "${headerMain}" in MASSIVE bold condensed display type filling the header zone; below it "${headerSubhead}${seasonTag}" in smaller accent-colored caption.

FEATURED SUBJECT (right ~50% of frame): ${helmet.helmetPhrase}, anonymous hero pose holding a football, three-quarter angle, dramatic studio lighting, jersey in ${helmet.colorPhrase}, solid chest panels with no lettering, athletic shoulder pads beneath jersey. The figure bleeds off the right edge. ${showCrown ? 'Subtle golden particle glow around the silhouette signaling PRIME tier.' : ''}

ATHLETE FACE: Hidden behind a reflective BLACK MIRROR visor attached to the full football helmet. Fully opaque visor — ZERO facial features, ZERO expression, ZERO identifiable likeness. Anonymous silhouette only.

RANK 1 BAR (left-center, widest): Horizontal highlight ribbon in ${featured.badgeColor}-tinted accent color, "1" numeral in dark panel left, "${featured.name.toUpperCase()}" bold condensed uppercase, "${featured.school.toUpperCase()}" smaller caption below the name. ${featured.badgeIcon} tier icon small at right edge of the bar.

${bars}

TOP-RIGHT CORNER: Leave a clean dark zone ~140x140 pixels for the Per|Form ${showCrown ? 'crown ' : ''}lion logo overlay (applied in post). Do NOT draw any logos or brand marks.

BOTTOM STRIP: Thin orange Per|Form accent line across the very bottom edge. No tagline text. No presented-by copy.

NEGATIVE / FORBIDDEN: NO NFL shield, NO NFL Draft logo, NO conference marks, NO NCAA marks, NO Bud Light, NO sponsor logos, NO team logos, NO mascot imagery, NO team name text on helmet or jersey, NO fictional network badges, NO open visors, NO visible faces.

TYPOGRAPHY: Bold condensed sans-serif (Bebas Neue family) for headers and names, clean modern sans for captions, all text razor-sharp and correctly spelled. NEVER the word "NFL" anywhere.

STYLE: ESPN broadcast graphic meets Topps Chrome premium trading card, Per|Form tactical-holographic aesthetic, navy/black/orange palette with ${helmet.colorPhrase} team accent on the featured subject only. Social-share production value.`;

  const negativePrompt = 'NFL logo, NFL shield, NFL Draft wordmark, Bud Light, sponsor logos, team logos, mascot logos, conference logos, NCAA marks, letters on helmet, letters on jersey, text on chest, visible face, open visor, blurry text, misspelled text, cartoon, amateur, watermark, garbled letters';

  return {
    prompt,
    negativePrompt,
    engine: 'ideogram', // text-heavy → Ideogram V3 for legible ranked bars
    aspectRatio: '3x4',
  };
}

/**
 * Descriptor for UI pickers (the `listAllCardStyles` integration point).
 */
export const POSITION_RANKINGS_STYLE_DESCRIPTOR = {
  id: 'position_rankings' as const,
  name: 'Position Rankings',
  description: 'Per|Form top-5-at-a-position card. Featured #1 helmet-on, ranks 2–5 in bars. Data-driven.',
  aspectRatio: '3x4' as const,
  engine: 'ideogram' as const,
  tierMatch: 'all' as const,
};
