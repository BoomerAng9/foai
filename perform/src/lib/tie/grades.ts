/**
 * perform/lib/tie/grades.ts
 * ==========================
 * FACADE — re-exports canonical grade lookups from @aims/tie-matrix.
 * Kept so existing `from './grades'` imports keep working during
 * the migration. New code should import from @aims/tie-matrix directly.
 */

export {
  getGradeForScore,
  getGradeColor,
  getGradeBandByTier,
  SEED_GRADES as GRADE_SCALE,
} from '@aims/tie-matrix';
