-- ═══════════════════════════════════════════════════════════
-- GRAMMAR Data Sources: Neon Postgres + Firebase Auth
-- No RLS — enforcement at Cloud Run app level.
-- user_id is Firebase UID (TEXT), not auth.users FK.
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Firebase UID
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  notebook_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_data_sources_user ON public.data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_org ON public.data_sources(organization_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_notebook ON public.data_sources(notebook_id);
