# @aims/contracts

**Charter ↔ Ledger dual-surface scaffold for the 10-stage RFP → BAMARAM
engagement flow.** Every engagement produces two parallel artifacts:

- **Charter** — customer-safe. The 11 non-negotiable components defined in
  `docs/canon/Deploy-Charter-Template-3.1-UPDATED.md`. Never exposes internal
  margins, costs, tool names, or agent identities.
- **Ledger** — internal audit. ICAR entries (Intent/Context/Action/Result),
  ACP-Biz + ACP-Tech event rails, full cost breakdowns, Picker_Ang BoM,
  rationale, TTD-DR cycles, Melanium Ingot splits.

Both artifacts share one `engagement_id`. A Charter can never advance a
stage without its corresponding Ledger entry. See
`docs/canon/sivis_governance.md#dual-surface-coupling-charter--ledger` for
the governance rules.

## Scope of this PR

**This package is scaffold only.** It ships:

- Neon DDL migrations (`migrations/001_init.up.sql` + `.down.sql`)
- Zod schemas for the 11 Charter components + Ledger entry types
- Postgres client wrapper (porsager) — matches `@aims/pricing-matrix`
  connection pattern
- Read/write query helpers (pure — no middleware wiring yet)
- `validation.ts` — `assertCharterRowExists(engagementId, stage)` helper +
  FDH escalation stubs

**Not yet wired:** enforcement middleware in Spinner / ACHEEVY chat routes.
That lands in PR 4 (Picker_Ang at Step 3) and beyond, when the stage
transitions actually need gating.

## Tables

| Table | Role |
|---|---|
| `charters` | One row per engagement. Holds 10 of the 11 Charter components as JSONB columns. Component #3 (Timestamped Deliverables) lives in `charter_stages`. |
| `charter_stages` | Ten rows per charter — one per RFP→BAMARAM stage. Holds `stage`, `artifact_uri`, `timestamp`, `what_changed`, `hitl_gate_status`, `owner_agent`. Unique on (charter_id, stage). |
| `ledgers` | One row per engagement (shares PK with `charters`). Cost breakdown, Picker_Ang BoM, risk premiums, TTD-DR evidence. |
| `ledger_entries` | Append-only audit log. ICAR / ACP-Biz / ACP-Tech / FDH / HITL entry types, confidence score, owner, timestamp. |

## The 10 stages

| Ordinal | Stage | Owner | HITL gate |
|---|---|---|---|
| 1 | `rfp_intake` | ACHEEVY | requestor confirms |
| 2 | `rfp_response` | ACHEEVY | product review |
| 3 | `commercial_proposal` | NTNTN | pre-commercial approval (**Picker_Ang fires here**) |
| 4 | `technical_sow` | NTNTN + Farmer | technical approval |
| 5 | `formal_quote` | NTNTN | commercial approval |
| 6 | `purchase_order` | CFO_Ang / CPO_Ang | requestor-confirmed |
| 7 | `assignment_log` | CTO_Ang | product confirms allocation |
| 8 | `qa_security` | Farmer + NTNTN | security approval |
| 9 | `delivery_receipt` | ACHEEVY | requestor signs acceptance |
| 10 | `completion_summary` | Union | product confirms closure |

## Environment

Reads the Neon connection string from (in order):

1. `CONTRACTS_DATABASE_URL`
2. `NEON_DATABASE_URL`
3. `DATABASE_URL`

## Usage (post-migration)

```ts
import {
  createEngagement,
  advanceStage,
  assertCharterRowExists,
} from '@aims/contracts';

// Start a new engagement at Step 1
const { engagementId } = await createEngagement({
  plugId: 'ups-poll-analyzer',
  clientId: 'cust_xyz789',
  securityTier: 'mid',
});

// Advance to Step 2 — throws if Step 1 Charter row is missing
await assertCharterRowExists(engagementId, 'rfp_intake');
await advanceStage(engagementId, {
  stage: 'rfp_response',
  artifactUri: 'gs://charter/.../response.md',
  ownerAgent: 'ACHEEVY',
  whatChanged: 'Four-Question Lens + SWOT generated',
});
```

## Cross-references

- `docs/canon/Deploy-Charter-Template-3.1-UPDATED.md` — 11 Charter components
- `docs/canon/ACHEEVY_Agent_Logic_Final.md#logic-spine-10-step-rfp--bamaram` — stage definitions
- `docs/canon/sivis_governance.md#dual-surface-coupling-charter--ledger` — governance
- `docs/canon/Universal-Tool-Warehouse-Glossary-2025.md` — ICAR, ACP-Biz, ACP-Tech, FDH, KNR definitions
