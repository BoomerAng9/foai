/**
 * Spinner — Live Look In scene registry
 * =====================================
 * Canonical registry of scenes the NVIDIA Omniverse worker can load
 * for a Live Look In session. Each scene is a stylized virtual
 * environment where agent character models animate the user's Spinner
 * mission live.
 *
 * Per project_live_look_in.md (Rish 2026-04-09): rendering is 2D/3D
 * character animation in Omniverse, NOT pixel-level screen capture.
 * Phase 1 ships 2D sprites (Iller_Ang portraits billboarded inside
 * USD scenes); Phase 2 rigs the C-suite in full 3D; Phase 3 rigs
 * the whole roster. This registry is format-agnostic — the
 * omniverseUsdPath points at whatever asset the current worker image
 * expects (2D sprite scene OR 3D-rigged scene).
 *
 * The worker container (LIVE_LOOK_IN_OMNIVERSE_IMAGE) bundles the USD
 * files at build time, so the path here is relative inside the image.
 * Fetching USDs from GCS at runtime is reserved for a later phase
 * once we've validated the MVP scene set.
 */

import type { ChatSurface } from '../types.js';

// ─── Actor classes allowed on stage ─────────────────────────────────

/**
 * Which agent class can appear in a given scene. The worker uses this
 * to reject render requests for agents that don't belong in the scene
 * (e.g. an AVVA NOON Guardian silhouette should never appear in the
 * user-facing 3-Consultant Engagement room).
 */
export type ActorClass =
  | 'user'                // the human operator's avatar
  | 'acheevy'             // ACHEEVY the Digital CEO
  | 'chicken_hawk'        // Chicken Hawk 2IC / tactical operator
  | 'boomer_ang'          // any C-suite Boomer_Ang
  | 'lil_hawk'            // any worker Lil_Hawk
  | 'note_ang'            // Note_Ang (session recorder; NOT AVVA NOON)
  | 'consult_ang'         // Consult_Ang (default consultant)
  | 'betty_anne_ang'      // HR PMO evaluator (visible only in eval scenes)
  | 'tps_report_ang';     // Pricing Overseer (visible in finance scenes)

// ─── Scene definition ────────────────────────────────────────────────

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export interface LiveLookInScene {
  /** Stable identifier used by Spinner events and worker lookups */
  id: string;
  /** Human-readable name for admin surfaces */
  name: string;
  /** One-sentence description for admin surfaces + Speakly self-navigation */
  description: string;
  /**
   * Path to the USD scene asset inside the Omniverse worker container.
   * Bundled at build time per project_live_look_in.md.
   *
   * Format: relative path inside the worker image's /scenes directory,
   * e.g. 'deploy-port/scene.usd'. The worker resolves this against
   * its own filesystem — never against a local dev tree.
   */
  omniverseUsdPath: string;
  /** Default camera position when the scene loads (Omniverse world units) */
  defaultCameraPosition: Vec3;
  /** Default camera target (what the camera looks at) */
  defaultCameraTarget: Vec3;
  /** Which actor classes are allowed to render in this scene */
  allowedActors: readonly ActorClass[];
  /** Optional ambient audio loop (relative path inside the worker image) */
  ambientAudio?: string;
  /**
   * Which chat surfaces should prefer this scene as their default when
   * a Spinner job begins. A single scene can be the default for multiple
   * surfaces. A surface without a default here falls back to 'deploy-port'.
   */
  defaultForSurfaces?: readonly ChatSurface[];
  /**
   * Whether this scene is owner-only (admin viewing tools like the
   * Chicken Hawk ops floor) vs user-facing (conference room, port).
   */
  ownerOnly?: boolean;
}

// ─── Initial scene catalog ──────────────────────────────────────────
// Seven scenes cover the core user-visible + admin surfaces. Expand
// as animation verbs grow.

export const LIVE_LOOK_IN_SCENES: readonly LiveLookInScene[] = [
  {
    id: 'deploy-port',
    name: 'Deploy Port',
    description:
      'The Deploy Platform hub port — circuit-pattern shipping containers, control tower, coastal Georgia at dusk. The default scene when no other scene matches the mission context.',
    omniverseUsdPath: 'deploy-port/scene.usd',
    defaultCameraPosition: { x: 0, y: 8, z: 20 },
    defaultCameraTarget: { x: 0, y: 2, z: 0 },
    allowedActors: [
      'user',
      'acheevy',
      'chicken_hawk',
      'boomer_ang',
      'lil_hawk',
      'note_ang',
      'consult_ang',
    ],
    ambientAudio: 'deploy-port/ambient-harbor-dusk.ogg',
    defaultForSurfaces: ['deploy', 'cti-hub', 'aims-core'],
  },
  {
    id: 'consultant-conference-room',
    name: 'Consultant Conference Room',
    description:
      'The 3-Consultant Engagement room — circular table with Note_Ang, ACHEEVY, and the specialist consultant seated around the user avatar. Used when Spinner spawns a consulting panel for larger projects.',
    omniverseUsdPath: 'consultant-conference-room/scene.usd',
    defaultCameraPosition: { x: 0, y: 4, z: 6 },
    defaultCameraTarget: { x: 0, y: 1.5, z: 0 },
    allowedActors: ['user', 'acheevy', 'note_ang', 'consult_ang', 'boomer_ang'],
    ambientAudio: 'consultant-conference-room/ambient-low-hum.ogg',
  },
  {
    id: 'war-room',
    name: 'Per|Form War Room',
    description:
      'The Per|Form broadcast-grade war room — draft-board wall, film stations, analyst desks. Used when Spinner is working on Per|Form missions (draft analysis, grading, rankings).',
    omniverseUsdPath: 'war-room/scene.usd',
    defaultCameraPosition: { x: 0, y: 5, z: 10 },
    defaultCameraTarget: { x: 0, y: 2, z: 0 },
    allowedActors: ['user', 'acheevy', 'boomer_ang', 'lil_hawk'],
    ambientAudio: 'war-room/ambient-broadcast-control.ogg',
    defaultForSurfaces: ['perform'],
  },
  {
    id: 'aims-foundry',
    name: 'A.I.M.S. Foundry',
    description:
      'The SmelterOS foundry — molten metal channels, forge stations, crucibles. Used when Spinner is working on core A.I.M.S. platform tasks or SmelterOS governance.',
    omniverseUsdPath: 'aims-foundry/scene.usd',
    defaultCameraPosition: { x: 0, y: 6, z: 12 },
    defaultCameraTarget: { x: 0, y: 2, z: 0 },
    allowedActors: ['user', 'acheevy', 'boomer_ang', 'note_ang'],
    ambientAudio: 'aims-foundry/ambient-forge.ogg',
    defaultForSurfaces: ['smelteros'],
  },
  {
    id: 'chicken-hawk-ops-floor',
    name: 'Chicken Hawk Ops Floor',
    description:
      'Chicken Hawk tactical ops floor — status walls, Lil_Hawk stations, mech pedestal in the center. Used for Sqwaadrun missions and worker-fleet dispatch. Owner-only surface by default.',
    omniverseUsdPath: 'chicken-hawk-ops-floor/scene.usd',
    defaultCameraPosition: { x: 0, y: 7, z: 14 },
    defaultCameraTarget: { x: 0, y: 2, z: 0 },
    allowedActors: ['chicken_hawk', 'lil_hawk', 'acheevy', 'user'],
    ambientAudio: 'chicken-hawk-ops-floor/ambient-radio-chatter.ogg',
    defaultForSurfaces: ['sqwaadrun'],
    ownerOnly: true,
  },
  {
    id: 'lil-hawk-stations',
    name: 'Lil_Hawk Stations',
    description:
      'The worker bay — rows of Lil_Hawk workstations, each with a role-specific gear set. Zooms in on a single Lil_Hawk when a tool call is streaming.',
    omniverseUsdPath: 'lil-hawk-stations/scene.usd',
    defaultCameraPosition: { x: 0, y: 5, z: 10 },
    defaultCameraTarget: { x: 0, y: 1.5, z: 0 },
    allowedActors: ['lil_hawk', 'chicken_hawk'],
    ambientAudio: 'lil-hawk-stations/ambient-keyboard.ogg',
  },
  {
    id: 'cfo-finance-suite',
    name: 'CFO Finance Suite',
    description:
      'CFO_Ang and TPS_Report_Ang work surface — ledger walls, pricing matrix display, token-meter dashboards. Used when Spinner hands off to TPS_Report_Ang for pricing or financial queries.',
    omniverseUsdPath: 'cfo-finance-suite/scene.usd',
    defaultCameraPosition: { x: 0, y: 4, z: 8 },
    defaultCameraTarget: { x: 0, y: 1.5, z: 0 },
    allowedActors: ['tps_report_ang', 'boomer_ang', 'user', 'acheevy', 'lil_hawk'],
    ambientAudio: 'cfo-finance-suite/ambient-ticker.ogg',
  },
] as const;

// ─── Query API ──────────────────────────────────────────────────────

export function getSceneById(id: string): LiveLookInScene | undefined {
  return LIVE_LOOK_IN_SCENES.find((s) => s.id === id);
}

export function listScenes(opts?: { includeOwnerOnly?: boolean }): readonly LiveLookInScene[] {
  const includeOwnerOnly = opts?.includeOwnerOnly ?? false;
  return LIVE_LOOK_IN_SCENES.filter((s) => includeOwnerOnly || !s.ownerOnly);
}

/**
 * Pick the default scene for a chat surface. Falls back to 'deploy-port'
 * if no scene declares itself the default for that surface.
 */
export function getDefaultSceneForSurface(surface: ChatSurface): LiveLookInScene {
  const match = LIVE_LOOK_IN_SCENES.find((s) => s.defaultForSurfaces?.includes(surface));
  if (match) return match;
  const fallback = getSceneById('deploy-port');
  if (!fallback) {
    throw new Error(
      "[live-look-in scenes] 'deploy-port' scene missing from registry — cannot resolve fallback.",
    );
  }
  return fallback;
}

/**
 * Check whether an actor class is allowed to render inside a scene.
 * The worker should call this before instantiating an agent character
 * to prevent cross-scene IP leaks (e.g. AVVA NOON appearing in the
 * consultant conference room).
 */
export function isActorAllowedInScene(sceneId: string, actor: ActorClass): boolean {
  const scene = getSceneById(sceneId);
  if (!scene) return false;
  return scene.allowedActors.includes(actor);
}
