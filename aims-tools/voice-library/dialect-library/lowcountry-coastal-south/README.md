# Lowcountry / Coastal-South — Group root

> White Southern register anchored in the Atlantic coastal South:
> Charleston / Bluffton / Beaufort / Savannah / Hilton Head / Port
> Royal / Sea Islands. Distinct from inland Southern register (Atlanta,
> Memphis, Nashville, Birmingham) and from the URBANISM Coastal-Georgia
> Black register that shares geography but not register lineage. This
> is hospitality-cadence, place-anchored Southern speech with English /
> Scots-Irish / Huguenot heritage layers visible in older speakers.

## Scope

In scope:
- White Southern register on the Atlantic Coastal Plain from Charleston
  SC south to Savannah GA + the Sea Islands.
- Charleston aristocratic / finishing-school polish.
- Bluffton-Beaufort warmth + Spanish Moss Trail neighborhoods.
- Savannah genteel + Forsyth Park / squares.
- Sea Islands (Daufuskie, Hilton Head, Edisto, Tybee) — White heritage
  side.
- Cross-cuts: Lowcountry food culture cadence, oyster-roast register,
  Sunday-after-church casual.

Out of scope (lives elsewhere):
- Black-Lowcountry / Gullah-Geechee → `URBANISM/regional/southern-coastal-georgia.md`
- Inland Atlanta → `URBANISM/regional/southern-atlanta.md`
- General non-Southern White American register → `anglo-american-regional/`

## Sub-region taxonomy (regional/ files to be built)

- `regional/charleston.md` — Charleston aristocratic + finishing-school
  + College of Charleston student register.
- `regional/bluffton-beaufort.md` — Bluffton-Beaufort warmth, Spanish
  Moss Trail, USCB / Parris Island civilian register.
- `regional/savannah.md` — Savannah genteel, Forsyth squares, SCAD
  student layer, downtown vs Southside.
- `regional/sea-islands.md` — Daufuskie / Hilton Head White heritage,
  Edisto, Tybee, slow-time pacing.
- `regional/oyster-roast.md` — informal Lowcountry hospitality
  register at the food-and-drink cross-cut.

## Register / intensity scale

Lowcountry / Coastal-South register sits on a **Southern-formality
scale 0-3** (different shape from URBANISM's AAVE 0-5):

| Level | Name | Description |
|---|---|---|
| **0** | Standard professional | Standard American English with neutral Southern inflection only. Charleston downtown business register. |
| **1** | Light Southern professional | Soft drawl on stressed vowels, *yall* sparingly, hospitality-cadence active. The Bluffton retail register. |
| **2** | Conversational Southern | Drawl consistent, *yall* / *fixin' to* / *bless your heart* in natural use, vowel-extended. Sunday-brunch / book-club register. |
| **3** | Deep heritage | Older-generation Charleston gentleman / Savannah belle register. Vowel system more pronounced (*tahm*, *fahn*), vocabulary distinctive (*gracious*, *down the way*, *the avenue*). |

This scale is documented for parallel use with the `register_modulator`
when Lowcountry characters appear on different surfaces.

## Phonetic / cadence signatures

(To be expanded per regional sub-file. Group-level common ground:)

- **Pacing**: slower than non-Southern White English; comfortable with
  pauses; sentence-ends fall.
- **Vowels**: monophthongization on *-ay* (*time* → *tahm*) but
  partial, not as full as inland Southern.
- **Hospitality cadence**: open warm, stay warm. Welcome-them-in
  before the business.
- **Soft *-er* endings**: *better* → *bettuh*.

## Anchor speakers (group-level — to be expanded per sub-region)

- **Charleston**: Stephen Colbert (Charleston-raised; code-switches
  out of register on the show but it's audible), Pat Conroy
  (deceased — interview archives), Bill Murray (Charleston resident).
- **Bluffton-Beaufort**: anchor candidates to be researched.
- **Savannah**: Paula Deen (genteel TV register), Clint Eastwood's
  *Midnight in the Garden of Good and Evil* contemporary cast for
  reference (deep heritage older-generation), various SCAD alums.
- **Sea Islands**: Pat Conroy archive recordings (Daufuskie teaching
  era), local heritage interview programs.

## Acoustic profile target (placeholder)

To be added to `scripts/analyze_voice.py:TARGET_PROFILES` once a
clean audio sample set is procured. Initial estimates for adult-male
Lowcountry register:

- F0 mean: ~115 Hz (mid-baritone, slightly higher than URBANISM
  Queensbridge target, slightly lower than national average).
- Speech rate: ~3.0 sps (slow-conversational).
- Spectral centroid: ~1700 Hz (warm).
- HNR: ~13 dB (clean — heritage Southern speech is typically less
  raspy than URBANISM register).

For adult-female Lowcountry register, a separate
`coastal_lowcountry_female` target is proposed (parallel to URBANISM's
`coastal_georgia_female`). Targets to be calibrated against measured
data once procurement runs against this group.

## Gatekeeping notes

- *Bless your heart* — used as both genuine compassion AND as a
  passive-aggressive dismissal. The interpretation is context-tonal,
  not lexical. Generating it without context is a brand risk.
- Charleston aristocratic register has an old-money inheritance
  layer that overlaps with class signaling; deploying it on a
  generic-customer character reads as performance.
- Heritage Sea Islands White register is small-population and
  documentation is uneven — handle with the same attention to
  sourcing as URBANISM heritage register.
- *Y'all* is generally OK on customer surfaces (it has spread
  national-pan-South); deeper drawl + vocabulary should follow
  surface modulation rules per `REGISTER-MODULATION.md`.

## Anti-patterns

- Don't render Lowcountry register as inland Southern (Atlanta /
  Nashville / Memphis). Different vowel system, different vocabulary,
  different cadence.
- Don't blend Lowcountry register with URBANISM Coastal-Georgia
  register (the two share geography but not register lineage). Marcus
  / Naya / Wsl_Ang in Coastal Brewing's cast are URBANISM, not
  Lowcountry.
- Don't deploy Charleston aristocratic register on non-Charleston
  characters — it reads as cosplay.
- Don't write Lowcountry speech as a parody of *Gone with the Wind*.
  Heritage register is real and present-day.

## Cross-references

- `URBANISM/regional/southern-coastal-georgia.md` — the parallel
  Black-Lowcountry register sharing geography.
- `URBANISM/regional/southern-atlanta.md` — for compare/contrast
  with inland Southern.
- `syntax-library/lowcountry-southern.md` — White Lowcountry register
  details (existing; expand as regional sub-files are built).
- `syntax-library/belter-creole.md` — Bar_Ang (Tate) sits at the
  intersection of Belter Creole + Coastal-Georgia register; reference
  for crossover characters.
- `REGISTER-MODULATION.md` — surface-aware operating-register rules.

## Active deployments referencing this group

- Coastal Brewing Co.: Sal_Ang (Bluffton-Beaufort warmth, AAVE 0),
  Tas_Ang (Charleston gentleman, AAVE 0), Tea_Ang (Charleston Belle,
  AAVE 0), Cur_Ang (Charleston finishing-school, AAVE 0). All
  customer-facing on the Coastal pilot.
- Future verticals: any Atlantic Coastal South-set vertical may pull
  voices from this group.
