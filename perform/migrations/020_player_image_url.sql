-- Migration 020: Player image URL column
-- Date: 2026-04-23
-- Purpose:
--   Formalize the image_url column that /api/players/generate-image has been
--   creating on-demand via runtime ALTER. Moves ESPN headshot + AI-generated
--   portrait persistence into a first-class column so /api/players can
--   surface it in PREVIEW_COLUMNS without a runtime ALTER + schema race.
--
-- Additive only. Re-running is a no-op (IF NOT EXISTS).

ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS image_url TEXT NULL;

-- Partial index to speed the backfill loop:
-- scripts/backfill-player-images.ts loops WHERE image_url IS NULL.
CREATE INDEX IF NOT EXISTS perform_players_image_url_missing_idx
  ON perform_players (id)
  WHERE image_url IS NULL;
