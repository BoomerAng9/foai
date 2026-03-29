# AGENTS — FOAI-AIMS Agent Hierarchy

## Command Structure

```
ACHEEVY (Boss)
├── Chicken Hawk (2IC)
│   ├── LilHawks (task workers)
│   └── Orchestrates: RuntimeAng, GuardAng, LearnAng
├── Boomer_Angs (deployed by ACHEEVY only)
│   ├── Edu_Ang
│   ├── Scout_Ang
│   ├── Content_Ang
│   ├── Ops_Ang
│   └── Biz_Ang
└── Infrastructure Engines
    ├── RuntimeAng (OpenClaw) — LIVE
    ├── GuardAng (NemoClaw) — LIVE
    └── LearnAng (Hermes) — LIVE V0.5
```

## ACHEEVY — Boss

- Final authority on all decisions.
- Approves all LilHawk level-ups.
- Deploys all Boomer_Angs.
- Is never bypassed. No agent acts outside ACHEEVY's chain of command.

## Chicken Hawk — 2IC

- Orchestrates all three infrastructure engines (RuntimeAng, GuardAng, LearnAng).
- Reports to ACHEEVY only.
- Spawns LilHawks for task execution.
- **Cannot deploy Boomer_Angs.** That authority belongs to ACHEEVY alone.

## Boomer_Angs — Revenue & Operations Agents

Deployed by ACHEEVY only. Report directly to ACHEEVY — never to Chicken Hawk.

| Agent | Role |
|-------|------|
| **Edu_Ang** | MindEdge education sales — enrollment generation and commission tracking |
| **Scout_Ang** | Open Seat university contracting — sourcing and closing institutional contracts |
| **Content_Ang** | foai.cloud SEO — content creation, optimization, and organic traffic growth |
| **Ops_Ang** | Reporting and platform health — dashboards, alerts, uptime |
| **Biz_Ang** | SaaS client growth — lead generation, onboarding, retention |

## Infrastructure Engines

| Engine | Codename | Status | Endpoint |
|--------|----------|--------|----------|
| **RuntimeAng** | OpenClaw | LIVE | `https://openclaw-service-939270059361.us-central1.run.app` |
| **GuardAng** | NemoClaw | LIVE | `https://nemoclaw-service-939270059361.us-central1.run.app` |
| **LearnAng** | Hermes | LIVE | `https://hermes-agent-939270059361.us-central1.run.app` |

## LilHawks — Task Workers

- Spawned by Chicken Hawk for specific tasks.
- Report to: **ACHEEVY** + **Chicken Hawk** + **governing Boomer_Ang** (triple reporting line).
- Disposable by default. Persist only if they prove value.

### Level-Up Path

A LilHawk can be promoted to Chicken Hawk tier if:

1. **3 KPIs** are defined and tracked.
2. All 3 KPIs are **sustained over 30 consecutive days**.
3. **ACHEEVY conducts a review** and explicitly approves the level-up.

No automatic promotions. No self-promotion. ACHEEVY decides.
