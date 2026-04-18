-- ═══════════════════════════════════════════════════════════════════════════
-- Migration 009 — Draft Pick Tracking (T3)
-- ═══════════════════════════════════════════════════════════════════════════
-- Adds columns required for live draft-day tracking: which NFL team picked
-- a player, at what overall pick number, and when. These columns drive the
-- college→NFL helmet swap in card-styles.ts (via team-helmet-resolver.ts).
--
-- The helmet-swap is atomic: once `drafted_by_team` is populated for a row,
-- every subsequent card render for that player uses the NFL team colorway.
-- The old `updated_at` timestamp flip is sufficient to invalidate any
-- upstream URL-signed caches (Recraft/Ideogram asset URLs change when the
-- input hash changes).
--
-- Applied by scripts/apply-migration.ts
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS drafted_by_team TEXT,
  ADD COLUMN IF NOT EXISTS drafted_pick_number INTEGER,
  ADD COLUMN IF NOT EXISTS drafted_round INTEGER,
  ADD COLUMN IF NOT EXISTS drafted_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS college_color_phrase TEXT;

-- Index for quick "show all picks by team X" queries during and after the draft
CREATE INDEX IF NOT EXISTS idx_perform_players_drafted_by_team
  ON perform_players (drafted_by_team)
  WHERE drafted_by_team IS NOT NULL;

-- Index for ordered pick-history queries (live draft board)
CREATE INDEX IF NOT EXISTS idx_perform_players_drafted_pick_number
  ON perform_players (drafted_pick_number ASC)
  WHERE drafted_pick_number IS NOT NULL;

-- Constraint: pick number range (1 through 300 covers all 7 rounds + comp picks)
ALTER TABLE perform_players
  DROP CONSTRAINT IF EXISTS chk_perform_players_drafted_pick_range;
ALTER TABLE perform_players
  ADD CONSTRAINT chk_perform_players_drafted_pick_range
  CHECK (drafted_pick_number IS NULL OR drafted_pick_number BETWEEN 1 AND 300);

-- Constraint: drafted_by_team must be a 2-4 char abbreviation when set (soft check)
ALTER TABLE perform_players
  DROP CONSTRAINT IF EXISTS chk_perform_players_drafted_by_team_format;
ALTER TABLE perform_players
  ADD CONSTRAINT chk_perform_players_drafted_by_team_format
  CHECK (drafted_by_team IS NULL OR LENGTH(drafted_by_team) BETWEEN 2 AND 4);

COMMENT ON COLUMN perform_players.drafted_by_team IS
  'NFL team abbreviation from lib/draft/nfl-teams.ts (e.g., ''JAX'', ''KC''). Populated on draft pick event. Triggers helmet-swap.';
COMMENT ON COLUMN perform_players.drafted_pick_number IS
  'Overall pick number (1-300). Round derivable from pick ranges (1-32 R1, 33-64 R2, etc., adjusted for comp picks).';
COMMENT ON COLUMN perform_players.college_color_phrase IS
  'Pre-computed college color descriptor for pre-draft card renders (e.g., ''scarlet and gray''). Seeded from school name.';
