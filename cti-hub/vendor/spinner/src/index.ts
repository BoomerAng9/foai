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

export * from './types';
export * from './schema';
export {
  classify,
  classifySync,
} from './intent-classifier';
export {
  DEFAULT_ENGINE_CONFIG,
  BANNED_DEFAULTS,
  assertNotBanned,
  resolveChatEngine,
  resolveEngineConfig,
  chat,
  prompt,
} from './chat-engine';
export {
  startJob,
  getJob,
  listJobs,
  cancelJob,
  onJobEvent,
} from './background-worker';
export { createSidecar } from './sidecar';
export {
  provisionSession,
  getSession as getLiveLookInSession,
  listSessionsForUser,
  closeSession as closeLiveLookInSession,
  markSessionReady,
  isLiveLookInConfigured,
} from './live-look-in';
export {
  LIVE_LOOK_IN_SCENES,
  getSceneById,
  listScenes,
  getDefaultSceneForSurface,
  isActorAllowedInScene,
} from './scenes/registry';
export type {
  LiveLookInScene,
  ActorClass,
  Vec3,
} from './scenes/registry';
export {
  liveLookInChannelForUser,
  isLiveLookInRenderEvent,
} from './live-look-in-events';
export type {
  LiveLookInRenderEvent,
  MissionCommissionedEvent,
  MissionStartedEvent,
  MissionProgressEvent,
  MissionCompletedEvent,
  ConsultantPanelFormedEvent,
  SceneChangeEvent,
} from './live-look-in-events';
export {
  spawnPanel,
  getPanel as getConsultantPanel,
  appendMessage as appendConsultantMessage,
  setPanelStatus as setConsultantPanelStatus,
} from './three-consultant-engagement';

// ─── Inworld function-calling surface ──────────────────────────────
export {
  InworldClient,
  InworldError,
  INWORLD_BASE_URL,
  readInworldKey,
  isInworldConfigured,
  mapEngineToInworldModel,
} from './inworld-client';
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
} from './inworld-client';

export {
  ToolRegistry,
  defaultToolRegistry,
} from './tool-registry';
export type {
  RegisteredTool,
  ToolHandler,
  ToolHandlerContext,
} from './tool-registry';

export {
  runFunctionCalling,
  FunctionCallingError,
} from './function-calling';
export type {
  FunctionCallingRequest,
  FunctionCallingResponse,
  FunctionCallingTrace,
} from './function-calling';

export {
  openRealtimeSession,
  INWORLD_REALTIME_URL,
} from './inworld-realtime';
export type {
  RealtimeHandle,
  RealtimeSessionOptions,
  RealtimeServerEvent,
} from './inworld-realtime';

export { registerPortAuthorityTools } from './tools/port-authority';

export { handleChatRequest } from './chat-route-helper';
export type { ChatRouteOptions } from './chat-route-helper';

// ─── Orchestration schema (delegation triad) ────────────────────────
export {
  DelegateTargetSchema,
  InitiationSourceSchema,
  DelegateRequestSchema,
  DelegateOutcomeSchema,
  TaskadeAuditRecordSchema,
  CustomAgentSchema,
  ORCHESTRATION_DDL,
} from './orchestration-schema';
export type {
  DelegateTarget,
  InitiationSource,
  DelegateRequest,
  DelegateOutcome,
  TaskadeAuditRecord,
  CustomAgent,
} from './orchestration-schema';
