# G1 — Soul Character Training Set Proposal (owner approval gate)

**Status:** DRAFT — awaiting owner sign-off before any Higgsfield call fires.
**Workflow:** Image-first → video. Train each Soul Character on 5-20 reference
images, then `generate_image(model="soul_2", soul_id=...)` produces
unlimited consistent shots. Video models consume those stills as
`start_image`.

## Roster (with training-set source per cast)

### Group A — Existing references already on disk

These cast members have canonical photos in `web/public/team/`. We use
those as PRIMARY reference + supplement with 4-6 fresh poses generated
from Nano Banana Pro 4K (image-edit using the existing photo as
reference) to round out the 5-20 image training set.

| Cast | Primary reference | Supplemental poses to generate (Nano Banana Pro 4K) |
|---|---|---|
| **Sal_Ang** | `web/public/team/sal_ang.png` + iCloud canon | 5 poses: pouring brass kettle, hand on counter, leaning over coffee bar, three-quarter portrait, smiling close-up — ALL with canonical visor + cream linen + name patch |
| **ACHEEVY** | `web/public/team/acheevy.png` (full-body Kingsmen with helmet) | 4 poses: standing at counter, signing receipt, gesturing toward bar, three-quarter angle |
| **Pip / Har_Ang** | `web/public/team/pip.png` close-up | 5 poses: harbor-view tasting, pouring tea, pouring through glass, from-side angle, three-quarter |
| **Mads / MaCha_Ang** | `web/public/team/mads.png` (mint visor) | 5 poses: whisking matcha, pouring matcha, presenting bowl, three-quarter, full-length at counter |
| **Marcus / LP_Ang (HUMAN)** | `web/public/team/marcus.png` | 5 poses: walking toward camera, hand at counter, three-quarter portrait at counter, full-length, gesturing |
| **Hos_Ang (Louis)** | `web/public/team/hos_ang.png` | 5 poses with WOW cream apron + navy patch |
| **Bar_Ang (Tate)** | `web/public/team/bar_ang.png` | 5 poses: pour-over pour, V60 inspection, scale check, full-length, three-quarter |
| **Tas_Ang (Holt)** | `web/public/team/tas_ang.png` | 5 poses: cupping table, slurping spoon, palate-clean rinse, full-length, three-quarter |
| **Tea_Ang (Eliza)** | `web/public/team/tea_ang.png` | 5 poses: pouring afternoon tea, presenting cake stand, three-quarter, full-length, gesturing |
| **Cou_Ang (Marcus-Sav, distinct from LP Marcus)** | `web/public/team/cou_ang.png` | 5 poses at historic-district counter |
| **Gre_Ang (Naya)** | `web/public/team/gre_ang.png` | 5 poses: morning greet across bar, calling-out gesture, three-quarter, full-length, smiling |
| **Cur_Ang (Vi)** | `web/public/team/cur_ang.png` | 5 poses: tea curator at lot rack, presenting tin, three-quarter, full-length |
| **Reg_Ang (Trey)** | `web/public/team/reg_ang.png` | 5 poses: register flow, payment, handing receipt, three-quarter, full-length |
| **Bun_Ang** | `web/public/team/bun_ang.png` (existing portrait — back-office persona, may need a refresh per current uniform canon) | 4 poses at back-office desk |

### Group B — Build from scratch (no reference yet)

| Cast | Approach | Owner approval points |
|---|---|---|
| **LUC** | Generate canonical look via Nano Banana Pro 4K. Prompt encodes the full Coastal cast canon: Kingsmen-quality dark charcoal suit, no apron, deep coastal amber `#C8732B` silk tie, BLACK tactical visor showing "Lu-Cal" amber LED (face fully hidden), Allen Iverson braids out the top, deep amber "Pretty Lu" enamel lapel broach, Mauri sneakers, Apple Watch, Mont Blanc pen + leather notebook in pocket, holographic Lu-Cal calculator projection from visor when invoked. Generate 6-8 candidates → owner picks the canon → that's the training set seed. | Pick canonical; iterate if off |
| **Melli Capensi (Honey Badger)** | Generate canonical anthropomorphic Honey Badger with explicit species in prompt: "Anthropomorphic Honey Badger character — NOT human — humanoid stance, photorealistic fur (black + white characteristic Honey Badger pattern), upright bipedal, expressive eyes, natural badger morphology adapted to humanoid form, wearing Coastal Brewing Co. MKT field-producer cream canvas vest with utility pockets, MKT honey-yellow `#E8A020` patch + flying-stork mark on upper-left chest, cream linen long-sleeve under, leather notebook + fountain pen as accessories, Gore-Tex Vasque field boots in 'beef and broccoli' colorway." Use Soul Cast (16:9) for cinema-grade or Nano Banana Pro 4K for control. Generate 8-12 candidates → owner picks canon → training set seed. | Pick canonical; iterate if off |
| **Betty-Anne_Ang** | Generate per `coastal-cast/betty-anne-ang/SKILL.md` — Poe from Altered Carbon archetype (shop-steward + mom energy), HR PMO supervisor visual canon. 5-7 candidates → owner picks canon. | Pick canonical |

### Group C — The Sett (Badger BG'z) — extend Melli's species canon

Once Melli's Honey Badger canon is approved (Group B), generate
individual Sett BG members per their specialization:

| BG | Trigger pattern | Visual differentiator |
|---|---|---|
| **Persona Tah** | Influencer engagement | Smaller frame, tablet in hand, cream blazer + MKT patch instead of vest |
| **Eve Retti** | Vertical campaigns | Portfolio under arm, glasses on visor cord |
| **Leu Kurus** | Cross-region | Travel duster jacket, MKT patch on shoulder |
| **(2-3 more BG'z TBD)** | per future need | per spec |

Each BG = own training set (5-20 images), own Soul Character `soul_id`.

### Group D — The Roo's (LP roster, 4-6 individuals)

Anthropomorphic Kangaroos for Loss Prevention. Roster of distinct
individuals, NOT one canonical Roo. Same pattern as the Sett BG'z —
each has a name, visor LED, and minor uniform tell. All wear the LP
uniform (high-resolution button-down + dark slacks + LP visor + Vasque
field boots "beef and broccoli").

**Proposed initial roster (4 to start, 2 more TBD by owner):**

| Roo | Visor LED | Uniform tell | Personality / role within LP |
|---|---|---|---|
| **Mac (Mac_Roo)** | "MAC" | Sleeve roll right side only | Lead Roo, calm + structured, paired with Marcus (LP_Ang) |
| **Joey (Joey_Roo)** | "JOEY" | Kerchief at neck (deep coastal amber) | Younger Roo, brighter energy, customer-warmth specialist |
| **Sky (Sky_Roo)** | "SKY" | Reading glasses on visor cord | Observer Roo, watches the room, signal interpreter |
| **Boomer (Boomer_Roo)** | "BOOMER" | Field-tested boots (slightly more weathered), small leather wrist tooling pouch | Senior Roo, the floor veteran |

**Visual canon for ALL Roo's** — kangaroo morphology in humanoid stance:
- Tall, upright, proportional kangaroo head + ears + muzzle (not cartoonish — photorealistic).
- Subtle / hidden tail behind counter or under jacket for retail context (not aggressive).
- Powerful legs implied; standing posture, not crouched.
- Alert posture, prominent ears.
- Hi-Res LP button-down (charcoal / slate / muted-navy palette) — modern tailoring, not loose hospitality.
- Dark slacks, Vasque field boots beef-and-broccoli.
- Coastal Brewing Co. wordmark / wood-stork pin on left chest.
- LP visor with name LED matching the Roo's name + thin gold rim (vs Sal's gold-on-black, ACHEEVY's gold-glow).

Generate canonical "Roo template" first (8-12 candidates → owner picks
canon), then 4 individual variations (Mac, Joey, Sky, Boomer) using
the canon as reference + species-consistent variations.

## Training set construction protocol

For each character above:

1. Collate primary reference image(s) from `web/public/team/` if they exist.
2. For each supplemental pose proposed, generate ONE candidate via Nano Banana Pro 4K with detailed pose description + the existing portrait as `medias[image]` reference.
3. Owner reviews each candidate (thumbnail strip).
4. Owner approves OR redirects per candidate.
5. Approved candidates → `show_characters(action="train", name="...", images=[...])` — kicks off ~10 min training, runs in background.
6. Once trained, every future shot uses `generate_image(model="soul_2", soul_id="<returned_id>")`.

## Cost estimate (G1 only — training prep)

| Item | Quantity | Higgsfield credits |
|---|---|---|
| Supplemental pose generation (Nano Banana Pro 4K, ~50 cr each) | ~80 stills | ~4,000 |
| LUC canonical generation (8 candidates) | 8 | ~400 |
| Melli Honey Badger canonical (10 candidates) | 10 | ~500-700 |
| Betty-Anne canonical (6 candidates) | 6 | ~300 |
| Roo canonical template (10 candidates) | 10 | ~500-700 |
| Roo individual variations (4 Roo's × 4 candidates each) | 16 | ~800 |
| Sett BG'z canonical (3 BG'z × 6 candidates) | 18 | ~900 |
| **Total G1 generations** | **~150 stills** | **~7,400-7,900 credits** |

Owner's Ultra plan: 2,803 credits available + unlimited weekly window.
G1 is well within budget for the unlimited window.

## What G1 produces

- **150-ish** approved canonical stills covering every cast member needed for v1.
- **Training set per character** ready to feed into `show_characters(action="train")`.
- **No videos yet** — that's G3 / G4 once Soul Characters are trained and environments are generated.

## Owner approval needed before G1 fires

- [ ] Roster confirmed (Group A + B + C + D with 4 initial Roo names: Mac, Joey, Sky, Boomer).
- [ ] LUC canonical visual brief approved (per text above).
- [ ] Melli Honey Badger anthropomorphic canon approved (per text above).
- [ ] Roo canonical template visual brief approved (per text above).
- [ ] Roo individual differentiators approved (Mac sleeve roll, Joey kerchief, Sky glasses, Boomer veteran tells).
- [ ] Sett BG'z initial 3 (Persona Tah, Eve Retti, Leu Kurus) visual differentiators approved.

Once these checkboxes are signed, G1 fires in batched Nano Banana Pro
4K + Soul Cast generations. Each candidate set goes back to owner
for canonical-pick before training. Training fires in background
(~10 min/character). G2 (Soul Location pass) starts in parallel
after G1 candidates are picked.
