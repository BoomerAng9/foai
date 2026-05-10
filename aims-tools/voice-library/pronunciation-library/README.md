# Pronunciation Library — TTS phoneme + cadence + grammar canon

> **Scope correction 2026-05-03:** This library is the **TTS
> pronunciation data layer for SmelterOS / FOAI ecosystem-wide use** —
> it is platform-IP. It does **NOT** ship with any one vertical.
> Every customer-deployed Human-less Company kit pulls from this
> library at synthesis time; the rules + the engine are owned, the
> kit is templated.
>
> **Owner directive 2026-05-03 15:35:**
> *"WE NEED A TRUE PRONUNCIATION SYNTAX AND INDEX FOR PROPER
> GRAMMATICAL CONVERSATION."*
>
> This library answers that directive. It is the third moat alongside
> the SmelterOS OS layer (Crucible / A.I.M.S. / AVVA NOON) and the
> Voice / Persona / Dialect Library. Where the dialect library says
> *what register a character speaks*, this library says *how the
> synthesizer pronounces every word that comes out of their mouth*.

## Why a separate library

The voice library tells us:
- The character's **voice** (acoustic profile, cloned timbre).
- The character's **register** (lexicon density, dialect markers).

But neither layer answers:
- How to pronounce **brand names** (ACHEEVY → "Achievee", ACHIEVEMOR
  per applyTextNormalization, FOAI → "The Future of AI", etc.).
- How to pronounce **product / catalog terms** that retail TTS
  routinely mishandles (chamomile → "kammomile", Yirgacheffe,
  Sumatra origin terms, kombucha, matcha grades).
- How to **smooth cadence** (em-dash → comma, parenthetical
  pauses, ellipsis handling).
- How to enforce **proper grammar** in TTS input ("Im" → "I'm",
  number → word, abbreviation expansion).
- How to handle **per-character or per-vertical pronunciation
  overrides** (a Lowcountry character pronounces "pecan" PEE-can;
  a Northern character pronounces it puh-KAHN).

That's a separate, structured, data-driven concern. It belongs in
its own library.

## Taxonomy

```
pronunciation-library/
├── README.md                 (this file — doctrine)
├── INDEX.md                  (catalog of rule files + how to add)
├── rules/                    (YAML rule packs, applied in priority order)
│   ├── 01-grammar.yaml       (highest priority — fix grammar errors first)
│   ├── 10-brand-names.yaml   (ACHEEVY / ACHIEVEMOR / FOAI / character names)
│   ├── 20-cadence.yaml       (punctuation smoothing — em-dash, ellipsis)
│   ├── 30-coffee-tea.yaml    (catalog terms — chamomile, Yirgacheffe, etc.)
│   ├── 40-place-names.yaml   (Coastal / Bluffton / Beaufort / Charleston)
│   ├── 50-belter-creole.yaml (Belter Creole conlang phonetic guidance)
│   └── 90-vertical/          (per-vertical overrides)
│       ├── coastal-brewing.yaml
│       ├── choose-2-achievemor.yaml
│       └── nurdscode.yaml
└── engine/
    └── pronunciation_engine.py  (Python module — loads rules, applies to text)
```

## Rule schema

Every rule pack is a YAML file with this structure:

```yaml
# rules/<priority>-<name>.yaml
metadata:
  name: <human readable>
  scope: [all | voice-only | display-only | per-character | per-vertical]
  priority: <integer>           # lower runs first; 1=highest priority
  description: <one-liner>

rules:
  - id: <unique-id>              # e.g. brand.acheevy
    type: <regex | literal | grammatical | acronym | cadence>
    pattern: <regex or literal string>
    replacement: <string>
    case_sensitive: <bool>
    word_boundary: <bool>        # apply \b...\b around the pattern
    display_canonical: <string>  # what UI / labels show; rule applies ONLY to TTS
    when:
      character: [acheevy, sal_ang, ...]   # optional — only applies to these
      surface: [customer_chat_panel, ...]  # optional — only on these surfaces
      vertical: [coastal-brewing, ...]     # optional — only in these verticals
    notes: <provenance, owner directive reference, etc.>
```

## Priority + composition

Rules apply in priority order (low → high number). Multiple rules
can match the same text; later rules see the output of earlier rules.

Recommended ordering:
1. **01-grammar** — fix grammar errors first (Im → I'm; numerals → words).
2. **10-brand-names** — brand pronunciation rewrites (ACHEEVY → Achievee).
3. **20-cadence** — punctuation smoothing.
4. **30-coffee-tea** — catalog terms.
5. **40-place-names** — Coastal-specific place names.
6. **50-belter-creole** — Belter Creole pronunciation hints.
7. **90-vertical/** — per-vertical overrides applied last.

## Display vs. TTS — the load-bearing rule

**Pronunciation rewrites apply ONLY at TTS synthesis time.** They
NEVER alter:
- What customers SEE on the UI.
- What's stored in the database.
- What's logged or returned in JSON responses.
- What's rendered in chat-panel transcripts.

The display canon is set by the brand canon docs (
`feedback_no_abbreviations_in_production.md`,
`feedback_names_are_intentional.md`,
`reference_coastal_official_brand_canon_2026_04_30.md`, etc.).

The pronunciation library only intercepts the text input to the
TTS synthesizer. Customer reads "ACHEEVY" on the screen; the voice
they hear says "Achievee".

## How the engine works

`pronunciation_engine.py`:

```python
from pronunciation_engine import rewrite_for_tts

text = "Welcome. Im ACHEEVY. We have chamomile blends — try them."
tts_text = rewrite_for_tts(text, character="acheevy", vertical="coastal-brewing")
# tts_text == "Welcome. I'm Achievee. We have kammomile blends, try them."
```

The runner's `_employee_system_prompt` and the `voice_synthesize`
endpoint both call `rewrite_for_tts(...)` on text bound for TTS.

## Adding a new rule

1. Identify the priority bucket (or create a new file).
2. Add the rule to the YAML.
3. The engine reloads on runner restart.
4. No code change required.

## Cross-references

- `~/foai/aims-tools/voice-library/dialect-library/REGISTER-MODULATION.md`
  — sister doctrine: voice-invariant, register-modulated.
- `~/foai/aims-tools/voice-library/MODULATION-SYSTEM.md` — full
  modulation system architecture; this library plugs in alongside.
- `feedback_foai_pronounce_full_phrase_not_acronym.md` — FOAI =
  "The Future of AI" (canonical acronym-expansion rule; lives in
  `rules/10-brand-names.yaml`).
- `reference_inworld_api_canon_2026_05_03.md` — Inworld TTS API
  details; `applyTextNormalization` field interaction.
- `reference_acheevy_voice_shipped_canon_2026_05_03.md` — current
  ACHEEVY voice config that uses this engine.
