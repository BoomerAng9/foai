/**
 * ACHEEVY + Spinner + Stepper + Taskade orchestration schema
 * ===========================================================
 *
 * This is the canonical data-shape layer for the delegation triad.
 * Per `project_acheevy_canonical_card.md` + `project_taskade_replaces_paperform.md`:
 *
 *   ACHEEVY (Digital CEO) invokes the acheevy_delegate MCP tool
 *     → Spinner routes the call in real-time chat/voice sessions
 *     → Stepper routes the call in workflow/form/webhook/cron flows
 *     → Taskade logs every invocation as the universal audit substrate
 *
 * Every consumer (chat routes, Custom GPT-style user agents, background
 * workers, Live Look In render pipelines) reads and writes these shapes.
 */

import { z } from 'zod';

// ─── Delegation envelope ──────────────────────────────────────────────

/** Who is ACHEEVY delegating to? Tiers match the canonical org chart. */
export const DelegateTargetSchema = z.discriminatedUnion('tier', [
  z.object({
    tier: z.literal('boomer-ang'),
    characterId: z.string(),        // e.g. "iller_ang", "scout_ang"
    pmoOffice: z.enum([
      'technology',
      'finance',
      'operations',
      'marketing',
      'design',
      'publication',
      'hr',
    ]).optional(),
  }),
  z.object({
    tier: z.literal('chicken-hawk'),
  }),
  z.object({
    tier: z.literal('lil-hawk'),
    hawkId: z.string(),             // e.g. "lil_scrapp_hawk"
    squad: z.enum(['build', 'security', 'support', 'sqwaadrun']).optional(),
  }),
  z.object({
    tier: z.literal('custom-gpt'),
    /** A user-built agent. See Custom-GPT schema below. */
    agentId: z.string(),
    /** The owning user. */
    ownerId: z.string(),
  }),
]);
export type DelegateTarget = z.infer<typeof DelegateTargetSchema>;

/** What initiation surface fired this delegation? */
export const InitiationSourceSchema = z.enum([
  'spinner-realtime',    // live chat/voice session
  'stepper-workflow',    // Taskade workflow step
  'stepper-webhook',     // inbound webhook into a Taskade flow
  'stepper-cron',        // scheduled trigger
  'stepper-form',        // form submission
  'custom-gpt-runtime',  // user-built agent runtime
]);
export type InitiationSource = z.infer<typeof InitiationSourceSchema>;

/** The envelope every delegation flows through. */
export const DelegateRequestSchema = z.object({
  /** Idempotency key — same key = same request; re-submits are no-ops. */
  requestId: z.string().uuid(),
  /** Who's delegating (always ACHEEVY for user-facing; can be a custom-gpt for user-built). */
  delegator: z.enum(['acheevy', 'custom-gpt']),
  /** What surface fired this. */
  source: InitiationSourceSchema,
  /** Target of the delegation. */
  target: DelegateTargetSchema,
  /** Plain-language intent — what should the target actually do? */
  intent: z.string().min(1).max(4000),
  /** Optional structured args for the target's handler. */
  args: z.record(z.unknown()).optional(),
  /** User id on whose behalf this runs (for billing + scope + attestation). */
  userId: z.string(),
  /** Tenant / workspace — multi-tenant routing. */
  tenantId: z.string().optional(),
  /** Attestation id from @aims/voice-library if this delegation produces voice/face/NIL output. */
  attestationId: z.string().optional(),
  /** Scopes the user has — filters which targets and tools are reachable. */
  userScopes: z.array(z.string()).default([]),
  /** Created-at ISO timestamp. */
  createdAt: z.string(),
});
export type DelegateRequest = z.infer<typeof DelegateRequestSchema>;

// ─── Delegation outcome ────────────────────────────────────────────────

export const DelegateOutcomeSchema = z.discriminatedUnion('status', [
  z.object({
    status: z.literal('queued'),
    jobId: z.string(),
    message: z.string().optional(),
    /** Where the user can poll / watch progress. */
    pollUrl: z.string().optional(),
  }),
  z.object({
    status: z.literal('completed'),
    jobId: z.string(),
    result: z.record(z.unknown()),
  }),
  z.object({
    status: z.literal('failed'),
    jobId: z.string().optional(),
    error: z.string(),
    code: z.enum([
      'UNAUTHORIZED',
      'ATTESTATION_REQUIRED',
      'ATTESTATION_INVALID',
      'TARGET_UNAVAILABLE',
      'RATE_LIMITED',
      'INTERNAL_ERROR',
    ]),
  }),
]);
export type DelegateOutcome = z.infer<typeof DelegateOutcomeSchema>;

// ─── Taskade audit record ──────────────────────────────────────────────

/** Written to Taskade for every delegation (and mirrored into Neon for query speed). */
export const TaskadeAuditRecordSchema = z.object({
  recordId: z.string().uuid(),
  requestId: z.string().uuid(),
  request: DelegateRequestSchema,
  outcome: DelegateOutcomeSchema,
  /** Total wall-clock of the delegation from queue → terminal state. */
  durationMs: z.number().int().nonnegative(),
  /** Taskade workspace / folder where this record lives for UI surfacing. */
  taskadeWorkspaceId: z.string(),
  taskadeFolderId: z.string().optional(),
  /** ISO timestamps. */
  queuedAt: z.string(),
  completedAt: z.string().optional(),
});
export type TaskadeAuditRecord = z.infer<typeof TaskadeAuditRecordSchema>;

// ─── Custom-GPT (user-built agent) schema ─────────────────────────────

/**
 * A user-built agent. Owners define a persona + tool set + constraints;
 * Spinner/Stepper route delegations through it at runtime.
 *
 * Commercially this is the "Custom GPTs" equivalent — users compose
 * their own assistants on top of ACHEEVY's orchestration spine.
 */
export const CustomAgentSchema = z.object({
  agentId: z.string(),
  ownerId: z.string(),
  /** Display name — what the user named their agent. */
  name: z.string().min(1).max(80),
  /** Short tagline shown on agent cards. */
  tagline: z.string().max(160).optional(),
  /** Full persona — used as the system prompt when the agent speaks. */
  persona: z.string().min(1),
  /** Which tools from Spinner's tool registry the agent can invoke. */
  allowedToolNames: z.array(z.string()).default([]),
  /** Which Boomer_Angs / Lil_Hawks / external APIs the agent may delegate to. */
  allowedDelegationTargets: z.array(DelegateTargetSchema).default([]),
  /** Scopes the agent runs with — subset of owner's scopes. */
  scopes: z.array(z.string()).default([]),
  /** Voice + face bindings for rendered output. */
  voiceAssetId: z.string().optional(),
  faceAssetId: z.string().optional(),
  /**
   * Publishing state:
   *   private    — only owner can invoke
   *   shared     — owner + invited users
   *   workspace  — any user in the same tenant
   *   public     — catalog-discoverable (still sandboxed; owner pays)
   */
  visibility: z.enum(['private', 'shared', 'workspace', 'public']).default('private'),
  /** ISO timestamps. */
  createdAt: z.string(),
  updatedAt: z.string(),
});
export type CustomAgent = z.infer<typeof CustomAgentSchema>;

// ─── Neon DDL (run once per environment) ──────────────────────────────

/**
 * Canonical tables for the orchestration layer. Live alongside the
 * `attestation_records` table from @aims/voice-library.
 */
export const ORCHESTRATION_DDL = `
CREATE TABLE IF NOT EXISTS delegate_requests (
  request_id        UUID PRIMARY KEY,
  delegator         TEXT NOT NULL,
  source            TEXT NOT NULL,
  target_tier       TEXT NOT NULL,
  target_ref        JSONB NOT NULL,
  intent            TEXT NOT NULL,
  args              JSONB,
  user_id           TEXT NOT NULL,
  tenant_id         TEXT,
  attestation_id    TEXT,
  user_scopes       TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS delegate_requests_user_idx
  ON delegate_requests (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS taskade_audit_records (
  record_id             UUID PRIMARY KEY,
  request_id            UUID NOT NULL REFERENCES delegate_requests(request_id),
  outcome_status        TEXT NOT NULL,
  outcome_payload       JSONB NOT NULL,
  duration_ms           INTEGER NOT NULL,
  taskade_workspace_id  TEXT NOT NULL,
  taskade_folder_id     TEXT,
  queued_at             TIMESTAMPTZ NOT NULL,
  completed_at          TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS taskade_audit_records_request_idx
  ON taskade_audit_records (request_id);

CREATE TABLE IF NOT EXISTS custom_agents (
  agent_id                      TEXT PRIMARY KEY,
  owner_id                      TEXT NOT NULL,
  name                          TEXT NOT NULL,
  tagline                       TEXT,
  persona                       TEXT NOT NULL,
  allowed_tool_names            TEXT[] DEFAULT ARRAY[]::TEXT[],
  allowed_delegation_targets    JSONB DEFAULT '[]'::JSONB,
  scopes                        TEXT[] DEFAULT ARRAY[]::TEXT[],
  voice_asset_id                TEXT,
  face_asset_id                 TEXT,
  visibility                    TEXT NOT NULL DEFAULT 'private',
  created_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS custom_agents_owner_idx
  ON custom_agents (owner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS custom_agents_visibility_idx
  ON custom_agents (visibility) WHERE visibility IN ('workspace', 'public');
`;
