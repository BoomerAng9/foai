-- 008_tie_partition_and_analysts.sql
-- ====================================
-- Wave 2: TIE partition columns + analyst publishing spine.
--
-- Adds:
--   1. perform_players.vertical  — cross-vertical stamp (default SPORTS)
--   2. perform_players.sport     — canonical column (replaces runtime ALTER
--                                   in api/players/route.ts)
--   3. perform_players.beast_rank + beast_grade  — reference-only columns
--                                   for Dane Brugler / external consensus
--                                   data. The Per|Form canonical grade
--                                   lives in `grade` / `tie_grade` / `tie_tier`.
--                                   Beast is a comparison reference, never
--                                   the authoritative grade.
--   4. perform_players.prime_sub_tags — Prime-only identity flags (101+ scores)
--   5. analyst_posts table       — each analyst's article queue, with
--                                   a publish_at slot for the 3-day stagger
--                                   scheduler.
--
-- Idempotent. Safe to re-run.

BEGIN;

-- ── perform_players partition columns ───────────────────────────────

ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS vertical TEXT DEFAULT 'SPORTS' NOT NULL;

-- Promote the runtime-added sport column to a first-class column.
-- (ADD IF NOT EXISTS is a no-op if api/players/route.ts already ALTER'd it.)
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS sport TEXT DEFAULT 'football' NOT NULL;

-- Beast reference columns (external consensus rankings, e.g. Dane Brugler).
-- These are NEVER the authoritative grade for Per|Form — they are a
-- reference overlay surfaced for analyst calibration only.
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS beast_rank INTEGER;
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS beast_grade TEXT;

-- Prime sub-tags (array of @aims/tie-matrix PrimeSubTag values).
-- Only populated for scores >= 101.
ALTER TABLE perform_players
  ADD COLUMN IF NOT EXISTS prime_sub_tags TEXT[];

-- Indexes for partitioned queries
CREATE INDEX IF NOT EXISTS idx_perform_players_vertical ON perform_players(vertical);
CREATE INDEX IF NOT EXISTS idx_perform_players_sport    ON perform_players(sport);
CREATE INDEX IF NOT EXISTS idx_perform_players_grade    ON perform_players(grade DESC NULLS LAST);

-- ── analyst_posts — publishing spine for the 3-day stagger ─────────

CREATE TABLE IF NOT EXISTS analyst_posts (
  id              SERIAL PRIMARY KEY,
  analyst_id      TEXT NOT NULL,
  player_id       INTEGER REFERENCES perform_players(id) ON DELETE SET NULL,
  content_type    TEXT NOT NULL DEFAULT 'article',  -- article | breakdown | take | hot-take
  title           TEXT NOT NULL,
  body            TEXT NOT NULL,
  publish_at      TIMESTAMPTZ NOT NULL,
  published       BOOLEAN NOT NULL DEFAULT FALSE,
  published_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_analyst_posts_analyst     ON analyst_posts(analyst_id);
CREATE INDEX IF NOT EXISTS idx_analyst_posts_publish_at  ON analyst_posts(publish_at);
CREATE INDEX IF NOT EXISTS idx_analyst_posts_scheduler   ON analyst_posts(published, publish_at)
  WHERE published = FALSE;
CREATE INDEX IF NOT EXISTS idx_analyst_posts_player      ON analyst_posts(player_id);

-- Prevent two analysts from being scheduled into the same exact publish slot.
-- The 3-day stagger scheduler (Wave 5) computes offsets so this rarely collides,
-- but the constraint fails loud if the algorithm has a bug.
CREATE UNIQUE INDEX IF NOT EXISTS uniq_analyst_posts_slot
  ON analyst_posts(analyst_id, publish_at);

COMMIT;
