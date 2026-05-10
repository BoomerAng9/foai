/**
 * The canonical 10-stage RFP → BAMARAM flow.
 *
 * Source: docs/canon/ACHEEVY_Agent_Logic_Final.md
 * Do NOT add stages without updating the DB enum (migrations/)
 * AND the Charter Template canon doc.
 */

export const RFP_BAMARAM_STAGES = [
  'rfp_intake',
  'rfp_response',
  'commercial_proposal',
  'technical_sow',
  'formal_quote',
  'purchase_order',
  'assignment_log',
  'qa_security',
  'delivery_receipt',
  'completion_summary',
] as const;

export type Stage = (typeof RFP_BAMARAM_STAGES)[number];

export const STAGE_ORDINAL: Record<Stage, number> = {
  rfp_intake: 1,
  rfp_response: 2,
  commercial_proposal: 3,
  technical_sow: 4,
  formal_quote: 5,
  purchase_order: 6,
  assignment_log: 7,
  qa_security: 8,
  delivery_receipt: 9,
  completion_summary: 10,
};

/**
 * Owner-agent mapping per canonical stage definitions. Used to default
 * `owner_agent` on charter_stages writes when the caller doesn't specify.
 */
export const STAGE_DEFAULT_OWNER: Record<Stage, string> = {
  rfp_intake: 'ACHEEVY',
  rfp_response: 'ACHEEVY',
  commercial_proposal: 'NTNTN',
  technical_sow: 'NTNTN',
  formal_quote: 'NTNTN',
  purchase_order: 'CFO_Ang',
  assignment_log: 'CTO_Ang',
  qa_security: 'Farmer',
  delivery_receipt: 'ACHEEVY',
  completion_summary: 'Union',
};

/**
 * Minimum HITL approvers per stage. Some stages require multiple approvers.
 */
export const STAGE_HITL_APPROVERS: Record<Stage, readonly string[]> = {
  rfp_intake: ['requestor'],
  rfp_response: ['product'],
  commercial_proposal: ['NTNTN'],
  technical_sow: ['NTNTN', 'Farmer'],
  formal_quote: ['NTNTN'],
  purchase_order: ['requestor'],
  assignment_log: ['product'],
  qa_security: ['Farmer', 'NTNTN'],
  delivery_receipt: ['requestor'],
  completion_summary: ['product', 'Union'],
};

/** Returns the stage that must be completed before `stage` can advance. */
export function previousStage(stage: Stage): Stage | null {
  const idx = STAGE_ORDINAL[stage];
  if (idx <= 1) return null;
  return RFP_BAMARAM_STAGES[idx - 2];
}

/** Returns the next stage after `stage`, or `null` at completion. */
export function nextStage(stage: Stage): Stage | null {
  const idx = STAGE_ORDINAL[stage];
  if (idx >= RFP_BAMARAM_STAGES.length) return null;
  return RFP_BAMARAM_STAGES[idx];
}
