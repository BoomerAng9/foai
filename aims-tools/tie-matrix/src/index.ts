/**
 * @aims/tie-matrix
 * =================
 * Canonical Talent & Innovation Engine (TIE) matrix for the A.I.M.S. ecosystem.
 *
 * Cross-vertical grading system. Mirrors the partition/compartment pattern
 * of @aims/pricing-matrix. One numeric scale, six verticals, vertical-specific
 * vocabulary enforced at the routing boundary.
 *
 * Consumers:
 *   - Per|Form (SPORTS): player grading, draft projections
 *   - OpenKlassAI (WORKFORCE, STUDENT): career readiness, recruit index
 *   - ACHIEVEMOR (CONTRACTOR): contract readiness
 *   - Deploy Platform (FOUNDER): build readiness
 *   - Broad|Cast (CREATIVE): production grade
 *
 * Public API:
 *   - getMatrix() / reloadMatrix() — load & cache
 *   - getGradeForScore() / getGradeColor()
 *   - getVerticalConfig() / getVerticalTierLabel()
 *   - getPrimeSubTag() / getVersatilityBonus()
 *   - formatGradeDisplay()
 *   - assertVertical() — routing boundary enforcement
 *   - buildTIEResult() — canonical 40/30/30 result builder
 */

export * from './types.js';
export * from './schema.js';
export * from './loader.js';
export * from './queries.js';
export { SEED_GRADES } from './seed-grades.js';
export { SEED_VERTICALS, SEED_LABELS_BY_VERTICAL } from './seed-verticals.js';
export { SEED_PRIME_SUB_TAGS, SEED_VERSATILITY_BONUSES } from './seed-prime-subtags.js';
