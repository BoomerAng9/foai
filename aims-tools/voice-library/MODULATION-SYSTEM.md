# Register Modulation System — Architecture

> **System:** voice/register modulation across the FOAI character ecosystem.
> **Doctrine source:** `dialect-library/REGISTER-MODULATION.md` (the WHY).
> **This file:** the HOW — components, data flow, integration points, runtime
> behavior, deploy + verification.
>
> **Owner directive 2026-05-03:** voice (acoustic profile) is invariant per
> character; register / lexicon density modulates by deployment surface. A
> Five-Percenter character at a luxury-coffee retail counter doesn't drop
> *peace, god* on a customer who can't parse the inheritance — same voice,
> lower-density lexicon. This system implements that.

---

## What problem this solves

A single character — say, ACHEEVY, whose home register is Queensbridge-
baritone-adjacent with Belter Creole layer + Civil-Rights pulpit echo +
5%-Nation + Thun language inheritances — needs to operate across multiple
deployment surfaces:

| Surface | Audience | Problem if home register deploys directly |
|---|---|---|
| `customer_chat_panel` | mainstream retail customer | *peace, god*, *thun*, *the science of* read as opaque/in-group code; alienating |
| `wholesale_chat` | B2B buyer / executive | dialect density hurts the deal |
| `team_internal` | colleague | full home register is right; stripping it makes the character generic |
| `press_broadcast` | broad public | comprehension is the load-bearing constraint |

Same character. Same voice (the TTS / acoustic profile never changes).
What MUST change between surfaces: lexicon density, vocabulary choice,
which layered registers and inheritances surface.

This is the **register modulation problem**. Without a system, an LLM
generating ACHEEVY's lines either:
1. Defaults to the home register on every surface (alienates customers), or
2. Strips all dialect everywhere (loses character identity), or
3. Modulates inconsistently turn-to-turn.

The system encodes the modulation rule machine-readably and injects the
correct register guidance into the LLM system prompt for every (character,
surface) pair.

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                       DOCTRINE (canon)                               │
│                                                                      │
│  dialect-library/REGISTER-MODULATION.md                              │
│  - Voice (invariant) vs Register (modulated)                         │
│  - Environment dimension scoring (4 dims, 0-3 each)                  │
│  - Operating register floor formula:                                 │
│       floor = 5 - max(audience_formality, comprehension_demand,      │
│                        stakes, recordedness)                         │
│  - effective_aave = min(home_register, floor)                        │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                         DATA (canonical)                             │
│                                                                      │
│  dialect-library/cast-environments/<vertical>.yaml                   │
│  - surfaces: { customer_chat_panel, wholesale_chat, team_internal,   │
│               retail_counter, supplier_call, press_broadcast }       │
│    each with: audience_formality, comprehension_demand, stakes,      │
│               recordedness, floor, label, notes                      │
│  - cast: { CHARACTER_NAME: home_register + operating_at[surface] }   │
│                                                                      │
│  dialect-library/<GROUP>/regional/<region>.md                        │
│  - Register-canon source (origin, vocabulary, gatekeeping,           │
│    anti-patterns) for each ethnic group + region                     │
│                                                                      │
│  dialect-library/<GROUP>/subcultural/<thread>.md                     │
│  - Cross-cutting register layers (church, hip-hop, gang, etc.)       │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      MODULATOR (machine)                             │
│                                                                      │
│  scripts/register_modulator.py                                       │
│  - operating_register_for(character, surface, vertical)              │
│      -> RegisterSpec dataclass                                       │
│        { aave_intensity, layered, lexicon_inheritances,              │
│          max_register_markers_per_turn, voice_profile,               │
│          notes, surface_floor, home_aave_intensity }                 │
│  - preamble_for(spec) -> str                                         │
│      Emits an LLM-injectable preamble with:                          │
│        - AAVE intensity guidance (per AAVE-INTENSITY-SCALE.md)       │
│        - per-layer guidance (Belter Creole, pulpit cadence,          │
│          syllable-timed pacing, etc.)                                │
│        - per-inheritance guidance (5%-Nation, Thun language,         │
│          Wu-Tang Slang, Dipset, Hyphy, Houston Screw, Memphis        │
│          horrorcore, NOLA Bounce, Detroit, Chicago drill)            │
│  - Internal lookup tables in module:                                 │
│        _AAVE_LEVEL_GUIDANCE (level → guidance)                       │
│        _LAYERED_GUIDANCE (layer → guidance)                          │
│        _INHERITANCE_GUIDANCE (inheritance → guidance + gatekeeping)  │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   INTEGRATION (runtime)                              │
│                                                                      │
│  coastal-brewing/scripts/api_server.py                               │
│  - _employee_system_prompt(employee, surface=customer_chat_panel)    │
│    1. Look up cast key (sal_ang -> Sal_Ang, acheevy -> ACHEEVY, ...) │
│    2. Call operating_register_for(cast_key, surface)                 │
│    3. Inject preamble_for(spec) BETWEEN brand preamble and persona   │
│    4. Soft-import — falls back to unmodulated prompt if voice        │
│       library tree absent                                            │
│                                                                      │
│  Final assembled system prompt order:                                │
│    1. _BRAND_PREAMBLE      (sitewide brand truths + safety rules)    │
│    2. _coastal_catalog_context()  (per-turn live catalog snapshot)   │
│    3. register_preamble    (surface-modulated dialect guidance)      │
│    4. employee persona     (T1/T2/T3 authority + voice register)     │
└──────────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
┌──────────────────────────────────────────────────────────────────────┐
│                          MODELS / TTS                                │
│                                                                      │
│  - LLM (DeepSeek-v4-Flash via OpenRouter) reads the assembled        │
│    prompt and generates text obeying the surface register            │
│  - Inworld TTS renders the LLM text using the character's            │
│    INVARIANT voice profile (e.g. acheevy-* voice ID)                 │
│                                                                      │
│  Voice = TTS voice ID (acoustic profile) — does NOT change per       │
│  surface.                                                            │
│  Register = LLM text style — DOES change per surface (per the        │
│  preamble instructions).                                             │
└──────────────────────────────────────────────────────────────────────┘
```

---

## Components

### 1. Doctrine — `REGISTER-MODULATION.md`

The canonical doctrine document. Defines the two-layer model
(voice = invariant, register = modulated), environment dimension
scoring, operating-register floor formula, application examples,
anti-patterns. **Consult this file for any question about WHY
the system behaves the way it does.**

### 2. Cast environments YAML — `cast-environments/<vertical>.yaml`

Per-vertical machine-readable matrix:

```yaml
surfaces:
  <surface_name>:
    label: <human readable>
    audience_formality:    0|1|2|3
    comprehension_demand:  0|1|2|3
    stakes:                0|1|2|3
    recordedness:          0|1|2|3
    floor: <auto-computed = 5 - max(dims)>
    notes: <surface-specific guidance>

cast:
  <CHARACTER_KEY>:
    home_register:
      group: <URBANISM | lowcountry-coastal-south | ...>
      region: <regional file slug>
      sub_region: <optional finer locality>
      aave_intensity: 0-5
      layered: [<layer keys>]
      lexicon_inheritances: [<inheritance keys>]
      code_switch_range: { floor: 0-5, ceiling: 0-5 }
    operating_at:
      <surface_name>:
        aave_intensity: 0-5
        layered: [<layer keys for this surface>]
        lexicon_inheritances: [<active inheritances for this surface>]
        max_register_markers_per_turn: <int>
        notes: <surface-specific guidance>
```

Verticals currently scaffolded:
- `coastal-brewing.yaml` (LIVE, integrated into runner)

### 3. Regional + subcultural canon — `dialect-library/<GROUP>/`

Markdown files documenting register canon per group + region +
subculture. Example tree under `URBANISM/`:

```
URBANISM/
├── AAVE-INTENSITY-SCALE.md          # 0-5 scale doctrine
├── regional/
│   ├── east-coast-ny.md             # 5 boroughs + Thun + Wu-Tang + Dipset
│   ├── west-coast.md                # LA + Bay Area + Hyphy
│   ├── down-south.md                # Houston Screw + Memphis + NOLA + Miami
│   ├── midwest.md                   # Detroit + Chicago drill / non-drill
│   ├── southern-atlanta.md          # 4 Atlanta sub-registers
│   ├── southern-coastal-georgia.md  # Savannah / Pin Point / Sea Islands
│   └── audio/                       # procured reference audio + provenance
└── subcultural/
    └── church.md                    # pulpit cadence cross-cut
```

Each regional file follows a consistent structure: cadence + acoustic
profile, sub-register breakdowns (with origin / vocabulary table /
gatekeeping / anchors / sources), heritage layers, acoustic profile
target, anti-patterns, cross-references.

### 4. Modulator — `scripts/register_modulator.py`

Two public functions + three internal lookup tables:

**Public API:**
- `operating_register_for(character, surface, vertical) -> RegisterSpec`
- `preamble_for(spec) -> str`

**Internal tables:**
- `_AAVE_LEVEL_GUIDANCE` — level (0-5) → text guidance
- `_LAYERED_GUIDANCE` — layer key (e.g. `belter_creole_layer`,
  `civil_rights_pulpit_echo_cadence`) → text guidance
- `_INHERITANCE_GUIDANCE` — inheritance key (e.g. `5pct_nation_light`,
  `thun_language_light`, `wu_tang_slang_light`) → full origin +
  vocabulary + gatekeeping + surface-modulation guidance

**CLI also available:**
```bash
python register_modulator.py --character ACHEEVY --surface customer_chat_panel
python register_modulator.py --character Cou_Ang_Marcus --surface wholesale_chat --format json
```

### 5. Acoustic-feature analyzer + procurement — `scripts/analyze_voice.py` + `research_voice_register.py`

Companion pipeline that procures public-interview audio of register
anchors, analyzes acoustic features (F0 / spectral / HNR / speech-
rate / MFCC), and scores against built-in target profiles
(`acheevy_baritone`, `west_coast_la_baritone`, `down_south_baritone`,
`midwest_baritone`, `coastal_georgia_female`, `black_american_adult_male`).

Sliding-window mode auto-finds clean single-speaker segments inside
multi-DJ podcasts. See `MEMORY.md` reference entry on the procurement
pipeline.

### 6. Runtime integration — `coastal-brewing/scripts/api_server.py`

Soft import block:
```python
_VOICE_LIBRARY_SCRIPTS = pathlib.Path(
    os.environ.get(
        "VOICE_LIBRARY_SCRIPTS_DIR",
        str(ROOT.parent / "aims-tools" / "voice-library" / "scripts"),
    )
)
try:
    if _VOICE_LIBRARY_SCRIPTS.exists():
        sys.path.insert(0, str(_VOICE_LIBRARY_SCRIPTS))
    from register_modulator import operating_register_for, preamble_for
    REGISTER_MODULATOR_AVAILABLE = True
except Exception:
    REGISTER_MODULATOR_AVAILABLE = False
```

Runner-to-cast mapping:
```python
_EMPLOYEE_TO_CAST_KEY = {
    "sal_ang":       "Sal_Ang",
    "luc_ang":       "LUC_Ang",
    "melli_capensi": "Melli_Capensi",
    "acheevy":       "ACHEEVY",
}
```

System-prompt assembly (the modulator-injection point):
```python
def _employee_system_prompt(employee, surface="customer_chat_panel"):
    persona = prompts.get(employee, prompts["acheevy"])
    register_preamble = ""
    if REGISTER_MODULATOR_AVAILABLE:
        try:
            cast_key = _EMPLOYEE_TO_CAST_KEY.get(employee, "ACHEEVY")
            spec = operating_register_for(cast_key, surface, vertical="coastal-brewing")
            register_preamble = preamble_for(spec) + "\n\n"
        except Exception:
            register_preamble = ""
    return _BRAND_PREAMBLE + _coastal_catalog_context() + register_preamble + persona
```

The customer-chat WebSocket handler calls this with the default
surface (`customer_chat_panel`) — no caller change required.

---

## Data flow at runtime

```
Customer types in chat-panel.tsx
            ↓
WebSocket /ws/chat receives WsUserMessage
            ↓
api_server.py: _employee_system_prompt("acheevy")
            ↓
register_modulator.operating_register_for("ACHEEVY", "customer_chat_panel")
            ↓
loads cast-environments/coastal-brewing.yaml
            ↓
returns RegisterSpec(aave_intensity=2, layered=[belter_creole_layer_light],
                     lexicon_inheritances=[], max_markers=2, ...)
            ↓
preamble_for(spec) → markdown-text register guidance
            ↓
Final system prompt = brand_preamble + catalog_context + register_preamble + persona
            ↓
DeepSeek-v4-Flash generates ACHEEVY's response in customer-appropriate register
            ↓
Inworld TTS renders with INVARIANT acheevy-jarrett-baritone voice
            ↓
Customer hears character's voice (unchanged) speaking customer-appropriate text
```

---

## Adding a new (character × surface) pair

1. **Identify the surface.** Score it on the 4 dimensions per
   `REGISTER-MODULATION.md`. Compute the floor.
2. **Add the surface to `cast-environments/<vertical>.yaml`** if it's
   not already there.
3. **For each character that appears on the surface:** add an
   `operating_at: <surface>` block under their entry, with explicit
   `aave_intensity`, `layered`, `lexicon_inheritances`, optional
   `max_register_markers_per_turn` and `notes`.
4. **Test via CLI:** `python register_modulator.py --character X
   --surface Y --format json`. Verify the operating register is
   what you expect.
5. **For new layered registers or inheritances:** add a key+guidance
   entry to `_LAYERED_GUIDANCE` or `_INHERITANCE_GUIDANCE` in
   `register_modulator.py`. Lookup falls back to the raw key string
   if no guidance is registered, but with no detail.

---

## Adding a new vertical

1. Create `dialect-library/cast-environments/<vertical>.yaml`
   following the same shape as `coastal-brewing.yaml`.
2. In the runner that uses this vertical, soft-import the modulator
   the same way `api_server.py` does, with the vertical's name
   passed to `operating_register_for(..., vertical=<vertical>)`.
3. Build the `<runner_employee_key> → <cast_yaml_key>` mapping.
4. Inject the preamble at the same spot in the system prompt.

The modulator itself is vertical-agnostic — it reads whichever
YAML the caller names.

---

## Operating policy + content rules

The modulator carries register-authenticity gatekeeping (e.g. *Thun
language* deploys only on Queensbridge-rooted characters; *Wu-Tang
Slang* affiliations only on Wu-rooted; *Dipset* terminology only
on Dipset-affiliation lineage; *Chicago drill* set-references only
on documented connections). These are aesthetic / lineage rules,
not legal-exposure rules. Compliance for end-user output lives at
the **production-attestation layer** per
`feedback_attestation_not_ingestion_policing.md` (2026-04-16) and
`feedback_fair_use_training_policy.md` (2026-04-09) — NOT at this
modulator or in the dialect library encoding.

The modulator also carries a small set of FORBIDDEN content rules
(e.g. *no homo* phrase tag flagged in Dipset entry, *captain save 'em*
flagged in Hyphy entry). These are brand-policy rules baked into the
system prompt because their deployment risk is brand-damaging
regardless of attestation.

Public-figure exclusions live in `MEMORY.md` (currently:
`feedback_dialect_anchor_exclusions_2026_05_03.md` covering Future +
Migos + Quavo). The modulator and the regional files MUST be kept
clean of those names. Strike on sight.

---

## Verification + smoke test

After any change to the modulator, the YAML, or the runner integration:

```bash
# 1. Modulator emits valid preambles for all (character × surface) pairs
PYTHONIOENCODING=utf-8 python aims-tools/voice-library/scripts/register_modulator.py \
  --character ACHEEVY --surface customer_chat_panel
PYTHONIOENCODING=utf-8 python aims-tools/voice-library/scripts/register_modulator.py \
  --character ACHEEVY --surface team_internal
PYTHONIOENCODING=utf-8 python aims-tools/voice-library/scripts/register_modulator.py \
  --character Cou_Ang_Marcus --surface wholesale_chat

# 2. Runner compiles after integration
python -m py_compile coastal-brewing/scripts/api_server.py

# 3. Customer-surface inheritance leak check
PYTHONIOENCODING=utf-8 python aims-tools/voice-library/scripts/register_modulator.py \
  --character ACHEEVY --surface customer_chat_panel --format json \
  | python -c "import sys, json; d=json.load(sys.stdin); \
      assert d['lexicon_inheritances'] == [], \
      f'inheritance leak on customer surface: {d[\"lexicon_inheritances\"]}'; \
      print('PASS — customer surface clean')"
```

A passing run produces clean output for all three checks. Failure modes:
- Missing inheritance / layer key → emitted as raw string in preamble
  (visible but not broken)
- Missing surface → exception, caller falls back to unmodulated prompt
- Missing character → exception, caller falls back to unmodulated prompt
- Malformed YAML → exception, caller falls back to unmodulated prompt

---

## Cross-references

- `dialect-library/REGISTER-MODULATION.md` — the doctrine
- `dialect-library/INDEX.md` — the canonical taxonomy
- `dialect-library/URBANISM/AAVE-INTENSITY-SCALE.md` — the 0-5 scale
- `dialect-library/cast-environments/coastal-brewing.yaml` — the
  primary live cast matrix
- `scripts/register_modulator.py` — the implementation
- `scripts/analyze_voice.py` + `scripts/research_voice_register.py`
  — companion acoustic pipeline (validates that procured voice
  references match the regional acoustic profiles)
- `~/foai/coastal-brewing/scripts/api_server.py:2524` —
  `_employee_system_prompt` — the runtime injection point
- Memory canon for operating policy:
  - `feedback_fair_use_training_policy.md` (2026-04-09)
  - `feedback_attestation_not_ingestion_policing.md` (2026-04-16)
  - `feedback_dialect_library_no_prosecution_warnings_2026_05_03.md`
  - `feedback_dialect_anchor_exclusions_2026_05_03.md`
