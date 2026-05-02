# FOAI Ecosystem Standard — Inworld Character Integration
# Classification: INTERNAL IP — NOT FOR DISTRIBUTION
# Version: 1.1.0 — 2026-05-02
# Owner: ACHIEVEMOR / FOAI — asg@achievemor.io
# Governed by: A.I.M.S. Unified Skill + Build Control Pack

---

## Purpose

This document is the canonical standard for integrating Inworld AI characters into
any FOAI/AIMS-powered humanless organization. It defines the architecture, IP
protection rules, integration pattern, roster management system, and extension
contract.

Coastal Brewing Co. is the reference implementation (29 characters at initial
definition, expandable to any number with zero code changes). Every future FOAI
vertical EXTENDS this standard — it does not fork it.

---

## IP Protection Mandate

The following are FOAI intellectual property and must NEVER be stored in
Inworld's Studio, exposed in client-side code, or committed to any public repo:

1. **Character persona definitions** — Personality, voice register, goals, and
   behavioral rules. Defined in `aims-tools/voice-library/` and injected at
   runtime. Never authored in Inworld Studio UI.

2. **Escalation and routing logic** — How characters hand off is FOAI business
   logic (`escalation_triggers.py`). Inworld does not know about the tier system.

3. **The adapter pattern** — `InworldCharacterAdapter` and all code in this
   standard is FOAI IP.

4. **Character goal definitions** — Goals are in FOAI config files, injected at
   runtime. Not authored in Inworld Studio.

5. **The roster registry** — The list of characters, their roles, activation
   state, and deployment status is FOAI IP.

### What lives in Inworld

- Voice clone audio files (audio only, no text)
- Character workspace slot (a pointer, not content)
- Base language/region setting

### What lives in FOAI

- Everything substantive: persona, goals, memory seeds, voice register,
  escalation logic, roster, activation state

---

## Dynamic Roster Architecture

### The core principle

**No character name or count is ever hardcoded.**

Characters are defined in `character-registry.yaml`. The adapter loads all
characters with `active: true` at startup. Adding a new character requires:

1. Add entry to `character-registry.yaml` (set `active: false` until ready)
2. Create `character-specs/{employee_id}.yaml`
3. Set two env vars: `INWORLD_CHARACTER_ID_{SLUG}` and `INWORLD_VOICE_ID_{SLUG}`
4. Flip `active: true` when voice is cloned and spec is complete

**Zero code changes required.** The adapter derives all env var names from
the employee ID using a deterministic naming convention.

### Env var naming convention

```python
def character_env_var(employee_id: str, var_type: str) -> str:
    """Derive env var name from employee_id."""
    slug = employee_id.upper().replace("-", "_")
    return f"INWORLD_{var_type}_{slug}"

# Examples:
# sal_ang        → INWORLD_CHARACTER_ID_SAL_ANG
# melli_capensi  → INWORLD_CHARACTER_ID_MELLI_CAPENSI
# hos_ang        → INWORLD_CHARACTER_ID_HOS_ANG
# mar_che        → INWORLD_CHARACTER_ID_MAR_CHE
```

### Roster states

| State | Meaning | Deployed |
|---|---|---|
| `active: true` | Character is fully configured, voice cloned, ready | Yes |
| `active: false` | Character is defined but not yet ready | No |
| `preview: true` | Character spec is written, voice pending | No (test only) |
| `retired: true` | Character removed from rotation | No |

---

## Architecture

```
Customer Input (text or voice)
        ↓
[STT — openai/whisper-large-v3-turbo]   ← voice input path
        ↓
[Escalation Detection — escalation_triggers.py]
        ↓
[Employee Assignment — from roster registry, not hardcoded]
        ↓
┌─────────────────────────────────────────────────────────┐
│  REASONING PHASE (DeepSeek V4 Flash/Pro per employee)   │
│  · Streams reasoning tokens to WebSocket                │
│  · Drives animation (espresso cup / lu_cal / sett /     │
│    authority seal) based on employee                    │
│  · Produces final response text                         │
└─────────────────────────────────────────────────────────┘
        ↓ response text
┌─────────────────────────────────────────────────────────┐
│  DELIVERY PHASE (Inworld TTS)                           │
│  · Character voice synthesis from cloned voice ID       │
│  · Persona validated against syntax-library register    │
│  · Forbidden phrase check before delivery               │
│  · Audio streamed to customer                           │
└─────────────────────────────────────────────────────────┘
        ↓
Customer: text bubble + audio + animation
```

### Phase Evolution

| Phase | Capability | Status |
|---|---|---|
| 1 | TTS voice delivery for active characters | Building now |
| 2 | Full character session: memory, goals, character LLM | Next sprint |
| 3 | Realtime API: voice-in/voice-out, barge-in/interrupt | Voice launch |
| 4 | Multi-agent Director layer: characters converse visibly | Future |

---

## Standard Adapter Contract

```python
class IInworldCharacterAdapter(ABC):
    """
    Every FOAI vertical implements this interface.
    The interface is stable. Implementations vary by vertical.
    """

    @abstractmethod
    def roster(self) -> dict[str, CharacterSpec]:
        """Return all active characters keyed by employee_id."""
        ...

    @abstractmethod
    def is_active(self, employee_id: str) -> bool:
        """Return True if the employee has a fully configured Inworld presence."""
        ...

    @abstractmethod
    def get_voice_id(self, employee_id: str) -> str:
        """Return the Inworld voice ID. Always from env var — never hardcoded."""
        ...

    @abstractmethod
    def inject_persona(self, employee_id: str) -> str:
        """
        Return the full persona prompt. Sourced from voice-library at runtime.
        NEVER hardcoded. NEVER from Inworld Studio.
        """
        ...

    @abstractmethod
    async def synthesize_speech(
        self, text: str, employee_id: str
    ) -> AsyncIterator[bytes]:
        """Stream TTS audio bytes for the given text in the employee's voice."""
        ...

    @abstractmethod
    async def send_message(
        self, message: str, employee_id: str, session_id: str
    ) -> AsyncIterator[dict]:
        """
        Phase 2: Full character session. Returns stream of:
        {type: "text"|"audio"|"emotion", content: str|bytes}
        """
        ...
```

---

## Character Spec File Format

One YAML per character in `aims-tools/inworld/character-specs/`. No secrets.

```yaml
# {employee_id}.yaml
employee_id: "{employee_id}"           # matches escalation_triggers.py IDs
display_name: "{DisplayName}"
function: "{role description}"
pmo: "sales|back-office|ops|marketing" # mirrors team/page.tsx
tier: "T1|T2_BULK|T2_FINANCE|T3|internal"
active: false                          # flip to true when voice is ready
preview: false
customer_facing: true                  # false = internal agents only

# Voice
voice_design_prompt: |
  {Text description for IVC/professional cloning.
   Include: gender, age range, accent, pace, tone, character notes.}
tts_model: "tts-1.5-max"              # max for customer-facing, mini for internal

# Persona injection
persona_source: "aims-tools/voice-library/syntax-library/{register-file}.md"
persona_section: "{section to extract}"

# Goals (Phase 2)
goals: []

# Memory seeds (Phase 2)
memory_seeds: []

# Escalation
escalates_to: "{employee_id or null}"
escalation_triggers_file: "coastal-brewing/scripts/animation/escalation_triggers.py"
```

---

## Full Coastal Brewing Roster (29 characters)

Defined in `aims-tools/inworld/character-registry.yaml`. Includes all current
and planned characters. All `active: false` until voice is cloned.

| Category | Employee ID | Display Name | Tier | Customer-Facing |
|---|---|---|---|---|
| **Orchestrator** | acheevy | ACHEEVY | T1 | Yes |
| **Sales** | sal_ang | Sal_Ang | T3 | Yes |
| **Sales** | hos_ang | Hos_Ang | T3 | Yes |
| **Sales** | bar_ang | Bar_Ang | T3 | Yes |
| **Sales** | con_ang | Con_Ang | T3 | Yes |
| **Sales** | tas_ang | Tas_Ang | T3 | Yes |
| **Sales** | tea_ang | Tea_Ang | T3 | Yes |
| **Sales** | cou_ang | Cou_Ang | T3 | Yes |
| **Sales** | gre_ang | Gre_Ang | T3 | Yes |
| **Sales** | har_ang | Har_Ang | T3 | Yes |
| **Sales** | cur_ang | Cur_Ang | T3 | Yes |
| **Sales** | reg_ang | Reg_Ang | T3 | Yes |
| **Sales** | mat_ang | Mat_Ang | T3 | Yes |
| **Finance** | luc_ang | LUC_Ang | T2_FINANCE | Team-only |
| **Marketing** | melli_capensi | Melli Capensi | T2_BULK | Yes (bulk/B2B) |
| **Back-office** | bun_ang | Bun_Ang | internal | No |
| **Ops** | wsl_ang | Wsl_Ang | T2_BULK | Yes (wholesale) |
| **Ops** | ret_ang | Ret_Ang | internal | Yes (recovery) |
| **Ops** | acc_ang | Acc_Ang | internal | No |
| **Sett** | meles_mehli | Meles Mehli | T2_BULK | No |
| **Sett** | taxi_dea | Taxi Dea | T2_BULK | No |
| **Sett** | arcto_nyx | Arcto Nyx | T2_BULK | No |
| **Sett** | ana_kuma | Ana Kuma | T2_BULK | No |
| **Sett** | leu_kurus | Leu Kurus | T2_BULK | No |
| **Sett** | moscha_tah | Moscha Tah | T2_BULK | No |
| **Sett** | persona_tah | Persona Tah | T2_BULK | No |
| **Sett** | orien_talis | Orien Talis | T2_BULK | No |
| **Sett** | eve_retti | Eve Retti | T2_BULK | No |
| **Sett** | cuc_phuong | Cuc Phuong | T2_BULK | No |
| **Sett** | java_nessa | Java Nessa | T2_BULK | No |
| **Sett** | mar_che | Mar Che | T2_BULK | No |

**Active for Phase 1:** `acheevy`, `sal_ang`, `luc_ang`, `melli_capensi`
**Active for Phase 2:** All customer-facing characters
**Active for Phase 3:** Full 29-character roster

---

## Environment Variables — Dynamic Pattern

**Per-character variables** follow the naming convention. No fixed list.

```bash
# Core credentials (one set per deployment)
INWORLD_API_KEY=
INWORLD_API_SECRET=
INWORLD_WORKSPACE_ID=
INWORLD_TTS_MODEL=tts-1.5-max
INWORLD_SESSION_BUDGET_USD=0.50

# Per-character (add as characters are activated)
# Convention: INWORLD_{TYPE}_{EMPLOYEE_ID_UPPER}
# Type: CHARACTER_ID | VOICE_ID

# Phase 1 active characters
INWORLD_CHARACTER_ID_ACHEEVY=
INWORLD_VOICE_ID_ACHEEVY=
INWORLD_CHARACTER_ID_SAL_ANG=
INWORLD_VOICE_ID_SAL_ANG=
INWORLD_CHARACTER_ID_LUC_ANG=
INWORLD_VOICE_ID_LUC_ANG=
INWORLD_CHARACTER_ID_MELLI_CAPENSI=
INWORLD_VOICE_ID_MELLI_CAPENSI=

# Phase 2 additions (set when activated)
# INWORLD_CHARACTER_ID_HOS_ANG=
# INWORLD_VOICE_ID_HOS_ANG=
# ... one pair per character as they activate
```

---

## Boilerplate Extension Guide — New Vertical

To spin up a NEW humanless organization on this skeleton:

1. Copy `character-registry.yaml` → rename for new vertical, populate with their cast
2. Create `character-specs/{employee_id}.yaml` for each character
3. Write persona content in the new vertical's voice-library
4. Set env vars for active characters in the vertical's `.env`
5. The `InworldCharacterAdapter` is imported unchanged — zero modifications

The skeleton does not change. Only config and persona files change.

---

## Security Rules (Non-Negotiable)

1. Character IDs and voice IDs are env vars — never in code, never in logs.
2. API Key:Secret is env var — never in code, never in logs.
3. Persona injection text is logged as SHA-256 hash only (not content).
4. Session IDs are scoped per WebSocket connection. Cross-customer reuse: forbidden.
5. TTS audio is streamed, never persisted to disk unless explicitly required.
6. Inworld API calls are backend-only. Frontend never touches Inworld directly.
7. All Inworld error responses are normalized before reaching the customer.
8. Forbidden phrase check runs on every response before delivery.

---

## Voice Register Injection Rules

```
aims-tools/voice-library/syntax-library/{register}.md
    → persona_section extraction
    → injected as Inworld character personality field
    → forbidden phrase validation against "Vocabulary They Never Use" list
    → SHA-256 hash logged (not the text)
```

---

## Testing Gate (Required Before Voice Ships)

- [ ] All active characters synthesize speech in under 500ms (TTS-1.5 Max P90)
- [ ] Each voice is distinct and matches its syntax-library register (listen test)
- [ ] Forbidden phrases trigger fallback before delivery
- [ ] Session isolation: Customer A cannot hear Customer B
- [ ] Character ID and API key absent from all log lines
- [ ] Cost per turn within budget (`INWORLD_SESSION_BUDGET_USD`)
- [ ] TTS degrades gracefully to text-only if Inworld is unreachable
- [ ] Multi-character escalation produces audibly distinct voice transitions
- [ ] New character added to registry with `active: true` → available without restart

---

## Cost Governance

| Tier | TTS Model | Avg chars/turn | Est. cost/turn |
|---|---|---|---|
| Customer-facing (T1/T2/T3) | TTS-1.5 Max | ~200 chars | ~$0.002 |
| Internal (back-office) | TTS-1.5 Mini | ~150 chars | ~$0.00075 |
| Budget alert | — | — | $0.50 / session |
