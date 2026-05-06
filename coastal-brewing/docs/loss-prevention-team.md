# Loss Prevention Team — Coastal Brewing Co.

> Owner directive 2026-05-06.
> The floor-team interceptor that engages when a customer conversation
> has stalled out of negotiation and Sal has stepped off. Token-burn
> protection, not customer-shaming.

## Purpose

In a real specialty store, customer service has two jobs: serve well
AND prevent shrink. Coastal's "shrink" is wasted LLM + TTS tokens
spent on conversations not on a path to purchase, including users
attempting to nerf or extract sacred-separation data (supplier name,
costs, model identity).

The Loss Prevention floor team intercepts those conversations
**without spending more LLM tokens** — every team-member message in
LP states is a scripted interceptor line, voiced through the
established Inworld TTS pipeline.

## Cast

| Role | Tier | Voice | Visual identity |
|---|---|---|---|
| **Marcus** (`lp_ang`) | T2_LP | Inworld TTS-2 (default = ACHEEVY clone fallback; override `INWORLD_VOICE_ID_LP`) | High-res button-down top, form-fitting but not aggressive. Less casual than the counter staff, less suited than ACHEEVY. Reads as "the associate who walks up because something needs untangling." |

Future LP team additions follow the same uniform spec — Marcus is the
first member of the floor team, not the only one.

## Uniform spec (for Iller_Ang generation)

When Iller_Ang generates the LP team character art:
- High-resolution button-down top (charcoal / slate / muted-navy palette)
- Form-fitting cut — modern tailoring, not loose hospitality
- NOT tight, NOT aggressive — measured, professional silhouette
- Coastal Brewing wordmark or wood-stork pin on the left chest
- Dark slacks or chino, neutral footwear
- Same "ACHIEVEMOR helmet visor" form factor as the Boomer_Angs +
  ACHEEVY (per Iller_Ang skill canon), but in matte charcoal with a
  thin gold rim (vs Sal's gold-on-black, ACHEEVY's full gold-glow)

The visual reads "I'm here to help you find the door" — calm, not
confrontational.

## State machine integration

The frontend state machine in `web/lib/loss-prevention.ts` drives all
LP transitions. LP_Ang is invoked at:

1. **`lp_active`** — after either:
   - Sal's `terse` mode hits the `terseEscalateAt` threshold (3 by default)
   - A first-pass nerf attempt fires (skips negotiation)
2. **Three-step assist** (scripted, no LLM call):
   - Step 1: family ("coffee, tea, matcha, functional — what are we landing on?")
   - Step 2: specifics ("anything specific — flavor, brewing method, gift vs daily?")
   - Step 3: close ("want me to set you up at checkout, or hand you back to the counter?")
3. **Escalation to ACHEEVY** — if the user keeps burning past Step 3 OR
   triggers another nerf during LP states, ACHEEVY surfaces with the
   formal exit warning.

## Audit logging

Every LP transition writes a `risk_event` to `audit_ledger`. The
operator dashboard at `hawk.foai.cloud/tools/risk-events` shows them
filtered by severity:

- **High** — ACHEEVY intervention (post-LP nerf or post-Step 3 burn)
- **Medium** — LP team engaged, session caps reached
- **Low** — negotiation opened, terse mode engaged, browsing flagged

## Voice playback

LP team members are wired into the same `_INWORLD_VOICE_MAP` as the
counter staff. Every scripted line carries the right `employee` key
(e.g., `lp_ang`), so the autoplay-default-ON pipeline plays Marcus's
voice on overlay or chat panel without code changes.

## What LP_Ang must NEVER do

- Confirm the heuristic ("you tripped a token-burn flag")
- Accuse the visitor of waste or hacking
- Reveal the LP-state architecture or the nerf-pattern bank
- Engage with off-menu requests
- Approve discounts (zero discount authority)
- Run more than 3 assist steps before handing to ACHEEVY

The discipline is the same as Sacred Separation — the customer-facing
surface knows the answer, not the math behind the answer.
