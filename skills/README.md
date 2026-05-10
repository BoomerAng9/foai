# foai/skills/ — Canonical FOAI Skills Bundle

**Source of Truth** per [FOAI-RUNTIME-001 v1.0](../docs/directives/foai-runtime-001.md) — Skills-First Cloud Runtime.

Every tier reads from this bundle:
- **Tier 1** (Claude Code on the Web) — clones `foai/skills/` on `/sandbox` start
- **Tier 2** (Claude Managed Agents) — references registered `skill_id` from `<role>/SKILL_ID.json`
- **Tier 3** (Cloud Run + Cloudflare Sandbox) — mounts via Cloud Storage FUSE from `gs://foai-aims-skills/`

Sync is one-way: `git push BoomerAng9/foai main` → Cloud Build `foai-skills-sync` → GCS bucket + Anthropic Skills API → SHA digest match (Gate 2).

## Layout

```
skills/
├── README.md                          ← this file
├── _delta-FOAI-RUNTIME-002.md         ← extends 001 with Cyber Hawks, Roo's, Badgers, ii-*, LUC
├── orchestrator/                      ← Tier 1 (sole user-facing)
│   └── acheevy/
├── operations/                        ← Tier 2 multi-agent dispatch
│   └── chicken-hawk/
├── boomer-angs/                       ← Tier 2 persistent agents
│   ├── iller-ang/                     (visual / creative)
│   ├── code-ang/                      (Ship Checklist + 7-gate audit)
│   ├── buildsmith/                    (long-cycle build execution)
│   ├── scout-ang/                     (research + market scouting)
│   ├── content-ang/                   (editorial)
│   ├── edu-ang/                       (curriculum, learning)
│   ├── note-ang/                      (knowledge capture)
│   ├── ops-ang/                       (operations)
│   ├── biz-ang/                       (deals, partnerships)
│   ├── consult-ang/                   (advisory)
│   └── learn-ang/                     (training, fine-tune)
├── c-suite/                           ← Tier 2 with elevated permissions
│   ├── boomer-cto/
│   ├── boomer-cfo/
│   ├── boomer-coo/
│   ├── boomer-cmo/
│   ├── boomer-cdo/
│   ├── boomer-cpo/
│   └── boomer-chro/
├── lil-hawks/                         ← Tier 2 ephemeral (spawned by Chicken Hawk)
│   ├── lil-code-hawk/
│   ├── lil-viz-hawk/
│   ├── lil-blend-hawk/
│   ├── lil-scrapp-hawk-sqwaadrun/
│   ├── plan-hawk/
│   └── judge-hawk/
├── cyber-hawks/                       ← Tier 2 ephemeral, security branch (DELTA-002)
│   ├── audit/
│   ├── pentest/
│   ├── monitoring/
│   └── incident-response/
├── coastal-cast/                      ← Tier 2 vertical-pinned (Coastal Brewing Co.)
│   ├── sal/                           (lead barista — customer-facing)
│   ├── luc/                           (floor accountant — Coastal CFO branch)
│   ├── melli/                         (B2B / wholesale lead)
│   ├── badgers/                       (The Sett — Melli's BG'z, DELTA-002)
│   ├── roos/                          (Loss Prevention; transferable to cyber-hawks, DELTA-002)
│   ├── hos-ang/ bar-ang/ tas-ang/ tea-ang/ cou-ang/ gre-ang/ har-ang/ cur-ang/ reg-ang/ macha-ang/ bun-ang/
│   ├── lp-ang/                        (Marcus, LP team)
│   └── betty-anne-ang/                (HR PMO)
└── tier-3-engines/                    ← NOT agents — infrastructure engines, cross-tier accessible
    ├── openclaw/                      (vault + sandbox isolation)
    ├── nemoclaw/                      (compute + sandbox)
    ├── hermes/                        (NousResearch framework)
    ├── autoresearch/                  (research workflow engine)
    ├── ii-agent/                      (general agent harness, DELTA-002)
    ├── ii-researcher/                 (research-specialized, DELTA-002)
    ├── commonground-core/             (shared substrate, DELTA-002)
    ├── ii-commons/                    (shared utilities, DELTA-002)
    ├── smelt-engine/
    ├── bars-engine/
    └── plug-bin/
```

## Frontmatter spec (strict, per Gate 1)

Every `SKILL.md` carries Anthropic Agent Skills frontmatter — `name`, `description`, `compatibility` only. Heavy content lives in `references/*.md`.

```yaml
---
name: <kebab-case-role-name>
description: <one paragraph — surfaces in skill registry; controls when the model loads it>
compatibility:
  tier: [1, 2, 3]
  models: [sonnet-4-6, opus-4-7, haiku-4-5]
---
```

## What each `SKILL.md` body is

The body is the **operating contract** — short. It declares:
1. **Authority** — what this role is allowed to decide unilaterally vs. escalate.
2. **Scope** — workflows owned vs. workflows borrowed.
3. **Tools** — primary `script.py` + permitted Tier 3 engine calls.
4. **Memory store** — which `/mnt/memory/` directory it owns vs. reads.
5. **Hierarchy edges** — who it reports to, who it dispatches.

Everything else (background, voice, persona, brand canon) goes into `references/`.

## Adding a new role

1. Create the folder under the right tier root.
2. Write `SKILL.md` with the frontmatter + body (5 sections above).
3. Drop heavy content into `references/*.md`.
4. Open a PR. Gate 1 (frontmatter validator) and Gate 2 (sync integrity) run on merge.
5. Cloud Build POSTs to Anthropic Skills API and writes the returned `skill_id` to `<role>/SKILL_ID.json` — committed back automatically.

## Tier 3 engines (cross-tier, not exclusive)

OpenClaw / NemoClaw / Hermes / AutoResearch / ii-agent / ii-researcher / commonground-core / ii-commons / smelt-engine / bars-engine / plug-bin are **infrastructure engines, not agents.** They never appear on the agent roster. Any tier can call them through their published HTTPS / Pub/Sub interfaces. Each engine's folder under `tier-3-engines/` carries a `REFERENCE.md` (NOT a `SKILL.md`) describing how to invoke it.

## Made in PLR — Pooler, GA
