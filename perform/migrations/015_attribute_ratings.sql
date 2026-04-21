-- Migration 015: Madden/2K-style expanded attribute ratings on perform_players
-- Date: 2026-04-21
-- Purpose:
--   Stores the granular attribute sheet (per Madden + 2K schemas) that rolls
--   up into the canonical Performance/Attributes/Intangibles 40/30/30 pillars
--   in @aims/tie-matrix. Keeps the 3-pillar engine canonical; just feeds it
--   pillar values computed from attribute averages.
--
-- Layout:
--   attribute_ratings JSONB — flat key→int (0-99) for every attribute the
--     player has been graded on. Position-specific + universal attributes
--     share the same bag; the rollup module knows which belong to which
--     pillar per position.
--   attribute_badges JSONB — array of badge codes auto-derived at seed time
--     from the ratings (Bronze 80-84, Silver 85-89, Gold 90-94, Hall of
--     Fame 95-99). Cached so card renders don't recompute.
--   attributes_source TEXT — 'curated' (manual scout entry), 'synthesized'
--     (Beast + ESPN data pipeline), 'submission' (user-upload via
--     /api/tie/submit). Lets us prefer curated over synthesized.
--   attributes_updated_at TIMESTAMPTZ — when the sheet was last touched.

ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS attribute_ratings    JSONB       NULL,
  ADD COLUMN IF NOT EXISTS attribute_badges     JSONB       NULL,
  ADD COLUMN IF NOT EXISTS attributes_source    TEXT        NULL
                           CHECK (attributes_source IN ('curated','synthesized','submission') OR attributes_source IS NULL),
  ADD COLUMN IF NOT EXISTS attributes_updated_at TIMESTAMPTZ NULL;

CREATE INDEX IF NOT EXISTS perform_players_attribute_ratings_gin
  ON perform_players USING GIN (attribute_ratings);

COMMENT ON COLUMN perform_players.attribute_ratings IS
  'Madden/2K-style granular attribute sheet, key→int (0-99). Rolls up to 40/30/30 pillars via lib/tie/rollup.ts.';
COMMENT ON COLUMN perform_players.attribute_badges IS
  'Auto-derived array of badge codes (e.g. ["SPD_hof","INJ_hof","AWR_gold"]). Cached at seed time.';
