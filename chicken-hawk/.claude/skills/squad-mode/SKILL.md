---
name: squad-mode
description: Multi-hawk coordination via Lil_Deep_Hawk for complex missions that span multiple specialists.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Squad Mode — Multi-Hawk Coordination

Use this skill when building or modifying Lil_Deep_Hawk's Squad orchestration,
multi-agent task decomposition, or cross-hawk coordination.

## What Is Squad Mode?

When a task is too complex for a single Lil_Hawk, Chicken Hawk escalates to
**Lil_Deep_Hawk** which decomposes the mission into a **Squad** — a coordinated
group of Lil_Hawks working in parallel and sequence.

## When Squad Mode Activates

| Trigger | Example |
|---------|---------|
| Task spans multiple specialist domains | "Build, test, and deploy an auth feature" |
| ACHEEVY dispatches with complexity: high | PCP with 5+ objectives across departments |
| User explicitly requests multi-agent work | "I need a full-stack solution with security review" |
| Classification confidence is split | Two hawks tied at ~0.5 confidence each |

## Squad Structure

```typescript
interface Squad {
  id: string;                    // squad-{timestamp_base36}
  mission: string;               // high-level goal
  pcpId?: string;                // parent PCP from ACHEEVY
  traceId: string;

  phases: SquadPhase[];          // ordered execution phases
  status: "planning" | "executing" | "reviewing" | "complete" | "failed";

  members: SquadMember[];
  results: SquadResult[];
}

interface SquadPhase {
  order: number;                 // execution order (phases run sequentially)
  name: string;                  // "Backend scaffolding", "Security review"
  hawks: string[];               // hawks that run IN PARALLEL within this phase
  dependsOn?: number[];          // phases that must complete first
}

interface SquadMember {
  hawk: string;                  // Lil_TRAE_Hawk, Lil_Coding_Hawk, etc.
  role: "lead" | "contributor" | "reviewer";
  phase: number;
  task: string;                  // specific sub-task for this hawk
}

interface SquadResult {
  hawk: string;
  phase: number;
  output: string;
  elapsedMs: number;
  success: boolean;
}
```

## Execution Flow

```
ACHEEVY / User
    │
    ▼
Chicken Hawk → Classification → Lil_Deep_Hawk (Squad mode)
    │
    ▼
┌───────────────────────────────────────────┐
│ Lil_Deep_Hawk: PLANNING                   │
│                                           │
│ 1. Decompose mission into sub-tasks       │
│ 2. Assign each sub-task to a Lil_Hawk     │
│ 3. Order into sequential phases           │
│ 4. Identify parallel opportunities        │
│ 5. Present plan to Chicken Hawk           │
└─────────────────┬─────────────────────────┘
                  │
                  ▼
┌───────────────────────────────────────────┐
│ PHASE 1: Parallel execution               │
│                                           │
│ Lil_Back_Hawk ──→ Scaffold backend        │
│ Lil_Coding_Hawk ──→ Build frontend        │
│                                           │
│ (both run simultaneously)                 │
└─────────────────┬─────────────────────────┘
                  │ both complete
                  ▼
┌───────────────────────────────────────────┐
│ PHASE 2: Sequential review                │
│                                           │
│ Lil_Sand_Hawk ──→ Run tests in sandbox    │
│                                           │
└─────────────────┬─────────────────────────┘
                  │ tests pass
                  ▼
┌───────────────────────────────────────────┐
│ PHASE 3: Final review                     │
│                                           │
│ Lil_Viz_Hawk ──→ Verify in dashboard      │
│                                           │
└─────────────────┬─────────────────────────┘
                  │
                  ▼
         Results aggregated
         Returned to caller
```

## Example Squad Plans

### "Build an authenticated API with tests"

```
Squad: auth-api-squad
Mission: Build authenticated REST API with test coverage

Phase 1 (parallel):
  - Lil_Back_Hawk: Scaffold Express API with JWT auth, DB schema
  - Lil_Coding_Hawk: Build auth middleware and route handlers

Phase 2 (sequential):
  - Lil_Sand_Hawk: Execute test suite in sandbox

Phase 3 (sequential):
  - Lil_Viz_Hawk: Verify endpoints via monitoring dashboard
```

### "Full-stack feature with security review and deployment"

```
Squad: fullstack-feature-squad
Mission: Build, secure, test, and deploy user profile feature

Phase 1 (parallel):
  - Lil_Back_Hawk: Database schema + API endpoints
  - Lil_Coding_Hawk: React frontend components
  - Lil_TRAE_Hawk: Refactor existing user module to support profiles

Phase 2 (sequential):
  - Lil_Sand_Hawk: Integration tests in sandbox

Phase 3 (parallel):
  - Lil_Memory_Hawk: Store feature documentation in knowledge base
  - Lil_Agent_Hawk: Deploy to staging via CLI

Phase 4 (sequential):
  - Lil_Viz_Hawk: Post-deploy monitoring check
```

## Failure Handling

| Failure Type | Response |
|-------------|----------|
| Single hawk fails in phase | Retry that hawk (2 attempts). If still failing, mark sub-task as failed and continue remaining phase tasks. |
| Critical hawk fails (blocks next phase) | Attempt alternative hawk if available. If not, halt squad and report partial results. |
| All hawks in a phase fail | Halt squad, report failure to Chicken Hawk, which reports to ACHEEVY/user. |
| Timeout exceeded | Cancel remaining phases, return partial results with clear status. |

## PCP Integration

When ACHEEVY dispatches with a PCP, the Squad maps to sub-PCPs:

```
PCP-main (from ACHEEVY, complexity: high)
  ├── PCP-sub-1: Lil_Back_Hawk scaffolding (complexity: medium)
  ├── PCP-sub-2: Lil_Coding_Hawk frontend (complexity: medium)
  ├── PCP-sub-3: Lil_Sand_Hawk testing (complexity: low)
  └── PCP-sub-4: Lil_Viz_Hawk monitoring (complexity: low)
```

Each sub-PCP is scored independently. The parent PCP score is a weighted
average based on complexity:
```
parentScore = sum(subScore * complexityWeight) / sum(complexityWeight)
```

## Lil_Deep_Hawk Configuration

```yaml
# config/lil_hawks.yml
Lil_Deep_Hawk:
  description: "SuperAgent: decomposes missions into Squads (DeerFlow 2.0)"
  internal_port: 7010
  health_path: /health
  run_path: /run
  timeout_seconds: 300
  is_super_agent: true
```

Key differences from regular hawks:
- **300s timeout** (5 min) vs typical 60-120s
- **`is_super_agent: true`** flag enables Squad orchestration
- Can dispatch to other hawks (the only hawk with this capability)
- Has access to the full fleet manifest for planning

## Reference Files

- `config/lil_hawks.yml` — Fleet registry (Deep_Hawk config)
- `gateway/router.py` — Classification and dispatch (fallback to Deep_Hawk)
- `system-prompt/chicken-hawk.md` — Squad mode explanation for users
- `hawk3d/src/store/hawkStore.ts` — Visualization state for squad tracking
