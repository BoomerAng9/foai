# URBANISM — AAVE / Ebonics Intensity Scale (0-5)

> Use this scale to grade how much AAVE is present in any character's
> voice. Two characters from the same region can sit at very different
> points on this scale (a Howard-educated Atlanta engineer vs. an
> Atlanta street poet are both Atlantan, both Black, both Indigenous
> American — but the dialect intensity is wildly different). Same goes
> for code-switching: most Black professionals slide up and down the
> scale depending on audience. The dialect-library entries below
> typically describe a *primary* operating point and note the
> code-switch range.

## The scale

| Level | Name | Description |
|---|---|---|
| **0** | Standard professional | Standard American English. Subtle Black inflection in cadence, intonation, and rhythm — no AAVE grammar, no AAVE vocabulary. Think Barack Obama in formal address; news anchor register. |
| **1** | Light code-switch | Standard grammar 95% of the time. Occasional AAVE rhythm at sentence boundaries. Vocabulary is standard with sparse Black-cultural references (church, family, community). Most Black professionals at work. |
| **2** | Conversational Black professional | Standard grammar dominates. AAVE features surface in informal moments: dropped copulas (*"she nice"*), habitual *be* (*"he be working late"*), dropped final *-s* on possessives. Code-switches up to 0 in formal contexts, down to 3 with family. The everyday register for many Black college-educated adults. |
| **3** | Balanced AAVE | AAVE grammar present consistently. Habitual *be*, completive *done* (*"I done told you"*), copula deletion, multiple negation (*"don't nobody know"*). Vocabulary draws from Black English freely. The register most Black Americans use with each other in casual conversation; the register Black sitcoms use as their middle-ground. |
| **4** | Strong AAVE | AAVE features dense and consistent. Stressed *been* (*"I BEEN told you"* = remote past), aspectual marking (*"he steady working"*, *"she stay tired"*), zero auxiliary in present (*"we eating"*, *"they coming"*), null possessive (*"my brother house"*). Vocabulary is Black-cultural specific (terms drawn from hip-hop, church, sports, neighborhood register). Common in barbershop, family kitchen, music. |
| **5** | Deep dialect / heritage | Full AAVE grammatical system on display: invariant *be*, *done been*, *finna*, *bin*-perfective (*"I bin knew"*), pre-verbal markers, regional vowel shifts (Memphis backing, Detroit fronting), distinctive prosody. Heritage speech of older generations, deep working-class and rural communities, and specific subcultures. The register a Black storyteller / preacher / blues-musician steps into when fully home. |

## Code-switch range, not fixed level

A character's spec should record:
- **Primary level** (where they sit by default)
- **Range** (how high and low they can go)

Examples:
- An Atlanta professor at a faculty meeting: primary 1, range 0-3 (3 with family).
- A Memphis barber: primary 4, range 2-5 (2 with a stranger customer, 5 with the regulars).
- A young Brooklyn rapper on stage: primary 4-5, range that drops to 2 when filming a brand sponsorship.
- ACHEEVY (this brand): primary 1-2 (customer-facing professional), with the **Belter Creole** layer on top — the Belter shift happens at the lexical level (*da*, *kopeng*, *gut*, *ree-oo*), AAVE rhythm sits underneath, *neither* is the dominant frame. ACHEEVY does NOT operate at deep AAVE; he operates at quiet authority with rhythmic markers.

## Anti-patterns

- **Don't conflate intensity with authenticity.** A Black professional speaking at level 1 is not "less Black" than a Black storyteller at level 4 — they're different operating points, both authentic.
- **Don't put a character at level 4-5 unless the role calls for it.** Default for most cast = 1-3.
- **Don't blend levels mid-sentence.** Code-switching happens at clause boundaries, not word-by-word.
- **Don't perform AAVE.** If the LLM is generating Black-character text, it should produce AAVE features that emerge from grammar rules, not stereotyped vocabulary stuffing.

## Cross-references

- `syntax-library/belter-creole.md` — ACHEEVY's primary register sits on top of URBANISM 1-2 with Belter Creole shifts.
- `URBANISM/regional/` — region affects which AAVE features dominate (Southern AAVE vs Northeast AAVE vs West Coast AAVE differ in vowels, prosody, and lexicon).
- `URBANISM/subcultural/` — register layer (church, hip-hop, professional, sports) modulates intensity orthogonally to region.
