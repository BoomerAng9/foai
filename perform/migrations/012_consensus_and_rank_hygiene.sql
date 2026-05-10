-- Migration 012: Consensus Ranks + Rank Hygiene + Team Slug
-- Date: 2026-04-20
-- Purpose:
--   1. Create perform_consensus_ranks — cross-system draft rank table
--      (DrafTek / Yahoo / Ringer from consensus-board-2026.json, plus
--      PFF / ESPN / NFL.com slots for post-draft scrape, plus an
--      aggregate consensus_avg source). Powers the /rankings comparison
--      column.
--   2. Add perform_teams.slug column for deterministic CFB identity
--      (kills the 672→401 Michigan State / Mississippi State collision
--      that seed-teams.ts produced with initials-based abbreviations).
--   3. NULL ranks on non-2026 rows — root fix for the 5 overall_rank
--      duplicates at #1963/#2080/#2125/#2172/#2196 that the prior
--      recompute skipped because its class_year='2026' filter left
--      stale ranks on older-class rows untouched.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ── Step 1: perform_consensus_ranks table ──────────────────────────────
CREATE TABLE IF NOT EXISTS perform_consensus_ranks (
  id               SERIAL PRIMARY KEY,
  player_id        INTEGER NOT NULL REFERENCES perform_players(id) ON DELETE CASCADE,
  source           TEXT    NOT NULL
                   CHECK (source IN ('pff','espn','nflcom','drafttek','yahoo','ringer','consensus_avg')),
  rank             INTEGER NOT NULL,
  raw_grade        NUMERIC NULL,
  ingested_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(player_id, source)
);

CREATE INDEX IF NOT EXISTS perform_consensus_ranks_player_idx
  ON perform_consensus_ranks (player_id);

CREATE INDEX IF NOT EXISTS perform_consensus_ranks_source_rank_idx
  ON perform_consensus_ranks (source, rank);

-- ── Step 2: Canonical school slug on perform_teams ─────────────────────
-- Nullable initially; backfill runs via scripts/seed-teams.ts re-run.
ALTER TABLE perform_teams
  ADD COLUMN IF NOT EXISTS slug TEXT;

-- Unique only when non-null (partial unique index) — allows gradual backfill.
CREATE UNIQUE INDEX IF NOT EXISTS perform_teams_slug_unique
  ON perform_teams (slug)
  WHERE slug IS NOT NULL;

-- ── Step 3: NULL ranks on non-2026 rows ────────────────────────────────
-- Root fix for rank duplicates at #1963+.
-- Defensive: only touches rows that currently have a rank set.
UPDATE perform_players
SET
  overall_rank  = NULL,
  position_rank = NULL,
  updated_at    = NOW()
WHERE class_year IS DISTINCT FROM '2026'
  AND (overall_rank IS NOT NULL OR position_rank IS NOT NULL);

-- ── Verification (runs in same transaction; output visible via apply-migration) ─
-- Expect zero duplicates across ALL rows after this migration + rank recompute.
SELECT
  (SELECT COUNT(*) FROM perform_consensus_ranks)::int  AS consensus_rows,
  (SELECT COUNT(*) FROM perform_teams WHERE slug IS NOT NULL)::int AS teams_with_slug,
  (SELECT COUNT(*) FROM perform_teams)::int            AS teams_total,
  (SELECT COUNT(*) FROM perform_players
    WHERE overall_rank IS NOT NULL
      AND class_year = '2026')::int                    AS ranked_2026,
  (SELECT COUNT(*) FROM perform_players
    WHERE overall_rank IS NOT NULL
      AND class_year != '2026')::int                   AS ranked_non_2026_should_be_zero;
