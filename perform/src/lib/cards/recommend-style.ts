/**
 * lib/cards/recommend-style.ts
 * =============================
 * Maps a TIE tier + sport to a recommended card style. The customer
 * card generator uses this so the visual matches the grade — Prime
 * scores get Mythic Gold, A+ gets Blueprint, etc.
 *
 * Users can override; this is the default pick.
 */

import type { TIETier } from '@aims/tie-matrix';
import type { AnyCardStyle, Sport } from '@/lib/images/card-aesthetics';

const TIER_DEFAULTS: Record<TIETier, AnyCardStyle> = {
  PRIME:    'mythic_gold',
  A_PLUS:   'inhuman_emergence',
  A:        'blueprint',
  A_MINUS:  'broadcast_espn',
  B_PLUS:   'blue_chip',
  B:        'classic_silver',
  B_MINUS:  'animal_archetype',
  C_PLUS:   'retro_topps',
  C:        'hs_recruit',
};

/** Multi-sport overrides — when a sport has a more flattering style. */
const SPORT_NUDGES: Partial<Record<Sport, Partial<Record<TIETier, AnyCardStyle>>>> = {
  flag_football: { B: 'flag_football', C: 'flag_football' },
  football:      { A_PLUS: 'draft_night' },
};

export function recommendCardStyle(tier: TIETier, sport: Sport = 'football'): AnyCardStyle {
  const nudge = SPORT_NUDGES[sport]?.[tier];
  return nudge ?? TIER_DEFAULTS[tier];
}
