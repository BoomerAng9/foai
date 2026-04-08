# @aims/spinner

**Spinner** — A.I.M.S. autonomous chat-execution feature. The thing that lets ACHEEVY actually DO instead of just describe.

> Inspired by Genspark's Speakly but built independently. We do NOT use Genspark code or branding. Spinner is ours.

## TL;DR

Spinner is a sidecar that runs on every chat surface (Deploy, AIMS, CTI Hub, Per|Form, SmelterOS). On every user message it:

1. Classifies intent via RFP-BAMARAM heuristics
2. Decides whether to chat, execute simple, or **transition** the user into Guide Me / Manage It / 3-Consultant Engagement
3. Spawns background jobs that execute autonomously
4. Streams progress to the PiP reasoning window
5. Surfaces the Live Look In window (NVIDIA Omniverse + Cosmos via Cloud Run Jobs) for visualization

The user keeps chatting. The work happens in the background. When ready, the user watches it play out in the PiP / Live Look In.

## Why "Spinner" not "Boomerang" or "Speakly"

| Name | Verdict |
|---|---|
| **Spinner** ✅ | Original, ours, no conflicts |
| Boomerang ❌ | Would conflict with the Boomer_Ang executive class |
| Speakly ❌ | That's Genspark's product, not ours |

Icon: colorful boomerang with A-N-G markers (Rish's upload). Name: Spinner.

## The kiosk model

Per `project_chat_to_guide_me_transition.md` and Rish 2026-04-08:

> Users should NOT be driven to the chat-with-ACHEEVY interface FIRST. They should be driven to the Guide Me or Manage It mode, OR we should connect Guide Me / Manage It to the chat with ACHEEVY interface, so when a user is speaking with ACHEEVY and it recognizes that they want to build something, it transitions the user to the Guide Me or Manage It mode.

The chat IS the kiosk — the needs analysis initiation. Spinner is the brain that recognizes what the user is trying to do and pulls them into the right structured mode.

## Architecture

```
Chat surface (any platform)
    │ user message
    ▼
SpinnerSidecar.onUserMessage(msg)
    │
    ▼
intent-classifier.ts (RFP-BAMARAM heuristics + optional LLM verify)
    │
    ▼
SpinnerAction returned to chat:
    │
    ├── continue-chat        → ACHEEVY chats, no job spawned
    ├── execute-simple       → background-worker spawns + executes
    ├── transition-guide-me  → chat shows "Guide Me" prompt
    ├── transition-manage-it → chat shows "Manage It" prompt
    ├── handoff-tps-report-ang → routes to TPS_Report_Ang pricing flow
    ├── handoff-pmo          → pulls mission status from aims-pmo
    └── spawn-three-consultant → consultant panel forms in PiP
```

## Modules

| File | Purpose |
|---|---|
| `src/types.ts` | Core type vocabulary |
| `src/schema.ts` | Zod runtime validation |
| `src/intent-classifier.ts` | RFP-BAMARAM heuristic classifier (+LLM verify hook) |
| `src/chat-engine.ts` | Default chat model selection (Gemma BANNED, GLM-5.1 default) |
| `src/background-worker.ts` | In-process job spawner + lifecycle |
| `src/sidecar.ts` | Public sidecar interface for chat surfaces |
| `src/live-look-in.ts` | NVIDIA Omniverse + Cosmos / Cloud Run Job adapter (stub for Phase 2) |
| `src/three-consultant-engagement.ts` | NOTE/AVVA NOON + ACHEEVY + Consultant panel spawning |
| `src/index.ts` | Public API |

## The chat engine question

Per `project_chat_engine_decision.md`:

- **Gemma is BANNED as default chat engine.** Rish has had unreliable behavior on OpenRouter even with a funded account. The `assertNotBanned()` function in `chat-engine.ts` will throw if anyone tries to use Gemma as the default.
- **GLM-5.1 is the default.** Open-source, in our pricing matrix, $1/$3.20 per 1M, 202k context.
- **Gemini 3.1 Flash Live** is the multimodal upgrade tier.
- **Claude Haiku 4.5** is the fallback when an Anthropic key arrives.
- **GLM-Turbo** controls Playwright + Computer Use (per `feedback_rfp_bamaram_always_active.md`).

```ts
import { DEFAULT_ENGINE_CONFIG, resolveEngineConfig } from '@aims/spinner';

const config = DEFAULT_ENGINE_CONFIG;
// {
//   primary: 'glm-5.1',
//   multimodalUpgrade: 'gemini-3.1-flash-live',
//   fallback: 'claude-haiku-4.5',
//   computerUse: 'glm-turbo',
//   computerUseFallback: 'claude-sonnet-4.5-computer-use',
// }

const resolved = resolveEngineConfig(config);
// resolved.primary.routeId === 'z-ai/glm-5.1'
```

## Usage from a chat surface

```ts
import { createSidecar } from '@aims/spinner';

const sidecar = createSidecar({ surface: 'cti-hub' });

// On every user message
const action = await sidecar.onUserMessage({
  userId: 'user_abc',
  message: 'I want to build a coding agent for my 10-person startup',
});

switch (action.type) {
  case 'continue-chat':
    // ACHEEVY responds normally
    break;

  case 'transition-guide-me':
    // Chat UI offers: "Sounds like you want to build [scope]. Guide Me or Manage It?"
    showTransitionPrompt(action.suggestedScope);
    break;

  case 'spawn-three-consultant':
    // Larger project — three-way consultant panel forms in PiP
    showConsultantPanel(action.suggestedScope);
    break;

  case 'handoff-tps-report-ang':
    // Pricing question — hand off to TPS_Report_Ang
    redirectTo('/pricing/prompt-to-plan', { query: action.pricingQuery });
    break;

  // ... other action types
}
```

## RFP-BAMARAM intent recognition

Spinner classifies every message into one of:

| Category | Action |
|---|---|
| `conversation` | Continue chat |
| `question` | Continue chat (ACHEEVY answers in chat) |
| `simple-task` | Execute simple in background |
| `build-intent` | Transition to Guide Me / Manage It |
| `larger-project` | Spawn 3-Consultant Engagement |
| `pricing-question` | Handoff to TPS_Report_Ang |
| `status-check` | Handoff to PMO Office |

Heuristics use keyword + pattern matches with weighted scoring. The highest-weight category wins. `larger-project` beats `build-intent` if both fire (escalation rule).

## Background worker

In-process job store for Phase 1. Each job has lifecycle:

```
classifying → executing → streaming → completed
                                     ↘ failed
                       ↘ awaiting-handoff
```

Listeners subscribe via `onJobEvent()` to render progress in the PiP window.

```ts
import { onJobEvent } from '@aims/spinner';

const unsubscribe = onJobEvent((job, event) => {
  console.log(`[${job.id}] ${event}: ${job.status}`);
});
```

Phase 2: move job state to Neon for cross-process resilience.

## Live Look In

NVIDIA Omniverse + Cosmos via Cloud Run Jobs with GPU spin-up. Per Rish 2026-04-08:

> "We need to start setting up the live look-in feature that we established initially with NVIDIA, using NVIDIA Omniverse and Cosmos through cloud run jobs, spinning up a GPU."

**Phase 1 (this PR):** types + stub `provisionSession()`. Returns immediately with status `'provisioning'`, simulates the transition to `'streaming'`. No actual GCP API calls yet.

**Phase 2 (TODO):** real provisioning via `gcloud run jobs create`, GPU node selection (L4 / A100 / H100), WebRTC streaming back to the PiP window in the chat surface.

GCP DoD compliance gate is NOT a blocker — Cloud Run Jobs are GCP standard, not gated by DoD specifically. Can move ahead of Phase 1 CMMC L1 work.

## 3-Consultant Engagement

For larger projects, Spinner spawns a three-way panel:

1. **NOTE / AVVA NOON Guardian half** — validates RTCCF + V.I.B.E.
2. **ACHEEVY** — customer-facing executive, runs the conversation
3. **The Consultant** — domain-specialist Boomer_Ang matched by scope keywords (e.g. "code/build/api" → boomer_cto, "marketing/campaign" → boomer_cmo)

Per Rish 2026-04-08:
> "If it's a larger project, then they bring in the consulting, and then they do the three consultant engagement where we have the note and ACHEEVY, and then the consultant."

The user watches the three-way conversation in the PiP window. This is the differentiator that justifies the virtual-organization positioning — customers see the org actually working.

> *NOTE interpretation:* best read is that NOTE is the AVVA NOON Guardian half. If NOTE is a separate persona, this needs an update — flagged in `project_spinner_feature.md`.

## Phase order

Per Rish 2026-04-08:
> "We first establish the working model, and then we can scaffold on top of that, but the initial launch has to work smoothly, consistently, and flawlessly, and then we can start to build on top of it."

| Phase | Status |
|---|---|
| **A. Verify GLM-5.1 chat works on funded OpenRouter** | ⏳ next (gating everything) |
| **B. Decide + verify Computer Use model** (GLM-Turbo) | ⏳ depends on A |
| **C. Provision Live Look In** (NVIDIA Omniverse + Cosmos) | ⏳ depends on B |
| **D. Build Spinner sidecar** | ✅ this PR (skeleton + types + classifier) |
| **E. Wire chat → Guide Me / Manage It transition** | ⏳ depends on D + A |
| **F. Scaffold features on top** | ⏳ later |

## Test plan

- [ ] `cd aims-tools/spinner && npm install && npm run typecheck`
- [ ] `classify()` returns `build-intent` for "I want to build a coding agent"
- [ ] `classify()` returns `larger-project` for "I want to build a fully autonomous company"
- [ ] `classify()` returns `pricing-question` for "How much does this cost"
- [ ] `classify()` returns `conversation` for "Hello"
- [ ] `assertNotBanned('gemma')` throws
- [ ] `resolveEngineConfig(DEFAULT_ENGINE_CONFIG).primary.engineId === 'glm-5.1'`
- [ ] `createSidecar({ surface: 'cti-hub' }).onUserMessage(...)` returns valid SpinnerAction
- [ ] `startJob()` registers a job and emits `started` event
- [ ] `spawnPanel()` matches consultant by scope keywords
- [ ] `provisionSession()` returns a session with status `'provisioning'`

## Cross-references

| Topic | Memory file |
|---|---|
| Spinner feature spec | `project_spinner_feature.md` |
| Chat → Guide Me / Manage It transition | `project_chat_to_guide_me_transition.md` |
| Chat engine + Computer Use decisions | `project_chat_engine_decision.md` |
| RFP-BAMARAM always active | `feedback_rfp_bamaram_always_active.md` |
| ACHEEVY chat engagement SOP | `project_acheevy_chat_engagement_sop.md` |
| ACHEEVY Guide Me / Manage paths | `project_acheevy_guide_me_manage_paths.md` |
| AVVA NOON canon (Guardian half = NOTE?) | `project_avva_noon_canon.md` |
| HR PMO Office (mission commissioning) | `project_hr_pmo_office.md` |
| Reasoning stream UI (PiP window) | `project_reasoning_stream_ui.md` |
| TPS_Report_Ang Pricing Overseer (handoff target) | `project_pricing_overseer_agent.md` |
