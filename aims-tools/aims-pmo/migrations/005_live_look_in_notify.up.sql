-- ============================================================
-- Migration 005: Live Look In render event triggers
-- ============================================================
-- Wires the PMO mission tables into the Spinner Live Look In
-- pipeline via Postgres LISTEN/NOTIFY.
--
-- Flow:
--   INSERT into agent_missions (status = 'drafted')
--     → NOTIFY on 'agent_mission_event_{user_id}' with
--       { type: 'mission.commissioned', ... }
--
--   UPDATE agent_missions (status transitions)
--     → NOTIFY { type: 'mission.started' }     when drafted → running
--     → NOTIFY { type: 'mission.completed' }   when running → completed/failed/cancelled
--
--   INSERT into agent_mission_events (streaming log entry)
--     → NOTIFY { type: 'mission.progress', eventType, payload, ... }
--
-- The channel is scoped per user so a given Spinner sidecar listens
-- only for its user's events, avoiding cross-user leakage and saving
-- bandwidth on the Omniverse worker WebRTC bridge.
--
-- The channel name is:
--   'agent_mission_event_' || user_id
--
-- Postgres identifier limit for NOTIFY channel names is 63 bytes.
-- The 20-char prefix leaves 43 bytes for user_id — safe for UUIDs
-- (36 chars). Application code throws if user_id exceeds 43 chars;
-- see aims-tools/spinner/src/live-look-in-events.ts
-- `liveLookInChannelForUser`.
--
-- Shape of the payload matches LiveLookInRenderEvent in
-- aims-tools/spinner/src/live-look-in-events.ts. Keep the two in sync —
-- if one changes, the other must too.
--
-- Not emitted from DB triggers (emitted from application code in
-- aims-tools/spinner/src/three-consultant-engagement.ts):
--   - 'consultant.panel.formed' — no consultant_panels table exists yet
--   - 'scene.change' — emitted when Spinner explicitly changes scenes
-- ============================================================

BEGIN;

-- ── Trigger 1: mission commissioned / started / completed ──────────

CREATE OR REPLACE FUNCTION aims_pmo_mission_notify_change()
RETURNS TRIGGER AS $$
DECLARE
  channel TEXT;
  payload JSONB;
  event_type TEXT;
  outcome TEXT;
  duration_ms BIGINT;
BEGIN
  -- Determine event type from the operation + status transition
  IF TG_OP = 'INSERT' THEN
    -- New mission row = commissioned (draft brief submitted)
    event_type := 'mission.commissioned';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.status = 'running' THEN
        event_type := 'mission.started';
      ELSIF NEW.status IN ('completed', 'failed', 'cancelled') THEN
        event_type := 'mission.completed';
      ELSE
        -- Status changed but not to a Live-Look-In-relevant state
        RETURN NEW;
      END IF;
    ELSE
      -- UPDATE without a status change — skip the notify
      RETURN NEW;
    END IF;
  ELSE
    -- DELETE: not currently surfaced to Live Look In
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- Build the user-scoped channel name
  channel := 'agent_mission_event_' || NEW.user_id;

  -- Build the payload matching LiveLookInRenderEvent
  IF event_type = 'mission.commissioned' THEN
    payload := jsonb_build_object(
      'type',           event_type,
      'ts',             to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'userId',         NEW.user_id,
      'missionId',      NEW.id::text,
      'commissionedBy', NEW.commissioned_by,
      'assignedAgent',  NEW.assigned_agent,
      'missionType',    NEW.mission_type,
      'briefScope',     NEW.brief_scope
    );

  ELSIF event_type = 'mission.started' THEN
    payload := jsonb_build_object(
      'type',      event_type,
      'ts',        to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'userId',    NEW.user_id,
      'missionId', NEW.id::text,
      'agentId',   NEW.assigned_agent
    );

  ELSIF event_type = 'mission.completed' THEN
    outcome := NEW.status; -- 'completed' | 'failed' | 'cancelled'
    duration_ms := CASE
      WHEN NEW.completed_at IS NOT NULL THEN
        EXTRACT(EPOCH FROM (NEW.completed_at - NEW.commissioned_at))::BIGINT * 1000
      ELSE
        NULL
    END;

    payload := jsonb_build_object(
      'type',       event_type,
      'ts',         to_char(NOW() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
      'userId',     NEW.user_id,
      'missionId',  NEW.id::text,
      'agentId',    NEW.assigned_agent,
      'outcome',    outcome,
      'durationMs', duration_ms
    );
  END IF;

  -- Publish
  PERFORM pg_notify(channel, payload::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_missions_notify ON agent_missions;
CREATE TRIGGER trg_agent_missions_notify
  AFTER INSERT OR UPDATE ON agent_missions
  FOR EACH ROW
  EXECUTE FUNCTION aims_pmo_mission_notify_change();


-- ── Trigger 2: mission progress (streaming log) ────────────────────

CREATE OR REPLACE FUNCTION aims_pmo_mission_event_notify()
RETURNS TRIGGER AS $$
DECLARE
  channel TEXT;
  payload JSONB;
  mission_user TEXT;
  mission_agent TEXT;
BEGIN
  -- Look up the mission's user_id and assigned_agent to scope the
  -- channel correctly. If the mission is gone, silently drop.
  SELECT user_id, assigned_agent
    INTO mission_user, mission_agent
    FROM agent_missions
   WHERE id = NEW.mission_id;

  IF mission_user IS NULL THEN
    RETURN NEW;
  END IF;

  channel := 'agent_mission_event_' || mission_user;

  payload := jsonb_build_object(
    'type',      'mission.progress',
    'ts',        to_char(NEW.ts AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'userId',    mission_user,
    'missionId', NEW.mission_id::text,
    'agentId',   mission_agent,
    'eventType', NEW.event_type,
    'payload',   NEW.payload
  );

  PERFORM pg_notify(channel, payload::text);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_agent_mission_events_notify ON agent_mission_events;
CREATE TRIGGER trg_agent_mission_events_notify
  AFTER INSERT ON agent_mission_events
  FOR EACH ROW
  EXECUTE FUNCTION aims_pmo_mission_event_notify();

COMMIT;
