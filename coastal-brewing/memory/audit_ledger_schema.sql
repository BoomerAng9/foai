-- AuditLedger One Direction Schema (renamed from Hermes 2026-04-26)

-- audit_chain — tamper-evident global hash chain spanning every write
-- across task_packets, model_call_receipts, research_receipts,
-- approval_receipts, action_receipts, and risk_events. Each entry's
-- hash includes the previous entry's hash, so mutating any historical
-- row invalidates every subsequent entry's hash. Surfaces via
-- verify_chain() in audit_ledger.py and /audit/integrity-check.
-- Replaces CommonGround Core's "immutable cards" promise in 50 lines
-- instead of 6 containers (Wave 1 Step B replacement, owner-deferred 2026-04-26).
CREATE TABLE IF NOT EXISTS audit_chain (
  chain_id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  source_table TEXT NOT NULL,
  source_id TEXT NOT NULL,
  payload_hash TEXT NOT NULL,
  prev_hash TEXT NOT NULL,
  entry_hash TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS idx_audit_chain_source ON audit_chain(source_table, source_id);
CREATE INDEX IF NOT EXISTS idx_audit_chain_created ON audit_chain(created_at);

CREATE TABLE IF NOT EXISTS task_packets (
  task_id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  owner_goal TEXT NOT NULL,
  department TEXT NOT NULL,
  task_type TEXT NOT NULL,
  route TEXT NOT NULL,
  risk_level TEXT NOT NULL,
  approval_required INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'created',
  receipt_path TEXT
);

CREATE TABLE IF NOT EXISTS model_call_receipts (
  receipt_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  provider TEXT NOT NULL,
  model TEXT,
  route TEXT NOT NULL,
  prompt_summary TEXT,
  output_summary TEXT,
  success INTEGER NOT NULL,
  error TEXT,
  FOREIGN KEY(task_id) REFERENCES task_packets(task_id)
);

CREATE TABLE IF NOT EXISTS research_receipts (
  receipt_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  research_topic TEXT NOT NULL,
  source_count INTEGER DEFAULT 0,
  confidence TEXT,
  allowed_claims TEXT,
  rejected_claims TEXT,
  receipt_path TEXT NOT NULL,
  FOREIGN KEY(task_id) REFERENCES task_packets(task_id)
);

CREATE TABLE IF NOT EXISTS approval_receipts (
  approval_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  requested_action TEXT NOT NULL,
  risk_tags TEXT,
  decision TEXT NOT NULL,
  decided_by TEXT NOT NULL,
  notes TEXT,
  FOREIGN KEY(task_id) REFERENCES task_packets(task_id)
);

CREATE TABLE IF NOT EXISTS action_receipts (
  action_id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  executor TEXT NOT NULL,
  action_type TEXT NOT NULL,
  destination TEXT,
  status TEXT NOT NULL,
  result_summary TEXT,
  FOREIGN KEY(task_id) REFERENCES task_packets(task_id)
);
