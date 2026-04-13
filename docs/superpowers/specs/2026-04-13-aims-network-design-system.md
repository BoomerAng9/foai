# A.I.M.S. Network Design System

> **AI Managed Solutions** — the ecosystem. Port infrastructure, shipping containers, automated services.

## The Network Model

Like ESPN/Fox Sports — one parent brand (A.I.M.S.), distinct show brands. Each product has its own color identity but shares typography, spacing grammar, and the Boomer_Ang bug.

**Publisher credit:** "PUBLISHED BY ACHIEVEMOR" (footer, not brand)

## Product Registry

| Product | Domain | Hero Color | Hex | Role |
|---------|--------|-----------|-----|------|
| Deploy Platform | deploy.foai.cloud | Cyan | `#22D3EE` | Customer-facing studio |
| Per\|Form | perform.foai.cloud | Gold | `#D4A853` | Sports intelligence broadcast |
| CTI Hub | cti.foai.cloud | Amber | `#E8A020` | Owner command center (Rish only) |
| Sqwaadrun | sqwaadrun.foai.cloud | Warm Gold + Cyan | `#F5A623` / `#22D3EE` | Web intelligence fleet |
| Open\|Klass AI | ok.foai.cloud | Burnt Orange | `#F05A28` | Workforce training / education |
| Blockwise AI | blockwise.foai.cloud | TBD | TBD | Web3 / Polymarket |
| Destinations AI | destinations.foai.cloud | Sky Blue | `#0EA5E9` | Real estate / spatial reasoning |

### SmelterOS (OS Layer)

SmelterOS is the platform everything runs on. Connected to A.I.M.S. but operates at a different layer — infrastructure, not product. Own design language, own theme, own world.

- **Hero color:** System Green `#22C55E`
- **Brain:** AVVA NOON
- **Design:** OS chrome, terminal aesthetic, dark `#08080D`
- **NOT in the product row** — sits above/below as the runtime

## Shared A.I.M.S. DNA

Every product in the network inherits these tokens. No exceptions.

### Typography

| Role | Font | Weight | Usage |
|------|------|--------|-------|
| Headers | Outfit | 700-900 | Page titles, section headers |
| Body | Geist Sans | 400-600 | Paragraphs, descriptions |
| Labels / Tags | JetBrains Mono | 600 | Monospace labels, tracking-[0.25em], uppercase |
| Numerals / KPIs | JetBrains Mono | 700 | Tabular nums, counters |

### Spacing

- **Grid:** 4px base unit
- **Page padding:** `px-4` (mobile), `px-6` (tablet), `px-8` (desktop)
- **Section padding:** `py-16 md:py-24`
- **Card padding:** `p-5` (compact), `p-6` (standard), `p-8` (spacious)
- **Corners:** `rounded-md` everywhere (6px)

### Shared Components

| Component | Spec |
|-----------|------|
| **Loading screen** | Boomer_Ang spinner (boomerang rotation, 2s ease-in-out) |
| **Footer** | `PUBLISHED BY ACHIEVEMOR` · product name · `© 2026` |
| **Nav pattern** | Back arrow + Home icon + breadcrumb trail |
| **Label style** | `text-[10px] font-mono font-bold tracking-[0.25em] uppercase` |
| **Section header** | Label (muted) above, `text-3xl font-light` title with `font-bold` accent span |
| **CTA primary** | Hero color bg, `#000` text, `rounded-md`, `hover:brightness-110` |
| **CTA secondary** | Transparent bg, `1px solid border`, `rounded-md` |

### A.I.M.S. Visual Motifs

The port/container/longshoreman aesthetic. Use across all products at the infrastructure level:

- **Shipping container slats** as background patterns (subtle, 2-4% opacity)
- **Port crane silhouettes** for section dividers
- **Stencil typography** for hero moments (Outfit 900, tight tracking)
- **Container color coding** — each product is a different colored container in the fleet
- **Automated services** language in copy: "deploy", "ship", "dock", "fleet", "manifest", "cargo"

### Dark Mode

| Product | Default | Dark Mode BG | Light Mode BG |
|---------|---------|-------------|---------------|
| Per\|Form | Dark | `#0A0A0F` | N/A (always dark) |
| CTI Hub | Light | `#000000` (black, NOT navy) | `#FFFFFF` |
| Deploy Platform | Light | `#000000` | `#FFFFFF` |
| Sqwaadrun | Dark | `#050810` | N/A (always dark) |
| Open\|Klass AI | Dark | `#0E2531` | TBD |
| Destinations AI | Dark | `#050A12` | TBD |
| Blockwise AI | TBD | TBD | TBD |
| SmelterOS | Dark | `#08080D` | N/A (always dark) |

**Rule:** Dark mode = black `#000000`, never navy blue. Per memory: "the white is perfect, dark mode toggle which is black not Blue."

### What NOT to Share

| Element | Rule |
|---------|------|
| Hero color | NEVER bleed one product's hero into another |
| Background color | Each product owns its own bg |
| Brand imagery | Per\|Form lion ≠ CTI shield ≠ Sqwaadrun mech |
| Feature copy | Products describe themselves, not each other |
| Model names | NEVER in user-facing text (Sacred Separation) |

## Product-Specific Overrides

### Per|Form
- Broadcast-grade: scanlines, red accent `#D40028` for LIVE badges
- Lion logo hero
- NFL team color integration
- "BREAKING" news ticker

### CTI Hub (cti.foai.cloud)
- agenticUI.net white theme (light default)
- CTI shield logo (Coastal Talent & Innovation)
- Owner-only — no public access
- Circuit Box as settings hub

### Deploy Platform (deploy.foai.cloud)
- agenticUI.net white theme (light default)
- ACHEEVY hero character
- Public customer-facing
- Chat-first UX (Guide Me / Manage It)

### Sqwaadrun
- Navy port night sky `#050810`
- Chicken Hawk mech hero
- A.I.M.S. container motif heavy
- Chibi Lil_Hawks character cards

### Open|Klass AI
- Dark teal `#0E2531` bg
- Burnt orange `#F05A28` accent
- Teal secondary `#7CC5B3`
- Education/workforce training focus

### Destinations AI
- Near-black `#050A12` bg
- Sky blue `#0EA5E9` primary
- Indigo `#6366F1` secondary
- Map/spatial visualization motifs
- Space Grotesk headers

### Blockwise AI
- TBD — needs design pass
- Web3/crypto aesthetic expected

## Implementation Priority

1. **Already done:** Per|Form, CTI Hub, Sqwaadrun have distinct themes
2. **Next:** Deploy Platform needs its own landing (currently shares CTI Hub codebase, domain-based branding via middleware)
3. **After:** Open|Klass, Destinations, Blockwise design audits against this spec
4. **Ongoing:** Shared component library extraction (footer, nav, loading, labels)

---

*Open Mind Skill output — Network Model approach. A.I.M.S. ecosystem with shared grammar, distinct hero colors. SmelterOS at OS layer. Seven products under one port.*
