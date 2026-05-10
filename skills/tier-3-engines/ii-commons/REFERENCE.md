# ii-commons — Tier 3 Engine Reference

**Not a SKILL.md — infrastructure.** Cross-tier accessible per
FOAI-RUNTIME-002. Not exclusive to ACHEEVY.

## What it is

Shared utilities + helpers used across ii-agent / ii-researcher and any
FOAI vertical that needs them. Pairs with Commonground core (which
holds shared *state*); ii-commons holds shared *behavior*.

## What lives here

- Pre-built tool wrappers for Tier 3 invocations (`call_ii_agent()`,
  `call_ii_researcher()`, `call_hermes()`, `call_autoresearch()`,
  `call_nemoclaw()`).
- Audit-ledger insert helpers with built-in schema validation against
  Commonground core's canonical row shape.
- Sacred Separation enforcement utilities — strip cost / margin /
  supplier name from any text payload bound for a customer surface.
- Stepper escalation token mint + verify (HMAC primitives).
- Voice canonicalization (markdown strip for TTS, pronunciation engine
  pre-processing).
- Cost-meter event emit (every Tier 3 invocation logs through this).

## Invocation contract

ii-commons is a Python package + JS package, NOT an HTTPS endpoint.
Tier 2 Managed Agents and Tier 3 Cloud Run services import it
directly:

```python
from ii_commons import (
    call_ii_researcher, call_hermes, call_nemoclaw,
    enforce_sacred_separation, mint_stepper_token, verify_stepper_token,
    audit_insert, strip_markdown_for_tts,
)
```

```javascript
import {
  callIIResearcher, callHermes, callNemoClaw,
  enforceSacredSeparation, mintStepperToken, verifyStepperToken,
  auditInsert, stripMarkdownForTTS,
} from '@foai/ii-commons';
```

## Why a package, not a service

Latency. Sacred Separation enforcement runs on every customer-bound
token; a network round-trip per check is unacceptable. ii-commons
ships as a versioned package consumed by every runtime tier.

## Pairing

- **ii-agent / ii-researcher** import ii-commons for tool wrappers + audit emission.
- **Coastal cast (Sal, LUC, Melli, etc.)** import ii-commons for Sacred Separation enforcement and Stepper token math.
- **Cyber Hawks** import ii-commons for audit insertion with canonical schema.
- **Boomer_Angs** import ii-commons for cross-vertical helpers.

## Versioning

Pinned per-vertical via lockfile. Major version bumps require
Code_Ang's 7-gate audit. Patch versions auto-deploy on merge to main.

## Source repo

`BoomerAng9/foai/aims-tools/ii-commons/` — sibling to `aims-tools/aims-core/`.
