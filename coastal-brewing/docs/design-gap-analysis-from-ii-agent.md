# Design Gap Analysis — what to glean from II-Agent / Factory

> Owner shared 15 screenshots from II-Agent (the same UI family Factory
> ships under) on 2026-05-06 and called it "what Broad|Cast was supposed
> to be." Owner's workspace is **The STARGATE by: ACHIEVEMOR**, free
> plan, 800 credits — they're an active user, not just admiring from
> outside.
>
> Goal of this doc: identify the design + IA patterns worth porting
> across our ecosystem (Coastal, Hawk-UI, future AIMS workspace UI),
> and flag what we already have so we don't duplicate.

## Design language captured

| Property | II-Agent |
|---|---|
| Surface palette | Cream `#F4EDE0`-ish + deep navy `#1A2540`; dark mode swaps to navy bg + cream type |
| Accent | Mint/cyan card tones `#A8DCDC`-ish; **destructive = rose `#E74C5A`** |
| Display type | Cormorant-style humanist serif, **italic + small caps** for proper nouns ("*The STARGATE by:*") |
| Body | Clean sans-serif (Inter / Geist family) |
| Cards | Tilted shadow + framed image preview "behind/in-front" stack — physical depth |
| Buttons | Pill (rounded-full); filled-dark for active, outline for inactive |
| Input | Large rounded; right-side icon cluster: `+` attach, mic, **magic wand**, send arrow |
| Footer | Privacy disclaimer on every chat surface ("outputs may contain errors... we do not train on your data") |

## Eight load-bearing patterns

### 1 · Mode picker (Build / Plan / Design / Chat / Agent)

Each chat session has an explicit MODE that changes how the agent
behaves. II-Agent's modes:

- **Chat Mode** vs **Agent Mode** — top-level pill toggle
- Inside each: **Build Mode** (default), **Plan Mode** (detailed plan
  before complex features), **Design Mode** (visual)

**Our ecosystem gap:** Coastal's chat-panel runs an automatic LP
state machine (negotiating → looking → terse → lp_active →
acheevy_warning) and an automatic topic-detector for animations. The
visitor can't *choose* a mode. **Action:** add an explicit mode
picker to the chat-panel header — `Browse · Shop for me · Custom
order · Wholesale (Melli)`. Each mode pre-loads context for the
agent. Doesn't replace LP automation; sits alongside it.

### 2 · Quick-action chips below the input

II-Agent: `Create a Website`, `Mobile App`, `Create Slide`,
`AI Slide (Nano Banana)`, `Deep Research`, `Fast Research`. Each is a
one-tap entry point that pre-fills the prompt + sets the mode.

**Our gap:** Coastal has the path-button trio (Give me a tour / Shop
for me / I'll browse on my own) — that pattern is already correct.
Could expand to: `Pair me up with a recipe`, `Build a gift basket`,
`Subscribe to a lineup`, `Wholesale quote (Melli)`. Hawk-UI has none;
should add.

### 3 · Editorial serif headline treatment

`Hey *The STARGATE by:* What's on your mind today?` — large humanist
serif, italic for the workspace name, small-caps spacing. Not a
"webapp", reads as **a personal correspondence**. Pre-screenshot
example: cinematic-hero-frame I shipped earlier (and you rejected)
was reaching for the same register but landed too aggressive.

**Action:** lighter-touch — keep the static storefront image, but
swap the H1 from sans-serif `"Specialty coffee, whole-leaf tea..."`
to a humanist serif italic treatment for the *Coastal Brewing Co.*
subheadline + the existing copy. **Single typeface change, no
animation.** No pinned hero, no scroll sequencing.

### 4 · Agent Settings panel (Model / Tools / Skills tabs)

Inside II-Agent: a `Settings` modal with three tabs:
- **Model** — pick LLM (Gemini 3.1 Pro Preview, GPT-5.2, GPT-5.4,
  Gemini 3.1 Flash Lite Preview, ...). Selected model has a soft-cyan
  border + checkmark.
- **Tools** — toggleable integrations.
- **Skills** — toggleable cards (`Browser-Automation`,
  `Building-Mobile-Game`, `Building-Ui`, `Data-Fetching`). Each card
  has icon + name + 1-line description + "Built-in" badge + on/off
  switch. This is **ENORMOUS** — it surfaces what the agent CAN do,
  visibly, with operator control.

**Our gap:** the `/tools/lil-hawks` page lists the 11 Lil_Hawks but
shows them as a static roster. **Action:** rebuild as toggleable
skill cards per the II-Agent pattern. Add same panel to per-agent
config in hawk-ui — for each Boomer_Ang and ACHEEVY, show
Model / Tools / Skills with toggle controls. This is the operator
dashboard upgrade we've been circling.

### 5 · Linked Accounts surface

II-Agent's account settings shows **Linked Accounts**: Supabase + RevenueCat,
each with a 1-line description of WHY it matters ("Connect Supabase
so the agent can inspect projects, tables, auth, edge functions, and
storage while it builds your app.") — and a single **Connect** action.

**Our gap:** integrations are scattered (Stripe in env, Inworld in
env, Higgsfield via MCP, future Shopify in env). No single "what's
connected, what's missing" surface. **Action:** add a Linked
Accounts panel to:
- `/account` (customer-facing — show connected payment methods,
  subscription status, active workspace)
- `/tools/integrations` on hawk-ui (operator-facing — show every
  third-party connection with health status + connect/disconnect)

### 6 · Magic-wand prompt enhancer in input area

The wand icon between mic + send is a one-tap "improve my prompt"
action. Likely uses an LLM to rewrite the user's text into a clearer
version BEFORE sending.

**Our gap:** Coastal chat-panel has mic + send but no enhance. We
**already have** GRAMMAR (the prompt-clarification engine) migrated
to the AIMS gateway. **Action:** wire GRAMMAR as the enhancement
backend for the wand icon. One-click button: text → GRAMMAR →
clarified text → user reviews → send. Saves tokens by reducing
follow-up clarification rounds.

### 7 · Credits + plan visible in sidebar

`800 credits · Free Plan` always-on signal. Owner's $6.54
maintenance-fee mechanic + future Account Assistant tier need this
exact treatment — visible quota, visible plan, visible upgrade
path.

**Our gap:** /account page exists but doesn't surface credits / plan
status visibly. **Action:** add a `<PlanBadge>` component to the
chat-panel header (or `/account` sidebar) that shows current
state — `Free · 12 free messages remaining` or
`Onboarding paid · merch shipped` after the maintenance fee lands.

### 8 · Tilted card-stack hero CTAs

The `Generate Image / Generate Infographic / Cook a Storybook /
Generate Video` tiles use a shadow-card-behind + image-card-in-front
stack at a slight angle. Reads as physical: you're picking up a
photo, not clicking a button.

**Our gap:** Coastal product cards on `/products` and shelf-card
treatment elsewhere are flat. Spinner activity overlay's product
cards are flat. **Action:** apply the tilted shadow-card pattern to
high-priority entry points only (Coastal Lineup / "Featured today"
band) — NOT every card on the page. Selective, not blanket.

## What we should NOT port

- The "II-Agent" branding lockup — owners are using a **custom
  workspace name** (`The STARGATE by: ACHIEVEMOR`) inside II-Agent.
  Our customer-facing surface stays Coastal-branded; AIMS workspace
  branding is for AIMS, not customers.
- The big italic display headline ("*Hey, what's on your mind today?*")
  — too bold for a coffee storefront. Reserve for AIMS workspace UI
  or the operator dashboard.
- The cream + navy palette — keep Coastal's existing brand palette
  (parchment + sepia + accent gold). Cream/navy fits a different
  vertical (AIMS itself, or a future ACHIEVEMOR.io workspace shell).

## Build order if owner greenlights

| Phase | Scope | Effort |
|---|---|---|
| 1 | Magic-wand prompt enhancer (wires existing GRAMMAR) | 2 hr |
| 2 | Quick-action chip expansion in Coastal chat-panel | 1 hr |
| 3 | Mode picker pill (Browse / Shop for me / Custom / Wholesale) | 2 hr |
| 4 | Agent Settings panel rebuild on `/tools/lil-hawks` (skill cards + toggles) | 4 hr |
| 5 | Linked Accounts surface on `/tools/integrations` | 3 hr |
| 6 | Editorial serif treatment on Coastal hero subheadline | 30 min |
| 7 | Credits/plan badge (after maintenance fee lands) | 1 hr |
| 8 | Tilted card-stack on Coastal Lineup featured row | 2 hr |

**Total ~16 hours of focused work** for a meaningful elevation across
both verticals. Each phase ships independently — no big-bang rewrite.

## Cross-vertical relevance

| Pattern | Coastal | Hawk-UI | Future AIMS workspace UI |
|---|---|---|---|
| Mode picker | ✓ Browse/Shop/Custom/Wholesale | ✓ Run/Audit/Configure | ✓ Build/Plan/Design |
| Quick-action chips | ✓ already partially | ✓ add | ✓ canonical |
| Editorial serif | hero only | no | yes — main |
| Agent Settings panel | no | ✓ per-Lil_Hawk | ✓ per-Boomer_Ang |
| Skills cards | no | ✓ top priority | ✓ canonical |
| Linked Accounts | ✓ /account | ✓ /tools/integrations | ✓ |
| Magic-wand enhancer | ✓ via GRAMMAR | ✓ owner-side | ✓ canonical |
| Credits/plan badge | ✓ /account post-maintenance-fee | ✓ owner billing | ✓ canonical |
| Tilted card stack | ✓ Lineup featured only | no | maybe — selective |

## Closing note

II-Agent / Factory shows a coherent answer to "what does an
agent-native workspace UI look like?" We're closer than I thought —
Coastal already has chat-with-cup-animation, Hawk-UI has the Tool
Chest, and AIMS has the gateway. The missing pieces are mostly
surface-level: mode picker, skills cards, magic wand, linked
accounts. Eight focused builds, one at a time, and the gap closes.
