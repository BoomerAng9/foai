# Multi-Agent Orchestration Research — Inworld vs AgentCraft vs Custom

**Date:** 2026-05-02
**Question:** Can Inworld AI host the Coastal cast (ACHEEVY + 16 lieutenants
+ 12 Sett) as a persistent, multi-tenant, "open-world-game-like" multi-agent
runtime with no production hiccups? What role does AgentCraft (Iddo Salomon)
play?

> Customer-facing canon: ACHEEVY is the only persona the customer sees.
> Lieutenants route silently. Any architecture must preserve that.

---

## 1. Inworld Multi-Agent Capabilities (May 2026)

**Director Layer.** Decides per turn which character speaks next and what
they address — prioritizes direct mentions, question targeting, character
expertise, and recent participation. Built for *visible* in-character group
dialogue, not silent backstage routing.

**Group conversations — hard cap.** Inworld docs: *"With Inworld's
Multi-Agent feature, it is possible to have from 2 to 5 AI-powered characters
talking either amongst themselves, or with the player ... a maximum of 5
Agent participants."* Our cast is 29. **A single Inworld group cannot hold
the cast.** Workaround: rotate characters in/out of the active scene —
feasible, but not the "WoW" promise.

**Realistic Multi-agent Simulation.** NPC↔NPC and player↔group interaction.
Every group participant is a *visible speaker* — clashes with the
ACHEEVY-only canon. We'd pay for the headline feature while contractually
unable to expose it.

**Agent Runtime (C++ core).** *"A high-performance, C++ graph engine (with
SDKs like Node.js and Unreal)"* orchestrating LLMs, STT, TTS, memory, tools
in one pipeline; built for *"experiences with millions of concurrent users."*
Multi-tenant isolation **not described publicly** — assume workspace-level.

**SDK status.** Multi-agent: Studio, Unity, Unreal, WebSDK, **Node.js**,
open-source Godot. **No first-class Python SDK.** Coastal is pure Python —
forces a Node.js sidecar or REST/WS (current adapter does the latter).

**Pricing (2026 On-Demand).** TTS Mini $25/1M chars, Max $35/1M; Growth tier
$15/$25 ($1.5k/mo); enterprise as low as $5/$10. **Founder rates ($5/$10)
sunset 2026-05-07 — this week.** Runtime is free; you pay model + TTS + STT.
Multi-agent groups bill per character turn — cost scales with group size.

**Persistence.** Inworld supports session + cross-session memory, but per
`ECOSYSTEM_STANDARD_INWORLD.md` we keep persona/goals/memory in FOAI. Inworld
is a stateless voice/character delivery layer; ReMe + Neon `coastal` owns
long-term.

---

## 2. AgentCraft (Iddo Salomon)

**What it IS:** an orchestration **console** with an RTS-game UX. From
getagentcraft.com: *"The agent orchestrator you've trained for"* and *"Bring
joy to agent management by interacting with your agents as you would in a
RTS game."* "Single Pane of Glass" framing. Web app at `app.agentcraft.gg`,
CLI via `npx @idosal/agentcraft`. Currently integrates Claude Code, OpenCode,
Cursor — **coding agents**.

**What it IS NOT:** a runtime. AgentCraft observes and commands agents that
already run elsewhere. No Inworld / MCP / A2A integrations documented.

**Package facts.** `@idosal/agentcraft` v0.4.1 published 2024-12-17. Deps:
express, ws, @anthropic-ai/sdk, @supabase/supabase-js, posthog-node,
web-push. Author Ido Salomon. Active but small (sub-1.0, single maintainer,
slow release cadence).

**"ORC in Orchestration."** Developer-facing observability + RTS command for
running agent processes. Could fit our **internal owner dashboard** for the
Lil_Hawks / Boomer_Angs fleet. Does not address "host 17 characters in a
persistent customer-facing world."

---

## 3. Current Coastal State

Files audited: `coastal-brewing/scripts/api_server.py` (3,029 lines),
`scripts/user_profile.py` (481), `aims-tools/inworld/inworld_character_adapter.py`
(445), `aims-tools/inworld/character-registry.yaml` (29 chars),
`aims-tools/inworld/ECOSYSTEM_STANDARD_INWORLD.md`, `runtime/reme/`.

**Procedural Python today (`api_server.py:2463-2718`):**
`_employee_system_prompt` returns hand-written prompts for **only 4 of 29**
characters: `sal_ang`, `luc_ang`, `melli_capensi`, `acheevy`. `chat_stream`
holds **one `employee` variable per session**; `escalation_triggers.detect_escalation()`
swaps it mid-turn (Sal_Ang → LUC_Ang for billing). **Sequential, not
concurrent.** No NPC↔NPC. Customer surface honors the canon: one bubble at a
time, no lieutenant self-identifies.

**Persistent (Neon `coastal` schema, ef533f26):** `coastal_uid` cookie
(1 yr), profile row, visit count, preferences, last purchase, Gemini-summarized
last session + embedding. **User-side memory, not character-side** — every
character sees the same per-user profile prepended to its prompt.

**ReMe (`runtime/reme/`):** token-ratio compaction, BM25 + cosine hybrid
retrieval, per-tenant Neon `reme` schema. Long-term agent memory primitive,
ours, no external dependency.

**Inworld scaffolding ready but unwired:** adapter loads roster dynamically,
derives env vars per character, supports Phase 1 TTS only. Phase 2
`send_message` is stubbed. **Zero `active: true` characters in registry today.**

**Gaps for the "open-world, no hiccups" vision:**
1. Inworld's 5-char-per-group ceiling vs 17-29 cast.
2. No persistent NPC↔NPC layer; current chain-of-command is single-employee
   sequential.
3. No first-class Python SDK from Inworld.
4. No multi-tenant story published by Inworld for cross-vertical reuse
   (NURDSCODE, plugmein) — likely workspace-per-vertical.
5. Inworld Studio's persona/goals model conflicts with our IP-protection
   mandate; we've designed around it but swim upstream.
6. Agent registry siloed under Coastal
   (`project_coastal_runner_agent_registry_violation_2026_05_02.md`).

---

## 4. Three Candidate Architectures

### (a) Stay procedural — add Python concurrency primitives
Add `asyncio.TaskGroup` for parallel employee thinking on multi-tier
escalations; build a Python "scene scheduler" on top of existing escalation
triggers.

- **Pros:** zero new vendor. Pure Python. Multi-tenant identical to today.
  ACHEEVY-only surface untouched. Cheapest.
- **Cons:** "open-world game" framing weak — just prompt orchestration. No
  voice/animation ambience between characters.
- **Multi-tenant:** native. **ACHEEVY-only:** trivially preserved.
  **Cost:** 1-2 sprints, no vendors.

### (b) Inworld runtime + AgentCraft operator console + ReMe memory
Move per-character session execution into Inworld Runtime via Node.js
sidecar; accept the 5-char ceiling; rotate characters into the active scene;
use AgentCraft as the **internal** RTS console for owner-tier observability;
keep ReMe + Neon as long-term memory truth.

- **Pros:** real voice / character / animation pipeline. Inworld owns the
  real-time STT/LLM/TTS graph and the latency budget. AgentCraft matches
  the WoW-fleet vision *internally*. ReMe preserves IP + multi-tenant.
- **Cons:** 5-char ceiling forces silent backstage routing in FOAI before
  Inworld sees the group. Node.js sidecar in an otherwise Python stack.
  AgentCraft v0.4.1 (Dec 2024 last publish) is small / single-maintainer.
  Founder pricing closes 2026-05-07. Per-session cost scales with group
  size. Cross-vertical workspace strategy unresolved.
- **Multi-tenant:** Inworld likely needs workspace-per-vertical (env-var
  sprawl). FOAI side scales fine.
- **ACHEEVY-only surface:** preservable only with discipline — Inworld's
  product is *built* to show every group participant; we deliberately
  don't use the headline feature on the customer surface.
- **Cost:** 4-8 sprints. New SDK, sidecar, AgentCraft eval, voice clones,
  workspace setup.

### (c) Roll a custom multi-agent runtime in foai
Build our own scheduler on `runtime/reme/` + an asyncio scene loop;
compose with our model-router; use Gemini Live for voice (per
`feedback_voice_is_premium_no_web_speech_default.md`); treat Inworld TTS as
one synthesis option.

- **Pros:** unconstrained character count. Full IP ownership. Native
  Python, no sidecar. Cross-vertical from day one. Substrate (ReMe,
  model-router, escalation triggers) already exists.
- **Cons:** highest engineering load. We own every Director-Layer-equivalent
  decision, animation sync, voice barge-in. "No hiccups" is *harder* when
  we own the stack. Risk of building a worse Inworld.
- **Multi-tenant:** native. **ACHEEVY-only:** trivially preserved.
  **Cost:** 8-16+ sprints. Long road.

---

## 5. Recommendation

**Path (a) for the next 2 sprints, with a deliberate seed of (b) on the
operator side.**

Reasoning:
1. "No hiccups" points away from a brand-new vendor integration on deadline.
   Today's single-bubble single-employee surface works — doesn't need an
   open-world runtime to ship the next milestone.
2. Inworld's 5-char group cap is load-bearing against a 29-char cast. The
   rotate-in/out workaround complicates production. The headline NPC↔NPC
   feature would be hidden from customers anyway (ACHEEVY-only canon) — we'd
   pay full vendor cost for a feature we're unable to expose.
3. AgentCraft observes coding agents, not character runtimes. The RTS-console
   vision is real — evaluate for **internal owner dashboards** (Lil_Hawks,
   Boomer_Angs telemetry), not the customer surface.
4. We already keep all FOAI IP outside Inworld by design — migrating is
   mostly *adding voice + animation*, not *moving brain*. Do it incrementally:
   Phase 1 TTS for the 4 active prompts, evaluate, then decide on the runtime.

**Greenlight conditions for going deeper (path b):**
- Voice-cloned `acheevy` lands at <500ms p90 TTS latency under budget cap.
- AgentCraft passes a one-week local-only eval as **internal** console.
- We have a written Inworld enterprise quote covering workspace-per-vertical.
- Owner accepts customers will continue to see one ACHEEVY voice even with
  17 characters thinking backstage.

**Honest uncertainty:**
- Inworld's multi-agent feature is evolving; the 5-char cap may rise. If it
  does within 90 days, path (b) gets stronger.
- AgentCraft's slow release cadence (v0.4.1 since Dec 2024) is a
  sustainability risk for an internal console choice.
- Node.js sidecar latency overhead from a Python WebSocket process is
  unmeasured.

---

## 6. Smallest concrete next step

**Sign up for Inworld On-Demand (free tier) under `bpo@achievemor.io`
*before* Founder rates expire 2026-05-07.** Reversible, costs nothing,
locks in the better rate-card if we ever go path (b).

Then:
1. Clone `acheevy`'s voice via Inworld IVC (one short script, owner reads).
2. Set `INWORLD_CHARACTER_ID_ACHEEVY` and `INWORLD_VOICE_ID_ACHEEVY` in
   the openclaw vault.
3. Flip `acheevy.active: true` in `character-registry.yaml`.
4. Phase 1 TTS path is already coded — adapter starts working when the env
   vars exist.
5. Run a 100-turn smoke test against current `chat_stream`, measure latency
   + cost, decide path (b) vs continue (a).

In parallel: **`npx @idosal/agentcraft` for 30 minutes** on the owner
workstation to confirm whether the RTS console UX is compelling enough to
warrant putting it in front of the Lil_Hawks fleet.

Both reversible, both this-week-cheap, both produce data needed before any
larger commitment.
