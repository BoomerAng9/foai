# @aims/picker-ang

**Picker_Ang — the Step-3 Commercial Proposal tool router.** Amazon
Warehouse model: customer requirements come in, Picker_Ang walks the
325-tool catalog, scores candidates on **IIR** (Impact / Integration-fit /
Risk), and emits a **Bill of Materials JSON + Security Addendum** that
seed downstream Assignment Log and Buildsmith work.

Picker_Ang fires **only** at RFP→BAMARAM Step 3. It is not a global tool
hook; it does not run on every Spinner tool call.

## The IIR scoring model

Each candidate tool gets three scores in [0,1]:

- **Impact** — how much this tool advances the customer's CTQs. Derived
  from tool priority (`critical`/`high`/`medium`/`low`) combined with the
  count of requested capabilities the tool provides.
- **Integration fit** — how cleanly this tool slots into the customer's
  security tier, budget envelope, and existing ecosystem. License
  compatibility matters. Tier gating matters.
- **Risk** — `1 - risk_score`. Lower stars, `experimental` status, and
  newer licenses push risk up. Well-established tools with active status
  get the low-risk treatment.

`weighted = 0.45 * impact + 0.35 * integrationFit + 0.20 * (1 - risk)`

Weights are canon-aligned with the vFinal Agent Logic; reviewers tune via
`ScoringWeights` if the customer's CTQs demand a different balance.

## Flow

```
Intake brief (capabilities + constraints + security tier)
       │
       ▼
 deriveRequirements(brief)   ← extract capability tags from NL
       │
       ▼
 searchTools(warehouse)      ← query @aims/tool-warehouse
       │
       ▼
 scoreIIR(candidates)        ← per-tool Impact/Integration/Risk
       │
       ▼
 selectTopN(scored)          ← rank + filter (excludes internal by default)
       │
       ▼
 emitBoM(selected)           ← BomEntry[] in Ledger shape
       │
       ▼
 emitSecurityAddendum(...)   ← threat model + required scans
       │
       ▼
 writeToLedger(engagementId) ← @aims/contracts — Step 3 artifacts
       │
       ▼
 appendIcarEntry(...)        ← audit: what was picked and why
```

## What this PR ships

- `src/schema.ts` — `IntakeBrief`, `ScanResult`, `ScoringWeights` zod schemas.
- `src/requirements.ts` — `deriveRequirements(brief)` — maps free-text
  CTQs to warehouse capability tags via a keyword lookup (stub with
  reasonable defaults; upgrade to LLM extraction in a future PR).
- `src/scoring.ts` — `scoreTool(tool, brief, weights)` — pure IIR function.
- `src/security-addendum.ts` — `deriveSecurityAddendum(bom, tier)` — emits
  threat model + scan profiles tied to the customer's security tier.
- `src/engine.ts` — `runPickerAngScan(input)` — end-to-end orchestrator
  that writes BoM + Security Addendum + IIR scores to `ledgers.picker_*`
  and appends an ICAR entry at stage=`commercial_proposal`.
- `src/client.ts` — postgres wrapper, same pattern as sibling packages.

## Internal-only surfacing

Picker_Ang honors the `@aims/tool-warehouse` `internal_only` flag:

- Default: `listTools()` via the warehouse query excludes internal rows.
- BoM written to **`ledgers.picker_ang_bom`** (internal-only Ledger surface)
  CAN include internal tools like Manus AI.
- BoM written to **Charter's `technical_blueprint`** MUST use
  `filterForCustomerCopy(bom, 'relabel')` so Manus becomes "External Tool
  Coordination". The engine calls this automatically on the customer-safe
  copy; the internal copy keeps full names.

## What this does NOT do

- Does not call ACHEEVY or NTNTN — engine is pure. Callers wire Picker_Ang
  into the Step-3 handoff.
- Does not write Charter rows — `@aims/contracts` owns that. Engine just
  updates Ledger fields.
- Does not run TTD-DR (PR 5). A future integration will let Picker_Ang
  consult TTD-DR for research-backed tool justifications.

## Cross-references

- `docs/canon/ACHEEVY_Agent_Logic_Final.md#3-commercial-proposal` — canonical role
- `docs/canon/boomer_angs_unified_roster.md` — where Picker_Ang lives
- `@aims/contracts/ledger-schema` — Ledger target columns
- `@aims/tool-warehouse` — the catalog Picker_Ang scans
- `.claude/projects/C--Users-rishj/memory/feedback_picker_ang_is_rfp_bamaram_retriever.md`
  — the tool-router scope lock
