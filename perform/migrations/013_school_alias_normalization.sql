-- Migration 013: School Alias Normalization for Dedupe Key
-- Date: 2026-04-20
-- Purpose: Migration 010 keyed dedupe on (name_normalized, school, class_year, sport)
--          but treated `school` as a literal string. Common abbreviation /
--          punctuation variants (Miami vs Miami (FL), Cal vs California, USF
--          vs South Florida, Stephen F Austin vs Stephen F. Austin, Pitt vs
--          Pittsburgh, Miami (OH) vs Miami (Ohio), IPP - Kenya vs Kenya (IPP))
--          escaped the unique constraint, producing 17 cross-spelling
--          duplicate rows by 2026-04-20 (deleted in
--          scripts/delete-stale-school-dupes.ts). This migration adds a
--          GENERATED `school_normalized` column with an explicit alias map
--          and re-keys the dedupe unique index so future seeds cannot
--          recreate the gap.
--
-- Aliasing scope: ONLY clear abbreviation / punctuation variants observed
-- in production. Schools that share a name root but are distinct
-- institutions (Arizona vs Arizona State, Montana vs Montana State) are
-- NOT aliased — those should be data-cleaned at the seed layer.

-- ── Step 1: school_normalized GENERATED column ────────────────────────────
-- LOWER + TRIM + alias collapse. PG 12+ STORED generated column. Re-evaluated
-- on each row insert/update so seed sources can stay in their native form.
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS school_normalized TEXT
  GENERATED ALWAYS AS (
    CASE LOWER(TRIM(school))
      -- Miami (FL): Hurricanes
      WHEN 'miami'              THEN 'miami_fl'
      WHEN 'miami (fl)'         THEN 'miami_fl'
      WHEN 'miami fl'           THEN 'miami_fl'
      WHEN 'university of miami' THEN 'miami_fl'
      -- Miami (OH): RedHawks
      WHEN 'miami (oh)'         THEN 'miami_oh'
      WHEN 'miami (ohio)'       THEN 'miami_oh'
      WHEN 'miami ohio'         THEN 'miami_oh'
      -- Cal/California: Golden Bears
      WHEN 'cal'                THEN 'california'
      WHEN 'california'         THEN 'california'
      WHEN 'uc berkeley'        THEN 'california'
      -- USF / South Florida: Bulls
      WHEN 'usf'                THEN 'south_florida'
      WHEN 'south florida'      THEN 'south_florida'
      -- Pitt / Pittsburgh: Panthers
      WHEN 'pitt'               THEN 'pittsburgh'
      WHEN 'pittsburgh'         THEN 'pittsburgh'
      -- Stephen F Austin punctuation
      WHEN 'stephen f austin'   THEN 'stephen_f_austin'
      WHEN 'stephen f. austin'  THEN 'stephen_f_austin'
      WHEN 'sfa'                THEN 'stephen_f_austin'
      -- IPP - Kenya / Kenya (IPP)
      WHEN 'ipp - kenya'        THEN 'ipp_kenya'
      WHEN 'kenya (ipp)'        THEN 'ipp_kenya'
      WHEN 'ipp kenya'          THEN 'ipp_kenya'
      -- Default: lowercase + replace non-alphanumeric with underscore
      ELSE REGEXP_REPLACE(LOWER(TRIM(school)), '[^a-z0-9]+', '_', 'g')
    END
  ) STORED;

-- ── Step 2: Index for the new normalized column ────────────────────────────
CREATE INDEX IF NOT EXISTS perform_players_school_normalized_idx
  ON perform_players (school_normalized);

-- ── Step 3: Drop the old (school-literal) dedupe index ─────────────────────
-- Migration 010 created perform_players_dedupe_key_idx as a NON-unique index
-- on (name_normalized, school, class_year, sport). We drop and replace.
DROP INDEX IF EXISTS perform_players_dedupe_key_idx;

-- ── Step 4: New UNIQUE dedupe index using normalized school ───────────────
-- This is the canonical conflict key for ON CONFLICT (name_normalized,
-- school_normalized, class_year, sport) DO UPDATE in seed scripts.
CREATE UNIQUE INDEX IF NOT EXISTS perform_players_dedupe_normalized_key
  ON perform_players (name_normalized, school_normalized, class_year, sport);

-- ── Step 5: Verification ───────────────────────────────────────────────────
-- Expect zero collisions under the new key (should be true after the 17 stale
-- rows were deleted by scripts/delete-stale-school-dupes.ts).
SELECT
  name_normalized, school_normalized, class_year, sport, COUNT(*) AS dup_count
FROM perform_players
GROUP BY name_normalized, school_normalized, class_year, sport
HAVING COUNT(*) > 1
ORDER BY dup_count DESC, name_normalized
LIMIT 20;

-- Expect: each school string in production maps to a deterministic normalized
-- form (and known aliases collapse to the canonical key).
SELECT school, school_normalized, COUNT(*) AS rows
FROM perform_players
WHERE school IS NOT NULL
GROUP BY school, school_normalized
ORDER BY school
LIMIT 50;
