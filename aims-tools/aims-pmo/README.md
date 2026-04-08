# @aims/pmo

HR PMO Office for the A.I.M.S. virtual organization.

## What this is

The system that gates every agent action in the ACHIEVEMOR ecosystem through a commissioned mission. Mirrors the org chart from the HITL diagrams (Human-in-the-Loop → ACHEEVY → Boomer_Angs → Departmental Agents) plus the platform brain layer (AVVA NOON sits above ACHEEVY).

## Why

Per `project_hr_pmo_office.md` memory:

> Every agent (ACHEEVY, Boomer_Angs, Chicken Hawk, Lil_Hawks, Sqwaadrun, specialists, all future agents) must commit to work formally and be evaluated. This creates customer transparency, Lil_Hawks maturing to Chicken_Hawks via tracked performance, competitor benchmarking, and accountability — even ACHEEVY gets evaluated.

## Schema (migrations/)

| Table | Purpose |
|---|---|
| `agent_roster` | Registry of every agent in the fleet, with rank + class + reports_to |
| `agent_missions` | Commissioned work — brief + outcome + status lifecycle |
| `agent_mission_events` | Streaming log of tool calls, decisions, blockers, reasoning |
| `agent_evaluations` | Betty-Anne_Ang's three-layer scores (Fit Index + KPI/OKR + V.I.B.E.) |
| `agent_promotions` | Lil_Hawk → Chicken_Hawk maturity ladder |
| `voice_library` | Per-user agent voices (preloaded / custom_spec / cloned / byok) |
| `pmo_forms` | Paperform form ID registry |
| `pmo_form_drafts` | Resume-anywhere stepper state |

Migration `002_seed_roster` seeds the canonical agent hierarchy:
- AVVA NOON (platform brain, reports to nothing)
- Betty-Anne_Ang (PMO evaluator, reports to AVVA NOON)
- ACHEEVY (The Hand, customer-company CEO, reports to AVVA NOON)
- Chicken Hawk (2IC, reports to ACHEEVY)
- 6 Boomer_Angs (CTO/CFO/COO/CMO/CDO/CPO, all report to ACHEEVY)
- TPS_Ang (Pricing Overseer sub-agent under Boomer_CFO)

## The commissioning gate

Per `project_chain_of_command.md` correction: **NO HITL approval gate**. Agents are commissioned, not approved. They submit their plan and go. Evaluation happens after the work.

```ts
import { commission, startMission, finishMission, logEvent, hasActiveMission } from '@aims/pmo';

// 1. Commission a mission (validates chain of command)
const result = await commission({
  userId: 'user_abc',
  commissionedBy: 'acheevy',
  assignedAgent: 'chicken_hawk',
  missionType: 'web_research',
  brief: {
    scope: 'Find latest LLM benchmark scores for SWE-Bench Pro',
    vision: 'Build a comparative table for the customer pitch',
    expectedOutcome: 'Markdown table + sources, ready by EOD',
    kpis: { accuracy_target: 95, cost_ceiling_usd: 2.5 },
  },
});

if (!result.ok) {
  // Chain of command violation, invalid brief, or DB error
  console.error(result.code, result.error);
  return;
}

// 2. Start execution
await startMission(result.missionId);

// 3. Stream events to the PiP reasoning window
await logEvent(result.missionId, 'reasoning', {
  agent: 'chicken_hawk',
  thought: "Lil_Hawk_Recon's got this.",
});

// 4. Submit outcome
await finishMission({
  missionId: result.missionId,
  outcomeReport: 'Found 3 sources, table built.',
  outcomeCostUsd: 0.42,
  outcomeTokens: 12000,
  outcomeDurationMs: 45_000,
});
```

## Port Authority gate

```ts
import { hasActiveMission } from '@aims/pmo';

// In the Port Authority tool dispatcher:
if (!(await hasActiveMission(callerAgentId))) {
  throw new Error(
    'No active mission. Agent must be commissioned via pmo.commission() first.',
  );
}
```

## Chain of command rules (enforced in commission.ts)

```
AVVA NOON → ACHEEVY only
ACHEEVY → Chicken Hawk OR any Boomer_Ang
Chicken Hawk → Lil_Hawks (CANNOT delegate to Boomer_Angs — peers)
Boomer_Ang → PMO Office Supervisors (other Boomer_Angs) OR Lil_Hawks in their dept
Lil_Hawks → execute, do NOT delegate
Betty-Anne_Ang → evaluates only, does NOT commission missions
```

## Three-layer evaluation (Betty-Anne_Ang)

Per `project_betty_anne_ang_character_bible.md`:

### Layer A — A.I.M.S. Organizational Fit Index (-11 to +18)
- 7 Core Values (Empathy, Vision, Problem Solving, Passion, Reliability, Collaboration, Client Centricity) — Yes/Maybe/No → +1/0/-1
- Work Ability (KSAs, Roles, Enjoys job) — Yes/Maybe/No → +1/0/-1
- Cultural Fit — Yes/Maybe/No → +1/0/-1
- Performance Level — Not Acceptable/Not Good/Passable/Good/Excellent → -3/-2/0/+1/+2
- Keeper Test (Hire today?, Fight to keep?) — Yes/Maybe/No → +2/0/-1

### Layer B — A.I.M.S. KPI/OKR Metric (6-30)
6 criteria × 1-5 scale: Quality of Work, Timeliness, Creativity, Teamwork, Communication, Professionalism

### Layer C — NOON's V.I.B.E. (0-1 each, 0.85 minimum)
**V**erifiable, **I**dempotent, **B**ounded, **E**vident

NOT the brand V.I.B.E. (Vibration, Intelligence, Balance, Energy) used in pricing. These are NOON's technical scoring axes. Don't conflate.

### Composite classification
- **Example Leader**: Fit ≥ +12 AND KPI ≥ 24 AND V.I.B.E. ≥ 0.90 → mentor, Boomer_Ang promotion eligible
- **Development Partner**: Fit +4 to +11 OR KPI 18-23 → paired with Example Leader
- **PIP**: Fit 0 to +3 OR KPI 12-17 → Betty-Anne_Ang coaches
- **PEI**: Fit < 0 OR KPI < 12 OR V.I.B.E. < 0.85 → final stage before retirement

`classifyEvaluation()` in `schema.ts` computes this from totals.

## Migration runner

Run with any standard postgres migration tool, or directly:

```bash
psql $PMO_DATABASE_URL -f migrations/001_init.up.sql
psql $PMO_DATABASE_URL -f migrations/002_seed_roster.up.sql
```

Rollback:

```bash
psql $PMO_DATABASE_URL -f migrations/002_seed_roster.down.sql
psql $PMO_DATABASE_URL -f migrations/001_init.down.sql
```

A `scripts/migrate-up.ts` runner is referenced in `package.json` and will be added in a follow-up PR.

## Status

| Phase | Status |
|---|---|
| 1. Migrations + types + schema + commission gate + roster seed | ✅ this PR |
| 2. Evaluation worker (Betty-Anne_Ang autoscoring on completed missions) | TODO |
| 3. Promotion engine (Lil_Hawk → Chicken_Hawk maturity tracking) | TODO |
| 4. Paperform webhook handler (mission_brief / tna / org_fit_index forms) | TODO |
| 5. Customer PMO Dashboard surface in SmelterOS Circuit Box | TODO |
| 6. Port Authority `pmo.commission()` MCP tool wiring | TODO |
