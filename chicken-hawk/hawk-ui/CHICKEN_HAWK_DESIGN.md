# CHICKEN HAWK — Design.md

**Status:** Spec — owner-review-gated. No code changes execute against this until owner says "ship it."
**Date:** 2026-04-28
**Operating skill:** `aims-unified-skill` (anti-slop, brand-truth, theme-derived-from-references)
**Source of truth:** owner-provided reference images (Deploy Platform CSS pack + Chicken Hawk character art set), copied to `hawk-ui/public/chicken-hawk/` and `iCloudDrive/Deploy Docs/DEPLOY WEBSITE DESIGN/`.
**Successor to:** the current AIMS-Light theme on hawk.foai.cloud (Inter / slate-50 / amber-600). That theme is correct for `aimanagedsolutions.cloud` customer-tier surfaces, but **wrong for Chicken Hawk** — CH's brand truth is the Deploy Platform's **dark + neon-marker** language, not the AIMS retail-light language.

---

## 0. Ecosystem position — where Chicken Hawk sits (read this first)

**Owner directive 2026-04-29: nothing in this section is new. It references existing canon.**

### Source of truth (read these first; this section just summarizes)

- **`~/foai/AGENTS.md`** — canonical hierarchy: ACHEEVY (Boss) → Chicken Hawk (2IC, orchestrates RuntimeAng/GuardAng/LearnAng) → Lil_Hawks (task workers). Boomer_Angs deployed by ACHEEVY only. Iller_Ang IS a Boomer_Ang (Creative Director — PMO-PRISM).
- **`~/foai/docs/canon/House-of-ANG-v1.1_CORRECTED.md`** — 17 Boomer_Ang specialists across 3 tiers within SmelterOS.
- **`~/.claude/projects/.../memory/reference_foai_ecosystem_hierarchy_canon.md`** — pointer + 3-layer summary that consolidates the above without re-canonizing.
- **`~/.claude/projects/.../memory/feedback_spinner_is_the_armament.md`** — Spinner is universal armament across every character (visual canon, no firearms).
- **`~/.claude/projects/.../memory/feedback_spinner_is_inworld_wrapper.md`** — Spinner is the Inworld Realtime wrapper (technical canon).
- **`~/.claude/projects/.../memory/project_humanless_company_devkit_vision.md`** — Human-less Company; Coastal is the pilot.
- **`~/.claude/projects/.../memory/feedback_chicken_hawk_positioning_openclaw_super_agent.md`** — CH positioning canon.

### Three-layer summary (per the canon above)

```
LAYER 3 — DEPLOY PLATFORM ........ "Build a Company. Without the Company."
                                    Storefront where customers buy autonomous-company kits.
                                    Reference: iCloudDrive/Deploy Docs/.

LAYER 2 — AUTONOMOUS COMPANIES ... Coastal Brewing Co. (pilot), more to come.
                                    Each is independent: own brand, own customers,
                                    own surface. Coastal = the proof.

LAYER 1 — AI TEAM (per ~/foai/AGENTS.md)
              ACHEEVY (Boss)
              ├── Chicken Hawk (2IC) — THIS IS WHAT THIS DOC DESIGNS
              │     ├── Lil_Hawks (task workers)
              │     └── orchestrates 3 INFRASTRUCTURE ENGINES (not peer agents):
              │           - RuntimeAng = OpenClaw
              │           - GuardAng   = NemoClaw
              │           - LearnAng   = Hermes
              └── Boomer_Angs (deployed by ACHEEVY only — incl. Iller_Ang Creative Director)
                    └── The Badgers (The Sett — Coastal marketing)
```

### What this document IS / IS NOT

| | |
|---|---|
| **IS** | Design spec for Chicken Hawk's surface at `hawk.foai.cloud` (Layer 1, staff member) |
| **IS** | Reference application of existing video-pipeline canon (§11 + §12), with Remotion elevated to SME per owner directive 2026-04-29 |
| **IS NOT** | A redesign of Coastal Brewing Co. (Layer 2, separate brand) |
| **IS NOT** | A redesign of the Deploy Platform (Layer 3, its own surface) |
| **IS NOT** | A new ecosystem hierarchy (the hierarchy lives in `~/foai/AGENTS.md`) |

### Spinner — both rules apply (per existing canon, NOT new)

- **Universal visual carry** (per `feedback_spinner_is_the_armament.md`): every character — ACHEEVY, CH mech, all Boomer_Angs, all Lil_Hawks (scaled-down), Badgers, CyberSec variants, Betty-Anne_Ang — visibly carries Spinner. No firearms, blades, or cyber-weapons on any character. This applies to every image, video, and render this design ships.
- **Active function-tool wielding** (per `feedback_spinner_is_inworld_wrapper.md` + owner directive 2026-04-29): the live Inworld Realtime voice/function-call surface is operated by ACHEEVY, Chicken Hawk, Boomer_Angs, and The Badgers. Lil_Hawks execute tasks handed to them by a wielder; they don't drive the voice surface themselves.

### Operating principle for this design

When CH references Coastal (or any future Layer-2 company), the voice is *"I help operate that company"* — never *"that's my product."* When Coastal references CH, it's optional and never a brand overlay (sacred separation per `~/CLAUDE.md`).

---

## 1. Brand truth — extracted from owner references

Per the unified skill's brand-truth rule: never invent palette/font/voice from memory; derive from verified materials. These are the verified materials and what they encode.

### 1A. The "DEPLOY" language (from `/iCloudDrive/Deploy Docs/DEPLOY WEBSITE DESIGN/`)

| Reference | Encoded signal |
|---|---|
| `Deploy & Boomer_Angs - Combined Shelving_1.jpg` | Glass-acrylic shelving, neon outline letters (A green, V gold, A yellow, N cyan, G orange) on pure black, plug-shaped product cases. **Each letter is its own neon-tube color** — accent palette is multi-hue, not monochrome. |
| `Deploy & Boomer_Angs - Document Flow_1.jpg` | "**DEPLOY More Plugs**" header in **graffiti / brushstroke green** (Permanent Marker family). Document-card grid with thin white outlines + traffic-light status dots + green-glow connectors. White lineart on black is the dominant idiom. |
| `Deploy & Boomer_Angs - Security Tiers_1.jpg` | 8-card tier matrix — General use (cyan), Sensitive data (cyan-dark), Heavy regulated (orange), Regulated (orange-darker), Top-tier (red), Defense-grade (red-darker), BMC (silver coin), Strictest constraints (red). **Color encodes risk/tier**. |
| `CareerLaunch Thumbnail Mockup.jpeg` | Thin acrylic shelving + glowing white light bars top + bottom, line-art icons floating in glass. **The shelf itself is the surface** — components sit ON glass shelves, not in cards. |
| `Deploy-by-ACHIEVEMOR-Minimalist-Shelving Reference.jpeg` | Reflective black floor, glass cubes in a 4-wide grid, line-art icons inside each cube. Calm. Minimal. |
| `Deploy Platform Gallery Marketplace_1.jpg` | Marketplace UI: dark BG with subtle keyline pattern, **lime-green pill chips for filters**, **orange "Download" buttons**, **green "Purchase" buttons**, person-portrait product cards with green/orange shield checkmarks. Card-grid is canonical. |
| `Deploy Platform Professional Dashboard_1.jpg` | Dashboard: dark with WHITE inner surface, KPI cards (slate fills), donut + line chart (green/cyan/red/yellow data series). White header strip, dark body. **Two-tone (white panel on black bg) signals authority/operations.** |

### 1B. Chicken Hawk character art (12 images, `hawk-ui/public/chicken-hawk/`)

Each image is a **scene** with a specific functional cue. Not interchangeable.

| File | Scene | Functional cue | Best fit |
|---|---|---|---|
| `ch-mech-port-orange.png` | Hero mech, holographic interface, orange neon city | "I'm operating, I'm ready" | **`/` hero** (primary brand identity) |
| `ch-mech-blue-rain.png` | Cyan/blue armor, container yard, rain, scout pose | Agile / specialized fleet | **`/sqwaadrun`** |
| `ch-mech-gold-rank.png` | Gold-armored CH with rank/level UI + Lil_Hawk drones | Leadership tier, premium, "earned" | **`/about`** or owner-tier celebration |
| `ch-squad-port-night.png` | CH + 2 Lil_Hawks, neon city port, squad shot | Specialists working as one | **`/lil-hawks`** |
| `ch-pixel-evolution.jpg` | 3-stage pixel evolution (chick → adult → mega) | Playful, "we level up", retro | **`/not-found`**, marketing easter eggs, loading nudges |
| `aims-acheevy-squad-port.png` | A.I.M.S. UFOs + ACHEEVY squad with crates, sunset | Ecosystem at scale, fleet operations | About / story / "how we got here" page |
| `aims-acheevy-office.png` | ACHEEVY in modern office with aiPLUG cube, urban penthouse | Owner-tier, "step into the office" | **`/login`** + post-login `/me` |
| `aims-showroom.png` | A.I.M.S. AI Managed Solutions luxury showroom | Boutique credibility | partner / pricing / showroom page |
| `aims-org-chart-deploy-dock.png` | A.I.M.S. Deploy Dock org chart (Acheevy → Juno_Ang/Forge_Ang/Betty-Ann_Ang → Lil_Hawks) | Org structure, leadership map | **`/tools`** index |
| `aims-org-chart-style-alignment.png` | A.I.M.S. style alignment screen with Acheevy + Boomer_Angs + Chicken_Hawk + Lil-Hawks cards | Visual style reference, "who's who" | **`/tools/lil-hawks`** roster |
| `boomer-angs-port-sunrise.jpg` | Boomer_Angs at port, sunrise, opening plugs | Daily operations starting | Storefront ops / onboarding |
| `boomer-angs-aiplugs-loading.png` | Boomer_Angs squad loading aiPLUGS containers, daylight | Fulfillment / commerce | Coastal Brewing storefront / order-tracking |

### 1C. Coastal Brewing logo (`coastal-brewing/web/public/coastal-logo.png`)

Flying coastal bird in vintage etching style on aged paper. **Tan/cream + dark sepia-ink** — a different brand entirely from Chicken Hawk. Coastal stays in the AIMS-Light theme. This document does not redesign Coastal.

---

## 2. Palette — Chicken Hawk

```css
/* Chicken Hawk surfaces — dark canvas, glass shelves, neon accents */
:root {
  /* Surfaces */
  --ch-bg:           #0A0A0A;          /* page background — deep black */
  --ch-surface:      #141414;          /* card / shelf base */
  --ch-surface-2:    #1F1F1F;          /* raised / hover */
  --ch-surface-glass: rgba(255,255,255,0.04); /* acrylic shelf */
  --ch-border:       rgba(255,255,255,0.08);
  --ch-border-hi:    rgba(255,255,255,0.18);

  /* Text */
  --ch-text:         #FFFFFF;
  --ch-text-soft:    #D1D5DB;
  --ch-text-muted:   #94A3B8;
  --ch-text-dim:     #64748B;

  /* Accents — neon (each carries semantic weight) */
  --ch-deploy-green: #5DFF40;          /* DEPLOY word, primary CTA, "go" */
  --ch-deploy-orange:#FF6500;          /* AUTOMATION word, file/document, attention */
  --ch-acheevy-yellow:#FACC15;         /* A.I.M.S. branding, ownership / executive */
  --ch-cyan:         #22D3EE;          /* general-use tier, info, blue armor */
  --ch-gold:         #D4AF37;          /* premium tier / earned / regal */
  --ch-magenta:      #EC4899;          /* alert, exception path */
  --ch-red:          #EF4444;          /* deny, defense-grade, refuse */

  /* Tints (for backgrounds when accent is on a card) */
  --ch-deploy-green-tint: rgba(93,255,64,0.10);
  --ch-deploy-orange-tint: rgba(255,101,0,0.10);
  --ch-cyan-tint: rgba(34,211,238,0.10);
  --ch-gold-tint: rgba(212,175,55,0.12);

  /* Glow / shadow */
  --ch-glow-green:   0 0 24px rgba(93,255,64,0.45), 0 0 4px rgba(93,255,64,0.7);
  --ch-glow-orange:  0 0 24px rgba(255,101,0,0.45), 0 0 4px rgba(255,101,0,0.7);
  --ch-glow-cyan:    0 0 24px rgba(34,211,238,0.45), 0 0 4px rgba(34,211,238,0.7);
  --ch-shelf-light:  0 -1px 0 rgba(255,255,255,0.30) inset, 0 1px 0 rgba(255,255,255,0.10) inset;
}
```

### Color semantics (load-bearing — don't violate)

| Color | Use for | Don't use for |
|---|---|---|
| `--ch-deploy-green` | "DEPLOY" word, primary CTA, "ship it / go", success states | Errors, denials, neutral text |
| `--ch-deploy-orange` | "AUTOMATION" word, file/document icons, "ATTENTION", working states | Success confirmations |
| `--ch-acheevy-yellow` | A.I.M.S. brand, ownership / executive surfaces, owner-tier emphasis | Customer-tier (anonymous) |
| `--ch-cyan` | Info, general-use security tier, web fleet (Sqwaadrun blue armor) | "Action required" |
| `--ch-gold` | Earned / leveled / premium tier (Boomer_Ang awards, gold mech) | Casual / day-to-day |
| `--ch-magenta` | Exceptions, escalations | Routine |
| `--ch-red` | Denials, defense-grade, refusals | Anything you want users to click |

Multi-color combos are intentional in the Combined Shelving reference — each plug has its own neon. **Don't mono-tone the platform**; let surfaces inherit accents from their semantic role.

---

## 3. Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Permanent+Marker&display=swap');
/* Geist Sans loaded via next/font already; JetBrains Mono via next/font also. */

:root {
  --ch-font-marker: 'Permanent Marker', 'Caveat', cursive;
  --ch-font-sans:   var(--font-geist-sans), 'Inter', ui-sans-serif, system-ui, sans-serif;
  --ch-font-mono:   var(--font-geist-mono), 'JetBrains Mono', ui-monospace, monospace;
}

/* The brand-words pattern — "DEPLOY", "AUTOMATION" highlighted */
.ch-brand-word {
  font-family: var(--ch-font-marker);
  font-weight: 400;
  letter-spacing: 0.01em;
  text-transform: none;
  display: inline-block;
  transform: rotate(-1.5deg); /* hand-painted feel */
}
.ch-brand-word--deploy     { color: var(--ch-deploy-green);  text-shadow: var(--ch-glow-green); }
.ch-brand-word--automation { color: var(--ch-deploy-orange); text-shadow: var(--ch-glow-orange); }
.ch-brand-word--aims       { color: var(--ch-acheevy-yellow); }

/* Headlines */
.ch-h1 { font-family: var(--ch-font-sans); font-weight: 800; font-size: clamp(2.5rem, 5vw, 4.25rem); line-height: 1.05; letter-spacing: -0.025em; color: var(--ch-text); }
.ch-h2 { font-family: var(--ch-font-sans); font-weight: 700; font-size: clamp(1.75rem, 3vw, 2.5rem); line-height: 1.1; letter-spacing: -0.02em; color: var(--ch-text); }
.ch-eyebrow { font-family: var(--ch-font-mono); font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--ch-text-muted); }
```

### When to use Permanent Marker (verbatim rule)

ONLY on the literal words **DEPLOY** and **AUTOMATION** (and brand-equivalent words like **A.I.M.S.** in green/yellow contexts). Body copy is always Geist Sans. Code, IDs, technical text always Geist Mono. **Permanent Marker is a highlight, not a body font.**

---

## 4. Component patterns

### 4.1 Glass shelf (the foundational primitive)

```tsx
<div className="ch-shelf">
  <div className="ch-shelf-light-top" />
  <div className="ch-shelf-content">{children}</div>
  <div className="ch-shelf-light-bottom" />
</div>
```

```css
.ch-shelf {
  position: relative;
  background: var(--ch-surface-glass);
  border: 1px solid var(--ch-border);
  border-radius: 6px;
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}
.ch-shelf-light-top, .ch-shelf-light-bottom {
  position: absolute; left: 16px; right: 16px; height: 2px;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.65), transparent);
  filter: blur(0.5px);
}
.ch-shelf-light-top    { top: -1px; }
.ch-shelf-light-bottom { bottom: -1px; }
```

Use for: product cards (Coastal storefront via aiPLUG metaphor), Lil_Hawk roster cards, Tool Chest panels, settings.

### 4.2 Neon plug card (security tier reference)

Each tier-card has a colored padlock + corresponding neon trim:

```tsx
<div className="ch-plug" data-tier="general">
  <div className="ch-plug-prong" />        {/* the white plug-prong at top */}
  <div className="ch-plug-icon">{icon}</div>
  <h3 className="ch-plug-title">{title}</h3>
  <ul className="ch-plug-bullets">{bullets}</ul>
  <button className="ch-plug-select">Select</button>
</div>
```

`data-tier` drives color: `general | sensitive | heavy | regulated | top-tier | defense-grade | strictest | bmc`.

### 4.3 Brand-word headline pattern

```tsx
<h1 className="ch-h1">
  Hey, I&apos;m <span className="ch-brand-word ch-brand-word--deploy">Chicken Hawk</span>.
  <br />
  My goal is to help you accomplish your{' '}
  <span className="ch-brand-word ch-brand-word--automation">Automation</span> needs.
</h1>
```

### 4.4 CTA buttons

```css
.ch-btn-primary {
  background: var(--ch-deploy-green); color: #0A0A0A;
  font-weight: 700; padding: 0.625rem 1.25rem; border-radius: 6px;
  box-shadow: 0 0 0 1px rgba(93,255,64,0.4), 0 0 24px rgba(93,255,64,0.30);
  transition: transform .15s, box-shadow .15s;
}
.ch-btn-primary:hover { transform: translateY(-1px); box-shadow: var(--ch-glow-green); }

.ch-btn-secondary {
  background: transparent; color: var(--ch-text);
  border: 1px solid var(--ch-border-hi);
  padding: 0.625rem 1.25rem; border-radius: 6px;
}
.ch-btn-secondary:hover { border-color: var(--ch-deploy-green); color: var(--ch-deploy-green); }
```

### 4.5 Background — port grid + dot mesh

```css
body.ch-theme {
  background: var(--ch-bg);
  background-image:
    linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(255,255,255,0.04) 1px, transparent 1px),
    radial-gradient(circle at 50% 30%, rgba(93,255,64,0.05), transparent 60%);
  background-size: 80px 80px, 80px 80px, 100% 100%;
}
```

Subtle. Should never compete with content.

### 4.6 Status dots (from Document Flow reference)

Three-dot row in card top-right, traffic-light style:

```tsx
<span className="ch-status-dots">
  <span className="ch-dot ch-dot--ok" />     {/* green */}
  <span className="ch-dot ch-dot--warn" />   {/* orange */}
  <span className="ch-dot ch-dot--err" />    {/* red */}
</span>
```

### 4.7 Connector glows (from Document Flow reference)

When showing a workflow / lineage, use thin white SVG paths with green-glow nodes at terminations.

---

## 5. Page-by-page redesign plan

### 5.1 `/` (Home + chat-as-hero) — **the centerpiece**

**Current:** AIMS-Light, Inter, hero on left + HeroChatDemo on right, REAL chat below the fold.
**Target:** Dark CH theme, chat IS the hero, character art behind, agentic streaming UI front-and-center.

**Layout:**
```
┌─────────────────────────────────────────────────────────┐
│  [logo] Chicken Hawk    Home | Hawks | Sqwaadrun | …  [Sign in / Tool Chest] │  ← header
├─────────────────────────────────────────────────────────┤
│                                                         │
│   <ch-eyebrow>OPERATOR · LIVE</ch-eyebrow>              │
│   Hey, I'm <DEPLOY-style>Chicken Hawk</DEPLOY-style>.   │
│   My goal is to help you accomplish your               │
│   <AUTOMATION-style>Automation</AUTOMATION-style> needs.│
│                                                         │
│   ┌────────────────────────────────────────────────┐   │
│   │  Chat panel — streaming + reasoning window     │   │
│   │  ──────────────────────────────────────        │   │
│   │  [agent thinking trace, collapsible]           │   │
│   │  [streaming token reply]                       │   │
│   │  [input box]                                   │   │
│   └────────────────────────────────────────────────┘   │
│                                                         │
│   [character art: ch-mech-port-orange.png — full-bleed │
│    behind chat panel, 25% opacity, parallax slow]      │
│                                                         │
├─────────────────────────────────────────────────────────┤
│   Below-fold: 3 plug cards (security tiers reference)   │
│   Below: Lil_Hawks teaser (3 of 11)                    │
│   Below: Sqwaadrun teaser                              │
└─────────────────────────────────────────────────────────┘
```

**Chat opening message (verbatim per owner directive 2026-04-28):**

> Hey, I'm Chicken Hawk. My goal is to help you accomplish your **Automation** needs, so what will we **Deploy** today?
>
> What's your name? Let's start with a brief intro — I want to know what you need from me and what goals you have in mind.

(The words `Automation` and `Deploy` highlighted via the brand-word pattern.)

**The "agentic streaming/thinking/reasoning window":**
- Token-by-token streaming (SSE from gateway, currently buffered → must add `stream=true`)
- A collapsible reasoning trace ("Show thinking") that streams the model's chain-of-thought when present
- A "tools / dispatch" trace strip that shows when CH dispatches to a Lil_Hawk specialist (we already have `DispatchTrace`; integrate it into the streaming view)
- 21st.dev component pull (via `mcp__magic__21st_magic_component_builder`) — search for "agentic chat with reasoning window" / "streaming chat with thinking trace" and adopt the strongest match. CALCULATED BET: their library has at least one strong agentic-chat pattern; if none match, build bespoke using the patterns above.

### 5.2 `/lil-hawks` — eleven specialists

- Hero image: `ch-squad-port-night.png` (CH + 2 Lil_Hawks)
- Below: 3-col grid of 11 plug cards (one per Lil_Hawk), each with the security-tier neon-trim pattern keyed to the hawk's specialty
- Each card opens to a detail drawer with: bio, sample tasks, dispatch-now button (deeplink to `/?prompt=Lil_<X>_Hawk: …`)

### 5.3 `/sqwaadrun` — web-intelligence fleet

- Hero image: `ch-mech-blue-rain.png` (cyan/blue armor)
- Layout: existing 17-card 3D-tilt gallery, restyled to the dark CH theme + cyan accents
- Each card: glass shelf with cyan neon trim

### 5.4 `/about` — leadership story

- Hero image: `ch-mech-gold-rank.png` (gold-armor + Lil_Hawk drones)
- Sections: "How CH operates" (org chart from `aims-org-chart-deploy-dock.png` rendered as a clickable diagram), "What we ship" (3 cards: Deploy / Automation / Squad), "Where we go next"

### 5.5 `/login` — owner-only sign-in

- Hero image: `aims-acheevy-office.png` (ACHEEVY in penthouse, aiPLUG cube glowing)
- Existing 6-digit code flow (already working)
- Theme: dark CH instead of current AIMS-Light
- Greeting: "Welcome to the office. Sign in." with Permanent Marker accent on "office"

### 5.6 `/me` — post-login owner page

- Background image: `aims-acheevy-office.png` (subtle, 18% opacity)
- Card: "Signed in as <email>. Session active for 24h." + "Open the Tool Chest" CTA + Sign out
- Theme: dark CH

### 5.7 `/tools` — owner Tool Chest

- Hero image: `aims-org-chart-deploy-dock.png` (org chart with Acheevy/Juno_Ang/Forge_Ang/Betty-Ann_Ang/Lil_Hawks)
- Existing panel grid (Tuning Loop, Policy Gate, Agent Runtime, Lil_Hawks, Scheduled Jobs, Audit Chain, Dispatch) re-skinned to dark CH theme + plug-card pattern

### 5.8 `/tools/lil-hawks` — owner roster

- Reference image: `aims-org-chart-style-alignment.png` (Acheevy / Boomer_Angs / Chicken_Hawk / Lil-Hawks tile reference)
- 11-card detailed roster with avatars, role, status, last dispatch, queue depth

### 5.9 `/not-found` — playful 404

- Image: `ch-pixel-evolution.jpg` (chick → adult → mega) as the visual; copy: "This route hasn't evolved yet."

### 5.10 Coastal Brewing Co. — separate Layer 2 entity, NOT a CH child

Per `reference_foai_ecosystem_hierarchy_canon.md` and §0 above: Coastal is its own autonomous company in the FOAI ecosystem. Chicken Hawk is one of several AI team members that **operate** Coastal — alongside ACHEEVY (CEO), Boomer_Angs (department heads), Lil_Hawks (task workers), Hermes (runtime), Autoresearch (tuning loop), Claude Managed Agents, etc.

Concretely:

| | Chicken Hawk | Coastal Brewing Co. |
|---|---|---|
| **Layer** | 1 (AI team — staff) | 2 (autonomous company) |
| **Domain** | `hawk.foai.cloud` | `brewing.foai.cloud` |
| **Audience** | Owner + operators | Coffee/tea customers |
| **Brand mark** | Chicken Hawk character art | Coastal Brewing wordmark + flying coastal bird |
| **Theme** | Dark + neon-marker (this doc) | AIMS-Light + sepia/cream + amber-600 |
| **Tagline domain** | "Operations 2IC for the AI team" | "Coastal coffee, owner-approved every order" |
| **Relationship** | CH staffs Coastal (along with the rest of the AI team) | Coastal is one of many companies CH may staff |

**This document does not redesign Coastal.** Coastal's brand belongs to Coastal. The two surfaces share infrastructure (runner backend, NemoClaw policy gate, AuditLedger, SMTP transport) but not visual identity.

The Deploy Platform tagline "**Build a Company. Without the Company.**" frames the entire offering — Coastal is the proof that this works. Future autonomous companies will each have their own brand, deployed via the Deploy Platform kit, staffed by the same AI team (or a subset, depending on the kit tier). CH's design must scale to staff many such companies without imprinting on any one of them.

---

## 6. Migration plan — 6 phases

Each phase ships independently, all reversible.

### Phase 1 — Foundation (~2 hr)
- Add Permanent Marker font via `next/font/google`
- Add CH theme tokens to `globals.css` under a `[data-theme="chicken-hawk"]` selector (don't replace AIMS-Light yet)
- Add `<ChBrandWord>` component for the DEPLOY / AUTOMATION pattern
- Add a `data-theme="chicken-hawk"` switch in `<html>` for hawk-ui pages (Coastal-web stays untouched)

**Verification:** dev page renders dark + Permanent Marker headline + green/orange brand words.

### Phase 2 — Header / nav
- Replace MenuNav background with dark CH (already split into auth-aware server + client this session)
- Sign in / Sign out / Tool Chest buttons with neon-tinted hover

**Verification:** all 7 routes render the new header; Sign in/out toggle works.

### Phase 3 — Hero rewrite (`/`)
- Place chat panel IN the hero (replace current 6-col / 6-col split)
- Add character art `ch-mech-port-orange.png` as full-bleed background, 25% opacity, no parallax in v1
- Update opening message + brand-word treatment
- Keep DispatchTrace + MarkdownReply

**Verification:** load `/` cold → see "Hey, I'm Chicken Hawk" with green Marker on "Chicken Hawk" + orange Marker on "Automation"; chat works end-to-end against Nemotron.

### Phase 4 — Streaming + reasoning window
- Gateway: enable `stream=true` on `/api/public/chat` (LiteLLM supports SSE pass-through for OpenAI-compatible streaming)
- Frontend: 21st.dev MCP search for an agentic streaming chat with reasoning panel; adopt or fall back to bespoke
- Add reasoning toggle ("Show thinking") that displays chain-of-thought when model emits one (Nemotron + Kimi K2 thinking variants both emit reasoning)

**Verification:** type a prompt → tokens stream in; click "Show thinking" → reasoning trace expands.

### Phase 5 — Page art + section restyling (parallel)
- `/lil-hawks`: `ch-squad-port-night.png` hero + 11-card plug grid
- `/sqwaadrun`: `ch-mech-blue-rain.png` hero + cyan tilt cards
- `/about`: `ch-mech-gold-rank.png` hero + org-chart embed
- `/tools`: `aims-org-chart-deploy-dock.png` hero + plug-card panels

**Verification:** click through each route → visuals match the spec; no layout regressions.

### Phase 6 — Polish + ship
- 21st.dev MCP for any final component upgrades
- Reduced-motion guards on parallax / glow animations
- a11y axe pass
- Lighthouse mobile + perf (target Perf ≥ 80, A11y ≥ 95)

**Verification:** ship contract clears (per `aims-build-control-pack` 8 ship gates).

---

## 7. Asset manifest

All in `hawk-ui/public/chicken-hawk/`:

| File | Bytes | Page |
|---|---|---|
| `ch-mech-port-orange.png` | 105 KB | `/` hero (primary) |
| `ch-mech-blue-rain.png` | 103 KB | `/sqwaadrun` |
| `ch-mech-gold-rank.png` | 107 KB | `/about` |
| `ch-squad-port-night.png` | 1.9 MB | `/lil-hawks` |
| `ch-pixel-evolution.jpg` | 306 KB | `/not-found` |
| `aims-acheevy-squad-port.png` | 3.9 MB | `/about` story / "ecosystem at scale" |
| `aims-acheevy-office.png` | 2.0 MB | `/login`, `/me` |
| `aims-showroom.png` | 468 KB | partner / pricing |
| `aims-org-chart-deploy-dock.png` | 2.4 MB | `/tools` |
| `aims-org-chart-style-alignment.png` | 2.4 MB | `/tools/lil-hawks` |
| `boomer-angs-port-sunrise.jpg` | 69 KB | onboarding |
| `boomer-angs-aiplugs-loading.png` | 1.3 MB | Coastal-aware ops view (cross-reference) |

CALCULATED BET on the 1.9–3.9 MB images: I'll generate optimized variants (1200w + 800w WebP) before Phase 3 ships so we're not pushing 4MB hero images to mobile. Owner can override if they want pristine PNGs everywhere.

---

## 8. What this document does NOT decide

Surfacing for owner before any code:

1. **The exact chat opening message** — I quoted yours verbatim. Edit if you want tighter/looser.
2. **Whether to keep the `:dark`/`:light` AIMS-Light theme available behind a query param** for accessibility / preference — default = full CH dark.
3. **The 21st.dev component to adopt for the streaming chat** — I'll search via MCP and bring back 1–3 options before wiring.
4. **Coastal Brewing's relationship to this redesign** — explicitly unchanged in this doc; if you want Coastal to share CH's idiom, that's a separate spec.
5. **The 11 Lil_Hawk per-hawk colors** — each Lil_Hawk's neon-tier color (which one is green, which orange, etc.). Suggested mapping below; finalize on review:

| Lil_Hawk | Specialty | Proposed accent |
|---|---|---|
| Lil_TRAE_Hawk | Heavy refactors | red (defense-grade) |
| Lil_Coding_Hawk | Plan-first features | green (deploy) |
| Lil_Agent_Hawk | OS / browser / CLI | orange (automation) |
| Lil_Flow_Hawk | SaaS automation | green |
| Lil_Sand_Hawk | Safe execution | cyan (general / contained) |
| Lil_Memory_Hawk | Long-term memory | gold |
| Lil_Graph_Hawk | Stateful workflows | magenta |
| Lil_Back_Hawk | Backend scaffolding | cyan |
| Lil_Viz_Hawk | Monitoring | yellow (Acheevy) |
| Lil_Blend_Hawk | 3D + visual | gold |
| Lil_Deep_Hawk | Squad mode | white (rare / special) |

---

## 9. Anti-slop guardrails (from `aims-unified-skill`)

Won't do:
- ❌ Generic purple-blue AI gradient backgrounds (this is dark + multi-neon, NOT purple-blue)
- ❌ Identical icon-in-circle feature cards (each card carries a different neon trim per its semantic role)
- ❌ Forced glass panels everywhere (we use glass DELIBERATELY for shelves; not as decoration)
- ❌ Random abstract blobs as decoration (background is grid + dot mesh + faint radial — anchored, not arbitrary)
- ❌ Generic centered marketing-page sameness (chat-as-hero breaks that pattern)
- ❌ Permanent Marker on body text (highlight only, never paragraph)

Will do:
- ✓ Brand-word highlight pattern (DEPLOY green, AUTOMATION orange) on every page they appear
- ✓ Color-as-semantic (tier, role, status — never decorative)
- ✓ Character art as scene-specific (each of 12 has its assigned page)
- ✓ Glass shelf as the foundational primitive
- ✓ White line-art over color (per Document Flow + Combined Shelving references)

---

## 11. Video pipeline — application of existing canon, with Remotion elevated to SME

**Owner directive 2026-04-29:** *"Iller_Ang must be a SME on Remotion."* Updated `~/.claude/skills/iller-ang/SKILL.md` accordingly. The video pipeline canon below is the **CH-platform application** of pre-existing Iller_Ang and FOAI canon, NOT fresh strategy.

### Source canon (read first)

- **`~/.claude/skills/iller-ang/references/seedance-video.md`** — Seedance 2.0 API, polling, scene-batching, **rendering path decisions (FFmpeg vs. Remotion vs. TopView)**. Already documents Remotion as a path; the elevation 2026-04-29 makes it canonical for CH-platform compositing.
- **`~/.claude/projects/.../memory/reference_video_pipeline_strategy.md`** — Per|Form reference-based pipeline canon: Brave/YouTube search → reference video + image → Seedance/Kling generate. **The "always use a reference" rule applies here too.**
- **`~/.claude/projects/.../memory/feedback_seedance_workflow.md`** — Seedance cost optimization: provide reference video AND image to reduce credit burn.
- **`~/.claude/projects/.../memory/project_seedance_byteplus_direct_canonical.md`** — Seedance routing canon.
- **`~/.claude/projects/.../memory/project_agent_video_system.md`** — Agent video system context.
- **`~/.claude/skills/iller-ang/references/motion-prompts.md`** — motion prompt patterns.
- **`~/.claude/skills/iller-ang/references/cinematic-ui-discipline.md`** — cinematic discipline rules.

### The CH-platform pipeline (5 steps, includes Brave-reference per existing cost canon)

```
┌────────────┐  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  ┌─────────────┐
│  Step 0    │  │   Step 1    │  │    Step 2    │  │   Step 3    │  │   Step 4    │
│            │  │             │  │              │  │             │  │             │
│  Brave/YT  │→ │  GPT Image  │→ │  Seedance    │→ │   FFmpeg    │→ │  Remotion   │
│ reference  │  │    2.0      │  │     2.0      │  │  4K upscale │  │  compose +  │
│  search    │  │ (seed frame)│  │  (i2v motion │  │ + audio     │  │     ship    │
│ + key frame│  │             │  │  with refs)  │  │             │  │             │
└────────────┘  └─────────────┘  └──────────────┘  └─────────────┘  └─────────────┘
```

**Step 0 was always part of canon** (per `feedback_seedance_workflow.md` and `reference_video_pipeline_strategy.md`) — I just collapsed it earlier. Restoring it: every CH-platform video starts with a Brave/YouTube search for a reference video that matches the desired motion, and a key frame extracted from that reference. Both are passed to Seedance to reduce credit burn AND improve consistency.

| Step | Owner | Tool | Output |
|---|---|---|---|
| 0 — Reference (canon: cost optimization) | Iller_Ang | Brave Video Search API (or YouTube via Vertex AI) | reference video URL + extracted key frame |
| 1 — Seed frame | Iller_Ang | GPT Image 2.0 (default), Recraft V4 or Ideogram 3.0 when stylized | 1-N source frames @ 1080p or 1024² |
| 2 — Motion | Iller_Ang | Seedance 2.0 i2v with `reference_video_urls` + `first_frame_url` | 5–10 sec motion clip @ native 1080p |
| 3 — Upscale + audio | Iller_Ang | FFmpeg 7.x lanczos + loudnorm | 3840×2160 ProRes 422 HQ master |
| 4 — Composite + ship | **Iller_Ang on Remotion 4.x** | React/TS programmatic video | `.mp4` H.264 (web) or `.webm` VP9 (hero bg) |

**Why Remotion is the SME-owned compositor:** every brand-title, end card, transition, lower-third, caption, and music-sync becomes a Git-versioned React component. Re-renderable, deterministic, A/B-testable. Required for the 100+ short videos across CH pages, Lil_Hawks, autonomous companies, and Boomer_Angs that the platform needs.

**Project layout** (one Remotion project shared across all hawk.foai.cloud videos):

```
hawk-ui/remotion/
├── remotion.config.ts
├── src/
│   ├── Root.tsx                       # registers all compositions
│   ├── compositions/
│   │   ├── ChickenHawkHero.tsx        # /  hero
│   │   ├── LilHawksFormation.tsx      # /lil-hawks
│   │   ├── SqwaadrunFleetTakeoff.tsx  # /sqwaadrun
│   │   ├── AboutLeadership.tsx        # /about
│   │   ├── LoginWelcome.tsx           # /login + /me
│   │   ├── ToolsRevealOrgChart.tsx    # /tools
│   │   ├── PixelEvolution.tsx         # /not-found
│   │   └── DeployTagline.tsx          # marketing — Build a Company. Without the Company.
│   ├── components/
│   │   ├── BrandWord.tsx              # DEPLOY / AUTOMATION marker pattern (rotation, glow, color)
│   │   ├── EndCard.tsx                # canonical CH end card (logo + URL + tagline)
│   │   ├── LowerThird.tsx
│   │   └── HawkCallout.tsx            # for naming a Lil_Hawk in-frame
│   ├── audio/                         # source music + Gemini TTS narration mp3s
│   └── styles/
│       └── tokens.ts                  # imports CH theme tokens from hawk-ui/lib
└── public/
    └── seed/                          # ffmpeg-upscaled clips from Step 3 land here, one per composition
```

`npx remotion render` for local. `npx remotion lambda render` for parallel batch on AWS when shipping all 11 Lil_Hawk videos at once.

---

## 12. Per-page video scripts (Iller_Ang to produce; here are the scripts)

Each video is **8–15 seconds**, vertical and horizontal cuts, no narration unless noted (most run silent with brand-word kinetic type + ambient port soundscape so they can autoplay muted on mobile per HTML5 video best practices). Captions burned-in via Remotion for accessibility.

### 12.1 `/` HERO — `ChickenHawkHero.tsx` — 12 seconds

**Source frame (Step 1, GPT Image 2.0 prompt):**
> *"Cinematic wide shot of armored mecha-falcon character (Chicken Hawk identity), standing center frame on a rain-slicked container port at dusk, neon orange and amber holographic interface floating from his right hand. Tactical mech armor with black plate + amber piping. Sharp realistic detail. Container yard background blurred with bokeh neon (orange + cyan + magenta dock signage). Aspect 16:9, 4K, photorealistic, no text in frame."*

**Motion (Step 2, Seedance 2.0 i2v):** 8 seconds, slow push-in from medium-wide to medium close-up, rain falling, holographic interface icons rotate slowly clockwise. Subject 100% preserved.

**Composition (Step 4, Remotion):**
- Frames 0–60 (0–2 s): Seed frame static, faint vignette grows
- Frames 60–180 (2–6 s): Seedance motion plays in main panel; bottom-third pops in:
  > **HEY — I'M [CHICKEN HAWK].**
  > [CHICKEN HAWK] in green Permanent Marker, 2° rotation
- Frames 180–300 (6–10 s): Cut to brand-word headline, full screen:
  > **HELP YOU DEPLOY**
  > **YOUR AUTOMATION**
  > [DEPLOY] green Marker, [AUTOMATION] orange Marker, both rotated 2°, kinetic type stagger 0.15s per word
- Frames 300–360 (10–12 s): End card — Chicken Hawk silhouette mark + `hawk.foai.cloud` + tagline *Plug in. Get to work.*
- Audio: ambient port + light rain (royalty-free), 6dB duck under brand-word reveal

### 12.2 `/lil-hawks` — `LilHawksFormation.tsx` — 14 seconds

**Source frame (Step 1):**
> *"Wide shot of three armored mecha-falcons in formation on a container port at night — one mid-tier blue armor (Chicken Hawk lead), two smaller specialists in matte gray-with-amber-trim armor (Lil_Hawks). Stylized like a tactical squad photo. Rain-wet pavement reflecting neon. Aspect 16:9, 4K, photorealistic."*

**Motion:** 10 seconds, squad walks toward camera in slow-mo, holographic dispatch markers ping above each Lil_Hawk's shoulder showing their specialty (TRAE, Coding, Agent…).

**Remotion composition:**
- 0–3 s: motion clip plays
- 3–6 s: 11 callouts cycle in a vertical strip on the right, each Lil_Hawk's name glowing in its tier-color (per §8 mapping):
  - Lil_TRAE_Hawk · red · Heavy refactors
  - Lil_Coding_Hawk · green · Plan-first features
  - Lil_Agent_Hawk · orange · OS / browser / CLI
  - …all 11
- 6–11 s: cut to grid of 11 character chips with their colors
- 11–14 s: brand-word card — *ELEVEN SPECIALISTS, ONE [SQUAD].* with [SQUAD] in green Marker
- End card

### 12.3 `/sqwaadrun` — `SqwaadrunFleetTakeoff.tsx` — 10 seconds

**Source frame (Step 1):**
> *"Cyberpunk container yard at night in heavy rain. Cyan/blue armor mecha-falcon (Chicken Hawk in scout config) crouched on top of a shipping container, wings half-deployed. Aspect 16:9, 4K, photorealistic."*

**Motion:** Wings deploy, takeoff into rain — Seedance generates 8s of dynamic launch.

**Remotion:**
- 0–3 s: takeoff motion
- 3–6 s: 17 hawk silhouettes streak across frame in formation (Sqwaadrun roster)
- 6–9 s: brand-word *17 HAWKS. ONE [FLEET].* — [FLEET] cyan Marker
- 9–10 s: end card

### 12.4 `/about` — `AboutLeadership.tsx` — 15 seconds

**Source frame (Step 1):**
> *"Heroic three-quarter shot, mecha-falcon Chicken Hawk in full gold-trimmed black armor, wings fully extended, holographic rank UI floating beside head. Two small Lil_Hawk drones perched on shoulder pauldrons. Container port background, dawn light, cinematic. 4K, photorealistic."*

**Motion:** 10 sec slow heroic reveal (camera arcs around subject), drones light up.

**Remotion:**
- 0–4 s: heroic motion
- 4–9 s: timeline lower-third — *Built to ship. Not to demo.*
- 9–13 s: brand-word block — *WE [DEPLOY]. WE [AUTOMATE]. WE [SHIP].*
- 13–15 s: end card

### 12.5 `/login` + `/me` — `LoginWelcome.tsx` — 8 seconds

**Source frame (Step 1):**
> *"Modern penthouse office overlooking a city at dusk. ACHEEVY character (mid-tier digital CEO, helmet with amber visor, tan jacket) standing beside a glass cube glowing cyan with a plug-icon hologram. Camo cargo pants, brand-mark backdrop. 16:9, 4K, photorealistic."*

**Motion:** ACHEEVY turns toward camera, glass cube pulses, brand-mark wall highlight slides in.

**Remotion:**
- 0–3 s: motion plays
- 3–6 s: copy fades in: *Welcome to the [OFFICE].* — [OFFICE] amber Marker
- 6–8 s: end card with sign-in CTA pulse

### 12.6 `/tools` — `ToolsRevealOrgChart.tsx` — 12 seconds

**Source frame (Step 1):** the existing `aims-org-chart-deploy-dock.png` is the seed; Seedance i2v adds particle drift and connector pulses.

**Motion:** 8 seconds, org chart connectors pulse with green/amber light from ACHEEVY → Juno_Ang/Forge_Ang/Betty-Ann_Ang → Lil_Hawks.

**Remotion:**
- 0–3 s: connector light rays
- 3–7 s: panel labels reveal in sequence (Policy Gate · Tuning Loop · Agent Runtime · Lil_Hawks · Schedules · Audit · Dispatch)
- 7–10 s: brand-word *YOUR [DEPLOY] DOCK.*
- 10–12 s: end card

### 12.7 `/not-found` — `PixelEvolution.tsx` — 6 seconds

**Source frame (Step 1):** the existing `ch-pixel-evolution.jpg` (chick → adult → mega).

**Motion:** Stage-by-stage evolution, low-fi pixel-art animation (Remotion does this directly with `<Sequence>` swaps — no Seedance step needed).

**Remotion:**
- 0–2 s: chick stage
- 2–4 s: adult stage
- 4–6 s: mega stage with text *THIS ROUTE HASN'T EVOLVED YET. GO HOME.*

### 12.8 Marketing — Deploy Platform tagline — `DeployTagline.tsx` — 10 seconds

For Layer-3 Deploy Platform marketing (lives outside hawk-ui but uses the same Remotion project).

**Source frame (Step 1):**
> *"Wide aerial shot of a futuristic AIMS port — gold-glowing cargo containers, AIMS-branded transport ships, drones, golden sunset light. No people in shot."*

**Motion:** 6-second slow aerial drift, drones launch.

**Remotion:**
- 0–3 s: aerial motion
- 3–7 s: Big-text reveal — *BUILD A [COMPANY].*  ↪ pause ↪ *WITHOUT THE [COMPANY].* (kinetic stagger)
- 7–10 s: end card with `deploy.foai.cloud`

---

## 13. Video shipping rules (the 4-step is non-negotiable)

- **Don't skip Step 4 Remotion** if the video has any title, end card, or brand-word treatment. Pure motion-only clips can stop at Step 3.
- **Don't introduce Topaz / Real-ESRGAN / Pika / Runway** without a benchmarked override + owner sign-off.
- **Hero videos autoplay muted on mobile** — design the visual story to read without sound.
- **Burn captions** for any narration via Remotion's `<Subtitle>` primitive (a11y).
- **End card is canonical** — `<EndCard />` component in Remotion holds CH logo, URL, tagline. Don't free-style end cards.
- **Iller_Ang reviews every cut** before it ships — see iller-ang/SKILL.md QC checklist.

---

## 10. Open decision points (need owner answer before Phase 3)

1. **Confirm or rewrite the chat opening message** — I have your first-draft verbatim above; review.
2. **Approve the 11-Lil_Hawk color map** in §8 (or override per-hawk)
3. **Coastal-web stays in AIMS-Light?** (default yes, this doc assumes so)
4. **Image optimization in Phase 3** (default yes — I'll generate WebP variants; override if you want PNGs preserved as-is)
5. **`hawk.foai.cloud/` chat default model** — confirmed `nemotron-super` for testing; production target `kimi-k2-6` (already wired)

When you're ready, reply "ship" and I start Phase 1 (foundation — non-breaking, lays the tokens + Permanent Marker font + ChBrandWord component).

---

**End of CHICKEN_HAWK_DESIGN.md**
