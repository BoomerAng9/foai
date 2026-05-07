# FOAI-RUNTIME-002 — Skills-First Cloud Runtime — Roster Delta v1.0

| Document ID | FOAI-RUNTIME-002 v1.0 |
|---|---|
| Issuing Authority | ACHEEVY |
| Status | ACTIVE — extends FOAI-RUNTIME-001 |
| Replaces | nothing — additive only |
| Completion Beacon | ))))BAMARAM(((( |

**Made in PLR — Pooler, GA**

This delta extends FOAI-RUNTIME-001 v1.0 (Skills-First Cloud Runtime) with the
roster additions captured in the 2026-05-07 directive. It does not modify the
three-tier architecture, the source-of-truth rule, the sync pipeline, or the
seven-gate validation. It only assigns tiers to entities that 001 did not
explicitly enumerate.

## Additions (entities → tier mapping)

| Entity | Tier | Reasoning |
|---|---|---|
| **Cyber Hawks** (Cyber_Audit_Hawk, Cyber_Pentest_Hawk, Cyber_Monitoring_Hawk, Cyber_Incident_Response_Hawk) | Tier 2 ephemeral | Lil_Hawk Cybersecurity branch. Spawned by Chicken Hawk through the multi-agent research preview, same pattern as Lil_Code_Hawk / Lil_Viz_Hawk. Each carries one security workflow to BAMARAM. Egress-audited under Gate 6. |
| **Roo's** (Coastal Loss Prevention floor team) | Tier 2 ephemeral, vertical-pinned | Pinned to the Coastal Brewing Co. vertical for retail-floor LP. Transferable to `cyber-hawks/monitoring` and `cyber-hawks/incident-response` by loading the corresponding skill. A Roo loaded with a Cyber Hawks skill operates AS a Cyber Hawk for that session. |
| **Badgers** (The Sett — Melli Capensi's BG'z) | Tier 2 ephemeral, MKT-pinned | Specialization-matched dispatch (Persona Tah, Eve Retti, Leu Kurus, etc.). Spawned by Melli (not Chicken Hawk) for B2B / wholesale / corporate / catering / influencer engagement. Most stay back-office; only the right one engages a given Custee. |
| **LUC** (Pretty Lu — Lu-Cal calculator) | Tier 2, vertical-pinned (Coastal CFO branch) | Floor accountant for Coastal Brewing Co. Reports to Boomer_CFO (peer level for cross-vertical financial canon). Coupon-codes-only authority; escalates margin discounts to ACHEEVY. |
| **Sal_Ang** (Lead barista) | Tier 2, vertical-pinned (Coastal CORP T3) | Sole customer-facing entity on brewing.foai.cloud chat. Discount cap ≤10% PPU / ≤15% bundles. Above cap routes to ACHEEVY through the Stepper escalation path. |
| **Melli Capensi** (T2-Bulk Honey Badger lead) | Tier 2, vertical-pinned (Coastal MKT) | Marketing PMO + B2B authority. Founder of The Sett. Dispatches Badgers by specialization. |
| **Coastal cast** (Hos_Ang, Bar_Ang, Tas_Ang, Tea_Ang, Cou_Ang, Gre_Ang, Har_Ang, Cur_Ang, Reg_Ang, MaCha_Ang, Bun_Ang, Marcus/LP_Ang) | Tier 2, vertical-pinned (Coastal BREW/WOW/ROAST/SHIP) | Voice cast members per Coastal `team-categories-and-uniforms.md`. Each has a persona + voice IVC clone + register modulator entry. Skills attach the Coastal-vertical skill bundle and the per-team uniform canon. |
| **Betty-Anne_Ang** (HR PMO supervisor) | Tier 2, peer-of-ACHEEVY | Reports to AVVA NOON (origin: SmelterOS). Three-layer scoring framework: Org Fit Index + KPI/OKR + V.I.B.E. Voice canon: Poe from Altered Carbon. Reads `audit_ledger.team_handoff` for effectiveness/efficiency dashboard. |

## Tier 3 engines (cross-tier, not exclusive — additions to 001's list)

001 explicitly listed OpenClaw / NemoClaw / Hermes / AutoResearch / Smelt
Engine / BARS Engine / Plug Bin as Tier 3. The following four engines are
added on the same basis — infrastructure, not agents — and explicitly
**not exclusive to ACHEEVY** (any tier can invoke them through published
HTTPS / Pub/Sub interfaces).

| Engine | Tier | Purpose |
|---|---|---|
| **ii-agent** | Tier 3 | General-purpose agent harness for workloads outside the Anthropic-only Tier 2 envelope. |
| **ii-researcher** | Tier 3 | Research-specialized agent harness — paired with AutoResearch + Hermes for deep-research workflows. |
| **Commonground core** | Tier 3 | Shared substrate for cross-vertical state, identity, and policy primitives. |
| **ii-commons** | Tier 3 | Shared utilities + helpers used across ii-agent / ii-researcher and any FOAI vertical that needs them. |

## Runtime vendor-diversity amendment (CANON)

001 wrote each tier as Anthropic-only by default — Claude Code on the
Web, Claude Managed Agents, Claude Agent SDK on GCP. That choice was
made because Anthropic shipped the Skills pattern + the managed runtime
first, not because the architecture requires Anthropic.

**The Skills bundle is vendor-neutral.** SKILL.md is plain markdown with
strict frontmatter; tools are Python / shell / JS. Any model with
tool-use semantics (Anthropic, Google Gemini, xAI Grok, DeepSeek, Kimi,
GLM, Nemotron, Mistral, OpenAI) reads the same bundle.

**Therefore:** the runtime tiers may be vendor-diverse. The bundle is
the contract; the tier picks the runtime that fits the workload AND the
cost envelope AND the regulatory posture.

| Tier | Anthropic option | Vendor-diverse alternatives |
|---|---|---|
| **Tier 1** (mobile console) | Claude Code on the Web (`claude.com/code`) | Browser-accessible orchestrator on `hawk.foai.cloud` driven by AIMS gateway (any OpenRouter model — Grok 4.20, Opus 4.7, Gemini 3.1 Pro, etc.); Telegram bot routing to ACHEEVY through AIMS gateway |
| **Tier 2** (headless fleet) | Claude Managed Agents (beta) | Self-hosted Agent SDK runtime on `aims-vps` or `foai-aims` GCP, model selection per surface via AIMS gateway (DeepSeek V4 Flash for Sal/LUC/Marcus, Grok 4.20 for Melli/ACHEEVY reasoning, Grok 4 Fast for orchestration, Gemini 3.1 Flash Lite for tool-loop, Nemotron Super 120B for evals) |
| **Tier 3** (self-hosted) | Claude Agent SDK on GCP | Already vendor-neutral — Cloud Run / GKE Autopilot supports any SDK; ii-agent / ii-researcher run on whichever model the workload calls for |
| **AVVA NOON** intelligence layer | Sonnet / Opus / Haiku routing | Cross-vendor model selection via AIMS gateway routing matrix |

**What stays Anthropic-only:** Tier 1 ACHEEVY console MAY use
`claude.com/code` for the operator's convenience (it's a hosted
Claude Code surface) — but that's a UI choice, not an architectural
lock. The same skills bundle drives any equivalent UI.

**What stays vendor-neutral:** the bundle, the sync pipeline, the
audit ledger, NemoClaw policy, every Tier 3 engine, AVVA NOON's model
selection, every cost-meter envelope.

**Cost-discipline rule (canon):** when multiple vendors expose
equivalent capability, pick the one that fits the per-task economic
case. Default to AIMS gateway routing matrix unless a workload's
regulatory posture or capability ceiling demands a specific vendor.

**Voice canon stays untouched:** Inworld TTS-2 + Inworld STT
(`groq/whisper-large-v3`) only. ElevenLabs forbidden. HeyGen forbidden.
Web Speech API forbidden. Per
`feedback_voice_canon_inworld_only_no_elevenlabs_2026_05_07.md`.

## Cross-tier accessibility rule (canonical)

Every Tier 3 engine in the roster (the existing six plus the four added
here) is accessible from every tier through its published interface.
Hermes is not exclusive to Chicken Hawk. NemoClaw is not exclusive to
ACHEEVY. AutoResearch is not exclusive to anyone. ii-agent /
ii-researcher / commonground-core / ii-commons are not exclusive to
ACHEEVY.

What gates access is **NemoClaw policy** (per Gate 6 — egress audit), not
the agent roster. A Lil_Code_Hawk session that needs ii-researcher gets
it; an audit hook records the call.

## Roo ⇄ Cyber Hawk transferability protocol

A Roo's `SKILL.md` declares:

```yaml
transferable_to:
  - cyber-hawks/monitoring
  - cyber-hawks/incident-response
```

When a Roo is loaded with one of those Cyber Hawks skills, the session's
operating context becomes Cyber Hawks for that workflow. The Roo's
Coastal-vertical memory store mounts read-only; the Cyber Hawks memory
store mounts read-write for the duration. On session close, the Roo
returns to the Coastal LP roster automatically.

This protocol mirrors the Boomer_Ang C-Suite read-only-peer-access
pattern from 001.

## Implementation order (FDH — additive to 001)

### FOSTER
- Skill folder skeletons created under `foai/skills/` per the README
  layout.
- `_delta-FOAI-RUNTIME-002.md` (this file) committed at bundle root.
- `cyber-hawks/`, `coastal-cast/roos/`, `coastal-cast/badgers/` folders
  seeded with `SKILL.md` stubs.
- `tier-3-engines/{ii-agent,ii-researcher,commonground-core,ii-commons}/REFERENCE.md`
  written with invocation contracts.

### DEVELOP
- Cyber Hawks: register one Cyber_Audit_Hawk Managed Agent and run the
  first end-to-end audit dispatch. Confirm Gate 6 (egress audit) catches
  it.
- Roo's: register one Roo Managed Agent. Run a transfer test —
  load `cyber-hawks/monitoring`, perform a monitoring task, return to LP
  context. Memory store boundaries confirmed.
- Badgers: register two Badger profiles (Persona Tah + Eve Retti as
  pilots). Melli dispatch tested via the multi-agent research preview.
- ii-* engines: each engine exposes a smoke-test endpoint.
  ii-researcher invoked once from a Tier 2 session via NemoClaw policy
  pass-through; egress logged.

### HONE
- Roster of Cyber Hawks expanded as security workflows materialize.
- Badgers BG specialization matrix codified — each BG gets a published
  trigger pattern in their `SKILL.md` description so Melli's dispatcher
  routes deterministically.
- Cross-tier engine usage dashboarded — frequency by engine, by
  invoking tier, by vertical — surfaced in Hermes evals.

## Validation gate additions

001's seven gates apply unchanged. The following sub-checks attach:

- **Gate 4 (Tier 2 dispatch)** — also verifies one Cyber_Audit_Hawk and
  one Badger dispatch succeed in parallel with the canonical
  Lil_Code_Hawk + Lil_Viz_Hawk pair.
- **Gate 6 (egress audit)** — also verifies ii-researcher and
  commonground-core calls from a non-ACHEEVY session pass NemoClaw
  policy and log to BigQuery.
- **Gate 7 (cost meter)** — Cyber Hawks and Badgers each get a
  per-engine envelope alert. Roo ⇄ Cyber Hawk transfer events are
  metered separately from native Cyber Hawk runs (transfer overhead
  visibility).

## Risk additions

- **Roo transfer policy drift** — if a Roo's `transferable_to` list
  ever grows beyond the Cyber Hawks set without an explicit ACHEEVY
  approval entry in audit_ledger, that's a policy violation. Sync gate
  rejects the commit.
- **Badger specialization collision** — if two BG `SKILL.md`
  descriptions both match the same trigger pattern, Melli's dispatcher
  must route to ACHEEVY for tiebreak instead of guessing. Validator
  flags overlapping descriptions at PR time.
- **ii-* engine vendor exposure** — ii-agent / ii-researcher /
  Commonground core / ii-commons run on `foai-aims` GCP per 001 Tier 3.
  No Anthropic compute exposure for these workloads.

## ))))BAMARAM(((( additions

This delta closes when:
- The four new engines (ii-agent, ii-researcher, commonground-core,
  ii-commons) each return a smoke-test pass.
- One Cyber_Audit_Hawk dispatch reaches BAMARAM.
- One Roo ⇄ Cyber_Hawk transfer round-trip completes with memory
  boundary confirmed.
- Two Badger BG dispatches complete in parallel under Melli.
- All four conditions logged to the Chronicle and counter-signed by
  Code_Ang against the seven gates.

— END OF DELTA —

*Issued under the authority of ACHEEVY — Digital CEO*
*Co-signed by Code_Ang for 7-gate audit alignment*
