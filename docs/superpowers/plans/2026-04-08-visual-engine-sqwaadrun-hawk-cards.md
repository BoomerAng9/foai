# Visual Engine + Sqwaadrun Hawk Cards Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a reusable internal Visual Engine module + 20 broadcast-grade character renders (17 Lil_Hawks + General_Ang + Chicken_Hawk + ACHEEVY canonical) + `HawkCard` full-bleed frame upgrade + owner-gated re-roll UI on `/smelter-os/creative`.

**Architecture:** New module at `cti-hub/src/lib/visual-engine/` with adapter registry keyed by surface kind (`character-portrait`, `scene-background`, etc.). Primary adapter Recraft V4, fallback Ideogram V3, 6 stubs for the rest of the canonical chain. Preset JSON files encode the Sqwaadrun visual canon (backdrop, lil-hawk, chicken-hawk, boomer-ang, acheevy). CLI batch script generates candidates → human-curated proof sheet → YAML approvals → apply-approvals script commits winners and flips `imageReady` flags. Owner re-roll via new tab on `/smelter-os/creative` that calls `/api/visual-engine/render` + `/apply`.

**Tech Stack:** TypeScript, Next.js 15 App Router, `js-yaml` (new), `sharp` (existing via Next.js, added as direct dep for clarity), raw `fetch` for Recraft and Ideogram APIs (no new SDK deps), Jest with `undici` MockAgent for adapter tests, Firebase Auth `isOwner()` allowlist check.

**Source spec:** `docs/superpowers/specs/2026-04-08-visual-engine-sqwaadrun-hawk-cards-design.md`

---

## Phase 0 — Foundation

### Task 0.1: Install dependencies and update env + gitignore

**Files:**
- Modify: `cti-hub/package.json`
- Modify: `cti-hub/.env.example`
- Modify: `cti-hub/.gitignore`

- [ ] **Step 1: Install js-yaml and sharp as production deps, @types/js-yaml as dev dep**

```bash
cd cti-hub
pnpm add js-yaml sharp
pnpm add -D @types/js-yaml
```

- [ ] **Step 2: Verify install**

```bash
pnpm list js-yaml sharp @types/js-yaml
```

Expected: three packages listed with version numbers, no errors.

- [ ] **Step 3: Add env var placeholders to `.env.example`**

Append to `cti-hub/.env.example`:

```bash
# ─── Visual Engine ───
# Primary character-portrait adapter
RECRAFT_API_KEY=
# Fallback 1 — character reference mode
IDEOGRAM_API_KEY=
# Stub adapters (wire when Sub-project #3 or follow-up spec demands)
FAL_API_KEY=
KIE_API_KEY=
# Vertex stubs — ADC in dev, Cloud Run binding in prod, see spec §12
# VERTEX_PROJECT_ID=foai-aims
# VERTEX_LOCATION=us-central1
```

- [ ] **Step 4: Add visual-engine output to `.gitignore`**

Append to `cti-hub/.gitignore`:

```
# Visual Engine — render candidates and audit logs (gitignored)
scripts/visual-engine/out/
```

- [ ] **Step 5: Commit**

```bash
git add cti-hub/package.json cti-hub/pnpm-lock.yaml cti-hub/.env.example cti-hub/.gitignore
git commit -m "chore(visual-engine): add deps, env placeholders, gitignore for output dir"
```

---

### Task 0.2: Copy reference images into the repo

**Files:**
- Create: `cti-hub/public/brand/_refs/backdrop-night-port.png`
- Create: `cti-hub/public/brand/_refs/acheevy-canon.png`
- Create: `cti-hub/public/brand/_refs/chicken-hawk-gold-wings.png`
- Create: `cti-hub/public/brand/_refs/squad-illustrated.png`
- Create: `cti-hub/public/brand/_refs/squad-photoreal-port.png`
- Create: `cti-hub/public/brand/_refs/ang-boomerang-neon.png`
- Create: `cti-hub/public/brand/_refs/aims-style-alignment.png`
- Create: `cti-hub/public/brand/_refs/baseline-remedial-bird.png`

- [ ] **Step 1: Create the refs directory**

```bash
mkdir -p cti-hub/public/brand/_refs
```

- [ ] **Step 2: Copy the 8 reference images from iCloud Photos**

Run from the worktree root (Windows Git Bash / bash with `cp`):

```bash
REFS=cti-hub/public/brand/_refs
SRC="/c/Users/rishj/iCloudPhotos/Photos"

cp "$SRC/IMG_2036.JPG"                                                        "$REFS/backdrop-night-port.png"
cp "$SRC/Chicken Hawk.png"                                                    "$REFS/acheevy-canon.png"
cp "$SRC/chickenhawk_branded_armor_gold_1773866437145.png"                    "$REFS/chicken-hawk-gold-wings.png"
cp "$SRC/Chicken Hawk-Boomer_Angs-Lil_Hawks- SQUAD.png"                       "$REFS/squad-illustrated.png"
cp "$SRC/the squad.png"                                                       "$REFS/squad-photoreal-port.png"
cp "$SRC/939bbe32-f094-4749-8bcf-19cf24327550.png"                            "$REFS/ang-boomerang-neon.png"
cp "$SRC/2CE5EB2F-2420-4153-B7C7-DAC2C333FDAF.png"                            "$REFS/aims-style-alignment.png"
cp "$SRC/IMG_0751.PNG"                                                        "$REFS/baseline-remedial-bird.png"
```

Note: `backdrop-night-port.png` source is a `.JPG` extension but Next.js `next/image` handles it fine with the `.png` target name since file contents, not extension, drive rendering. If any downstream tool is extension-strict, re-encode: `sharp("$SRC/IMG_2036.JPG").png().toFile("$REFS/backdrop-night-port.png")`.

- [ ] **Step 3: Verify all 8 files exist and are non-empty**

```bash
ls -la cti-hub/public/brand/_refs/
```

Expected: 8 files listed, each with a non-zero byte count.

- [ ] **Step 4: Commit**

```bash
git add cti-hub/public/brand/_refs/
git commit -m "feat(visual-engine): commit 8 canonical reference images for Sqwaadrun visual language"
```

---

### Task 0.3: Create shared types module

**Files:**
- Create: `cti-hub/src/lib/visual-engine/models/types.ts`

- [ ] **Step 1: Create the types file**

Create `cti-hub/src/lib/visual-engine/models/types.ts`:

```typescript
/**
 * Shared types for the Visual Engine.
 *
 * These types form the contract between the engine orchestrator,
 * the preset registry, and the model adapters. No runtime imports —
 * pure type definitions only.
 */

export type SurfaceKind =
  | 'character-portrait'
  | 'scene-background'
  | 'ui-mockup'
  | 'generative-ui-runtime'
  | 'deck-or-doc'
  | 'diagram-or-infographic';

export type AdapterId =
  | 'recraft-v4'
  | 'ideogram-v3'
  | 'vertex-imagen-4'
  | 'fal-ai'
  | 'kie-ai'
  | 'vertex-nano-banana'
  | 'glm-image'
  | 'gpt-image';

export type AspectRatio = '1:1' | '4:5' | '3:4' | '16:9';

export interface RenderRequest {
  /** Fully-interpolated prompt — no {{var}} tokens remaining. */
  prompt: string;
  /** Negative prompt — things the model should avoid. */
  negativePrompt: string;
  /** Style anchor + backdrop anchor + any other reference PNGs, as raw bytes. 0-N allowed. */
  referenceImages?: Buffer[];
  aspect: AspectRatio;
  resolution: { w: number; h: number };
  /** Optional seed for reproducibility. */
  seed?: number;
}

export interface RenderResponse {
  /** Raw PNG bytes of the generated image. */
  png: Buffer;
  /** Internal-only adapter identifier. NEVER exposed to user-facing responses. */
  adapterId: AdapterId;
  /** Internal-only provider model string (e.g. "recraftv3"). NEVER exposed. */
  modelUsed: string;
  latencyMs: number;
  costUsd: number;
}

export interface ModelAdapter {
  id: AdapterId;
  /** Which surfaces this adapter can serve. */
  supportedSurfaces: SurfaceKind[];
  /** Whether the adapter accepts referenceImages in the RenderRequest. */
  supportsReferenceImages: boolean;
  /** Execute a single generation. Throws on failure — engine handles fallback. */
  render(req: RenderRequest): Promise<RenderResponse>;
}

/**
 * Sentinel error message prefix for stub adapters.
 * The engine fallback loop uses this exact prefix to silently skip
 * to the next adapter without logging the skip as a failure.
 */
export const ADAPTER_NOT_WIRED_PREFIX = 'ADAPTER_NOT_WIRED:';
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd cti-hub && pnpm tsc --noEmit
```

Expected: no errors relating to `src/lib/visual-engine/models/types.ts`.

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/lib/visual-engine/models/types.ts
git commit -m "feat(visual-engine): shared types for adapter contract"
```

---

## Phase 1 — Pure utilities

### Task 1.1: Template interpolation helper (TDD)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/interpolate.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/interpolate.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/interpolate.test.ts`:

```typescript
import { interpolate, InterpolationError } from '../interpolate';

describe('interpolate', () => {
  test('replaces single variable', () => {
    expect(interpolate('Hello {{name}}', { name: 'world' })).toBe('Hello world');
  });

  test('replaces multiple variables', () => {
    expect(
      interpolate('{{greet}} {{name}}, you have {{count}} messages', {
        greet: 'Hi',
        name: 'Rish',
        count: '3',
      }),
    ).toBe('Hi Rish, you have 3 messages');
  });

  test('replaces repeated variable', () => {
    expect(interpolate('{{x}} and {{x}}', { x: 'same' })).toBe('same and same');
  });

  test('joins array values with ", "', () => {
    expect(
      interpolate('Gear: {{gear}}', { gear: ['shield', 'helmet', 'vest'] }),
    ).toBe('Gear: shield, helmet, vest');
  });

  test('throws InterpolationError on missing variable', () => {
    expect(() => interpolate('Hello {{name}}', {})).toThrow(InterpolationError);
    expect(() => interpolate('Hello {{name}}', {})).toThrow(/name/);
  });

  test('leaves literal curly braces alone', () => {
    expect(interpolate('Object: { "key": "value" }', {})).toBe(
      'Object: { "key": "value" }',
    );
  });

  test('allows whitespace inside placeholder', () => {
    expect(interpolate('Hello {{ name }}', { name: 'world' })).toBe('Hello world');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- interpolate
```

Expected: FAIL with `Cannot find module '../interpolate'`.

- [ ] **Step 3: Implement `interpolate.ts`**

Create `cti-hub/src/lib/visual-engine/interpolate.ts`:

```typescript
/**
 * Minimal Mustache-style template expansion — `{{var}}` and `{{ var }}`.
 * No sections, no conditionals, no partials. YAGNI.
 *
 * Arrays are joined with ", ". Missing variables throw InterpolationError.
 */

export class InterpolationError extends Error {
  constructor(public readonly variableName: string) {
    super(`VISUAL_ENGINE_INVALID_VARS: missing variable "${variableName}"`);
    this.name = 'InterpolationError';
  }
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;

export function interpolate(
  template: string,
  vars: Record<string, string | string[]>,
): string {
  return template.replace(PLACEHOLDER, (_, name: string) => {
    if (!(name in vars)) {
      throw new InterpolationError(name);
    }
    const value = vars[name];
    return Array.isArray(value) ? value.join(', ') : value;
  });
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- interpolate
```

Expected: all 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/interpolate.ts cti-hub/src/lib/visual-engine/__tests__/interpolate.test.ts
git commit -m "feat(visual-engine): template interpolation helper with tests"
```

---

### Task 1.2: Preset type + loader + validator (TDD)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/presets/types.ts`
- Create: `cti-hub/src/lib/visual-engine/presets/index.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/presets.test.ts`

- [ ] **Step 1: Create the Preset type file**

Create `cti-hub/src/lib/visual-engine/presets/types.ts`:

```typescript
import type { AspectRatio, SurfaceKind } from '../models/types';

export interface PresetVariableSpec {
  type: 'string' | 'color' | 'array';
  required: boolean;
  description: string;
}

export interface PresetReferenceSpec {
  /** Path relative to cti-hub/public/brand/_refs/ */
  styleAnchor?: string;
  /** Path relative to cti-hub/public/brand/_refs/ */
  backdropAnchor?: string;
  /** Path to "avoid this" image. Concept is injected into negative prompt. */
  rejectReference?: string;
}

export interface Preset {
  id: string;
  version: string;
  description: string;
  surface: SurfaceKind;
  basePrompt: string;
  negativePrompt: string;
  composes?: string[];
  references: PresetReferenceSpec;
  aspect: AspectRatio;
  resolution: { w: number; h: number };
  candidatesDefault: number;
  variables: Record<string, PresetVariableSpec>;
  tags: string[];
}
```

- [ ] **Step 2: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/presets.test.ts`:

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
import { load, validateVars, PresetNotFoundError, PresetInvalidError } from '../presets';

const TMP_PRESETS_DIR = path.join(__dirname, '__fixtures__/presets');

beforeAll(async () => {
  await fs.mkdir(TMP_PRESETS_DIR, { recursive: true });
  await fs.writeFile(
    path.join(TMP_PRESETS_DIR, 'valid-preset.json'),
    JSON.stringify({
      id: 'valid-preset',
      version: '1.0.0',
      description: 'Test preset',
      surface: 'character-portrait',
      basePrompt: 'A {{subject}} on {{background}}',
      negativePrompt: 'blurry',
      references: {},
      aspect: '1:1',
      resolution: { w: 1024, h: 1024 },
      candidatesDefault: 3,
      variables: {
        subject: { type: 'string', required: true, description: 'Main subject' },
        background: { type: 'string', required: true, description: 'Scene' },
      },
      tags: ['test'],
    }),
  );
  await fs.writeFile(
    path.join(TMP_PRESETS_DIR, 'missing-fields.json'),
    JSON.stringify({ id: 'missing-fields' }),
  );
});

afterAll(async () => {
  await fs.rm(TMP_PRESETS_DIR, { recursive: true, force: true });
});

describe('presets.load', () => {
  test('loads valid preset', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(preset.id).toBe('valid-preset');
    expect(preset.surface).toBe('character-portrait');
    expect(preset.variables.subject.required).toBe(true);
  });

  test('throws PresetNotFoundError for missing file', async () => {
    await expect(load('nope', TMP_PRESETS_DIR)).rejects.toThrow(PresetNotFoundError);
  });

  test('throws PresetInvalidError for malformed preset', async () => {
    await expect(load('missing-fields', TMP_PRESETS_DIR)).rejects.toThrow(PresetInvalidError);
  });
});

describe('presets.validateVars', () => {
  test('passes when all required vars present', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(() => validateVars(preset, { subject: 'hawk', background: 'port' })).not.toThrow();
  });

  test('throws on missing required var', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(() => validateVars(preset, { subject: 'hawk' })).toThrow(/background/);
  });

  test('ignores extra vars', async () => {
    const preset = await load('valid-preset', TMP_PRESETS_DIR);
    expect(() =>
      validateVars(preset, { subject: 'hawk', background: 'port', extra: 'ignored' }),
    ).not.toThrow();
  });
});
```

- [ ] **Step 3: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- presets
```

Expected: FAIL with `Cannot find module '../presets'`.

- [ ] **Step 4: Implement the preset loader + validator**

Create `cti-hub/src/lib/visual-engine/presets/index.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Preset } from './types';
import type { SurfaceKind, AspectRatio } from '../models/types';

export class PresetNotFoundError extends Error {
  constructor(public readonly presetId: string, public readonly searchedIn: string) {
    super(`VISUAL_ENGINE_PRESET_NOT_FOUND: "${presetId}" in ${searchedIn}`);
    this.name = 'PresetNotFoundError';
  }
}

export class PresetInvalidError extends Error {
  constructor(public readonly presetId: string, public readonly reason: string) {
    super(`VISUAL_ENGINE_PRESET_INVALID: "${presetId}" — ${reason}`);
    this.name = 'PresetInvalidError';
  }
}

const VALID_SURFACES: SurfaceKind[] = [
  'character-portrait',
  'scene-background',
  'ui-mockup',
  'generative-ui-runtime',
  'deck-or-doc',
  'diagram-or-infographic',
];

const VALID_ASPECTS: AspectRatio[] = ['1:1', '4:5', '3:4', '16:9'];

function assertPreset(presetId: string, data: unknown): asserts data is Preset {
  if (typeof data !== 'object' || data === null) {
    throw new PresetInvalidError(presetId, 'not an object');
  }
  const p = data as Record<string, unknown>;
  const required = ['id', 'version', 'description', 'surface', 'basePrompt',
                    'negativePrompt', 'references', 'aspect', 'resolution',
                    'candidatesDefault', 'variables', 'tags'] as const;
  for (const field of required) {
    if (!(field in p)) {
      throw new PresetInvalidError(presetId, `missing field "${field}"`);
    }
  }
  if (p.id !== presetId) {
    throw new PresetInvalidError(presetId, `id mismatch: file id "${p.id}"`);
  }
  if (!VALID_SURFACES.includes(p.surface as SurfaceKind)) {
    throw new PresetInvalidError(presetId, `invalid surface "${p.surface}"`);
  }
  if (!VALID_ASPECTS.includes(p.aspect as AspectRatio)) {
    throw new PresetInvalidError(presetId, `invalid aspect "${p.aspect}"`);
  }
  if (typeof p.candidatesDefault !== 'number' || p.candidatesDefault < 1) {
    throw new PresetInvalidError(presetId, 'candidatesDefault must be a positive number');
  }
  const res = p.resolution as { w?: unknown; h?: unknown };
  if (typeof res?.w !== 'number' || typeof res?.h !== 'number') {
    throw new PresetInvalidError(presetId, 'resolution.w and resolution.h must be numbers');
  }
}

/**
 * Default preset directory — resolves to cti-hub/src/lib/visual-engine/presets/
 * when running from the cti-hub root (which is how Next.js + scripts run).
 */
const DEFAULT_PRESETS_DIR = path.join(process.cwd(), 'src/lib/visual-engine/presets');

export async function load(presetId: string, dir: string = DEFAULT_PRESETS_DIR): Promise<Preset> {
  const filePath = path.join(dir, `${presetId}.json`);
  let raw: string;
  try {
    raw = await fs.readFile(filePath, 'utf8');
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new PresetNotFoundError(presetId, dir);
    }
    throw err;
  }

  let data: unknown;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw new PresetInvalidError(presetId, `JSON parse error: ${(err as Error).message}`);
  }

  assertPreset(presetId, data);
  return data;
}

export function validateVars(
  preset: Preset,
  vars: Record<string, string | string[]>,
): void {
  const missing: string[] = [];
  for (const [name, spec] of Object.entries(preset.variables)) {
    if (spec.required && !(name in vars)) {
      missing.push(name);
    }
  }
  if (missing.length > 0) {
    throw new PresetInvalidError(
      preset.id,
      `missing required variables: ${missing.join(', ')}`,
    );
  }
}

export type { Preset, PresetVariableSpec, PresetReferenceSpec } from './types';
```

- [ ] **Step 5: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- presets
```

Expected: all 6 tests PASS.

- [ ] **Step 6: Commit**

```bash
git add cti-hub/src/lib/visual-engine/presets/ cti-hub/src/lib/visual-engine/__tests__/presets.test.ts
git commit -m "feat(visual-engine): preset type + loader + validator with tests"
```

---

### Task 1.3: Write the 5 preset JSON files

**Files:**
- Create: `cti-hub/src/lib/visual-engine/presets/sqwaadrun-backdrop.json`
- Create: `cti-hub/src/lib/visual-engine/presets/sqwaadrun-lil-hawk.json`
- Create: `cti-hub/src/lib/visual-engine/presets/chicken-hawk-dispatcher.json`
- Create: `cti-hub/src/lib/visual-engine/presets/boomer-ang-supervisor.json`
- Create: `cti-hub/src/lib/visual-engine/presets/acheevy-digital-ceo.json`

- [ ] **Step 1: Create `sqwaadrun-backdrop.json`**

```json
{
  "id": "sqwaadrun-backdrop",
  "version": "1.0.0",
  "description": "Night port environment — shared backdrop for every Sqwaadrun render. Used as a compose input by character presets.",
  "surface": "scene-background",
  "basePrompt": "A cinematic night port scene: towering container cranes silhouetted against a deep navy sky, stacked shipping containers with glowing blue circuit-trace patterns and amber accent lights, reflective wet pavement catching the container glow, a tall illuminated control tower on the right edge, distant city lights faintly visible on the horizon. Dramatic broadcast-grade lighting, high detail, photographic atmosphere. No characters, no text, no logos.",
  "negativePrompt": "daytime, sunny, bright, people, characters, text, watermark, cartoon, simple, flat, remedial, low quality, blurry, oversaturated, cliche generic port",
  "references": {
    "backdropAnchor": "backdrop-night-port.png"
  },
  "aspect": "16:9",
  "resolution": { "w": 1920, "h": 1080 },
  "candidatesDefault": 1,
  "variables": {},
  "tags": ["sqwaadrun", "backdrop", "scene"]
}
```

- [ ] **Step 2: Create `sqwaadrun-lil-hawk.json`**

```json
{
  "id": "sqwaadrun-lil-hawk",
  "version": "1.0.0",
  "description": "Chibi armored Lil_Hawk operator standing on the Sqwaadrun night port. Per-character variables inject callsign, role, rim color, and gear. Style-locked via sqwaadrun-lil-hawk-anchor.png so all 17 renders feel like one squad.",
  "surface": "character-portrait",
  "basePrompt": "A chibi-proportioned armored hawk operator named {{callsign}}, the {{role}}. Standing in a confident {{stance}} pose on the reflective wet pavement of the Sqwaadrun night port. Wearing articulated combat armor with rim lighting in the signature color {{rimColor}} catching every edge of the plating. Equipped with: {{gearList}}. The night port is behind: container cranes, stacked shipping containers with faint blue circuit-trace glow, distant control tower. Dramatic cinematic broadcast-grade illustration, high detail, painterly lighting, the character is the clear focal point with the port softened behind. The character is NOT a simple cartoon bird — it is a detailed chibi-proportioned armored operator with visible mechanical gear, professional lighting, and serious presence. Rim light color {{rimColor}} dominates the character silhouette.",
  "negativePrompt": "simple cartoon bird, angry bird, fists up, plain white background, flat shading, no gear, no armor, remedial, low quality, blurry, text, watermark, signature, human face, adult bird, realistic photographic bird, childish",
  "references": {
    "styleAnchor": "sqwaadrun-lil-hawk-anchor.png",
    "backdropAnchor": "backdrop-night-port.png",
    "rejectReference": "baseline-remedial-bird.png"
  },
  "aspect": "4:5",
  "resolution": { "w": 1024, "h": 1280 },
  "candidatesDefault": 3,
  "variables": {
    "callsign": {
      "type": "string",
      "required": true,
      "description": "Character callsign, e.g. Lil_Guard_Hawk"
    },
    "role": {
      "type": "string",
      "required": true,
      "description": "Role archetype phrase, e.g. 'defensive gatekeeper'"
    },
    "rimColor": {
      "type": "color",
      "required": true,
      "description": "Hex color for armor rim lighting, e.g. #DC2626"
    },
    "gearList": {
      "type": "array",
      "required": true,
      "description": "Array of gear items from characters.ts, joined into the prompt"
    },
    "stance": {
      "type": "string",
      "required": true,
      "description": "Pose language, e.g. 'arms crossed', 'ready stance', 'weapon drawn'"
    }
  },
  "tags": ["sqwaadrun", "lil-hawk", "character"]
}
```

- [ ] **Step 3: Create `chicken-hawk-dispatcher.json`**

```json
{
  "id": "chicken-hawk-dispatcher",
  "version": "1.0.0",
  "description": "Chicken_Hawk — the dispatcher. Gold-armored mech with mechanical eagle wings spread, standing at the Sqwaadrun night port. Canonical visual locked by chicken-hawk-gold-wings.png reference.",
  "surface": "character-portrait",
  "basePrompt": "Chicken_Hawk, the Sqwaadrun dispatcher: a massive humanoid hawk mech in burnished gold armor with intricate mechanical eagle wings fully spread behind, hawk-beak helmet, glowing orange chest reactor core, standing on a steel platform at the Sqwaadrun night port. A.I.M.S. shipping containers stacked in the background, tall container cranes overhead with cyan running lights, reflective wet pavement, deep navy sky. Dramatic cinematic broadcast-grade illustration, heroic low-angle perspective, painterly lighting, the mech dominates the frame with commanding presence.",
  "negativePrompt": "chibi, small, cute, cartoon, simple, flat, silver armor, red armor, bird on its own, no wings, daytime, text, watermark, remedial, low quality",
  "references": {
    "styleAnchor": "chicken-hawk-gold-wings.png",
    "backdropAnchor": "backdrop-night-port.png"
  },
  "aspect": "4:5",
  "resolution": { "w": 1024, "h": 1280 },
  "candidatesDefault": 3,
  "variables": {},
  "tags": ["sqwaadrun", "command-tier", "dispatcher", "chicken-hawk"]
}
```

- [ ] **Step 4: Create `boomer-ang-supervisor.json`**

```json
{
  "id": "boomer-ang-supervisor",
  "version": "1.0.0",
  "description": "Boomer_Ang supervisor — tan tactical coat with ANG chest patch, full black visored helmet obscuring face, arms crossed in command stance. Used for General_Ang and future Boomer_Angs.",
  "surface": "character-portrait",
  "basePrompt": "{{callsign}}, a Boomer_Ang supervisor: standing at the Sqwaadrun night port, wearing a tan tactical coat with brass-button collar and a prominent rectangular chest patch reading '{{patchText}}', full black helmet with a dark reflective visor fully obscuring the face. Arms crossed in a commanding stance, shoulders squared. Backdrop is the night port: container cranes, stacked A.I.M.S. containers with faint circuit glow, reflective wet pavement, deep navy sky. Dramatic cinematic broadcast-grade illustration, painterly lighting, the character fills the center of the frame with authoritative presence. Skin tone: dark-skinned Black person. The visor completely hides the face — no facial features visible.",
  "negativePrompt": "visible face, no visor, light skin, cartoon, chibi, childish, bird, feathers, wings, small, text on the coat other than the patch, remedial, low quality, blurry, watermark, signature",
  "references": {
    "styleAnchor": "squad-illustrated.png",
    "backdropAnchor": "backdrop-night-port.png"
  },
  "aspect": "4:5",
  "resolution": { "w": 1024, "h": 1280 },
  "candidatesDefault": 3,
  "variables": {
    "callsign": {
      "type": "string",
      "required": true,
      "description": "Boomer_Ang callsign, e.g. General_Ang"
    },
    "patchText": {
      "type": "string",
      "required": true,
      "description": "Text on the chest patch, e.g. 'ANG' or 'GEN'"
    }
  },
  "tags": ["sqwaadrun", "command-tier", "supervisor", "boomer-ang"]
}
```

- [ ] **Step 5: Create `acheevy-digital-ceo.json`**

```json
{
  "id": "acheevy-digital-ceo",
  "version": "1.0.0",
  "description": "ACHEEVY, the Digital CEO. Tan wool jacket, black dark hoodie, camo pants, full black helmet with warm orange reflective visor fully obscuring the face. The Leader — renders to public/brand/_refs/ not public/hawks/.",
  "surface": "character-portrait",
  "basePrompt": "ACHEEVY, the Digital CEO of the ACHIEVEMOR platform: standing confidently in {{setting}}, wearing a high-quality tan wool jacket over a black hoodie, camouflage cargo pants, tactical boots, black tactical gloves. Full matte-black helmet with a {{visorColor}} warm reflective visor completely obscuring the face — no facial features visible. Arms relaxed at sides or one hand in pocket. Modern upscale environment framing, dramatic painterly lighting from floor-to-ceiling windows, cinematic broadcast-grade illustration. Commanding quiet authority, understated power, the leader energy without theatrics. The visor glows with a subtle warm light.",
  "negativePrompt": "visible face, no visor, cartoon, chibi, childish, bird, feathers, wings, plain white background, remedial, low quality, blurry, watermark, signature, cheap suit, cheap jacket, corporate stock photo energy",
  "references": {
    "styleAnchor": "acheevy-canon.png"
  },
  "aspect": "4:5",
  "resolution": { "w": 1024, "h": 1280 },
  "candidatesDefault": 3,
  "variables": {
    "visorColor": {
      "type": "string",
      "required": true,
      "description": "Warm reflective visor color phrase, e.g. 'warm orange', 'golden amber'"
    },
    "setting": {
      "type": "string",
      "required": true,
      "description": "Environment phrase, e.g. 'a modern penthouse studio with floor-to-ceiling city views'"
    }
  },
  "tags": ["achievemor", "digital-ceo", "acheevy", "leader"]
}
```

- [ ] **Step 6: Verify all 5 preset files parse as valid presets**

Run an ad-hoc verification using the loader:

```bash
cd cti-hub && node --experimental-strip-types -e "
import { load } from './src/lib/visual-engine/presets/index.ts';
const ids = ['sqwaadrun-backdrop', 'sqwaadrun-lil-hawk', 'chicken-hawk-dispatcher', 'boomer-ang-supervisor', 'acheevy-digital-ceo'];
for (const id of ids) {
  const p = await load(id);
  console.log(id, '→ surface:', p.surface, 'candidatesDefault:', p.candidatesDefault);
}
"
```

Expected: 5 lines of output listing each preset with its surface + candidate count. No errors.

- [ ] **Step 7: Commit**

```bash
git add cti-hub/src/lib/visual-engine/presets/*.json
git commit -m "feat(visual-engine): 5 Sqwaadrun presets (backdrop, lil-hawk, chicken-hawk, boomer-ang, acheevy)"
```

---

## Phase 2 — Model adapters

### Task 2.1: Recraft V4 adapter (fully wired)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/models/recraft-v4.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/recraft-v4.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/recraft-v4.test.ts`:

```typescript
import { MockAgent, setGlobalDispatcher } from 'undici';
import { recraftV4 } from '../models/recraft-v4';

let mockAgent: MockAgent;

beforeEach(() => {
  process.env.RECRAFT_API_KEY = 'test-key';
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  delete process.env.RECRAFT_API_KEY;
});

describe('recraft-v4 adapter', () => {
  test('has correct metadata', () => {
    expect(recraftV4.id).toBe('recraft-v4');
    expect(recraftV4.supportedSurfaces).toContain('character-portrait');
    expect(recraftV4.supportedSurfaces).toContain('scene-background');
    expect(recraftV4.supportsReferenceImages).toBe(true);
  });

  test('throws when RECRAFT_API_KEY is missing', async () => {
    delete process.env.RECRAFT_API_KEY;
    await expect(
      recraftV4.render({
        prompt: 'test',
        negativePrompt: '',
        aspect: '1:1',
        resolution: { w: 1024, h: 1024 },
      }),
    ).rejects.toThrow(/RECRAFT_API_KEY/);
  });

  test('successful render returns PNG buffer', async () => {
    const pool = mockAgent.get('https://external.api.recraft.ai');
    // Step 1: generations call returns URL
    pool.intercept({
      path: '/v1/images/generations',
      method: 'POST',
    }).reply(200, {
      created: Date.now(),
      data: [{ url: 'https://cdn.recraft.ai/out/abc123.png' }],
    });
    // Step 2: fetching the image URL returns PNG bytes
    const cdnPool = mockAgent.get('https://cdn.recraft.ai');
    cdnPool.intercept({
      path: '/out/abc123.png',
      method: 'GET',
    }).reply(200, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
      headers: { 'content-type': 'image/png' },
    });

    const res = await recraftV4.render({
      prompt: 'test prompt',
      negativePrompt: 'no cartoons',
      aspect: '1:1',
      resolution: { w: 1024, h: 1024 },
    });

    expect(res.adapterId).toBe('recraft-v4');
    expect(Buffer.isBuffer(res.png)).toBe(true);
    expect(res.png.slice(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    expect(res.latencyMs).toBeGreaterThanOrEqual(0);
  });

  test('throws on non-200 response', async () => {
    const pool = mockAgent.get('https://external.api.recraft.ai');
    pool.intercept({
      path: '/v1/images/generations',
      method: 'POST',
    }).reply(429, { error: 'Rate limited' });

    await expect(
      recraftV4.render({
        prompt: 'test',
        negativePrompt: '',
        aspect: '1:1',
        resolution: { w: 1024, h: 1024 },
      }),
    ).rejects.toThrow(/429/);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- recraft-v4
```

Expected: FAIL with `Cannot find module '../models/recraft-v4'`.

- [ ] **Step 3: Implement the Recraft V4 adapter**

Create `cti-hub/src/lib/visual-engine/models/recraft-v4.ts`:

```typescript
import type { ModelAdapter, RenderRequest, RenderResponse, AspectRatio } from './types';

const RECRAFT_BASE_URL = 'https://external.api.recraft.ai/v1';

/**
 * Map our internal AspectRatio to a Recraft size string.
 * Recraft accepts e.g. "1024x1024", "1024x1365", etc.
 */
function toSize(res: { w: number; h: number }): string {
  return `${res.w}x${res.h}`;
}

/**
 * Recraft V4 adapter — primary for character-portrait and scene-background.
 *
 * IMPORTANT: the internal string "recraft" never appears in any error, log,
 * or response field exposed to a user. Audit fields are server-side only.
 *
 * API docs: https://www.recraft.ai/docs
 * If the reference-image / style parameter shape differs from what this adapter
 * assumes, adjust the request body in `render()` — the rest of the adapter
 * (auth, error handling, fetch-the-URL flow) stays the same.
 */
export const recraftV4: ModelAdapter = {
  id: 'recraft-v4',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,

  async render(req: RenderRequest): Promise<RenderResponse> {
    const apiKey = process.env.RECRAFT_API_KEY;
    if (!apiKey) {
      throw new Error('VISUAL_ENGINE_ADAPTER_ERROR: RECRAFT_API_KEY not set');
    }

    const startedAt = Date.now();

    // Build the generations request.
    // NOTE: Recraft currently exposes style control via `style` (category) and
    // optionally `style_id` (uploaded custom style). When we have a reference
    // image, we upload it as a style via /styles first and pass the returned id.
    // For the first-pass adapter, we send reference images as base64 in a
    // controls.reference_image field. Verify the exact parameter name against
    // current Recraft docs — if the field name differs, adjust the body
    // builder below without touching the rest of this adapter.
    const body: Record<string, unknown> = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      model: 'recraftv3',
      style: 'digital_illustration',
      size: toSize(req.resolution),
      response_format: 'url',
      n: 1,
    };

    if (req.referenceImages && req.referenceImages.length > 0) {
      body.controls = {
        reference_image: req.referenceImages[0].toString('base64'),
      };
    }

    const genResponse = await fetch(`${RECRAFT_BASE_URL}/images/generations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!genResponse.ok) {
      const text = await genResponse.text().catch(() => '');
      throw new Error(
        `VISUAL_ENGINE_ADAPTER_ERROR: upstream HTTP ${genResponse.status} — ${text.slice(0, 200)}`,
      );
    }

    const payload = (await genResponse.json()) as { data?: Array<{ url?: string; b64_json?: string }> };
    const first = payload.data?.[0];
    if (!first) {
      throw new Error('VISUAL_ENGINE_ADAPTER_ERROR: upstream returned empty data array');
    }

    let pngBytes: Buffer;
    if (first.b64_json) {
      pngBytes = Buffer.from(first.b64_json, 'base64');
    } else if (first.url) {
      const imgResponse = await fetch(first.url);
      if (!imgResponse.ok) {
        throw new Error(
          `VISUAL_ENGINE_ADAPTER_ERROR: failed to fetch result URL (HTTP ${imgResponse.status})`,
        );
      }
      pngBytes = Buffer.from(await imgResponse.arrayBuffer());
    } else {
      throw new Error('VISUAL_ENGINE_ADAPTER_ERROR: upstream data item has neither url nor b64_json');
    }

    return {
      png: pngBytes,
      adapterId: 'recraft-v4',
      modelUsed: 'recraftv3',
      latencyMs: Date.now() - startedAt,
      costUsd: 0.04,
    };
  },
};
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- recraft-v4
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/models/recraft-v4.ts cti-hub/src/lib/visual-engine/__tests__/recraft-v4.test.ts
git commit -m "feat(visual-engine): Recraft V4 adapter — primary for character-portrait + scene-background"
```

---

### Task 2.2: Ideogram V3 adapter (fully wired)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/models/ideogram-v3.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/ideogram-v3.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/ideogram-v3.test.ts`:

```typescript
import { MockAgent, setGlobalDispatcher } from 'undici';
import { ideogramV3 } from '../models/ideogram-v3';

let mockAgent: MockAgent;

beforeEach(() => {
  process.env.IDEOGRAM_API_KEY = 'test-key';
  mockAgent = new MockAgent();
  mockAgent.disableNetConnect();
  setGlobalDispatcher(mockAgent);
});

afterEach(async () => {
  await mockAgent.close();
  delete process.env.IDEOGRAM_API_KEY;
});

describe('ideogram-v3 adapter', () => {
  test('has correct metadata', () => {
    expect(ideogramV3.id).toBe('ideogram-v3');
    expect(ideogramV3.supportedSurfaces).toContain('character-portrait');
    expect(ideogramV3.supportsReferenceImages).toBe(true);
  });

  test('throws when IDEOGRAM_API_KEY missing', async () => {
    delete process.env.IDEOGRAM_API_KEY;
    await expect(
      ideogramV3.render({
        prompt: 'test',
        negativePrompt: '',
        aspect: '1:1',
        resolution: { w: 1024, h: 1024 },
      }),
    ).rejects.toThrow(/IDEOGRAM_API_KEY/);
  });

  test('successful render returns PNG buffer', async () => {
    const pool = mockAgent.get('https://api.ideogram.ai');
    pool.intercept({
      path: '/generate',
      method: 'POST',
    }).reply(200, {
      created: Date.now(),
      data: [{ url: 'https://cdn.ideogram.ai/out/xyz789.png', is_image_safe: true }],
    });

    const cdnPool = mockAgent.get('https://cdn.ideogram.ai');
    cdnPool.intercept({
      path: '/out/xyz789.png',
      method: 'GET',
    }).reply(200, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), {
      headers: { 'content-type': 'image/png' },
    });

    const res = await ideogramV3.render({
      prompt: 'chibi armored hawk',
      negativePrompt: 'cartoon bird',
      aspect: '4:5',
      resolution: { w: 1024, h: 1280 },
    });

    expect(res.adapterId).toBe('ideogram-v3');
    expect(Buffer.isBuffer(res.png)).toBe(true);
  });

  test('throws on non-200', async () => {
    const pool = mockAgent.get('https://api.ideogram.ai');
    pool.intercept({ path: '/generate', method: 'POST' }).reply(500, { error: 'oops' });

    await expect(
      ideogramV3.render({
        prompt: 'test',
        negativePrompt: '',
        aspect: '1:1',
        resolution: { w: 1024, h: 1024 },
      }),
    ).rejects.toThrow(/500/);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- ideogram-v3
```

Expected: FAIL.

- [ ] **Step 3: Implement the Ideogram V3 adapter**

Create `cti-hub/src/lib/visual-engine/models/ideogram-v3.ts`:

```typescript
import type { ModelAdapter, RenderRequest, RenderResponse, AspectRatio } from './types';

const IDEOGRAM_BASE_URL = 'https://api.ideogram.ai';

/**
 * Map our internal AspectRatio to Ideogram's aspect_ratio enum.
 */
function toIdeogramAspect(a: AspectRatio): string {
  switch (a) {
    case '1:1':  return 'ASPECT_1_1';
    case '4:5':  return 'ASPECT_4_5';
    case '3:4':  return 'ASPECT_3_4';
    case '16:9': return 'ASPECT_16_9';
  }
}

/**
 * Ideogram V3 adapter — fallback 1 for character-portrait + scene-background.
 *
 * Docs: https://developer.ideogram.ai/
 * Reference image via character_reference_images multipart field (verify against
 * current docs if the request fails with a 400).
 */
export const ideogramV3: ModelAdapter = {
  id: 'ideogram-v3',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,

  async render(req: RenderRequest): Promise<RenderResponse> {
    const apiKey = process.env.IDEOGRAM_API_KEY;
    if (!apiKey) {
      throw new Error('VISUAL_ENGINE_ADAPTER_ERROR: IDEOGRAM_API_KEY not set');
    }

    const startedAt = Date.now();

    const imageRequest = {
      prompt: req.prompt,
      negative_prompt: req.negativePrompt,
      model: 'V_3',
      aspect_ratio: toIdeogramAspect(req.aspect),
      magic_prompt_option: 'OFF',
    };

    const form = new FormData();
    form.append('image_request', JSON.stringify(imageRequest));

    if (req.referenceImages && req.referenceImages.length > 0) {
      for (const refBuf of req.referenceImages.slice(0, 3)) {
        form.append(
          'character_reference_images',
          new Blob([refBuf], { type: 'image/png' }),
          'ref.png',
        );
      }
    }

    const genResponse = await fetch(`${IDEOGRAM_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Api-Key': apiKey,
      },
      body: form,
    });

    if (!genResponse.ok) {
      const text = await genResponse.text().catch(() => '');
      throw new Error(
        `VISUAL_ENGINE_ADAPTER_ERROR: upstream HTTP ${genResponse.status} — ${text.slice(0, 200)}`,
      );
    }

    const payload = (await genResponse.json()) as { data?: Array<{ url?: string; is_image_safe?: boolean }> };
    const first = payload.data?.[0];
    if (!first?.url) {
      throw new Error('VISUAL_ENGINE_ADAPTER_ERROR: upstream returned no image URL');
    }

    const imgResponse = await fetch(first.url);
    if (!imgResponse.ok) {
      throw new Error(
        `VISUAL_ENGINE_ADAPTER_ERROR: failed to fetch result URL (HTTP ${imgResponse.status})`,
      );
    }
    const pngBytes = Buffer.from(await imgResponse.arrayBuffer());

    return {
      png: pngBytes,
      adapterId: 'ideogram-v3',
      modelUsed: 'V_3',
      latencyMs: Date.now() - startedAt,
      costUsd: 0.08,
    };
  },
};
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- ideogram-v3
```

Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/models/ideogram-v3.ts cti-hub/src/lib/visual-engine/__tests__/ideogram-v3.test.ts
git commit -m "feat(visual-engine): Ideogram V3 adapter — fallback 1 for character-portrait + scene-background"
```

---

### Task 2.3: Six stub adapters in a single pass

**Files:**
- Create: `cti-hub/src/lib/visual-engine/models/vertex-imagen-4-stub.ts`
- Create: `cti-hub/src/lib/visual-engine/models/fal-ai-stub.ts`
- Create: `cti-hub/src/lib/visual-engine/models/kie-ai-stub.ts`
- Create: `cti-hub/src/lib/visual-engine/models/vertex-nano-banana-stub.ts`
- Create: `cti-hub/src/lib/visual-engine/models/glm-image-stub.ts`
- Create: `cti-hub/src/lib/visual-engine/models/gpt-image-stub.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/stubs.test.ts`

- [ ] **Step 1: Create `vertex-imagen-4-stub.ts`**

```typescript
import type { ModelAdapter } from './types';
import { ADAPTER_NOT_WIRED_PREFIX } from './types';

/**
 * Vertex AI Imagen 4 — STUB.
 * Wire via @google-cloud/vertexai when a consumer needs it.
 *
 * Project: foai-aims  |  Location: us-central1  |  Model: imagen-4.0-generate-001
 * Auth: ADC locally (`gcloud auth application-default login`) or service-account binding on Cloud Run
 * Reference images: Vertex Imagen supports up to 4 via the `referenceImages` parameter
 * Negative prompt: Vertex supports `negativePrompt` field directly
 *
 * When wiring: add `@google-cloud/vertexai` to deps, replace the throw with
 * a real GenerativeModel.generateImages() call, set modelUsed accordingly.
 */
export const vertexImagen4Stub: ModelAdapter = {
  id: 'vertex-imagen-4',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} vertex-imagen-4`);
  },
};
```

- [ ] **Step 2: Create `fal-ai-stub.ts`**

```typescript
import type { ModelAdapter } from './types';
import { ADAPTER_NOT_WIRED_PREFIX } from './types';

/**
 * fal.ai gateway — STUB.
 * Gateway to Flux Ultra, Recraft, Seedance, Kling, and others.
 *
 * Env: FAL_API_KEY
 * Docs: https://fal.ai/docs
 * Preferred model for character-portrait via fal.ai: fal-ai/flux-pro/v1.1-ultra
 * with `image_prompt` for reference image conditioning.
 */
export const falAiStub: ModelAdapter = {
  id: 'fal-ai',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} fal-ai`);
  },
};
```

- [ ] **Step 3: Create `kie-ai-stub.ts`**

```typescript
import type { ModelAdapter } from './types';
import { ADAPTER_NOT_WIRED_PREFIX } from './types';

/**
 * Kie.ai gateway — STUB.
 * Cheaper multi-model gateway. Access to Veo 3.1, Sora 2, Runway Aleph, etc.
 *
 * Env: KIE_API_KEY
 * Docs: https://kie.ai/docs
 * Preferred model for character-portrait via Kie: flux-pro-1.1-ultra or ideogram-v3
 */
export const kieAiStub: ModelAdapter = {
  id: 'kie-ai',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} kie-ai`);
  },
};
```

- [ ] **Step 4: Create `vertex-nano-banana-stub.ts`**

```typescript
import type { ModelAdapter } from './types';
import { ADAPTER_NOT_WIRED_PREFIX } from './types';

/**
 * Vertex AI Gemini Nano Banana Pro 2 (image gen) — STUB.
 * Google's Gemini image gen, accessed via Vertex AI — NOT AI Studio.
 *
 * Project: foai-aims  |  Location: us-central1
 * Model: gemini-3.1-flash-image-preview OR gemini-3-pro-image-preview
 * Auth: ADC / service-account binding (same as vertex-imagen-4)
 * Reference images: passed via inlineData parts in the generateContent request
 */
export const vertexNanoBananaStub: ModelAdapter = {
  id: 'vertex-nano-banana',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} vertex-nano-banana`);
  },
};
```

- [ ] **Step 5: Create `glm-image-stub.ts`**

```typescript
import type { ModelAdapter } from './types';
import { ADAPTER_NOT_WIRED_PREFIX } from './types';

/**
 * Zhipu GLM Image — STUB.
 *
 * IMPORTANT: NO dedicated GLM_API_KEY. Routes via OpenRouter.
 * Env: OPENROUTER_API_KEY (already exists in env)
 * OpenRouter model id: `z-ai/glm-4.6v` or the current image-capable GLM model
 *
 * When wiring, POST to https://openrouter.ai/api/v1/chat/completions with the
 * model id above and reference images as inlineData. Verify OpenRouter's
 * current GLM image-gen support — the model catalog changes.
 */
export const glmImageStub: ModelAdapter = {
  id: 'glm-image',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} glm-image`);
  },
};
```

- [ ] **Step 6: Create `gpt-image-stub.ts`**

```typescript
import type { ModelAdapter } from './types';
import { ADAPTER_NOT_WIRED_PREFIX } from './types';

/**
 * OpenAI gpt-image-1 — STUB. Last resort in the character-portrait chain.
 *
 * Env: OPENAI_API_KEY (or via OPENROUTER_API_KEY with model `openai/gpt-image-1`)
 * Endpoint: https://api.openai.com/v1/images/generations (or OpenRouter equivalent)
 * Reference images: supported via `image` parameter on the /edits endpoint
 */
export const gptImageStub: ModelAdapter = {
  id: 'gpt-image',
  supportedSurfaces: ['character-portrait', 'scene-background'],
  supportsReferenceImages: true,
  async render() {
    throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} gpt-image`);
  },
};
```

- [ ] **Step 7: Write stub sanity tests**

Create `cti-hub/src/lib/visual-engine/__tests__/stubs.test.ts`:

```typescript
import { vertexImagen4Stub } from '../models/vertex-imagen-4-stub';
import { falAiStub } from '../models/fal-ai-stub';
import { kieAiStub } from '../models/kie-ai-stub';
import { vertexNanoBananaStub } from '../models/vertex-nano-banana-stub';
import { glmImageStub } from '../models/glm-image-stub';
import { gptImageStub } from '../models/gpt-image-stub';
import { ADAPTER_NOT_WIRED_PREFIX } from '../models/types';

const STUBS = [
  { id: 'vertex-imagen-4',    adapter: vertexImagen4Stub },
  { id: 'fal-ai',             adapter: falAiStub },
  { id: 'kie-ai',             adapter: kieAiStub },
  { id: 'vertex-nano-banana', adapter: vertexNanoBananaStub },
  { id: 'glm-image',          adapter: glmImageStub },
  { id: 'gpt-image',          adapter: gptImageStub },
];

describe('stub adapters', () => {
  for (const { id, adapter } of STUBS) {
    describe(id, () => {
      test('has correct id', () => {
        expect(adapter.id).toBe(id);
      });

      test('declares supported surfaces', () => {
        expect(adapter.supportedSurfaces.length).toBeGreaterThan(0);
      });

      test('render() throws ADAPTER_NOT_WIRED error', async () => {
        await expect(adapter.render({
          prompt: 'test',
          negativePrompt: '',
          aspect: '1:1',
          resolution: { w: 1024, h: 1024 },
        })).rejects.toThrow(new RegExp(`^${ADAPTER_NOT_WIRED_PREFIX} ${id}$`));
      });
    });
  }
});
```

- [ ] **Step 8: Run stub tests — expect pass**

```bash
cd cti-hub && pnpm test -- stubs
```

Expected: 18 tests PASS (6 stubs × 3 assertions).

- [ ] **Step 9: Commit**

```bash
git add cti-hub/src/lib/visual-engine/models/*-stub.ts cti-hub/src/lib/visual-engine/__tests__/stubs.test.ts
git commit -m "feat(visual-engine): 6 stub adapters (vertex-imagen, fal, kie, nano-banana, glm, gpt-image)"
```

---

### Task 2.4: Adapter registry + surface chains

**Files:**
- Create: `cti-hub/src/lib/visual-engine/models/registry.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/registry.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/registry.test.ts`:

```typescript
import { getAdapterChain, getAdapter } from '../models/registry';

describe('registry.getAdapterChain', () => {
  test('character-portrait chain starts with recraft-v4', () => {
    const chain = getAdapterChain('character-portrait');
    expect(chain[0].id).toBe('recraft-v4');
  });

  test('character-portrait chain has ideogram-v3 second', () => {
    const chain = getAdapterChain('character-portrait');
    expect(chain[1].id).toBe('ideogram-v3');
  });

  test('character-portrait chain has 8 adapters', () => {
    const chain = getAdapterChain('character-portrait');
    expect(chain).toHaveLength(8);
  });

  test('scene-background chain matches character-portrait chain', () => {
    const charChain = getAdapterChain('character-portrait').map((a) => a.id);
    const sceneChain = getAdapterChain('scene-background').map((a) => a.id);
    expect(sceneChain).toEqual(charChain);
  });

  test('ui-mockup throws VISUAL_ENGINE_NO_CHAIN (deferred surface)', () => {
    expect(() => getAdapterChain('ui-mockup')).toThrow(/VISUAL_ENGINE_NO_CHAIN/);
  });

  test('generative-ui-runtime throws VISUAL_ENGINE_NO_CHAIN', () => {
    expect(() => getAdapterChain('generative-ui-runtime')).toThrow(/VISUAL_ENGINE_NO_CHAIN/);
  });
});

describe('registry.getAdapter', () => {
  test('returns adapter by id', () => {
    expect(getAdapter('recraft-v4').id).toBe('recraft-v4');
    expect(getAdapter('glm-image').id).toBe('glm-image');
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- registry
```

Expected: FAIL.

- [ ] **Step 3: Implement the registry**

Create `cti-hub/src/lib/visual-engine/models/registry.ts`:

```typescript
import type { AdapterId, ModelAdapter, SurfaceKind } from './types';
import { recraftV4 } from './recraft-v4';
import { ideogramV3 } from './ideogram-v3';
import { vertexImagen4Stub } from './vertex-imagen-4-stub';
import { falAiStub } from './fal-ai-stub';
import { kieAiStub } from './kie-ai-stub';
import { vertexNanoBananaStub } from './vertex-nano-banana-stub';
import { glmImageStub } from './glm-image-stub';
import { gptImageStub } from './gpt-image-stub';

/**
 * Single registry — every adapter, real or stubbed, lives here.
 * Adding a new adapter: add the import + an entry to ALL_ADAPTERS +
 * (optionally) slot it into one or more SURFACE_CHAINS entries.
 */
const ALL_ADAPTERS: Record<AdapterId, ModelAdapter> = {
  'recraft-v4':         recraftV4,
  'ideogram-v3':        ideogramV3,
  'vertex-imagen-4':    vertexImagen4Stub,
  'fal-ai':             falAiStub,
  'kie-ai':             kieAiStub,
  'vertex-nano-banana': vertexNanoBananaStub,
  'glm-image':          glmImageStub,
  'gpt-image':          gptImageStub,
};

/**
 * Canonical routing chains per surface, derived from memory line 6
 * (project_design_routing.md) + feedback_consult_design_routing_first.md.
 *
 * For character-portrait and scene-background specifically, the effective
 * order after skipping non-image-gen design tools (C1, Stitch, Gamma, Napkin)
 * is: Recraft → Ideogram → Imagen 4 → fal.ai → Kie.ai → Nano Banana → GLM → GPT Image.
 *
 * Deferred surfaces have empty chains; getAdapterChain() throws a clear
 * error for them so future work fails fast instead of silently no-op-ing.
 */
const SURFACE_CHAINS: Record<SurfaceKind, AdapterId[]> = {
  'character-portrait': [
    'recraft-v4',
    'ideogram-v3',
    'vertex-imagen-4',
    'fal-ai',
    'kie-ai',
    'vertex-nano-banana',
    'glm-image',
    'gpt-image',
  ],
  'scene-background': [
    'recraft-v4',
    'ideogram-v3',
    'vertex-imagen-4',
    'fal-ai',
    'kie-ai',
    'vertex-nano-banana',
    'glm-image',
    'gpt-image',
  ],
  'ui-mockup':              [],
  'generative-ui-runtime':  [],
  'deck-or-doc':            [],
  'diagram-or-infographic': [],
};

export function getAdapterChain(surface: SurfaceKind): ModelAdapter[] {
  const ids = SURFACE_CHAINS[surface];
  if (!ids || ids.length === 0) {
    throw new Error(
      `VISUAL_ENGINE_NO_CHAIN: surface "${surface}" has no registered adapters`,
    );
  }
  return ids.map((id) => ALL_ADAPTERS[id]);
}

export function getAdapter(id: AdapterId): ModelAdapter {
  return ALL_ADAPTERS[id];
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- registry
```

Expected: 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/models/registry.ts cti-hub/src/lib/visual-engine/__tests__/registry.test.ts
git commit -m "feat(visual-engine): adapter registry + surface chain routing"
```

---

## Phase 3 — Engine orchestration

### Task 3.1: loadReferences helper

**Files:**
- Create: `cti-hub/src/lib/visual-engine/load-references.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/load-references.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/load-references.test.ts`:

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
import { loadReferences, MissingReferenceError } from '../load-references';
import type { Preset } from '../presets/types';

const TMP_REFS = path.join(__dirname, '__fixtures__/refs');

beforeAll(async () => {
  await fs.mkdir(TMP_REFS, { recursive: true });
  await fs.writeFile(path.join(TMP_REFS, 'anchor.png'), Buffer.from('anchor-bytes'));
  await fs.writeFile(path.join(TMP_REFS, 'backdrop.png'), Buffer.from('backdrop-bytes'));
});

afterAll(async () => {
  await fs.rm(TMP_REFS, { recursive: true, force: true });
});

function makePreset(refs: Preset['references']): Preset {
  return {
    id: 'test',
    version: '1.0.0',
    description: 'test',
    surface: 'character-portrait',
    basePrompt: '',
    negativePrompt: '',
    references: refs,
    aspect: '1:1',
    resolution: { w: 1024, h: 1024 },
    candidatesDefault: 1,
    variables: {},
    tags: [],
  };
}

describe('loadReferences', () => {
  test('returns empty array when preset has no references', async () => {
    const bufs = await loadReferences(makePreset({}), TMP_REFS);
    expect(bufs).toHaveLength(0);
  });

  test('loads styleAnchor only', async () => {
    const bufs = await loadReferences(makePreset({ styleAnchor: 'anchor.png' }), TMP_REFS);
    expect(bufs).toHaveLength(1);
    expect(bufs[0].toString()).toBe('anchor-bytes');
  });

  test('loads styleAnchor + backdropAnchor in order', async () => {
    const bufs = await loadReferences(
      makePreset({ styleAnchor: 'anchor.png', backdropAnchor: 'backdrop.png' }),
      TMP_REFS,
    );
    expect(bufs).toHaveLength(2);
    expect(bufs[0].toString()).toBe('anchor-bytes');
    expect(bufs[1].toString()).toBe('backdrop-bytes');
  });

  test('throws MissingReferenceError when file absent', async () => {
    await expect(
      loadReferences(makePreset({ styleAnchor: 'nope.png' }), TMP_REFS),
    ).rejects.toThrow(MissingReferenceError);
  });

  test('skips rejectReference (not passed to adapter)', async () => {
    const bufs = await loadReferences(
      makePreset({ styleAnchor: 'anchor.png', rejectReference: 'nope.png' }),
      TMP_REFS,
    );
    // rejectReference is NOT a reference image — it's a concept for negative prompting.
    // Should not be loaded.
    expect(bufs).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- load-references
```

Expected: FAIL.

- [ ] **Step 3: Implement `load-references.ts`**

Create `cti-hub/src/lib/visual-engine/load-references.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Preset } from './presets/types';

export class MissingReferenceError extends Error {
  constructor(public readonly presetId: string, public readonly filename: string, public readonly searchedIn: string) {
    super(`VISUAL_ENGINE_MISSING_REFERENCE: preset "${presetId}" references "${filename}" but file not found in ${searchedIn}`);
    this.name = 'MissingReferenceError';
  }
}

/**
 * Default refs directory — resolves to cti-hub/public/brand/_refs/
 * when running from cti-hub root (Next.js dev server, scripts, and API routes all do).
 */
const DEFAULT_REFS_DIR = path.join(process.cwd(), 'public/brand/_refs');

/**
 * Load reference image buffers for a preset, in the order the adapter expects them:
 *   1. styleAnchor (if present)
 *   2. backdropAnchor (if present)
 *
 * rejectReference is NOT loaded — it is a conceptual negative prompt seed,
 * not a reference image fed to the model.
 */
export async function loadReferences(
  preset: Preset,
  dir: string = DEFAULT_REFS_DIR,
): Promise<Buffer[]> {
  const refs: Buffer[] = [];
  const ordered = [preset.references.styleAnchor, preset.references.backdropAnchor];

  for (const filename of ordered) {
    if (!filename) continue;
    const fullPath = path.join(dir, filename);
    try {
      refs.push(await fs.readFile(fullPath));
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
        throw new MissingReferenceError(preset.id, filename, dir);
      }
      throw err;
    }
  }

  return refs;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- load-references
```

Expected: 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/load-references.ts cti-hub/src/lib/visual-engine/__tests__/load-references.test.ts
git commit -m "feat(visual-engine): reference image loader with missing-file error"
```

---

### Task 3.2: Engine render() with fallback loop (TDD)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/engine.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/engine.test.ts`:

```typescript
import path from 'node:path';
import fs from 'node:fs/promises';
import { render } from '../engine';
import type { ModelAdapter, RenderRequest, RenderResponse } from '../models/types';
import { ADAPTER_NOT_WIRED_PREFIX } from '../models/types';

// Mock the registry to return fake adapters we control per test.
jest.mock('../models/registry', () => {
  const fakeChain: ModelAdapter[] = [];
  return {
    __setChain: (chain: ModelAdapter[]) => {
      fakeChain.length = 0;
      fakeChain.push(...chain);
    },
    getAdapterChain: () => fakeChain,
    getAdapter: (id: string) => fakeChain.find((a) => a.id === id),
  };
});

// Mock the presets loader to return fake presets.
jest.mock('../presets', () => ({
  load: jest.fn(),
  validateVars: jest.fn(),
  PresetInvalidError: class extends Error {},
}));

// Mock load-references to return empty arrays.
jest.mock('../load-references', () => ({
  loadReferences: jest.fn().mockResolvedValue([]),
  MissingReferenceError: class extends Error {},
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const registryMock = require('../models/registry');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const presetsMock = require('../presets');

function makeAdapter(id: string, behavior: 'succeed' | 'wired-error' | 'stub-error'): ModelAdapter {
  return {
    id: id as any,
    supportedSurfaces: ['character-portrait'],
    supportsReferenceImages: true,
    async render(): Promise<RenderResponse> {
      if (behavior === 'succeed') {
        return {
          png: Buffer.from([0x89, 0x50, 0x4e, 0x47]),
          adapterId: id as any,
          modelUsed: `${id}-mock`,
          latencyMs: 10,
          costUsd: 0,
        };
      }
      if (behavior === 'stub-error') {
        throw new Error(`${ADAPTER_NOT_WIRED_PREFIX} ${id}`);
      }
      throw new Error(`${id} simulated real failure`);
    },
  };
}

beforeEach(() => {
  presetsMock.load.mockResolvedValue({
    id: 'fake',
    version: '1.0.0',
    description: 'fake',
    surface: 'character-portrait',
    basePrompt: 'hello {{name}}',
    negativePrompt: 'no bad',
    references: {},
    aspect: '1:1',
    resolution: { w: 1024, h: 1024 },
    candidatesDefault: 1,
    variables: { name: { type: 'string', required: true, description: '' } },
    tags: [],
  });
  presetsMock.validateVars.mockReturnValue(undefined);
});

describe('engine.render', () => {
  test('returns first adapter that succeeds', async () => {
    registryMock.__setChain([
      makeAdapter('a', 'succeed'),
      makeAdapter('b', 'succeed'),
    ]);
    const results = await render('fake', { name: 'world' }, { candidates: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].adapterId).toBe('a');
  });

  test('skips stub errors silently, uses next adapter', async () => {
    registryMock.__setChain([
      makeAdapter('stub1', 'stub-error'),
      makeAdapter('stub2', 'stub-error'),
      makeAdapter('real', 'succeed'),
    ]);
    const results = await render('fake', { name: 'world' }, { candidates: 1 });
    expect(results).toHaveLength(1);
    expect(results[0].adapterId).toBe('real');
  });

  test('skips real errors with logging, uses next adapter', async () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    registryMock.__setChain([
      makeAdapter('flaky', 'wired-error'),
      makeAdapter('backup', 'succeed'),
    ]);
    const results = await render('fake', { name: 'world' }, { candidates: 1 });
    expect(results[0].adapterId).toBe('backup');
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[visual-engine] flaky failed'),
      expect.any(String),
    );
    warnSpy.mockRestore();
  });

  test('throws ALL_ADAPTERS_UNAVAILABLE when every adapter fails', async () => {
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    registryMock.__setChain([
      makeAdapter('stub1', 'stub-error'),
      makeAdapter('fail1', 'wired-error'),
      makeAdapter('fail2', 'wired-error'),
    ]);
    await expect(
      render('fake', { name: 'world' }, { candidates: 1 }),
    ).rejects.toThrow(/VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE/);
  });

  test('generates multiple candidates when requested', async () => {
    registryMock.__setChain([makeAdapter('a', 'succeed')]);
    const results = await render('fake', { name: 'world' }, { candidates: 3 });
    expect(results).toHaveLength(3);
  });

  test('interpolates variables into prompt before sending to adapter', async () => {
    const adapter = makeAdapter('a', 'succeed');
    const spy = jest.spyOn(adapter, 'render');
    registryMock.__setChain([adapter]);
    await render('fake', { name: 'world' }, { candidates: 1 });
    expect(spy).toHaveBeenCalledWith(
      expect.objectContaining({ prompt: 'hello world' }),
    );
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- engine
```

Expected: FAIL with `Cannot find module '../engine'`.

- [ ] **Step 3: Implement `engine.ts`**

Create `cti-hub/src/lib/visual-engine/engine.ts`:

```typescript
import type {
  AdapterId,
  AspectRatio,
  ModelAdapter,
  RenderRequest,
  RenderResponse,
  SurfaceKind,
} from './models/types';
import { ADAPTER_NOT_WIRED_PREFIX } from './models/types';
import { getAdapterChain } from './models/registry';
import { load as loadPreset, validateVars } from './presets';
import { loadReferences } from './load-references';
import { interpolate } from './interpolate';

export interface RenderOptions {
  candidates?: number;
  seed?: number;
}

export async function render(
  presetId: string,
  vars: Record<string, string | string[]>,
  opts: RenderOptions = {},
): Promise<RenderResponse[]> {
  const preset = await loadPreset(presetId);
  validateVars(preset, vars);

  const prompt = interpolate(preset.basePrompt, vars);
  const negativePrompt = interpolate(preset.negativePrompt, vars);
  const referenceImages = await loadReferences(preset);

  const baseReq: Omit<RenderRequest, 'seed'> = {
    prompt,
    negativePrompt,
    referenceImages,
    aspect: preset.aspect,
    resolution: preset.resolution,
  };

  const fullChain = getAdapterChain(preset.surface);
  // Filter: if the preset requires a style anchor, only keep adapters that
  // support reference images. An adapter without ref support would silently
  // render a disconnected image — worse than falling back.
  const chain = preset.references.styleAnchor || preset.references.backdropAnchor
    ? fullChain.filter((a) => a.supportsReferenceImages)
    : fullChain;

  if (chain.length === 0) {
    throw new Error(
      `VISUAL_ENGINE_NO_COMPATIBLE_ADAPTER: surface=${preset.surface}, preset=${preset.id}`,
    );
  }

  const candidates = opts.candidates ?? preset.candidatesDefault;
  const results: RenderResponse[] = [];

  for (let i = 0; i < candidates; i++) {
    const seed = opts.seed !== undefined ? opts.seed + i : undefined;
    const req: RenderRequest = { ...baseReq, seed };

    let succeeded = false;
    let lastRealError: Error | null = null;

    for (const adapter of chain) {
      try {
        const res = await adapter.render(req);
        results.push(res);
        succeeded = true;
        break;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        if (msg.startsWith(ADAPTER_NOT_WIRED_PREFIX)) {
          // Silent skip — stub adapter, not a real failure
          continue;
        }
        lastRealError = err as Error;
        console.warn(`[visual-engine] ${adapter.id} failed candidate ${i}:`, msg);
      }
    }

    if (!succeeded) {
      throw (
        lastRealError ??
        new Error(
          `VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE: surface=${preset.surface}, preset=${preset.id}`,
        )
      );
    }
  }

  return results;
}

/**
 * Bootstrap path for the style anchor — bypasses preset loading entirely.
 * Takes reference image buffers directly and runs them through the same
 * adapter-chain + fallback loop.
 */
export interface BootstrapAnchorSpec {
  surface: SurfaceKind;
  basePrompt: string;
  negativePrompt: string;
  referenceImages: Buffer[];
  aspect: AspectRatio;
  resolution: { w: number; h: number };
}

export async function renderBootstrapAnchor(
  spec: BootstrapAnchorSpec,
  opts: RenderOptions = {},
): Promise<RenderResponse[]> {
  const baseReq: Omit<RenderRequest, 'seed'> = {
    prompt: spec.basePrompt,
    negativePrompt: spec.negativePrompt,
    referenceImages: spec.referenceImages,
    aspect: spec.aspect,
    resolution: spec.resolution,
  };

  const chain = getAdapterChain(spec.surface).filter((a) => a.supportsReferenceImages);
  if (chain.length === 0) {
    throw new Error(`VISUAL_ENGINE_NO_COMPATIBLE_ADAPTER: surface=${spec.surface}`);
  }

  const candidates = opts.candidates ?? 3;
  const results: RenderResponse[] = [];

  for (let i = 0; i < candidates; i++) {
    const seed = opts.seed !== undefined ? opts.seed + i : undefined;
    const req: RenderRequest = { ...baseReq, seed };
    let succeeded = false;
    let lastRealError: Error | null = null;

    for (const adapter of chain) {
      try {
        results.push(await adapter.render(req));
        succeeded = true;
        break;
      } catch (err) {
        const msg = (err as Error).message ?? String(err);
        if (msg.startsWith(ADAPTER_NOT_WIRED_PREFIX)) continue;
        lastRealError = err as Error;
        console.warn(`[visual-engine] bootstrap ${adapter.id} failed candidate ${i}:`, msg);
      }
    }

    if (!succeeded) {
      throw (
        lastRealError ??
        new Error(`VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE: bootstrap surface=${spec.surface}`)
      );
    }
  }

  return results;
}

/**
 * Batch convenience — render several presets in sequence.
 * Sequential, not parallel, to stay within rate limits and keep cost visible.
 */
export async function renderBatch(
  presetIds: string[],
  varsByPreset: Record<string, Record<string, string | string[]>>,
  opts: RenderOptions = {},
): Promise<Record<string, RenderResponse[]>> {
  const out: Record<string, RenderResponse[]> = {};
  for (const id of presetIds) {
    out[id] = await render(id, varsByPreset[id] ?? {}, opts);
  }
  return out;
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- engine
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/engine.ts cti-hub/src/lib/visual-engine/__tests__/engine.test.ts
git commit -m "feat(visual-engine): engine.render + renderBootstrapAnchor + renderBatch with fallback loop"
```

---

### Task 3.3: Quota owner-bypass stub + cache helper + public index

**Files:**
- Create: `cti-hub/src/lib/visual-engine/quota/owner-bypass.ts`
- Create: `cti-hub/src/lib/visual-engine/cache/repo.ts`
- Create: `cti-hub/src/lib/visual-engine/index.ts`

- [ ] **Step 1: Create the quota stub**

Create `cti-hub/src/lib/visual-engine/quota/owner-bypass.ts`:

```typescript
import { isOwner } from '@/lib/allowlist';

/**
 * Visual Engine quota check — STUB for Sub-project #1.
 *
 * Owner emails bypass entirely. Everything else throws QUOTA_UNAVAILABLE
 * because end-user generation ships in Sub-project #3 with real token metering.
 *
 * When Sub-project #3 lands, this file is replaced by a real implementation
 * backed by Neon. The import path and function signature stay the same so
 * no caller changes.
 */
export class QuotaUnavailableError extends Error {
  constructor() {
    super('QUOTA_UNAVAILABLE: end-user generation ships in Sub-project #3');
    this.name = 'QuotaUnavailableError';
  }
}

export class QuotaForbiddenError extends Error {
  constructor() {
    super('QUOTA_FORBIDDEN: owner access required for Visual Engine');
    this.name = 'QuotaForbiddenError';
  }
}

export async function checkQuota(
  userEmail: string | null,
  _presetId: string,
): Promise<void> {
  if (userEmail && isOwner(userEmail)) return;
  throw new QuotaForbiddenError();
}
```

- [ ] **Step 2: Create the repo cache helper**

Create `cti-hub/src/lib/visual-engine/cache/repo.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';

/**
 * Repo-cache writer — commits a rendered PNG to a well-known path under
 * cti-hub/public/. Used by apply-approvals (CLI) and the /api/visual-engine/apply
 * route (owner re-roll UI).
 *
 * This writer does NOT git-add or git-commit. The operator reviews the diff
 * and commits manually.
 */

const PUBLIC_HAWKS_DIR = path.join(process.cwd(), 'public/hawks');
const PUBLIC_BRAND_REFS_DIR = path.join(process.cwd(), 'public/brand/_refs');

export async function writeHawkImage(slug: string, png: Buffer): Promise<string> {
  await fs.mkdir(PUBLIC_HAWKS_DIR, { recursive: true });
  const targetPath = path.join(PUBLIC_HAWKS_DIR, `${slug}.png`);
  await fs.writeFile(targetPath, png);
  return targetPath;
}

export async function writeBrandRef(filename: string, png: Buffer): Promise<string> {
  await fs.mkdir(PUBLIC_BRAND_REFS_DIR, { recursive: true });
  const targetPath = path.join(PUBLIC_BRAND_REFS_DIR, filename);
  await fs.writeFile(targetPath, png);
  return targetPath;
}
```

- [ ] **Step 3: Create the public index**

Create `cti-hub/src/lib/visual-engine/index.ts`:

```typescript
/**
 * Visual Engine — public API.
 *
 * Import from '@/lib/visual-engine' (NOT from sub-paths) so the internal
 * module layout can evolve without breaking callers.
 */
export { render, renderBootstrapAnchor, renderBatch } from './engine';
export type { RenderOptions, BootstrapAnchorSpec } from './engine';
export { load as loadPreset, validateVars, PresetNotFoundError, PresetInvalidError } from './presets';
export { loadReferences, MissingReferenceError } from './load-references';
export { checkQuota, QuotaUnavailableError, QuotaForbiddenError } from './quota/owner-bypass';
export { writeHawkImage, writeBrandRef } from './cache/repo';
export type { Preset } from './presets/types';
export type { SurfaceKind, AdapterId, RenderRequest, RenderResponse } from './models/types';
```

- [ ] **Step 4: Verify TS compiles and the public API is reachable**

```bash
cd cti-hub && pnpm tsc --noEmit
```

Expected: no errors.

```bash
cd cti-hub && node --experimental-strip-types -e "
import * as ve from './src/lib/visual-engine/index.ts';
console.log('Public API:', Object.keys(ve).sort());
"
```

Expected: a list including `render`, `renderBootstrapAnchor`, `renderBatch`, `loadPreset`, `loadReferences`, `checkQuota`, `writeHawkImage`, `writeBrandRef`.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/quota/owner-bypass.ts cti-hub/src/lib/visual-engine/cache/repo.ts cti-hub/src/lib/visual-engine/index.ts
git commit -m "feat(visual-engine): quota owner-bypass stub + repo cache helpers + public API index"
```

---

## Phase 4 — Curation

### Task 4.1: Proof-sheet assembler (TDD — with sharp)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/curation/proof-sheet.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/proof-sheet.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/proof-sheet.test.ts`:

```typescript
import sharp from 'sharp';
import { assembleProofSheet, type ProofSheetRow } from '../curation/proof-sheet';

async function makeSolidPng(w: number, h: number, r: number, g: number, b: number): Promise<Buffer> {
  return sharp({
    create: { width: w, height: h, channels: 3, background: { r, g, b } },
  }).png().toBuffer();
}

describe('assembleProofSheet', () => {
  test('produces a valid PNG for a small row set', async () => {
    const rows: ProofSheetRow[] = [
      {
        label: 'Lil_Guard_Hawk',
        sublabel: 'defensive',
        candidates: [
          await makeSolidPng(256, 256, 220, 38, 38),
          await makeSolidPng(256, 256, 220, 38, 38),
          await makeSolidPng(256, 256, 220, 38, 38),
        ],
        adapterLabel: 'primary',
      },
      {
        label: 'Lil_Scrapp_Hawk',
        sublabel: 'squad lead',
        candidates: [
          await makeSolidPng(256, 256, 249, 115, 22),
          await makeSolidPng(256, 256, 249, 115, 22),
          await makeSolidPng(256, 256, 249, 115, 22),
        ],
        adapterLabel: 'primary',
      },
    ];

    const out = await assembleProofSheet({
      rows,
      title: 'Test Proof Sheet',
    });

    expect(Buffer.isBuffer(out)).toBe(true);
    // PNG signature
    expect(out.slice(0, 8)).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    // Parse the output to verify dimensions
    const meta = await sharp(out).metadata();
    expect(meta.width).toBeGreaterThan(0);
    expect(meta.height).toBeGreaterThan(0);
  });

  test('throws if rows is empty', async () => {
    await expect(assembleProofSheet({ rows: [], title: 'empty' })).rejects.toThrow(/empty/i);
  });

  test('handles a row with fewer than 3 candidates', async () => {
    const rows: ProofSheetRow[] = [
      {
        label: 'Single',
        sublabel: 'only one',
        candidates: [await makeSolidPng(256, 256, 100, 100, 100)],
        adapterLabel: 'primary',
      },
    ];
    const out = await assembleProofSheet({ rows, title: 'Single' });
    expect(Buffer.isBuffer(out)).toBe(true);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- proof-sheet
```

Expected: FAIL.

- [ ] **Step 3: Implement the proof-sheet assembler**

Create `cti-hub/src/lib/visual-engine/curation/proof-sheet.ts`:

```typescript
import sharp from 'sharp';

export interface ProofSheetRow {
  label: string;         // e.g. "Lil_Guard_Hawk"
  sublabel: string;      // e.g. "defensive gatekeeper"
  candidates: Buffer[];  // 1-3 PNG buffers
  adapterLabel: string;  // e.g. "primary" or "fallback 1" — NEVER the raw adapter id
}

export interface ProofSheetInput {
  rows: ProofSheetRow[];
  title: string;
  subtitle?: string;
}

const THUMB_SIZE = 256;   // px — each candidate thumb
const THUMBS_PER_ROW = 3; // reserve 3 slots; rows with fewer candidates show empty slots
const LABEL_COL_WIDTH = 280;
const ROW_HEIGHT = THUMB_SIZE + 24; // thumb + padding
const TITLE_BAR = 72;
const GUTTER = 12;

/**
 * Compose an N-row × 3-column proof sheet as a single PNG.
 *
 * Uses sharp's `composite()` to stack SVG text + PNG thumbnails onto a
 * dark canvas that matches the card theme (#0B1220 background, sigColor
 * accents).
 */
export async function assembleProofSheet(input: ProofSheetInput): Promise<Buffer> {
  if (input.rows.length === 0) {
    throw new Error('VISUAL_ENGINE_PROOF_SHEET_EMPTY: no rows provided');
  }

  const canvasW = LABEL_COL_WIDTH + THUMBS_PER_ROW * (THUMB_SIZE + GUTTER) + GUTTER;
  const canvasH = TITLE_BAR + input.rows.length * (ROW_HEIGHT + GUTTER) + GUTTER;

  // Start with a dark base canvas
  const base = sharp({
    create: {
      width: canvasW,
      height: canvasH,
      channels: 3,
      background: { r: 5, g: 8, b: 16 },
    },
  });

  const composites: sharp.OverlayOptions[] = [];

  // Title bar as an SVG overlay
  const titleSvg = Buffer.from(`
    <svg width="${canvasW}" height="${TITLE_BAR}" xmlns="http://www.w3.org/2000/svg">
      <rect width="${canvasW}" height="${TITLE_BAR}" fill="#050810"/>
      <text x="${GUTTER}" y="32" font-family="monospace" font-size="18" fill="#F5A623" font-weight="bold">
        ${escapeXml(input.title)}
      </text>
      <text x="${GUTTER}" y="56" font-family="monospace" font-size="11" fill="#64748B">
        ${escapeXml(input.subtitle ?? 'Mark approvals in scripts/visual-engine/out/approvals.yaml')}
      </text>
    </svg>
  `);
  composites.push({ input: titleSvg, top: 0, left: 0 });

  for (let rowIdx = 0; rowIdx < input.rows.length; rowIdx++) {
    const row = input.rows[rowIdx];
    const rowTop = TITLE_BAR + rowIdx * (ROW_HEIGHT + GUTTER) + GUTTER;

    // Label column
    const labelSvg = Buffer.from(`
      <svg width="${LABEL_COL_WIDTH}" height="${ROW_HEIGHT}" xmlns="http://www.w3.org/2000/svg">
        <text x="${GUTTER}" y="32" font-family="monospace" font-size="14" fill="#F1F5F9" font-weight="bold">
          ${escapeXml(row.label)}
        </text>
        <text x="${GUTTER}" y="52" font-family="monospace" font-size="11" fill="#94A3B8">
          ${escapeXml(row.sublabel)}
        </text>
        <text x="${GUTTER}" y="${ROW_HEIGHT - 12}" font-family="monospace" font-size="9" fill="#475569">
          ${escapeXml(row.adapterLabel)}
        </text>
      </svg>
    `);
    composites.push({ input: labelSvg, top: rowTop, left: 0 });

    // Candidate thumbnails
    for (let i = 0; i < THUMBS_PER_ROW; i++) {
      const left = LABEL_COL_WIDTH + i * (THUMB_SIZE + GUTTER);
      if (i < row.candidates.length) {
        const thumb = await sharp(row.candidates[i])
          .resize(THUMB_SIZE, THUMB_SIZE, { fit: 'cover' })
          .png()
          .toBuffer();
        composites.push({ input: thumb, top: rowTop, left });
      } else {
        // Empty slot placeholder
        const emptySlot = Buffer.from(`
          <svg width="${THUMB_SIZE}" height="${THUMB_SIZE}" xmlns="http://www.w3.org/2000/svg">
            <rect width="${THUMB_SIZE}" height="${THUMB_SIZE}" fill="#0B1220" stroke="#1E293B" stroke-width="1"/>
            <text x="50%" y="50%" font-family="monospace" font-size="11" fill="#475569" text-anchor="middle">
              (empty)
            </text>
          </svg>
        `);
        composites.push({ input: emptySlot, top: rowTop, left });
      }
    }
  }

  return base.composite(composites).png().toBuffer();
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- proof-sheet
```

Expected: 3 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/curation/proof-sheet.ts cti-hub/src/lib/visual-engine/__tests__/proof-sheet.test.ts
git commit -m "feat(visual-engine): proof-sheet PNG assembler with sharp"
```

---

### Task 4.2: characters.ts structural editor (TDD)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/curation/characters-edit.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/characters-edit.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/characters-edit.test.ts`:

```typescript
import {
  editCharacterObject,
  CharactersEditError,
} from '../curation/characters-edit';

const SAMPLE = `
export const HAWK_PROFILES: CharacterProfile[] = [
  {
    slug: 'lil_guard_hawk',
    callsign: 'Lil_Guard_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_guard_hawk.png',
    imageReady: false,
    visualDescription:
      'A chibi armored hawk standing on a night port.',
    gear: ['Riot shield', 'Yellow hard hat'],
    catchphrase: 'You shall not pass.',
    signatureColor: '#FF4444',
  },
  {
    slug: 'lil_scrapp_hawk',
    callsign: 'Lil_Scrapp_Hawk',
    rank: 'core',
    imagePath: '/hawks/lil_scrapp_hawk.png',
    imageReady: false,
    visualDescription: 'A green-core chibi.',
    gear: ['Jetpack'],
    catchphrase: 'Squad up.',
    signatureColor: '#00E676',
  },
];
`;

describe('editCharacterObject', () => {
  test('flips imageReady: false → true for the matching slug only', () => {
    const out = editCharacterObject(SAMPLE, 'lil_guard_hawk', {
      imageReady: true,
    });
    // Guard Hawk flipped
    expect(out).toMatch(/slug: 'lil_guard_hawk',[\s\S]*?imageReady: true/);
    // Scrapp Hawk unchanged
    expect(out).toMatch(/slug: 'lil_scrapp_hawk',[\s\S]*?imageReady: false/);
  });

  test('updates signatureColor for the matching slug only', () => {
    const out = editCharacterObject(SAMPLE, 'lil_guard_hawk', {
      signatureColor: '#DC2626',
    });
    expect(out).toMatch(/slug: 'lil_guard_hawk',[\s\S]*?signatureColor: '#DC2626'/);
    expect(out).toMatch(/slug: 'lil_scrapp_hawk',[\s\S]*?signatureColor: '#00E676'/);
  });

  test('can apply both changes in one call', () => {
    const out = editCharacterObject(SAMPLE, 'lil_guard_hawk', {
      imageReady: true,
      signatureColor: '#DC2626',
    });
    expect(out).toMatch(/slug: 'lil_guard_hawk',[\s\S]*?imageReady: true[\s\S]*?signatureColor: '#DC2626'/);
  });

  test('throws when slug not found', () => {
    expect(() =>
      editCharacterObject(SAMPLE, 'nonexistent', { imageReady: true }),
    ).toThrow(CharactersEditError);
  });

  test('throws when slug match is ambiguous (not unique)', () => {
    const ambiguous = SAMPLE + SAMPLE;
    expect(() =>
      editCharacterObject(ambiguous, 'lil_guard_hawk', { imageReady: true }),
    ).toThrow(/ambiguous|unique/i);
  });

  test('throws when target field cannot be located in the object literal', () => {
    const noField = SAMPLE.replace("imageReady: false,\n", '');
    expect(() =>
      editCharacterObject(noField, 'lil_guard_hawk', { imageReady: true }),
    ).toThrow(/imageReady/);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- characters-edit
```

Expected: FAIL.

- [ ] **Step 3: Implement the structural editor**

Create `cti-hub/src/lib/visual-engine/curation/characters-edit.ts`:

```typescript
/**
 * Narrow structural editor for cti-hub/src/lib/hawks/characters.ts.
 *
 * NOT a general-purpose TS rewriter. Assumes the specific known-stable formatting
 * of the HAWK_PROFILES array:
 *   {
 *     slug: 'lil_guard_hawk',
 *     ...
 *     imageReady: false,
 *     ...
 *     signatureColor: '#FF4444',
 *   },
 *
 * For each edit, locates the object literal by finding the exact `slug: '{slug}',`
 * anchor, then walks outward to the enclosing `{` and its matching `}`. Changes
 * are applied ONLY within that object-literal slice. If a field is missing, or
 * the slug occurs more than once, the editor throws with a clear diagnostic.
 *
 * No AST walker, no new dep. If the file reformats significantly, re-derive
 * the anchors by hand.
 */

export class CharactersEditError extends Error {
  constructor(message: string) {
    super(`VISUAL_ENGINE_CHARACTERS_EDIT: ${message}`);
    this.name = 'CharactersEditError';
  }
}

export interface CharacterEdit {
  imageReady?: boolean;
  signatureColor?: string;
}

/**
 * Find the `[start, end)` range of the object literal whose body contains
 * the exact line `slug: '{slug}',`. Returns the indices into `source`.
 */
function findObjectLiteralBySlug(source: string, slug: string): { start: number; end: number } {
  const anchor = `slug: '${slug}',`;
  const firstIdx = source.indexOf(anchor);
  if (firstIdx === -1) {
    throw new CharactersEditError(`slug "${slug}" not found`);
  }
  const secondIdx = source.indexOf(anchor, firstIdx + anchor.length);
  if (secondIdx !== -1) {
    throw new CharactersEditError(`slug "${slug}" is not unique — found at positions ${firstIdx} and ${secondIdx}`);
  }

  // Walk backward to find the enclosing `{`
  let start = firstIdx;
  while (start > 0 && source[start] !== '{') start--;
  if (source[start] !== '{') {
    throw new CharactersEditError(`could not find opening brace for slug "${slug}"`);
  }

  // Walk forward to find the matching `}` (balanced brace count)
  let depth = 1;
  let end = start + 1;
  while (end < source.length && depth > 0) {
    const ch = source[end];
    if (ch === '{') depth++;
    else if (ch === '}') depth--;
    end++;
  }
  if (depth !== 0) {
    throw new CharactersEditError(`could not find matching closing brace for slug "${slug}"`);
  }

  return { start, end }; // end is exclusive (one past the closing `}`)
}

/**
 * Replace a single-line field assignment inside an object-literal slice.
 * Supports `field: value,` where value is a primitive (string, bool, number).
 */
function replaceFieldInSlice(
  slice: string,
  fieldName: string,
  newLiteral: string,
  slug: string,
): string {
  // Match `  fieldName: <anything up to trailing comma>,`
  // Keep the leading indentation.
  const pattern = new RegExp(
    `(^[ \\t]*)${fieldName}:\\s*[^,\\n]+,`,
    'm',
  );
  if (!pattern.test(slice)) {
    throw new CharactersEditError(`field "${fieldName}" not found in object for slug "${slug}"`);
  }
  return slice.replace(pattern, (_, indent: string) => `${indent}${fieldName}: ${newLiteral},`);
}

export function editCharacterObject(
  source: string,
  slug: string,
  edits: CharacterEdit,
): string {
  const { start, end } = findObjectLiteralBySlug(source, slug);
  let slice = source.slice(start, end);

  if (edits.imageReady !== undefined) {
    slice = replaceFieldInSlice(slice, 'imageReady', String(edits.imageReady), slug);
  }
  if (edits.signatureColor !== undefined) {
    slice = replaceFieldInSlice(slice, 'signatureColor', `'${edits.signatureColor}'`, slug);
  }

  return source.slice(0, start) + slice + source.slice(end);
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- characters-edit
```

Expected: 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/curation/characters-edit.ts cti-hub/src/lib/visual-engine/__tests__/characters-edit.test.ts
git commit -m "feat(visual-engine): structural editor for characters.ts (slug-anchored, object-scoped)"
```

---

### Task 4.3: apply-approvals orchestrator (library function)

**Files:**
- Create: `cti-hub/src/lib/visual-engine/curation/apply-approvals.ts`
- Test: `cti-hub/src/lib/visual-engine/__tests__/apply-approvals.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `cti-hub/src/lib/visual-engine/__tests__/apply-approvals.test.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {
  applyApprovals,
  parseApprovalsYaml,
  ApprovalsParseError,
} from '../curation/apply-approvals';

let tmpRoot: string;

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'visual-engine-apply-'));
  await fs.mkdir(path.join(tmpRoot, 'candidates/lil_guard_hawk'), { recursive: true });
  await fs.writeFile(
    path.join(tmpRoot, 'candidates/lil_guard_hawk/1.png'),
    Buffer.from('candidate1-bytes'),
  );
  await fs.writeFile(
    path.join(tmpRoot, 'candidates/lil_guard_hawk/2.png'),
    Buffer.from('candidate2-bytes'),
  );
  await fs.mkdir(path.join(tmpRoot, 'public/hawks'), { recursive: true });
  await fs.writeFile(
    path.join(tmpRoot, 'characters.ts'),
    `export const HAWK_PROFILES = [
  {
    slug: 'lil_guard_hawk',
    imageReady: false,
    signatureColor: '#FF4444',
  },
];
`,
  );
});

afterEach(async () => {
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('parseApprovalsYaml', () => {
  test('parses valid yaml', () => {
    const yaml = `
timestamp: "2026-04-08T14:23:00Z"
anchor_approved: 2
characters:
  lil_guard_hawk: 1
  lil_scrapp_hawk: reroll
  lil_parse_hawk: skip
`;
    const parsed = parseApprovalsYaml(yaml);
    expect(parsed.anchor_approved).toBe(2);
    expect(parsed.characters.lil_guard_hawk).toBe(1);
    expect(parsed.characters.lil_scrapp_hawk).toBe('reroll');
    expect(parsed.characters.lil_parse_hawk).toBe('skip');
  });

  test('throws on invalid yaml', () => {
    expect(() => parseApprovalsYaml('::: not yaml :::')).toThrow(ApprovalsParseError);
  });

  test('throws when characters field missing', () => {
    expect(() => parseApprovalsYaml('timestamp: x')).toThrow(/characters/);
  });
});

describe('applyApprovals', () => {
  test('copies approved candidate and flips imageReady', async () => {
    const yaml = `
timestamp: "t"
characters:
  lil_guard_hawk: 1
`;
    const result = await applyApprovals({
      yamlContent: yaml,
      candidatesDir: path.join(tmpRoot, 'candidates'),
      publicHawksDir: path.join(tmpRoot, 'public/hawks'),
      charactersFilePath: path.join(tmpRoot, 'characters.ts'),
      colorMap: { lil_guard_hawk: '#DC2626' },
    });

    expect(result.approved).toEqual(['lil_guard_hawk']);
    expect(result.rerolled).toEqual([]);
    expect(result.skipped).toEqual([]);

    const copied = await fs.readFile(path.join(tmpRoot, 'public/hawks/lil_guard_hawk.png'));
    expect(copied.toString()).toBe('candidate1-bytes');

    const charsAfter = await fs.readFile(path.join(tmpRoot, 'characters.ts'), 'utf8');
    expect(charsAfter).toMatch(/imageReady: true/);
    expect(charsAfter).toMatch(/signatureColor: '#DC2626'/);
  });

  test('skips reroll entries without touching disk', async () => {
    const yaml = `
timestamp: "t"
characters:
  lil_guard_hawk: reroll
`;
    const result = await applyApprovals({
      yamlContent: yaml,
      candidatesDir: path.join(tmpRoot, 'candidates'),
      publicHawksDir: path.join(tmpRoot, 'public/hawks'),
      charactersFilePath: path.join(tmpRoot, 'characters.ts'),
      colorMap: {},
    });
    expect(result.rerolled).toEqual(['lil_guard_hawk']);
    await expect(
      fs.access(path.join(tmpRoot, 'public/hawks/lil_guard_hawk.png')),
    ).rejects.toThrow();
    const charsAfter = await fs.readFile(path.join(tmpRoot, 'characters.ts'), 'utf8');
    expect(charsAfter).toMatch(/imageReady: false/);
  });
});
```

- [ ] **Step 2: Run tests — expect failure**

```bash
cd cti-hub && pnpm test -- apply-approvals
```

Expected: FAIL.

- [ ] **Step 3: Implement the orchestrator**

Create `cti-hub/src/lib/visual-engine/curation/apply-approvals.ts`:

```typescript
import fs from 'node:fs/promises';
import path from 'node:path';
import yaml from 'js-yaml';
import { editCharacterObject } from './characters-edit';

export class ApprovalsParseError extends Error {
  constructor(reason: string) {
    super(`VISUAL_ENGINE_APPROVALS_PARSE: ${reason}`);
    this.name = 'ApprovalsParseError';
  }
}

export type ApprovalDecision = number | 'reroll' | 'skip';

export interface ApprovalsFile {
  timestamp: string;
  anchor_approved?: number;
  characters: Record<string, ApprovalDecision>;
}

export function parseApprovalsYaml(raw: string): ApprovalsFile {
  let parsed: unknown;
  try {
    parsed = yaml.load(raw);
  } catch (err) {
    throw new ApprovalsParseError(`yaml parse error: ${(err as Error).message}`);
  }
  if (typeof parsed !== 'object' || parsed === null) {
    throw new ApprovalsParseError('root is not an object');
  }
  const p = parsed as Record<string, unknown>;
  if (typeof p.characters !== 'object' || p.characters === null) {
    throw new ApprovalsParseError('missing or invalid "characters" field');
  }
  return {
    timestamp: typeof p.timestamp === 'string' ? p.timestamp : '',
    anchor_approved: typeof p.anchor_approved === 'number' ? p.anchor_approved : undefined,
    characters: p.characters as Record<string, ApprovalDecision>,
  };
}

export interface ApplyApprovalsInput {
  yamlContent: string;
  candidatesDir: string;       // e.g. scripts/visual-engine/out/candidates
  publicHawksDir: string;      // e.g. public/hawks
  charactersFilePath: string;  // e.g. src/lib/hawks/characters.ts
  colorMap: Record<string, string>; // slug → new hex
}

export interface ApplyApprovalsResult {
  approved: string[];
  rerolled: string[];
  skipped: string[];
}

/**
 * Read approved-candidate mapping, copy winners into public/hawks/, and
 * flip `imageReady: true` + update `signatureColor` in characters.ts.
 *
 * Atomic per-file: if any copy or edit fails, throws without partial writes
 * where possible. characters.ts is written last (after all copies succeed)
 * so a copy failure doesn't corrupt the TS source.
 */
export async function applyApprovals(input: ApplyApprovalsInput): Promise<ApplyApprovalsResult> {
  const parsed = parseApprovalsYaml(input.yamlContent);

  const approved: string[] = [];
  const rerolled: string[] = [];
  const skipped: string[] = [];

  // Pass 1: copy approved candidates into public/hawks/
  for (const [slug, decision] of Object.entries(parsed.characters)) {
    if (decision === 'reroll') {
      rerolled.push(slug);
      continue;
    }
    if (decision === 'skip') {
      skipped.push(slug);
      continue;
    }
    if (typeof decision !== 'number' || decision < 1) {
      throw new ApprovalsParseError(`invalid decision for "${slug}": ${decision}`);
    }

    const src = path.join(input.candidatesDir, slug, `${decision}.png`);
    const dst = slug === 'acheevy'
      ? path.join(input.publicHawksDir, '..', 'brand/_refs/acheevy-canon-rendered.png')
      : path.join(input.publicHawksDir, `${slug}.png`);

    await fs.mkdir(path.dirname(dst), { recursive: true });
    const bytes = await fs.readFile(src);
    await fs.writeFile(dst, bytes);
    approved.push(slug);
  }

  // Pass 2: edit characters.ts for approved hawks only (skip acheevy — not in HAWK_PROFILES)
  let source = await fs.readFile(input.charactersFilePath, 'utf8');
  for (const slug of approved) {
    if (slug === 'acheevy') continue;
    source = editCharacterObject(source, slug, {
      imageReady: true,
      signatureColor: input.colorMap[slug],
    });
  }
  await fs.writeFile(input.charactersFilePath, source);

  return { approved, rerolled, skipped };
}
```

- [ ] **Step 4: Run tests — expect pass**

```bash
cd cti-hub && pnpm test -- apply-approvals
```

Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add cti-hub/src/lib/visual-engine/curation/apply-approvals.ts cti-hub/src/lib/visual-engine/__tests__/apply-approvals.test.ts
git commit -m "feat(visual-engine): apply-approvals orchestrator (yaml → copy + characters.ts edit)"
```

---

## Phase 5 — CLI scripts

### Task 5.1: `gen-sqwaadrun.ts` — bootstrap anchor + batch render + proof sheet

**Files:**
- Create: `cti-hub/scripts/visual-engine/gen-sqwaadrun.ts`

- [ ] **Step 1: Create the CLI script**

Create `cti-hub/scripts/visual-engine/gen-sqwaadrun.ts`:

```typescript
#!/usr/bin/env node
/**
 * Sqwaadrun Hawk Fleet render — CLI batch script.
 *
 * Usage:  pnpm tsx scripts/visual-engine/gen-sqwaadrun.ts
 *
 * Flow:
 *   1. If public/brand/_refs/sqwaadrun-lil-hawk-anchor.png is missing, bootstrap
 *      the style anchor: render 3 candidates via renderBootstrapAnchor, prompt
 *      operator to approve one, write the winner to that path.
 *   2. Render 3 candidates per character for all 20 characters using the
 *      appropriate preset + per-character variables.
 *   3. Write candidates to scripts/visual-engine/out/candidates/{slug}/{1,2,3}.png
 *   4. Assemble a proof-sheet PNG at scripts/visual-engine/out/proof-sheet-{ts}.png
 *   5. Write approvals.yaml template at scripts/visual-engine/out/approvals.yaml
 *   6. Print next-step instructions for the operator.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import {
  render,
  renderBootstrapAnchor,
  type RenderResponse,
} from '../../src/lib/visual-engine';
import { assembleProofSheet, type ProofSheetRow } from '../../src/lib/visual-engine/curation/proof-sheet';
import { HAWK_PROFILES } from '../../src/lib/hawks/characters';

const OUT_DIR = path.join(process.cwd(), 'scripts/visual-engine/out');
const CANDIDATES_DIR = path.join(OUT_DIR, 'candidates');
const REFS_DIR = path.join(process.cwd(), 'public/brand/_refs');
const ANCHOR_PATH = path.join(REFS_DIR, 'sqwaadrun-lil-hawk-anchor.png');

// Role → stance mapping for sqwaadrun-lil-hawk variable injection.
// Keyed by substring of the role string so similar roles cluster.
function stanceFor(role: string): string {
  if (/Gatekeeper|Anti-detection/.test(role)) return 'arms crossed, shield ready';
  if (/Squad Lead/.test(role)) return 'confident forward lean, one hand raised directing';
  if (/Parser|Structured|Schema/.test(role)) return 'holding a glowing document scanner';
  if (/Crawler|Sitemap/.test(role)) return 'surveying the horizon, compass in hand';
  if (/Screenshot/.test(role)) return 'camera raised, mid-capture';
  if (/Persistence|ETL/.test(role)) return 'standing by a glowing data vault';
  if (/Extraction|REST/.test(role)) return 'precision stance, tool poised';
  if (/RSS|Change detection/.test(role)) return 'antenna extended, alert posture';
  if (/Boilerplate/.test(role)) return 'broom and squeegee in hand, clean stance';
  if (/Queue|Scheduled/.test(role)) return 'conductor-style, baton raised';
  return 'ready combat stance, weapon drawn';
}

// Role color map — mirrors spec §6.3 table, used as the `rimColor` var.
const COLOR_BY_SLUG: Record<string, string> = {
  lil_guard_hawk:    '#DC2626',
  lil_scrapp_hawk:   '#F97316',
  lil_parse_hawk:    '#3B82F6',
  lil_crawl_hawk:    '#F59E0B',
  lil_snap_hawk:     '#EC4899',
  lil_store_hawk:    '#06B6D4',
  lil_extract_hawk:  '#EAB308',
  lil_feed_hawk:     '#A855F7',
  lil_diff_hawk:     '#EF4444',
  lil_clean_hawk:    '#10B981',
  lil_api_hawk:      '#6366F1',
  lil_queue_hawk:    '#22D3EE',
  lil_sitemap_hawk:  '#84CC16',
  lil_stealth_hawk:  '#64748B',
  lil_schema_hawk:   '#0EA5E9',
  lil_pipe_hawk:     '#92400E',
  lil_sched_hawk:    '#8B5CF6',
  // Command tier — match the existing slug format in characters.ts COMMAND_PROFILES (dashes)
  'general-ang':     '#F4E5C2',
  'chicken-hawk':    '#F5A623',
  acheevy:           '#F97316',
};

async function ensureDir(p: string): Promise<void> {
  await fs.mkdir(p, { recursive: true });
}

async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

async function writeCandidate(slug: string, index: number, bytes: Buffer): Promise<void> {
  const dir = path.join(CANDIDATES_DIR, slug);
  await ensureDir(dir);
  await fs.writeFile(path.join(dir, `${index}.png`), bytes);
}

async function bootstrapAnchor(): Promise<void> {
  if (await fileExists(ANCHOR_PATH)) {
    const rl = readline.createInterface({ input, output });
    const answer = await rl.question('Anchor already exists. Re-bootstrap? (y/N): ');
    rl.close();
    if (answer.trim().toLowerCase() !== 'y') {
      console.log(`[bootstrap] keeping existing anchor at ${ANCHOR_PATH}`);
      return;
    }
  }

  console.log('[bootstrap] generating 3 style-anchor candidates...');
  const squadRef = await fs.readFile(path.join(REFS_DIR, 'squad-illustrated.png'));
  const backdropRef = await fs.readFile(path.join(REFS_DIR, 'backdrop-night-port.png'));

  const candidates: RenderResponse[] = await renderBootstrapAnchor(
    {
      surface: 'character-portrait',
      basePrompt:
        'Archetypal chibi-proportioned armored hawk operator standing on the reflective wet pavement of the Sqwaadrun night port. Wearing articulated combat armor with subtle rim lighting, serious focused expression, the dark night port visible behind with container cranes and glowing A.I.M.S. containers softened in the background. Dramatic cinematic broadcast-grade illustration, painterly lighting, the character is the clear focal point, professional character design for a fleet of related operators.',
      negativePrompt:
        'simple cartoon bird, angry bird, fists up, plain white background, flat shading, no gear, no armor, remedial, low quality, text, watermark, signature, human face, adult bird, photographic bird, childish',
      referenceImages: [squadRef, backdropRef],
      aspect: '4:5',
      resolution: { w: 1024, h: 1280 },
    },
    { candidates: 3 },
  );

  const tmpDir = path.join(CANDIDATES_DIR, '_anchor');
  await ensureDir(tmpDir);
  for (let i = 0; i < candidates.length; i++) {
    await fs.writeFile(path.join(tmpDir, `${i + 1}.png`), candidates[i].png);
  }

  console.log(`[bootstrap] 3 candidates written to ${tmpDir}`);
  console.log('[bootstrap] Open the 3 PNGs in a viewer and pick your winner.');

  const rl = readline.createInterface({ input, output });
  const pick = await rl.question('Which candidate becomes the locked anchor? (1/2/3): ');
  rl.close();
  const idx = parseInt(pick.trim(), 10);
  if (![1, 2, 3].includes(idx)) {
    throw new Error(`[bootstrap] invalid choice "${pick}" — aborting. Re-run the script when ready.`);
  }

  await ensureDir(REFS_DIR);
  const chosen = await fs.readFile(path.join(tmpDir, `${idx}.png`));
  await fs.writeFile(ANCHOR_PATH, chosen);
  console.log(`[bootstrap] ✓ anchor locked → ${ANCHOR_PATH}`);
}

async function renderOne(
  presetId: string,
  vars: Record<string, string | string[]>,
  slug: string,
): Promise<RenderResponse[]> {
  console.log(`[render] ${presetId} → ${slug}`);
  const results = await render(presetId, vars, { candidates: 3 });
  for (let i = 0; i < results.length; i++) {
    await writeCandidate(slug, i + 1, results[i].png);
  }
  return results;
}

async function buildRows(): Promise<ProofSheetRow[]> {
  const rows: ProofSheetRow[] = [];
  for (const slug of Object.keys(COLOR_BY_SLUG)) {
    const dir = path.join(CANDIDATES_DIR, slug);
    if (!(await fileExists(dir))) continue;
    const files = await fs.readdir(dir);
    const candidates: Buffer[] = [];
    for (const f of files.sort()) {
      if (f.endsWith('.png')) {
        candidates.push(await fs.readFile(path.join(dir, f)));
      }
    }
    const profile = HAWK_PROFILES.find((p) => p.slug === slug);
    rows.push({
      label: profile?.callsign ?? slug,
      sublabel:
        slug.startsWith('lil_')   ? 'Lil_Hawk'   :
        slug === 'chicken-hawk'   ? 'Dispatcher' :
        slug === 'general-ang'    ? 'Supervisor' :
        /* acheevy */               'Digital CEO',
      candidates,
      adapterLabel: 'primary',
    });
  }
  return rows;
}

async function writeApprovalsTemplate(timestamp: string): Promise<void> {
  const header = `# Sqwaadrun approvals — generated ${timestamp}
# For each character, set the approved candidate index (1, 2, or 3).
# Use "reroll" to skip and re-roll via /smelter-os/creative later.
# Use "skip" to leave any existing committed file untouched.
timestamp: "${timestamp}"
anchor_approved: 0

characters:
`;
  const lines = Object.keys(COLOR_BY_SLUG).map((slug) => `  ${slug}: reroll`).join('\n');
  await fs.writeFile(path.join(OUT_DIR, 'approvals.yaml'), header + lines + '\n');
}

async function main(): Promise<void> {
  console.log('=== Sqwaadrun Hawk Fleet Render ===');
  await ensureDir(OUT_DIR);
  await ensureDir(CANDIDATES_DIR);

  // Step 1 — anchor bootstrap
  await bootstrapAnchor();

  // Step 2 — render 17 Lil_Hawks
  for (const profile of HAWK_PROFILES) {
    await renderOne('sqwaadrun-lil-hawk', {
      callsign: profile.callsign.replace(/_/g, ' '),
      role: profile.visualDescription.split('.')[0],
      rimColor: COLOR_BY_SLUG[profile.slug],
      gearList: profile.gear,
      stance: stanceFor(profile.visualDescription),
    }, profile.slug);
  }

  // Step 3 — command tier (General_Ang, Chicken_Hawk, ACHEEVY)
  // Slug format matches existing COMMAND_PROFILES in characters.ts: dashes, not underscores
  await renderOne('boomer-ang-supervisor', {
    callsign: 'General_Ang',
    patchText: 'GEN',
  }, 'general-ang');

  await renderOne('chicken-hawk-dispatcher', {}, 'chicken-hawk');

  await renderOne('acheevy-digital-ceo', {
    visorColor: 'warm orange',
    setting: 'a modern penthouse studio with floor-to-ceiling city views',
  }, 'acheevy');

  // Step 4 — proof sheet
  console.log('[proof-sheet] assembling...');
  const rows = await buildRows();
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const proofSheet = await assembleProofSheet({
    rows,
    title: 'SQWAADRUN PROOF SHEET',
    subtitle: `Generated ${timestamp} — mark approvals in scripts/visual-engine/out/approvals.yaml`,
  });
  const sheetPath = path.join(OUT_DIR, `proof-sheet-${timestamp}.png`);
  await fs.writeFile(sheetPath, proofSheet);
  console.log(`[proof-sheet] ✓ written to ${sheetPath}`);

  // Step 5 — approvals template
  await writeApprovalsTemplate(timestamp);
  console.log(`[approvals] template written to ${path.join(OUT_DIR, 'approvals.yaml')}`);

  console.log('\n=== DONE ===');
  console.log('Next steps:');
  console.log('  1. Open the proof sheet in an image viewer:');
  console.log(`     ${sheetPath}`);
  console.log('  2. Edit scripts/visual-engine/out/approvals.yaml — mark each character with the approved candidate index (1, 2, or 3)');
  console.log('  3. Run: pnpm tsx scripts/visual-engine/apply-approvals.ts');
}

main().catch((err) => {
  console.error('[gen-sqwaadrun] FAIL:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Verify the script at least type-checks (no live render)**

```bash
cd cti-hub && pnpm tsc --noEmit
```

Expected: no errors in `scripts/visual-engine/gen-sqwaadrun.ts`.

- [ ] **Step 3: Commit**

```bash
git add cti-hub/scripts/visual-engine/gen-sqwaadrun.ts
git commit -m "feat(visual-engine): CLI script — bootstrap anchor + batch render + proof sheet"
```

---

### Task 5.2: `apply-approvals.ts` CLI wrapper

**Files:**
- Create: `cti-hub/scripts/visual-engine/apply-approvals.ts`

- [ ] **Step 1: Create the CLI wrapper**

Create `cti-hub/scripts/visual-engine/apply-approvals.ts`:

```typescript
#!/usr/bin/env node
/**
 * Apply approvals CLI — reads scripts/visual-engine/out/approvals.yaml,
 * copies approved candidates into public/hawks/, and edits characters.ts.
 *
 * Usage:  pnpm tsx scripts/visual-engine/apply-approvals.ts
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { applyApprovals } from '../../src/lib/visual-engine/curation/apply-approvals';

const OUT_DIR = path.join(process.cwd(), 'scripts/visual-engine/out');
const YAML_PATH = path.join(OUT_DIR, 'approvals.yaml');
const CANDIDATES_DIR = path.join(OUT_DIR, 'candidates');
const PUBLIC_HAWKS_DIR = path.join(process.cwd(), 'public/hawks');
const CHARACTERS_FILE = path.join(process.cwd(), 'src/lib/hawks/characters.ts');

// Role → color map. Must match COLOR_BY_SLUG in gen-sqwaadrun.ts.
// Keeping it duplicated here is intentional — this script must stand alone
// without importing runtime state from the render CLI.
// Includes command tier ("general-ang", "chicken-hawk") so their signatureColor
// fields in characters.ts get updated too. acheevy has no characters.ts entry
// at all — its canonical file lives at public/brand/_refs/acheevy-canon-rendered.png
// and is handled inside applyApprovals via the `slug === 'acheevy'` branch.
const COLOR_BY_SLUG: Record<string, string> = {
  lil_guard_hawk:    '#DC2626',
  lil_scrapp_hawk:   '#F97316',
  lil_parse_hawk:    '#3B82F6',
  lil_crawl_hawk:    '#F59E0B',
  lil_snap_hawk:     '#EC4899',
  lil_store_hawk:    '#06B6D4',
  lil_extract_hawk:  '#EAB308',
  lil_feed_hawk:     '#A855F7',
  lil_diff_hawk:     '#EF4444',
  lil_clean_hawk:    '#10B981',
  lil_api_hawk:      '#6366F1',
  lil_queue_hawk:    '#22D3EE',
  lil_sitemap_hawk:  '#84CC16',
  lil_stealth_hawk:  '#64748B',
  lil_schema_hawk:   '#0EA5E9',
  lil_pipe_hawk:     '#92400E',
  lil_sched_hawk:    '#8B5CF6',
  // Command tier — match existing slug format in COMMAND_PROFILES (dashes, NOT underscores)
  'general-ang':     '#F4E5C2',
  'chicken-hawk':    '#F5A623',
};

async function main(): Promise<void> {
  console.log('=== Apply Approvals ===');

  let yamlContent: string;
  try {
    yamlContent = await fs.readFile(YAML_PATH, 'utf8');
  } catch (err) {
    console.error(`[apply] approvals.yaml not found at ${YAML_PATH}`);
    console.error('[apply] Run gen-sqwaadrun.ts first, then edit the generated approvals.yaml.');
    process.exit(1);
  }

  const result = await applyApprovals({
    yamlContent,
    candidatesDir: CANDIDATES_DIR,
    publicHawksDir: PUBLIC_HAWKS_DIR,
    charactersFilePath: CHARACTERS_FILE,
    colorMap: COLOR_BY_SLUG,
  });

  console.log(`\n[apply] ✓ approved:  ${result.approved.length} — ${result.approved.join(', ')}`);
  console.log(`[apply] · rerolled:  ${result.rerolled.length} — ${result.rerolled.join(', ')}`);
  console.log(`[apply] · skipped:   ${result.skipped.length} — ${result.skipped.join(', ')}`);

  // Audit log
  const auditPath = path.join(OUT_DIR, `applied-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  await fs.writeFile(auditPath, JSON.stringify({ result, at: new Date().toISOString() }, null, 2));
  console.log(`[apply] audit log → ${auditPath}`);

  console.log('\nNext steps:');
  console.log('  1. Review the diff:');
  console.log('     git diff public/hawks/ src/lib/hawks/characters.ts');
  console.log('  2. Commit:');
  console.log('     git add public/hawks/ src/lib/hawks/characters.ts && git commit -m "feat(hawks): commit approved Sqwaadrun renders"');
  console.log('  3. For any `reroll` entries, open /smelter-os/creative → Sqwaadrun Re-Roll tab');
}

main().catch((err) => {
  console.error('[apply-approvals] FAIL:', err);
  process.exit(1);
});
```

- [ ] **Step 2: Type-check**

```bash
cd cti-hub && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cti-hub/scripts/visual-engine/apply-approvals.ts
git commit -m "feat(visual-engine): CLI wrapper for apply-approvals"
```

---

## Phase 6 — API routes

### Task 6.1: `POST /api/visual-engine/render`

**Files:**
- Create: `cti-hub/src/app/api/visual-engine/render/route.ts`

- [ ] **Step 1: Create the render route**

Create `cti-hub/src/app/api/visual-engine/render/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { render, checkQuota, QuotaForbiddenError } from '@/lib/visual-engine';
import { getServerAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RenderBody {
  presetId?: string;
  vars?: Record<string, string | string[]>;
  candidates?: number;
}

/**
 * POST /api/visual-engine/render
 *
 * Owner-gated. Takes a preset id + variables, returns N candidate renders
 * as base64-encoded PNGs. Model/adapter names NEVER appear in the response.
 */
export async function POST(request: Request): Promise<NextResponse> {
  // Auth
  const user = await getServerAuth(request);
  try {
    await checkQuota(user?.email ?? null, 'visual-engine-render');
  } catch (err) {
    if (err instanceof QuotaForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  // Parse body
  let body: RenderBody;
  try {
    body = (await request.json()) as RenderBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.presetId || typeof body.presetId !== 'string') {
    return NextResponse.json({ error: 'Missing required field: presetId' }, { status: 400 });
  }

  const candidates = Math.min(Math.max(body.candidates ?? 3, 1), 5);

  // Render
  try {
    const results = await render(body.presetId, body.vars ?? {}, { candidates });
    // IP protection: strip adapterId + modelUsed from the response
    const sanitized = results.map((r) => ({
      png_base64: r.png.toString('base64'),
      latencyMs: r.latencyMs,
    }));
    return NextResponse.json({ candidates: sanitized });
  } catch (err) {
    const msg = (err as Error).message ?? 'unknown';
    // Map engine errors to user-safe messages
    if (msg.includes('VISUAL_ENGINE_ALL_ADAPTERS_UNAVAILABLE')) {
      return NextResponse.json(
        { error: 'Visual engine unavailable, try again in a minute' },
        { status: 503 },
      );
    }
    if (msg.includes('VISUAL_ENGINE_MISSING_REFERENCE')) {
      return NextResponse.json(
        { error: 'Reference image missing — check server logs' },
        { status: 500 },
      );
    }
    if (msg.includes('VISUAL_ENGINE_INVALID_VARS') || msg.includes('VISUAL_ENGINE_PRESET_INVALID')) {
      return NextResponse.json({ error: 'Invalid preset or variables' }, { status: 400 });
    }
    if (msg.includes('VISUAL_ENGINE_PRESET_NOT_FOUND')) {
      return NextResponse.json({ error: 'Unknown preset id' }, { status: 404 });
    }
    console.error('[api/visual-engine/render] unhandled error:', err);
    return NextResponse.json({ error: 'Visual engine error' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Verify the route compiles and the import graph resolves**

```bash
cd cti-hub && pnpm tsc --noEmit
```

Expected: no errors. If `getServerAuth` doesn't exist at `@/lib/server-auth`, check the actual export from `cti-hub/src/lib/server-auth.ts` and adjust the import — the function should return `{ email: string } | null` or similar. If the project uses a different auth helper (`getAuthUser`, `getSession`, etc.), use that instead.

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/app/api/visual-engine/render/route.ts
git commit -m "feat(visual-engine): POST /api/visual-engine/render (owner-gated)"
```

---

### Task 6.2: `POST /api/visual-engine/apply`

**Files:**
- Create: `cti-hub/src/app/api/visual-engine/apply/route.ts`

- [ ] **Step 1: Create the apply route**

Create `cti-hub/src/app/api/visual-engine/apply/route.ts`:

```typescript
import { NextResponse } from 'next/server';
import { checkQuota, QuotaForbiddenError, writeHawkImage, writeBrandRef } from '@/lib/visual-engine';
import { getServerAuth } from '@/lib/server-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ApplyBody {
  targetSlug?: string;
  winnerBase64?: string;
}

/**
 * POST /api/visual-engine/apply
 *
 * Owner-gated. Writes a rendered PNG to the correct location on disk.
 * - targetSlug "acheevy" → public/brand/_refs/acheevy-canon-rendered.png
 * - any other slug → public/hawks/{slug}.png
 *
 * Does NOT touch characters.ts — that's a CLI-only concern (apply-approvals.ts).
 * The UI operator is expected to manually commit + run the CLI later for batch flips.
 */
export async function POST(request: Request): Promise<NextResponse> {
  const user = await getServerAuth(request);
  try {
    await checkQuota(user?.email ?? null, 'visual-engine-apply');
  } catch (err) {
    if (err instanceof QuotaForbiddenError) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    throw err;
  }

  let body: ApplyBody;
  try {
    body = (await request.json()) as ApplyBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (!body.targetSlug || typeof body.targetSlug !== 'string') {
    return NextResponse.json({ error: 'Missing required field: targetSlug' }, { status: 400 });
  }
  if (!body.winnerBase64 || typeof body.winnerBase64 !== 'string') {
    return NextResponse.json({ error: 'Missing required field: winnerBase64' }, { status: 400 });
  }

  // Guard against path traversal in targetSlug.
  // Allowed: lowercase alphanumerics, underscore, dash. Matches both HAWK_PROFILES
  // (underscore, e.g. "lil_guard_hawk") and COMMAND_PROFILES (dash, e.g. "general-ang")
  // slug formats. Explicitly disallows `.`, `/`, `\`, or any shell-meta character.
  if (!/^[a-z0-9_-]+$/.test(body.targetSlug)) {
    return NextResponse.json({ error: 'Invalid targetSlug format' }, { status: 400 });
  }

  const png = Buffer.from(body.winnerBase64, 'base64');
  if (png.length === 0) {
    return NextResponse.json({ error: 'Empty image buffer' }, { status: 400 });
  }

  try {
    let writtenPath: string;
    if (body.targetSlug === 'acheevy') {
      writtenPath = await writeBrandRef('acheevy-canon-rendered.png', png);
    } else {
      writtenPath = await writeHawkImage(body.targetSlug, png);
    }
    return NextResponse.json({
      ok: true,
      cacheBust: Date.now(),
      // We intentionally do NOT echo absolute paths back to the client
      relativePath: writtenPath.split('cti-hub/').pop() ?? writtenPath,
    });
  } catch (err) {
    console.error('[api/visual-engine/apply] write failed:', err);
    return NextResponse.json({ error: 'Write failed' }, { status: 500 });
  }
}
```

- [ ] **Step 2: Type-check**

```bash
cd cti-hub && pnpm tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add cti-hub/src/app/api/visual-engine/apply/route.ts
git commit -m "feat(visual-engine): POST /api/visual-engine/apply (owner-gated write + cache bust)"
```

---

## Phase 7 — HawkCard upgrade

### Task 7.1: Rewrite `HawkCard.tsx` front face

**Files:**
- Modify: `cti-hub/src/components/hawks/HawkCard.tsx`

- [ ] **Step 1: Read the existing file to confirm exact line boundaries**

```bash
cd cti-hub && wc -l src/components/hawks/HawkCard.tsx
```

Expected: ~347 lines. Confirm the front face is lines ~74–180 and the back face is lines ~182–302. Open the file to verify before editing.

- [ ] **Step 2: Replace the file contents**

Overwrite `cti-hub/src/components/hawks/HawkCard.tsx` with:

```typescript
'use client';

/**
 * HawkCard — Sqwaadrun roster card (v2.0)
 * ==========================================
 * Front face: full-bleed cinematic hero art with floating chrome overlays.
 * Back face:  dossier (capabilities, gear, catchphrase, sample mission, stats).
 *
 * Dimensions shifted to 2:3 aspect (NFT/trading-card convention).
 * Vignette removed — the new Visual Engine renders have cinematic lighting baked in.
 * A.I.M.S. slat texture removed — it fought the hero art.
 * Back face preserved byte-for-byte from v1.
 */

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import type { CharacterProfile } from '@/lib/hawks/characters';

export interface HawkCardData {
  profile: CharacterProfile;
  role: string;
  capabilities: string[];
  sampleMission: string;
  status?: 'active' | 'standby';
  tasksCompleted?: number;
  tasksFailed?: number;
}

interface Props {
  data: HawkCardData;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_LABEL: Record<CharacterProfile['rank'], string> = {
  commander: 'COMMANDER',
  supervisor: 'SUPERVISOR',
  dispatcher: 'DISPATCHER',
  core: 'CORE',
  expansion: 'EXPANSION',
  specialist: 'SPECIALIST',
};

export function HawkCard({ data, size = 'md' }: Props) {
  const [flipped, setFlipped] = useState(false);
  const { profile, role, capabilities, sampleMission, status, tasksCompleted, tasksFailed } = data;

  const dimensions = {
    sm: { w: 240, h: 360 },
    md: { w: 320, h: 480 },
    lg: { w: 400, h: 600 },
  }[size];

  const sigColor = profile.signatureColor;

  return (
    <div
      className="relative cursor-pointer select-none"
      style={{
        width: dimensions.w,
        height: dimensions.h,
        perspective: '1400px',
      }}
      onClick={() => setFlipped((f) => !f)}
      onKeyDown={(e) => e.key === 'Enter' && setFlipped((f) => !f)}
      role="button"
      tabIndex={0}
      aria-label={`${profile.callsign} — tap to flip dossier`}
    >
      <motion.div
        className="relative w-full h-full"
        style={{ transformStyle: 'preserve-3d' }}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{ duration: 0.7, ease: [0.3, 0.8, 0.3, 1] }}
      >
        {/* ═══ FRONT FACE (v2) ═══ */}
        <div
          className="absolute inset-0 overflow-hidden"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: '#050810',
            borderRadius: '6px',
            boxShadow: `0 18px 48px rgba(0,0,0,0.75), 0 0 32px ${sigColor}28`,
          }}
        >
          {/* Top color stripe */}
          <div
            className="absolute top-0 left-0 right-0 h-[2px] z-20"
            style={{
              background: `linear-gradient(90deg, transparent, ${sigColor}, transparent)`,
              boxShadow: `0 0 8px ${sigColor}`,
            }}
          />

          {/* Zone 1 — Floating chrome (tier pill + status) */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-start justify-between p-3">
            <div
              className="px-2 py-1 rounded-sm backdrop-blur-md"
              style={{
                background: 'rgba(5,8,16,0.55)',
                border: `1px solid ${sigColor}66`,
              }}
            >
              <div
                className="text-[8px] font-mono tracking-[0.25em] font-bold"
                style={{ color: sigColor }}
              >
                {TIER_LABEL[profile.rank]}
              </div>
            </div>
            {status && (
              <div
                className="flex items-center gap-1.5 px-2 py-1 rounded-sm backdrop-blur-md"
                style={{
                  background: 'rgba(5,8,16,0.55)',
                  border: `1px solid ${status === 'active' ? '#22D3EE55' : '#47556955'}`,
                }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{
                    background: status === 'active' ? '#22D3EE' : '#475569',
                    boxShadow: status === 'active' ? '0 0 6px #22D3EE' : 'none',
                  }}
                />
                <span
                  className="text-[8px] font-mono tracking-wider uppercase"
                  style={{ color: status === 'active' ? '#22D3EE' : '#64748B' }}
                >
                  {status}
                </span>
              </div>
            )}
          </div>

          {/* Zone 2 — Full-bleed hero art */}
          <div className="absolute inset-0 z-0">
            {profile.imageReady ? (
              <Image
                src={profile.imagePath}
                alt={profile.callsign}
                fill
                className="object-cover object-center"
                sizes="(max-width: 768px) 280px, 400px"
              />
            ) : (
              <CharacterPlaceholder color={sigColor} />
            )}
          </div>

          {/* Zone 3 — Fade band + callsign plate */}
          <div
            className="absolute bottom-0 left-0 right-0 z-10 pt-16 pb-4 px-4"
            style={{
              background:
                'linear-gradient(180deg, transparent 0%, rgba(5,8,16,0.55) 30%, rgba(5,8,16,0.92) 60%, #050810 100%)',
            }}
          >
            <div className="text-[8px] font-mono tracking-[0.25em] uppercase opacity-60">
              CALLSIGN
            </div>
            <div
              className="text-xl font-black leading-tight mt-0.5"
              style={{ color: '#F1F5F9', letterSpacing: '-0.01em' }}
            >
              {profile.callsign.replace(/_/g, ' ')}
            </div>
            <div
              className="text-[10px] font-mono mt-1.5 leading-snug flex gap-1"
              style={{ color: sigColor }}
            >
              <span>▸</span>
              <span>{role}</span>
            </div>
          </div>

          {/* Stenciled A.I.M.S. corner mark */}
          <div
            className="absolute bottom-2 right-3 z-10 text-[7px] font-mono opacity-30 tracking-wider"
            style={{ color: '#22D3EE' }}
          >
            A.I.M.S. · TAP ↻
          </div>
        </div>

        {/* ═══ BACK FACE — DOSSIER (UNCHANGED) ═══ */}
        <div
          className="absolute inset-0 overflow-hidden border-2 p-4"
          style={{
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: `linear-gradient(165deg, #0B1220 0%, #050810 100%)`,
            borderColor: `${sigColor}80`,
            borderRadius: '6px',
            boxShadow: `0 14px 40px rgba(0,0,0,0.8), 0 0 36px ${sigColor}30`,
          }}
        >
          <div
            className="flex items-center justify-between mb-3 pb-2 border-b"
            style={{ borderColor: `${sigColor}40` }}
          >
            <div
              className="text-[8px] font-mono tracking-[0.25em] font-bold opacity-70"
              style={{ color: sigColor }}
            >
              CLASSIFIED · DOSSIER
            </div>
            <div
              className="w-7 h-7 flex items-center justify-center text-xs font-black"
              style={{
                background: `${sigColor}25`,
                border: `1px solid ${sigColor}80`,
                color: sigColor,
                borderRadius: '2px',
              }}
            >
              {profile.callsign.split('_').slice(-2, -1)[0]?.[0] || 'X'}
            </div>
          </div>

          <div className="text-base font-black leading-tight mb-1" style={{ color: '#F1F5F9' }}>
            {profile.callsign.replace(/_/g, ' ')}
          </div>
          <div className="text-[10px] font-mono opacity-70 mb-3" style={{ color: sigColor }}>
            {role}
          </div>

          <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1.5">CAPABILITIES</div>
          <ul className="space-y-1 text-[10px] mb-3" style={{ color: '#CBD5E1' }}>
            {capabilities.map((cap, i) => (
              <li key={i} className="flex gap-1.5 leading-snug">
                <span style={{ color: sigColor }}>▸</span>
                <span>{cap}</span>
              </li>
            ))}
          </ul>

          {profile.gear.length > 0 && (
            <>
              <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1.5">STANDARD GEAR</div>
              <div className="flex flex-wrap gap-1 mb-3">
                {profile.gear.slice(0, 4).map((g) => (
                  <span
                    key={g}
                    className="text-[8px] font-mono px-1.5 py-0.5"
                    style={{
                      color: '#22D3EE',
                      background: 'rgba(34,211,238,0.08)',
                      border: '1px solid rgba(34,211,238,0.25)',
                      borderRadius: '2px',
                    }}
                  >
                    {g}
                  </span>
                ))}
              </div>
            </>
          )}

          <div
            className="text-[10px] italic leading-snug p-2 mt-auto mb-2"
            style={{
              borderLeft: `2px solid ${sigColor}`,
              background: `${sigColor}08`,
              color: '#E2E8F0',
            }}
          >
            &ldquo;{profile.catchphrase}&rdquo;
          </div>

          <div className="text-[8px] font-mono tracking-[0.2em] opacity-50 mb-1">SAMPLE MISSION</div>
          <div
            className="text-[9px] opacity-70 italic leading-snug mb-2"
            style={{ color: '#94A3B8' }}
          >
            &ldquo;{sampleMission}&rdquo;
          </div>

          <div
            className="flex justify-between items-center text-[9px] font-mono pt-2 border-t"
            style={{ borderColor: `${sigColor}25` }}
          >
            <div>
              <span className="opacity-60">DONE </span>
              <span className="font-bold" style={{ color: '#22D3EE' }}>
                {tasksCompleted ?? 0}
              </span>
            </div>
            <div>
              <span className="opacity-60">FAIL </span>
              <span
                className="font-bold"
                style={{ color: (tasksFailed ?? 0) > 0 ? '#EF4444' : '#94A3B8' }}
              >
                {tasksFailed ?? 0}
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ── Placeholder when character art isn't rendered yet ── */
function CharacterPlaceholder({ color }: { color: string }) {
  return (
    <div className="w-full h-full flex items-center justify-center relative" style={{ background: '#050810' }}>
      <div
        className="absolute inset-x-6 bottom-8 h-16 opacity-20"
        style={{
          background: `linear-gradient(180deg, transparent, ${color}40)`,
          clipPath:
            'polygon(0 100%, 8% 60%, 20% 70%, 32% 40%, 48% 50%, 60% 30%, 75% 55%, 88% 45%, 100% 70%, 100% 100%)',
        }}
      />
      <svg
        width="60%"
        height="60%"
        viewBox="0 0 100 100"
        fill="none"
        style={{ filter: `drop-shadow(0 0 18px ${color}40)` }}
      >
        <path
          d="M50 18 L42 30 L26 26 L32 42 L20 52 L34 56 L36 72 L50 64 L64 72 L66 56 L80 52 L68 42 L74 26 L58 30 Z"
          fill={color}
          fillOpacity="0.32"
          stroke={color}
          strokeWidth="1.4"
        />
        <circle cx="44" cy="46" r="2.2" fill={color} />
        <circle cx="56" cy="46" r="2.2" fill={color} />
        <path d="M48 52 L50 56 L52 52" stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
      </svg>
      <div
        className="absolute top-4 right-4 text-[8px] font-mono tracking-wider"
        style={{ color }}
      >
        ◯ AWAITING RENDER
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Start the dev server and visually verify the card at each size**

```bash
cd cti-hub && pnpm dev
```

Open `http://localhost:3000/smelter-os/fleet` (owner login required). Verify:
- Cards are visibly taller than before (2:3 instead of 0.7 aspect)
- Tier pill + status are floating top-left/top-right with a subtle glass background
- Character art is full-bleed (no vignette around it)
- Callsign plate fades from the art into solid obsidian at the bottom
- Clicking the card flips to the back face
- Back face looks identical to v1 (capabilities, gear pills, catchphrase, sample mission, stats)

- [ ] **Step 4: Stop dev server and commit**

```bash
git add cti-hub/src/components/hawks/HawkCard.tsx
git commit -m "feat(hawks): HawkCard v2 — full-bleed hero front face, unchanged dossier back"
```

---

### Task 7.2: Consumer grid-pass adjustments

**Files:**
- Modify: `cti-hub/src/app/(dashboard)/sqwaadrun/page.tsx`
- Modify: `cti-hub/src/app/plug/sqwaadrun/page.tsx`
- Modify: `cti-hub/src/app/(dashboard)/smelter-os/fleet/page.tsx`

- [ ] **Step 1: Locate the grid classes in each consumer**

```bash
cd cti-hub && grep -rn "grid-cols-" src/app/\(dashboard\)/sqwaadrun/page.tsx src/app/plug/sqwaadrun/page.tsx "src/app/(dashboard)/smelter-os/fleet/page.tsx"
```

Expected: grep shows the existing grid class declarations. You'll see something like `md:grid-cols-3 lg:grid-cols-4` — these are the lines to adjust.

- [ ] **Step 2: Update each consumer — the change is the same for all three**

Change `md:grid-cols-3 lg:grid-cols-4` → `md:grid-cols-2 lg:grid-cols-3` in each of the three files. If the existing class uses different column counts (e.g. `sm:grid-cols-2 md:grid-cols-3`), adjust to the nearest equivalent that gives the wider cards room to breathe. The target: 2 columns at `md`, 3 columns at `lg`, 4 columns at `xl` if an `xl` breakpoint exists.

Use the Edit tool for each file to replace the exact existing grid class string with the new one.

- [ ] **Step 3: Optional — on `/plug/sqwaadrun` public landing, bump the hero row HawkCard to `size="lg"`**

If `plug/sqwaadrun/page.tsx` has a distinguished "featured" row that uses `<HawkCard ... size="md" />`, change `size="md"` → `size="lg"` for that row only. The `lg` size is 400×600 and is the broadcast-grade presentation size for marketing surfaces.

- [ ] **Step 4: Restart dev server and verify all three pages**

```bash
cd cti-hub && pnpm dev
```

Visit each:
- `http://localhost:3000/sqwaadrun` (owner dashboard)
- `http://localhost:3000/plug/sqwaadrun` (public landing)
- `http://localhost:3000/smelter-os/fleet` (fleet roster)

Verify no horizontal scroll, cards breathe at md/lg breakpoints, nothing overflows.

- [ ] **Step 5: Commit**

```bash
git add "cti-hub/src/app/(dashboard)/sqwaadrun/page.tsx" cti-hub/src/app/plug/sqwaadrun/page.tsx "cti-hub/src/app/(dashboard)/smelter-os/fleet/page.tsx"
git commit -m "chore(hawks): grid column pass for wider HawkCard v2 dimensions"
```

---

## Phase 8 — `/smelter-os/creative` Sqwaadrun Re-Roll tab

### Task 8.1: Add Sqwaadrun Re-Roll tab to creative surface

**Files:**
- Modify: `cti-hub/src/app/(dashboard)/smelter-os/creative/page.tsx`
- Create: `cti-hub/src/app/(dashboard)/smelter-os/creative/SqwaadrunReRollTab.tsx`

- [ ] **Step 1: Read the existing creative page to understand its tab structure**

```bash
cd cti-hub && head -60 "src/app/(dashboard)/smelter-os/creative/page.tsx"
```

Expected: an existing owner-gated page with some tab or section structure. If the page has no tabs, the new Sqwaadrun Re-Roll section will be a new top-level section. Note the exact pattern used.

- [ ] **Step 2: Create the re-roll tab component**

Create `cti-hub/src/app/(dashboard)/smelter-os/creative/SqwaadrunReRollTab.tsx`:

```typescript
'use client';

import { useState } from 'react';
import { HAWK_PROFILES } from '@/lib/hawks/characters';

const PRESETS = [
  { id: 'sqwaadrun-lil-hawk',      label: 'Lil_Hawk (17 characters)' },
  { id: 'sqwaadrun-backdrop',      label: 'Night Port Backdrop' },
  { id: 'chicken-hawk-dispatcher', label: 'Chicken_Hawk (dispatcher)' },
  { id: 'boomer-ang-supervisor',   label: 'Boomer_Ang Supervisor (General_Ang)' },
  { id: 'acheevy-digital-ceo',     label: 'ACHEEVY Digital CEO' },
];

const COLOR_BY_SLUG: Record<string, string> = {
  lil_guard_hawk:   '#DC2626', lil_scrapp_hawk:  '#F97316', lil_parse_hawk:   '#3B82F6',
  lil_crawl_hawk:   '#F59E0B', lil_snap_hawk:    '#EC4899', lil_store_hawk:   '#06B6D4',
  lil_extract_hawk: '#EAB308', lil_feed_hawk:    '#A855F7', lil_diff_hawk:    '#EF4444',
  lil_clean_hawk:   '#10B981', lil_api_hawk:     '#6366F1', lil_queue_hawk:   '#22D3EE',
  lil_sitemap_hawk: '#84CC16', lil_stealth_hawk: '#64748B', lil_schema_hawk:  '#0EA5E9',
  lil_pipe_hawk:    '#92400E', lil_sched_hawk:   '#8B5CF6',
};

type Candidate = { png_base64: string; latencyMs: number };

export function SqwaadrunReRollTab() {
  const [presetId, setPresetId] = useState<string>(PRESETS[0].id);
  const [slug, setSlug] = useState<string>(HAWK_PROFILES[0].slug);
  const [loading, setLoading] = useState(false);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  async function handleRender() {
    setLoading(true);
    setError(null);
    setCandidates([]);

    const profile = HAWK_PROFILES.find((p) => p.slug === slug);
    const vars: Record<string, string | string[]> =
      presetId === 'sqwaadrun-lil-hawk' && profile
        ? {
            callsign: profile.callsign.replace(/_/g, ' '),
            role: profile.visualDescription.split('.')[0],
            rimColor: COLOR_BY_SLUG[slug] ?? profile.signatureColor,
            gearList: profile.gear,
            stance: 'ready combat stance',
          }
        : presetId === 'boomer-ang-supervisor'
        ? { callsign: 'General_Ang', patchText: 'GEN' }
        : presetId === 'acheevy-digital-ceo'
        ? { visorColor: 'warm orange', setting: 'a modern penthouse studio' }
        : {};

    try {
      const res = await fetch('/api/visual-engine/render', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ presetId, vars, candidates: 3 }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const payload = (await res.json()) as { candidates: Candidate[] };
      setCandidates(payload.candidates);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleApprove(candidate: Candidate) {
    // Slug format matches existing characters.ts conventions:
    //   HAWK_PROFILES:    underscores (e.g. "lil_guard_hawk")
    //   COMMAND_PROFILES: dashes      (e.g. "general-ang", "chicken-hawk")
    //   ACHEEVY:          lives outside both profile arrays — its canon file is
    //                     public/brand/_refs/acheevy-canon-rendered.png
    const targetSlug =
      presetId === 'sqwaadrun-lil-hawk' ? slug :
      presetId === 'chicken-hawk-dispatcher' ? 'chicken-hawk' :
      presetId === 'boomer-ang-supervisor' ? 'general-ang' :
      presetId === 'acheevy-digital-ceo' ? 'acheevy' :
      'unknown';

    try {
      const res = await fetch('/api/visual-engine/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetSlug,
          winnerBase64: candidate.png_base64,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setDirty(true);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold mb-1">Sqwaadrun Re-Roll</h2>
        <p className="text-sm opacity-60">
          Regenerate any single Sqwaadrun character via Iller_Ang. Approved renders write
          directly to <code className="font-mono">public/hawks/</code> (or the ACHEEVY canon
          ref for that preset) and bust the image cache.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">Preset</span>
          <select
            value={presetId}
            onChange={(e) => setPresetId(e.target.value)}
            className="bg-[#0B1220] border border-white/10 rounded-sm px-3 py-2"
          >
            {PRESETS.map((p) => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>
        </label>

        {presetId === 'sqwaadrun-lil-hawk' && (
          <label className="flex flex-col gap-1">
            <span className="text-[10px] font-mono tracking-widest opacity-60 uppercase">Character</span>
            <select
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="bg-[#0B1220] border border-white/10 rounded-sm px-3 py-2"
            >
              {HAWK_PROFILES.map((p) => (
                <option key={p.slug} value={p.slug}>{p.callsign}</option>
              ))}
            </select>
          </label>
        )}

        <button
          onClick={handleRender}
          disabled={loading}
          className="px-5 py-2.5 font-bold tracking-wide text-sm transition-all disabled:opacity-40"
          style={{ background: '#F5A623', color: '#050810' }}
        >
          {loading ? 'Iller_Ang working...' : 'Render 3 candidates'}
        </button>
      </div>

      {error && (
        <div
          className="p-3 text-xs border-l-2"
          style={{ borderColor: '#EF4444', background: 'rgba(239,68,68,0.08)', color: '#FCA5A5' }}
        >
          {error}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {candidates.map((c, i) => (
            <div key={i} className="flex flex-col gap-2">
              <img
                src={`data:image/png;base64,${c.png_base64}`}
                alt={`Candidate ${i + 1}`}
                className="w-full rounded-sm border border-white/10"
              />
              <button
                onClick={() => handleApprove(c)}
                className="text-xs font-mono tracking-wider px-3 py-2 border border-white/10 hover:bg-white/5"
              >
                Approve + Write #{i + 1}
              </button>
            </div>
          ))}
        </div>
      )}

      {dirty && (
        <div
          className="p-3 text-[11px] font-mono border-l-2"
          style={{ borderColor: '#F5A623', background: 'rgba(245,166,35,0.06)', color: '#FCD34D' }}
        >
          ⚠ Repo now has uncommitted changes. When you're done iterating:{' '}
          <code className="text-white">git add public/hawks/ public/brand/_refs/ && git commit</code>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Wire the tab into the existing `/smelter-os/creative/page.tsx`**

Read the existing file and add the import + render-site for `<SqwaadrunReRollTab />`. The exact insertion depends on whether the existing page uses tabs or top-level sections:

- **If the page has a tab list:** add a new tab entry labeled `"Sqwaadrun"` that renders `<SqwaadrunReRollTab />` when active.
- **If the page is a series of sections:** add a new `<section>` near the top that wraps `<SqwaadrunReRollTab />`.

Use the Edit tool on the existing `page.tsx` — do NOT rewrite it whole. Preserve every existing behavior on that page.

- [ ] **Step 4: Start dev server and verify the tab renders**

```bash
cd cti-hub && pnpm dev
```

Visit `http://localhost:3000/smelter-os/creative` (owner login required). Click into the new Sqwaadrun Re-Roll surface and verify:
- Preset picker renders with 5 options
- Character picker appears only when Lil_Hawk preset is selected
- "Render 3 candidates" button is clickable
- Click produces either 3 candidate previews OR a clear error message (depending on whether your Recraft/Ideogram keys are wired)

NOTE: if you don't have RECRAFT_API_KEY or IDEOGRAM_API_KEY in `.env.local` yet, the button will error with "Visual engine unavailable" — that's expected and verifies the error path works. Pull keys from openclaw when ready to live-test.

- [ ] **Step 5: Commit**

```bash
git add "cti-hub/src/app/(dashboard)/smelter-os/creative/SqwaadrunReRollTab.tsx" "cti-hub/src/app/(dashboard)/smelter-os/creative/page.tsx"
git commit -m "feat(smelter-os): Sqwaadrun Re-Roll tab on /smelter-os/creative"
```

---

## Phase 9 — Render pass + manual QA

This phase has no code tasks. It's the human-in-the-loop pass that turns the machinery into committed art. Complete each step in order and check each box.

### Task 9.1: Pull Visual Engine secrets from openclaw

**Files:**
- Create: `cti-hub/.env.local` (gitignored)

- [ ] **Step 1: SSH into openclaw and pull RECRAFT_API_KEY**

```bash
ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 printenv RECRAFT_API_KEY'
```

Expected: the key prints (or is empty if not yet set in openclaw — in which case set it there first).

- [ ] **Step 2: Pull IDEOGRAM_API_KEY the same way**

```bash
ssh myclaw-vps 'docker exec openclaw-sop5-openclaw-1 printenv IDEOGRAM_API_KEY'
```

- [ ] **Step 3: Write both keys into `cti-hub/.env.local`**

Do NOT paste the values here. Open `cti-hub/.env.local` in your editor and add:

```bash
RECRAFT_API_KEY=<paste Recraft key>
IDEOGRAM_API_KEY=<paste Ideogram key>
```

Save. `.env.local` is already gitignored.

- [ ] **Step 4: Verify the keys are picked up by a test invocation**

Start a quick REPL:

```bash
cd cti-hub && node --experimental-strip-types -e "
console.log('RECRAFT:', process.env.RECRAFT_API_KEY ? 'set' : 'MISSING');
console.log('IDEOGRAM:', process.env.IDEOGRAM_API_KEY ? 'set' : 'MISSING');
"
```

Expected: both show "set". If either says MISSING, check `.env.local` path and try `cd cti-hub` first.

---

### Task 9.2: Bootstrap the style anchor

- [ ] **Step 1: Run `gen-sqwaadrun.ts` for the first time**

```bash
cd cti-hub && pnpm tsx scripts/visual-engine/gen-sqwaadrun.ts
```

The script will detect no existing anchor and prompt:
```
[bootstrap] generating 3 style-anchor candidates...
```

After the 3 candidates render (45–90 seconds typical), it will prompt:
```
Which candidate becomes the locked anchor? (1/2/3):
```

- [ ] **Step 2: Review the 3 anchor candidates in an image viewer**

Open these files in any image viewer:
```
cti-hub/scripts/visual-engine/out/candidates/_anchor/1.png
cti-hub/scripts/visual-engine/out/candidates/_anchor/2.png
cti-hub/scripts/visual-engine/out/candidates/_anchor/3.png
```

Pick the one that best captures:
- Chibi-proportioned armored hawk
- Standing on the Sqwaadrun night port (cranes, container glow, wet reflective pavement)
- Cinematic lighting, clear focal point
- NOT looking like the `baseline-remedial-bird.png` cartoon style

- [ ] **Step 3: Type your choice at the prompt**

Type `1`, `2`, or `3` and press Enter. The script writes the winner to `public/brand/_refs/sqwaadrun-lil-hawk-anchor.png` and continues to the 20-character batch render.

- [ ] **Step 4: Wait for the 20-character batch to complete**

Takes ~20–40 minutes depending on Recraft rate limits. Script logs each character as it completes. If any character fails all 8 adapters, the script aborts — re-run after fixing the underlying issue.

When done, you'll see:
```
[proof-sheet] ✓ written to scripts/visual-engine/out/proof-sheet-<ts>.png
[approvals] template written to scripts/visual-engine/out/approvals.yaml
=== DONE ===
```

---

### Task 9.3: Review proof sheet and write approvals

- [ ] **Step 1: Open the proof sheet**

```
cti-hub/scripts/visual-engine/out/proof-sheet-<timestamp>.png
```

Scan all 20 rows. For each character, pick the best of the 3 candidates against the quality bar:
- Does it feel like it belongs to the same fleet as the others?
- Does the rim-light color match the role?
- Is the character the clear focal point?
- Does the night-port backdrop read correctly?
- Does it clear the baseline-remedial-bird threshold?

- [ ] **Step 2: Edit `scripts/visual-engine/out/approvals.yaml`**

Open the YAML and change each `reroll` value to the candidate index you approved (1, 2, or 3). For any character you can't approve with confidence, leave `reroll` — you'll redo it via the UI.

Target: approve at least 12 of 20 in the first pass (spec success criterion §14.8).

- [ ] **Step 3: Save the YAML**

---

### Task 9.4: Apply approvals

- [ ] **Step 1: Run the apply script**

```bash
cd cti-hub && pnpm tsx scripts/visual-engine/apply-approvals.ts
```

Expected output:
```
=== Apply Approvals ===
[apply] ✓ approved:  N — lil_guard_hawk, lil_scrapp_hawk, ...
[apply] · rerolled:  M — ...
[apply] · skipped:   0
[apply] audit log → scripts/visual-engine/out/applied-<ts>.json
```

- [ ] **Step 2: Review the git diff**

```bash
cd cti-hub && git status && git diff src/lib/hawks/characters.ts
```

Expected: `public/hawks/` has N new PNGs, `src/lib/hawks/characters.ts` has N `imageReady: false → true` flips and N `signatureColor` updates. No other files touched.

- [ ] **Step 3: Commit the renders + characters.ts edits**

```bash
git add cti-hub/public/hawks/ cti-hub/public/brand/_refs/ cti-hub/src/lib/hawks/characters.ts
git commit -m "feat(hawks): commit approved Sqwaadrun renders + role-based colors"
```

---

### Task 9.5: Visual QA on the 3 consumer pages

- [ ] **Step 1: Start dev server**

```bash
cd cti-hub && pnpm dev
```

- [ ] **Step 2: Verify `/smelter-os/fleet`**

Visit `http://localhost:3000/smelter-os/fleet`. Confirm:
- Every approved hawk renders with full-bleed cinematic art
- Placeholder SVG only shows for hawks you left as `reroll`
- Back-face dossier still flips correctly
- No horizontal scroll at any viewport

- [ ] **Step 3: Verify `/sqwaadrun`**

Visit `http://localhost:3000/sqwaadrun` (owner dashboard). Same checks as above.

- [ ] **Step 4: Verify `/plug/sqwaadrun`**

Visit `http://localhost:3000/plug/sqwaadrun` (public landing). Same checks as above. If you bumped the hero row to `size="lg"` in Task 7.2 Step 3, confirm the hero cards are noticeably larger than the grid cards.

- [ ] **Step 5: CLAUDE.md IP-protection audit**

```bash
cd cti-hub && grep -rniE "recraft|ideogram|imagen|openrouter|fal\.ai|kie\.ai" src/app src/components
```

Expected: zero matches in `src/app` and `src/components` (user-facing code paths). Matches in `src/lib/visual-engine/` are fine — that's internal. If any match shows up in app or components code, rename it immediately.

- [ ] **Step 6: Re-roll any unsatisfactory renders via the UI**

For any character still at `imageReady: false` (or any committed render you want to redo):

1. Visit `/smelter-os/creative` → Sqwaadrun Re-Roll tab
2. Pick preset + character
3. Click "Render 3 candidates"
4. Click "Approve + Write" on the winner
5. When the dirty-state banner appears, commit:
   ```bash
   git add cti-hub/public/hawks/ && git commit -m "feat(hawks): re-roll <slug>"
   ```

- [ ] **Step 7: Push the branch**

```bash
git push -u origin feat/smelter-os-hawk-cards
```

- [ ] **Step 8: Open a PR to main**

```bash
gh pr create --base main --head feat/smelter-os-hawk-cards --title "feat: Visual Engine + Sqwaadrun Hawk Cards" --body "$(cat <<'EOF'
## Summary
- New Visual Engine module (`src/lib/visual-engine/`) with adapter registry keyed by surface
- Recraft V4 primary + Ideogram V3 fallback, 6 adapter stubs for the rest of the canonical chain
- 5 preset JSON files for Sqwaadrun visual canon (backdrop, lil-hawk, chicken-hawk, boomer-ang, acheevy)
- 20 broadcast-grade character renders committed to `public/hawks/` + ACHEEVY canon to `public/brand/_refs/`
- HawkCard v2 — full-bleed hero front face, back-face dossier unchanged
- `/smelter-os/creative` Sqwaadrun Re-Roll tab for owner-gated single-character re-rolls
- Role-based color system locked in `characters.ts`

## Test plan
- [x] Unit tests for interpolate, presets, adapters, registry, engine, load-references, proof-sheet, characters-edit, apply-approvals
- [x] Bootstrap anchor approved via CLI
- [x] Batch render produced proof sheet, ≥12 of 20 characters approved first pass
- [x] `/smelter-os/fleet`, `/sqwaadrun`, `/plug/sqwaadrun` all render the new HawkCard with new art
- [x] Back-face dossier visual parity with v1
- [x] `/smelter-os/creative` Sqwaadrun Re-Roll tab functional
- [x] CLAUDE.md IP-protection audit clean — no model/adapter strings in src/app or src/components

## Spec + Plan
- Spec: `docs/superpowers/specs/2026-04-08-visual-engine-sqwaadrun-hawk-cards-design.md`
- Plan: `docs/superpowers/plans/2026-04-08-visual-engine-sqwaadrun-hawk-cards.md`

## Deferred to follow-up specs
- Sub-project #3: end-user Visual Stepper (Paperform wizard, token-metered) for Per|Form player cards + Deploy Platform custom Digital CEO avatars
- Sub-project #4: additional presets (scene backgrounds, player cards, NFT cards)
- Real wiring of Vertex Imagen 4, fal.ai, Kie.ai, Nano Banana, GLM, GPT Image stubs
- Neon audit table + GCS write-through cache
- HawkCard visual regression testing

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

---
