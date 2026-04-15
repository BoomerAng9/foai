/**
 * lib/ui/positions.ts
 * ====================
 * Canonical position colors + normalization for Per|Form sports surfaces.
 *
 * This is the ONLY place POSITION_GROUPS / POS_COLORS / POSITION_MAP
 * should live. Every page must import from here. Per-page position-color
 * objects are design drift — remove them on sight.
 *
 * Palette: NFL broadcast-aligned (draft/board + rankings heritage).
 * Contrast-tested on --pf-bg (#050507 / #0B1E3F navy).
 */

export interface PositionGroup {
  key: string;
  label: string;
  color: string;
}

export const POSITION_GROUPS = [
  { key: 'QB',   label: 'Quarterbacks',      color: '#D40028' },
  { key: 'RB',   label: 'Running Backs',     color: '#00874C' },
  { key: 'WR',   label: 'Wide Receivers',    color: '#7C3AED' },
  { key: 'TE',   label: 'Tight Ends',        color: '#DC6B19' },
  { key: 'OL',   label: 'Offensive Line',    color: '#0A66E8' },
  { key: 'EDGE', label: 'Edge Rushers',      color: '#8B1A00' },
  { key: 'DT',   label: 'Defensive Tackles', color: '#DC2626' },
  { key: 'LB',   label: 'Linebackers',       color: '#0891B2' },
  { key: 'CB',   label: 'Cornerbacks',       color: '#F59E0B' },
  { key: 'S',    label: 'Safeties',          color: '#84CC16' },
] as const satisfies readonly PositionGroup[];

/** Normalize any raw position label (OT, OG, C, IOL, NT, FS, DE, …) to a group key. */
export const POSITION_MAP: Record<string, string> = {
  QB: 'QB',
  RB: 'RB', FB: 'RB',
  WR: 'WR',
  TE: 'TE',
  OL: 'OL', OT: 'OL', OG: 'OL', C: 'OL', IOL: 'OL',
  EDGE: 'EDGE', DE: 'EDGE',
  DL: 'DT', DT: 'DT', NT: 'DT', IDL: 'DT',
  LB: 'LB', ILB: 'LB', OLB: 'LB',
  CB: 'CB', DB: 'CB',
  S: 'S', FS: 'S', SS: 'S',
};

const FALLBACK_COLOR = '#9CA3AF'; // neutral gray for unknown positions

export function normalizePosition(pos: string | null | undefined): string {
  if (!pos) return 'OTHER';
  return POSITION_MAP[pos.toUpperCase()] ?? pos.toUpperCase();
}

export function positionColor(pos: string | null | undefined): string {
  const norm = normalizePosition(pos);
  const group = POSITION_GROUPS.find((g) => g.key === norm);
  return group?.color ?? FALLBACK_COLOR;
}

export function positionLabel(pos: string | null | undefined): string {
  const norm = normalizePosition(pos);
  const group = POSITION_GROUPS.find((g) => g.key === norm);
  return group?.label ?? 'Other';
}

/** Legacy shape — map of normalized-group-key → color. */
export const POS_COLORS: Record<string, string> = Object.fromEntries(
  POSITION_GROUPS.map((g) => [g.key, g.color]),
);
