-- ═══════════════════════════════════════════════════════════
-- GRAMMAR: Auto-profile creation trigger
-- Creates a profile + free subscription for every new user
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, display_name, role, tier)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    'user',
    'free'
  );

  INSERT INTO public.subscriptions (user_id, plan, status, current_period_start, current_period_end)
  VALUES (
    NEW.id,
    'free',
    'active',
    now(),
    now() + INTERVAL '100 years'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach to auth.users on INSERT
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();


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
  p_user_id UUID,
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
  ON CONFLICT DO NOTHING;

  UPDATE public.usage_tracking
  SET value = value + p_amount
  WHERE user_id = p_user_id
    AND metric = p_metric
    AND period_start = period_s;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ═══════════════════════════════════════════════════════════
-- Create indexes for performance
-- ═══════════════════════════════════════════════════════════

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_metric ON usage_tracking(user_id, metric, period_start);
