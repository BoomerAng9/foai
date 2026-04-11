-- Migration 006: Live sports tracker — transactions, news, roster changes

CREATE TABLE IF NOT EXISTS sports_transactions (
  id SERIAL PRIMARY KEY,
  sport TEXT NOT NULL,
  team_abbrev TEXT,
  player_name TEXT,
  transaction_type TEXT NOT NULL,
  details TEXT NOT NULL,
  source_url TEXT,
  source_name TEXT,
  transaction_date DATE,
  scraped_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sport, player_name, transaction_type, transaction_date)
);

CREATE TABLE IF NOT EXISTS sports_news_feed (
  id SERIAL PRIMARY KEY,
  sport TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  source_name TEXT NOT NULL,
  source_url TEXT NOT NULL UNIQUE,
  players_mentioned TEXT[] DEFAULT '{}'::TEXT[],
  teams_mentioned TEXT[] DEFAULT '{}'::TEXT[],
  category TEXT,
  published_at TIMESTAMPTZ,
  scraped_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS roster_change_log (
  id SERIAL PRIMARY KEY,
  sport TEXT NOT NULL,
  team_abbrev TEXT NOT NULL,
  player_name TEXT NOT NULL,
  change_type TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  detected_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_sport ON sports_transactions(sport);
CREATE INDEX IF NOT EXISTS idx_transactions_team ON sports_transactions(team_abbrev);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON sports_transactions(transaction_date DESC);
CREATE INDEX IF NOT EXISTS idx_news_sport ON sports_news_feed(sport);
CREATE INDEX IF NOT EXISTS idx_news_teams ON sports_news_feed USING GIN(teams_mentioned);
CREATE INDEX IF NOT EXISTS idx_news_published ON sports_news_feed(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_roster_changes_team ON roster_change_log(team_abbrev);
CREATE INDEX IF NOT EXISTS idx_roster_changes_detected ON roster_change_log(detected_at DESC);
