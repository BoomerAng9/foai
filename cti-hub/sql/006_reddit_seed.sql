-- Initial monitored subreddits — community topics for FOAI/Per|Form
INSERT INTO monitored_subreddits (subreddit, category, fetch_mode, min_score) VALUES
  -- Draft & Scouting
  ('NFL_Draft', 'draft', 'hot', 10),
  ('nfl', 'league', 'hot', 50),
  ('CFB', 'college', 'hot', 20),

  -- Fantasy & Analytics
  ('fantasyfootball', 'fantasy', 'hot', 15),
  ('DynastyFF', 'fantasy', 'hot', 10),
  ('NFLstatstalk', 'analytics', 'new', 3),

  -- AI & Tech (for Deploy Platform context)
  ('artificial', 'tech', 'hot', 25),
  ('MachineLearning', 'tech', 'hot', 30),
  ('LocalLLaMA', 'tech', 'hot', 20),

  -- Business & Startup
  ('SaaS', 'business', 'hot', 10),
  ('startups', 'business', 'hot', 15),
  ('Entrepreneur', 'business', 'hot', 20)
ON CONFLICT (subreddit) DO NOTHING;
