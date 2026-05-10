# Latin American — Group root

> Hispanic / Latino / Latine register across origins. NOT a single
> register — a constellation of national-origin sub-registers (Mexican-
> American, Cuban-American, Puerto Rican, Dominican, Colombian,
> Argentine, Salvadoran, Guatemalan, Peruvian, etc.) plus US-born
> generation effects (Chicano English, US-Cuban Miami register,
> Nuyorican). Heritage-language influence (Spanish prosody, vocabulary
> code-switch, Spanglish) is the load-bearing register layer.

## Scope

In scope:
- Mexican-American (Mex-Am) — TX, NM, AZ, CA, IL Chicago immigrant
  base.
- Chicano English — US-born Mexican-American distinctive register
  (LA East Side, San Antonio, Albuquerque).
- Tejano — South Texas / RGV bilingual register.
- Cuban-American — Miami-anchored, Hialeah, exile-generation vs
  US-born.
- Puerto Rican — island Spanish + diaspora (NYC Nuyorican, Orlando,
  Hartford).
- Dominican — NYC Washington Heights, Dominican Yankees baseball
  register, Quisqueya pride.
- Colombian — Miami / NYC, distinct from Costeño / Paisa heritage.
- Argentine — distinct *vos* + Italian-influenced cadence.
- Central American — Salvadoran, Guatemalan, Honduran, Nicaraguan
  (often grouped but distinct phonetically).
- South American non-Argentine — Peruvian, Chilean, Venezuelan,
  Ecuadorian, Bolivian.
- Spanglish — code-switch register native to US-born bilingual
  speakers.

Out of scope:
- Spanish-language-only register (no English) — that's a separate
  internationalization effort, not this dashboard.
- Brazilian Portuguese — Latino / Latine politically but linguistically
  separate; future `lusophone/` group if needed.

## Sub-region taxonomy (regional/ files to be built)

- `regional/mex-am-tx-sw.md` — Texas / NM / AZ Mexican-American.
- `regional/chicano-english.md` — distinctive US-born Mex-Am register.
- `regional/tejano.md` — RGV bilingual border register.
- `regional/cuban-am-miami.md` — Miami Cuban-American + Hialeah.
- `regional/puerto-rican.md` — island + diaspora.
- `regional/nuyorican.md` — NYC Puerto Rican distinct register.
- `regional/dominican-am.md` — NYC + Boston + Providence Dominican.
- `regional/colombian.md` — Miami / NYC Colombian.
- `regional/argentine.md` — *vos* register, Italian-influenced cadence.
- `regional/central-american.md` — Salvadoran / Guatemalan /
  Honduran / Nicaraguan.
- `regional/south-american-other.md` — Peruvian / Chilean /
  Venezuelan / Ecuadorian.
- `subcultural/spanglish.md` — code-switch register.

## Register / intensity scale

Latin American register sits on a **heritage-Spanish-influence scale 0-4**
plus a **Spanglish density 0-3** orthogonal axis:

| Heritage level | Name | Description |
|---|---|---|
| **0** | Standard English no detectable Spanish | Standard American English. Latino identity not register-marked. |
| **1** | Light heritage | Spanish-prosody influence on rhythm + occasional vocabulary loans (*bro*, *primo*, *abuela*). |
| **2** | Conversational heritage | Clear prosody markers + regular vocabulary code-switch + cultural-context references. |
| **3** | Strong heritage | Spanish prosody dominant, code-switch frequent within sentences, distinctive vowels. |
| **4** | Spanish-dominant English | Speaker thinks in Spanish; English carries strong substrate; older immigrant generation. |

| Spanglish density | Name | Description |
|---|---|---|
| **0** | None | Pure English or pure Spanish. |
| **1** | Light | Occasional code-switch at clause boundaries (*dale, let's go*). |
| **2** | Mid | Frequent code-switch within sentences (*pero like, that's not it*). |
| **3** | Heavy | Spanglish IS the register; sentences mix freely (*estoy busy con la cosa, you know?*). |

## Phonetic / cadence signatures (group-level)

(To be expanded per regional sub-file. Major patterns:)

- **Spanish prosody substrate** — syllable-timed cadence (vs English
  stress-timed) audible even in English-only speech.
- **Vowel system** — Spanish 5-vowel substrate audible: more peripheral
  English vowels, less reduction in unstressed syllables.
- **/r/-realization** — varies by national origin (Mexican alveolar
  tap, Caribbean velar, Argentine assibilated).
- **Final-consonant voicing** — varies by origin.
- **Code-switch points** — discourse markers (*pues*, *bueno*, *ay*,
  *no?*) often Spanish even when conversation is English.

## National-origin distinctions worth preserving

(Why this group is multi-region rather than monolithic:)

- **Mexican** vs **Caribbean Spanish** prosody is fundamentally
  different — Mexican is consonant-firm, Caribbean (Cuban / PR /
  Dominican) is consonant-elided, fast, sing-song.
- **Argentine** has Italian-influenced sentence-end intonation that
  no other Latin American register has, plus *voseo* (*vos* instead
  of *tú*).
- **Colombian** has internal regional variation (Costeño coastal
  Caribbean-adjacent, Paisa from Medellín, Bogotano) that should be
  noted in the sub-region file.
- **Chicano English** is its own register — distinct from
  Mexican-American Spanish-influenced English; it has its own
  vowel system and is documented in linguistic literature as a
  recognizable variety.

## Anchor speakers (placeholder)

- **Mex-Am / Chicano**: Cheech Marin, Edward James Olmos, George
  Lopez, Gabriel Iglesias.
- **Cuban-American**: Pitbull (cross-cultural), Eva Mendes (US-born
  Cuban), various Miami-anchored hosts.
- **Puerto Rican / Nuyorican**: Bad Bunny (interview-mode Spanish-
  English code-switch), Lin-Manuel Miranda, Rosie Perez.
- **Dominican**: Cardi B (Bronx Dominican / Trinidadian blend — also
  cross-references URBANISM Bronx), Manny Ramirez (heritage-strong),
  Bryan Hoyle (NYC sports media).
- **Colombian**: Sofia Vergara (heavy heritage), J Balvin (Paisa
  register code-switching).
- **Argentine**: Diego Maradona archive, Lionel Messi (Argentine
  Spanish + English in late-career interviews).

## Acoustic profile target (placeholder)

National-origin matters too much to use a single Latin-American target.
Build per-origin targets as procurement runs surface clean samples.
Initial estimates for adult-male:

- Mex-Am: F0 ~110 Hz, rate ~3.5 sps, centroid ~1700 Hz.
- Cuban-Am: F0 ~115 Hz, rate ~4.5 sps (faster), centroid ~1900 Hz
  (brighter — Caribbean register).
- Argentine: F0 ~115 Hz, rate ~4.0 sps, centroid ~1850 Hz, distinctive
  prosody contour at sentence-end.

## Gatekeeping notes

- **National-origin specificity** — calling a Cuban-American character
  "Latino" without honoring their specific Cuban cultural register
  is a brand miss. Same for any other origin.
- **Generation matters** — first-generation immigrant register is
  distinct from US-born second-gen, third-gen.
- **Spanglish vs broken English** — Spanglish is a fluent bilingual
  register, not "broken English." Render it as the sophisticated
  code-switching it is, not as deficiency.
- **Skin-tone + register** — do not couple. Latin American is a
  cultural / national-origin grouping, not a skin-tone grouping.
  Render character voices on register signals, not visual signals.

## Anti-patterns

- Don't write all Latin American characters in the same Spanish
  prosody. Mexican / Caribbean / Argentine are fundamentally different.
- Don't render Chicano English as just "Mexican-American with accent."
  It's a documented variety with its own grammar.
- Don't deploy heavy code-switch on customer surfaces unless audience
  is bilingual — comprehension demand is the gate.
- Don't conflate Brazilian (Lusophone) speakers with Spanish-speaking
  Latin Americans.
- Don't write "spicy Latina" stereotypes. Latin American characters
  carry the same range of registers as any other group.

## Cross-references

- `URBANISM/regional/east-coast-ny.md` — Bronx Caribbean-influenced
  Black register has overlap with Dominican / PR Bronx Latino register
  through shared geography.
- `URBANISM/regional/west-coast.md` — LA Mexican-American / Chicano
  register runs alongside Black-LA register; the contact zone produces
  shared vowel features.
- `caribbean/README.md` — Cuban / PR / Dominican Spanish has Caribbean
  features; cross-cut with that group's prosody.
- `REGISTER-MODULATION.md` — code-switch surfaces governed by
  comprehension-demand floor.

## Active deployments referencing this group

- Coastal Brewing Co.: none currently. Future cast may add Latin-
  origin characters; the group is ready.
- Future verticals: Choose 2 ACHIEVEMOR (NEMT lane in TX / FL /
  Southwest will need Latin American operator voices), Locale by
  ACHIEVEMOR (general gig marketplace will need broad coverage).
