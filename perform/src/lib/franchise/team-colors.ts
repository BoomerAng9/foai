/**
 * Team color themes for all 92 professional teams (32 NFL + 30 NBA + 30 MLB).
 * Used by TeamTheme and TeamWallArt components.
 */

import type { Sport } from './types';
import { ALL_TEAMS } from './teams';

export interface TeamTheme {
  primary: string;
  secondary: string;
  accent: string;
  textColor: string;
  gradient: string;
}

/**
 * Get the visual theme for a specific team.
 * Falls back to default gold/dark theme if team not found.
 */
export function getTeamTheme(sport: Sport, abbr: string): TeamTheme {
  const team = ALL_TEAMS[sport]?.find(t => t.abbreviation === abbr);

  if (!team) {
    return {
      primary: '#D4A853',
      secondary: '#1a1a2e',
      accent: '#D4A853',
      textColor: '#FFFFFF',
      gradient: 'linear-gradient(135deg, rgba(212,168,83,0.12) 0%, rgba(10,10,15,0) 60%)',
    };
  }

  return {
    primary: team.primaryColor,
    secondary: team.secondaryColor,
    accent: team.secondaryColor,
    textColor: team.textColor,
    gradient: `linear-gradient(135deg, ${team.primaryColor}1F 0%, ${team.secondaryColor}0A 40%, transparent 70%)`,
  };
}

/**
 * Generate CSS custom properties for a team theme.
 * Apply these to any container element via style attribute.
 */
export function getTeamCSSVars(sport: Sport, abbr: string): Record<string, string> {
  const theme = getTeamTheme(sport, abbr);
  return {
    '--team-primary': theme.primary,
    '--team-secondary': theme.secondary,
    '--team-accent': theme.accent,
    '--team-text': theme.textColor,
    '--team-gradient': theme.gradient,
    '--team-primary-8': `${theme.primary}14`,
    '--team-primary-12': `${theme.primary}1F`,
    '--team-primary-20': `${theme.primary}33`,
  };
}
