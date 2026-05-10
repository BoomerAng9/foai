# HR PMO — Betty-Anne_Ang on the Coastal floor

> Owner directive 2026-05-06.
> This is the **Coastal-side feeder** for the canonical Betty-Anne_Ang
> HR PMO Office. The character bible is at
> `~/.claude/projects/C--Users-rishj/memory/project_betty_anne_ang_character_bible.md`
> — read that first. The implementation package is at
> `aims-tools/aims-pmo/` (schema + migrations + MCP tool already
> shipped). This doc only covers what Coastal feeds upstream + how the
> Coastal storefront benefits from the assessment loop.

## Canon recap (do not redefine here — bible is source of truth)

- Name: **Betty-Anne_Ang** (hyphen, "Anne" not "Ann"; key
  `betty_anne_ang`)
- **Origin: SmelterOS** — the platform brain layer
- **Reports to: AVVA NOON** — peer to ACHEEVY, not under
- Voice / archetype: **Poe from Altered Carbon**. Shop-steward + mom
  energy. "Let me fight for these Lil_Hawks — they're earning their
  wings."
- Outside the executor chain — **she can evaluate ACHEEVY too**
- Runs the HR PMO Office (a team, not a desk)

## Three-layer evaluation framework (her tool)

Every completed mission gets scored on:

| Layer | What | Range |
|---|---|---|
| **A. A.I.M.S. Org Fit Index** | 7 core values + Work Ability + Cultural Fit + Performance Level + Keeper Test | -11 to +18 |
| **B. KPI/OKR Metric** | Quality / Timeliness / Creativity / Teamwork / Communication / Professionalism, each 1-5 | 6 to 30 |
| **C. NOON's V.I.B.E.** | Verifiable / Idempotent / Bounded / Evident, each 0-1 | 0 to 1 (≥0.85 ships) |

Composite outcomes: **Example Leader / Development Partner / PIP /
PEI** — see bible for thresholds.

## What Coastal feeds upstream

The Coastal runner writes events to `audit_ledger` with categories
Betty-Anne's PMO consumes:

| Coastal event | Audit category | What Betty-Anne reads |
|---|---|---|
| Agent transition (Sal → LUC, Sal → Melli, any → ACHEEVY, any → Marcus) | `team_handoff` | from / to / reason / coastal_uid / timestamp — informs handoff hygiene + KPI Teamwork |
| LP state-machine close | `loss_prevention` | severity / signal / reason — informs handoff hygiene + KPI Communication |
| Spinner commission | `tool.cart_add` (in spinner audit DB) | did the agent dispatch the right tool? — informs KPI Quality of Work |
| Order fulfilled | `action_receipt` | did the conversation convert? — informs KPI Quality of Work + Org Fit "Client Centricity" |
| Voice-synthesis call | (TTS log) | how many tokens did the agent burn? — informs KPI Timeliness |

The endpoint **`POST /api/v1/team-handoff`** (committed `d36d4fbc`)
is the new feed. It writes one row per transition. The aims-pmo
package's evaluation worker (per `aims-tools/aims-pmo/README.md` line
156, currently `TODO`) will consume this stream when it goes live.

## What the Coastal storefront does NOT do

- Does not surface Betty-Anne to customers — she's a SmelterOS-tier
  agent and customers are vertical-tier visitors.
- Does not invoke her LLM — that's the aims-pmo evaluation worker's
  job, scoped to the SmelterOS substrate.
- Does not show scores in the chat UI — operator-only at
  `hawk.foai.cloud/tools/hr-pmo` (build pending).
- Does not write to her tables directly. Audit-ledger is the only
  shared substrate; the aims-pmo worker reads from there + writes to
  its own `agent_evaluations` table.

## What's next on this loop (Coastal side only)

1. **Now (this turn)**: backend feeds (`team_handoff` endpoint live)
   + frontend transition animation + this corrected spec doc.
2. **Soon**: extend the audit feed to also surface
   `tool_call_received` (when an agent fires a tool) and
   `customer_intent_resolved` (yes / no / partial) so KPI Quality of
   Work has signal.
3. **Later**: the aims-pmo evaluation worker (canonical, in the
   `aims-tools/aims-pmo` package) flips from TODO to live and starts
   computing the three-layer score per mission. That's not Coastal
   work — it lives in the AIMS substrate and reads our ledger.

## What I got wrong on the first pass (own it)

- Spelled name `Betty Ann_Ang` — should be **Betty-Anne_Ang** with
  hyphen + "Anne".
- Said she reports to ACHEEVY — she **reports to AVVA NOON, peer to
  ACHEEVY**.
- Invented a generic "effectiveness / efficiency / handoff hygiene"
  scoring framework — the canonical framework is the **three-layer
  Fit Index + KPI/OKR + V.I.B.E.** described above.
- Missed her voice / archetype (Poe from Altered Carbon, shop
  steward + mom energy).
- Missed that there's already an `aims-tools/aims-pmo/` package with
  schema, migrations, MCP tool, and a roster seeded with her at
  `betty_anne_ang`.

The character bible at
`~/.claude/projects/C--Users-rishj/memory/project_betty_anne_ang_character_bible.md`
is canon. This Coastal doc is just the floor-level feeder.
