/**
 * schoolSlug
 * ============
 * Canonical, deterministic slug for a school / team full name.
 *
 * Fixes the "Michigan State" vs "Mississippi State" collision that broke
 * scripts/seed-teams.ts CFB seeding — initials-based abbreviations merged
 * both schools under "MS", compressing 672 distinct CFB schools into 401
 * unique rows via silent ON CONFLICT updates.
 *
 * Pure function. Zero dependencies. Kept in sync with school-slug.mjs
 * (same body) so `.mjs` scripts can import the canonical form without a
 * TS build step.
 *
 * Examples:
 *   schoolSlug('Michigan State')         → 'michigan-state'
 *   schoolSlug('Mississippi State')      → 'mississippi-state'
 *   schoolSlug('Texas A&M')              → 'texas-and-a-and-m' → 'texas-a-and-m' (after replacing &)
 *   schoolSlug("St. John's")             → 'st-johns'
 *   schoolSlug('Miami (FL)')             → 'miami-fl'
 *   schoolSlug('North Carolina A&T')     → 'north-carolina-a-and-t'
 *   schoolSlug('Bowling Green')          → 'bowling-green'
 *   schoolSlug('Université de Montréal') → 'universite-de-montreal'
 */
export function schoolSlug(input: string): string {
  if (!input) return '';
  return input
    .normalize('NFD')                         // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '')          // strip combining marks
    .toLowerCase()
    .replace(/&/g, '-and-')                   // ampersands → -and-
    .replace(/'/g, '')                        // strip apostrophes so "st. john's" → "st-johns" not "st-john-s"
    .replace(/[^a-z0-9]+/g, '-')              // anything non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')                  // trim leading/trailing hyphens
    .replace(/-{2,}/g, '-');                  // collapse runs of hyphens
}
