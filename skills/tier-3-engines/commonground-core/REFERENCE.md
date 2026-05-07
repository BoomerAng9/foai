# Commonground core — Tier 3 Engine Reference

**Not a SKILL.md — infrastructure.** Cross-tier accessible per
FOAI-RUNTIME-002. Not exclusive to ACHEEVY.

## What it is

Shared substrate for cross-vertical state, identity, and policy
primitives. Where every FOAI vertical (Coastal, CTI Hub, Deploy,
Per|Form, NurdsCode, plugmein) reads and writes the same canonical
records — Custee identity (cookie + email + phone hash), shared
audit-ledger schema, Sacred Separation discipline, brand-voice
register, register-modulator state, dialect canon, the V.I.B.E. tag
schema.

## Why it exists

Without Commonground core, each vertical re-invents identity / audit /
policy in its own way. With it, every Boomer_Ang / Coastal cast / Hawk
/ engine reads the same source-of-truth state without a per-vertical
shim layer.

## Invocation contract

```http
GET  https://commonground.foai-aims.run.app/v1/state/<key>
PUT  https://commonground.foai-aims.run.app/v1/state/<key>   # ACHEEVY-signed write only
POST https://commonground.foai-aims.run.app/v1/audit          # any tier append
GET  https://commonground.foai-aims.run.app/v1/policy/<name>  # read shared policy
Authorization: Bearer ${COMMONGROUND_TOKEN}
```

Writes to canonical state require an ACHEEVY-signed token; reads are
open to any tier with a valid bearer.

## Examples of state held in Commonground core

- `coastal_uid` ↔ `email` ↔ `phone_hash` mapping (cross-vertical Custee identity).
- Shared `audit_ledger` schema definition (so coastal-runner +
  per-form-runner + nurdscode-runner all read the same row shape).
- Sacred Separation policy: vendor-name allowlist, supplier-name block,
  cost-floor exposure ban.
- V.I.B.E. tag canon (so Betty-Anne_Ang's scoring framework reads the
  same canonical tags every Boomer_Ang sees).

## Pairing

- **ii-commons** uses Commonground core for shared utility execution.
- **Hermes evals** read Commonground core's audit feed for KPI / OKR
  reasoning.
- **AVVA NOON** (intelligence layer) uses Commonground core as its
  cross-vertical canonical truth.

## Egress policy

NemoClaw policy at the edge. Read-tier mappings published in the Hermes
evals dashboard.
