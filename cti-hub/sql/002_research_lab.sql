-- ═══════════════════════════════════════════════════════════
-- GRAMMAR Research Lab: NotebookLM & History Support
-- ═══════════════════════════════════════════════════════════

-- Context Packs: Store NotebookLM context mapping
CREATE TABLE IF NOT EXISTS public.context_packs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  notebook_id TEXT NOT NULL, -- The Google NotebookLM ID
  type TEXT DEFAULT 'tli', -- tli, project, general
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Research History: Store queries and responses with citations
CREATE TABLE IF NOT EXISTS public.history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- user, agent
  content TEXT NOT NULL,
  type TEXT NOT NULL, -- research_query, research_response, glm5_response
  metadata JSONB DEFAULT '{}', -- citations, reasoning steps, etc.
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.context_packs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.history ENABLE ROW LEVEL SECURITY;

-- Policies for Context Packs
CREATE POLICY "Users can manage their own context packs"
  ON public.context_packs
  FOR ALL
  USING (auth.uid() = user_id);

-- Policies for History
CREATE POLICY "Users can view their own history"
  ON public.history
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own history"
  ON public.history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_context_packs_user ON context_packs(user_id);
CREATE INDEX IF NOT EXISTS idx_history_user ON history(user_id);
