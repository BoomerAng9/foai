---
name: pcp-scoring
description: Project Completion Plan (PCP) document generation, scoring formula, and grading system.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# PCP Scoring — Project Completion Plan System

Use this skill when building or modifying PCP generation, scoring, or grading logic.

## What Is a PCP?

The Project Completion Plan is the atomic unit of work tracking in ACHIEVEMOR.
Every task dispatched by ACHEEVY generates a PCP document that tracks the work
from intent to completion with a scored grade.

## PCP Document Structure

```typescript
interface PCPDocument {
  id: string;             // PCP-{timestamp_base36}
  task: string;           // human-readable task description
  agentId: string;        // assigned Boomer_Ang or Lil_Hawk
  department: string;     // PMO department code
  complexity: "low" | "medium" | "high";
  vision: string;         // strategic goal — WHY are we doing this?
  mission: string;        // execution methodology — HOW will we do it?
  objectives: string[];   // ordered steps — WHAT specifically?
  startTime: number;      // epoch ms
  endTime: number | null; // epoch ms, null if in-progress
  score: number | null;   // 0-100 on completion
  grade: "S" | "A" | "B" | "C" | "D" | null;
  reviewedBy: string;     // always QA_Ang unless overridden
  traceId: string;        // for audit trail
}
```

## Generating a PCP

When ACHEEVY dispatches a task:

1. Generate ID: `PCP-${Date.now().toString(36)}`
2. Classify complexity based on:
   - **low**: Single agent, single step, < 2 min estimated
   - **medium**: Single agent, 2-5 steps, 2-10 min estimated
   - **high**: Multi-agent or multi-department, 5+ steps, 10+ min estimated
3. Write vision (1 sentence — strategic purpose)
4. Write mission (1 sentence — execution approach)
5. List objectives (ordered checklist of concrete steps)
6. Assign to agent and department
7. Record startTime

## Scoring Formula

```
baseScore     = (objectivesCompleted / totalObjectives) * 80
timeBonus     = max(0, (estimatedTime - actualTime) / estimatedTime * 10)
qualityBonus  = errorFree ? 10 : max(0, 10 - (errorCount * 2))
──────────────────────────────────────────────────────────────
score         = min(100, baseScore + timeBonus + qualityBonus)
```

### Complexity Multipliers (for KPI weighting)

| Complexity | Estimated Time | KPI Weight |
|------------|----------------|------------|
| low | 30-120s | 1.0x |
| medium | 120-600s | 1.5x |
| high | 600-3600s | 2.0x |

## Grading Scale

| Grade | Score Range | Meaning | Visual Badge |
|-------|-------------|---------|--------------|
| S | 95-100 | Exceptional — above and beyond | Gold star burst |
| A | 85-94 | Excellent — all objectives met | Green checkmark |
| B | 70-84 | Good — minor gaps | Blue checkmark |
| C | 55-69 | Acceptable — needs improvement | Yellow warning |
| D | 0-54 | Below standard — review required | Red alert |

## Agent KPIs (Derived from PCPs)

```typescript
interface AgentKPIs {
  tasksCompleted: number;       // lifetime PCP count
  averageScore: number;         // running mean of PCP scores
  averageTimeSeconds: number;   // running mean of task durations
  efficiencyPct: number;        // (avgScore/100) * (estimatedTime/actualTime) * 100
}
```

## Org-Level OKRs (Aggregated from KPIs)

| Metric | Formula |
|--------|---------|
| Workforce Utilization | activeAgents / totalAgents * 100 |
| Job Completion Rate | completedPCPs / totalPCPs * 100 |
| Grade Distribution | count per grade / total (bar chart) |
| Dept Throughput | PCPs completed per department per hour |

## PCP Lifecycle

```
CREATED → IN_PROGRESS → REVIEW → SCORED → ARCHIVED
                          ↑         |
                          └─ REWORK ←┘ (if D-grade)
```

D-grade PCPs trigger an automatic rework loop: QA_Ang flags the issue,
the original agent re-executes with feedback, and the PCP is re-scored.

## Reference Files

- `system-prompt/acheevy.md` — PCP section in dispatch protocol
- `config/boomer_angs.yml` — Agent definitions (for agent assignment)
