/**
 * Charter↔Ledger validation helpers.
 *
 * These enforce the dual-surface discipline from
 * docs/canon/sivis_governance.md: before any RFP→BAMARAM stage advances,
 * the previous stage's Charter row must exist AND be approved. Missing or
 * rejected rows trigger FDH + NTNTN HITL escalation.
 *
 * Enforcement is opt-in — Spinner, Picker_Ang, and ACHEEVY chat routes
 * call `assertCanAdvance(...)` before writing the next stage. The helpers
 * here are pure; they throw `CharterRowMissingError` or
 * `CharterGateBlockedError` that callers translate into user-facing
 * responses or FDH tickets.
 */

import { getSql } from './client.js';
import { STAGE_ORDINAL, previousStage, type Stage } from './stages.js';
import { appendLedgerEntry } from './queries.js';

export class CharterRowMissingError extends Error {
  constructor(
    public engagementId: string,
    public missingStage: Stage,
  ) {
    super(
      `Charter row for stage '${missingStage}' not found on engagement '${engagementId}'. ` +
        `Cannot advance to the next stage. Escalate via FDH + NTNTN HITL.`,
    );
    this.name = 'CharterRowMissingError';
  }
}

export class CharterGateBlockedError extends Error {
  constructor(
    public engagementId: string,
    public blockingStage: Stage,
    public gateStatus: string,
  ) {
    super(
      `Charter row for stage '${blockingStage}' on engagement '${engagementId}' ` +
        `has HITL gate status '${gateStatus}' — cannot advance. Escalate via FDH + NTNTN HITL.`,
    );
    this.name = 'CharterGateBlockedError';
  }
}

/**
 * Returns true if the Charter row for (engagementId, stage) exists. Does
 * NOT check HITL gate status. Cheap existence probe.
 */
export async function assertCharterRowExists(
  engagementId: string,
  stage: Stage,
): Promise<boolean> {
  const sql = getSql();
  const [row] = await sql`
    SELECT 1 FROM charter_stages
     WHERE charter_id = ${engagementId} AND stage = ${stage}
     LIMIT 1
  `;
  return !!row;
}

/**
 * Throws if the caller cannot advance to `targetStage` for this
 * engagement. Runs two checks:
 *   1. previous stage's Charter row must exist
 *   2. previous stage's HITL gate must be 'approved'
 *
 * For Step 1 (rfp_intake) there is no previous stage; this always passes.
 * On failure, writes an FDH entry to the Ledger automatically so the
 * escalation is audit-trailed even if the caller doesn't catch the
 * exception.
 */
export async function assertCanAdvance(
  engagementId: string,
  targetStage: Stage,
): Promise<void> {
  const prev = previousStage(targetStage);
  if (prev === null) return;                              // Step 1 has no prerequisite

  const sql = getSql();
  const [row] = await sql`
    SELECT hitl_gate_status
      FROM charter_stages
     WHERE charter_id = ${engagementId} AND stage = ${prev}
     LIMIT 1
  `;

  if (!row) {
    await appendLedgerEntry(engagementId, {
      entryType: 'FDH',
      stage: targetStage,
      payload: {
        trigger: 'missing_previous_charter_row',
        blockingStage: prev,
        targetStage,
      },
      owner: 'system',
    }).catch(() => {
      /* never block on audit-write failure */
    });
    throw new CharterRowMissingError(engagementId, prev);
  }

  if (row.hitlGateStatus !== 'approved') {
    await appendLedgerEntry(engagementId, {
      entryType: 'FDH',
      stage: targetStage,
      payload: {
        trigger: 'previous_stage_not_approved',
        blockingStage: prev,
        gateStatus: row.hitlGateStatus,
        targetStage,
      },
      owner: 'system',
    }).catch(() => {
      /* never block on audit-write failure */
    });
    throw new CharterGateBlockedError(engagementId, prev, String(row.hitlGateStatus));
  }
}

/**
 * Returns the ordinal list of completed stages (HITL approved) for an
 * engagement. Useful for rendering progress UIs.
 */
export async function completedStages(engagementId: string): Promise<Stage[]> {
  const sql = getSql();
  const rows = await sql`
    SELECT stage FROM charter_stages
     WHERE charter_id = ${engagementId} AND hitl_gate_status = 'approved'
     ORDER BY stage_ordinal ASC
  `;
  return rows.map((r: { stage: Stage }) => r.stage);
}

/** For completeness — confirm the STAGE_ORDINAL export stays in sync. */
export { STAGE_ORDINAL };
