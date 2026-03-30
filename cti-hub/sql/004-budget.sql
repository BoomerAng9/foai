-- Platform budget for POC dev mode
CREATE TABLE IF NOT EXISTS platform_budget (
  id TEXT PRIMARY KEY DEFAULT 'poc-dev',
  starting_balance NUMERIC(10,4) NOT NULL DEFAULT 20.0000,
  remaining_balance NUMERIC(10,4) NOT NULL DEFAULT 20.0000,
  last_reset TIMESTAMPTZ DEFAULT NOW(),
  is_exhausted BOOLEAN DEFAULT FALSE
);

-- Ledger for tracking every cost event
CREATE TABLE IF NOT EXISTS budget_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL,
  action TEXT NOT NULL,
  cost NUMERIC(10,6) NOT NULL,
  balance_after NUMERIC(10,4) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed the initial budget
INSERT INTO platform_budget (id, starting_balance, remaining_balance)
VALUES ('poc-dev', 20.0000, 20.0000)
ON CONFLICT (id) DO NOTHING;
