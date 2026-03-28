---
name: pmo-governance
description: PMO department structure, dispatch rules, and governance protocol for the ACHIEVEMOR workforce.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# PMO Governance — Department Structure & Rules

Use this skill when building or modifying PMO department logic, adding new departments,
or changing how ACHEEVY governs the workforce.

## Department Overview

| Dept | Code | Domain | Lead | Members | Lil_Hawk Support |
|------|------|--------|------|---------|------------------|
| Engineering | PMO-ECHO | Build & integrate | API_Ang | 5 Angs | 7 Hawks |
| Security | PMO-SHIELD | Auth & compliance | Crypt_Ang | 1 Ang | 1 Hawk |
| Data Ops | PMO-PULSE | Pipelines & ML | Data_Ang | 1 Ang | 4 Hawks |
| Deployment | PMO-LAUNCH | CI/CD & infra | Deploy_Ang | 1 Ang | 1 Hawk |
| QA / Review | PMO-LENS | Test & audit | QA_Ang | 1 Ang | 0 Hawks |

## Governance Rules

### 1. Every task flows through a PMO

No work happens outside department governance. Even ad-hoc requests get classified.

### 2. Department leads own accountability

The lead Boomer_Ang for each department is accountable for all PCPs in that domain.

### 3. Cross-department work requires coordination

When a task spans PMO-ECHO and PMO-SHIELD (e.g., "build an auth API"), both department
leads are consulted. The primary department owns the PCP.

### 4. Lil_Hawks are accessed through Chicken Hawk

ACHEEVY never dispatches directly to a Lil_Hawk. The chain is:
`ACHEEVY → PMO → Boomer_Ang → (if tactical) Chicken Hawk → Lil_Hawk`

### 5. PMO-LENS is the review gate

All deliverables pass through PMO-LENS (QA_Ang) before being presented to the user.
QA_Ang scores the PCP and assigns the grade.

### 6. HR Department handles workforce health

HR monitors agent KPIs, flags burnout (too many consecutive tasks), and recommends
break rotation.

## Adding a New Department

1. Define in `config/pmo-departments.yml`:
   - name, code (PMO-{CODE}), description
   - lead Boomer_Ang (create if needed)
   - member list, Lil_Hawk support list
   - trigger keywords, color
2. Create the lead Boomer_Ang in `config/boomer_angs.yml`
3. Update `system-prompt/acheevy.md` dispatch table
4. Update `.ecosystem.json` workforce and pmo_departments arrays
5. Add room to Live Look In floor plan if applicable

## Adding a New Boomer_Ang

1. Follow naming: `{Skill}_Ang`
2. Add to `config/boomer_angs.yml` with: description, glyph, department, specialty, glow_color
3. Add to parent department's member list in `config/pmo-departments.yml`
4. Update system prompt dispatch table

## Reference Files

- `config/pmo-departments.yml` — Full department definitions
- `config/boomer_angs.yml` — Agent registry
- `system-prompt/acheevy.md` — Dispatch protocol
