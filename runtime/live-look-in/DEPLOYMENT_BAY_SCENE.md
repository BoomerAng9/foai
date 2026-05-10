# Deployment Bay — Shield Division Scene Brief

**Scope:** The primary Live Look In scene where the user observes the ACHIEVEMOR Shield Division operating
**Owner:** Iller_Ang (scene concept) + Lil_Viz_Hawk (complex 3D composition) + Lil_Blend_Hawk (post/export)
**Engine:** NVIDIA Omniverse + Cosmos WFM
**Status:** CONFIRMED direction — Approach 2 (Differentiated) selected 2026-04-17
**Open Mind cycle:** Foster ✓ · Develop ✓ · Hone (in progress via this brief)

## One-line concept

A tactical deployment bay where Shield Division Hawks come and go from missions, with every spatial decision encoding a v1.6 governance fact — so the architecture itself reads as documentation of the security model.

## Governance-as-architecture (the core trick)

Each of these v1.6 invariants maps to a physical element of the bay. The viewer learns the governance model without being told.

| v1.6 fact | Physical encoding |
|---|---|
| Paranoia reports to ACHEEVY, not Crypt_Ang | Paranoia's booth sits behind Halo's platinum console. No doorway connects it to Crypt_Ang's office. There IS a direct comms line to ACHEEVY overhead, visible. |
| Halo co-signs every Gold op | Platinum co-signer console at the bay's central choke point. Anyone headed to a Gold op physically passes Halo's station. |
| Gold & Platinum is elite | Elevated catwalk above the main floor — Gold Hawks overwatch, main-floor Hawks operate. |
| Black Squad is SAT-gated and kinetic | Sealed armory wing. Steel door. SAT panel visible. Nothing enters without issuance. |
| Blue Squad is standing-authority | Front-of-floor detection stations — lights stay on 24/7. No gate. |
| Purple Squad bridges | A literal walkway connecting Black's wing and Blue's detection stations. Formally-verified-API-shaped. |
| White Squad is advisory | Conscience balcony overlooking the floor. Counsel's legal reference library visible in background. |
| Phoenix Protocol (24h rebirth) | Golden Image pedestals at each Hawk's post. Hawks rematerialize at shift change. |
| 3-substrate Spinner consensus | Three terminal pylons in the center of the bay — Linux bare-metal / macOS / WASM RISC-V — physically separate, with the CIA Tri-Factor rendered as a triskele inlaid in the floor between them. |
| 10 platforms under protection | Suspended holographic topology of the 10 platforms in mid-air at bay center, Cosmos-rendered, slowly rotating. |

## Spatial layout (text plan)

```
                    ┌─────────────────────────────────┐
                    │       ACHEEVY overhead          │
                    │       comms beacon              │
                    └───────────┬─────────────────────┘
                                │
              ┌─────────────────┴─────────────────┐
              │   Paranoia booth (independent)    │
              │   glass-walled, amber-lit          │
              │   NO door to Crypt_Ang            │
              └───────────────┬───────────────────┘
                              │
  ┌──────────────────────────────────────────────────────┐
  │   GOLD & PLATINUM CATWALK (elevated, platinum trim)  │
  │   Halo's co-signer console at center-choke           │
  │   Oracle / Vault / Ghost / Titan / Mirror / Hex      │
  └──────────────────────────────────────────────────────┘
                              │
  ┌────────────────────────── BAY FLOOR ─────────────────────────┐
  │  [White balcony overlooking]  │   [Conscience balcony]       │
  │                                                               │
  │  Black Squad            Suspended 10-platform topology        │
  │  sealed wing              (Cosmos-rendered, rotating)         │
  │  [SAT gate]                                                   │
  │       ↑                     ↑     ↑     ↑                     │
  │       ↑               Linux  macOS  WASM                      │
  │       ↑            (3 substrate pylons)                       │
  │       ↑              CIA triskele floor inlay                 │
  │       ↑                                                       │
  │   Purple bridge-walk → Blue Squad detection front row        │
  │                                                               │
  │  Golden Image pedestals at every post                         │
  │  DEPLOY chevrons inlaid in polished black floor               │
  └───────────────────────────────────────────────────────────────┘
```

## Visual palette

- **Floor**: polished black with orange `#FF6B00` DEPLOY-chevron inlays forming navigational paths
- **Walls**: tactical dark grey, MOLLE-paneled
- **Lighting**: cool operational base, warm amber pools at independent stations (Paranoia's booth), platinum-white at Gold catwalk, ACHEEVY orange reserved for ACHEEVY's overhead presence and Paranoia's accent line
- **Holographic elements**: cyan-green Cosmos WFM renders for the 10-platform topology, the Merkle chain visualizer on the back wall, the ATT&CK coverage heatmap at Bridge's Purple Squad console
- **Signage**: A.I.M.S. wordmark visible but restrained. Squad epithets ("The Kinetic Hammer", "The Immune System") as subtle wall etchings at each squad's territory — not hero text
- **Negative space**: the bay is LARGE. Hawks feel distinct, not crowded.

## Signature beats (5 hero stills to generate first)

These five Omniverse-rendered frames establish the space before any animation. Iller_Ang briefs Lil_Viz_Hawk with these.

1. **Nominal ops (establishing shot)** — wide, bay at full activity, Hawks at stations, 10-platform holograph center-stage. No crisis. Just the machine working.
2. **Black Squad mission launch** — Captain authorizing Reaper at the SAT gate; sealed wing opening; Halo visible co-signing in background; Spinner armed.
3. **Paranoia's flinch (hourly simulation)** — Paranoia has triggered a compromise simulation; the organism-layer ripples across the holograph; Gold & Platinum Hawks glance toward the booth; Crypt_Ang's office light is visible but unresponsive (reinforces independence); ACHEEVY overhead channel active.
4. **Shift-change rebirth (Phoenix Protocol)** — a Hawk's Golden Image pedestal glowing; the Hawk dematerializing at the old post and the replacement instance materializing at the new. One frame captures both states overlapping.
5. **P0 incident declare (Titan's moment)** — Titan stands at command; Mode 3 Survival banner red across upper walls; three substrate pylons visibly switch pattern; Doc and Cipher already in motion.

## Pre-mortem (already failed drafts — avoid)

Per Open Mind §Pre-mortem, the blacklist:

- ❌ SOC bank-of-monitors set dressing
- ❌ Minority Report swipe table as primary interaction
- ❌ "Cyber ninja" stylization over tactical realism
- ❌ Orange used decoratively rather than as a semantic signal (ACHEEVY + Paranoia only)
- ❌ Crowded floor that loses the "governance-as-architecture" legibility
- ❌ Any element that doesn't encode a real v1.6 fact — decoration without semantics fails the gate

## Model routing

Per Iller_Ang skill:
- **Concept frames (5 hero stills)** — Recraft V4 Pro (cinematic hero imagery)
- **Scene 3D assets / Omniverse geometry** — Iller_Ang requests Lil_Viz_Hawk from Chicken Hawk (execution support for complex 3D)
- **Final scene composition in Omniverse + Cosmos** — GPU-hours at `runtime/live-look-in/` (per `project_nvidia_omniverse_cosmos_accessibility_2026_04_16.md`)
- **Video post / export** — Lil_Blend_Hawk

## Custom + Default (per standing UX rule)

When we surface scene variants to the user:

- **Default** — this Deployment Bay (Approach 2)
- **Custom** — toggle available for Approach 1 (Shield SOC) as a "classic" fallback, or Approach 3 (The Living Organism) as a premium cutaway for P0 incident moments

User accepts default with "ok, tru! I got chu." → render-commit the Deployment Bay as primary.

## Build sequence

1. Iller_Ang generates 5 hero stills (Recraft V4 Pro) from this brief → DMAIC gate
2. 5 Wave-1 Hawks character art from `SHIELD_DIVISION_CHARACTER_BRIEF.md` → DMAIC gate
3. Lil_Viz_Hawk receives hero stills + character art → drafts Omniverse scene skeleton
4. Cosmos WFM integration for the 10-platform topology and Merkle-chain visualizer
5. Live Look In front-end wires into the scene
6. Audit gate — Paranoia's booth positioning + ACHEEVY channel + no-door-to-Crypt_Ang verified against `shield_personas.yml` command_chain

## Related files

- `SHIELD_DIVISION_CHARACTER_BRIEF.md` (Wave 1 Hawk portraits)
- `foai/chicken-hawk/config/shield_personas.yml` (32-Hawk canonical registry)
- `foai/chicken-hawk/config/shield/` (Semantic Constraint Profiles)
- `foai/assets/security/BADGE_SPEC.md` (badge + crest spec — ACHIEVEMOR checkmark platinum)
- Memory: `project_shield_division_hawk_anatomy.md`, `project_nvidia_omniverse_cosmos_accessibility_2026_04_16.md`, `project_live_look_in.md`
