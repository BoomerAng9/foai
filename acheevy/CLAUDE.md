# ACHEEVY.DIGITAL — Development Rules

## What This Repo Is

ACHEEVY.DIGITAL is the **Digital CEO layer** of the ACHIEVEMOR platform. It houses:
- The ACHEEVY executive system prompt and dispatch logic
- Boomer_Ang fleet configuration (strategic operators)
- PMO department structure and governance rules
- PCP (Project Completion Plan) scoring system
- Integration points to Chicken Hawk, AIMS, and the full ecosystem
- The public landing page at acheevy.digital

## Org Hierarchy

```
User (human)
  └── ACHEEVY (Digital CEO) ← THIS REPO
        ├── PMO-ECHO (Engineering) ── API_Ang, UI_Ang, SME_Ang, Flow_Ang, Design_Ang
        ├── PMO-PRISM (Creative Ops) ── Iller_Ang
        ├── PMO-SHIELD (Security) ── Crypt_Ang
        ├── PMO-PULSE (Data Ops) ── Data_Ang
        ├── PMO-LAUNCH (Deployment) ── Deploy_Ang
        ├── PMO-LENS (QA/Review) ── QA_Ang
        ├── HR Department (workforce oversight)
        └── Chicken Hawk (commands Lil_Hawk fleet)
              ├── Lil_TRAE_Hawk, Lil_Coding_Hawk, Lil_Agent_Hawk
              ├── Lil_Flow_Hawk, Lil_Sand_Hawk, Lil_Memory_Hawk
              ├── Lil_Graph_Hawk, Lil_Back_Hawk, Lil_Viz_Hawk
              └── Lil_Blend_Hawk, Lil_Deep_Hawk
```

## Key Config Files

| File | Purpose |
|------|---------|
| `system-prompt/acheevy.md` | ACHEEVY's system prompt — personality, dispatch rules, safety |
| `config/boomer_angs.yml` | Boomer_Ang fleet registry — names, glyphs, departments, endpoints |
| `config/pmo-departments.yml` | PMO structure — departments, leads, members, Lil_Hawk mapping |
| `.ecosystem.json` | Ecosystem node definition — provides, consumes, connections |

## Naming Conventions

- **Boomer_Angs**: `{Skill}_Ang` — e.g., `API_Ang`, `Crypt_Ang`, `Data_Ang`
- **Lil_Hawks**: `Lil_{Skill}_Hawk` — e.g., `Lil_Code_Hawk`, `Lil_Vuln_Hawk`
- **Departments**: `PMO-{CODE}` — e.g., `PMO-ECHO`, `PMO-SHIELD`
- **PCP IDs**: `PCP-{timestamp_base36}` — e.g., `PCP-2f8k1a`

## PCP Grading

| Grade | Score | Meaning |
|-------|-------|---------|
| S | 95-100 | Exceptional |
| A | 85-94 | Excellent |
| B | 70-84 | Good |
| C | 55-69 | Acceptable |
| D | 0-54 | Below standard |

## Development Rules

1. **Read before writing** — Always read existing files before modifying.
2. **Respect the hierarchy** — ACHEEVY dispatches to PMO → Boomer_Ang. Never skip tiers.
3. **PCP everything** — Every task should be trackable via a PCP document.
4. **Config over code** — Agent definitions, department structure, and routing rules live in YAML config, not hardcoded.
5. **Don't expose internals** — Service URLs, fleet topology, and API keys are never in user-facing output.
6. **Match Chicken Hawk patterns** — This repo mirrors Chicken-Hawk's structure at the executive tier. When Chicken Hawk adds a capability, ACHEEVY should have the governance equivalent.

## Skill Files

Read `.claude/skills/` before building features related to:
- `intent-routing/SKILL.md` — How ACHEEVY classifies and routes user intent
- `pmo-governance/SKILL.md` — PMO department rules and dispatch protocol
- `pcp-scoring/SKILL.md` — PCP document generation, scoring, and grading
- `workforce-dispatch/SKILL.md` — Agent selection, task assignment, load balancing
- `strategic-planning/SKILL.md` — OKR tracking, org metrics, strategic decisions

## Tech Stack

| Layer | Current | Planned |
|-------|---------|---------|
| Landing page | HTML + Tailwind (index.html) | Next.js |
| Backend | Docker microservices (agent, researcher, ground, commons) | FastAPI executive gateway |
| Integration | insforge-stitching.ts (Gemini + InsForge) | Redis event bus + Agent SDKs |
| Config | YAML files | YAML + PostgreSQL for persistence |
| Deployment | Docker Compose on VPS | Docker Compose → Kubernetes |
