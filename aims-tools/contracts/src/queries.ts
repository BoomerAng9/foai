/**
 * @aims/contracts — read/write helpers.
 *
 * These are pure database operations. They do NOT enforce gating, HITL
 * approval, or Charter-row-existence. Enforcement lives in
 * `validation.ts` and in downstream packages (Spinner / Picker_Ang /
 * ACHEEVY chat routes) that import from here.
 */

import { getSql } from './client.js';
import { RFP_BAMARAM_STAGES, STAGE_ORDINAL, STAGE_DEFAULT_OWNER, type Stage } from './stages.js';
import type { Charter } from './charter-schema.js';
import type { Ledger } from './ledger-schema.js';

export interface CreateEngagementInput {
  engagementId: string;                                   // caller-provided ID (usually a UUID)
  plugId: string;
  clientId: string;
  vendor?: string;
  securityTier?: 'entry' | 'mid' | 'superior' | 'defense_grade';
  voiceServicesStatus?: 'disabled' | 'enabled' | 'custom';
  nftServicesStatus?: 'disabled' | 'enabled' | 'custom';
  token?: string;
}

/**
 * Creates a matched `charters` + `ledgers` pair with the same
 * engagement_id. Does NOT write any charter_stages row — stages are
 * written as they advance via `advanceStage()`.
 */
export async function createEngagement(input: CreateEngagementInput): Promise<{ engagementId: string }> {
  const sql = getSql();
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO charters (
        id, plug_id, client_id, vendor, security_tier,
        voice_services_status, nft_services_status, token
      ) VALUES (
        ${input.engagementId},
        ${input.plugId},
        ${input.clientId},
        ${input.vendor ?? 'Deploy by: ACHIEVEMOR'},
        ${input.securityTier ?? 'entry'},
        ${input.voiceServicesStatus ?? 'disabled'},
        ${input.nftServicesStatus ?? 'disabled'},
        ${input.token ?? null}
      )
    `;
    await tx`INSERT INTO ledgers (id) VALUES (${input.engagementId})`;
  });
  return { engagementId: input.engagementId };
}

export interface AdvanceStageInput {
  stage: Stage;
  artifactUri?: string;
  whatChanged?: string;
  ownerAgent?: string;
  hitlGateStatus?: 'pending' | 'approved' | 'rejected' | 'escalated';
}

/**
 * Writes (or updates) a `charter_stages` row for the given engagement and
 * stage. Pre-condition enforcement (prev stage must exist + be approved)
 * is handled by `validation.assertCanAdvance()` — NOT by this function.
 */
export async function advanceStage(
  engagementId: string,
  input: AdvanceStageInput,
): Promise<void> {
  const sql = getSql();
  const ordinal = STAGE_ORDINAL[input.stage];
  const owner = input.ownerAgent ?? STAGE_DEFAULT_OWNER[input.stage];
  await sql`
    INSERT INTO charter_stages (
      charter_id, stage, stage_ordinal,
      artifact_uri, what_changed, hitl_gate_status, owner_agent
    ) VALUES (
      ${engagementId}, ${input.stage}, ${ordinal},
      ${input.artifactUri ?? null}, ${input.whatChanged ?? null},
      ${input.hitlGateStatus ?? 'pending'}, ${owner}
    )
    ON CONFLICT (charter_id, stage) DO UPDATE SET
      artifact_uri     = EXCLUDED.artifact_uri,
      what_changed     = EXCLUDED.what_changed,
      hitl_gate_status = EXCLUDED.hitl_gate_status,
      owner_agent      = EXCLUDED.owner_agent
  `;
}

/** Full charter + all stages for an engagement. */
export async function getCharter(engagementId: string): Promise<{
  charter: Partial<Charter> | null;
  stages: Array<{ stage: Stage; stageOrdinal: number; hitlGateStatus: string; artifactUri: string | null; ownerAgent: string | null; timestamp: string }>;
}> {
  const sql = getSql();
  const [charterRow] = await sql`SELECT * FROM charters WHERE id = ${engagementId}`;
  if (!charterRow) return { charter: null, stages: [] };
  const stageRows = await sql`
    SELECT stage, stage_ordinal, hitl_gate_status, artifact_uri, owner_agent, timestamp
      FROM charter_stages
     WHERE charter_id = ${engagementId}
     ORDER BY stage_ordinal ASC
  `;
  return {
    charter: charterRow as Partial<Charter>,
    stages: stageRows as Array<{
      stage: Stage;
      stageOrdinal: number;
      hitlGateStatus: string;
      artifactUri: string | null;
      ownerAgent: string | null;
      timestamp: string;
    }>,
  };
}

/** Raw ledger + entries for an engagement. Internal use only. */
export async function getLedger(engagementId: string): Promise<{
  ledger: Partial<Ledger> | null;
  entries: Array<Record<string, unknown>>;
}> {
  const sql = getSql();
  const [ledgerRow] = await sql`SELECT * FROM ledgers WHERE id = ${engagementId}`;
  if (!ledgerRow) return { ledger: null, entries: [] };
  const entries = await sql`
    SELECT * FROM ledger_entries
     WHERE ledger_id = ${engagementId}
     ORDER BY created_at ASC
  `;
  return {
    ledger: ledgerRow as Partial<Ledger>,
    entries: entries as Array<Record<string, unknown>>,
  };
}

export interface AppendLedgerEntryInput {
  entryType: 'ICAR' | 'ACP_Biz' | 'ACP_Tech' | 'FDH' | 'HITL';
  stage?: Stage;
  intent?: string;
  context?: string;
  action?: string;
  result?: string;
  confidence?: number;
  owner?: string;
  sourceAttribution?: unknown;
  payload?: unknown;
}

/** Append-only write to `ledger_entries`. Pure insert, no side-effects. */
export async function appendLedgerEntry(
  engagementId: string,
  input: AppendLedgerEntryInput,
): Promise<void> {
  const sql = getSql();
  await sql`
    INSERT INTO ledger_entries (
      ledger_id, stage, entry_type,
      intent, context, action, result,
      confidence, owner, source_attribution, payload
    ) VALUES (
      ${engagementId},
      ${input.stage ?? null},
      ${input.entryType},
      ${input.intent ?? null},
      ${input.context ?? null},
      ${input.action ?? null},
      ${input.result ?? null},
      ${input.confidence ?? null},
      ${input.owner ?? null},
      ${(input.sourceAttribution ?? null) as any},
      ${(input.payload ?? null) as any}
    )
  `;
}

/** Convenience: returns every stage record in ordinal order. */
export function allStages(): readonly Stage[] {
  return RFP_BAMARAM_STAGES;
}
