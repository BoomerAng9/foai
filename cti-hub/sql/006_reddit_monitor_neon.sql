-- 006: Reddit Monitor — tracked subreddits + cached posts
-- Stores subreddit configs and fetched posts for community topic monitoring

CREATE TABLE IF NOT EXISTS monitored_subreddits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subreddit TEXT NOT NULL UNIQUE,       -- e.g. "NFL_Draft", "nfl", "fantasyfootball"
  category TEXT DEFAULT 'general',       -- topic bucket: draft, analytics, fantasy, culture, tech
  enabled BOOLEAN DEFAULT true,
  fetch_mode TEXT DEFAULT 'hot',         -- hot, new, top, rising
  min_score INT DEFAULT 5,               -- minimum upvotes to store
  last_fetched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reddit_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reddit_id TEXT NOT NULL UNIQUE,        -- Reddit's t3_ ID
  subreddit TEXT NOT NULL,
  title TEXT NOT NULL,
  selftext TEXT,
  author TEXT,
  score INT DEFAULT 0,
  num_comments INT DEFAULT 0,
  url TEXT,
  permalink TEXT,
  flair TEXT,
  created_utc TIMESTAMPTZ,
  fetched_at TIMESTAMPTZ DEFAULT NOW(),
  embedded BOOLEAN DEFAULT false,        -- whether we've generated embeddings
  category TEXT                           -- inherited from subreddit or overridden
);

CREATE INDEX IF NOT EXISTS idx_reddit_posts_subreddit ON reddit_posts(subreddit);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_score ON reddit_posts(score DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_created ON reddit_posts(created_utc DESC);
CREATE INDEX IF NOT EXISTS idx_reddit_posts_category ON reddit_posts(category);
