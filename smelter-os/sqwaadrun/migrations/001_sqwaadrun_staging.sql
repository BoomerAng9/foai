-- ═══════════════════════════════════════════════════════════════════
--  Sqwaadrun staging schema — Neon Postgres
--  Migration 001
-- ═══════════════════════════════════════════════════════════════════
--
--  Pattern:
--    Sqwaadrun runs missions in the background → writes raw rows to
--    sqwaadrun_staging.* → promotion job picks the freshest clean
--    record per (entity, source) and upserts into the live tables
--    that Per|Form / Deploy Platform read.
--
--  Per|Form NEVER writes to staging and NEVER reads from staging.
--  It only reads the live perform_* tables that promotion populates.
--
--  Apply with:
--    psql $NEON_INGEST_DSN -f migrations/001_sqwaadrun_staging.sql

CREATE SCHEMA IF NOT EXISTS sqwaadrun_staging;

-- ─── Mission audit log ──────────────────────────────────────────────
-- Every Chicken_Hawk mission lands here. Independent of any business
-- entity — this is the audit trail General_Ang reviews.
CREATE TABLE IF NOT EXISTS sqwaadrun_staging.mission_log (
  mission_id          TEXT PRIMARY KEY,
  mission_type        TEXT NOT NULL,
  intent              TEXT,
  target_count        INTEGER NOT NULL,
  status              TEXT NOT NULL,
  signed_off_by       TEXT,
  primary_domain      TEXT,
  results_count       INTEGER DEFAULT 0,
  elapsed_seconds     NUMERIC(8,2),
  throughput_pps      NUMERIC(8,2),
  error               TEXT,
  kpi_snapshot        JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_mission_log_created_at
  ON sqwaadrun_staging.mission_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mission_log_status
  ON sqwaadrun_staging.mission_log (status);

-- ─── Raw scrape artifacts ────────────────────────────────────────────
-- Per-URL row from a mission. The raw markdown + structured JSON
-- + HTML pointer (GCS) live here. Promotion picks from this table.
CREATE TABLE IF NOT EXISTS sqwaadrun_staging.scrape_artifact (
  id                  BIGSERIAL PRIMARY KEY,
  mission_id          TEXT NOT NULL REFERENCES sqwaadrun_staging.mission_log(mission_id) ON DELETE CASCADE,
  url                 TEXT NOT NULL,
  url_hash            TEXT NOT NULL,
  content_hash        TEXT,
  source_domain       TEXT NOT NULL,
  status_code         INTEGER,
  title               TEXT,
  meta_description    TEXT,
  markdown            TEXT,
  clean_text          TEXT,
  links               JSONB,
  images              JSONB,
  structured_data     JSONB,        -- JSON-LD / microdata / RDFa / OG
  gcs_html_path       TEXT,         -- gs:// pointer to raw HTML if archived
  scraped_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted            BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_artifact_url_hash
  ON sqwaadrun_staging.scrape_artifact (url_hash);
CREATE INDEX IF NOT EXISTS idx_artifact_domain
  ON sqwaadrun_staging.scrape_artifact (source_domain);
CREATE INDEX IF NOT EXISTS idx_artifact_promoted
  ON sqwaadrun_staging.scrape_artifact (promoted, scraped_at DESC);

-- ─── Athlete enrichment staging ──────────────────────────────────────
-- TRCC pipeline writes parsed athlete records here. Promotion job
-- joins these against perform_players (matched on name + school)
-- and writes the merge into perform_player_enrichment.
CREATE TABLE IF NOT EXISTS sqwaadrun_staging.athlete_enrichment (
  id                  BIGSERIAL PRIMARY KEY,
  artifact_id         BIGINT REFERENCES sqwaadrun_staging.scrape_artifact(id) ON DELETE CASCADE,
  source_domain       TEXT NOT NULL,         -- e.g. on3.com, 247sports.com
  name                TEXT NOT NULL,
  school              TEXT,
  position            TEXT,
  class_year          TEXT,
  height              TEXT,
  weight              TEXT,
  hometown            TEXT,
  star_rating         NUMERIC(2,1),          -- 0.0 - 5.0
  composite_rating    NUMERIC(5,2),
  national_rank       INTEGER,
  position_rank       INTEGER,
  state_rank          INTEGER,
  bio                 TEXT,
  highlight_url       TEXT,
  twitter_handle      TEXT,
  instagram_handle    TEXT,
  raw_payload         JSONB,                 -- everything else
  scraped_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted            BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_enrich_name_school
  ON sqwaadrun_staging.athlete_enrichment (LOWER(name), LOWER(school));
CREATE INDEX IF NOT EXISTS idx_enrich_promoted
  ON sqwaadrun_staging.athlete_enrichment (promoted, scraped_at DESC);

-- ─── NIL signal staging ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS sqwaadrun_staging.nil_signal (
  id                  BIGSERIAL PRIMARY KEY,
  artifact_id         BIGINT REFERENCES sqwaadrun_staging.scrape_artifact(id) ON DELETE CASCADE,
  athlete_name        TEXT NOT NULL,
  school              TEXT,
  source_domain       TEXT NOT NULL,
  platform            TEXT,                  -- twitter, instagram, tiktok, on3
  metric              TEXT,                  -- followers, valuation, deals_count, etc.
  value_text          TEXT,
  value_numeric       NUMERIC(14,2),
  observed_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  promoted            BOOLEAN NOT NULL DEFAULT FALSE,
  promoted_at         TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_nil_athlete
  ON sqwaadrun_staging.nil_signal (LOWER(athlete_name), observed_at DESC);
CREATE INDEX IF NOT EXISTS idx_nil_promoted
  ON sqwaadrun_staging.nil_signal (promoted, observed_at DESC);

-- ─── Live target columns Per|Form will read ─────────────────────────
-- These columns are added to the existing perform_players table by
-- the promotion job. We add them here defensively so the schema is
-- self-describing. Per|Form reads these directly.
ALTER TABLE IF EXISTS perform_players
  ADD COLUMN IF NOT EXISTS height TEXT,
  ADD COLUMN IF NOT EXISTS weight TEXT,
  ADD COLUMN IF NOT EXISTS hometown TEXT,
  ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
  ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
  ADD COLUMN IF NOT EXISTS highlight_url TEXT,
  ADD COLUMN IF NOT EXISTS nil_followers_total BIGINT,
  ADD COLUMN IF NOT EXISTS nil_valuation_usd NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS enrichment_sources TEXT,    -- comma-sep list
  ADD COLUMN IF NOT EXISTS enrichment_updated_at TIMESTAMPTZ;

-- ═══════════════════════════════════════════════════════════════════
--  PROMOTION FUNCTION
-- ═══════════════════════════════════════════════════════════════════
-- Picks the freshest unpromoted athlete_enrichment per (name, school)
-- and merges into perform_players. Marks the source row promoted.
-- Returns the count of promoted records.

CREATE OR REPLACE FUNCTION sqwaadrun_staging.promote_athlete_enrichment()
RETURNS INTEGER AS $$
DECLARE
  promoted_count INTEGER := 0;
BEGIN
  WITH ranked AS (
    SELECT
      e.id,
      e.name,
      e.school,
      e.height,
      e.weight,
      e.hometown,
      e.twitter_handle,
      e.instagram_handle,
      e.highlight_url,
      e.source_domain,
      e.scraped_at,
      ROW_NUMBER() OVER (
        PARTITION BY LOWER(e.name), LOWER(COALESCE(e.school, ''))
        ORDER BY e.scraped_at DESC
      ) AS rn
    FROM sqwaadrun_staging.athlete_enrichment e
    WHERE e.promoted = FALSE
  ),
  best AS (
    SELECT * FROM ranked WHERE rn = 1
  ),
  upserted AS (
    UPDATE perform_players p
    SET
      height                = COALESCE(b.height, p.height),
      weight                = COALESCE(b.weight, p.weight),
      hometown              = COALESCE(b.hometown, p.hometown),
      twitter_handle        = COALESCE(b.twitter_handle, p.twitter_handle),
      instagram_handle      = COALESCE(b.instagram_handle, p.instagram_handle),
      highlight_url         = COALESCE(b.highlight_url, p.highlight_url),
      enrichment_sources    = CASE
                                WHEN p.enrichment_sources IS NULL
                                  THEN b.source_domain
                                WHEN POSITION(b.source_domain IN p.enrichment_sources) > 0
                                  THEN p.enrichment_sources
                                ELSE p.enrichment_sources || ',' || b.source_domain
                              END,
      enrichment_updated_at = NOW(),
      updated_at            = NOW()
    FROM best b
    WHERE LOWER(p.name) = LOWER(b.name)
      AND LOWER(COALESCE(p.school, '')) = LOWER(COALESCE(b.school, ''))
    RETURNING b.id AS staging_id
  )
  UPDATE sqwaadrun_staging.athlete_enrichment
  SET promoted = TRUE, promoted_at = NOW()
  WHERE id IN (SELECT staging_id FROM upserted);

  GET DIAGNOSTICS promoted_count = ROW_COUNT;
  RETURN promoted_count;
END;
$$ LANGUAGE plpgsql;

-- ─── NIL signal promotion ────────────────────────────────────────────
-- Aggregates the latest signal per athlete and updates the rolled-up
-- perform_players.nil_followers_total + nil_valuation_usd columns.

CREATE OR REPLACE FUNCTION sqwaadrun_staging.promote_nil_signals()
RETURNS INTEGER AS $$
DECLARE
  promoted_count INTEGER := 0;
BEGIN
  WITH latest AS (
    SELECT DISTINCT ON (LOWER(athlete_name), LOWER(COALESCE(school, '')), metric)
      id, athlete_name, school, metric, value_numeric, observed_at
    FROM sqwaadrun_staging.nil_signal
    WHERE promoted = FALSE
    ORDER BY LOWER(athlete_name), LOWER(COALESCE(school, '')), metric, observed_at DESC
  ),
  rolled AS (
    SELECT
      athlete_name,
      school,
      SUM(CASE WHEN metric = 'followers' THEN value_numeric ELSE 0 END) AS followers,
      MAX(CASE WHEN metric = 'valuation' THEN value_numeric ELSE NULL END) AS valuation,
      ARRAY_AGG(id) AS source_ids
    FROM latest
    GROUP BY athlete_name, school
  ),
  upserted AS (
    UPDATE perform_players p
    SET
      nil_followers_total   = COALESCE(r.followers, p.nil_followers_total),
      nil_valuation_usd     = COALESCE(r.valuation, p.nil_valuation_usd),
      enrichment_updated_at = NOW(),
      updated_at            = NOW()
    FROM rolled r
    WHERE LOWER(p.name) = LOWER(r.athlete_name)
      AND LOWER(COALESCE(p.school, '')) = LOWER(COALESCE(r.school, ''))
    RETURNING UNNEST(r.source_ids) AS staging_id
  )
  UPDATE sqwaadrun_staging.nil_signal
  SET promoted = TRUE, promoted_at = NOW()
  WHERE id IN (SELECT staging_id FROM upserted);

  GET DIAGNOSTICS promoted_count = ROW_COUNT;
  RETURN promoted_count;
END;
$$ LANGUAGE plpgsql;

-- ─── Combined promotion runner ───────────────────────────────────────
CREATE OR REPLACE FUNCTION sqwaadrun_staging.promote_all()
RETURNS TABLE(athlete_count INTEGER, nil_count INTEGER) AS $$
BEGIN
  RETURN QUERY SELECT
    sqwaadrun_staging.promote_athlete_enrichment(),
    sqwaadrun_staging.promote_nil_signals();
END;
$$ LANGUAGE plpgsql;

-- ═══════════════════════════════════════════════════════════════════
--  GRANTS
-- ═══════════════════════════════════════════════════════════════════
-- The Sqwaadrun ingest user gets full access to the staging schema.
-- The Per|Form read user only sees the perform_players table — never
-- the staging schema.

-- (Apply manually with appropriate role names)
-- GRANT USAGE ON SCHEMA sqwaadrun_staging TO sqwaadrun_ingest;
-- GRANT ALL ON ALL TABLES IN SCHEMA sqwaadrun_staging TO sqwaadrun_ingest;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA sqwaadrun_staging TO sqwaadrun_ingest;
-- REVOKE ALL ON SCHEMA sqwaadrun_staging FROM perform_read;
