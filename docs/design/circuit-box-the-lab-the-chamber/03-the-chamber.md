# Page 3 — The Chamber

> Testing scenarios + Workbench mode.
> Renamed from "Workbench" per Rish 2026-04-08.

## What The Chamber is

The Chamber is the user's **testing space**. Where The Lab shows what tools exist, The Chamber is where the user actually puts them through their paces — scenario creation, test forms, real-time results, agent feedback, save & replay.

## Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ THE CHAMBER     [Testing Mode ●━━━━━○ Workbench Mode]   [Find ▾] [+] │
├──────────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌──────────────────────┐ ┌──────────────────────────┐│
│ │ TOOLS+APIs  │ │ SCENARIO CREATION    │ │ REAL-TIME RESULTS        ││
│ │             │ │                      │ │                          ││
│ │ New Releases│ │ Scenario name        │ │ Status: 200 OK           ││
│ │ - DeepSeekR1│ │ [Live STT Test ____] │ │ Latency: 125ms           ││
│ │ - Llama 3.3 │ │                      │ │ Accuracy: 99.5%          ││
│ │ - HF Spaces │ │ Language    Bitrate  │ │ Model: ElevenLabs-v2     ││
│ │             │ │ [English-US][128kbps]│ │                          ││
│ │ Popular APIs│ │                      │ │ ┌──────────────────────┐ ││
│ │ - GPT-4o    │ │ Test Form            │ │ │ Logs                 │ ││
│ │ - Mistral   │ │ API Endpoint  Method │ │ │ [info] running...    │ ││
│ │ - 11 Labs   │ │ [...        ][POST]  │ │ │ [info] tts complete  │ ││
│ │             │ │                      │ │ │ [warn] retry once    │ ││
│ │ Saved       │ │ Headers              │ │ └──────────────────────┘ ││
│ │ - Claude 3.5│ │ [Authorization][...] │ │                          ││
│ │ - 11 Labs   │ │ [Content-Type ][json]│ │ Agent Feedback           ││
│ │ - Qwen 3    │ │                      │ │ Listening for input...   ││
│ │             │ │ Body                 │ │                          ││
│ │             │ │ {"text":"hello"}     │ │ [Spin up Voice Agent]    ││
│ │             │ │                      │ │ [Save Results]           ││
│ │             │ │ [▶ Run Test]         │ │                          ││
│ └─────────────┘ │                      │ │ Quota: 4550/5000 (Month) ││
│                 │ MY PROJECTS          │ │ Cost/test: $0.05         ││
│                 │ ┌────────┐ ┌────────┐│ │                          ││
│                 │ │+New App│ │+New Agt││ │                          ││
│                 │ └────────┘ └────────┘│ │                          ││
│                 │                      │ │                          ││
│                 │ Smart Customer Bot   │ │                          ││
│                 │ Voice Asst Integ.    │ │                          ││
│                 │ Data Analysis App    │ │                          ││
│                 │ ...                  │ │                          ││
│                 │                      │ │                          ││
│                 │ [Save Test Scenario] │ │                          ││
│                 └──────────────────────┘ └──────────────────────────┘│
└──────────────────────────────────────────────────────────────────────┘
```

Reference image: `Image #8` from the 2026-04-08 batch.

## Two modes

| Mode | Purpose |
|---|---|
| **Testing Mode** (default) | Quick one-shot test of a tool — no persistence |
| **Workbench Mode** | Persistent project — saved scenarios, agents, smart apps |

Toggle in the top bar. Same layout, different persistence.

## Left panel — Tools & APIs

Three sections:
1. **New Releases** — Latest tools added to the catalog (sourced from `@aims/pricing-matrix` filtered by recency)
2. **Popular APIs** — Most-summoned tools (per usage telemetry)
3. **My Saved Tools** — Tools the user has used recently or pinned

Each row has:
- Tool name + class icon
- Availability badge (Available / Beta / Coming Soon)
- Quick-add (+) button to insert into the current scenario

## Center panel — Scenario Creation

Form fields for any tool test:
- **Scenario name** — required, used for save
- **Language / Bitrate / Region** — context-dependent fields per tool
- **API Endpoint + Method** — auto-populated when a tool is added
- **Headers** — key/value table (Authorization auto-filled with masked `[API_KEY]`)
- **Parameters** — query string fields
- **Body Editor** — JSON body with syntax highlighting
- **Run Test button** — large, prominent, plays the cost preview before firing

Below the form:
- **My Projects** sub-panel — saved Smart Apps, Agents, Integrations
- **+New Smart App** / **+New Agent** / **+New Integration** spawn buttons
- **Save Test Scenario** — persist the current state for replay

## Right panel — Real-time results

- **Status** — HTTP code or error class
- **Latency** — actual ms vs SLA
- **Accuracy** — for evaluable tests (STT, classification, etc.)
- **Model** — which model actually answered
- **Logs** — color-coded inline log stream
- **Agent Feedback** — text from the agent itself describing its state
- **Quota** — current period usage / limit
- **Cost per test** — LUC + USD equivalent
- **Spin up Voice Agent** button (when applicable)
- **Save Results** button — exports JSON

## Cost preview before run

Before any test fires, The Chamber pops a small confirmation:

> Estimated cost: 4 LUC ($0.04) — 2 of these will hit your monthly cap.
> [Cancel] [Run]

This is the user-facing version of the LUC calculator. TPS_Report_Ang's Lil_Hawk fee-watcher team feeds this estimate.

## Workbench Mode persistence

When in Workbench Mode, scenarios save to a project. Projects can:
- Be opened, edited, re-run from the My Projects list
- Be turned into a deployable Smart App, Agent, or Integration
- Be shared with other users in the same V.I.B.E. Group (Family, Team, Enterprise)
- Be commissioned via `pmo.commission()` to formalize as a real Mission

## "Try in The Chamber" entry from The Lab

When a user clicks "Try" on a tile in The Lab, The Chamber opens with that tool pre-loaded into the scenario form. They just need to fill in the params and hit Run.

## Theme

Dark gradient background with subtle circuit traces. Center scenario form has the gold accent border. Real-time results panel has a green progress bar matching agenticai.net's success color. See `04-shared-design-system.md`.
