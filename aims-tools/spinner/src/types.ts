/**
 * Spinner — Types
 * ===============
 * Core type vocabulary for the Spinner autonomous chat-execution feature.
 *
 * Spinner is the A.I.M.S. equivalent of Genspark's Speakly — built
 * independently. We do NOT use Genspark code or branding.
 */

// ─── Surface identification ──────────────────────────────────────────

/** Which platform Spinner is running inside. */
export type ChatSurface =
  | 'deploy'
  | 'aims-core'
  | 'cti-hub'
  | 'perform'
  | 'smelteros'
  | 'sqwaadrun'
  | 'tps-report-ang';

// ─── Intent recognition (RFP-BAMARAM) ────────────────────────────────

/**
 * Intent categories Spinner classifies user messages into.
 * Drives the transition decision: chat / simple-task / build-intent.
 */
export type IntentCategory =
  | 'conversation'      // chitchat, no action needed
  | 'question'          // info request, ACHEEVY answers in chat
  | 'simple-task'       // single-step action ACHEEVY handles solo
  | 'build-intent'      // larger work — TRANSITION to Guide Me / Manage It
  | 'pricing-question'  // hand off to TPS_Report_Ang
  | 'status-check'      // pull from PMO Office mission status
  | 'larger-project';   // very large — trigger 3-Consultant Engagement

export interface IntentClassification {
  category: IntentCategory;
  confidence: number; // 0-1
  triggerWords: string[]; // which signals matched
  recommendedAction: SpinnerAction;
  reasoning: string;
}

// ─── Spinner action decisions ────────────────────────────────────────

export type SpinnerAction =
  | { type: 'continue-chat' }
  | { type: 'execute-simple'; description: string }
  | { type: 'transition-guide-me'; suggestedScope: string }
  | { type: 'transition-manage-it'; suggestedScope: string }
  | { type: 'handoff-tps-report-ang'; pricingQuery: string }
  | { type: 'handoff-pmo'; missionId?: string }
  | { type: 'spawn-three-consultant'; suggestedScope: string };

// ─── Background worker ──────────────────────────────────────────────

export type WorkerStatus =
  | 'idle'
  | 'classifying'
  | 'executing'
  | 'streaming'
  | 'awaiting-handoff'
  | 'completed'
  | 'failed';

export interface SpinnerJob {
  id: string;
  surface: ChatSurface;
  userId: string;
  userMessage: string;
  classification: IntentClassification;
  status: WorkerStatus;
  startedAt: string;
  completedAt?: string;
  error?: string;
  pipStreamId?: string;       // links to the PiP reasoning window stream
  liveLookInSessionId?: string; // links to the NVIDIA Cosmos session if active
  missionId?: string;         // links to PMO mission if commissioned
}

// ─── Chat engine selection ──────────────────────────────────────────

/**
 * The default chat model that powers the user-ACHEEVY conversation.
 * Per project_chat_engine_decision.md:
 *   - Gemma is OUT (Rish's experience: unreliable on OpenRouter even funded)
 *   - GLM-5.1 is the default for stability + cost control
 *   - Gemini 3.1 Flash Live is the multimodal upgrade tier
 *   - Claude Haiku 4.5 is the fallback if Anthropic key arrives
 */
export type ChatEngineId =
  | 'glm-5.1'
  | 'gemini-3.1-flash-live'
  | 'claude-haiku-4.5'
  | 'gemini-3-flash';

/**
 * The Computer Use / Playwright model used when Spinner takes
 * autonomous browser control on the user's behalf.
 * Per feedback_rfp_bamaram_always_active.md: GLM-Turbo controls
 * browser/computer actions.
 */
export type ComputerUseEngineId =
  | 'glm-turbo'
  | 'claude-sonnet-4.5-computer-use'
  | 'gemini-3-pro-vision';

export interface EngineConfig {
  primary: ChatEngineId;
  multimodalUpgrade?: ChatEngineId;
  fallback?: ChatEngineId;
  computerUse?: ComputerUseEngineId;
  computerUseFallback?: ComputerUseEngineId;
}

// ─── Live Look In ────────────────────────────────────────────────────

export interface LiveLookInSession {
  id: string;
  jobId: string;
  surface: ChatSurface;
  userId: string;
  cloudRunJobName?: string;
  gpuType?: 'L4' | 'A100' | 'H100';
  omniverseStreamUrl?: string;
  status: 'provisioning' | 'streaming' | 'closed' | 'failed';
  startedAt: string;
  endedAt?: string;
}

// ─── 3-Consultant Engagement ─────────────────────────────────────────

export interface ConsultantPanel {
  jobId: string;
  members: {
    /**
     * Note_Ang — session recorder, audit + pattern detection.
     * Per cti-hub/src/lib/acheevy/guide-me-engine.ts.
     * NOT AVVA NOON — AVVA NOON is platform-level (SmelterOS) and never
     * appears in the chat or in this 3-Consultant Engagement.
     */
    note: string;
    /** ACHEEVY — senior consultant, customer-facing executive */
    acheevy: string;
    /** Specialist consultant matched to the domain */
    consultant: {
      agentId: string;
      department: string;
      reason: string;
    };
  };
  status: 'forming' | 'consulting' | 'executing' | 'completed';
  transcript?: ConsultantMessage[];
}

export interface ConsultantMessage {
  ts: string;
  speaker: 'note' | 'acheevy' | 'consultant' | 'user' | 'consult_ang';
  content: string;
}

// ─── Sidecar interface ──────────────────────────────────────────────

/**
 * Spinner runs as a sidecar attached to every chat surface.
 * The chat UI calls onUserMessage() with each new message; Spinner
 * returns the SpinnerAction the chat should take next.
 */
export interface SpinnerSidecar {
  surface: ChatSurface;
  onUserMessage(input: { userId: string; message: string }): Promise<SpinnerAction>;
  startJob(input: { userId: string; message: string; classification: IntentClassification }): Promise<SpinnerJob>;
  getJob(jobId: string): SpinnerJob | undefined;
  cancelJob(jobId: string): Promise<void>;
}
