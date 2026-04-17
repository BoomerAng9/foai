# SIVIS Governance — Triad Layer + Internal Structure

**SIVIS** (Strategic Intelligence & Oversight) is the Vision member of the
Triad. It sits alongside ACHEEVY (Voice) and NTNTN (Conscience) above the
PMO and below AVVA NOON (InfinityLM).

Sources:
- `Deploy-Unified-Command-Center.md#sivis-framework`
- `SmelterOS-Foundry-Architecture-Complete.md`
- `InfinityLM-Sacred-Architecture.md`

---

## Position in the hierarchy

```
Elder / User
  │
  ▼
AVVA NOON (InfinityLM — Quintillion-Modal Model)
  │
  ▼
Triad
  ├── ACHEEVY  (Voice)      — Digital CEO, user-facing
  ├── NTNTN    (Conscience)  — Ethical Override, threshold 0.995
  └── SIVIS    (Vision)      — Strategic Intelligence & Oversight
        │
        ├── TINIT           — Innovation Module
        ├── ROTATOR         — Execution Module
        └── Agent Foundry   — Distributed collaboration fabric
  │
  ▼
Governance Teams (NTNTN / Union / Farmer / Curryville)
  │
  ▼
PMO (House of ANG, Wing A)
  │
  ▼
Chicken Hawk → Lil_Hawks
```

SIVIS is **escalation-only during runtime** — it doesn't participate in
regular engagement turns. It handles governance advice, expert resource
dispatch, and Ledger review when ACHEEVY or NTNTN escalate to it.

---

## TINIT — Innovation Module

**Purpose:** ideation and creative problem-solving.

**Components:**
- **Research** — deep exploration of problem space; pulls evidence before
  options.
- **Analysis** — synthesizes research into option matrices.
- **Blue Ocean differentiation** — checks that proposed solutions aren't
  crowded / undifferentiated; enforces "what makes this only possible at
  ACHIEVEMOR" criterion.

**Output:** strategic recommendations + innovation pathways. Feeds
Step 2 (RFP Response) and Step 3 (Commercial Proposal) of the RFP →
BAMARAM flow.

**Runtime relationship to existing engines:**
- Uses TTD-DR (`foai/runtime/ttd-dr/` once built) as its research engine.
- Consults `Research_Ang` / `Intel_Ang` / `Data_Ang` from House of ANG for
  ground-truth data.
- Emits to the Rationale Ledger under ICAR entries.

---

## ROTATOR — Execution Module

**Purpose:** implementation + delivery orchestration.

**Components:**
- **Build pipelines** — dispatches BuildSmith + Lil_Hawks for construction.
- **QA/security** — invokes Farmer for SAST/DAST/deps + OPA/Rego gate.
- **Deployment** — delivery orchestration; activates plug in customer
  surface; enables KPIs/OKRs.

**Output:** production-ready plugs + services. Feeds Steps 7-9 of
RFP→BAMARAM (Assignment Log, QA/Security Certificate, Delivery Receipt).

**Runtime relationship:**
- Commands BuildSmith (the Plug Factory) via sprint contracts.
- Coordinates with `CTO_Ang` (Wing A) for task mapping.
- Writes to both Charter (customer-safe delivery artifacts) and Ledger
  (internal build evidence).

---

## Agent Foundry — Distributed collaboration fabric

**Purpose:** cross-specialist collaboration network.

**Mechanism:**
- Binary communication channels (`0110`, `0010`, etc.) for deterministic
  message routing between specialists.
- Multi-agent task distribution — one goal splits to N specialists; results
  re-aggregate via Multi_Ang (CommonGround).
- Synthesis layer — Chronicle_Ang writes a unified timeline across all
  specialist outputs.

**Runtime relationship:**
- Multi_Ang is the primary backbone. Chronicle_Ang anchors evidence.
- CommonGround fabric (the open-source repo backing Multi_Ang) is the code
  implementation.

---

## FDH Loop — self-evolution cycle

Every SIVIS-mediated decision closes with an FDH loop:

- **Foster** — gather options and possibilities (uses Brave + Sqwaadrun +
  prior Ledger entries).
- **Develop** — shape selected options into actionable steps.
- **Hone** — score and refine for production readiness.

Triggers for FDH:
- Confidence < 0.85 on any assertion.
- Policy exception surfaced by NTNTN.
- Adoption lag (customer KPI miss over threshold).
- Contradiction between canonical docs and live data.

All FDH cycles emit ICAR entries to the Ledger. No silent updates — every
canon change routes through FDH → TTD-DR + RAG → maker-checker →
Union/Farmer approval.

---

## Dual-surface coupling (Charter ↔ Ledger)

SIVIS enforces dual-surface discipline at every gate:

- **Charter (customer-safe):** plan, pool, buffer, overage, artifact URIs,
  HITL results.
- **Ledger (internal only):** full cost breakdown, Melanium allocation,
  rationale, ICAR, ACP, Picker_Ang BoM, security addendum, risk premium.

Missing Charter row at any stage = SIVIS pauses the engagement and escalates
via FDH + NTNTN HITL. Ledger completeness is verified before Union approves
Growth at Step 10.

See `Deploy-Charter-Template-3.1-UPDATED.md` for the 11 non-negotiable
Charter components.

---

## What this document does NOT cover

- The implementation of SIVIS (no code yet — build is scoped in PR 4/PR 5
  of the 2026-04-17 arbitration work).
- The runtime interface (TypeScript contract for `sivis.escalate(...)` will
  land alongside Charter/Ledger scaffold in PR 2).
- NTNTN internals (NTNTN has its own Enablement Pack — see
  `NTNTN-Enablement-Pack-v1.0-Internal.pdf` in the source zip; not copied
  here, pull it in when NTNTN gets its own canon file).

## Open reconciliation items

- TINIT / ROTATOR / Agent Foundry are all documented in existing canon but
  unimplemented in code. Confirm the TypeScript/Python interface shape
  before PR 2 ships the Charter/Ledger scaffold.
- Binary communication channel semantics (`0110`, `0010`) need a mapping
  table — the Command Center doc mentions them but doesn't enumerate.
