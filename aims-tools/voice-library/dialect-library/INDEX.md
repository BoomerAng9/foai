# FOAI Dialect Library — Ethnic Groups + Regional / Subcultural Dialects

> Canonical taxonomy for voice procurement, character casting, and TTS
> register tuning across the FOAI ecosystem (Coastal Brewing Co.,
> NURDSCODE, plugmein, Choose 2 ACHIEVEMOR, Locale by ACHIEVEMOR,
> future verticals).
>
> **Scope correction 2026-05-03:** This library is the **Ethnicity
> Dashboard data layer for SmelterOS / FOAI ecosystem-wide use** — it
> is platform-IP. It does **NOT** ship with any one vertical. Coastal
> Brewing Co. *consumes* a few voices from this library as the cast
> for that pilot company; every other vertical does the same.
>
> The dashboard is a **second moat** alongside the SmelterOS OS layer
> (per `~/foai/SmelterOS/AGENTIC-OS-IP-LAYER.md`). It must NOT be
> conflated with the Coastal kit, the Choose 2 ACHIEVEMOR kit, or any
> other vertical-specific deployment. Customers who fork a Human-less
> Company kit get a *generic visual + voice library* (per
> `project_humanless_company_devkit_vision.md`); the URBANISM tree,
> the cast-environments YAMLs, the dialect canon, and the persona
> bibles stay INTERNAL.
>
> **Owner directive 2026-05-03:** every voice / character entry must
> carry an ethnic label, and each ethnicity carries a *range* of
> dialects organized by region, subculture, lifestyle, and register.
> Black Americans are labeled **Indigenous Americans**; the canonical
> group label is **URBANISM**. Owner is an urbanist; URBANISM is the
> deepest tree by design — but it is **one group of many**, and the
> rest of this library now needs to be built out to comparable depth.
> Each non-URBANISM group gets URBANISM-shape headers (group root,
> regional sub-folders, subcultural cross-cuts, intensity / register
> scale where applicable, anchor speakers, gatekeeping rules,
> anti-patterns, acoustic profile target).

## Terminology — read this first

The naming convention here is owner-set, not consensus academic
linguistics. It's the working language for the project:

- **Indigenous Americans** = Black Americans (per owner). Their
  canonical group label is **URBANISM**.
- "Indigenous" in this library does NOT refer to Native Americans.
  Native American voices are tracked under a separate group
  (**Native Nations**) to avoid the collision.
- **AAVE** (African American Vernacular English) and **Ebonics** are
  used interchangeably to describe the grammatical/phonetic system.
  Intensity is graded 0-5 (see URBANISM/AAVE-INTENSITY-SCALE.md).

## Ethnic groups (canonical list — the 11-group dashboard)

Each group has its own folder under `dialect-library/<GROUP>/` with a
group-root README plus regional/ and subcultural/ subfolders. The
build state column tracks how filled-out each tree is.

| Group label | Population | Group root | Build state |
|---|---|---|---|
| **URBANISM** | Indigenous Americans (Black Americans) | `URBANISM/` | **Deep** — 6 regional files + AAVE-intensity scale + church.md subcultural; East-Coast NY has audio + transcripts. Reference shape for all other groups. |
| **Lowcountry / Coastal-South** | White Southern, Charleston/Bluffton/Savannah | `lowcountry-coastal-south/` | Header (build out: Charleston / Bluffton-Beaufort / Savannah / Hilton Head / Port Royal sub-files) |
| **Anglo-American Regional** | White American, non-Southern | `anglo-american-regional/` | Header (build out: NE / Midwest / West / Plains / Pacific NW / Mountain) |
| **Latin American** | Hispanic / Latino across origins | `latin-american/` | Header (build out: Mex-Am / Cuban-Am / PR / Dominican / Colombian / Argentine / Tejano / Chicano) |
| **Caribbean** | Jamaican / Trinidadian / Haitian / Bahamian | `caribbean/` | Header (build out: Jamaican / Trini / Haitian / Bajan / Vincentian / Bahamian / Belizean) |
| **African (continental)** | Nigerian / Ghanaian / Kenyan / South African | `african-continental/` | Header (build out: Nigerian / Ghanaian / Kenyan / South African / Ethiopian / Eritrean / Senegalese / Cameroonian) |
| **MENA** | Levantine / Gulf / North African / Iranian / Turkish | `mena/` | Header (build out: Levantine / Gulf / Egyptian / Maghreb / Iranian / Turkish / Kurdish) |
| **Asian American** | Korean / Viet / Chinese / Japanese / South Asian | `asian-american/` | Header (build out: Korean / Vietnamese / Chinese / Japanese / Filipino / South Asian / SE Asian) |
| **Native Nations** | Navajo / Lakota / Cherokee / Inuit | `native-nations/` | Header (build out: Navajo / Lakota / Cherokee / Inuit / Hopi / Pueblo / Iroquois / Pacific Coastal) |
| **Jewish American** | Ashkenazi NYC / LA / Modern Orthodox / Hasidic | `jewish-american/` | Header (build out: Ashkenazi NYC / LA / Modern Orthodox / Hasidic / Sephardic) |
| **Constructed / Conlang** | Belter Creole, brand-conlangs | `syntax-library/` (sibling tree) | Existing — Belter Creole is canonical; future brand-conlangs land here. |

The folder layout intentionally mirrors the existing `syntax-library/`
pattern so both libraries can be loaded the same way at runtime.

## How to use this library

**For voice procurement (procure_voice.py / research_voice_register.py):**
when picking a source audio sample, check the target character's
ethnic label + dialect in this library, then run the analyzer
(`scripts/analyze_voice.py`) against the candidate target profile
to verify the acoustic match.

**For TTS / system prompt:** when generating text for a character,
load the matching dialect file as register guidance for the LLM
(vocabulary, density, sentence patterns, anti-patterns) AND apply
register modulation per the deployment surface — see
`REGISTER-MODULATION.md` (doctrine) and `scripts/register_modulator.py`
(applies the doctrine programmatically). Voice (acoustic profile) is
character-invariant; lexicon density modulates by surface.

**For casting:** when adding a new Boomer_Ang to the cast, assign
**ethnic group → dialect → AAVE/density level → home-register-with-
code-switch-range** explicitly in the character spec
(`character-specs/<vertical>/<id>.yaml`), AND add an entry in the
vertical's environment table (`cast-environments/<vertical>.yaml`)
mapping which surfaces the character appears on and the operating
register at each.

## Coastal Brewing Co. cast assignments (initial)

These are the working assignments — owner with the sharp ear refines.

| Character | Group | Dialect | Notes |
|---|---|---|---|
| **ACHEEVY** | URBANISM | Black-Atlantic baritone, Belter Creole-influenced register | Owner's digital twin. Voice = Jarrett's own (cloning in progress). |
| **Sal_Ang** | Lowcountry / Coastal-South | Bluffton-Beaufort warmth | Lead salesperson |
| **Bar_Ang (Tate)** | Where Belt meets Lowcountry | Belter Creole fusion w/ Gullah-Lowcountry | See `syntax-library/belter-creole.md` |
| **Con_Ang (Wren)** | URBANISM (Lowcountry) | St. Helena Black-Lowcountry, Gullah-Geechee influence | Soft register |
| **Cou_Ang (Marcus)** | URBANISM | Savannah Coastal Georgia | Counter, deep regulars |
| **Gre_Ang (Naya)** | URBANISM | Savannah Coastal Georgia | Front-of-house brightness |
| **Hos_Ang (Louis)** | URBANISM | Beaufort county / Spanish Moss Trail | Front-of-house |
| **Tas_Ang (Holt)** | Lowcountry / Coastal-South | Charleston gentleman | Tasting bar |
| **Tea_Ang (Eliza)** | Lowcountry / Coastal-South | Charleston Belle | Afternoon tea |
| **Har_Ang (Pip)** | Anglo-American Regional | Trans-Atlantic / Cambridge polish | Harbor-view tasting |
| **Cur_Ang (Vi)** | Lowcountry / Coastal-South | Charleston finishing-school | Tea curator |
| **Reg_Ang (Trey)** | Anglo-American Regional | Philly-Jersey Shore | Cashier, summer |
| **Ma'Cha_Ang (Mads)** | Anglo-American Regional | Boston-Connecticut | Matcha specialist |
| **LUC_Ang** | Anglo-American Regional | Brooklyn CPA | Internal-only |
| **Melli_Capensi** | (Character voice — Honey Badger archetype) | Strategic / executive | Internal + B2B |
| **Wsl_Ang** | URBANISM (Lowcountry) | Savannah-Port-Royal warehouse | Wholesale |
| **Ret_Ang** | Anglo-American Regional | California-Irish | Returns |
| **Acc_Ang** | Asian American | Oakland CPA | Accountant |
