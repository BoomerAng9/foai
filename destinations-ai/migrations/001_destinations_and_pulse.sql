-- =====================================================================
-- Destinations AI — Migration 001
-- Core destinations table + pulse fields (walk/noise/schools/vibe).
-- =====================================================================

-- Shared trigger function — keeps updated_at in sync on any row write.
CREATE OR REPLACE FUNCTION trigger_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS destinations (
  destination_id     TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  region             TEXT NOT NULL,             -- e.g. "Coastal Georgia", "Lowcountry"
  state              CHAR(2) NOT NULL,          -- two-letter ISO state code
  lat                DOUBLE PRECISION NOT NULL CHECK (lat BETWEEN -90 AND 90),
  lng                DOUBLE PRECISION NOT NULL CHECK (lng BETWEEN -180 AND 180),
  median_home_price  INTEGER CHECK (median_home_price >= 0),
  listing_count      INTEGER NOT NULL DEFAULT 0 CHECK (listing_count >= 0),

  -- Pulse fields (nullable until a trusted source attaches them)
  walk_score         SMALLINT CHECK (walk_score BETWEEN 0 AND 100),
  noise_db_min       SMALLINT CHECK (noise_db_min BETWEEN 0 AND 120),
  noise_db_max       SMALLINT CHECK (noise_db_max BETWEEN 0 AND 120),
  school_rating      SMALLINT CHECK (school_rating BETWEEN 0 AND 10),
  vibe_descriptors   TEXT[] NOT NULL DEFAULT '{}',
  ambient_color      TEXT NOT NULL CHECK (ambient_color ~ '^#[0-9A-Fa-f]{6}$'),

  status             TEXT NOT NULL DEFAULT 'live'
                     CHECK (status IN ('live', 'coming_soon', 'archived')),
  data_source        TEXT NOT NULL DEFAULT 'curated'
                     CHECK (data_source IN ('curated','mls','partner','census','walkscore','greatschools')),
  hero_text          TEXT CHECK (hero_text IS NULL OR length(hero_text) <= 500),
  summary            TEXT CHECK (summary IS NULL OR length(summary) <= 2000),

  created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT destinations_noise_range_valid
    CHECK (noise_db_min IS NULL OR noise_db_max IS NULL OR noise_db_max >= noise_db_min)
);

CREATE INDEX IF NOT EXISTS destinations_status_idx ON destinations(status);
CREATE INDEX IF NOT EXISTS destinations_region_idx ON destinations(region);
CREATE INDEX IF NOT EXISTS destinations_state_idx  ON destinations(state);
CREATE INDEX IF NOT EXISTS destinations_price_idx  ON destinations(median_home_price);
CREATE INDEX IF NOT EXISTS destinations_walk_idx   ON destinations(walk_score);

DROP TRIGGER IF EXISTS destinations_updated_at ON destinations;
CREATE TRIGGER destinations_updated_at
  BEFORE UPDATE ON destinations
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Optional audit view — read-only projection for public API.
CREATE OR REPLACE VIEW destinations_public AS
SELECT
  destination_id,
  name,
  region,
  state,
  lat,
  lng,
  median_home_price,
  listing_count,
  walk_score,
  noise_db_min,
  noise_db_max,
  school_rating,
  vibe_descriptors,
  ambient_color,
  hero_text,
  summary,
  updated_at
FROM destinations
WHERE status = 'live';

COMMENT ON TABLE destinations IS
  'Live destinations for the Destinations AI place-first discovery canvas.';
COMMENT ON COLUMN destinations.data_source IS
  'Provenance: curated=hand-researched public data, mls=licensed MLS feed, partner=3rd-party data partner, census/walkscore/greatschools=specific source. Drives refresh cadence + audit trail.';
