/**
 * Re-export from canonical @aims/pricing-matrix.
 *
 * This file used to host a hand-maintained 566-line clone of the
 * SEED_MODELS catalog. Per "foai = SOURCE OF TRUTH" memory + the
 * Gate 4 wiring directive, the canonical source of truth is
 * `@aims/pricing-matrix`. Importing here keeps every existing
 * cti-hub call-site working with a one-line change.
 *
 * Adding new models / editing pricing → edit
 * `foai/aims-tools/aims-pricing-matrix/src/seed-models.ts`, NOT here.
 */
export { SEED_MODELS } from '@aims/pricing-matrix';
