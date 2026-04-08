/**
 * @aims/pmo — Types
 * =================
 * Mirrors the SQL schema in migrations/001_init.up.sql.
 */

// ─── Roster ──────────────────────────────────────────────────────────

export type AgentClass =
  | 'avva_noon'
  | 'acheevy'
  | 'boomer_ang'
  | 'chicken_hawk'
  | 'lil_hawk'
  | 'sqwaadrun'
  | 'specialist'
  | 'pmo'
  | 'tps_ang';

export type AgentRank =
  | 'trainee'
  | 'junior'
  | 'senior'
  | 'lead'
  | 'c_suite'
  | 'ceo'
  | 'evaluator'
  | '2ic'
  | 'platform_brain';

export interface AgentRosterEntry {
  id: string;
  agentName: string;
  agentClass: AgentClass;
  rank: AgentRank;
  department: string | null;
  mature: boolean;
  avatarUrl: string | null;
  personaRef: string | null;
  reportsTo: string | null;
  createdAt: string;
  promotedAt: string | null;
}

// ─── Missions ────────────────────────────────────────────────────────

export type MissionStatus =
  | 'drafted'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface MissionBrief {
  scope: string;
  vision: string;
  expectedOutcome: string;
  kpis?: Record<string, unknown>;
  resources?: Record<string, unknown>;
}

export interface MissionOutcome {
  report: string;
  actual?: Record<string, unknown>;
  costUsd?: number;
  tokens?: number;
  durationMs?: number;
}

export interface AgentMission {
  id: string;
  userId: string;
  commissionedBy: string;
  commissionedAt: string;
  assignedAgent: string;
  missionType: string;

  briefScope: string;
  briefVision: string;
  briefExpectedOutcome: string;
  briefKpis: Record<string, unknown> | null;
  briefResources: Record<string, unknown> | null;
  briefSubmittedAt: string;

  reasoningStream: ReasoningEntry[] | null;
  upchainConsulted: UpchainConsult[] | null;

  outcomeReport: string | null;
  outcomeActual: Record<string, unknown> | null;
  outcomeCostUsd: number | null;
  outcomeTokens: number | null;
  outcomeDurationMs: number | null;
  outcomeSubmittedAt: string | null;

  status: MissionStatus;
  createdAt: string;
  completedAt: string | null;
}

export interface ReasoningEntry {
  ts: string;
  agentId: string;
  thought: string;
  decision?: string;
  pondering?: string;
}

export interface UpchainConsult {
  agentId: string;
  advice: string;
  at: string;
}

// ─── Mission events (streaming log) ──────────────────────────────────

export type MissionEventType =
  | 'tool_call'
  | 'decision'
  | 'blocker'
  | 'progress'
  | 'cost'
  | 'reasoning'
  | 'consult'
  | 'handoff';

export interface MissionEvent {
  id: number;
  missionId: string;
  eventType: MissionEventType;
  payload: Record<string, unknown>;
  ts: string;
}

// ─── Evaluations (Betty-Anne_Ang's three layers) ────────────────────

export type Classification =
  | 'example_leader'
  | 'development_partner'
  | 'pip'
  | 'pei';

export interface FitIndexScores {
  empathy?: -1 | 0 | 1;
  vision?: -1 | 0 | 1;
  problemSolving?: -1 | 0 | 1;
  passion?: -1 | 0 | 1;
  reliability?: -1 | 0 | 1;
  collaboration?: -1 | 0 | 1;
  clientCentricity?: -1 | 0 | 1;
  workKsa?: -1 | 0 | 1;
  workRoles?: -1 | 0 | 1;
  workEnjoys?: -1 | 0 | 1;
  cultural?: -1 | 0 | 1;
  performance?: -3 | -2 | 0 | 1 | 2;
  keeperHireToday?: -1 | 0 | 2;
  keeperFightToKeep?: -1 | 0 | 2;
}

export interface KpiOkrScores {
  qualityOfWork?: 1 | 2 | 3 | 4 | 5;
  timeliness?: 1 | 2 | 3 | 4 | 5;
  creativity?: 1 | 2 | 3 | 4 | 5;
  teamwork?: 1 | 2 | 3 | 4 | 5;
  communication?: 1 | 2 | 3 | 4 | 5;
  professionalism?: 1 | 2 | 3 | 4 | 5;
}

export interface VibeScores {
  verifiable?: number; // 0-1
  idempotent?: number; // 0-1
  bounded?: number;    // 0-1
  evident?: number;    // 0-1
}

export interface AgentEvaluation {
  id: string;
  missionId: string;
  agentId: string;
  evaluator: string;

  fitScores: FitIndexScores;
  fitTotal: number; // generated column

  kpiScores: KpiOkrScores;
  kpiTotal: number; // generated column

  vibeScores: VibeScores;
  vibeScore: number; // generated column

  classification: Classification | null;
  notes: string | null;
  competitorBenchmark: Record<string, unknown> | null;
  promoteCandidate: boolean;
  evaluatedAt: string;
}

// ─── Promotions ──────────────────────────────────────────────────────

export interface AgentPromotion {
  id: string;
  agentId: string;
  fromRank: AgentRank;
  toRank: AgentRank;
  triggeredByEval: string | null;
  approvedBy: string;
  approvedAt: string;
  notes: string | null;
}

// ─── Voice library ───────────────────────────────────────────────────

export type VoiceSource = 'preloaded' | 'custom_spec' | 'cloned' | 'byok';
export type VoiceStatus = 'draft' | 'building' | 'ready' | 'failed';

export interface VoiceLibraryEntry {
  id: string;
  userId: string;
  agentId: string | null;
  voiceSource: VoiceSource;
  voiceName: string;
  provider: string;
  providerVoiceId: string | null;
  byokKeyRef: string | null;
  specForm: Record<string, unknown> | null;
  sampleAudioUrl: string | null;
  status: VoiceStatus;
  builtAt: string | null;
  createdAt: string;
}

// ─── Paperform integration ───────────────────────────────────────────

export type PmoFormType =
  | 'mission_brief'
  | 'tna'
  | 'org_fit_index'
  | 'kpi_okr'
  | 'interview_eval'
  | 'onboarding'
  | 'voice_spec'
  | 'incident_response';

export interface PmoForm {
  id: string;
  formType: PmoFormType;
  paperformId: string;
  webhookSecret: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PmoFormDraft {
  id: string;
  userId: string;
  formId: string;
  draftData: Record<string, unknown>;
  currentStep: number;
  createdAt: string;
  updatedAt: string;
}
