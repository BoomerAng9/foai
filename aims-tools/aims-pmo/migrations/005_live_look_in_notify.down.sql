-- Rollback for migration 005 — Live Look In render event triggers
BEGIN;

DROP TRIGGER IF EXISTS trg_agent_mission_events_notify ON agent_mission_events;
DROP FUNCTION IF EXISTS aims_pmo_mission_event_notify();

DROP TRIGGER IF EXISTS trg_agent_missions_notify ON agent_missions;
DROP FUNCTION IF EXISTS aims_pmo_mission_notify_change();

COMMIT;
