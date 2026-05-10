-- Migration 010: Player External ID + Name Normalization + Case-Collision Dedupe Foundation
-- Date: 2026-04-19
-- Purpose: Replace case-sensitive (name, school, class_year) conflict key with
--          (name_normalized, school, class_year, sport) — fixes the CALEB DOWNS /
--          Caleb Downs duplication class. Adds player_external_id as future-proof
--          stable join key.
--
-- Companion: scripts/dedupe-case-collisions.ts must run AFTER this migration to
-- merge existing case-collision pairs before the new unique index is created.
-- This migration adds the COLUMN and a NON-UNIQUE index; the dedupe script then
-- cleans collisions; finally the unique index is promoted in step 4.

-- ── Step 1: Enable pgcrypto for gen_random_uuid() ─────────────────────────
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Step 2: Add player_external_id with auto-backfill via DEFAULT ─────────
-- Postgres re-evaluates DEFAULT per row when adding NOT NULL column with default
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS player_external_id UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS perform_players_external_id_key
  ON perform_players (player_external_id);

-- ── Step 3: Add generated normalized-name column ──────────────────────────
-- Trim + lowercase. Idempotent (STORED, computed at write).
-- Note: GENERATED columns cannot be altered after creation; if a future change
-- needs to alter the expression, drop + re-add. For draft-week, this is final.
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS name_normalized TEXT
  GENERATED ALWAYS AS (LOWER(TRIM(name))) STORED;

-- ── Step 4: Backfill any NULL sport values to 'football' ──────────────────
-- Required because the new conflict key includes sport — NULLs in conflict keys
-- prevent ON CONFLICT from firing in Postgres.
UPDATE perform_players SET sport = 'football' WHERE sport IS NULL;

-- Same for class_year — should be non-null per existing default but defensive.
UPDATE perform_players SET class_year = '2026' WHERE class_year IS NULL;

-- ── Step 5: Drop the legacy case-sensitive unique constraint ──────────────
-- Default constraint name from CREATE TABLE: perform_players_name_school_class_year_key
ALTER TABLE perform_players
  DROP CONSTRAINT IF EXISTS perform_players_name_school_class_year_key;

-- Also drop any UNIQUE INDEX with same coverage (some apps add as index not constraint)
DROP INDEX IF EXISTS perform_players_name_school_class_year_key;

-- ── Step 6: Add NON-UNIQUE index for the new conflict-key columns ─────────
-- Non-unique at this stage so dedupe script can run without violating the constraint.
-- The dedupe script will promote this to UNIQUE after merging case-collision pairs.
CREATE INDEX IF NOT EXISTS perform_players_dedupe_key_idx
  ON perform_players (name_normalized, school, class_year, sport);

-- ── Step 7: Supporting indexes for read paths ─────────────────────────────
CREATE INDEX IF NOT EXISTS perform_players_name_normalized_idx
  ON perform_players (name_normalized);

-- ── Step 8: Verification queries (run via \echo for log clarity) ──────────
-- Expect: external_id_count == total_count, name_normalized_count == total_count
SELECT
  COUNT(*) AS total_rows,
  COUNT(player_external_id) AS rows_with_external_id,
  COUNT(name_normalized) AS rows_with_normalized_name,
  COUNT(DISTINCT player_external_id) AS distinct_external_ids
FROM perform_players;

-- Expect collision pairs to be visible BEFORE dedupe script runs:
SELECT
  name_normalized, school, class_year, sport, COUNT(*) AS dup_count
FROM perform_players
GROUP BY name_normalized, school, class_year, sport
HAVING COUNT(*) > 1
ORDER BY dup_count DESC, name_normalized
LIMIT 20;
