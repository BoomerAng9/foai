-- Migration 011: Sport-agnostic perform_teams table for the Player Index side panel.
-- Date: 2026-04-20
-- Purpose: Unify NFL / NBA / MLB / CFB teams under one queryable surface so the
-- expandable Player Index drawer on /rankings can surface "all sports → teams →
-- rosters" with a single query pattern. CFB rosters live in perform_players
-- (school column); pro rosters link via team_abbreviation when seeded.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS perform_teams (
  id                       SERIAL PRIMARY KEY,
  team_external_id         UUID NOT NULL DEFAULT gen_random_uuid(),
  sport                    TEXT NOT NULL,                -- 'nfl' | 'nba' | 'mlb' | 'cfb'
  league                   TEXT,                         -- 'NFL' | 'NBA' | 'MLB' | 'FBS' | 'FCS'
  abbreviation             TEXT NOT NULL,                -- 'KC', 'LAL', 'NYY', 'OSU'
  full_name                TEXT NOT NULL,                -- 'Kansas City Chiefs', 'Ohio State'
  short_name               TEXT,                         -- 'Chiefs', 'Buckeyes'
  location                 TEXT,                         -- 'Kansas City, MO'
  conference               TEXT,                         -- 'AFC', 'Eastern', 'Big Ten'
  division                 TEXT,                         -- 'AFC West', 'Atlantic'
  primary_color            TEXT,                         -- '#E31837'
  secondary_color          TEXT,                         -- '#FFB81C'
  logo_url                 TEXT,
  helmet_url               TEXT,
  stadium                  TEXT,
  -- Decision-makers + storylines (JSONB so the rich digital-twin metadata
  -- from perform/data/{nfl,nba,mlb}-teams/*.json round-trips intact)
  ownership                JSONB DEFAULT '{}'::JSONB,
  general_manager          JSONB DEFAULT '{}'::JSONB,
  head_coach               JSONB DEFAULT '{}'::JSONB,
  decision_chain           TEXT,
  -- Draft / season state
  draft_capital_2026       JSONB DEFAULT '{}'::JSONB,
  team_needs               JSONB DEFAULT '[]'::JSONB,
  key_storylines           JSONB DEFAULT '[]'::JSONB,
  window_state             TEXT,                         -- 'contending' | 'retooling' | 'rebuilding'
  -- Audit
  data_source              TEXT,                         -- e.g. 'nfl-teams-2026.json'
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sport, abbreviation)
);

CREATE UNIQUE INDEX IF NOT EXISTS perform_teams_external_id_key
  ON perform_teams (team_external_id);

CREATE INDEX IF NOT EXISTS perform_teams_sport_idx
  ON perform_teams (sport);

CREATE INDEX IF NOT EXISTS perform_teams_conference_idx
  ON perform_teams (sport, conference);

-- ── Roster link: maps player → team for pro leagues ────────────────────────
-- For CFB, perform_players.school is the implicit team link. This table is
-- for NFL/NBA/MLB rosters, which are not in perform_players.
CREATE TABLE IF NOT EXISTS perform_team_rosters (
  id                       SERIAL PRIMARY KEY,
  team_id                  INTEGER NOT NULL REFERENCES perform_teams(id) ON DELETE CASCADE,
  sport                    TEXT NOT NULL,
  player_name              TEXT NOT NULL,
  position                 TEXT,
  jersey_number            INTEGER,
  height                   TEXT,
  weight                   INTEGER,
  age                      INTEGER,
  experience               INTEGER,
  college                  TEXT,
  contract_status          TEXT,
  depth_chart_rank         INTEGER DEFAULT 1,
  injury_status            TEXT DEFAULT 'healthy',
  season                   TEXT DEFAULT '2026',
  -- Optional FK into perform_players for cross-link (when name+college match)
  perform_player_id        INTEGER REFERENCES perform_players(id) ON DELETE SET NULL,
  data_source              TEXT,
  created_at               TIMESTAMPTZ DEFAULT NOW(),
  updated_at               TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_id, player_name, position, season)
);

CREATE INDEX IF NOT EXISTS perform_team_rosters_team_idx
  ON perform_team_rosters (team_id);

CREATE INDEX IF NOT EXISTS perform_team_rosters_sport_idx
  ON perform_team_rosters (sport);

CREATE INDEX IF NOT EXISTS perform_team_rosters_player_link_idx
  ON perform_team_rosters (perform_player_id);

-- ── Convenience view: roster count per team (drives side panel team-card UI) ──
CREATE OR REPLACE VIEW perform_teams_with_roster_counts AS
  SELECT
    t.*,
    COALESCE(r.roster_count, 0) AS roster_count
  FROM perform_teams t
  LEFT JOIN (
    SELECT team_id, COUNT(*)::int AS roster_count
    FROM perform_team_rosters
    GROUP BY team_id
  ) r ON r.team_id = t.id;
