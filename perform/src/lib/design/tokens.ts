/* ═══════════════════════════════════════════════════════════════════
   Per|Form Design Tokens — Agentic Design System
   Position-group colors, brand palette, and surface tokens.
   ═══════════════════════════════════════════════════════════════════ */

export const COLORS = {
  // Position group colors (from Agentic DS)
  QB:   { primary: '#E74C3C', light: '#FADBD8', dark: '#922B21' },
  RB:   { primary: '#27AE60', light: '#D5F5E3', dark: '#1E8449' },
  WR:   { primary: '#8E44AD', light: '#E8DAEF', dark: '#6C3483' },
  TE:   { primary: '#E67E22', light: '#FDEBD0', dark: '#CA6F1E' },
  OL:   { primary: '#2980B9', light: '#D4E6F1', dark: '#1F618D' },
  OT:   { primary: '#2980B9', light: '#D4E6F1', dark: '#1F618D' },
  IOL:  { primary: '#2980B9', light: '#D4E6F1', dark: '#1F618D' },
  EDGE: { primary: '#C0392B', light: '#F5B7B1', dark: '#922B21' },
  DT:   { primary: '#E91E63', light: '#F8BBD0', dark: '#AD1457' },
  LB:   { primary: '#00BCD4', light: '#B2EBF2', dark: '#00838F' },
  CB:   { primary: '#FF9800', light: '#FFE0B2', dark: '#E65100' },
  S:    { primary: '#8BC34A', light: '#DCEDC8', dark: '#558B2F' },

  // Brand
  gold: '#D4A853',
  goldDim: 'rgba(212,168,83,0.5)',
  goldGlow: 'rgba(212,168,83,0.08)',
  goldBorder: 'rgba(212,168,83,0.2)',
  goldBorderStrong: 'rgba(212,168,83,0.4)',

  // Surfaces
  bg: '#0A0A0F',
  surface: '#111118',
  elevated: '#1A1A24',

  // Neutrals (Agentic DS)
  N100: '#FAFAFA',
  N200: '#E0E0E0',
  N300: '#BDBDBD',
  N400: '#757575',
  N500: '#424242',
  N600: '#212121',
} as const;

/** Look up a position color set; falls back to neutral gray */
export function positionColor(pos: string) {
  const key = pos?.toUpperCase() as keyof typeof COLORS;
  const found = COLORS[key];
  if (found && typeof found === 'object' && 'primary' in found) return found;
  return { primary: '#6B7280', light: '#E5E7EB', dark: '#374151' };
}

/** NFL team primary colors for the first-round badge strip */
export const NFL_TEAM_COLORS: Record<string, string> = {
  LV: '#A5ACAF', NYJ: '#125740', ARI: '#97233F', TEN: '#4B92DB',
  NYG: '#0B2265', CLE: '#FF3C00', CAR: '#0085CA', NE: '#002244',
  NO: '#D3BC8D', CHI: '#0B162A', SF: '#AA0000', DAL: '#003594',
  MIA: '#008E97', CIN: '#FB4F14', IND: '#002C5F', JAX: '#006778',
  SEA: '#002244', ATL: '#A71930', LAC: '#0080C6', HOU: '#03202F',
  PIT: '#FFB612', DEN: '#FB4F14', GB: '#203731', MIN: '#4F2683',
  TB: '#D50A0A', LAR: '#003594', BAL: '#241773', DET: '#0076B6',
  BUF: '#00338D', WAS: '#5A1414', PHI: '#004C54', KC: '#E31837',
};
