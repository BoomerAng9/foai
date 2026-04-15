/**
 * perform/lib/tie/verticals.ts
 * =============================
 * FACADE — re-exports vertical routing primitives from @aims/tie-matrix.
 * Kept so existing `from './verticals'` imports keep working.
 * New code should import from @aims/tie-matrix directly.
 */

export type {
  Vertical,
  VerticalConfig,
  VerticalTierLabel,
} from '@aims/tie-matrix';

export {
  getVerticalConfig,
  getVerticalTierLabel,
  assertVertical,
  SEED_VERTICALS as VERTICAL_CONFIG,
} from '@aims/tie-matrix';

import type { Vertical } from '@aims/tie-matrix';

export const VERTICALS: Vertical[] = [
  'SPORTS',
  'WORKFORCE',
  'STUDENT',
  'CONTRACTOR',
  'FOUNDER',
  'CREATIVE',
];
