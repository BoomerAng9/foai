---
name: fleet-routing
description: How Chicken Hawk classifies user intent and routes to the correct Lil_Hawk specialist.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Fleet Routing — Lil_Hawk Intent Classification

Use this skill when building or modifying how Chicken Hawk understands incoming
requests and routes them to the right Lil_Hawk.

## How It Works

Chicken Hawk receives dispatches from two sources:
1. **Direct user input** via the `/chat` endpoint (standalone mode)
2. **ACHEEVY escalation** when the Digital CEO needs tactical execution

In both cases, Chicken Hawk uses LLM-based intent classification to select a Lil_Hawk.

## Classification Flow

```
Incoming message
    │
    ▼
┌──────────────────┐
│ LLM Classifier   │  ← system-prompt/chicken-hawk.md defines routing rules
│ (router.py)      │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ RoutingDecision  │
│ {                │
│   hawk: string,  │
│   confidence: f, │
│   reasoning: str │
│ }                │
└────────┬─────────┘
         │
    confidence ≥ 0.6?
    yes ─────┼───── no
     │               │
     ▼               ▼
  Dispatch      Fallback to
  to hawk       Lil_Deep_Hawk
```

## Routing Table

| If the intent involves...                        | Route to            |
|--------------------------------------------------|---------------------|
| Large-scale code refactors, repo-wide changes    | Lil_TRAE_Hawk       |
| New features, code review, plan-first work       | Lil_Coding_Hawk     |
| OS commands, browser automation, CLI workflows   | Lil_Agent_Hawk      |
| SaaS integrations, CRM, email, payment flows    | Lil_Flow_Hawk       |
| Quick sandboxed code execution, scripts          | Lil_Sand_Hawk       |
| Memory retrieval, knowledge lookup, RAG          | Lil_Memory_Hawk     |
| Stateful multi-step conditional workflows        | Lil_Graph_Hawk      |
| Backend scaffolding, auth, DB schema, APIs       | Lil_Back_Hawk       |
| Monitoring dashboards, observability queries     | Lil_Viz_Hawk        |
| 3D modeling, Blender, rendering, animation       | Lil_Blend_Hawk      |
| Complex multi-specialist missions (Squad mode)   | Lil_Deep_Hawk       |

## Implementation Details

The classifier lives in `gateway/router.py`:

- `HawkRole` enum — 11 hawk identifiers
- `_classify_intent()` — Sends message + system prompt to LLM, expects JSON back
- `_dispatch_to_hawk()` — HTTP POST to the hawk's `/run` endpoint
- `_review_gate()` — Validates output before returning to user
- Retry policy: 3 attempts with exponential backoff on classification, 2 on dispatch

## ACHEEVY Escalation Handling

When ACHEEVY dispatches to Chicken Hawk, the message includes a `preferredHawk` hint:

```json
{
  "from": "ACHEEVY",
  "to": "chicken-hawk",
  "pcpId": "PCP-2f8k1a",
  "task": "Refactor auth module",
  "preferredHawk": "Lil_TRAE_Hawk",
  "priority": "high"
}
```

Chicken Hawk treats `preferredHawk` as a **strong suggestion** but still runs
classification. If classification agrees (confidence ≥ 0.7), it uses the preferred
hawk. If not, it routes to the classified hawk and logs the override.

## Adding a New Routing Rule

1. Add the hawk to `HawkRole` enum in `gateway/router.py`
2. Add routing guidance to `system-prompt/chicken-hawk.md`
3. Add endpoint config to `config/lil_hawks.yml`
4. The LLM classifier will automatically learn to route to the new hawk based on the updated system prompt

## Reference Files

- `gateway/router.py` — Classification and dispatch logic
- `system-prompt/chicken-hawk.md` — Routing rules for LLM
- `config/lil_hawks.yml` — Hawk endpoint registry
