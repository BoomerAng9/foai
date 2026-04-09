/**
 * Spinner — Live Look In render events
 * =====================================
 * Canonical typed events that drive the Omniverse render pipeline.
 *
 * Flow:
 *   PMO tables (agent_missions / agent_mission_events)
 *     → Postgres trigger (migration 005_live_look_in_notify.up.sql)
 *     → NOTIFY 'agent_mission_event_{userId}' with a JSON payload
 *     → Spinner sidecar LISTEN on the user's channel
 *     → For each active LiveLookInSession owned by that user,
 *       POST the LiveLookInRenderEvent to the Omniverse worker via
 *       its WebRTC signaling channel
 *     → Worker triggers the corresponding character animation inside
 *       the USD scene (e.g. "ACHEEVY hands off → Boomer_Ang walks
 *       across the port to the Lil_Hawk stations")
 *
 * The event union below is the ONLY contract between the PMO / Spinner
 * core and the Omniverse render worker. Adding a new event type
 * requires updating both the producer (migration + application code)
 * and the consumer (worker). Removing an event type is a breaking
 * change.
 *
 * Not every event comes from a DB trigger. Specifically:
 *   - 'consultant.panel.formed' is emitted from application code in
 *     aims-tools/spinner/src/three-consultant-engagement.ts when
 *     spawnPanel() is called — there is no consultant_panels table
 *     as of this migration. If/when one is added, the event can move
 *     to a DB trigger.
 *   - 'scene.change' is emitted from application code when Spinner
 *     explicitly moves the user's view from one scene to another
 *     (e.g. handoff from ACHEEVY chat to TPS_Report_Ang finance suite).
 */

import type { ChatSurface } from './types.js';

// ─── Base envelope ──────────────────────────────────────────────────

interface BaseEvent {
  /** ISO 8601 timestamp */
  ts: string;
  /** Owning user — the channel scope */
  userId: string;
  /** Optional scene hint for the worker; default comes from the scene registry */
  sceneId?: string;
}

// ─── Event variants ─────────────────────────────────────────────────

export interface MissionCommissionedEvent extends BaseEvent {
  type: 'mission.commissioned';
  missionId: string;
  /** The agent who commissioned the mission (typically 'acheevy') */
  commissionedBy: string;
  /** The agent who was assigned — the one to render entering the scene */
  assignedAgent: string;
  missionType: string;
  briefScope: string;
}

export interface MissionStartedEvent extends BaseEvent {
  type: 'mission.started';
  missionId: string;
  agentId: string;
}

export interface MissionProgressEvent extends BaseEvent {
  type: 'mission.progress';
  missionId: string;
  agentId: string;
  /** Event kind from agent_mission_events.event_type */
  eventType: 'tool_call' | 'decision' | 'blocker' | 'progress' | 'cost' | 'reasoning' | 'consult' | 'handoff';
  payload: Record<string, unknown>;
}

export interface MissionCompletedEvent extends BaseEvent {
  type: 'mission.completed';
  missionId: string;
  agentId: string;
  outcome: 'completed' | 'failed' | 'cancelled';
  durationMs?: number;
}

export interface ConsultantPanelFormedEvent extends BaseEvent {
  type: 'consultant.panel.formed';
  jobId: string;
  members: {
    /** Note_Ang agent id (session recorder). NOT AVVA NOON. */
    note: string;
    /** ACHEEVY agent id */
    acheevy: string;
    /** Specialist consultant agent id */
    consultant: string;
  };
}

export interface SceneChangeEvent extends BaseEvent {
  type: 'scene.change';
  fromSceneId: string;
  toSceneId: string;
  /** Optional reason label for debugging / admin surfaces */
  reason?: string;
  /** Which chat surface triggered the scene change */
  surface?: ChatSurface;
}

// ─── Public union ───────────────────────────────────────────────────

/**
 * Every event the Omniverse render worker must handle.
 */
export type LiveLookInRenderEvent =
  | MissionCommissionedEvent
  | MissionStartedEvent
  | MissionProgressEvent
  | MissionCompletedEvent
  | ConsultantPanelFormedEvent
  | SceneChangeEvent;

// ─── Channel naming ─────────────────────────────────────────────────

/**
 * Postgres NOTIFY channel name scoped per user.
 *
 * Matches the trigger function in
 * aims-tools/aims-pmo/migrations/005_live_look_in_notify.up.sql.
 * Keep these two in sync — if one changes, the other must too.
 *
 * Postgres identifier limit is 63 bytes. 'agent_mission_event_' is
 * 20 chars, leaving 43 chars for userId — safe for UUIDs (36 chars)
 * and typical user id formats.
 */
export function liveLookInChannelForUser(userId: string): string {
  if (!userId) throw new Error('liveLookInChannelForUser: userId required');
  if (userId.length > 43) {
    throw new Error(
      `liveLookInChannelForUser: userId '${userId.slice(0, 20)}…' exceeds 43 chars ` +
        `(Postgres channel name limit is 63 bytes minus the 20-char prefix).`,
    );
  }
  return `agent_mission_event_${userId}`;
}

// ─── Runtime type guards ────────────────────────────────────────────
// Used by the sidecar + worker when decoding raw NOTIFY payloads.

export function isLiveLookInRenderEvent(value: unknown): value is LiveLookInRenderEvent {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.type !== 'string') return false;
  if (typeof v.userId !== 'string') return false;
  if (typeof v.ts !== 'string') return false;
  switch (v.type) {
    case 'mission.commissioned':
      return (
        typeof v.missionId === 'string' &&
        typeof v.commissionedBy === 'string' &&
        typeof v.assignedAgent === 'string' &&
        typeof v.missionType === 'string' &&
        typeof v.briefScope === 'string'
      );
    case 'mission.started':
    case 'mission.completed':
      return typeof v.missionId === 'string' && typeof v.agentId === 'string';
    case 'mission.progress':
      return (
        typeof v.missionId === 'string' &&
        typeof v.agentId === 'string' &&
        typeof v.eventType === 'string' &&
        typeof v.payload === 'object'
      );
    case 'consultant.panel.formed':
      return (
        typeof v.jobId === 'string' &&
        v.members !== null &&
        typeof v.members === 'object'
      );
    case 'scene.change':
      return typeof v.fromSceneId === 'string' && typeof v.toSceneId === 'string';
    default:
      return false;
  }
}
