-- Migration 016: Versatility flex + Prime sub-tags on perform_players
-- Date: 2026-04-21
-- Purpose:
--   Canonical TIE matrix (aims-tools/tie-matrix) has two elements that
--   raise elite players into the PRIME tier (101+):
--
--     versatility_flex  — how many roles the player anchors
--                         none(0) / situational(+3) / two_way(+5) / unicorn(+7)
--     prime_sub_tags    — generational identity flags for 101+ scores
--                         franchise_cornerstone / talent_character_concerns /
--                         nil_ready / quiet_but_elite / ultra_competitive
--
--   Without these plumbed onto the player row, the rollup engine can't
--   pass bonus/primeSubTags to buildTIEResult → no player crosses into
--   PRIME. This migration adds the columns so curated + submitted sheets
--   can set them. The rollup engine reads both and passes them through.

ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS versatility_flex TEXT NULL
                           CHECK (versatility_flex IN ('none','situational','two_way','unicorn') OR versatility_flex IS NULL),
  ADD COLUMN IF NOT EXISTS prime_sub_tags   TEXT[] NULL;

CREATE INDEX IF NOT EXISTS perform_players_versatility_flex_idx
  ON perform_players (versatility_flex)
  WHERE versatility_flex IS NOT NULL;

COMMENT ON COLUMN perform_players.versatility_flex IS
  'Versatility multiplier: none(0) / situational(+3) / two_way(+5) / unicorn(+7). Maps 1:1 to aims-tools/tie-matrix SEED_VERSATILITY_BONUSES.';
COMMENT ON COLUMN perform_players.prime_sub_tags IS
  'Array of prime sub-tag codes (franchise_cornerstone, etc). Only surfaces on the card when tie_score >= 101.';
