# Image Brief — ACHEEVY with Multiple Spinners (Bandolier)

## Purpose

Canonical hero/character art of ACHEEVY equipped with multiple Spinners across his chest, carried as firearms would be carried in a bandolier — but Spinners are execution instruments, not weapons. Used for: Meet the Team hero card, foai.cloud landing, Deploy Platform commissioning art, TOS page header, Boomer_Ang squad formation shots.

## Character (locked per `project_foai_universe_canon.md`)

- **Identity**: ACHEEVY, Digital CEO
- **Helmet**: Full helmet with **orange/gold glowing visor** — no face visible under any circumstance
- **Chevron rank**: Above the head, 2-chevron insignia (CEO tier, differentiates from Boomer_Angs who have no chevron)
- **Jacket**: Tan leather jacket, worn and broken in
- **Pants**: Cargo pants
- **Gloves**: Tactical gloves
- **Stance**: Commanding, front-and-center, slight hero angle (low-three-quarter camera)
- **Size on canvas**: Fills ~60% of frame height, centered

## Armament (the key addition per 2026-04-16 directive)

**Across ACHEEVY's chest, a leather bandolier / chest-rig with 4–6 Spinner holsters.** Each holster securely seats one Spinner (the canonical Boomer_Ang boomerang: dark leather-wrapped body, engraved metal band with "ANG" stamped, slight gold glow along the inner edge). Arrangement:

- 2 Spinners angled inward across the left pectoral
- 2 Spinners angled inward across the right pectoral
- 1–2 Spinners at the solar plexus in quick-draw position
- Leather straps running over both shoulders, buckling at the back (not visible in the hero shot)
- The Spinners are **drawable** — ACHEEVY can pull one, throw it, it returns

## Hard constraints (negative prompts)

- **No firearms**. No handguns, rifles, holstered sidearms, shoulder-slung weapons.
- **No bladed weapons**. No knives, swords, daggers.
- **No cyber-weapons, no energy blades, no explosives.**
- **No face visible** under the visor.
- **No occult/mystical imagery** (per universe canon).
- **Not dystopian, not grim-dark**. The universe is sci-fi grounded + coastal Georgia warm.

## Setting (golden-hour canon per `project_foai_universe_canon.md`)

- **Location**: The FOAI port — coastal Georgia dock at golden hour
- **Sky**: Pink / coral / orange gradient (magic hour)
- **Ground**: Wet dock planks, container shipping yard in middle distance
- **Back light**: Warm golden sun behind ACHEEVY, creating rim-light on the leather and making the Spinners silhouette
- **Atmospherics**: Light haze, a wood stork or heron in flight in the distance (birds are native coastal Georgia, never pelicans)
- **Reference photo**: `IMG_2360.HEIC` (Rish's real coastal Georgia sunset)

## Optional squad variation

Second composition for Meet the Team hero: ACHEEVY center, two Boomer_Angs flanking (one on each side), each Boomer_Ang has 1 Spinner in hip holster and 1 in chest sling. Two drones flank the formation (one left, one right, per `project_boomer_ang_character_theming.md`). Still golden hour, still coastal dock.

## Technical targets

| Output | Resolution | Use |
|---|---|---|
| Hero card | 2048×2048 (1:1) | foai.cloud landing, Meet the Team card |
| Hero banner | 2400×1200 (2:1) | cti-hub dashboard top banner, Deploy Platform landing |
| Squad formation | 3000×2000 (3:2) | Agent HQ page, marketing renders |
| Avatar | 512×512 | Chat avatars, Live Look In NPC reference |

## Generation route (per `project_design_routing.md`)

1. **Recraft V4** (primary) — best for illustrated-photographic hybrid with controllable style
2. **Ideogram V3** (fallback) — strong on text-in-image (Spinner "ANG" band legibility)
3. **Imagen 4 via Vertex AI** (alt) — keeps us in the Google billing stack alongside Gemini TTS
4. **Nano Banana / fal.ai** (extended fallback) — for squad compositions if Recraft can't hold multi-character coherence

## Prompt scaffold (Recraft-style)

```
Hero shot of ACHEEVY, Digital CEO character in the FOAI universe.
Cinematic low-three-quarter angle, commanding stance, front-and-center.

Wearing: full tactical helmet with a glowing orange-gold visor, no face
visible; tan leather jacket broken-in; cargo pants; tactical gloves.
A 2-chevron rank insignia floats above the helmet.

Equipped with a leather bandolier across the chest, holding SIX Spinners
(dark leather-wrapped boomerangs with engraved metal bands stamped "ANG",
gold inner-edge glow). Spinners arranged symmetrically across the
pectorals; leather straps buckling over both shoulders.

Setting: coastal Georgia shipping port at golden hour, pink-coral-orange
sky, wet dock planks, shipping containers in middle distance, warm rim
light, a wood stork in distant flight, faint haze.

Style: grounded sci-fi realism, cinematic composition, warm color
grading, 35mm camera feel. High detail on the leather and metal.

NEGATIVE PROMPTS: no firearms, no handguns, no rifles, no knives, no
blades, no energy weapons, no explosives, no occult imagery, no face
visible, no mystical elements, no dystopian grimdark tone.
```

## Provenance

- Visual canon: `project_foai_universe_canon.md`
- Armament doctrine: `feedback_spinner_is_the_armament.md` (2026-04-16)
- Spinner icon: `feedback_boomerang_spinner_image.md`
- Character theming framework: `project_boomer_ang_character_theming.md`
- Canonical org chart: `project_canonical_org_chart.md`
