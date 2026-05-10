# `@aims/voice-library` — Voice Pipeline Architecture

The end-to-end pipeline that takes a real voice from the wild, clones it, optionally alters it, stores it durably, and registers it for use by the dialect/sponsorship layers.

> **Owner directive 2026-04-29:** *"There is no need for Eleven Labs at all."* The substrate is **Google Gemini 3.1 Flash Live** (native realtime audio + voice cloning) backed by **Async** (volume cloning) and **Vertex AI Chirp 3 HD Custom Voice** (premium). Reference voices are sourced via **Brave Search API**.

## End-to-end flow

```
1. INGEST              2. CLONE                  3. ALTER (opt)        4. STORE              5. REGISTER
   ───────              ────────                  ─────────────         ─────────             ─────────
   Brave query   ──┐    Async (volume)            pitch                  Puter metadata        VOICE_REGISTRY
   user upload   ──┼─►  Gemini Live (preferred) ─► formant ─► output ─►  GCS bytes (SmelterOS)
   Sqwaadrun MP3 ──┘    Vertex Chirp 3 HD                                                       CharacterVoiceEntry
                                                                                                 .geminiVoiceName
                                                                                                 .cloneId
                                                                                                 .derivativeId

                                                                                              ┌────────────────────┐
                                                                                              │ DIALECT_REGISTRY   │
                                                                                              │ same cast_id keys  │
                                                                                              └────────────────────┘
```

The dialect layer (already shipping) is the SCRIPT pre-processor; this pipeline is the VOICE-TIMBRE backend.

## Type contracts (canonical — see `src/types.ts`)

| Type | Stage | Purpose |
|---|---|---|
| `IngestSource` | 1 | provenance tag (user-upload / brave-discovery / sqwaadrun-scrape / direct-url) |
| `RawSample` | 1 | ingested audio + metadata, addressable by `id` |
| `CloneRequest` / `Clone` | 2 | provider request + result; `providerVoiceId` is the addressable handle |
| `AlterOptions` / `Derivative` | 3 | optional pitch/formant/tempo/blend transformation |
| `AttestationRecord` | gate | compliance gate at production time, NOT ingestion time |
| `CharacterVoiceEntry` | 5 | character → voice resolution (Gemini name OR cloneId OR derivativeId) |

Compliance policy is *attestation-not-ingestion-policing* — see `~/.claude/projects/C--Users-rishj/memory/feedback_attestation_not_ingestion_policing.md` (the rule lives there; types here mirror it).

## Stage 1 — Ingest

**Goal:** acquire reference audio for cloning.

| Adapter | Source | When to use |
|---|---|---|
| `BraveDiscovery` | Brave Search API → public MP3 results | bulk cast discovery; "find a Lowcountry-Southern male voice sample" |
| `UserUpload` | direct file upload | owner-side curated samples (preferred for production) |
| `SqwaadrunScrape` | the Sqwaadrun web fleet | targeted scraping when Brave doesn't surface what's needed |
| `DirectUrl` | given URL | one-off ingestion |

**Output:** `RawSample` written to storage; provenance recorded but not policed (per attestation policy — compliance is at production, not ingestion).

**Out of scope until phase ships:** YouTube audio extraction, podcast feed mining, voice-library-as-API.

## Stage 2 — Clone

**Goal:** turn a raw reference sample into a callable voice handle.

| Adapter | API | Strengths | Weaknesses |
|---|---|---|---|
| `GeminiLive` (preferred) | Gemini 3.1 Flash Live API | native realtime audio, generous free tier, low latency | small native voice list, accent fidelity may need pairing |
| `Async` | async.com | volume-friendly cloning, 1 sample is enough | quality variance, paid |
| `Chirp3HD` | Vertex AI Custom Voice | premium fidelity for owner-curated voices | requires ≥20 min of training audio per voice |

**Adapter contract:**
```ts
interface CloneAdapter {
  readonly provider: CloneProvider;
  clone(req: CloneRequest): Promise<Clone>;
}
```

The orchestrator (`src/clone/index.ts → cloneVoice()`) selects the adapter based on `CloneRequest.provider`. Adapters register themselves at runtime via `registerCloneAdapter()`.

## Stage 3 — Alter (optional, creative)

**Goal:** transform an existing clone (pitch shift, formant, tempo, or blend with another clone) to produce a `Derivative`.

| Operation | Range | Use case |
|---|---|---|
| `pitchSemitones` | -12 to +12 | gender shift, age shift |
| `formantFactor` | 0.7 to 1.4 | vocal tract resonance modeling |
| `tempoFactor` | 0.8 to 1.2 | pacing adjustment without pitch shift |
| `blendWithCloneId` + `blendWeight` | 0 to 1 | hybrid voices for ensemble characters |

Note from `types.ts` header: *"creative, not compliance"* — alteration doesn't make a voice "safer" to use; the attestation gate at render time is what governs production.

## Stage 4 — Store

**Goal:** durable storage of raw samples + clones + derivatives, addressable by id.

Backend: **SmelterOS** = Puter (filesystem metadata layer) + GCS (audio bytes). Same pattern as the rest of the FOAI ecosystem's media storage.

```ts
interface StorageAdapter {
  putBytes(uri: string, bytes: Uint8Array): Promise<void>;
  getBytes(uri: string): Promise<Uint8Array>;
  putMetadata(id: string, record: object): Promise<void>;
  getMetadata<T>(id: string): Promise<T | null>;
}
```

## Stage 5 — Register

**Goal:** map a `characterId` (from the dialect layer) to a runtime voice handle.

Already implemented:
- `src/registry/character-voices.ts` — `VOICE_REGISTRY` + `getCharacterVoice()`
- 12 Coastal Sales-team Boomer_Ang stubs (Sal_Ang, Hos_Ang, Bar_Ang, Con_Ang, Tas_Ang, Tea_Ang, Cou_Ang, Gre_Ang, Har_Ang, Cur_Ang, Reg_Ang, Mat_Ang)
- 1 Coastal Bundle Specialist (Bun_Ang) stub
- `directorialDefaults` for each — audio profile, scene hint, director notes
- Voice resolution fields (`geminiVoiceName` / `derivativeId` / `cloneId`) NULL until samples generated + owner-approved

When a sample is approved, the registry entry is updated with the resolved voice handle.

## Owner approval gate (every voice, every time)

```
ingest → clone → SAMPLE WAV → owner review → APPROVE | REJECT
                              ↑                  │
                              └─── re-spin ──────┘ (REJECT)
                                                 │
                                                 ▼ (APPROVE)
                                              register
                                              (CharacterVoiceEntry handle written)
```

Sample WAVs land in `iCloudDrive/ACHIEVEMOR_/Projects_/The Deploy Platform_/Claude Code/voice-models/` per `feedback_coastal_output_iclou_deploy_platform.md` — owner reviews each, calls back into the package with APPROVE/REJECT. Approved entries get their voice handle filled in; rejected ones go back to clone with different reference / different alter parameters.

## Concrete next-phase tasks

These ship as separate PRs:

1. **Brave Discovery adapter** (`src/ingest/brave-discovery.ts`)
   - Brave Search API client (key in openclaw vault: `BRAVE_API_KEY`)
   - Filter results by audio MIME types
   - Write `RawSample` records to storage

2. **Gemini Live clone adapter** (`src/clone/gemini-live.ts`)
   - Verify Gemini Live's voice-cloning capability at the actual API per `feedback_verify_models_at_api_not_code_comments.md`
   - If supported: implement `clone()` returning a `Clone` with `providerVoiceId`
   - If not supported: fall back to Async or Chirp3HD as primary, native voices as last resort

3. **SmelterOS storage adapter** (`src/storage/puter-gcs.ts`)
   - Puter API for metadata
   - GCS bucket for audio bytes
   - Bucket name + IAM role TBD with owner

4. **Sample-WAV generator** (`scripts/generate-cast-samples.ts`)
   - For each of the 13 Coastal characters (12 carousel + Bun_Ang)
   - Generate a 30-60s sample WAV using each character's `directorialDefaults` + a sample script from their persona
   - Write to `iCloudDrive/.../Claude Code/voice-models/<cast_id>.wav`
   - Open owner-review batch

5. **Approve/Reject flow** (`scripts/voice-approval.ts`)
   - CLI: `voice-approval approve <cast_id> --gemini-voice <name>` writes to registry
   - CLI: `voice-approval reject <cast_id> --reason "..."` queues re-spin

6. **Voice carousel UI** (Coastal storefront)
   - `web/components/voice-carousel.tsx` — cards per cast member with sample WAV + "Order with [Name]" CTA
   - Customer's pick stored in cookie + Stripe customer metadata for return-visit continuity

## Adapter registration pattern (already wired in `src/clone/index.ts`, `src/ingest/index.ts`, etc.)

```ts
// In each submodule's index.ts:
const ADAPTERS = new Map<string, Adapter>();
export function registerAdapter(provider: string, adapter: Adapter) { ADAPTERS.set(provider, adapter); }
export async function execute(req: Request) {
  const adapter = ADAPTERS.get(req.provider);
  if (!adapter) throw new Error(`No adapter registered for ${req.provider}`);
  return adapter.execute(req);
}
```

This lets each adapter ship as its own module without forcing the orchestrator to import all of them at compile time.

## Companion canon

- `~/.claude/projects/C--Users-rishj/memory/feedback_attestation_not_ingestion_policing.md` — the policy that makes this design legally clean
- `~/.claude/projects/C--Users-rishj/memory/feedback_ch_voice_gemini_live_not_inworld.md` — Gemini Live as voice substrate for CH (and by extension Coastal)
- `~/.claude/projects/C--Users-rishj/memory/project_coastal_sales_team_voice_cast_2026_04_29.md` — Coastal cast directive
- `aims-tools/voice-library/CATALOG.md` — character + brand index (always reflect new entries here)
- `aims-tools/voice-library/personas/*.md` — 13 deep persona files (12 cast + Bun_Ang) the voice samples should bring to life
