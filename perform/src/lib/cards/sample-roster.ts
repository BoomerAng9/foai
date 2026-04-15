/**
 * lib/cards/sample-roster.ts
 * ============================
 * Sample players used to render SEO-indexable card sample pages.
 * NOT real prospects — clearly marked as `sample: true` so they never
 * leak into actual rankings or recruiting workflows.
 *
 * Each style × sport gets at least one sample so /cards/[style] pages
 * have crawlable, search-friendly content from day one.
 */

import type { Sport } from '@/lib/images/card-aesthetics';
import type { TIETier } from '@aims/tie-matrix';

export interface SamplePlayer {
  slug: string;
  name: string;
  position: string;
  school: string;
  sport: Sport;
  classYear: string;
  jerseyNumber: number;
  teamColors: string;
  /** Pillar inputs (0-100) — fed to the TIE engine to produce a real grade. */
  performance: number;
  attributes: number;
  intangibles: number;
  /** Optional pinned tier for narrative — when set we still grade for real, this is just for sorting/grouping. */
  expectedTier?: TIETier;
  bio: string;
}

export const SAMPLE_ROSTER: readonly SamplePlayer[] = [
  // Football
  { slug: 'kade-monroe',     name: 'Kade Monroe',     position: 'QB',   school: 'Westbrook State', sport: 'football',      classYear: '2026', jerseyNumber: 9,  teamColors: 'navy and gold',          performance: 95, attributes: 92, intangibles: 96, expectedTier: 'PRIME',  bio: 'Pocket-precision passer with elite arm talent and a film-room reputation.' },
  { slug: 'darius-vance',    name: 'Darius Vance',    position: 'WR',   school: 'Coastal Tech',    sport: 'football',      classYear: '2026', jerseyNumber: 1,  teamColors: 'crimson and silver',     performance: 88, attributes: 91, intangibles: 84, expectedTier: 'A_PLUS', bio: 'Vertical-threat receiver with rare top-end speed and contested-catch length.' },
  { slug: 'malik-orozco',    name: 'Malik Orozco',    position: 'EDGE', school: 'Foster Hills',    sport: 'football',      classYear: '2026', jerseyNumber: 56, teamColors: 'black and orange',       performance: 86, attributes: 88, intangibles: 82, expectedTier: 'A',       bio: 'Bend-and-burst edge with a developing inside counter and high-motor profile.' },
  { slug: 'theo-blanchard',  name: 'Theo Blanchard',  position: 'OL',   school: 'Riverline U',     sport: 'football',      classYear: '2026', jerseyNumber: 74, teamColors: 'forest and cream',       performance: 78, attributes: 82, intangibles: 80, expectedTier: 'B_PLUS', bio: 'Anchor tackle with elite play strength and balance through contact.' },

  // Basketball
  { slug: 'jaxon-pierre',    name: 'Jaxon Pierre',    position: 'PG',   school: 'Westbrook State', sport: 'basketball',    classYear: '2026', jerseyNumber: 3,  teamColors: 'navy and gold',          performance: 90, attributes: 86, intangibles: 92, expectedTier: 'A_PLUS', bio: 'Floor general with elite court vision and unflappable late-clock decision making.' },
  { slug: 'omari-lake',      name: 'Omari Lake',      position: 'SF',   school: 'Coastal Tech',    sport: 'basketball',    classYear: '2026', jerseyNumber: 7,  teamColors: 'crimson and silver',     performance: 84, attributes: 89, intangibles: 80, expectedTier: 'A',       bio: 'Switchable wing with a rising perimeter shot and high-feel passing.' },

  // Baseball
  { slug: 'remy-castillo',   name: 'Remy Castillo',   position: 'P',    school: 'Foster Hills',    sport: 'baseball',      classYear: '2026', jerseyNumber: 21, teamColors: 'black and orange',       performance: 91, attributes: 87, intangibles: 89, expectedTier: 'A_PLUS', bio: 'Three-pitch starter with command-first profile and bulldog mound presence.' },

  // Soccer
  { slug: 'isak-lindholm',   name: 'Isak Lindholm',   position: 'ST',   school: 'Riverline U',     sport: 'soccer',        classYear: '2026', jerseyNumber: 9,  teamColors: 'forest and cream',       performance: 89, attributes: 88, intangibles: 86, expectedTier: 'A',       bio: 'Two-footed striker with elite first touch in the box and tireless pressing.' },

  // Track / Multi
  { slug: 'nina-okafor',     name: 'Nina Okafor',     position: 'SP',   school: 'Westbrook State', sport: 'track',         classYear: '2026', jerseyNumber: 0,  teamColors: 'navy and gold',          performance: 93, attributes: 95, intangibles: 90, expectedTier: 'PRIME',  bio: 'World-junior class sprinter with explosive block start and championship temperament.' },

  // Flag football (multi-sport showcase)
  { slug: 'ari-takahashi',   name: 'Ari Takahashi',   position: 'WR',   school: 'Coastal Tech',    sport: 'flag_football', classYear: '2026', jerseyNumber: 11, teamColors: 'crimson and silver',     performance: 82, attributes: 84, intangibles: 88, expectedTier: 'B_PLUS', bio: 'Route-tech wizard who wins with separation and after-catch creativity.' },
];

export function sampleBySlug(slug: string): SamplePlayer | undefined {
  return SAMPLE_ROSTER.find((p) => p.slug === slug);
}

export function samplesBySport(sport: Sport): SamplePlayer[] {
  return SAMPLE_ROSTER.filter((p) => p.sport === sport);
}
