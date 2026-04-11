-- Migration 005: NFL teams, rosters, coaches for Per|Form for Podcasters

CREATE TABLE IF NOT EXISTS nfl_teams (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  abbrev TEXT NOT NULL UNIQUE,
  conference TEXT NOT NULL,
  division TEXT NOT NULL,
  primary_color TEXT,
  secondary_color TEXT,
  logo_url TEXT,
  helmet_url TEXT,
  stadium TEXT,
  head_coach TEXT,
  offensive_coordinator TEXT,
  defensive_coordinator TEXT,
  owner TEXT,
  gm TEXT,
  wins_2025 INT DEFAULT 0,
  losses_2025 INT DEFAULT 0,
  draft_picks_2026 JSONB DEFAULT '[]'::JSONB,
  cap_space_2026 NUMERIC,
  top_needs TEXT[] DEFAULT '{}'::TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS nfl_rosters (
  id SERIAL PRIMARY KEY,
  team_abbrev TEXT NOT NULL REFERENCES nfl_teams(abbrev),
  player_name TEXT NOT NULL,
  position TEXT NOT NULL,
  jersey_number INT,
  age INT,
  height TEXT,
  weight INT,
  college TEXT,
  experience INT,
  contract_status TEXT,
  cap_hit NUMERIC,
  stats_2025 JSONB DEFAULT '{}'::JSONB,
  depth_chart_rank INT DEFAULT 1,
  injury_status TEXT DEFAULT 'healthy',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team_abbrev, player_name, position)
);

CREATE INDEX IF NOT EXISTS idx_nfl_rosters_team ON nfl_rosters(team_abbrev);
CREATE INDEX IF NOT EXISTS idx_nfl_rosters_position ON nfl_rosters(position);
