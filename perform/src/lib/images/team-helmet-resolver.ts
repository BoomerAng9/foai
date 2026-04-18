/**
 * Team Helmet Resolver
 * =====================
 * Routes a player row to the correct helmet/uniform color palette for the
 * card prompt engine. Obeys two canon rules:
 *
 *   1. Sacred separation: the grading scale itself is never revealed on
 *      the card — only the canonical tier label + badge from @aims/tie-matrix.
 *   2. Helmet-on, no face: the card prompt engine (card-styles.ts) already
 *      enforces "helmet with reflective BLACK MIRROR visor, face hidden"
 *      in every athleteVisual() state. This resolver provides the COLORS
 *      that go into the helmet + jersey description — college pre-draft,
 *      NFL team post-draft, same player row, atomic swap.
 *
 * Input:  a minimal player record (id, school, drafted_by_team optional)
 * Output: { context, colorPhrase, helmetPhrase, abbreviation? } for prompts
 *
 * Post-draft swap happens the instant `drafted_by_team` is populated in
 * `perform_players` — downstream cache keys should include the resolver
 * output hash (see T3).
 */

import { getNflTeamColors, type NFLTeamColors } from '@/lib/draft/nfl-teams';

export type HelmetContext = 'college' | 'nfl';

export interface HelmetResolution {
  context: HelmetContext;
  /** Natural-language color phrase used inside the card prompt. */
  colorPhrase: string;
  /** Helmet-specific descriptor: shell + stripe shape, no team marks. */
  helmetPhrase: string;
  /** NFL abbreviation when context === 'nfl'; undefined otherwise. */
  abbreviation?: string;
  /** Source record for debugging — not for prompt injection. */
  source: 'nfl_team_colors' | 'college_fallback' | 'generic_fallback';
}

export interface HelmetResolverInput {
  school?: string | null;
  drafted_by_team?: string | null;
  /** Optional pre-resolved college color phrase, if the player row already
   *  carries it (e.g., legacy data). Ignored when drafted_by_team is set. */
  college_color_phrase?: string | null;
}

/**
 * Resolve the helmet/uniform visual context for a player card prompt.
 *
 * - If `drafted_by_team` is a valid NFL abbreviation, returns the NFL colors
 *   and helmet phrase from NFL_TEAM_COLORS. This is the "reveal → NFL" state.
 * - Otherwise falls back to college colors (either provided via
 *   `college_color_phrase`, or a generic tactical-grade descriptor).
 *
 * Never throws. Always returns a usable descriptor so the card renders
 * even with partial data.
 */
export function resolveHelmet(input: HelmetResolverInput): HelmetResolution {
  const nfl: NFLTeamColors | null = getNflTeamColors(input.drafted_by_team ?? null);

  if (nfl) {
    return {
      context: 'nfl',
      colorPhrase: nfl.colorPhrase,
      helmetPhrase: nfl.helmet,
      abbreviation: input.drafted_by_team ?? undefined,
      source: 'nfl_team_colors',
    };
  }

  if (input.college_color_phrase && input.college_color_phrase.trim().length > 0) {
    return {
      context: 'college',
      colorPhrase: input.college_color_phrase,
      helmetPhrase: `${input.college_color_phrase} helmet shell with a minimal geometric stripe (no team marks)`,
      source: 'college_fallback',
    };
  }

  // Generic fallback: use a representative college-prospect palette, no
  // invented logos or names. Card-styles.ts will still enforce no-face and
  // no-logos in the prompt.
  return {
    context: 'college',
    colorPhrase: 'deep crimson and gold (representative college palette)',
    helmetPhrase: 'matte helmet shell with a single clean stripe (no team marks, no decals)',
    source: 'generic_fallback',
  };
}

/**
 * Cache key fragment for card render invalidation. When `drafted_by_team`
 * flips during live draft coverage, this key changes — callers should
 * include it in any Recraft/Ideogram render cache.
 */
export function helmetCacheKey(input: HelmetResolverInput): string {
  if (input.drafted_by_team) return `nfl:${input.drafted_by_team}`;
  if (input.college_color_phrase) {
    // Stable short hash: strip non-alnum, lowercase, cap at 24 chars.
    return `college:${input.college_color_phrase.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24)}`;
  }
  return 'college:generic';
}
