-- ============================================================
-- Migration 004: seed Consult_Ang and Note_Ang
-- ============================================================
-- These two agents already exist in production at
-- cti-hub/src/lib/acheevy/guide-me-engine.ts but were missing from
-- the canonical roster. They form the 3-Consultant Engagement
-- alongside ACHEEVY:
--
--   1. Consult_Ang  — Fast responder, active listener
--                     Backed by Qwen 3.6 Plus free
--   2. ACHEEVY      — Senior consultant, execution model
--                     (already seeded in migration 002)
--   3. Note_Ang     — Session recorder, audit + pattern detection
--                     Backed by NVIDIA Nemotron Nano free
--
-- Both report to ACHEEVY at the customer-company layer. Department
-- is CONSULT for both — they're a specialized consulting team that
-- ACHEEVY summons during Guide Me / 3-Consultant Engagement flows.
--
-- IMPORTANT: AVVA NOON is NOT involved in this engagement. AVVA NOON
-- operates at the SmelterOS platform layer only. Per fix(spinner)
-- PR #91 + project_spinner_feature.md memory.
-- ============================================================

BEGIN;

-- ── Consult_Ang ─────────────────────────────────────────────
INSERT INTO agent_roster (
  id, agent_name, agent_class, rank, department,
  mature, persona_ref, reports_to
)
VALUES (
  'consult_ang',
  'Consult_Ang',
  'boomer_ang',
  'senior',
  'CONSULT',
  TRUE,
  'cti-hub/src/lib/acheevy/guide-me-engine.ts',
  'acheevy'
)
ON CONFLICT (id) DO UPDATE SET
  agent_name = EXCLUDED.agent_name,
  department = EXCLUDED.department,
  persona_ref = EXCLUDED.persona_ref,
  reports_to = EXCLUDED.reports_to;

-- ── Note_Ang ────────────────────────────────────────────────
INSERT INTO agent_roster (
  id, agent_name, agent_class, rank, department,
  mature, persona_ref, reports_to
)
VALUES (
  'note_ang',
  'Note_Ang',
  'boomer_ang',
  'senior',
  'CONSULT',
  TRUE,
  'cti-hub/src/lib/acheevy/guide-me-engine.ts',
  'acheevy'
)
ON CONFLICT (id) DO UPDATE SET
  agent_name = EXCLUDED.agent_name,
  department = EXCLUDED.department,
  persona_ref = EXCLUDED.persona_ref,
  reports_to = EXCLUDED.reports_to;

COMMIT;
