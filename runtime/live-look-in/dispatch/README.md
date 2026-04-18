# Live Look In — Dispatch

Two independent dispatches wait here for execution. Both land Wave 1 of the
Shield Division visual adoption in parallel.

## Dispatch 1 — Character portraits (5 Hawks)

**Route:** Ideogram V3 via existing `render-shield-division.ts` script.

**Execute from `cti-hub/`:**

```bash
cd ~/foai/cti-hub
IDEOGRAM_API_KEY=<key> npx tsx scripts/iller-ang/render-shield-division.ts
```

**Flags:**

- `--slug <slug>` — render a single character (e.g. `--slug lil_mast_hawk`)
- `--force` — re-render even if `imageReady: true`

**Output:**

- PNGs at `cti-hub/public/hawks/shield/{slug}.png`
- Manifest at `cti-hub/scripts/iller-ang/shield-render-manifest.json`
- `imageReady` flipped to `true` in `src/lib/hawks/shield-characters.ts`

**Estimated cost:** 5 × $0.04 = **$0.20** (Ideogram V3 turbo)

**Wave 1 roster:**

| Slug | Callsign | Squad |
|---|---|---|
| `lil_scope_hawk` | Reaper | Black |
| `lil_seal_hawk` | Privacy | White |
| `lil_mast_hawk` | Halo | Gold & Platinum |
| `lil_doubt_hawk` | Paranoia | Gold & Platinum (independent) |
| `lil_peel_hawk` | Hex | Gold & Platinum |

## Dispatch 2 — Scene hero stills (5 frames)

**Route:** Recraft V4 Pro via Iller_Ang's MCP `iller_ang_create` tool, batch payload.

**Payload:** `scene_hero_stills.json` in this directory.

**Execute:**

Iller_Ang's MCP server consumes batch payloads of shape `$schema: iller_ang_create_batch_v1`. If the server is running on the development host, dispatch via ACHEEVY:

> "ACHEEVY, run the batch at `foai/runtime/live-look-in/dispatch/scene_hero_stills.json` through Iller_Ang."

Alternatively, dispatch each asset individually via Agent HQ → Iller_Ang card → "Request Asset" and paste the context block from the JSON.

**Estimated cost:** 5 × Recraft V4 Pro cinematic = approximately $0.10 per image depending on tier, **~$0.50 total**.

**Frames established by these stills:**

1. `deployment_bay_nominal_ops` — wide establishing shot
2. `black_squad_mission_launch` — Reaper through SAT gate, Halo co-signing in background
3. `paranoia_flinch_hourly_simulation` — organism ripple across topology; NO-door-to-Crypt_Ang detail must be legible
4. `phoenix_protocol_rebirth` — Hawk dissolving and rematerializing per 24h cycle
5. `p0_incident_titan_command` — Mode 3 Survival activation, three substrate pylons cycling states

## DMAIC gate (both dispatches)

Apply Iller_Ang's standing quality gate before any asset ships:

- **Define** — asset purpose clear, text content correct, rarity tier (N/A here)
- **Measure** — ≥ 1080px short edge; 4K target for hero stills
- **Analyze** — typography legible where present (A.I.M.S., DEPLOY), zero garbled text
- **Improve** — each asset is visually distinct from its siblings; no firearms anywhere
- **Control** — moderation passed, ACHIEVEMOR wordmark intact, no sensitive ops detail

## What to do if it fails

- **Ideogram API key not set**: ask ACHEEVY to pull `IDEOGRAM_API_KEY` from the `openclaw-sop5-openclaw-1` container on `myclaw-vps` per the standing secrets rule; do not paste in chat
- **Script error**: re-run with `--slug <slug> --force` for the specific failing Hawk
- **Visual miss on a Hawk**: update `src/lib/hawks/shield-characters.ts` visualDescription, flip `imageReady: false`, re-run
- **Hero still misses the governance encoding** (e.g., Paranoia-Crypt_Ang doorway accidentally rendered): re-dispatch that single asset with an adjusted `context` block; do not settle for "close enough"

## Next step after both dispatches complete

Wave 1 DMAIC review → if all 10 assets pass, character art feeds Lil_Viz_Hawk for Omniverse scene skeleton construction, hero stills feed Cosmos WFM for the 10-platform topology render, Live Look In front-end wires into `runtime/live-look-in/`.

See `../SHIELD_DIVISION_CHARACTER_BRIEF.md` and `../DEPLOYMENT_BAY_SCENE.md` for the authoring briefs these dispatches were built from.
