/**
 * @aims/spinner
 * =============
 * Spinner — A.I.M.S. autonomous chat-execution feature.
 *
 * Inspired by Genspark's Speakly but built independently. We do NOT
 * use Genspark code or branding. The icon is the Boomer_Ang boomerang;
 * the feature is named "Spinner" (NOT Boomerang — which would conflict
 * with the Boomer_Ang executive class).
 *
 * Public API:
 *   - createSidecar()             build a sidecar for a chat surface
 *   - classify()                  run the RFP-BAMARAM intent classifier
 *   - resolveChatEngine()         look up the default chat model
 *   - startJob() / getJob()       background worker primitives
 *   - provisionSession()          Live Look In session
 *   - spawnPanel()                3-Consultant Engagement panel
 *   - InworldClient               OpenAI-compatible LLM Router client
 *   - runFunctionCalling()        tool-use loop over Inworld
 *   - defaultToolRegistry         process-wide tool registry
 *   - registerPortAuthorityTools  register the shared FOAI tool set
 *   - openRealtimeSession()       Inworld Realtime WebSocket
 *   - handleChatRequest()         drop-in Next.js chat route handler
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
  markSessionReady,
  isLiveLookInConfigured,
} from './live-look-in.js';
export {
  LIVE_LOOK_IN_SCENES,
  getSceneById,
  listScenes,
  getDefaultSceneForSurface,
  isActorAllowedInScene,
} from './scenes/registry.js';
export type {
  LiveLookInScene,
  ActorClass,
  Vec3,
} from './scenes/registry.js';
export {
  liveLookInChannelForUser,
  isLiveLookInRenderEvent,
} from './live-look-in-events.js';
export type {
  LiveLookInRenderEvent,
  MissionCommissionedEvent,
  MissionStartedEvent,
  MissionProgressEvent,
  MissionCompletedEvent,
  ConsultantPanelFormedEvent,
  SceneChangeEvent,
} from './live-look-in-events.js';
export {
  spawnPanel,
  getPanel as getConsultantPanel,
  appendMessage as appendConsultantMessage,
  setPanelStatus as setConsultantPanelStatus,
} from './three-consultant-engagement.js';

// ─── Inworld function-calling surface ──────────────────────────────
export {
  InworldClient,
  InworldError,
  INWORLD_BASE_URL,
  readInworldKey,
  isInworldConfigured,
  mapEngineToInworldModel,
} from './inworld-client.js';
export type {
  InworldTool,
  InworldToolCall,
  InworldToolFunction,
  InworldMessage,
  InworldChatRequest,
  InworldChatResponse,
  InworldChoice,
  InworldUsage,
  InworldClientOptions,
} from './inworld-client.js';

export {
  ToolRegistry,
  defaultToolRegistry,
} from './tool-registry.js';
export type {
  RegisteredTool,
  ToolHandler,
  ToolHandlerContext,
} from './tool-registry.js';

export {
  runFunctionCalling,
  FunctionCallingError,
} from './function-calling.js';
export type {
  FunctionCallingRequest,
  FunctionCallingResponse,
  FunctionCallingTrace,
} from './function-calling.js';

export {
  openRealtimeSession,
  INWORLD_REALTIME_URL,
} from './inworld-realtime.js';
export type {
  RealtimeHandle,
  RealtimeSessionOptions,
  RealtimeServerEvent,
} from './inworld-realtime.js';

export { registerPortAuthorityTools } from './tools/port-authority.js';

export { handleChatRequest } from './chat-route-helper.js';
export type { ChatRouteOptions } from './chat-route-helper.js';
