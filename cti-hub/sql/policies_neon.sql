-- ═══════════════════════════════════════════════════════════
-- GRAMMAR Policies: Neon Postgres + Firebase Auth
-- No RLS — enforcement at Cloud Run app level.
-- user_id columns are Firebase UIDs (TEXT), not auth.users FKs.
-- ═══════════════════════════════════════════════════════════

-- 1. Policies table (application-level policy definitions, NOT Postgres RLS)
CREATE TABLE IF NOT EXISTS public.policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL DEFAULT 'technical',
    rules JSONB NOT NULL DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Policy Enforcement Logs
CREATE TABLE IF NOT EXISTS public.policy_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    policy_id UUID REFERENCES public.policies(id) ON DELETE SET NULL,
    user_id TEXT,  -- Firebase UID
    action TEXT NOT NULL,
    outcome TEXT NOT NULL,
    evidence JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_policies_org ON policies(organization_id);
CREATE INDEX IF NOT EXISTS idx_policies_active ON policies(organization_id, is_active);
CREATE INDEX IF NOT EXISTS idx_policy_logs_org ON policy_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_policy_logs_user ON policy_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_policy_logs_created ON policy_logs(created_at DESC);

-- 4. Helper: get active policies for an org (called by Cloud Run app layer)
CREATE OR REPLACE FUNCTION public.get_active_policies(p_organization_id UUID)
RETURNS SETOF public.policies AS $$
BEGIN
  RETURN QUERY
    SELECT * FROM public.policies
    WHERE organization_id = p_organization_id
      AND is_active = true
    ORDER BY created_at;
END;
$$ LANGUAGE plpgsql STABLE;
