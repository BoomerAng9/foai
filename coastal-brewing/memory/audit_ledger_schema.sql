-- AuditLedger One Direction Schema (renamed from Hermes 2026-04-26)

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
