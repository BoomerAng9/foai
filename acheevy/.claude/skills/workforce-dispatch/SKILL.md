---
name: workforce-dispatch
description: Agent selection, task assignment, load balancing, and Chicken Hawk escalation.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Workforce Dispatch — Agent Assignment & Execution

Use this skill when building or modifying how ACHEEVY assigns work to agents,
manages load across the workforce, or escalates to Chicken Hawk.

## Dispatch Flow

```
User Request
    │
    ▼
┌─────────────────┐
│ Intent Classify  │ ← see .claude/skills/intent-routing/
│ (dept + agent)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ PCP Generation   │ ← see .claude/skills/pcp-scoring/
│ (vision/mission) │
└────────┬────────┘
         │
         ▼
┌─────────────────┐     ┌──────────────────────┐
│ Agent Selection  │────→│ Boomer_Ang Available? │
│ (load balance)   │     └──────────┬───────────┘
└─────────────────┘                │
                          yes ─────┼───── no
                           │               │
                           ▼               ▼
                    ┌────────────┐  ┌──────────────┐
                    │ Dispatch   │  │ Queue / Wait │
                    │ to Ang     │  │ or Escalate  │
                    └─────┬──────┘  └──────────────┘
                          │
                          ▼
                   ┌────────────────┐
                   │ Needs tactical │
                   │ execution?     │
                   └──────┬─────────┘
                    no ───┼─── yes
                     │            │
                     ▼            ▼
              ┌──────────┐ ┌──────────────────┐
              │ Ang does │ │ Chicken Hawk     │
              │ the work │ │ routes to        │
              └──────────┘ │ Lil_Hawk fleet   │
                           └──────────────────┘
```

## Agent Selection Rules

### 1. Department Match

The assigned PMO department narrows the candidate pool.

### 2. Specialty Match

Within the department, pick the agent whose specialty best matches the task.

### 3. Load Balancing

If multiple agents qualify:
- Prefer the agent with the fewest active tasks
- Prefer the agent with higher efficiency KPI
- Prefer the agent that last completed a similar task (domain affinity)

### 4. Desk Availability (Live Look In)

In the visual layer, agents can only work if a desk is available in their department room.
If all desks are occupied, the agent queues in the corridor.

## Escalation to Chicken Hawk

ACHEEVY escalates to Chicken Hawk when:

| Condition | Example |
|-----------|---------|
| Task requires hands-on code execution | "Run this script and show me the output" |
| Task requires OS/browser automation | "Open the browser and test the login flow" |
| Task requires sandboxed execution | "Execute this Python snippet safely" |
| Task is a large-scale refactor | "Rename all instances of X across the monorepo" |
| Task requires multi-agent Squad mode | "Build, test, deploy, and monitor this feature" |
| Task requires 3D/Blender work | "Create a 3D model of the office layout" |

### Escalation Protocol

```typescript
// ACHEEVY → Chicken Hawk dispatch
{
  "from": "ACHEEVY",
  "to": "chicken-hawk",
  "pcpId": "PCP-2f8k1a",
  "task": "Refactor auth module across all services",
  "preferredHawk": "Lil_TRAE_Hawk",  // suggestion, not binding
  "priority": "high",
  "traceId": "trace-abc123"
}
```

Chicken Hawk receives this and routes to its own fleet using its internal
`router.py` classification. ACHEEVY's suggestion is a hint, not an order —
Chicken Hawk may choose a different Lil_Hawk based on its own classification.

## Parallel Dispatch

ACHEEVY can dispatch to multiple agents simultaneously for independent sub-tasks:

```
PCP-main: "Build auth feature"
  ├── PCP-sub-1: "Design auth UI" → UI_Ang (PMO-ECHO)
  ├── PCP-sub-2: "Build auth API" → API_Ang (PMO-ECHO)
  ├── PCP-sub-3: "Security review" → Crypt_Ang (PMO-SHIELD)
  └── PCP-sub-4: "Write auth tests" → QA_Ang (PMO-LENS)
```

Sub-PCPs roll up into the parent PCP score (weighted by complexity).

## Reference Files

- `config/boomer_angs.yml` — Agent registry with specialties and departments
- `config/pmo-departments.yml` — Department structure and Lil_Hawk mappings
- `system-prompt/acheevy.md` — Full dispatch protocol
- `.claude/skills/intent-routing/SKILL.md` — How intent is classified
- `.claude/skills/pcp-scoring/SKILL.md` — How tasks are scored
