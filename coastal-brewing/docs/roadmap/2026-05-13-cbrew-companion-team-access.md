# Roadmap Injection #1 — Team Access via ACHEEVY in the C|Brew Communication Companion

**Status:** roadmap (deferred — Phase 2+ patch, part of next update + changelog)
**Captured:** 2026-05-13
**Owner directive (verbatim):**
> "One addition to the C|Brew Communication Companion is the access to the Team and their capabilities. But this will come in a later patch. I think it would be a great way to give Customers the power of ACHEEVY as their Assistant and ACHEEVY delegate different tasks in the back end to the right agent for the job, like Chicken Hawk, Lil_Hawks (including Sqwaadrun, Cyber Hawks, etc), Boomer_Angs, Badgers, and even ACHEEVY. They will be able to manage ACHEEVY directly via the C|Brew Companion app. And direct ACHEEVY to monitor the meeting, and build next steps based on the Meeting minutes, or other set tasks the User sets for ACHEEVY to do. They never see the other Agents, they just get a receipt of who did what and who was the owner of the job that was handled."

## Why this is a roadmap injection, not Phase 1

Phase 1 of the C|Brew Communication Companion ships **live translation + paid notes + per-user Taskade workspace** as a self-contained product surface. The customer talks to translation, takes notes, gets a workspace. No agent fleet involvement.

This roadmap injection layers a **second customer surface on top**: ACHEEVY as the customer's assistant, delegating to the internal agent fleet (Chicken Hawk → Lil_Hawks / Sqwaadrun / Cyber Hawks, Boomer_Angs, Badgers, ACHEEVY itself) **without ever exposing those internal agent names to the customer**. Customer manages ONE assistant. The customer sees a receipt of what happened — never the org chart underneath.

Phase 1 must ship and stabilize first. Adding the agent-fleet surface on top of an unproven Phase 1 conflates two different validation loops (translation product loop + agent-orchestration loop) and makes failure attribution ambiguous. Build the foundation, then layer.

## The customer experience (the one surface they see)

```
┌─────────────────────────────────────────────────┐
│  C|Brew Companion                               │
│  ─────────────────────                          │
│  📞 Translate                                   │
│  📝 Notes                                       │
│  🤖 ACHEEVY (← NEW)                             │
│      └─ Ask ACHEEVY to:                         │
│         · Monitor this meeting                  │
│         · Build next steps from these minutes   │
│         · Schedule a follow-up                  │
│         · Research a topic raised in the call   │
│         · Draft an email about a decision       │
│         · Anything else (free-form)             │
└─────────────────────────────────────────────────┘

After ACHEEVY accepts a task, the customer sees:

┌─────────────────────────────────────────────────┐
│  Receipt — task #ach_2026_05_13_abc             │
│  ─────────────────────                          │
│  Task:      Build next steps from minutes       │
│  Status:    ✓ Completed                         │
│  Result:    [link / artifact / preview]         │
│  Time:      4 min 12 sec                        │
│  Owner:     ACHEEVY                             │
└─────────────────────────────────────────────────┘
```

**That's it.** The customer never sees the words "Chicken Hawk", "Lil_Hawk", "Sqwaadrun", "Cyber Hawk", "Boomer_Ang", "Badger". They see **ACHEEVY** as the front-of-house owner of every job. Behind the scenes, ACHEEVY may have dispatched a Lil_Hawk to scrape a URL, a Boomer_Ang to draft an email, and a Sqwaadrun crew to research a topic — but the receipt rolls up to "Owner: ACHEEVY" or "Owner: ACHEEVY (on behalf of: \<role\>)" if the role abstraction matters to the customer (e.g., "Owner: ACHEEVY · Research").

This is the Sacred-Separation extension: **internal hierarchy stays internal**. Customer surface = ACHEEVY + receipt. Period.

## What ACHEEVY can be asked to do (Phase 2 scope sketch)

The customer's mental model: "I have an assistant. They can help me with anything in a meeting or coffee chat." Concrete capabilities exposed in the UI as quick-action chips + a free-form text input:

| Quick action | What ACHEEVY actually does (internal — never shown) |
|---|---|
| **Monitor this meeting** | ACHEEVY listens to the live translation stream, flags key decisions, dispatches a Lil_Hawk to capture timestamps + action items |
| **Build next steps from minutes** | ACHEEVY reads the just-ended meeting transcript, hands to a Boomer_Ang (likely Edu_Ang or Scout_Ang) to produce a structured action-item list, returns to ACHEEVY for review, then writes to the customer's Taskade workspace |
| **Schedule a follow-up** | ACHEEVY hands to a Lil_Hawk that wraps a calendar API (Lil_Calendar_Hawk — Phase 2-eligible) to propose times + draft an invite |
| **Research a topic** | ACHEEVY dispatches a Sqwaadrun Lil_Hawk crew (Hermes / NemoClaw / Autoresearch) for web research, returns a structured summary |
| **Draft an email** | ACHEEVY hands to a Boomer_Ang (likely Sal_Ang or Content_Ang) to draft, presents the draft for customer review before send |
| **Verify a claim** | ACHEEVY dispatches Cyber Hawk / fact-check Lil_Hawk to check a specific statement against sources |
| **Custom (free-form)** | ACHEEVY parses intent, picks the right delegate, dispatches with a receipt |

The customer types or taps. ACHEEVY responds in conversational voice (their existing register — Brian McKnight smooth-tenor v3 clone). The internal delegation is invisible.

## Architecture sketch (Phase 2+)

```
                       ┌─────────────────────────────────┐
                       │  Customer in the Companion app  │
                       │  · Taps "Ask ACHEEVY"           │
                       │  · Types or speaks the request  │
                       └────────────────┬────────────────┘
                                        │
                                        ▼
                       ┌─────────────────────────────────┐
                       │  ACHEEVY routing surface        │
                       │  · Parses intent                │
                       │  · Picks the right delegate     │
                       │  · Returns a receipt to the     │
                       │    customer ASAP                │
                       └─────┬───────────────────────────┘
                             │
                             │   (Sacred Separation:
                             │    these names never
                             │    appear in customer UI)
                             │
        ┌────────────────────┼────────────────────┬──────────────────────┐
        ▼                    ▼                    ▼                      ▼
   ┌─────────┐         ┌──────────────┐     ┌────────────┐         ┌──────────┐
   │ Chicken │         │ Boomer_Angs  │     │ Sqwaadrun  │         │ Badgers  │
   │ Hawk    │         │ (Sal, LUC,   │     │ + Lil_Hawks│         │ (policy  │
   │ + Lil_  │         │  Melli, Edu, │     │ + Cyber    │         │  gate +  │
   │ Hawks   │         │  Scout,      │     │ Hawks      │         │  audit)  │
   │         │         │  Content,    │     │            │         │          │
   │         │         │  Iller,      │     │            │         │          │
   │         │         │  etc.)       │     │            │         │          │
   └─────────┘         └──────────────┘     └────────────┘         └──────────┘

   Each delegate writes a structured receipt back to ACHEEVY's task ledger;
   ACHEEVY rolls them up into a single customer-facing receipt.
```

**Key invariants:**
- ACHEEVY is the only agent name the customer ever sees in the Companion UI.
- Every internal delegation produces an `audit_ledger.companion_acheevy_tasks` row + a `companion_acheevy_subtasks` row per delegate that handled a portion. The customer sees a rolled-up `Owner: ACHEEVY (· optional sub-role label)` on the receipt; internal admin tooling (the existing `/owner` console, Activity tab) sees the full delegation chain.
- The customer's Taskade workspace receives artifacts (drafts, action items, research summaries) from ACHEEVY's name only. Internal agents touch the workspace through ACHEEVY's service-account credentials, never their own.

## Engineering implications (Phase 2+)

This is a meaningful surface to build on top of Phase 1. Rough scope (will be a separate plan when we begin):

- **ACHEEVY dispatch surface** — a new `acheevy_dispatcher.py` module on coastal-runner that receives task requests from the Companion app, classifies intent, picks a delegate, returns a receipt handle.
- **Delegate adapters** — internal callable interfaces for each agent class:
  - `chicken_hawk_dispatch(task)` — hits the existing `hawk.foai.cloud` Tool Chest API
  - `boomer_ang_dispatch(role, task)` — picks a Boomer_Ang based on the role (Edu / Scout / Content / Sal / etc.) and dispatches via existing Sqwaadrun / Print_Press / Iller infrastructure
  - `sqwaadrun_dispatch(task)` — taps the existing Sqwaadrun 20-Hawk ops fleet
  - `badger_dispatch(task)` — policy / audit / verify ops
- **Receipt ledger** — extend `audit_ledger` with `companion_acheevy_tasks` (customer-facing) + `companion_acheevy_subtasks` (internal). Customer queries `/api/v1/companion/acheevy/tasks` to see their own list; never sees the subtasks.
- **Meeting-monitor mode** — when "Monitor this meeting" is on, ACHEEVY streams the translation captions through a Lil_Hawk that classifies utterances (decision / question / action-item) and queues sub-tasks. End-of-meeting handoff to a Boomer_Ang for synthesis.
- **In-app UI** — ACHEEVY voice-chat input (mic), quick-action chips, receipt timeline, task-detail drawer.
- **Voice register** — ACHEEVY's responses use the existing McKnight v3 clone via the same Inworld Gateway path as Phase 1's translation flow.
- **Pricing** — open question. Could be: free-tier owner customers get N ACHEEVY tasks/day; paid tier gets more or unlimited. Or: ACHEEVY tasks bundled with the paid notes tier. Decide when we begin Phase 2.

## Sacred Separation enforcement (the hard rule)

Every customer-facing string produced by an ACHEEVY task — receipt text, sub-status updates, error messages, drafts, action items, research summaries — passes through a linter that:

1. Strips any internal agent name (Chicken Hawk, Lil_Hawk, Sqwaadrun, Cyber Hawk, any Boomer_Ang's individual name except ACHEEVY itself, Badger, Hermes, NemoClaw, Autoresearch, etc.)
2. Strips any infrastructure / vendor / supplier name (Higgsfield, Inworld, OpenAI, Gemini, Vertex, Taskade, Stripe, etc.)
3. Strips any internal cost or margin figure
4. Replaces any of the above with the canonical customer-facing surface phrase ("our verified roastery partner" for supplier; "ACHEEVY" for any internal agent attribution; etc.)

The linter is non-negotiable — every receipt + every artifact pushed to the customer's Taskade workspace runs through it before publish. If a linter pass strips content + the result becomes incoherent, the task fails closed (returns "couldn't complete" to the customer) rather than leaks an internal name. Sacred Separation is the load-bearing positioning of the entire platform per the brand canon; this surface is the highest-leverage place to enforce it.

## When this lands

- **NOT in Phase 1A** (current backend ship — translation + notes + Taskade + Stripe)
- **NOT in Phase 1B** (web companion)
- **NOT in Phase 1C** (mobile RN)
- **Phase 2 patch — first major roadmap injection** — landing decision happens after Phase 1A/B/C ship + stabilize + the first 5-10 dogfood meetings prove the loop. Owner Telegram gate per FDR-2026-05-12 §5 risk-tag posture applies (money + ad_spend + brand_canon + supply_chain — all four still fire because this expands the customer-facing surface).

## Open questions (deferred to Phase 2 spec work — not blocking Phase 1)

1. ACHEEVY task pricing — bundled with paid notes tier, or separate per-task credits?
2. Which Boomer_Angs are exposed via the dispatcher in Phase 2 vs deferred to Phase 3? (Defaults proposed: Edu_Ang, Scout_Ang, Content_Ang, Sal_Ang. Defer Iller_Ang, Code_Ang, Biz_Ang, Ops_Ang to Phase 3.)
3. Meeting-monitor real-time classification — runs on the same Inworld Gateway stream as translation, or a parallel model call? Cost implication.
4. Receipt visual design in the mobile app — Iller_Ang owns this when Phase 2 begins.
5. Customer-facing label for ACHEEVY's role context. Options: (a) just "ACHEEVY", (b) "ACHEEVY · Research" / "ACHEEVY · Drafting" with sub-role tags, (c) custom name the customer picks for their assistant (white-label angle for B2B licensee positioning).

## Reference

Pairs with:
- Spec: `coastal-brewing/docs/superpowers/specs/2026-05-13-cbrew-communication-companion-design.md` (Phase 1)
- Plan 1A: `coastal-brewing/docs/superpowers/plans/2026-05-13-cbrew-communication-companion-phase-1a-backend.md` (current build)
- Coastal brand canon: memory `reference_acheevy_orchestrator_load_bearing_pitch_2026_05_10` — ACHEEVY as the orchestrator that makes specialists feel like one coordinated business
- Sacred Separation canon: memory `feedback_communicate_outcome_not_implementation_2026_05_10` + brand canon docs in `~/soul.md`
- Agent hierarchy: `~/foai/AGENTS.md` (chain of command — Chicken Hawk / Lil_Hawks / Boomer_Angs / etc.)

This is the first roadmap injection. Subsequent injections file alongside this one in `coastal-brewing/docs/roadmap/` with sequentially-numbered titles.
