# Visual Engine + Sqwaadrun Hawk Cards — Design Spec

**Date:** 2026-04-08
**Branch:** `feat/smelter-os-hawk-cards`
**Worktree:** `C:\Users\rishj\foai-hawks`
**Author:** Rish (directing) + Claude (drafting)
**Status:** Approved for implementation-plan generation

---

## 1. Problem

The Sqwaadrun roster — the 17 Lil_Hawks + General_Ang + Chicken_Hawk — currently renders on every consuming surface (`/sqwaadrun`, `/plug/sqwaadrun`, `/smelter-os/fleet`) with an SVG placeholder silhouette. The placeholder was only ever meant to survive until production art arrived. It reads as remedial and is actively undercutting the brand of a tool the platform markets as a Firecrawl-class alternative.

Sqwaadrun is the user-facing replacement for Firecrawl in the ACHIEVEMOR ecosystem — internal use first, end-user use via paid plans second. The visual identity of the 17-hawk fleet carries the weight of that positioning.

Parallel problem: every future surface that wants custom AI-generated imagery (Per|Form end-user player cards, Deploy Platform custom Digital CEO portraits, Per|Form scene backgrounds, etc.) currently has no shared engine. Each would reimplement image generation from scratch, diverge on model choice, leak model names to UI, and re-derive style-consistency patterns independently.

## 2. Goals

1. Replace the SVG placeholder front-face of every `HawkCard` with broadcast-grade character illustration — distinct per character, coherent as a fleet, locked to the Sqwaadrun visual canon (night port, chibi armored hawks, color-by-role rim lighting).
2. Build a reusable **Visual Engine** internal service that the Sqwaadrun hawk renders consume *and* that future end-user generation features inherit without refactor.
3. Upgrade the `HawkCard` component's front face to a full-bleed NFT-card treatment that actually uses the art. Back face (dossier) stays byte-for-byte unchanged.
4. Ship an owner-gated re-roll workflow on `/smelter-os/creative` so any single character can be regenerated on demand without redeploying.
5. Respect the canonical model routing (memory line 6) — no defaulting to Gemini for design-quality work.
6. Respect CLAUDE.md IP protection — model names, adapter identifiers, and provider strings never appear in any user-facing text, error message, or response body.

## 3. Non-goals (deferred to later specs)

- End-user token-metered generation on Per|Form / Deploy Platform (Sub-project #3)
- Paperform Stepper wizard for end-user generation (Sub-project #3) — this was in the original ask and explicitly scoped out
- Additional presets beyond the 5 defined here (player-card, scene-background-war-room, etc.) — Sub-project #4+
- Stitch MCP, C1 Thesys, Gamma, Napkin adapters — their surfaces are deferred, not this spec
- Live Vertex Imagen 4 / fal.ai / Kie.ai / Nano Banana / GLM / GPT Image adapter implementations — stubbed, wired per-consumer later
- Neon audit table for render history, GCS write-through cache — Sub-project #3
- Batch re-roll UI, A/B compare, history browser, undo — follow-up UI spec
- HawkCard visual regression testing (Chromatic/Percy) — its own spec
- Auto-commit of approved renders — operator manually reviews and commits

## 4. Project decomposition

The full ambition described during brainstorming — platform-wide Visual Engine with paid end-user wrappers across Per|Form and Deploy Platform — is larger than one spec. Decomposed into four sub-projects:

| # | Sub-project | Depends on | Who uses it | Status |
|---|---|---|---|---|
| **1** | Visual Engine core service | nothing (extends `src/lib/image/generate.ts` patterns) | everything downstream | **this spec** |
| **2** | Sqwaadrun Hawk Fleet render (17 + 3 canon) | #1 | internal / Sqwaadrun brand | **this spec** |
| **3** | End-user Visual Stepper (Paperform wizard, token-metered) | #1, #2 | paid end users — Per|Form, Deploy | follow-up spec |
| **4** | Additional presets (player-card, digital-ceo, scene backgrounds) | #1 | defined by #3 consumers | follow-up spec |

This spec delivers Sub-project #1 (Visual Engine core) + Sub-project #2 (Sqwaadrun render) together. The Hawks are the forcing function that proves the engine works; the engine is reusable for #3 + #4 with zero refactor.

## 5. Architecture & module layout

**Primary location:** `cti-hub/src/lib/visual-engine/` (internal module, server-side only).
**Scripts:** `cti-hub/scripts/visual-engine/`.
**API routes:** `cti-hub/src/app/api/visual-engine/`.
**UI surface:** existing `cti-hub/src/app/(dashboard)/smelter-os/creative/page.tsx` (owner-gated).

### 5.1 Module boundaries

```
cti-hub/src/lib/visual-engine/
├── index.ts                 # public API: render, renderBatch, loadPreset
├── engine.ts                # orchestration — preset → adapter chain → fallback loop
├── interpolate.ts           # Mustache-style {{var}} template expansion
├── models/
│   ├── types.ts             # ModelAdapter interface, RenderRequest, RenderResponse
│   ├── registry.ts          # adapter registry + SURFACE_CHAINS map
│   ├── recraft-v4.ts        # fully wired — primary for character-portrait + scene-background
│   ├── ideogram-v3.ts       # fully wired — fallback 1
│   ├── vertex-imagen-4-stub.ts
│   ├── fal-ai-stub.ts
│   ├── kie-ai-stub.ts
│   ├── vertex-nano-banana-stub.ts
│   ├── glm-image-stub.ts    # routes via OpenRouter when wired — no dedicated key
│   └── gpt-image-stub.ts
├── presets/
│   ├── index.ts             # loader + validator + type-safe access
│   ├── sqwaadrun-backdrop.json
│   ├── sqwaadrun-lil-hawk.json
│   ├── chicken-hawk-dispatcher.json
│   ├── boomer-ang-supervisor.json
│   └── acheevy-digital-ceo.json
├── curation/
│   ├── proof-sheet.ts       # sharp-based N×M grid assembler
│   └── apply-approvals.ts   # YAML reader → file copier → characters.ts flipper
├── cache/
│   └── repo.ts              # writes to public/hawks/{slug}.png
├── quota/
│   └── owner-bypass.ts      # stub — always allows for owner; Sub-project #3 replaces
└── __tests__/               # unit + integration tests
```

### 5.2 Dependency rules

- `models/` knows nothing about hawks, presets, or UI — just "prompt + optional reference images → PNG bytes"
- `presets/` knows nothing about models — just "load + validate a preset JSON, expose it as a typed object"
- `engine.ts` is the only thing that knows both — it binds a preset to an adapter chain and runs the render
- `curation/` runs offline only, never touches network — takes PNG buffers in, writes files out
- `quota/` is a trivial owner-bypass stub now, replaced by real metering in Sub-project #3 without changing any other file

### 5.3 Data flow — initial render (one-shot CLI)

```
scripts/visual-engine/gen-sqwaadrun.ts
  → engine.renderBatch(presetIds, varsByPreset, { candidates: 3 })
  → for each preset: presets.load() → models.getAdapterChain(surface) → try primary, fallback on error
  → write candidates to scripts/visual-engine/out/candidates/{slug}/{1..3}.png   (gitignored)
  → curation.proofSheet.assemble() → scripts/visual-engine/out/proof-sheet-{ts}.png
  → operator reviews → hand-edits approvals.yaml

scripts/visual-engine/apply-approvals.ts
  → read approvals.yaml → copy winners to cti-hub/public/hawks/{slug}.png   (committed)
  → flip imageReady: true in src/lib/hawks/characters.ts (automated regex edit)
  → update signatureColor values to match new role-based color system
  → write audit log to scripts/visual-engine/out/applied-{ts}.json
```

### 5.4 Data flow — re-roll (runtime UI)

```
/smelter-os/creative (owner-gated existing route, new Sqwaadrun Re-Roll tab)
  → POST /api/visual-engine/render { presetId, vars, candidates: 3 }
  → engine.render() → same pipeline, candidates returned as base64 in response
  → operator clicks winner → POST /api/visual-engine/apply { presetId, winnerBase64, targetSlug }
  → server writes to public/hawks/{slug}.png (repo becomes dirty)
  → response triggers next/image cache bust via ?v=timestamp query param
  → dirty-state banner prompts operator to run `git add public/hawks/ && git commit`
```

### 5.5 New dependencies

- `js-yaml` (~20 kB) — new — for `approvals.yaml` parsing
- `sharp` — already transitively installed via Next.js image optimization; used for proof-sheet assembly, no new user-facing dep
- `openai` — existing package reused for Recraft (OpenAI-SDK compatible) and OpenRouter (GLM stub when wired)

**Not added in this spec:** `@google-cloud/vertexai` (Vertex Imagen 4 is stubbed). Added when Sub-project #3/#4 wires real Vertex rendering.

## 6. Preset schema

```typescript
// src/lib/visual-engine/presets/index.ts

export type SurfaceKind =
  | 'character-portrait'
  | 'scene-background'
  | 'ui-mockup'
  | 'generative-ui-runtime'
  | 'deck-or-doc'
  | 'diagram-or-infographic';

export interface Preset {
  id: string;                    // matches filename, kebab-case
  version: string;               // semver — bumping invalidates cached renders
  description: string;           // operator-facing, shown in /smelter-os/creative
  surface: SurfaceKind;          // drives adapter chain selection
  basePrompt: string;            // Mustache-style {{var}} template
  negativePrompt: string;        // includes explicit "avoid baseline-remedial-bird.png style"
  composes?: string[];           // other preset ids whose reference images are inherited
  references: {
    styleAnchor?: string;        // path under public/brand/_refs/
    backdropAnchor?: string;     // path under public/brand/_refs/
    rejectReference?: string;    // path to "avoid this" image — concept injected into negative prompt
  };
  aspect: '1:1' | '4:5' | '3:4' | '16:9';
  resolution: { w: number; h: number };
  candidatesDefault: number;     // 3 for characters, 1 for backdrop
  variables: Record<string, {
    type: 'string' | 'color' | 'array';
    required: boolean;
    description: string;
  }>;
  tags: string[];                // for future cross-app filtering (Sub-project #3)
}
```

### 6.1 The 5 presets

| Preset id | Surface | Ref images | Variables | Renders |
|---|---|---|---|---|
| `sqwaadrun-backdrop` | `scene-background` | `backdrop-night-port.png` (Image 9 — locked) | none | 1 scene |
| `sqwaadrun-lil-hawk` | `character-portrait` | `sqwaadrun-lil-hawk-anchor.png` (bootstrap-generated) + `backdrop-night-port.png` + reject: `baseline-remedial-bird.png` | `callsign`, `role`, `rimColor`, `gearList`, `stance` | 17 |
| `chicken-hawk-dispatcher` | `character-portrait` | `chicken-hawk-gold-wings.png` (Image 3 — locked) + `backdrop-night-port.png` | none (single canonical character) | 1 |
| `boomer-ang-supervisor` | `character-portrait` | `squad-illustrated.png` (Image 1 — tan coat / visored helmet canon) | `callsign`, `patchText` | 1 (General_Ang) |
| `acheevy-digital-ceo` | `character-portrait` | `acheevy-canon.png` (Image 7 — locked, "as the Leader") | `visorColor`, `setting` | 1 (written to `public/brand/_refs/acheevy-canon-rendered.png`, NOT `public/hawks/`) |

### 6.2 Bootstrap style anchor for `sqwaadrun-lil-hawk`

The 17-hawk render pass needs a locked style reference so every hawk feels like the same squad. This creates a chicken-and-egg problem: the `sqwaadrun-lil-hawk` preset declares `sqwaadrun-lil-hawk-anchor.png` as its `styleAnchor`, but that file does not exist on a fresh checkout. Resolved with a dedicated bootstrap code path:

**Engine API addition:**

```typescript
// src/lib/visual-engine/engine.ts
export async function renderBootstrapAnchor(
  bootstrapSpec: {
    surface: SurfaceKind;
    basePrompt: string;
    negativePrompt: string;
    referenceImages: Buffer[];    // passed directly — NOT loaded from a preset
    aspect: Preset['aspect'];
    resolution: { w: number; h: number };
  },
  opts: { candidates?: number } = {},
): Promise<RenderResponse[]>;
```

`renderBootstrapAnchor()` bypasses preset loading entirely — it takes reference images as raw buffers and builds the `RenderRequest` directly. It uses the same adapter chain resolution as `render()`, so the canonical routing order still applies.

**Script flow:**

1. `gen-sqwaadrun.ts` reads `public/brand/_refs/squad-illustrated.png` + `backdrop-night-port.png` into memory as buffers.
2. Calls `engine.renderBootstrapAnchor({ surface: 'character-portrait', basePrompt: "...archetypal chibi armored hawk standing on the night port...", negativePrompt: "...no simple cartoon bird...", referenceImages: [squadBuffer, backdropBuffer], aspect: '1:1', resolution: { w: 1024, h: 1024 } }, { candidates: 3 })`.
3. Writes 3 candidates to `scripts/visual-engine/out/candidates/_anchor/{1,2,3}.png`.
4. Halts and prompts the operator in terminal to approve one (simple readline prompt).
5. Approved candidate is copied to `public/brand/_refs/sqwaadrun-lil-hawk-anchor.png` (committed).
6. From that point on, the normal `engine.render('sqwaadrun-lil-hawk', {...})` calls succeed because `loadReferences()` now resolves the anchor file on disk.

**If the script re-runs later:** it detects the existing anchor file, prompts `"Anchor exists. Re-bootstrap? (y/N)"`, defaults to no. This keeps the locked anchor stable across re-runs.

### 6.3 Role-based color system

Color palette is **not** locked to the memory-canonical Sqwaadrun navy/gold/cyan/orange. Colors are assigned per role archetype and function as rim-light accents on the character's armor against the uniformly dark night-port backdrop. Each hawk's `signatureColor` in `characters.ts` gets updated to match this table during `apply-approvals.ts`.

| Tier | Callsign | Role archetype | Hex | Why |
|---|---|---|---|---|
| Core | Lil_Guard_Hawk | Defensive gate | `#DC2626` crimson | Classic guardian |
| Core | Lil_Scrapp_Hawk | Squad lead / async | `#F97316` orange | Warmth + visibility |
| Core | Lil_Parse_Hawk | Data analyst | `#3B82F6` blue | Analyst cool |
| Core | Lil_Crawl_Hawk | BFS explorer | `#F59E0B` amber | Explorer warmth |
| Core | Lil_Snap_Hawk | Capture/screenshot | `#EC4899` pink | Signal alert |
| Core | Lil_Store_Hawk | Persistence vault | `#06B6D4` cyan | Infra blue |
| Expansion | Lil_Extract_Hawk | Surgical precision | `#EAB308` gold | Precision highlight |
| Expansion | Lil_Feed_Hawk | RSS/broadcast | `#A855F7` purple | Broadcast signal |
| Expansion | Lil_Diff_Hawk | Change alarm | `#EF4444` alarm red | Alert urgency |
| Expansion | Lil_Clean_Hawk | Boilerplate strip | `#10B981` emerald | Cleanup green |
| Expansion | Lil_API_Hawk | Auth/tokens | `#6366F1` indigo | Authorization |
| Expansion | Lil_Queue_Hawk | Priority scheduling | `#22D3EE` turquoise | Coordinator |
| Specialist | Lil_Sitemap_Hawk | Cartography | `#84CC16` lime | Explorer/map |
| Specialist | Lil_Stealth_Hawk | Anti-detection | `#64748B` slate | Only achromatic — shadow ops |
| Specialist | Lil_Schema_Hawk | Structured data | `#0EA5E9` sky | Lab science |
| Specialist | Lil_Pipe_Hawk | ETL mechanic | `#92400E` copper | Only earth tone — machinery |
| Specialist | Lil_Sched_Hawk | Timing/cron | `#8B5CF6` violet | Conductor |

**Command tier colors:**
- Chicken_Hawk — `#F5A623` gold (memory canon, matches Image 3)
- General_Ang — `#F4E5C2` bone/tan (coat color from Image 1)
- ACHEEVY — `#F97316` orange visor (Image 7 canon)

**Acknowledged collision:** ACHEEVY ↔ Scrapp share the orange family. Accepted because they never appear in the same UI frame (ACHEEVY lives in chat header, Scrapp is a fleet-grid card). If they ever do, shift ACHEEVY to `#FBBF24` golden yellow.

## 7. Surface → routing chain map (the spec's backbone)

Every preset declares a `surface`. The engine uses `surface` to select the adapter chain from `SURFACE_CHAINS`. Adding new surfaces later = new rows in this table + new adapters in the registry, no engine refactor.

| Surface | Primary | Fallback chain | In this spec? |
|---|---|---|---|
| **character-portrait** | **Recraft V4** | Ideogram V3 → Vertex Imagen 4 → fal.ai → Kie.ai → Nano Banana (Vertex) → GLM Image (via OpenRouter) → GPT Image | ✅ Sub-project #2 |
| **scene-background** | **Recraft V4** | Ideogram V3 → Vertex Imagen 4 → fal.ai → Kie.ai → Nano Banana (Vertex) → GLM Image (via OpenRouter) → GPT Image | ✅ Sub-project #2 |
| **ui-mockup** | Stitch MCP | C1 Thesys → Gamma (web surface) → manual | ❌ deferred (page builder spec) |
| **generative-ui-runtime** | C1 Thesys | — (only C1 returns portable JSON specs) | ❌ already exists in Per|Form |
| **deck-or-doc** | Gamma | Napkin (if diagram-heavy) | ❌ deferred (marketing surfaces) |
| **diagram-or-infographic** | Napkin | Gamma | ❌ deferred |

**Source of truth for ordering:** memory line 6 (`project_design_routing.md`), line 25 (`feedback_model_policy_gemini_first`), line 19 (GCP Vertex stack), and `feedback_consult_design_routing_first.md` (the 2026-04-08 correction making clear that Recraft precedes Imagen 4 in the design chain for character work).

**C1 Thesys / Stitch / Gamma / Napkin do not appear in character-portrait chain** because they don't render character illustrations. C1 returns UI JSON specs. Stitch generates page layouts. Gamma builds decks/docs/web. Napkin produces diagrams from text. All first-class citizens in the Visual Engine — just not for hawk portraits.

### 7.1 What ships wired vs stubbed

**Fully wired (2 adapters):**
- `recraft-v4` — primary for character-portrait + scene-background
- `ideogram-v3` — fallback 1

**Stubbed (6 adapters, ~15 lines each):**
- `vertex-imagen-4` — env vars + endpoint documented; throws `ADAPTER_NOT_WIRED`
- `fal-ai` — env vars + endpoint documented; throws `ADAPTER_NOT_WIRED`
- `kie-ai` — env vars + endpoint documented; throws `ADAPTER_NOT_WIRED`
- `vertex-nano-banana` — env vars + endpoint documented; throws `ADAPTER_NOT_WIRED`
- `glm-image` — routes via OpenRouter; TODO comment documents model id; throws `ADAPTER_NOT_WIRED`
- `gpt-image` — env vars + endpoint documented; throws `ADAPTER_NOT_WIRED`

The engine's fallback loop catches `ADAPTER_NOT_WIRED:` specifically and silently skips to the next adapter. Any *other* error (rate limit, 500, timeout, quota) is logged and *also* triggers fallback. If the entire chain exhausts, the engine throws `VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE`.

## 8. Render pipeline & model adapters

### 8.1 ModelAdapter interface

```typescript
// src/lib/visual-engine/models/types.ts
export type AdapterId =
  | 'recraft-v4'
  | 'ideogram-v3'
  | 'vertex-imagen-4'
  | 'fal-ai'
  | 'kie-ai'
  | 'vertex-nano-banana'
  | 'glm-image'
  | 'gpt-image';

export interface RenderRequest {
  prompt: string;                // fully-interpolated, ready to send
  negativePrompt: string;
  referenceImages?: Buffer[];    // style anchor + backdrop anchor, 0–N
  aspect: Preset['aspect'];
  resolution: { w: number; h: number };
  seed?: number;                 // for reproducibility
}

export interface RenderResponse {
  png: Buffer;                   // raw PNG bytes
  adapterId: AdapterId;          // audit only — NEVER leaked to UI
  modelUsed: string;             // internal model id, server-side only
  latencyMs: number;
  costUsd: number;               // for future quota accounting
}

export interface ModelAdapter {
  id: AdapterId;
  supportedSurfaces: SurfaceKind[];
  supportsReferenceImages: boolean;
  render(req: RenderRequest): Promise<RenderResponse>;
}
```

### 8.2 Registry + surface routing

```typescript
// src/lib/visual-engine/models/registry.ts
const ALL_ADAPTERS: Record<AdapterId, ModelAdapter> = {
  'recraft-v4':        recraftV4,
  'ideogram-v3':       ideogramV3,
  'vertex-imagen-4':   vertexImagen4Stub,
  'fal-ai':            falAiStub,
  'kie-ai':            kieAiStub,
  'vertex-nano-banana':vertexNanoBananaStub,
  'glm-image':         glmImageStub,
  'gpt-image':         gptImageStub,
};

const SURFACE_CHAINS: Record<SurfaceKind, AdapterId[]> = {
  'character-portrait': [
    'recraft-v4', 'ideogram-v3', 'vertex-imagen-4',
    'fal-ai', 'kie-ai', 'vertex-nano-banana', 'glm-image', 'gpt-image',
  ],
  'scene-background': [
    'recraft-v4', 'ideogram-v3', 'vertex-imagen-4',
    'fal-ai', 'kie-ai', 'vertex-nano-banana', 'glm-image', 'gpt-image',
  ],
  'ui-mockup':             [],
  'generative-ui-runtime': [],
  'deck-or-doc':           [],
  'diagram-or-infographic':[],
};

export function getAdapterChain(surface: SurfaceKind): ModelAdapter[] {
  const ids = SURFACE_CHAINS[surface];
  if (ids.length === 0) {
    throw new Error(`VISUAL_ENGINE_NO_CHAIN: surface "${surface}" has no registered adapters`);
  }
  return ids.map((id) => ALL_ADAPTERS[id]);
}
```

### 8.3 Recraft V4 adapter (primary)

- **Transport:** `openai` package with custom `baseURL: 'https://external.api.recraft.ai/v1'`
- **Auth:** `RECRAFT_API_KEY` from env (pulled from openclaw container, local dev via `.env.local`)
- **Model id:** `recraftv3` initially — upgrade to `recraftv4` when account permits
- **Reference images:** passed via Recraft's `style_reference` field (multipart form or inline data URL per SDK extension)
- **Supports:** `character-portrait`, `scene-background`. `supportsReferenceImages: true`.
- **IP protection:** string `"recraft"` never appears in any response body, log line visible to a user, or error message. Audit log field `adapterId: 'recraft-v4'` is written only to `scripts/visual-engine/out/applied-{ts}.json` (gitignored) and in the future to Neon `visual_engine_audit` (Sub-project #3).

### 8.4 Ideogram V3 adapter (fallback 1)

- **Transport:** direct `fetch` to `https://api.ideogram.ai/v1/generate`
- **Auth:** `IDEOGRAM_API_KEY` from env
- **Reference images:** via Ideogram's character-reference mode (`character_reference_images` parameter)
- **Supports:** `character-portrait`, `scene-background`. `supportsReferenceImages: true`.
- **IP protection:** same rules as Recraft

### 8.5 Stub adapters (6)

Each stub is ~15 lines in its own file. Example:

```typescript
// src/lib/visual-engine/models/ideogram-v3-stub.ts — TEMPLATE (real Ideogram is wired per §8.4; this is the template for the 6 others)
import type { ModelAdapter } from './types';

export const vertexImagen4Stub: ModelAdapter = {
  id: 'vertex-imagen-4',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    // TODO: wire via @google-cloud/vertexai.
    // Project: foai-aims  Location: us-central1  Model: imagen-4.0-generate-001
    // Auth: ADC locally (gcloud auth application-default login),
    //       service-account binding on Cloud Run in prod
    // Reference images: Vertex supports up to 4 via referenceImages parameter
    // Negative prompt: Vertex supports negativePrompt field
    throw new Error('ADAPTER_NOT_WIRED: vertex-imagen-4');
  },
};
```

Stub adapters for: `vertex-imagen-4`, `fal-ai`, `kie-ai`, `vertex-nano-banana`, `glm-image`, `gpt-image`. The `glm-image` TODO comment specifically notes that GLM is reached via OpenRouter using `OPENROUTER_API_KEY` — no dedicated `GLM_API_KEY`.

### 8.6 `engine.render()` orchestration

```typescript
// src/lib/visual-engine/engine.ts
export async function render(
  presetId: string,
  vars: Record<string, string | string[]>,
  opts: { candidates?: number; seed?: number } = {}
): Promise<RenderResponse[]> {
  const preset = await presets.load(presetId);
  presets.validateVars(preset, vars);

  const prompt = interpolate(preset.basePrompt, vars);
  const negative = interpolate(preset.negativePrompt, vars);
  const referenceImages = await loadReferences(preset);

  const req: RenderRequest = {
    prompt, negativePrompt: negative, referenceImages,
    aspect: preset.aspect, resolution: preset.resolution,
  };

  const chain = getAdapterChain(preset.surface).filter(
    (a) => !preset.references.styleAnchor || a.supportsReferenceImages
  );
  if (chain.length === 0) {
    throw new Error(`VISUAL_ENGINE_NO_COMPATIBLE_ADAPTER: surface=${preset.surface}`);
  }

  const candidates = opts.candidates ?? preset.candidatesDefault;
  const results: RenderResponse[] = [];

  for (let i = 0; i < candidates; i++) {
    let lastRealError: Error | null = null;
    let succeeded = false;

    for (const adapter of chain) {
      try {
        results.push(await adapter.render({ ...req, seed: (opts.seed ?? 0) + i }));
        succeeded = true;
        break;
      } catch (err) {
        const msg = (err as Error).message;
        if (msg.startsWith('ADAPTER_NOT_WIRED:')) continue;  // silent skip for stubs
        lastRealError = err as Error;
        console.warn(`[visual-engine] ${adapter.id} failed candidate ${i}:`, msg);
      }
    }

    if (!succeeded) {
      throw lastRealError
        ?? new Error(`VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE: surface=${preset.surface}`);
    }
  }

  return results;
}
```

Sequential generation (not parallel) — Recraft has rate limits and cost visibility matters more than batch speed for a 20-render one-shot.

### 8.7 Quota stub

```typescript
// src/lib/visual-engine/quota/owner-bypass.ts
import { isOwner } from '@/lib/allowlist';

export async function checkQuota(userEmail: string | null, presetId: string): Promise<void> {
  if (userEmail && isOwner(userEmail)) return;
  throw new Error('QUOTA_UNAVAILABLE: end-user generation ships in Sub-project #3');
}
```

Called from the API route only, not from `engine.render()` directly — keeps the engine reusable from CLI scripts which bypass quota.

## 9. Curation workflow

### 9.1 Step 1 — CLI batch render

```bash
cd cti-hub
pnpm tsx scripts/visual-engine/gen-sqwaadrun.ts
```

1. Generates **bootstrap style anchor** first (§6.2), halts for operator approval in terminal, copies approved to `public/brand/_refs/sqwaadrun-lil-hawk-anchor.png`.
2. Renders 3 candidates per character for all 20 characters using the appropriate preset with per-character variables.
3. Writes candidates to `scripts/visual-engine/out/candidates/{slug}/{1,2,3}.png`.
4. Writes manifest at `scripts/visual-engine/out/manifest-{timestamp}.json` (adapter used, seed, latency, cost per candidate — audit data).

Everything under `scripts/visual-engine/out/` is gitignored.

### 9.2 Step 2 — Proof sheet assembly

`curation/proof-sheet.ts` uses `sharp` to composite a 20-row × 3-column grid:
- Each row: label on left (callsign + role), 3 candidate thumbnails (256×256) to the right
- Header: `"SQWAADRUN PROOF SHEET — {timestamp} — mark approvals in approvals.yaml"`
- Footer: adapter used per row + `baseline-remedial-bird.png` negative reference at the bottom for quality comparison
- Output: single PNG at `scripts/visual-engine/out/proof-sheet-{timestamp}.png`

### 9.3 Step 3 — `approvals.yaml`

Script pre-creates:

```yaml
# scripts/visual-engine/out/approvals.yaml
# Mark each character with the candidate index you approve (1, 2, or 3).
# Use "reroll" to skip — stays as placeholder for targeted re-roll via /smelter-os/creative.
# Use "skip" to leave the current committed file untouched.
timestamp: "2026-04-08T14:23:00Z"
anchor_approved: 2       # which candidate became the locked style anchor

characters:
  lil_guard_hawk:   1
  lil_scrapp_hawk:  2
  lil_parse_hawk:   reroll
  # ... all 17 Lil_Hawks
  general_ang:      1
  chicken_hawk:     2
  acheevy:          1    # → public/brand/_refs/acheevy-canon-rendered.png
```

Operator reviews proof sheet, hand-edits YAML with approval decisions.

### 9.4 Step 4 — `apply-approvals.ts`

```bash
pnpm tsx scripts/visual-engine/apply-approvals.ts
```

For each entry:
1. **Approved (1/2/3):** copies `candidates/{slug}/{idx}.png` → `public/hawks/{slug}.png` (or `public/brand/_refs/acheevy-canon-rendered.png` for ACHEEVY).
2. **`reroll`:** no-op; placeholder stays; `imageReady` stays `false`; operator will use the UI later.
3. **`skip`:** no-op; preserves any existing committed file.

After all copies: **automatically edits `src/lib/hawks/characters.ts`** to flip `imageReady: false → true` for approved characters and update each `signatureColor` per §6.3.

**Edit strategy (not a raw regex):** the file is a TypeScript module exporting `HAWK_PROFILES: CharacterProfile[] = [ ... ]`. The `apply-approvals.ts` script uses a **narrow structural edit**: for each approved slug, locate the object literal `{ slug: 'lil_guard_hawk', ... }` by searching for the exact line `slug: '{slug}',`, then within the containing object (bounded by the next `{` and matching `}`), replace:
- `imageReady: false` → `imageReady: true`
- `signatureColor: '#[0-9A-F]{6}'` → `signatureColor: '{newHex}'`

The script validates each match is unique within its object scope before applying, and errors out if a replacement would match zero or more than one location. This is NOT a global regex — each edit is scoped to a single object literal, located by slug anchor. The TypeScript AST is NOT walked (no new dep); the structural match is done with regex anchored to known-stable formatting in the file.

The resulting diff shows up as a normal `git diff src/lib/hawks/characters.ts` for the operator to review before committing.

**Failure mode:** if `characters.ts` formatting has drifted (reformat, reordering), the anchor-based match may fail. Script errors with the slug it couldn't locate and exits without modifying the file. Operator either fixes the formatting drift or falls back to manual edit.

Writes audit record to `scripts/visual-engine/out/applied-{ts}.json` (gitignored).

Atomic: if YAML parse fails, script exits 1 with line number, no files touched.

### 9.5 Step 5 — `/smelter-os/creative` re-roll UI

New "Sqwaadrun Re-Roll" tab on existing `/smelter-os/creative/page.tsx`. Scope:

- **Preset picker:** dropdown of the 5 presets
- **Character picker** (visible when preset is `sqwaadrun-lil-hawk`): dropdown of the 17 Lil_Hawks, or the single canonical character for other presets
- **Current art preview:** shows committed `public/hawks/{slug}.png` (or placeholder SVG if not ready)
- **Render button:** `POST /api/visual-engine/render` with `{ presetId, vars, candidates: 3 }`, shows spinner with generic "Iller_Ang working..." label (no adapter/model names)
- **3 candidate previews:** base64 inline from API response
- **Approve + Write button** on each candidate: `POST /api/visual-engine/apply` with `{ presetId, winnerBase64, targetSlug }`, overwrites file, busts next/image cache via `?v=timestamp`
- **Dirty-state banner:** after a write, shows `"Repo now has uncommitted changes — run git add public/hawks/ && git commit when done iterating"`
- **Out of scope:** batch re-roll, A/B compare, history browser, undo — deferred

### 9.6 Error handling

| Failure | Behavior |
|---|---|
| Single adapter throws `ADAPTER_NOT_WIRED:...` | Silent skip to next adapter in chain (stubs) |
| Single adapter throws real error (rate limit, 500, timeout) | Logged + skip to next adapter |
| All adapters exhausted | Engine throws `VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE`. API returns 503 with generic message. Model names never leak. |
| Reference image missing on disk | Engine throws `VISUAL_ENGINE_MISSING_REFERENCE` at preset load, before any adapter call |
| Preset var validation fails | Engine throws `VISUAL_ENGINE_INVALID_VARS` with missing field name |
| `apply-approvals.ts` YAML parse fails | Exit 1 with line number, no files modified |
| Quota check fails for non-owner | API returns 403 with generic message (owner bypass via `isOwner()` from `@/lib/allowlist`) |

## 10. HawkCard frame upgrade

Scope: `cti-hub/src/components/hawks/HawkCard.tsx` — **front face only**. Back face (dossier, lines 183–302 current) stays byte-for-byte identical.

### 10.1 Dimensions

```typescript
const dimensions = {
  sm: { w: 240, h: 360 },   // was 220×310
  md: { w: 320, h: 480 },   // was 280×400 — flagship size
  lg: { w: 400, h: 600 },   // was 340×480 — hero / landing / marketing
}[size];
```

Aspect ratio shifts from ~0.71 to 0.666 (2:3) — matches NFT/trading-card convention (memory line 49: `Per|Form brand assets — NFT card styles, player cards`). Back face dossier still fits at all three sizes.

### 10.2 Front face layout — 3 zones

```
┌─────────────────────────────────────┐
│  [floating tier pill]   [status]    │  ← Zone 1: floating chrome top
│                                     │
│                                     │
│        [FULL-BLEED HAWK ART]        │  ← Zone 2: hero — 70% of card height
│         (edge to edge, no vignette) │     next/image, object-cover
│                                     │
│ ╱╱╱ gradient fade to obsidian ╱╱╱   │     fade band 12%
│   CALLSIGN                          │  ← Zone 3: callsign plate 18%
│   LIL GUARD HAWK                    │
│   ▸ Gatekeeper — robots.txt         │
│                              A.I.M.S│
└─────────────────────────────────────┘
```

**Zone 1 — Floating chrome top (~28 px, absolutely positioned over art):**
- Tier pill (`CORE` / `EXPANSION` / `SPECIALIST` / `COMMANDER` / `DISPATCHER` / `SUPERVISOR`) top-left. Semi-transparent backdrop blur. `sigColor` border + text. Font: mono 8 px, tracking-[0.25em].
- Status dot (active/standby) top-right, same treatment.
- Top color stripe (existing 2 px gradient line) kept, pulled to very top edge.

**Zone 2 — Hero art (~70% of height):**
- `<Image fill object-cover>` pointing at `profile.imagePath`, edge-to-edge, **no vignette**, **no padding**, **no internal border**.
- Vignette gone — new Recraft/Ideogram renders have cinematic lighting baked in.
- Fallback when `profile.imageReady === false`: existing `CharacterPlaceholder` SVG scaled to fill the larger zone, with `"◯ AWAITING RENDER"` label top-right.

**Zone 3 — Callsign plate (~18% of height):**
- 12% fade band above via `linear-gradient(180deg, transparent 0%, rgba(5,8,16,0.85) 60%, #050810 100%)`.
- Solid obsidian `#050810` below the fade.
- `CALLSIGN` micro-label (8 px mono, tracking-[0.25em], opacity-60).
- Callsign name (20 px black, -0.01em tracking — bumped from 18 px).
- Role line (10 px mono, `sigColor`) with leading `▸` bullet.
- `A.I.M.S. · TAP ↻` stencil anchored bottom-right, opacity-30.

### 10.3 Removed from old front face

- Inner top bar with tier+status (moved to Zone 1 floating overlay)
- Radial vignette on the image slot (deleted)
- Repeating `linear-gradient` A.I.M.S. container slat texture overlay (deleted — conflicts with hero art)
- Bordered `inset-0 overflow-hidden border-2` outer frame (replaced with border-radius + outer shadow only)

### 10.4 Kept

- Click to flip (3D rotateY motion, `preserve-3d`, 0.7 s easing)
- `sigColor` drives tier pill, role line, status dot, top stripe
- Back face dossier — byte-for-byte unchanged
- Size prop (`sm | md | lg`)
- Status, `tasksCompleted`, `tasksFailed` props
- Stenciled A.I.M.S. corner mark

### 10.5 Consumer call-site responsive pass

| Consumer | File | Change |
|---|---|---|
| Owner dashboard | `src/app/(dashboard)/sqwaadrun/page.tsx` | Grid cols `md:grid-cols-3 lg:grid-cols-4` → `md:grid-cols-2 lg:grid-cols-3` |
| Public landing | `src/app/plug/sqwaadrun/page.tsx` | Same grid adjustment; hero row may use `lg` instead of `md` |
| Fleet roster | `src/app/(dashboard)/smelter-os/fleet/page.tsx` | Same grid adjustment |

All 1-line changes. No layout restructure.

## 11. Testing strategy

Existing Jest harness (`scripts/run-active-tests.mjs`). No live API calls in CI.

| Tier | What | Where |
|---|---|---|
| Unit — pure | `interpolate()`, preset validator, YAML approvals parser, role-color map derivation | `src/lib/visual-engine/__tests__/*.test.ts` |
| Unit — adapters | Recraft, Ideogram mocked via `undici` MockAgent; happy path + error → fallback skip | `src/lib/visual-engine/models/__tests__/*.test.ts` |
| Integration — engine | `engine.render()` with all stubs + one fake adapter that succeeds on attempt N; verify fallback loop, stub skip, exhausted-chain error | `src/lib/visual-engine/__tests__/engine.integration.test.ts` |

**Not tested in this spec:** proof-sheet visual regression, live Vertex/Recraft calls (budget + secrets), HawkCard visual regression.

**Manual QA gate:** operator runs `gen-sqwaadrun.ts`, reviews proof sheet, approves ≥12 of 20 characters on first pass. Any hawk needing 3+ re-rolls gets flagged in a follow-up tuning pass (prompt or role color adjustment).

## 12. Secrets & environment

**Source:** `openclaw-sop5-openclaw-1` container env per memory line 77 (`reference_secrets_openclaw.md`). Never pasted in chat, never committed, never logged.

```bash
# cti-hub/.env.example additions (values blank — operator pulls from openclaw)
RECRAFT_API_KEY=                    # REQUIRED — primary character-portrait adapter
IDEOGRAM_API_KEY=                   # REQUIRED — fallback 1
OPENROUTER_API_KEY=                 # already exists — consumed by glm-image stub when wired
FAL_API_KEY=                        # optional — fal-ai stub wiring
KIE_API_KEY=                        # optional — kie-ai stub wiring
# Vertex (stub adapters, deferred wiring):
# GOOGLE_APPLICATION_CREDENTIALS — ADC locally, Cloud Run binding in prod
# VERTEX_PROJECT_ID=foai-aims
# VERTEX_LOCATION=us-central1
```

**Local dev:** operator pulls `RECRAFT_API_KEY` + `IDEOGRAM_API_KEY` from openclaw, drops into `cti-hub/.env.local` (already gitignored).

**Cloud Run deploy:** keys injected via Secret Manager bindings on the cti-hub service account (existing pattern — no new infra).

## 13. File manifest

### 13.1 New files (~36 production + test files)

```
cti-hub/src/lib/visual-engine/
├── index.ts
├── engine.ts
├── interpolate.ts
├── models/
│   ├── types.ts
│   ├── registry.ts
│   ├── recraft-v4.ts                   # fully wired
│   ├── ideogram-v3.ts                  # fully wired
│   ├── vertex-imagen-4-stub.ts
│   ├── fal-ai-stub.ts
│   ├── kie-ai-stub.ts
│   ├── vertex-nano-banana-stub.ts
│   ├── glm-image-stub.ts               # routes via OpenRouter when wired
│   └── gpt-image-stub.ts
├── presets/
│   ├── index.ts
│   ├── sqwaadrun-backdrop.json
│   ├── sqwaadrun-lil-hawk.json
│   ├── chicken-hawk-dispatcher.json
│   ├── boomer-ang-supervisor.json
│   └── acheevy-digital-ceo.json
├── curation/
│   ├── proof-sheet.ts
│   └── apply-approvals.ts
├── cache/
│   └── repo.ts
├── quota/
│   └── owner-bypass.ts
└── __tests__/                          # test files under here

cti-hub/scripts/visual-engine/
├── gen-sqwaadrun.ts
└── apply-approvals.ts

cti-hub/src/app/api/visual-engine/
├── render/route.ts                     # POST, owner-gated
└── apply/route.ts                      # POST, owner-gated

cti-hub/public/brand/_refs/             # reference images (committed)
├── backdrop-night-port.png             # Image 9 — locked backdrop
├── acheevy-canon.png                   # Image 7 — ACHEEVY leader
├── chicken-hawk-gold-wings.png         # Image 3 — Chicken_Hawk
├── squad-illustrated.png               # Image 1 — moodboard
├── squad-photoreal-port.png            # Image 2 — moodboard
├── ang-boomerang-neon.png              # Image 4 — brand mark
├── aims-style-alignment.png            # Image 6 — moodboard
└── baseline-remedial-bird.png          # Image 8 — reject reference

docs/superpowers/specs/
└── 2026-04-08-visual-engine-sqwaadrun-hawk-cards-design.md   # this file
```

### 13.2 Modified files

```
cti-hub/src/components/hawks/HawkCard.tsx                        # front face rewrite (§10)
cti-hub/src/lib/hawks/characters.ts                              # new signatureColor values + imageReady flips (§6.3, §9.4)
cti-hub/src/app/(dashboard)/sqwaadrun/page.tsx                   # 1-line grid col adjustment (§10.5)
cti-hub/src/app/plug/sqwaadrun/page.tsx                          # 1-line grid col adjustment + hero size
cti-hub/src/app/(dashboard)/smelter-os/fleet/page.tsx            # 1-line grid col adjustment
cti-hub/src/app/(dashboard)/smelter-os/creative/page.tsx         # add Sqwaadrun Re-Roll tab (§9.5)
cti-hub/.gitignore                                               # add scripts/visual-engine/out/
cti-hub/.env.example                                             # add env var placeholders (§12)
cti-hub/package.json                                             # add js-yaml
```

### 13.3 Committed art (post-approval)

```
cti-hub/public/hawks/
├── lil_guard_hawk.png        (+ 16 more Lil_Hawks)
├── general_ang.png
└── chicken_hawk.png

cti-hub/public/brand/_refs/
├── sqwaadrun-lil-hawk-anchor.png    # approved bootstrap anchor
└── acheevy-canon-rendered.png       # ACHEEVY canonical render — NOT in public/hawks/
```

## 14. Success criteria

Spec is considered implementation-complete when:

1. `pnpm tsx scripts/visual-engine/gen-sqwaadrun.ts` runs end-to-end without error and produces 60 candidate PNGs + 1 proof sheet PNG using live Recraft API
2. `pnpm tsx scripts/visual-engine/apply-approvals.ts` copies approved candidates, edits `characters.ts`, and produces a clean git diff the operator can review
3. `/smelter-os/fleet`, `/sqwaadrun`, `/plug/sqwaadrun` all render the new `HawkCard` with full-bleed hero art for every `imageReady: true` hawk
4. Back face dossier renders identically to pre-change (visual parity check — no regression)
5. `/smelter-os/creative` "Sqwaadrun Re-Roll" tab lets the operator pick any of the 5 presets, render 3 candidates, approve one, and see it written to disk
6. Engine fallback loop verified by integration test: stubbed adapters silently skip, first real adapter to succeed wins, exhausted chain throws `VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE`
7. CLAUDE.md audit: `grep -ri "recraft\|ideogram\|vertex\|imagen\|openrouter\|fal.ai\|kie.ai" cti-hub/src/app cti-hub/src/components` returns zero user-facing matches (internal `src/lib/visual-engine/` is fine)
8. Operator approves ≥12 of 20 characters in the first proof-sheet pass; remaining characters are either re-rolled via the UI or flagged for follow-up prompt tuning

## 15. References

### 15.1 Memory entries consulted

- Line 6 — `project_design_routing.md` — canonical design-tool routing chain (primary source)
- Line 19 — `project_vertex_ai_stack.md` — GCP Vertex AI stack
- Line 25 — `feedback_model_policy_gemini_first.md` — Google/Gemini/Gemma/Vertex first
- Line 43 — `feedback_never_reveal_tools.md` — no model/provider names in UI
- Line 49 — `project_perform_brand_assets.md` — NFT card style language
- Line 56 — `feedback_strip_leakers_all_repos.md` — IP-protection scope across repos
- Line 66 — `reference_recraft_v4_api.md` — Recraft V4 specifics
- Line 65 — `reference_ideogram_v3_api.md` — Ideogram V3 specifics
- Line 67 — `reference_fal_ai_platform.md` — fal.ai gateway
- Line 68 — `reference_kie_ai_platform.md` — Kie.ai gateway
- Line 70 — `reference_platform_tooling.md` — platform tooling master index
- Line 73 — `project_sqwaadrun.md` — Sqwaadrun 17-hawk fleet context
- Line 74 — `project_sqwaadrun_brand.md` — Sqwaadrun visual brand (partially overridden by this spec on color palette)
- Line 77 — `reference_secrets_openclaw.md` — secrets from openclaw container
- Line 81 — `project_perform_war_room_backgrounds.md` — Iller_Ang / Recraft V4 pipeline precedent
- `feedback_consult_design_routing_first.md` — created during this session; future-session protection

### 15.2 Canonical reference images

Nine references provided by Rish on 2026-04-08. Source paths (read-only, copied into `cti-hub/public/brand/_refs/` during implementation):

| Dest file | Source | Role |
|---|---|---|
| `backdrop-night-port.png` | `C:\Users\rishj\iCloudPhotos\Photos\IMG_2036.JPG` | Locked backdrop — "Keep this backdrop" |
| `acheevy-canon.png` | `C:\Users\rishj\iCloudPhotos\Photos\Chicken Hawk.png` | ACHEEVY canonical — "as the Leader" (filename misleading; contents are ACHEEVY) |
| `chicken-hawk-gold-wings.png` | `C:\Users\rishj\iCloudPhotos\Photos\chickenhawk_branded_armor_gold_1773866437145.png` | Chicken_Hawk canonical |
| `squad-illustrated.png` | `C:\Users\rishj\iCloudPhotos\Photos\Chicken Hawk-Boomer_Angs-Lil_Hawks- SQUAD.png` | Moodboard — squad composition + ANG patch |
| `squad-photoreal-port.png` | `C:\Users\rishj\iCloudPhotos\Photos\the squad.png` | Moodboard — hierarchy at port |
| `ang-boomerang-neon.png` | `C:\Users\rishj\iCloudPhotos\Photos\939bbe32-f094-4749-8bcf-19cf24327550.png` | A\|N\|G brand mark |
| `aims-style-alignment.png` | `C:\Users\rishj\iCloudPhotos\Photos\2CE5EB2F-2420-4153-B7C7-DAC2C333FDAF.png` | Moodboard — chibi hawks in card UI |
| `baseline-remedial-bird.png` | `C:\Users\rishj\iCloudPhotos\Photos\IMG_0751.PNG` | REJECT reference — "don't look like this" |

### 15.3 Consuming files (read during design)

- `cti-hub/src/components/hawks/HawkCard.tsx` — current flip-card component
- `cti-hub/src/lib/hawks/characters.ts` — 17-hawk + command canon, visual descriptions, signatureColor
- `cti-hub/src/lib/hawks/roster.ts` — operational metadata bound to characters
- `cti-hub/src/lib/image/generate.ts` — existing Gemini/OpenAI/Flux image gen (gets absorbed as patterns only; not lifted wholesale)
- `cti-hub/src/app/(dashboard)/smelter-os/page.tsx` — command-surface landing (NOT modified by this spec; original ask misdirected)
- `cti-hub/src/app/(dashboard)/smelter-os/creative/page.tsx` — Iller_Ang surface (modified — new re-roll tab)
- `cti-hub/src/lib/skills/open-mind/SKILL.md` — creation harness (applied to design thinking, not invoked as a tool)
- `cti-hub/CLAUDE.md` — IP protection rules (enforced throughout)
