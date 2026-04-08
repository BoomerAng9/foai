/**
 * @aims/pricing-matrix
 * ====================
 * Canonical pricing & catalog package for the A.I.M.S. ecosystem.
 *
 * Replaces scattered MODELS objects across:
 *   - AIMS/backend/uef-gateway/src/llm/openrouter.ts
 *   - AIMS/backend/uef-gateway/src/llm/vertex-ai.ts
 *   - foai/SmelterOS/apps/web/src/lib/openrouter/client.ts
 *
 * Public API:
 *   - getMatrix()           — full validated matrix (cached)
 *   - reloadMatrix()        — bust cache (use after Neon updates)
 *   - getMatrixStats()      — health/metrics
 *   - get*By*()             — typed lookups (see queries.ts)
 *   - effectiveMultiplier() — task-mix weighted multiplier
 *   - getFreeTierModels()   — for the reasoning-stream free-model rule
 *   - getLatestImageModels()/getLatestVideoModels() — latest-only enforcement
 *
 * Phase 1 (this scaffold): in-memory seed loader.
 * Phase 2: Neon-backed loader with LISTEN/NOTIFY hot reload.
 * Phase 3: Owner edit mode + audit history (writes to aims_pricing_history).
 */

export * from './types.js';
export * from './schema.js';
export * from './loader.js';
export * from './neon-loader.js';
export * from './client.js';
export * from './queries.js';
export * from './compliance-gate.js';
export { SEED_MODELS } from './seed-models.js';
export { SEED_PLANS } from './seed-plans.js';
export { SEED_PILLARS } from './seed-pillars.js';
export { SEED_TASK_MULTIPLIERS } from './seed-multipliers.js';
