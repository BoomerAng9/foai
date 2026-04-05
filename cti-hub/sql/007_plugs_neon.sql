-- 007: aiPLUG shipping infrastructure
-- Users can create, configure, deploy, and sell AI plugs

CREATE TABLE IF NOT EXISTS plugs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  model TEXT DEFAULT 'qwen/qwen3.6-plus-preview:free',
  category TEXT DEFAULT 'general',
  icon_url TEXT,
  published BOOLEAN DEFAULT false,
  price_monthly NUMERIC(6,2) DEFAULT 0,
  tools JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  install_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS plug_installs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plug_id UUID NOT NULL REFERENCES plugs(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  installed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(plug_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_plugs_owner ON plugs(owner_id);
CREATE INDEX IF NOT EXISTS idx_plugs_published ON plugs(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_plugs_category ON plugs(category);
CREATE INDEX IF NOT EXISTS idx_plugs_slug ON plugs(slug);
CREATE INDEX IF NOT EXISTS idx_plug_installs_user ON plug_installs(user_id);
