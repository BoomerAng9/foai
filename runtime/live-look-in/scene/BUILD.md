# Shield Division Deployment Bay — Scene Build Guide

Build path from the scene descriptor + concept frames + character
portraits into a live NVIDIA Omniverse scene that Live Look In can
stream.

## Inputs

| Asset | Path | Role |
|---|---|---|
| Scene descriptor | `deployment_bay.yml` | Architectural layout, Hawk placements, governance-encoding callouts |
| Authoring brief | `../DEPLOYMENT_BAY_SCENE.md` | Human-readable design intent |
| Character portraits | `cti-hub/public/hawks/shield/*.png` | 32 portraits, concept references for 3D modeling |
| Hero concept frames | `cti-hub/public/hawks/shield/scene/*.png` | 5 cinematic stills establishing mood and architecture |
| Character canon | `cti-hub/src/lib/hawks/shield-characters.ts` | Full per-Hawk visual spec |
| Governance registry | `chicken-hawk/config/shield_personas.yml` | The governance model the scene encodes |

## Outputs

| Artifact | Target |
|---|---|
| USD scene file | `scene.usd` (Omniverse world) |
| Per-Hawk USD characters | `characters/<lil_x_hawk>.usd` |
| Cosmos WFM nodes | platform topology, Merkle visualizer, ATT&CK heatmap |
| Animation blueprints | the 5 signature beats (launch / flinch / rebirth / P0 / nominal) |

## Build sequence

1. **Ingest concept refs** — Lil_Viz_Hawk loads the 32 character PNGs
   and 5 scene stills from the paths above as reference material.

2. **Model 32 Hawks** — for each Hawk in `shield_personas.yml`:
   - Base model: anthropomorphic eagle per `project_shield_division_hawk_anatomy.md`
   - Apply squad palette (black/blue/purple/white/gold_platinum)
   - Apply per-Hawk persona details from `shield-characters.ts` visualDescription
   - Export `characters/<slug>.usd`

3. **Assemble bay architecture** — parse `deployment_bay.yml`:
   - Floor with orange DEPLOY-chevron inlays + central triskele
   - Three substrate pylons with dynamic LED states
   - Squad territories as spatial regions (see each territory's
     `floor_region` and `elevation`)
   - Gold & Platinum catwalk at elevation 8
   - White Squad conscience balcony at elevation 4
   - Paranoia's independent booth at elevation 10 + **NO door** to
     Crypt_Ang's office (enforce on build; the absence is the point)

4. **Wire Cosmos WFM renderers**:
   - `platform_topology_holograph` at bay center, 10-node graph, 2 rpm
   - `merkle_chain_visualizer` on north wall
   - `attack_coverage_heatmap` on south balcony behind Bridge's post

5. **Place characters at posts** — use each territory's `posts[]` array.
   Golden Image pedestals spawn at each post.

6. **Author 5 signature beat animations** — one per scene still:
   - `nominal_ops` (idle loop, all Hawks at posts)
   - `black_squad_launch` (SAT gate open, Reaper transits, Halo co-signs)
   - `paranoia_flinch` (topology ripples, Paranoia booth glows orange,
     Gold Hawks glance, Crypt_Ang office light visible but unresponsive)
   - `phoenix_rebirth` (pedestal dissolve/rematerialize particulates)
   - `p0_incident` (Mode 3 banner, substrate pylons cycle colors)

7. **Gate: architectural-governance audit** — before the scene ships,
   verify with `shield_personas.yml`:
   - Paranoia's booth has NO door to Crypt_Ang's office
   - Halo's catwalk post is at central choke-point (x = 0)
   - Mission-launch chevron inlay runs from main floor through Black wing
   - Substrate pylons are exactly 3, physically separated

## Governance-as-architecture verifier

A scripted check (to be written) walks `deployment_bay.yml` and
asserts:

- `paranoia_independent_booth.door_to_crypt_ang_office == NONE`
- `crypt_ang_office.door_to_paranoia_booth == NONE`
- Every Hawk in `shield_personas.yml` has a post in the scene
- No Hawk is posted outside its squad's territory
- `signature_beats.paranoia_flinch.triggers` includes
  `crypt_ang_office.light_visible_but_unresponsive`

If any assertion fails, the build fails. Governance-encoding is not
optional set-dressing — it's load-bearing canon.

## Runtime integration

Once built, the scene streams via:

- `runtime/live-look-in/` service (existing scaffold)
- NVIDIA Omniverse server hosting the USD
- Cosmos WFM microservices for the dynamic holograph nodes
- Hawk activity feed from the Spinner policy engine — each
  `validate()` call produces a telemetry event that the scene reflects
  (Hawk post lights up when its Hawk is active, substrate pylons
  respond to consensus state, topology ripples on anomalies)

## Follow-up work

Ordered by leverage:

1. **Write `build-scene.py`** — parses `deployment_bay.yml` and emits
   USD. Currently manual.

2. **Write the governance-as-architecture verifier** — the scripted
   check described above. Block the scene-build pipeline on violations.

3. **Wire Spinner telemetry → scene** — real-time: when the policy
   engine validates an invocation, the Hawk's post illuminates. When a
   denial fires, that Hawk's post flashes red. When Paranoia runs her
   hourly simulation, the `paranoia_flinch` beat fires automatically.

4. **Publish to Live Look In front-end** — the existing `runtime/
   live-look-in/` scaffold consumes the USD stream and presents it to
   the user via a PiP viewer. First user-visible integration of the
   Shield Division in Live Look In.
