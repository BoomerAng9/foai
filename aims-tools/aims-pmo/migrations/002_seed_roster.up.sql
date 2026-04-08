-- ============================================================
-- Migration 002: seed the canonical agent roster
-- ============================================================
-- Per project_chain_of_command.md + project_avva_noon_canon.md +
-- project_betty_anne_ang_character_bible.md
--
-- Canonical hierarchy:
--   AVVA NOON (Brain of SmelterOS, platform level)
--     ├── Betty-Anne_Ang (HR PMO, reports to AVVA NOON, peer to ACHEEVY)
--     └── ACHEEVY (The Hand, customer-company Digital CEO)
--           ├── Chicken Hawk (2IC, operations)
--           │     └── Lil_Hawks
--           └── Boomer_Angs (C-suite peers — CTO/CFO/COO/CMO/CDO/CPO)
--                 └── Lil_Hawks (via PMO Office Supervisors or direct)
-- ============================================================

BEGIN;

-- ── Platform brain ──────────────────────────────────────────
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, persona_ref, reports_to)
VALUES
  ('avva_noon', 'AVVA NOON', 'avva_noon', 'platform_brain', 'PLATFORM', TRUE,
   'foai/SmelterOS/smelter/avva-noon/config/prompts/avva-noon-identity.md', NULL)
ON CONFLICT (id) DO NOTHING;

-- ── HR PMO Office (reports to AVVA NOON) ────────────────────
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, persona_ref, reports_to)
VALUES
  ('betty_anne_ang', 'Betty-Anne_Ang', 'pmo', 'evaluator', 'PMO', TRUE,
   'project_betty_anne_ang_character_bible.md', 'avva_noon')
ON CONFLICT (id) DO NOTHING;

-- ── ACHEEVY (The Hand, reports to AVVA NOON) ────────────────
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, persona_ref, reports_to)
VALUES
  ('acheevy', 'ACHEEVY', 'acheevy', 'ceo', 'EXEC', TRUE,
   'project_acheevy_chat_engagement_sop.md', 'avva_noon')
ON CONFLICT (id) DO NOTHING;

-- ── Chicken Hawk (2IC, reports to ACHEEVY) ──────────────────
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, reports_to)
VALUES
  ('chicken_hawk', 'Chicken Hawk', 'chicken_hawk', '2ic', 'OPERATIONS', TRUE, 'acheevy')
ON CONFLICT (id) DO NOTHING;

-- ── Boomer_Angs (C-suite peers, report to ACHEEVY) ──────────
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, reports_to)
VALUES
  ('boomer_cto',  'Boomer_CTO',  'boomer_ang', 'c_suite', 'CTO',  TRUE, 'acheevy'),
  ('boomer_cfo',  'Boomer_CFO',  'boomer_ang', 'c_suite', 'CFO',  TRUE, 'acheevy'),
  ('boomer_coo',  'Boomer_COO',  'boomer_ang', 'c_suite', 'COO',  TRUE, 'acheevy'),
  ('boomer_cmo',  'Boomer_CMO',  'boomer_ang', 'c_suite', 'CMO',  TRUE, 'acheevy'),
  ('boomer_cdo',  'Boomer_CDO',  'boomer_ang', 'c_suite', 'CDO',  TRUE, 'acheevy'),
  ('boomer_cpo',  'Boomer_CPO',  'boomer_ang', 'c_suite', 'CPO',  TRUE, 'acheevy')
ON CONFLICT (id) DO NOTHING;

-- ── TPS_Ang (Pricing Overseer, sub-agent under Boomer_CFO) ──
INSERT INTO agent_roster (id, agent_name, agent_class, rank, department, mature, persona_ref, reports_to)
VALUES
  ('tps_ang', 'TPS_Ang', 'tps_ang', 'senior', 'CFO', TRUE,
   'project_pricing_overseer_agent.md', 'boomer_cfo')
ON CONFLICT (id) DO NOTHING;

COMMIT;
