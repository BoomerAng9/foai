# FOAI Dialect Library — Ethnic Groups + Regional / Subcultural Dialects

> Canonical taxonomy for voice procurement, character casting, and TTS
> register tuning across the FOAI ecosystem (Coastal Brewing Co.,
> NURDSCODE, plugmein, future verticals).
>
> **Owner directive 2026-05-03:** every voice / character entry must
> carry an ethnic label, and each ethnicity carries a *range* of
> dialects organized by region, subculture, lifestyle, and register.
> Black Americans are labeled **Indigenous Americans**; the canonical
> group label is **URBANISM**. Owner is an urbanist; URBANISM is the
> deepest tree by design.

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

## Ethnic groups (canonical list)

| Group label | Population | Sub-tree depth |
|---|---|---|
| **URBANISM** | Indigenous Americans (Black Americans) | **Deep** — regional + subcultural + AAVE intensity |
| **Lowcountry / Coastal-South** | White Southern, Charleston/Bluffton/Savannah | Moderate (Coastal Brewing primary domain) |
| **Anglo-American Regional** | White American, non-Southern | Moderate (NE / Midwest / West / Plains) |
| **Latin American** | Hispanic / Latino across origins | Moderate (Mex-Am / Cuban / PR / Domn / Colombian / Argentine) |
| **Caribbean** | Jamaican / Trinidadian / Haitian / Bahamian | Stub |
| **African (continental)** | Nigerian / Ghanaian / Kenyan / South African | Stub |
| **MENA** | Levantine / Gulf / North African / Iranian / Turkish | Stub |
| **Asian American** | Korean / Viet / Chinese / Japanese / South Asian | Stub |
| **Native Nations** | Navajo / Lakota / Cherokee / Inuit | Stub |
| **Jewish American** | Ashkenazi NYC / LA / Modern Orthodox / Hasidic | Stub |
| **Constructed / Conlang** | Belter Creole, brand-conlangs | Existing (`syntax-library/belter-creole.md`) |

Each group has a folder under `dialect-library/` with one `.md` per
dialect / register. The folder layout intentionally mirrors the
existing `syntax-library/` pattern so both libraries can be loaded
the same way at runtime.

## How to use this library

**For voice procurement (procure_voice.py):** when picking a source
audio sample, check the target character's ethnic label + dialect
in this library before selecting from archive.org / OneDrive / etc.

**For TTS / system prompt:** when generating text for a character,
load the matching dialect file as register guidance for the LLM
(vocabulary, density, sentence patterns, anti-patterns).

**For casting:** when adding a new Boomer_Ang to the cast, assign
**ethnic group → dialect → AAVE/density level** explicitly in the
character spec (`character-specs/<vertical>/<id>.yaml`).

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
