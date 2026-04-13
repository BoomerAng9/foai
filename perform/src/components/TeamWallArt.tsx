'use client';

/**
 * TeamWallArt — Large team logo/identifier as a "wall art" background element.
 * CSS-only for MVP — renders the team abbreviation as a massive semi-transparent
 * background element with sport-specific styling cues.
 *
 * NFL: Bold slab-serif style (helmet feel)
 * NBA: Rounded dynamic style (logo feel)
 * MLB: Italic script style (cap feel)
 */

import { useMemo } from 'react';
import { getTeamTheme } from '@/lib/franchise/team-colors';
import type { Sport } from '@/lib/franchise/types';

interface TeamWallArtProps {
  sport: Sport;
  teamAbbr: string;
  /** Position override: 'center' | 'top-right' | 'bottom-left' */
  position?: 'center' | 'top-right' | 'bottom-left';
  /** Opacity (0-1), default 0.05 */
  opacity?: number;
  /** Size class: 'sm' | 'md' | 'lg', default 'lg' */
  size?: 'sm' | 'md' | 'lg';
}

const POSITION_CLASSES: Record<string, string> = {
  center: 'inset-0 flex items-center justify-center',
  'top-right': 'top-0 right-0 flex items-start justify-end pr-8 pt-8',
  'bottom-left': 'bottom-0 left-0 flex items-end justify-start pl-8 pb-8',
};

const SIZE_CLASSES: Record<string, string> = {
  sm: 'text-[15vw]',
  md: 'text-[22vw]',
  lg: 'text-[30vw]',
};

/**
 * Sport-specific font styling to evoke the feel of each sport's branding.
 */
function getSportStyle(sport: Sport): React.CSSProperties {
  switch (sport) {
    case 'nfl':
      return {
        fontFamily: '"Outfit", "Impact", sans-serif',
        fontWeight: 900,
        fontStyle: 'normal',
        letterSpacing: '-0.04em',
      };
    case 'nba':
      return {
        fontFamily: '"Outfit", "Arial Black", sans-serif',
        fontWeight: 800,
        fontStyle: 'normal',
        letterSpacing: '-0.02em',
      };
    case 'mlb':
      return {
        fontFamily: '"Outfit", "Georgia", serif',
        fontWeight: 700,
        fontStyle: 'italic',
        letterSpacing: '0.01em',
      };
  }
}

export function TeamWallArt({
  sport,
  teamAbbr,
  position = 'center',
  opacity = 0.05,
  size = 'lg',
}: TeamWallArtProps) {
  const theme = useMemo(() => getTeamTheme(sport, teamAbbr), [sport, teamAbbr]);
  const sportStyle = useMemo(() => getSportStyle(sport), [sport]);

  return (
    <div
      className={`absolute ${POSITION_CLASSES[position]} pointer-events-none overflow-hidden select-none`}
      aria-hidden="true"
    >
      <span
        className={`${SIZE_CLASSES[size]} leading-none whitespace-nowrap`}
        style={{
          ...sportStyle,
          color: theme.primary,
          opacity,
          transition: 'color 0.6s ease, opacity 0.6s ease',
          textShadow: `0 0 80px ${theme.primary}10`,
        }}
      >
        {teamAbbr}
      </span>
    </div>
  );
}
