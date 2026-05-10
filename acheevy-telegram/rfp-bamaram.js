/**
 * ACHEEVY Telegram — RFP → BAMARAM bridge.
 *
 * Thin CJS helpers that let the Telegram bot open a Charter + Ledger
 * engagement (Step 1: rfp_intake) and query current stage status. Writes
 * raw SQL against the same Neon tables that `@aims/contracts` manages
 * via its typed ESM helpers — we skip the full TS import chain here to
 * keep the deployed Node bot lean (CommonJS, no build step, file: dep
 * gymnastics avoided).
 *
 * Schema must match `aims-tools/contracts/migrations/` — if that drifts,
 * this file drifts with it.
 *
 * Gate 4 Phase 1 scope: open + check. Advancing beyond rfp_intake,
 * running Picker_Ang at Step 3, and shipping the Charter PDF live in
 * later phases.
 */

'use strict';

const crypto = require('node:crypto');

let _sql = null;

function getSql() {
  if (_sql) return _sql;
  const url = process.env.NEON_URL || process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      '[rfp-bamaram] NEON_URL or DATABASE_URL must be set in the bot env.',
    );
  }
  // Lazy-require so the bot can boot without the dep present during
  // local smoke (bot commands that don't touch RFP continue to work).
  // eslint-disable-next-line global-require
  const postgres = require('postgres');
  _sql = postgres(url, { max: 4, idle_timeout: 30 });
  return _sql;
}

// ── Identity Guard — surface-level scrub ─────────────────────────────
// Mirrors `aims-skills/hooks/identity-guard.hook.ts` policy for the
// Telegram surface. Removes internal agent names and system identifiers
// before any outbound message. Not a substitute for the full hook; just
// a last-line guard for the bot's direct replies.

const BLOCKED_TERMS = [
  // Internal agents
  'Picker_Ang', 'picker_ang', 'NTNTN', 'ntntn',
  'Chicken Hawk', 'Chicken_Hawk', 'chicken_hawk',
  'Lil_Hawk', 'Lil_Hawks', 'lil_hawk', 'lil_hawks',
  'Scout_Ang', 'Content_Ang', 'Biz_Ang', 'Ops_Ang', 'Iller_Ang',
  'CFO_Ang', 'TPS_Report_Ang', 'Betty-Anne_Ang', 'General_Ang',
  'Boomer_Ang', 'boomer_ang',
  // Internal systems
  'OpenClaw', 'openclaw', 'NemoClaw', 'nemoclaw',
  'Hermes V1', 'Hermes V1.0', 'Spinner v1', 'Claw-Code',
  'AVVA NOON', 'avva noon',
  // Infrastructure hints
  'postgres', 'Neon', 'Inworld', 'OpenRouter', 'Gemini',
  'Firecrawl', 'Apify', 'fal.ai', 'Puter',
];

const REPLACEMENTS = {
  'Picker_Ang': 'the tools team',
  'NTNTN': 'the governance layer',
  'Chicken Hawk': 'the operations coordinator',
  'Lil_Hawks': 'the task team',
  'Lil_Hawk': 'the task team',
  'Boomer_Ang': 'a department lead',
  'OpenClaw': 'the runtime',
  'NemoClaw': 'the security layer',
  'Hermes V1.0': 'the learning engine',
  'Hermes V1': 'the learning engine',
  'Spinner v1': 'the execution layer',
  'AVVA NOON': 'the platform brain',
};

// Canonical regex-metacharacter escape for literal match in RegExp.
const RE_ESCAPE = /[.*+?^${}()|[\]\\]/g;

/**
 * Redact internal names from user-facing text. Preserves sentence flow
 * by substituting role-labeled alternatives where available; otherwise
 * strips the phrase silently.
 */
function scrubForCustomer(text) {
  if (typeof text !== 'string' || text.length === 0) return text;
  let out = text;
  // Apply word-boundary replacements first
  for (const [term, replacement] of Object.entries(REPLACEMENTS)) {
    const re = new RegExp(`\\b${term.replace(RE_ESCAPE, '\\$&')}\\b`, 'g');
    out = out.replace(re, replacement);
  }
  // Then strip remaining blocked terms silently
  for (const term of BLOCKED_TERMS) {
    if (Object.prototype.hasOwnProperty.call(REPLACEMENTS, term)) continue;
    const re = new RegExp(`\\b${term.replace(RE_ESCAPE, '\\$&')}\\b`, 'gi');
    out = out.replace(re, '');
  }
  // Collapse double-spaces that result from strips
  return out.replace(/[ \t]{2,}/g, ' ').replace(/\s+([,.;:!?])/g, '$1');
}

// ── Charter + Ledger operations ──────────────────────────────────────

const STAGE_ORDINALS = {
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

const STAGE_LABELS = {
  rfp_intake: 'Intake received',
  rfp_response: 'Researching your brief',
  commercial_proposal: 'Preparing your commercial proposal',
  technical_sow: 'Drafting the technical scope',
  formal_quote: 'Finalizing the quote',
  purchase_order: 'Awaiting your PO approval',
  assignment_log: 'Assigning the team',
  qa_security: 'Running QA + security checks',
  delivery_receipt: 'Delivering your artifacts',
  completion_summary: 'Closing out the engagement',
};

/**
 * Opens a Charter + Ledger pair for a new RFP engagement and stamps
 * Step 1 (rfp_intake). Returns the engagement id for the user to track.
 *
 * brief: free-text from the Telegram message.
 * telegramUserId: numeric Telegram user id, used as the client hint.
 */
async function createRfpIntake({ brief, telegramUserId, telegramHandle }) {
  if (!brief || brief.trim().length === 0) {
    throw new Error('Brief required');
  }
  const sql = getSql();
  const engagementId = crypto.randomUUID();
  const clientId = `tg:${telegramUserId}`;
  const plugId = 'telegram-inbound';

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO charters (
        id, plug_id, client_id, vendor, security_tier,
        voice_services_status, nft_services_status, token
      ) VALUES (
        ${engagementId},
        ${plugId},
        ${clientId},
        ${'Deploy by: ACHIEVEMOR'},
        ${'entry'},
        ${'disabled'},
        ${'disabled'},
        ${null}
      )
    `;
    await tx`INSERT INTO ledgers (id) VALUES (${engagementId})`;
    await tx`
      INSERT INTO charter_stages (
        charter_id, stage, stage_ordinal,
        artifact_uri, what_changed, hitl_gate_status, owner_agent
      ) VALUES (
        ${engagementId},
        ${'rfp_intake'},
        ${STAGE_ORDINALS.rfp_intake},
        ${null},
        ${`Opened from Telegram by @${telegramHandle ?? telegramUserId}. Brief: ${brief.slice(0, 500)}`},
        ${'approved'},
        ${'ACHEEVY'}
      )
    `;
    await tx`
      INSERT INTO ledger_entries (
        ledger_id, stage, entry_type,
        intent, context, action, result, owner
      ) VALUES (
        ${engagementId},
        ${'rfp_intake'},
        ${'ICAR'},
        ${'Open a new engagement from Telegram intake'},
        ${`Telegram user ${clientId} submitted a commercial brief`},
        ${'Charter + Ledger pair created; Step 1 stamped approved'},
        ${`engagement_id=${engagementId}`},
        ${'ACHEEVY'}
      )
    `;
  });

  return { engagementId, stage: 'rfp_intake' };
}

/**
 * Returns a customer-safe status snapshot for an engagement.
 * Never exposes internal team names or ledger detail.
 */
async function getEngagementStatus(engagementId) {
  if (!engagementId || !/^[0-9a-f-]{36}$/i.test(engagementId)) {
    return null;
  }
  const sql = getSql();
  const [charterRow] = await sql`
    SELECT id, plug_id, created_at, security_tier
      FROM charters WHERE id = ${engagementId}
  `;
  if (!charterRow) return null;

  const stageRows = await sql`
    SELECT stage, stage_ordinal, hitl_gate_status, timestamp
      FROM charter_stages
     WHERE charter_id = ${engagementId}
     ORDER BY stage_ordinal DESC
     LIMIT 1
  `;
  const latest = stageRows[0];
  return {
    engagementId,
    createdAt: charterRow.created_at,
    latestStage: latest?.stage ?? 'rfp_intake',
    stageOrdinal: latest?.stage_ordinal ?? 1,
    hitlGateStatus: latest?.hitl_gate_status ?? 'pending',
    label: STAGE_LABELS[latest?.stage ?? 'rfp_intake'],
  };
}

async function close() {
  if (_sql) {
    await _sql.end({ timeout: 5 });
    _sql = null;
  }
}

module.exports = {
  scrubForCustomer,
  createRfpIntake,
  getEngagementStatus,
  close,
  STAGE_LABELS,
  STAGE_ORDINALS,
};
