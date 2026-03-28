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
