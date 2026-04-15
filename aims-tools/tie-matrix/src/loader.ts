/**
 * Loader for the TIE Matrix.
 * ===========================
 * In-memory seed loader with runtime Zod validation. Mirrors the pattern
 * of @aims/pricing-matrix. Fail loud at boot on malformed seed data.
 *
 * Phase 2 (future): Neon-backed loader with LISTEN/NOTIFY hot reload.
 */

import type { TIEMatrix } from './types.js';
import { TIEMatrixSchema } from './schema.js';
import { SEED_GRADES } from './seed-grades.js';
import { SEED_VERTICALS, SEED_LABELS_BY_VERTICAL } from './seed-verticals.js';
import { SEED_PRIME_SUB_TAGS, SEED_VERSATILITY_BONUSES } from './seed-prime-subtags.js';

let _cache: TIEMatrix | null = null;

function buildMatrix(): TIEMatrix {
  const matrix: TIEMatrix = {
    grades: SEED_GRADES,
    verticals: SEED_VERTICALS,
    labelsByVertical: SEED_LABELS_BY_VERTICAL,
    primeSubTags: SEED_PRIME_SUB_TAGS,
    versatilityBonuses: SEED_VERSATILITY_BONUSES,
    generatedAt: new Date().toISOString(),
    version: '0.1.0',
  };

  // Runtime validation — fail loud at boot if seed data is malformed
  TIEMatrixSchema.parse(matrix);

  return matrix;
}

export function getMatrix(): TIEMatrix {
  if (!_cache) {
    _cache = buildMatrix();
  }
  return _cache;
}

export function reloadMatrix(): TIEMatrix {
  _cache = null;
  return getMatrix();
}

export function getMatrixStats() {
  const m = getMatrix();
  return {
    grades: m.grades.length,
    verticals: Object.keys(m.verticals).length,
    primeSubTags: Object.keys(m.primeSubTags).length,
    versatilityBonuses: Object.keys(m.versatilityBonuses).length,
    version: m.version,
    generatedAt: m.generatedAt,
  };
}
