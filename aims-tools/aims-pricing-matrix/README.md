# @aims/pricing-matrix

Canonical pricing & catalog for the A.I.M.S. ecosystem.

## What this is

The single source of truth for pricing & catalog data across the
ACHIEVEMOR / A.I.M.S. ecosystem. Holds:

- **Models** (LLM, image, video, audio, tts, stt, embed, mcp)
- **Plans** (3-6-9 Tesla Vortex frequencies × V.I.B.E. groups)
- **Pillars** (Confidence / Convenience / Security stackable add-ons)
- **Bundles** (mix-and-match combinations)
- **Compliance tiers** (CMMC L1 → Sovereign Cloud)
- **Task multipliers** (1.0× - 3.5× per task type)
- **Workforce seed rows** (HIDT 2022 matrix data, sector='workforce')

## Why

Three places used to hold model rows independently:

1. `AIMS/backend/uef-gateway/src/llm/openrouter.ts` → `MODELS`
2. `AIMS/backend/uef-gateway/src/llm/vertex-ai.ts` → `VERTEX_MODELS`
3. `foai/SmelterOS/apps/web/src/lib/openrouter/client.ts` → `OPENROUTER_MODELS`

That meant adding GLM-5.1 required edits in three places, with no
guarantee they stayed in sync. This package replaces all three. Once
this PR lands, the existing files become thin adapters that re-export
from `@aims/pricing-matrix`.

## Schema shape — adopted from the 2022 HIDT Training Matrix

Multi-axis cross-tab (sector × topic × audience × level × cost) with
the same parser pattern Rish built originally for KSA Vision 2030
workforce training. The pattern survived because it was right.

Key columns:
- **Sector** — `llm | image | video | audio | tts | stt | embed | storage | compute | mcp | plan | pillar | compliance | workforce`
- **Tier** — `open-source | free | fast | standard | premium | flagship`
- **Capabilities** — `coding | long-horizon | reasoning | vision | function-calling | multimodal | realtime | streaming | tool-use | cloning | voice | agentic`
- **Frequency** — `3-month | 6-month | 9-month | ppu` (Tesla 3-6-9 vortex)
- **V.I.B.E. Group** — `individual | family | team | enterprise`
- **Multi-currency** — `USD | SAR | AED | QAR | OMR | GBP | EUR`
- **Three Pillars uplifts** — `confidenceUplift | convenienceUplift | securityUplift`
- **Competitive comparison** — competitor ref with name, price, source
- **Outcomes & takeaways** — what using this row enables

## Routing rules (per Rish 2026-04-08)

### General task routing
1. **Vertex AI Model Garden** first (vendorRank 1) — DoD-compliant path, native security
2. **Direct vendors** second (vendorRank 2) — Anthropic, OpenAI, Recraft, Ideogram, Gamma, Napkin, etc.
3. **OpenRouter** third (vendorRank 3) — supplements + free-tier models
4. **fal.ai / Kie aggregators** fourth (vendorRank 4) — when only available there

### DESIGN task routing (overrides general routing)
For ANY task tagged `capability: 'design'` (page builder, presentation, diagram, vector, layout), use the SUPERIOR design-specific tools BEFORE generic Gemini/Imagen:

1. **C1 Thesys** — primary framework Rish is building with (custom renderer, JSON specs, web/mobile/NFT/marketplace)
2. **Stitch MCP** — Google Stitch via MCP (currently stubbed until GA)
3. **Recraft V4** — vector + design output
4. **Ideogram V3** — typography in image, design layouts
5. **Gamma** — multi-surface visual content platform: decks, documents, brochures, reports, one-pagers, landing pages, microsites, social graphics, pitch decks (NOT just presentations)
6. **Napkin** — visual diagrams from text
7. **Imagen 4 / Nano Banana Pro 2 / GPT Image** — generic image fallbacks (lower priority for design)

The `routingPriority` field on each row enforces this order. Use `getDesignToolsByPriority()` from `queries.ts`.

> Per Rish: "We are building With C1 Thesys because the GenAI alternative was not good enough. We will use the superior models over Gemini especially in design. Don't forget Stitch MCP for design."

## Latest-only image/video enforcement

Image and video model rows must explicitly set `isLatest: true`. Any
row with `supersededBy` set is dropped at load time. Stale rows are
logged (not thrown) so the loader is forgiving but transparent.

Per Rish 2026-04-08:
> "All latest models should always be used, not older models. EVER!"

## Free models for reasoning streams

`getFreeTierModels()` returns the LLM rows that may be used by the
PiP reasoning-stream window without billing the user's token budget.
Per the A.I.M.S. pricing page:

> "Free LLMs (via OpenRouter) are available for chat and exploration
> at no cost. ... Opus 4.6 is the default model for app generation
> and advanced tasks — standard token rates apply."

## Public API

```ts
import {
  getMatrix,
  getRowById,
  getRowsBySector,
  getPlanForFrequencyAndGroup,
  getPillarsByType,
  effectiveMultiplier,
  getFreeTierModels,
  getLatestImageModels,
} from '@aims/pricing-matrix';

// Whole matrix
const m = getMatrix();
console.log(`${m.rows.length} live rows`);

// Lookup by short id
const glm = getRowById('glm-5.1');

// Lookup by OpenRouter route
import { getRowByRouteId } from '@aims/pricing-matrix';
const found = getRowByRouteId('z-ai/glm-5.1');

// Find a plan
const plan = getPlanForFrequencyAndGroup('9-month', 'individual');

// Get all Confidence pillar levels
const confidence = getPillarsByType('confidence');

// Compute weighted task multiplier (60% code, 25% workflow, 15% multi-agent)
const eff = effectiveMultiplier({
  'code-generation': 0.6,
  'workflow-automation': 0.25,
  'multi-agent': 0.15,
});

// Free models for the reasoning stream
const free = getFreeTierModels();
```

## Status

| Phase | Status |
|---|---|
| 1. In-memory seed loader + types + schema | ✅ this PR |
| 2. Neon-backed loader + LISTEN/NOTIFY hot reload | TODO |
| 3. Owner edit mode + audit history (`aims_pricing_history` table) | TODO |
| 4. Backwards-compat shims in the 3 scattered MODELS objects | TODO |
| 5. SmelterOS `/pricing-matrix` admin surface | TODO |
| 6. TPS_Ang Pricing Overseer agent + prompt-to-plan endpoint | TODO |

## Pricing numbers

The dollar amounts in `seed-models.ts` are PROVIDER WHOLESALE rates
from each vendor's published pricing. Retail (what users pay) is
computed at runtime by applying:

1. The user's plan tier discount (vs PPU baseline)
2. Any stacked Three Pillars uplifts
3. The effective task multiplier

Plan-row dollar amounts are NOT set yet. The pricing committee is
reassessing the $19.99 / $17.99 / $14.99 figures from the live page.
The seed file carries the SHAPE (frequency, allocations, taglines)
without committing to numbers.

## Philosophy

> 3 is the entry point. 6 is the axis of balance. 9 is completion —
> V.I.B.E. (Vibration, Intelligence, Balance, Energy). Pay for 9,
> receive 12. Activity breeds Activity.

Source: A.I.M.S. pricing page, "The Frequency Philosophy".
