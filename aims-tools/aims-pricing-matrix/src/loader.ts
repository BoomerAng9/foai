/**
 * In-memory loader for the A.I.M.S. Pricing Matrix.
 *
 * Phase 1: loads from seed files (no DB).
 * Phase 2: will switch to Neon-backed loading with hot reload via
 *          LISTEN/NOTIFY when the canonical tables exist.
 *
 * Latest-only enforcement:
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

export function reloadMatrix(): AimsPricingMatrix {
  _cache = null;
  return getMatrix();
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
