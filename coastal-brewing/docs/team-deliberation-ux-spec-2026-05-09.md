# Team-deliberation UX spec — visible Sal/LUC/ACHEEVY/Melli chat (2026-05-09)

Owner directive 2026-05-09:

> "you must write a proper RAG and Chain of Thought to present the
> Team conversing and deliberating, before customer facing. Because I
> do not see that right now in the Conversation."

Reference UX: Kimi.ai mobile app's negotiation flow — custee sees the
team deliberate, not just a single voice handing down a verdict.

## Current state (problem)

`web/components/chat-panel.tsx` renders ONE persona per message bubble.
Custee sees:

```
[Sal_Ang]: We can do 15% off.
[Sal_Ang]: That's about as far as my counter sits.
```

Then if escalation fires, custee sees Sal disappear and ACHEEVY-or-Melli
appear cold. No visible deliberation. No team feel.

## Target state (this spec)

Custee sees the team converse:

```
[Custee]: Can you do 25% off?

[Sal_Ang]: Real talk, that's past my counter — let me bring LUC in.

  ┌─ Team huddle ─────────────────────────────┐
  │ [Sal_Ang]: LUC, can you run the numbers   │
  │            on 25% for this Ethiopian?     │
  │                                            │
  │ [LUC_Ang • thinking…]                     │
  │ [LUC_Ang]: At 25% one-off the margin     │
  │            drops to 8%. Tight but works.  │
  │            Better play: 25% off month 1   │
  │            on a subscription, then 15%    │
  │            ongoing. Lifetime value pencils│
  │            out 3.2× the one-off net.      │
  │ [Sal_Ang]: Got it. Thanks LUC.            │
  └────────────────────────────────────────────┘

[Sal_Ang]: Here's the deal Custee — 25% off
  isn't viable on a single bag, but if you start
  a subscription, I can do 25% off month one
  and 15% ongoing. Want to lock that in?
```

The team-huddle block is **visible to the custee** but **visually
distinct** (different background tint, indented, "Team huddle" label).
This is the team showing their work — not a black box.

## Component architecture

### New component: `<TeamHuddle />`

Path: `web/components/chat/team-huddle.tsx`

Props:
```ts
interface TeamHuddleProps {
  participants: ("sal_ang" | "luc_ang" | "acheevy" | "melli_capensi")[];
  thread: Array<{
    speaker: "sal_ang" | "luc_ang" | "acheevy" | "melli_capensi";
    content: string;
    thinking?: boolean;  // shows "[thinking…]" indicator
    cost_basis_shown?: { sku: string; cost: number; floor: number; proposed: number };  // optional inline math
  }>;
  decision: {
    final_pct: number;
    path: "one-off" | "subscription" | "bundle" | "bulk" | "b2b";
    next_speaker: "sal_ang" | "luc_ang" | "acheevy" | "melli_capensi";  // who delivers the verdict to custee
  };
}
```

Visual:
- Indented frame (16px left margin) inside the chat scroll.
- Background tint: `bg-stone-50/60` (subtly different from main chat).
- Top label: monospace `Team huddle — {participants.join(' + ')}`.
- Each thread message: standard bubble shape but smaller font (13px vs 15px), the persona avatar to the left, name label monospace 10px uppercase.
- "Thinking" indicator: 3-dot pulse animation on the persona's bubble.
- Optional cost-basis math row: faint monospace one-liner like `cost=$15.78  floor=$17.28  proposed=$18.74  margin=8.2%` — hidden by default, expandable on tap (transparency without overwhelming).
- Bottom: "Team verdict →" arrow leading the eye out of the huddle into the next custee-facing message from `next_speaker`.

### Update: `<ChatPanel />` rendering loop

Current: `messages.map(m => renderBubble(m))`.

New: messages now include a `kind` field:
- `"custee"` — what the custee said.
- `"agent"` — single-persona reply (current behavior).
- `"team_huddle"` — new — renders `<TeamHuddle />`.

Backend message stream already threads `m.employee` per message; adding
a new `m.kind === "team_huddle"` shape is additive, not breaking.

### Animation: warm-transfer transition

When ACHEEVY hands off to Melli (or any handoff), insert a brief
visual transition:

- Indented "Team huddle" frame closes with a soft fade.
- Next agent's first bubble enters with a subtle slide-in-from-right + 200ms `Welcome` flicker on the persona-name chip.
- Optional: agent avatar swap animation (Sal's espresso cup → LUC's ledger → ACHEEVY's seal → Melli's coffee pot).

## Backend orchestration

### New endpoint: `POST /api/v1/chat/team-huddle`

Triggered when:
- Sal hits 15% cap and custee wants more.
- LUC needs to enter visibly.
- ACHEEVY needs to approve a bundle/bulk request.
- Melli needs to enter for B2B close.

Request body:
```json
{
  "session_id": "...",
  "current_agent": "sal_ang",
  "trigger": "discount_above_cap" | "bundle_request" | "bulk_request" | "b2b_signal",
  "context": {
    "sku": "ETHN",
    "qty": 50,
    "requested_pct": 25,
    "past_purchase": true
  }
}
```

Response: streamed messages composing the team huddle. Each message has
`{speaker, content, thinking?, cost_basis_shown?}` shape so frontend
can render them into `<TeamHuddle />`.

### Implementation sketch

```python
@app.post("/api/v1/chat/team-huddle")
async def team_huddle(req: TeamHuddleRequest):
    """Compose a visible team-deliberation thread.

    Calls each agent's LLM with a 'team-huddle' system prompt that
    explicitly tells them the conversation is visible to the custee
    and to keep it tight + on-character.
    """
    thread = []
    if req.trigger == "discount_above_cap":
        # Sal asks LUC
        sal_open = await _agent_speak("sal_ang", system="huddle_sal_to_luc", context=req.context)
        thread.append({"speaker": "sal_ang", "content": sal_open})

        # LUC thinks (visible)
        thread.append({"speaker": "luc_ang", "content": "[crunching…]", "thinking": True})

        # LUC reasons
        luc_reasoning = await _agent_speak("luc_ang", system="huddle_luc_reasoning", context={**req.context, "cost_basis": _catalog_cost(req.context["sku"])})
        thread.append({
            "speaker": "luc_ang",
            "content": luc_reasoning["text"],
            "cost_basis_shown": luc_reasoning["math"],
        })

        # Sal acknowledges
        sal_close = await _agent_speak("sal_ang", system="huddle_sal_acknowledge", context={"luc_reasoning": luc_reasoning["text"]})
        thread.append({"speaker": "sal_ang", "content": sal_close})

        decision = {"final_pct": luc_reasoning["approved_pct"], "path": luc_reasoning["path"], "next_speaker": "sal_ang"}

    elif req.trigger == "bundle_request":
        # Sal → LUC → ACHEEVY → warm-transfer to Melli
        ...

    return {"thread": thread, "decision": decision}
```

### New system prompts (per agent, per huddle role)

Path: `agents/{persona}/huddle_prompts.py` or inline in `agent.py`.

Each prompt explicitly:
- Says "this conversation is visible to the custee — be brief and stay
  on character."
- Tells the agent who they're speaking to (LUC vs custee).
- Provides the SKU cost basis + floor for math-grounded responses.

Example (`luc_huddle_reasoning`):
```
You're LUC, the CFO. Sal just asked you to evaluate a discount
request. Your reasoning is visible to the custee. Show your work
briefly — 2-3 sentences max. Use one of these patterns:

  Pattern A (math works): "At [PCT]% the margin drops to [M]%. Tight
  but workable. Approve."

  Pattern B (sub counter): "At [PCT]% one-off the margin's too thin
  ([M]%). Counter: [PCT]% off month 1 on a sub, then [STD]% ongoing.
  Lifetime value pencils [LTV_RATIO]× the one-off net."

  Pattern C (decline): "[PCT]% breaks the floor. Counter at [MAX_OK]%."

Don't moralize. Don't apologize. Numbers tell the story.

SKU: {sku}, cost: {cost}, floor: {floor}, requested_pct: {pct}
```

Each agent has their own huddle-prompt set tuned to their voice
register (per `aims-tools/voice-library/personas/`).

## Visual mockup (ASCII)

```
╔═══════════════════════════════════════════════════════════╗
║ Coastal Brewing Co. — Sal_Ang                              ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║ [you]              Can you do 25% off?                    ║
║                                                            ║
║ [Sal_Ang]                                                  ║
║ ☕  Real talk, that's past my counter — let me bring LUC in║
║                                                            ║
║   ┌─ Team huddle — Sal + LUC ───────────────────────────┐ ║
║   │                                                     │ ║
║   │ [Sal_Ang]                                           │ ║
║   │ ☕ LUC, can you run the numbers on 25% for the      │ ║
║   │    Ethiopian Natural?                               │ ║
║   │                                                     │ ║
║   │ [LUC_Ang]                                           │ ║
║   │ 📊 [crunching…]                                     │ ║
║   │                                                     │ ║
║   │ [LUC_Ang]                                           │ ║
║   │ 📊 At 25% one-off, margin drops to 8.2%. Tight.    │ ║
║   │    Counter: 25% off month 1 on a sub, then 15%      │ ║
║   │    ongoing. LTV pencils 3.2× one-off net.           │ ║
║   │   ▸ cost=$16.47 floor=$17.97 proposed=$21.74        │ ║
║   │                                                     │ ║
║   │ [Sal_Ang]                                           │ ║
║   │ ☕ Got it. Thanks LUC.                              │ ║
║   │                                                     │ ║
║   │ Team verdict →                                      │ ║
║   └─────────────────────────────────────────────────────┘ ║
║                                                            ║
║ [Sal_Ang]                                                  ║
║ ☕ Here's the deal — 25% off isn't viable on a single bag,║
║    but if you start a subscription, I can do 25% off       ║
║    month one and 15% ongoing. Want to lock that in?        ║
║                                                            ║
║ [you]              ▢                                       ║
╚═══════════════════════════════════════════════════════════╝
```

## Implementation phases

| Phase | Scope | Effort |
|---|---|---|
| **1. Backend `team-huddle` endpoint** | New endpoint + system prompts per persona-role + Catalog cost-basis fetch | ~3-4h |
| **2. Frontend `<TeamHuddle />` component** | New component + indented frame + "thinking" indicator + math row | ~2-3h |
| **3. ChatPanel integration** | Add `kind === "team_huddle"` rendering branch | ~1h |
| **4. Animation polish** | Warm-transfer slide + avatar swap | ~2h |
| **5. Stripe Checkout wiring** | Decision + final_pct rides into Path A escalation flow's Checkout Session | ~1h |
| **6. Tests** | Component tests for TeamHuddle, integration test for huddle endpoint | ~2h |
| **Total** | | **~11-13h** |

## Things deliberately NOT in this spec

- Voice (STT/S2S) capture for Melli's B2B intake — separate spec when
  Melli flow ships.
- Inline form for B2B intake — leverage Stripe Checkout custom_fields
  or build a Next.js native form per `reference_coastal_path_a_stripe_direct_2026_05_09.md` v2.
- Audio version of the huddle (TTS the team conversation) — out of
  scope for v1; visible-text only.

## Pairings

- `pricing-margin-model-2026-05-09.md`
- `negotiation-envelope-spec-2026-05-09.md`
- `reference_coastal_path_a_stripe_direct_2026_05_09.md`
