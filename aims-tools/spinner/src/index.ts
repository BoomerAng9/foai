/**
 * @aims/spinner
 * =============
 * Spinner — A.I.M.S. autonomous chat-execution feature.
 *
 * Inspired by Genspark's Speakly but built independently. We do NOT
 * use Genspark code or branding. The icon is a colorful boomerang
 * with A-N-G markers; the feature is named "Spinner" (NOT Boomerang
 * — which would conflict with the Boomer_Ang executive class).
 *
 * What it does:
 *   - Listens via RFP-BAMARAM intent detection on every user message
 *   - Recognizes when a user wants to BUILD something
 *   - Spawns background execution jobs without interrupting the chat
 *   - Streams progress to the PiP reasoning window
 *   - Surfaces Live Look In (NVIDIA Omniverse + Cosmos via Cloud Run
 *     Jobs) for visualization
 *   - Spawns 3-Consultant Engagement panels for larger projects
 *
 * Where it runs:
 *   - Every chat surface in the ecosystem: Deploy, AIMS, CTI Hub,
 *     Per|Form, SmelterOS
 *   - As a sidecar attached to the chat UI; the chat surface calls
 *     onUserMessage() with each new message
 *
 * Public API:
 *   - createSidecar()           build a sidecar for a chat surface
 *   - classify()                run the RFP-BAMARAM intent classifier
 *   - resolveChatEngine()       look up the default chat model
 *   - startJob() / getJob()     background worker primitives
 *   - provisionSession()        Live Look In session
 *   - spawnPanel()              3-Consultant Engagement panel
 *
 * See README.md and the per-module docstrings for details.
 */

export * from './types.js';
export * from './schema.js';
export {
  classify,
  classifySync,
} from './intent-classifier.js';
export {
  DEFAULT_ENGINE_CONFIG,
  BANNED_DEFAULTS,
  assertNotBanned,
  resolveChatEngine,
  resolveEngineConfig,
  chat,
  prompt,
} from './chat-engine.js';
export {
  startJob,
  getJob,
  listJobs,
  cancelJob,
  onJobEvent,
} from './background-worker.js';
export { createSidecar } from './sidecar.js';
export {
  provisionSession,
  getSession as getLiveLookInSession,
  listSessionsForUser,
  closeSession as closeLiveLookInSession,
} from './live-look-in.js';
export {
  spawnPanel,
  getPanel as getConsultantPanel,
  appendMessage as appendConsultantMessage,
  setPanelStatus as setConsultantPanelStatus,
} from './three-consultant-engagement.js';
