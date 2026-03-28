-- ═══════════════════════════════════════════════════════════
-- GRAMMAR Research Lab: Neon Postgres + Firebase Auth
-- No RLS — enforcement at Cloud Run app level.
-- user_id is Firebase UID (TEXT), not auth.users FK.
-- ═══════════════════════════════════════════════════════════

-- Context Packs: Store NotebookLM context mapping
CREATE TABLE IF NOT EXISTS public.context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Firebase UID
  name TEXT NOT NULL,
  notebook_id TEXT NOT NULL,
  type TEXT DEFAULT 'tli',
  metadata JSONB DEFAULT '{}',
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Research History: Store queries and responses with citations
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,  -- Firebase UID
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  organization_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_context_packs_user ON context_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_context_packs_org ON context_packs(organization_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
CREATE INDEX IF NOT EXISTS idx_history_org ON history(organization_id);
CREATE INDEX IF NOT EXISTS idx_history_created ON history(created_at DESC);
