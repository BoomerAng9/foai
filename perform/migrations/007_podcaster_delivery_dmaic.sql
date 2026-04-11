-- Migration 007: Delivery preferences, DMAIC/DMADV tracking
-- Depends on: 004_podcaster_tables.sql

-- Delivery preferences on podcaster_users
ALTER TABLE podcaster_users
  ADD COLUMN IF NOT EXISTS delivery_interval TEXT DEFAULT 'daily',
  ADD COLUMN IF NOT EXISTS delivery_time TEXT DEFAULT '05:00',
  ADD COLUMN IF NOT EXISTS delivery_timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS email_delivery BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS delivery_email TEXT,
  ADD COLUMN IF NOT EXISTS delivery_format TEXT DEFAULT 'both',
  ADD COLUMN IF NOT EXISTS notification_channels TEXT[] DEFAULT '{email,dashboard}'::TEXT[];

COMMENT ON COLUMN podcaster_users.delivery_interval IS 'daily | weekly | per_episode | custom';
COMMENT ON COLUMN podcaster_users.delivery_time IS 'HH:MM 24hr format';
COMMENT ON COLUMN podcaster_users.delivery_format IS 'study | commercial | both';

-- DMAIC deliverable audit log
CREATE TABLE IF NOT EXISTS podcaster_deliverable_audit (
  id SERIAL PRIMARY KEY,
  deliverable_id TEXT NOT NULL UNIQUE,
  user_id INT NOT NULL REFERENCES podcaster_users(id) ON DELETE CASCADE,
  deliverable_type TEXT NOT NULL,
  tier_at_delivery TEXT NOT NULL,
  completeness_score INT NOT NULL,
  accuracy_score INT NOT NULL,
  formatting_passed BOOLEAN NOT NULL,
  formatting_issues TEXT[] DEFAULT '{}'::TEXT[],
  gaps TEXT[] DEFAULT '{}'::TEXT[],
  verified_claims INT DEFAULT 0,
  unverified_claims INT DEFAULT 0,
  rerun_count INT DEFAULT 0,
  fixes_applied TEXT[] DEFAULT '{}'::TEXT[],
  final_score INT NOT NULL,
  grade TEXT NOT NULL,
  action TEXT NOT NULL,
  graded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_deliverable_audit_user ON podcaster_deliverable_audit(user_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_audit_grade ON podcaster_deliverable_audit(grade);

-- Chronicle Charter receipts
CREATE TABLE IF NOT EXISTS podcaster_chronicle_charter (
  id SERIAL PRIMARY KEY,
  charter_id TEXT NOT NULL UNIQUE,
  user_id INT NOT NULL REFERENCES podcaster_users(id) ON DELETE CASCADE,
  delivery_date TIMESTAMPTZ NOT NULL,
  tier_at_delivery TEXT NOT NULL,
  deliverables JSONB NOT NULL DEFAULT '[]'::JSONB,
  overall_grade TEXT NOT NULL,
  overall_score INT NOT NULL,
  charter_markdown TEXT,
  generated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_charter_user ON podcaster_chronicle_charter(user_id);
CREATE INDEX IF NOT EXISTS idx_charter_date ON podcaster_chronicle_charter(delivery_date);

-- DMADV design validation log (for new tier/feature design QA)
CREATE TABLE IF NOT EXISTS podcaster_dmadv_specs (
  id SERIAL PRIMARY KEY,
  spec_id TEXT NOT NULL UNIQUE,
  tier_or_feature TEXT NOT NULL,
  customer_requirements JSONB DEFAULT '[]'::JSONB,
  target_personas JSONB DEFAULT '[]'::JSONB,
  quality_metrics JSONB DEFAULT '[]'::JSONB,
  cost_model JSONB DEFAULT '{}'::JSONB,
  can_deliver BOOLEAN,
  risks JSONB DEFAULT '[]'::JSONB,
  producer_workflow JSONB DEFAULT '[]'::JSONB,
  deliverable_set JSONB DEFAULT '[]'::JSONB,
  synthetic_personas_tested INT DEFAULT 0,
  pass_rate NUMERIC(5,2) DEFAULT 0,
  average_grade TEXT,
  verification_issues JSONB DEFAULT '[]'::JSONB,
  approved_for_launch BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_dmadv_feature ON podcaster_dmadv_specs(tier_or_feature);
