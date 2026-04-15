/**
 * Re-export every type from @aims/pricing-matrix.
 *
 * This file used to host a hand-maintained 287-line clone. Wiring it
 * to the canonical package eliminates schema drift between cti-hub
 * and the rest of the ecosystem.
 *
 * Adding new types / editing schemas → edit
 * `foai/aims-tools/aims-pricing-matrix/src/types.ts`, NOT here.
 */
export type {
  PricingRow,
  Sector,
  Tier,
  Capability,
  RowType,
  BundleRow,
  TaskMultiplier,
  AimsPricingMatrix,
} from '@aims/pricing-matrix';
