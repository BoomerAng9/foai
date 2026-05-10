# Anglo-American Regional — Group root

> White American non-Southern regional register. Spans Northeast,
> Midwest, West, Plains, Pacific Northwest, Mountain. NOT a single
> register — a constellation of regional Englishes shaped by
> immigration history, geography, and the Northern Cities / California
> / Mountain vowel shifts. Distinct from Lowcountry / Coastal-South
> (separate group) and from URBANISM (separate group).

## Scope

In scope:
- Northeast: NYC White (Italian / Irish / Jewish / Polish heritage
  layers), Boston Brahmin + working-class, Philly + Jersey Shore +
  South Jersey, Pittsburgh Yinzer, New England rural, Maine fishing.
- Midwest: Chicago / Northern Cities Vowel Shift, Cleveland / Detroit
  / Milwaukee, Iowa-Nebraska Plains, Upper-Midwest Minnesota / Wisconsin
  (Yooper register).
- West Coast: California (LA media-neutral / Valley / Bay non-tech /
  San Diego), Pacific Northwest Seattle / Portland.
- Mountain / Intermountain: Denver, Salt Lake / Mormon-cultural
  register, Wyoming / Montana ranch.
- Plains: Oklahoma / North Texas (note: South Texas / RGV is Latin
  American; Houston / Austin overlap multiple groups).
- Trans-Atlantic / academic / RP-influenced register (Cambridge MA,
  Princeton, finishing-school).

Out of scope:
- White Southern → `lowcountry-coastal-south/` + future
  `southern-inland/` group
- Black American → `URBANISM/`
- Latin American → `latin-american/`
- Asian American → `asian-american/`
- Jewish American → `jewish-american/` (heritage layer — overlaps
  with NYC White but tracked as its own group per the canonical list)

## Sub-region taxonomy (regional/ files to be built)

- `regional/northeast-nyc-white.md` — Italian / Irish / Polish heritage
  layers, the Bronx Italian register, Queens Irish register, Brooklyn
  Polish-Italian, Long Island.
- `regional/northeast-boston.md` — Brahmin + Southie + Worcester +
  Cape Cod.
- `regional/northeast-philly-jersey.md` — Philly Italian, Jersey Shore,
  South Jersey diner register.
- `regional/northeast-pittsburgh-yinzer.md` — distinctive *yinz* / *dahn
  tahn* / iron-city register.
- `regional/northeast-new-england-rural.md` — Maine fishing,
  rural NH / VT, Down East.
- `regional/midwest-chicago.md` — Northern Cities Vowel Shift, Bears /
  Bulls fan register, North Side / South Side.
- `regional/midwest-detroit-cleveland-milwaukee.md` — Rust Belt
  industrial register.
- `regional/midwest-upper-yooper.md` — Minnesota / Wisconsin / U.P.
  Michigan, *yooper* register, Scandinavian heritage layer.
- `regional/midwest-plains.md` — Iowa-Nebraska-Kansas neutral.
- `regional/west-coast-california.md` — LA media-neutral, Valley girl,
  Bay non-tech, San Diego.
- `regional/west-coast-pacific-nw.md` — Seattle, Portland, Olympia.
- `regional/mountain-intermountain.md` — Denver, Salt Lake (Mormon-
  cultural register cross-cut), ranch country.
- `regional/trans-atlantic-academic.md` — RP-influenced finishing-school,
  trans-Atlantic stage register, Cambridge MA / Princeton academic.

## Register / intensity scale

Anglo-American Regional sits on a **regional-marking scale 0-3**:

| Level | Name | Description |
|---|---|---|
| **0** | Standard broadcast | Neutral, news-anchor / national-broadcaster register. No regional vowels detectable. |
| **1** | Soft regional | Detectable regional vowels (LA *o-a* shift, Chicago *cot-caught* split, NYC *coffee*-rounded) but no vocabulary markers. |
| **2** | Conversational regional | Vowels + occasional vocabulary markers (*yinz* in Pittsburgh, *wicked* in Boston, *hella* in Bay non-tech, *hot dish* in Minnesota). |
| **3** | Heavy heritage regional | Full regional system audible — vowels, vocabulary, cadence. *Larry David* NYC, full Yooper, deep Boston Southie. |

## Phonetic / cadence signatures (group-level)

(To be expanded per regional sub-file. Major patterns:)

- **Northern Cities Vowel Shift** — Chicago / Detroit / Cleveland /
  Buffalo: *bag* raised toward *beg*, *cot* and *caught* distinct.
- **California Vowel Shift** — *o-a* fronting, uptalk, vocal fry.
- **NYC vowel system** — *coffee* → *cawfee*, *talk* → *tawk*; r-less
  in older heritage speakers, r-ful in younger.
- **Boston** — r-less *park* → *pahk*, *broad-a* in some words.
- **Yooper / Upper-Midwest** — Scandinavian-derived *yah*, monophthong
  vowels, *eh* sentence tag.

## Anchor speakers (placeholder, to be expanded per sub-region)

- **NYC White**: Larry David (heritage / Brooklyn Jewish — overlaps
  Jewish American group), Pete Davidson (Staten Island Italian),
  Jon Stewart (NJ-NY blend), Bill de Blasio (NYC bureaucrat layer).
- **Boston**: Matt Damon (Cambridge / Southie blend), Conan O'Brien
  (Brookline upper register), Bill Burr (Canton working-class).
- **Chicago**: Jon Hamm (St. Louis-adjacent), Vince Vaughn (suburbs),
  John Mulaney (Chicago to NYC code-switch).
- **California**: Conan + various LA-resident comedians for media-
  neutral; SNL alums for Valley girl.
- **Yooper / Upper-Midwest**: *Fargo* (1996) film cast as register
  reference; documentary footage.
- **Trans-Atlantic / academic**: BBC America commentators, NPR
  hosts, college-presidential addresses.

## Acoustic profile target (placeholder)

To be added to `scripts/analyze_voice.py:TARGET_PROFILES` once a
clean audio sample set is procured per sub-region. Initial estimates:

- Adult-male media-neutral: F0 ~120 Hz, rate ~3.7 sps, centroid ~1900 Hz.
- Adult-male NYC White: F0 ~115 Hz, rate ~4.5 sps (faster), centroid
  ~2100 Hz (brighter / nasal).
- Adult-male Boston Southie: F0 ~115 Hz, rate ~4.0 sps, centroid
  ~2000 Hz, more glottal stops.
- Adult-male California: F0 ~120 Hz, rate ~4.0 sps, centroid ~2000 Hz,
  more uptalk.

Adult-female targets to be added in parallel.

## Gatekeeping notes

- *Yinz* is hyper-local Pittsburgh — non-Pittsburgh deploy reads as
  cosplay.
- *Hella* is Bay-non-tech but has spread genre-wide via media; on a
  non-Bay character it's softer-marked than Yinz.
- *Wicked* (intensifier) is heavy Boston / New England — non-NE
  deploy reads as cosplay.
- *Yah* / *eh* sentence tags are Yooper / Minnesota-Wisconsin —
  regional-tied.
- Trans-Atlantic register has class signaling (old-money / academic
  finishing-school) — deploying it on a generic character reads as
  performative.

## Anti-patterns

- Don't render NYC White as URBANISM Black NYC. Distinct register
  systems with overlapping geography.
- Don't render Chicago as Detroit (NCVS shared, but vocabulary,
  pacing, and identity markers differ).
- Don't blend Yooper and Plains. Yooper is Scandinavian-heritage
  Upper-Midwest; Plains is broader, more neutral.
- Don't write West Coast as monolithic — LA / Bay-non-tech / Pacific
  NW / San Diego are distinct.
- Don't deploy heavy regional register on customer surfaces by
  default — modulate per `REGISTER-MODULATION.md`.

## Cross-references

- `URBANISM/regional/east-coast-ny.md` — for compare/contrast with
  Black NYC.
- `URBANISM/regional/midwest.md` — for compare/contrast with Black
  Detroit / Chicago drill / non-drill.
- `URBANISM/regional/west-coast.md` — for compare/contrast with
  Black LA + Bay.
- `lowcountry-coastal-south/README.md` — separate Southern White group.
- `jewish-american/README.md` — heritage layer cross-cut with NYC
  White / LA White.
- `latin-american/README.md` — overlaps with California / SW White.
- `REGISTER-MODULATION.md` — surface-aware operating-register rules.

## Active deployments referencing this group

- Coastal Brewing Co.: Har_Ang (Trans-Atlantic / Cambridge polish),
  Reg_Ang (Philly-Jersey Shore), Ma'Cha_Ang (Boston-Connecticut),
  LUC_Ang (Brooklyn CPA — internal-only), Ret_Ang (California-Irish).
  All customer-facing or internal on the Coastal pilot.
- Future verticals: any non-Southern US-set vertical pulls voices
  from this group.
