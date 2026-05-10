-- =====================================================================
-- Destinations AI — Migration 003
-- Per-user state: intentions (natural-language filters) + shortlists.
-- =====================================================================

CREATE TABLE IF NOT EXISTS user_intentions (
  intention_id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        TEXT NOT NULL,  -- Firebase UID
  phrase         TEXT NOT NULL CHECK (length(phrase) BETWEEN 1 AND 200),
  weight         REAL NOT NULL DEFAULT 0.7 CHECK (weight BETWEEN 0 AND 1),
  display_order  SMALLINT NOT NULL DEFAULT 0,

  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS user_intentions_user_idx ON user_intentions(user_id, display_order);

DROP TRIGGER IF EXISTS user_intentions_updated_at ON user_intentions;
CREATE TRIGGER user_intentions_updated_at
  BEFORE UPDATE ON user_intentions
  FOR EACH ROW EXECUTE FUNCTION trigger_updated_at();

-- Shortlist — compound PK prevents duplicates, FK ensures integrity.
CREATE TABLE IF NOT EXISTS user_shortlists (
  user_id         TEXT NOT NULL,  -- Firebase UID
  destination_id  TEXT NOT NULL REFERENCES destinations(destination_id) ON DELETE CASCADE,
  note            TEXT CHECK (note IS NULL OR length(note) <= 500),
  added_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  PRIMARY KEY (user_id, destination_id)
);

CREATE INDEX IF NOT EXISTS user_shortlists_user_idx
  ON user_shortlists(user_id, added_at DESC);

-- Cap intention set size per user — prevent runaway lists.
CREATE OR REPLACE FUNCTION user_intentions_cap() RETURNS TRIGGER AS $$
DECLARE
  cnt INTEGER;
BEGIN
  SELECT COUNT(*) INTO cnt FROM user_intentions WHERE user_id = NEW.user_id;
  IF cnt >= 50 THEN
    RAISE EXCEPTION 'user_intentions cap reached (50) for user_id=%', NEW.user_id
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_intentions_cap_trg ON user_intentions;
CREATE TRIGGER user_intentions_cap_trg
  BEFORE INSERT ON user_intentions
  FOR EACH ROW EXECUTE FUNCTION user_intentions_cap();

COMMENT ON TABLE user_intentions IS
  'Per-user intention set — the Grammar-style natural-language filter chips. Weight tunes influence on Vertex-ranked destination results.';
COMMENT ON TABLE user_shortlists IS
  'Per-user saved destinations. Compound PK prevents duplicates.';
