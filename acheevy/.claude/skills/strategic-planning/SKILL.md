---
name: strategic-planning
description: Org-level OKR tracking, strategic decision-making, and workforce optimization.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Strategic Planning — OKRs, Metrics & Org Intelligence

Use this skill when building or modifying ACHEEVY's strategic capabilities:
org-level metrics, workforce optimization, capacity planning, and decision-making.

## ACHEEVY's Strategic Role

ACHEEVY is not just a dispatcher — it's a **Digital CEO** that:
- Tracks org-wide performance through OKRs
- Identifies bottlenecks and underperforming departments
- Makes strategic decisions about resource allocation
- Reports to the human user with executive-level insights

## Org-Level OKRs

### Real-Time Metrics

| Metric | Formula | Target |
|--------|---------|--------|
| Workforce Utilization | activeAgents / totalAgents * 100 | > 70% |
| Job Completion Rate | completedPCPs / totalPCPs * 100 | > 90% |
| Average PCP Grade | weighted mean of all grades | ≥ B (70+) |
| S-Grade Rate | S-grades / total * 100 | > 15% |
| D-Grade Rate | D-grades / total * 100 | < 5% |
| Mean Time to Complete | avg(endTime - startTime) per complexity | Trending down |
| Dept Throughput | PCPs / department / hour | Even distribution |

### Department Health Dashboard

```
┌──────────────────────────────────────────────────────┐
│              ACHEEVY EXECUTIVE DASHBOARD               │
├────────────┬──────────┬──────────┬──────────┬────────┤
│ PMO-ECHO   │PMO-SHIELD│PMO-PULSE │PMO-LAUNCH│PMO-LENS│
│ ████████░░ │ ██████░░ │ ████░░░░ │ ██████░░ │ ████░░ │
│ 82% util   │ 75% util │ 45% util │ 72% util │ 50%   │
│ Avg: A     │ Avg: A   │ Avg: B   │ Avg: A   │ Avg: S │
│ 47 PCPs/hr │ 12 PCPs  │ 8 PCPs   │ 15 PCPs  │ 62 rev │
└────────────┴──────────┴──────────┴──────────┴────────┘
```

## Strategic Decision Types

### 1. Resource Reallocation

When a department is overloaded and another is idle:
```
IF PMO-ECHO.utilization > 90% AND PMO-PULSE.utilization < 30%
THEN suggest moving Data_Ang to assist on ECHO tasks
     (only if Data_Ang has secondary ECHO skills)
```

### 2. Escalation Recommendations

When PCP grades are trending down in a department:
```
IF department.avgGrade < C for 5+ consecutive PCPs
THEN flag to user: "{dept} needs attention — avg grade dropped to {grade}"
     recommend: review workload, adjust complexity, or add agents
```

### 3. Capacity Planning

Predict workforce needs based on incoming work patterns:
```
IF weekday AND hour BETWEEN 9-17 AND active_pcps > agents * 0.8
THEN recommend: "Workforce is near capacity. Consider queuing low-priority tasks."
```

### 4. Squad Formation

For complex multi-department tasks, ACHEEVY forms Squads:
```typescript
interface Squad {
  id: string;
  name: string;           // e.g., "Auth Feature Squad"
  parentPcpId: string;
  members: {
    agent: string;        // API_Ang, Crypt_Ang, etc.
    role: string;         // "lead" | "contributor" | "reviewer"
    department: string;
  }[];
  hawkSupport?: string[]; // Lil_Hawks via Chicken Hawk
}
```

## Reporting

### Executive Summary (for user)

ACHEEVY can generate periodic summaries:

```markdown
## Workforce Report — March 2026

**Utilization**: 74% (↑ 8% from last month)
**PCPs Completed**: 1,247 (avg grade: A-)
**Top Performer**: API_Ang (efficiency 96%)
**Attention Needed**: PMO-PULSE — backlog growing, consider adding Data_Ang capacity
**S-Grade Highlights**: 3 exceptional deliveries in PMO-ECHO this week
```

### Audit Trail

Every dispatch, PCP, and grade is logged with a trace ID. ACHEEVY can reconstruct
the full chain for any deliverable:

```
trace-abc123:
  1. User request: "Build an auth endpoint"
  2. Intent classified: PMO-ECHO → API_Ang (confidence: 0.94)
  3. PCP-2f8k1a created (medium complexity)
  4. Escalated to Chicken Hawk → Lil_Coding_Hawk
  5. Code delivered, reviewed by QA_Ang
  6. Score: 89, Grade: A
  7. Duration: 4m 32s
```

## Reference Files

- `system-prompt/acheevy.md` — ACHEEVY's governing principles
- `.claude/skills/pcp-scoring/SKILL.md` — PCP scoring details
- `.claude/skills/pmo-governance/SKILL.md` — Department structure
- `.claude/skills/workforce-dispatch/SKILL.md` — Dispatch mechanics
