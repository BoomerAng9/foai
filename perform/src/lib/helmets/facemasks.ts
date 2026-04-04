export type FacemaskType = 'open' | 'skill' | 'cage';

/**
 * Returns the facemask type appropriate for a given position.
 * - open: QB gets maximum visibility (2-bar style)
 * - skill: WR, CB, S, RB, LB, TE — moderate protection with good sightlines
 * - cage: OL, DL, DT, DE, EDGE — full cage for maximum protection
 */
export function getFacemaskForPosition(position: string): FacemaskType {
  const p = position?.toUpperCase() || '';
  if (['QB'].includes(p)) return 'open';
  if (['WR', 'CB', 'S', 'FS', 'SS', 'K', 'P'].includes(p)) return 'skill';
  if (['RB', 'LB', 'ILB', 'OLB', 'TE'].includes(p)) return 'skill';
  // OL, OT, OG, C, DL, DT, DE, EDGE, NT = cage
  return 'cage';
}
