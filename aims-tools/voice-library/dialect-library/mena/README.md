# MENA — Group root

> Middle Eastern + North African Anglophone register. Levantine
> (Lebanese / Syrian / Palestinian / Jordanian), Gulf (Saudi / Emirati
> / Kuwaiti / Qatari / Bahraini / Omani), Egyptian, Maghreb
> (Moroccan / Tunisian / Algerian / Libyan), Iranian (Farsi-substrate),
> Turkish, Kurdish, plus US/UK/Canada diaspora register.

## Scope

In scope:
- **Arab register** — Levantine, Gulf, Egyptian, Maghreb,
  Iraqi, Sudanese.
- **Iranian / Persian** — Farsi-substrate English; distinct from Arab
  (Iran is non-Arab; Farsi is Indo-European).
- **Turkish** — Turkish-substrate English (Turkic, non-Arab,
  non-Indo-European).
- **Kurdish** — distinct ethnic group across Turkey / Iran / Iraq /
  Syria.
- **Israeli English** — Hebrew-substrate Israeli register; tracked here
  due to MENA geography. (Note: Jewish-American register lives under
  `jewish-american/` — different group.)
- **Diaspora register**: Lebanese-American (Detroit / LA / Houston),
  Egyptian-American (NJ), Iranian-American ("Tehrangeles" — LA),
  Turkish-American (NJ / NYC), Iraqi-American (Detroit / San Diego).

Out of scope:
- Israeli Jewish-American second-gen with strong NYC layer →
  `jewish-american/`
- Pure Arabic / Farsi / Turkish without English — separate
  internationalization tracks.

## Sub-region taxonomy (regional/ files to be built)

- `regional/levantine.md` — Lebanese / Syrian / Palestinian / Jordanian
  Arab register (cousin registers, distinct from Gulf).
- `regional/gulf-arab.md` — Saudi / Emirati / Kuwaiti / Qatari Gulf
  Arabic substrate; modern Dubai / Abu Dhabi cosmopolitan English.
- `regional/egyptian.md` — Cairo Egyptian Arabic substrate; distinct
  from Levantine.
- `regional/maghreb.md` — Moroccan / Tunisian / Algerian; French
  substrate often layered with Arabic.
- `regional/iraqi.md` — Iraqi Arabic substrate; Mesopotamian register.
- `regional/iranian.md` — Farsi-substrate; Tehrangeles (LA) heavy
  diaspora.
- `regional/turkish.md` — Turkish-substrate.
- `regional/kurdish.md` — Kurdish-substrate; cross-borders multiple
  countries.
- `regional/israeli.md` — Hebrew-substrate Israeli English.
- `regional/sudanese.md` — Sudanese Arabic; bridge to East African
  register cross-cut.
- `regional/diaspora-us.md` — Lebanese-Am Detroit, Egyptian-Am NJ,
  Iranian-Am Tehrangeles, Turkish-Am NJ-NYC, Iraqi-Am Detroit-SD.
- `subcultural/religious-register.md` — Islamic religious register
  (Quranic phrases in casual speech), Christian-Arab register
  (Maronite, Coptic), Jewish-Israeli religious register cross-cut.

## Register / intensity scale

MENA register sits on a **substrate-influence scale 0-3** parallel to
the African-continental scale:

| Level | Name | Description |
|---|---|---|
| **0** | Standard British/American English | MENA speaker, no detectable substrate. International business / academic register. |
| **1** | Light substrate | Detectable accent + occasional vocabulary loans (*habibi*, *yallah*, *wallah*, *mashallah*, *inshallah*). Most professional MENA-Am register. |
| **2** | Conversational substrate | Substrate prosody clearly audible, frequent code-switch with heritage language, sentence patterns from Arabic / Farsi / Turkish audible. |
| **3** | Heavy heritage | Strong heritage prosody dominant; first-generation immigrant register. May code-switch into heritage language for emotional / cultural moments. |

## Phonetic / cadence signatures (group-level)

(To be expanded per regional sub-file. Major patterns:)

- **Arabic /q/, /ḥ/, /ʿ/, /ḏ/** — pharyngeal / emphatic consonants
  surface differently per regional dialect (Levantine softer than
  Gulf, Egyptian /ǧ/ → /g/ vs Levantine /ǧ/ → /ž/).
- **Farsi prosody** — Indo-European base, more vowel variety than
  Arabic; *zh* as in *measure* common.
- **Turkish vowel harmony** — substrate effect on English vowel
  selection.
- **Sentence-end rising** — Arabic-substrate Anglophone often rising
  on yes/no questions where General American falls.
- **Discourse markers** — *yalla* (let's go / come on), *habibi*
  (term of endearment, masculine; *habibti* feminine), *wallah*
  (I swear / really), *mashallah* (with God's grace — admiring),
  *inshallah* (God willing — future-uncertain).

## Anchor speakers (placeholder)

- **Levantine**: George Wassouf (Syrian — heritage register), Mona
  El-Saharti (Egyptian-Levantine), various Beirut-LA crossover artists.
- **Gulf**: HRH royal-family broadcast English, Emirati / Saudi
  cosmopolitan media.
- **Egyptian**: Mohammed Ramadan (Egyptian register dense), Bassem
  Youssef (US-resident Egyptian-American comedian, code-switch
  documented).
- **Iranian**: Maz Jobrani (Iranian-American comedian, register
  documented in his comedy), Goldie Hawn family (Hawn is Hungarian-
  Jewish, but Persian-American in-laws), various Tehrangeles
  community media.
- **Turkish**: Cenk Uygur (Turkish-American media), various Turkish-
  diaspora podcast hosts.
- **Israeli**: Gal Gadot (Israeli-American, register documented),
  various IDF-veteran tech-founder interview English.
- **Iraqi-Am**: Andy Shallal (DC restaurateur), various Detroit /
  San Diego diaspora figures.

## Acoustic profile target (placeholder)

Per-region targets to be added. Initial estimates for adult-male:

- Levantine: F0 ~115 Hz, rate ~4.0 sps, distinctive Arabic-substrate
  consonant cluster handling.
- Gulf: F0 ~115 Hz, rate ~3.8 sps, centroid ~1850 Hz.
- Egyptian: F0 ~115 Hz, rate ~4.5 sps (faster), centroid ~1900 Hz.
- Iranian: F0 ~115 Hz, rate ~4.0 sps, centroid ~1900 Hz, more vowel
  variety than Arabic registers.
- Turkish: F0 ~115 Hz, rate ~4.0 sps, distinctive vowel-harmony
  prosody.

## Gatekeeping notes

- **National + ethnic specificity** — *Arab* is not one register; calling
  Lebanese / Egyptian / Saudi the same is a brand miss.
- **Religious context** — Quranic-derived phrases (*inshallah*,
  *mashallah*, *bismillah*) are widely used by Muslim Arabs but
  carry religious weight; deploying them on non-Muslim characters
  reads as cosplay. Christian Arabs (Maronite, Coptic) have their
  own religious register.
- **Iran / Persia / Farsi vs Arab** — heavy political weight; do not
  conflate. Iranians explicitly are not Arabs.
- **Turk vs Arab** — also do not conflate. Turkish is non-Arab.
- **Kurdish** — Kurds explicitly are an ethnic minority in Turkey /
  Iran / Iraq / Syria with their own language and register.
- **Israeli vs Palestinian / Arab Israeli** — politically loaded;
  render character voices on register signals, not political
  signaling.
- **Diaspora generation** — first-gen Lebanese-Am vs third-gen
  vastly different.

## Anti-patterns

- Don't render MENA characters with terrorist / villain tropes. Brand-
  damaging and stereotype-reinforcing.
- Don't use *Aladdin*-style stage Arabic. The actual register is far
  more varied and sophisticated.
- Don't deploy heavy religious phrases on non-religious characters
  for "MENA flavor."
- Don't conflate Persian / Turkish / Kurdish / Arab — they are
  distinct ethnic + linguistic groups.
- Don't write Iranian-American as monolithic LA-Tehrangeles. NY,
  DC, Toronto Iranian-Am have their own registers.

## Cross-references

- `african-continental/README.md` — North African (Maghreb) Arabic
  has cross-cut with sub-Saharan Africa; cousin register.
- `jewish-american/README.md` — Israeli Jewish vs American Jewish
  vs MENA Israeli are separate registers; Israeli English is here
  but Jewish-American is its own group.
- `latin-american/README.md` — Lebanese / Syrian diaspora to Latin
  America (Argentina, Mexico, Brazil) is significant; some
  Lebanese-Latin-Am speakers cross-cut.
- `REGISTER-MODULATION.md` — religious / political register density
  gates by surface.

## Active deployments referencing this group

- Coastal Brewing Co.: none currently.
- Future verticals: any MENA-set or MENA-targeted vertical;
  diaspora-set businesses; international SaaS.
