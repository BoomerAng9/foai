-- ═══════════════════════════════════════════════════════════
-- CTI HUB: Access Keys + User-Scoped Workspaces
-- Neon Postgres. No RLS. Enforcement at app level.
-- ═══════════════════════════════════════════════════════════

-- Access keys: owner generates, team redeems
CREATE TABLE IF NOT EXISTS public.access_keys (
  key TEXT PRIMARY KEY,
  label TEXT NOT NULL DEFAULT 'Unnamed',
  created_by TEXT NOT NULL,       -- owner email
  created_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  redeemed_by TEXT,               -- team member email
  redeemed_at TIMESTAMPTZ
);

-- Allowed users: populated when a key is redeemed
CREATE TABLE IF NOT EXISTS public.allowed_users (
  email TEXT PRIMARY KEY,
  display_name TEXT,
  access_key TEXT REFERENCES access_keys(key),
  granted_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,
  role TEXT DEFAULT 'member'
);

-- User workspaces: per-user scrape jobs, cleaned data, exports
CREATE TABLE IF NOT EXISTS public.workspace_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,          -- Firebase UID
  job_type TEXT NOT NULL,         -- scrape, clean, export
  status TEXT NOT NULL DEFAULT 'pending',  -- pending, running, done, failed
  input JSONB DEFAULT '{}',       -- URLs, columns, context, etc.
  output JSONB DEFAULT '{}',      -- results, rows, sheet URL, etc.
  model_used TEXT,                -- OpenRouter model ID
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_usd NUMERIC(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_access_keys_active ON access_keys(is_active);
CREATE INDEX IF NOT EXISTS idx_allowed_users_active ON allowed_users(is_active);
CREATE INDEX IF NOT EXISTS idx_workspace_jobs_user ON workspace_jobs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_workspace_jobs_status ON workspace_jobs(user_id, status);
