-- ═══════════════════════════════════════════════════════════
-- GRAMMAR: User management for Neon Postgres + Firebase Auth
-- Firebase handles auth — no auth.users, no auth.uid(), no RLS.
-- Enforcement happens at app level in Cloud Run services.
-- ═══════════════════════════════════════════════════════════

-- Profiles: user_id is a Firebase UID stored as TEXT
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,  -- Firebase UID
  display_name TEXT,
  role TEXT DEFAULT 'user',
  tier TEXT DEFAULT 'free',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Subscriptions
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Firebase UID
  plan TEXT NOT NULL DEFAULT 'free',
  status TEXT NOT NULL DEFAULT 'active',
  stripe_subscription_id TEXT UNIQUE,
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Usage tracking
CREATE TABLE IF NOT EXISTS public.usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Firebase UID
  metric TEXT NOT NULL,
  value BIGINT NOT NULL DEFAULT 0,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, metric, period_start)
);

-- Tasks
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Firebase UID
  title TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  metadata JSONB DEFAULT '{}',
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);


-- ═══════════════════════════════════════════════════════════
-- App-callable provisioning function (replaces auth.users trigger)
-- Called by Cloud Run on first Firebase login
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.provision_user(
  p_firebase_uid TEXT,
  p_display_name TEXT DEFAULT NULL,
  p_email TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role, tier)
  VALUES (
    p_firebase_uid,
    COALESCE(p_display_name, split_part(COALESCE(p_email, 'user'), '@', 1)),
    'user',
    'free'
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
  VALUES (
    p_firebase_uid,
    'free',
    'active',
    now(),
    now() + INTERVAL '100 years'
  )
  ON CONFLICT DO NOTHING;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════
-- Tier limits function (used by paywall checks)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_tier_limits(user_tier TEXT)
RETURNS JSONB AS $$
BEGIN
  RETURN CASE user_tier
    WHEN 'free' THEN jsonb_build_object(
      'max_sources', 3,
      'max_research_queries_per_day', 10,
      'max_agents', 1,
      'max_storage_mb', 50,
      'deep_research', false,
      'custom_models', false
    )
    WHEN 'pro' THEN jsonb_build_object(
      'max_sources', 50,
      'max_research_queries_per_day', 500,
      'max_agents', 10,
      'max_storage_mb', 5000,
      'deep_research', true,
      'custom_models', true
    )
    WHEN 'enterprise' THEN jsonb_build_object(
      'max_sources', -1,
      'max_research_queries_per_day', -1,
      'max_agents', -1,
      'max_storage_mb', -1,
      'deep_research', true,
      'custom_models', true
    )
    ELSE jsonb_build_object('error', 'unknown_tier')
  END;
END;
$$ LANGUAGE plpgsql STABLE;


-- ═══════════════════════════════════════════════════════════
-- Usage increment function (called by API routes)
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.increment_usage(
  p_user_id TEXT,
  p_metric TEXT,
  p_amount BIGINT DEFAULT 1
)
RETURNS VOID AS $$
DECLARE
  period_s TIMESTAMPTZ := date_trunc('month', now());
  period_e TIMESTAMPTZ := date_trunc('month', now()) + INTERVAL '1 month';
BEGIN
  INSERT INTO public.usage_tracking (user_id, metric, value, period_start, period_end)
  VALUES (p_user_id, p_metric, p_amount, period_s, period_e)
  ON CONFLICT (user_id, metric, period_start)
  DO UPDATE SET value = usage_tracking.value + p_amount;
END;
$$ LANGUAGE plpgsql;


-- ═══════════════════════════════════════════════════════════
-- Indexes
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_metric ON usage_tracking(user_id, metric, period_start);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
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
  is_active BOOLEAN DEFAULT true
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
-- ═══════════════════════════════════════════════════════════
-- THE DEPLOY PLATFORM: Memory Layer
-- Conversations, messages, semantic memory, data sources
-- Neon Postgres. No RLS. Enforcement at app level.
-- ═══════════════════════════════════════════════════════════

-- Conversations: persistent threads per user
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  status TEXT NOT NULL DEFAULT 'active',  -- active, archived
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages: every message in every conversation
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,           -- user, acheevy, system, agent
  agent_name TEXT,              -- which agent responded (null for user messages)
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}', -- tokens, cost, model, attachments, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Memory: semantic long-term memory per user
-- Embeddings generated by Gemini, searchable by similarity
CREATE TABLE IF NOT EXISTS public.memory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,                -- short summary for display
  embedding VECTOR(768),       -- Gemini text-embedding-004 dimension
  source_type TEXT DEFAULT 'conversation',  -- conversation, upload, manual
  source_id UUID,              -- reference to conversation or source
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data sources: user-uploaded or created context (NotebookLM-style)
CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  source_type TEXT NOT NULL,    -- url, document, text, pdf, image
  content TEXT,                 -- raw content or extracted text
  url TEXT,                     -- original URL if applicable
  file_path TEXT,               -- GCS path if uploaded
  metadata JSONB DEFAULT '{}',
  embedding VECTOR(768),        -- embedded for semantic search
  status TEXT DEFAULT 'processing',  -- processing, ready, failed
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pgvector extension for embeddings
CREATE EXTENSION IF NOT EXISTS vector;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_user ON messages(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_memory_user ON memory(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_embedding ON memory USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_data_sources_user ON data_sources(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_data_sources_embedding ON data_sources USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
