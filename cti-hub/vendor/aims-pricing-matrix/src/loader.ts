/**
 * Loader for the A.I.M.S. Pricing Matrix.
 *
 * Phase 1: in-memory seed loader (default — no DB needed)
 * Phase 2: Neon-backed loader with LISTEN/NOTIFY hot reload
 *          (enabled by setting PRICING_USE_NEON=true)
 *
 * Both paths produce the same AimsPricingMatrix shape. Callers use
 * the same getMatrix() / reloadMatrix() public API.
 *
 * Routing:
 *   1. If PRICING_USE_NEON=true → try Neon (cached + LISTEN/NOTIFY)
 *   2. If Neon unavailable or empty → fall back to seed
 *   3. If seed-only → use the seed cache
 *
 * Latest-only enforcement (both paths):
 *   - Image/video model rows MUST have isLatest=true
 *   - Any row with supersededBy set is automatically excluded
 *   - Loader logs (does not throw) when a stale row is rejected
 */

import type { AimsPricingMatrix, PricingRow, BundleRow, TaskMultiplier } from './types.js';
import { AimsPricingMatrixSchema } from './schema.js';
import { SEED_MODELS } from './seed-models.js';
import { SEED_PLANS } from './seed-plans.js';
import { SEED_PILLARS } from './seed-pillars.js';
import { SEED_TASK_MULTIPLIERS } from './seed-multipliers.js';

let _cache: AimsPricingMatrix | null = null;

function isStale(row: PricingRow): boolean {
  // Reject explicit successor markers
  if (row.supersededBy) return true;

  // Image/video models must explicitly mark isLatest=true
  if ((row.sector === 'image' || row.sector === 'video') && row.isLatest !== true) {
    return true;
  }

  return false;
}

function buildMatrix(): AimsPricingMatrix {
  const allRows: PricingRow[] = [
    ...SEED_MODELS,
    ...SEED_PLANS,
    ...SEED_PILLARS,
  ];

  const live: PricingRow[] = [];
  const dropped: PricingRow[] = [];

  for (const r of allRows) {
    if (isStale(r) || !r.active) {
      dropped.push(r);
      continue;
    }
    live.push(r);
  }

  if (dropped.length > 0) {
    // eslint-disable-next-line no-console
    console.warn(
      `[aims-pricing-matrix] dropped ${dropped.length} stale/inactive rows:`,
      dropped.map((r) => r.id),
    );
  }

  const bundles: BundleRow[] = [];
  const taskMultipliers: TaskMultiplier[] = SEED_TASK_MULTIPLIERS;

  const matrix: AimsPricingMatrix = {
    rows: live,
    bundles,
    taskMultipliers,
    generatedAt: new Date().toISOString(),
    version: '0.1.0',
  };

  // Runtime validation — fail loud at boot if seed data is malformed
  AimsPricingMatrixSchema.parse(matrix);

  return matrix;
}

export function getMatrix(): AimsPricingMatrix {
  if (!_cache) {
    _cache = buildMatrix();
  }
  return _cache;
}

/**
 * Async variant that prefers Neon when PRICING_USE_NEON is set,
 * with automatic fallback to the in-memory seed loader.
 *
 * Use this in long-running services (SmelterOS, AIMS backend).
 * Use the sync getMatrix() in CLI tools / tests where seed-only is fine.
 */
export async function getMatrixAsync(): Promise<AimsPricingMatrix> {
  // Lazy import to avoid pulling in postgres in seed-only environments
  const { getMatrixFromNeon } = await import('./neon-loader.js');
  const fromNeon = await getMatrixFromNeon();
  if (fromNeon) return fromNeon;
  return getMatrix();
}

export function reloadMatrix(): AimsPricingMatrix {
  _cache = null;
  return getMatrix();
}

export async function reloadMatrixAsync(): Promise<AimsPricingMatrix> {
  _cache = null;
  const { bustNeonCache } = await import('./neon-loader.js');
  bustNeonCache();
  return getMatrixAsync();
}

export function getMatrixStats() {
  const m = getMatrix();
  return {
    totalRows: m.rows.length,
    bundles: m.bundles.length,
    taskMultipliers: m.taskMultipliers.length,
    bySector: m.rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.sector] = (acc[r.sector] ?? 0) + 1;
      return acc;
    }, {}),
    byRowType: m.rows.reduce<Record<string, number>>((acc, r) => {
      acc[r.rowType] = (acc[r.rowType] ?? 0) + 1;
      return acc;
    }, {}),
    version: m.version,
    generatedAt: m.generatedAt,
  };
}
