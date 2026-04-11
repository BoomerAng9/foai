-- Migration 004: Per|Form for Podcasters user tables

CREATE TABLE IF NOT EXISTS podcaster_users (
  id SERIAL PRIMARY KEY,
  firebase_uid TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  podcast_name TEXT NOT NULL,
  podcaster_name TEXT NOT NULL,
  location TEXT,
  subscriber_count INT DEFAULT 0,
  primary_platforms TEXT[] DEFAULT '{}'::TEXT[],
  primary_vertical TEXT NOT NULL,
  addon_vertical TEXT,
  selected_team TEXT,
  plan_tier TEXT DEFAULT 'bmc',
  huddl_name TEXT,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcaster_hawks_schema (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES podcaster_users(id) ON DELETE CASCADE,
  mission TEXT,
  vision TEXT,
  objectives JSONB DEFAULT '[]'::JSONB,
  needs_analysis TEXT,
  version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS podcaster_content (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES podcaster_users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content_type TEXT NOT NULL,
  body TEXT,
  transcript TEXT,
  audio_url TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  status TEXT DEFAULT 'draft',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_podcaster_content_user ON podcaster_content(user_id);
CREATE INDEX IF NOT EXISTS idx_podcaster_users_vertical ON podcaster_users(primary_vertical);
CREATE INDEX IF NOT EXISTS idx_podcaster_users_firebase ON podcaster_users(firebase_uid);
