# `@aims/voice-library` — Ecosystem Catalog

This is the cross-vertical INDEX of every character + brand + product registered in the FOAI ecosystem's voice + dialect + sponsorship library. Update this file whenever a new vertical contributes characters or brands.

> **Architectural rule (load-bearing):** Dialect lives in the SCRIPT, not the voice model. Voice engines deliver timbre. The SCRIPT is what gives any TTS the dialect when it reads aloud. See `~/foai/perform/src/lib/analysts/dialect-guides.ts` for the canonical pattern this library extends.

## Layered architecture

```
Layer 3 — Persona               (DialectGuide.description + sampleLines)
Layer 2 — Dialect script        (DialectGuide.vocabularySwaps + applyDialect)
Layer 1 — Voice timbre          (CharacterVoiceEntry — Gemini Live native or cloned)
─────────────────────────────────────────────────────────────────────────
Cross-pollination layer:
   Sponsorship (plug-engine.ts) — any character × any brand × any format
```

## Character roster

### Coastal Brewing Co. — Sales Team Boomer_Angs (12 characters, 6 register pairs)

| cast_id | display_name | gender | accent register | role / scene |
|---|---|---|---|---|
| `sal_ang` | Sal_Ang | M | Lowcountry Southern, manager-proper | Head of Sales, marsh-edge pop-up |
| `hos_ang` | Hos_Ang | M | Lowcountry Southern, manager-proper | Front-of-house counterpart |
| `bar_ang` | Bar_Ang | M | Belter Creole leaning Gullah-Lowcountry | Pour-over barista, syllable-timed pace |
| `con_ang` | Con_Ang | F | Belter Creole leaning Gullah-Lowcountry | Consultative cup-finder, softer register |
| `tas_ang` | Tas_Ang | M | Country Caucasian Southern | Charleston gentleman tasting bar |
| `tea_ang` | Tea_Ang | F | Country Caucasian Southern Belle | Afternoon tea, hospitality-as-craft |
| `cou_ang` | Cou_Ang | M | Savannah African American | Historic-district shop, deep regulars |
| `gre_ang` | Gre_Ang | F | Savannah African American | Morning shift, regulars by name |
| `har_ang` | Har_Ang | M | American Southern British (trans-Atlantic) | Old-money tea hour, harbor view |
| `cur_ang` | Cur_Ang | F | American Southern British (trans-Atlantic) | Finishing-school polish, harbor crowd |
| `reg_ang` | Reg_Ang | M | Northeast college (Coastal Carolina U student) | Student shift, fast pace |
| `mat_ang` | Mat_Ang | F | Northeast college (UGA student) | Summer-break shift, energetic |

Source files:
- Dialect: `src/dialect/dialect-guides.ts` → `COASTAL_DIALECT_GUIDES`
- Voice resolution: `src/registry/character-voices.ts` → `COASTAL_VOICE_REGISTRY`
- Sal_Ang's Python agent: `~/foai/coastal-brewing/agents/operations_pmo/sal_ang/agent.py`

### Per|Form — Analyst Roster (6 characters — to migrate)

Per|Form's analysts are already implemented at `~/foai/perform/src/lib/analysts/dialect-guides.ts` with the same `DialectGuide` shape. They will migrate into this library's `DIALECT_REGISTRY` on Per|Form's next refactor — until then they co-exist and the cross-vertical sponsorship engine can reach them through the existing Per|Form import path.

| analyst_id | dialect register | origin |
|---|---|---|
| `void-caster` | Belter Creole (full register) | The Belt |
| `bun-e` | Belter Creole (scholarly register) | The Belt — Void-Caster's secret sister |
| `the-haze` | West Coast Cali | LA / Crenshaw |
| `smoke` | Houston Southern | Houston Third Ward / Southside |
| `the-colonel` | North Jersey Italian-American | Union, NJ — 1987 forever |
| `astra-novatos` | Continental English (no contractions) | Paris fashion world |

### Future verticals

CTI Hub, SmelterOS, Per|Form spin-offs, and any new Human-less Company kit will register their casts here.

## Brand registry

| brand_id | display_name | vertical | url | one-liner |
|---|---|---|---|---|
| `coastal` | Coastal Brewing Co. | coastal | brewing.foai.cloud | "Nothing chemically, ever." |
| `perform` | Per\|Form | perform | perform.foai.cloud | "Sports talent intelligence, called by analysts who know the realm." |
| `achievemor` | ACHIEVEMOR | aims | aimanagedsolutions.cloud | "Build a Company. Without the Company." |

Source: `src/sponsorship/brands.ts`

## Product registry (sample set — extend as catalog grows)

| sku_id | brand | name |
|---|---|---|
| `sumatra-12oz` | coastal | Sumatra Single-Origin (12oz) |
| `ethiopia-12oz` | coastal | Ethiopia Bright (12oz) |
| `matcha-ceremonial` | coastal | Ceremonial-Grade Matcha |

## Cross-pollination matrix

Every speaker in the roster can plug every brand in the registry. Examples:

| Speaker | Plugs | In their register |
|---|---|---|
| `void-caster` (Per\|Form) | Coastal Sumatra | Belter Creole — *"Da tape on this Sumatra is fee-oo, kopeng — slow-roasted, low acid, ree-oo gut"* |
| `smoke` (Per\|Form) | Coastal Cold-Brew | Houston Southern — *"Look man, this cold-brew right here? Coastal Brewing — fixin to be your summer cup"* |
| `sal_ang` (Coastal) | Per\|Form analysts | Lowcountry — *"The boys at Per\|Form watch the tape — they fixin' to call this kid's name"* |
| `har_ang` (Coastal) | ACHIEVEMOR | Trans-Atlantic — *"All of this — quite an undertaking. ACHIEVEMOR makes it possible."* |

Generate via:
```ts
import { generatePlug, generateAllSponsorReads } from '@aims/voice-library/sponsorship';

// Single plug
const plug = generatePlug({
  speaker_character_id: 'void-caster',
  brand_id: 'coastal',
  sku_ids: ['sumatra-12oz'],
  format: 'sponsor-read',
  length_seconds: 30,
});

// Fan-out: every Per|Form analyst plugs Coastal Sumatra
const fleet = generateAllSponsorReads('coastal', ['sumatra-12oz'], 30, 'perform');
```

## Plug formats

| format | length | use |
|---|---|---|
| `sponsor-read` | 15 / 30 / 60 sec | Formal pre-roll / mid-roll / post-roll spot |
| `organic-plug` | variable | Woven into surrounding content; "I had a Sumatra this morning" |
| `brand-mention` | <5 sec | Quick attribution; "powered by ACHIEVEMOR" |

## Forbidden topics (compliance — global)

Per `feedback_owner_brief_is_not_customer_copy.md` + `feedback_shipped_means_commercial_ready.md`:

- No internal tool names on customer surfaces (NemoClaw, Hermes, DeerFlow, etc.)
- No specific health claims without a fresh attestation in the audit chain
- No sourcing certificate IDs without current refresh
- No competitor comparisons without legal sign-off
- No allergen claims without a fresh attestation

Each `BrandIdentity.forbidden_topics` extends this global list with brand-specific items.

## How to add a new character

1. Add a `DialectGuide` entry to `src/dialect/dialect-guides.ts` (or to a vertical-scoped registry if your vertical has its own file)
2. Add a `CharacterVoiceEntry` to `src/registry/character-voices.ts` (voice slot; assignment TBD until owner-approved sample)
3. Update this CATALOG.md
4. Generate a sample voice via the (TBD) ingest → clone → sample workflow
5. Owner reviews sample → APPROVE / REJECT → if approved, fill in `geminiVoiceName` or `cloneId` on the `CharacterVoiceEntry`

## How to add a new brand

1. Add a `BrandIdentity` to `src/sponsorship/brands.ts`
2. Add owner-approved claims and pitches; flag forbidden topics
3. Add product SKUs as needed (`ProductSku` entries)
4. Update this CATALOG.md
5. Generate cross-vertical sponsor reads via `generateAllSponsorReads()`

## Related canon

- `~/foai/perform/src/lib/analysts/dialect-guides.ts` — the original dialect-as-script pattern
- `~/foai/perform/src/lib/analysts/personas.ts` — analyst persona definitions
- `~/foai/coastal-brewing/agents/operations_pmo/sal_ang/agent.py` — Sal_Ang's canonical Python agent
- `~/.claude/projects/C--Users-rishj/memory/project_coastal_sales_team_voice_cast_2026_04_29.md` — owner directive on the Coastal cast structure
- `~/.claude/projects/C--Users-rishj/memory/feedback_ch_voice_gemini_live_not_inworld.md` — Gemini Live as voice substrate; Inworld reserved for Spinner
- `~/.claude/projects/C--Users-rishj/memory/feedback_attestation_not_ingestion_policing.md` — compliance gate is at production, not ingestion
