-- Migration 014: perform_submissions table
-- Date: 2026-04-21
-- Purpose:
--   Net-new flagship surface: players, schools, and teams submit their own
--   profile + measurements, the TIE engine grades them, and Per|Form returns
--   a NIL worth valuation anchored to a comparable cohort. This is what makes
--   TIE the flagship (not the Big Board) — it's the grading pipe that powers
--   NIL + Transfer Portal pricing.
--
-- Design:
--   - One row per submission attempt (versioned — re-submits create new rows)
--   - Submitter metadata (who + why) gated by consent flags (NIL dis-
--     closure, public visibility, transfer-portal signal)
--   - Inputs held as JSONB (Performance / Attributes / Intangibles blobs)
--     so the schema evolves without migrations as Per|Form ingests more
--     combine metrics
--   - Outputs (tie_score, tier, nil_valuation_usd, cohort_median_nil)
--     persisted so the card stays stable even if the engine updates later
--   - Optional FK to perform_players for existing prospects — NULL for
--     net-new players (HS, transfer portal, international)

CREATE TABLE IF NOT EXISTS perform_submissions (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ── Submitter identity ────────────────────────────────────────────────
  submitter_email        TEXT        NOT NULL,
  submitter_role         TEXT        NOT NULL
                         CHECK (submitter_role IN ('player','school','team','agent','parent')),
  submitter_org          TEXT        NULL,      -- school / team / agency name (NULL for solo player)

  -- ── Player identity ───────────────────────────────────────────────────
  player_name            TEXT        NOT NULL,
  player_school          TEXT        NULL,
  player_position        TEXT        NOT NULL,
  player_class_year      TEXT        NOT NULL,  -- e.g. '2026','2027','2028','HS','Portal'
  player_height_inches   INTEGER     NULL,
  player_weight_lbs      INTEGER     NULL,
  player_dob             DATE        NULL,
  perform_player_id      INTEGER     NULL REFERENCES perform_players(id) ON DELETE SET NULL,

  -- ── TIE inputs (matches lib/tie/engine.ts Performance/Attributes/Intangibles) ──
  performance_inputs     JSONB       NOT NULL DEFAULT '{}'::JSONB,
  attributes_inputs      JSONB       NOT NULL DEFAULT '{}'::JSONB,
  intangibles_inputs     JSONB       NOT NULL DEFAULT '{}'::JSONB,

  -- ── TIE outputs (cached at submit time) ───────────────────────────────
  tie_score              NUMERIC(5,1) NULL,      -- 0-101
  tie_grade              TEXT         NULL,      -- "A+","A","A-","B+",...
  tie_tier               TEXT         NULL,      -- PRIME | A_PLUS | ...
  tie_components         JSONB        NULL,      -- {performance, attributes, intangibles}
  projected_round        INTEGER      NULL,

  -- ── NIL / Transfer Portal valuation ───────────────────────────────────
  nil_valuation_usd      NUMERIC(12,2) NULL,     -- engine-derived point estimate
  nil_cohort_key         TEXT          NULL,     -- "2026_RB_A_MINUS"
  nil_cohort_size        INTEGER       NULL,     -- number of peers used for comparable
  nil_cohort_median_usd  NUMERIC(12,2) NULL,
  nil_cohort_p10_usd     NUMERIC(12,2) NULL,
  nil_cohort_p90_usd     NUMERIC(12,2) NULL,

  -- ── Consent flags (required, driven by UI checkboxes) ─────────────────
  consent_nil_disclosure     BOOLEAN NOT NULL DEFAULT FALSE,
  consent_public_visibility  BOOLEAN NOT NULL DEFAULT FALSE,
  consent_transfer_portal    BOOLEAN NOT NULL DEFAULT FALSE,
  consent_tos_accepted_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- ── Ops metadata ──────────────────────────────────────────────────────
  status                 TEXT        NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending','graded','published','flagged','withdrawn')),
  flagged_reason         TEXT        NULL,
  source_ip_hash         TEXT        NULL,        -- hashed for abuse tracking
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS perform_submissions_submitter_email_idx
  ON perform_submissions (submitter_email);
CREATE INDEX IF NOT EXISTS perform_submissions_player_name_idx
  ON perform_submissions (LOWER(TRIM(player_name)));
CREATE INDEX IF NOT EXISTS perform_submissions_perform_player_id_idx
  ON perform_submissions (perform_player_id)
  WHERE perform_player_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS perform_submissions_cohort_key_idx
  ON perform_submissions (nil_cohort_key)
  WHERE nil_cohort_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS perform_submissions_status_idx
  ON perform_submissions (status, created_at DESC);

COMMENT ON TABLE perform_submissions IS
  'User-uploaded player profiles for TIE grading + NIL valuation. Flagship user-facing write path — everything else in perform_players is internally seeded.';
