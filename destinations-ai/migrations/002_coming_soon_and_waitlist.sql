-- =====================================================================
-- Destinations AI — Migration 002
-- Coming Soon expansion roster + region waitlist.
-- =====================================================================

CREATE TABLE IF NOT EXISTS coming_soon_regions (
  region_id                TEXT PRIMARY KEY,
  name                     TEXT NOT NULL,
  geographic_area          TEXT NOT NULL,
  center_lat               DOUBLE PRECISION NOT NULL CHECK (center_lat BETWEEN -90 AND 90),
  center_lng               DOUBLE PRECISION NOT NULL CHECK (center_lng BETWEEN -180 AND 180),
  ambient_palette          TEXT[] NOT NULL
                           CHECK (cardinality(ambient_palette) = 3),
  destination_count        SMALLINT NOT NULL CHECK (destination_count BETWEEN 0 AND 100),
  estimated_unlock_quarter TEXT NOT NULL
                           CHECK (estimated_unlock_quarter ~ '^Q[1-4] \d{4}$'),
  flagship_destinations    TEXT[] NOT NULL,
  region_vibe              TEXT[] NOT NULL,
  waitlist_count           INTEGER NOT NULL DEFAULT 0 CHECK (waitlist_count >= 0),
  summary                  TEXT CHECK (summary IS NULL OR length(summary) <= 2000),
  display_order            SMALLINT NOT NULL DEFAULT 0,

  created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT coming_soon_palette_hex_valid
    CHECK (
      ambient_palette[1] ~ '^#[0-9A-Fa-f]{6}$' AND
      ambient_palette[2] ~ '^#[0-9A-Fa-f]{6}$' AND
      ambient_palette[3] ~ '^#[0-9A-Fa-f]{6}$'
    )
);

CREATE INDEX IF NOT EXISTS coming_soon_order_idx   ON coming_soon_regions(display_order);
CREATE INDEX IF NOT EXISTS coming_soon_unlock_idx  ON coming_soon_regions(estimated_unlock_quarter);

DROP TRIGGER IF EXISTS coming_soon_regions_updated_at ON coming_soon_regions;
CREATE TRIGGER coming_soon_regions_updated_at
  BEFORE UPDATE ON coming_soon_regions
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Waitlist — one entry per (region, email). Denormalized email allows anon signup
-- before a Firebase user exists; user_id attaches once auth is in play.
CREATE TABLE IF NOT EXISTS region_waitlist (
  waitlist_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id     TEXT NOT NULL REFERENCES coming_soon_regions(region_id) ON DELETE CASCADE,
  user_id       TEXT,  -- Firebase UID (nullable for anon signups)
  email         TEXT NOT NULL
                CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'),
  source        TEXT CHECK (source IS NULL OR length(source) <= 64),
  notified      BOOLEAN NOT NULL DEFAULT FALSE,
  notified_at   TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  UNIQUE (region_id, email)
);

CREATE INDEX IF NOT EXISTS region_waitlist_region_idx    ON region_waitlist(region_id);
CREATE INDEX IF NOT EXISTS region_waitlist_user_idx      ON region_waitlist(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS region_waitlist_notified_idx  ON region_waitlist(notified, region_id);

-- Keep waitlist_count denormalized on the region — cheap on signup, avoids COUNT(*) per read.
CREATE OR REPLACE FUNCTION waitlist_count_sync() RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE coming_soon_regions SET waitlist_count = waitlist_count + 1
      WHERE region_id = NEW.region_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE coming_soon_regions SET waitlist_count = GREATEST(waitlist_count - 1, 0)
      WHERE region_id = OLD.region_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS waitlist_count_sync_ins ON region_waitlist;
CREATE TRIGGER waitlist_count_sync_ins
  AFTER INSERT ON region_waitlist
  FOR EACH ROW EXECUTE FUNCTION waitlist_count_sync();

DROP TRIGGER IF EXISTS waitlist_count_sync_del ON region_waitlist;
CREATE TRIGGER waitlist_count_sync_del
  AFTER DELETE ON region_waitlist
  FOR EACH ROW EXECUTE FUNCTION waitlist_count_sync();

COMMENT ON TABLE coming_soon_regions IS
  'Expansion roster surfaced in the ExpansionDrawer UI. Curated by owner; display_order controls rendering sequence.';
COMMENT ON TABLE region_waitlist IS
  'Email signups for region unlock notifications. UNIQUE(region_id, email) prevents duplicates across anon/auth signups for the same email.';
