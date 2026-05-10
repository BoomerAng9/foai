/**
 * Neon-backed loader for the A.I.M.S. Pricing Matrix.
 *
 * Phase 2 implementation. Loads rows + bundles + task multipliers
 * from Postgres, validates with Zod, caches in-memory, and subscribes
 * to LISTEN/NOTIFY for hot reload.
 *
 * Falls back to seed data if PRICING_USE_NEON env var is unset or
 * if the database is unreachable. This means the package keeps
 * working in dev/test environments without a Neon instance.
 */

import { getSql, closeSql } from './client.js';
import { AimsPricingMatrixSchema } from './schema.js';
import type {
  AimsPricingMatrix,
  PricingRow,
  BundleRow,
  TaskMultiplier,
} from './types.js';
import { SEED_MODELS } from './seed-models.js';
import { SEED_PLANS } from './seed-plans.js';
import { SEED_PILLARS } from './seed-pillars.js';
import { SEED_TASK_MULTIPLIERS } from './seed-multipliers.js';

let _neonCache: AimsPricingMatrix | null = null;
let _listenerStarted = false;

function isStale(row: PricingRow): boolean {
  if (row.supersededBy) return true;
  if ((row.sector === 'image' || row.sector === 'video') && row.isLatest !== true) {
    return true;
  }
  return false;
}

function shouldUseNeon(): boolean {
  return process.env.PRICING_USE_NEON === 'true' || process.env.PRICING_USE_NEON === '1';
}

async function fetchFromNeon(): Promise<AimsPricingMatrix> {
  const sql = getSql();

  // Pull all active rows from the matrix table
  const rawRows = await sql<Array<Record<string, unknown>>>`
    SELECT
      id,
      row_type,
      sector,
      topic,
      description,
      provider_id,
      provider_name,
      route_id,
      license,
      capabilities,
      context_window,
      tier,
      unlocked_at,
      vibe_groups,
      input_per_1m,
      output_per_1m,
      unit_price,
      unit,
      multi_currency,
      ppu_multiplier,
      confidence_uplift,
      convenience_uplift,
      security_uplift,
      competitor,
      demand,
      importance,
      prerequisites,
      outcomes,
      cert_level,
      accreditation,
      source_url,
      benchmarks,
      last_verified,
      active,
      notes,
      superseded_by,
      is_latest,
      routing_priority,
      vendor_rank
    FROM aims_pricing_matrix
    WHERE active = TRUE
    ORDER BY routing_priority NULLS LAST, id
  `;

  const rows: PricingRow[] = rawRows
    .map((r): PricingRow => {
      // postgres camelCase transform handles the field name conversion;
      // we just cast and normalize ISO timestamps
      const row = r as unknown as PricingRow;
      const lv = row.lastVerified as unknown;
      return {
        ...row,
        lastVerified: lv instanceof Date ? lv.toISOString() : String(lv),
      };
    })
    .filter((row) => !isStale(row));

  // Bundles
  const rawBundles = await sql<Array<Record<string, unknown>>>`
    SELECT id, name, description, member_ids, bundle_price_usd,
           savings_vs_sum_usd, vibe_groups, active, notes
    FROM aims_pricing_bundles
    WHERE active = TRUE
  `;
  const bundles: BundleRow[] = rawBundles.map((b) => b as unknown as BundleRow);

  // Task multipliers
  const rawMultipliers = await sql<Array<Record<string, unknown>>>`
    SELECT task_type, label, multiplier, description
    FROM aims_task_multipliers
  `;
  const taskMultipliers: TaskMultiplier[] = rawMultipliers.map(
    (m) => m as unknown as TaskMultiplier,
  );

  // If the table is empty (fresh DB), fall back to seeds
  const finalRows = rows.length > 0 ? rows : seedFallbackRows();
  const finalMultipliers =
    taskMultipliers.length > 0 ? taskMultipliers : SEED_TASK_MULTIPLIERS;

  const matrix: AimsPricingMatrix = {
    rows: finalRows,
    bundles,
    taskMultipliers: finalMultipliers,
    generatedAt: new Date().toISOString(),
    version: '0.2.0-neon',
  };

  AimsPricingMatrixSchema.parse(matrix);
  return matrix;
}

function seedFallbackRows(): PricingRow[] {
  const all = [...SEED_MODELS, ...SEED_PLANS, ...SEED_PILLARS];
  return all.filter((r) => r.active && !isStale(r));
}

/**
 * Subscribes to LISTEN aims_pricing_changed and busts the in-memory
 * cache on each notification. Idempotent — calling more than once
 * is safe; only the first call wires up the listener.
 */
async function startListener(): Promise<void> {
  if (_listenerStarted) return;
  _listenerStarted = true;

  try {
    const sql = getSql();
    await sql.listen('aims_pricing_changed', (payload) => {
      // eslint-disable-next-line no-console
      console.log('[aims-pricing-matrix] cache bust via NOTIFY:', payload);
      _neonCache = null;
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      '[aims-pricing-matrix] LISTEN/NOTIFY unavailable, hot reload disabled:',
      e instanceof Error ? e.message : e,
    );
    _listenerStarted = false; // allow retry
  }
}

/**
 * Get the matrix from Neon (cached). If PRICING_USE_NEON is unset or
 * the database is unreachable, returns null so the caller can fall
 * back to the seed loader.
 */
export async function getMatrixFromNeon(): Promise<AimsPricingMatrix | null> {
  if (!shouldUseNeon()) return null;

  if (_neonCache) return _neonCache;

  try {
    _neonCache = await fetchFromNeon();
    void startListener();
    return _neonCache;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn(
      '[aims-pricing-matrix] Neon load failed, falling back to seed:',
      e instanceof Error ? e.message : e,
    );
    return null;
  }
}

/**
 * Force-bust the Neon cache. Use sparingly — LISTEN/NOTIFY normally
 * handles this automatically.
 */
export function bustNeonCache(): void {
  _neonCache = null;
}

/**
 * Cleanly close the Neon connection. Call on graceful shutdown.
 */
export async function shutdownNeon(): Promise<void> {
  _neonCache = null;
  _listenerStarted = false;
  await closeSql();
}
