-- ═══════════════════════════════════════════════════════════
-- GRAMMAR Data Sources: NotebookLM-backed source persistence
-- ═══════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.data_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
  notebook_id TEXT NOT NULL,
  title TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.data_sources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own data sources"
  ON public.data_sources
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own data sources"
  ON public.data_sources
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own data sources"
  ON public.data_sources
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own data sources"
  ON public.data_sources
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_data_sources_user ON public.data_sources(user_id);
CREATE INDEX IF NOT EXISTS idx_data_sources_notebook ON public.data_sources(notebook_id);