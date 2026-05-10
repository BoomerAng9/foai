# Spinner Rust Rewrite — Design Plan (v1.6 P0)

The last remaining v1.6 item. This document is the design pass the
implementation PR(s) will execute against. It's deliberately a plan,
not code — landing the plan first means the implementation sessions
have a contract to build toward instead of drifting.

## What P0 actually is

v1.6 §3.1 requires the Spinner policy engine to run as a
three-substrate consensus with the formally verified Rust kernel
components from PRs #236 / #238 / #240 / #242 / #244 composing
together. The current Spinner is Python/FastAPI (mostly stashed on
myclaw-vps, only `rate_limit.py` + `requirements.txt` landed in
this repo). A rewrite in Rust is the path that lets the whole
invocation pipeline run inside the formally-verified boundary.

**The scope is NOT "translate every Python file to Rust."** Spinner's
surface area (auth, rate limit, CORS, classifier, audit, dispatch)
is broader than the policy-decision path alone. The P0 rewrite
targets the HOT PATH: invocation ingress → shield-policy validate
→ tool dispatch. Peripheral concerns stay in Python until they
surface as hot-path costs.

## Three-phase sequencing

### Phase A — Contract lock (design + types, 0 runtime)

Goal: lock the invocation envelope that both Python (legacy) and
Rust (new) agree on. This is the MIGRATION INTERFACE — both
implementations can read/write it, so a progressive cutover is
possible without a big-bang.

Artifacts:
- Protobuf or Cap'n Proto schema for `Invocation` + `Denial` +
  `AuditEntry`. Versioned. Stable across Python↔Rust boundary.
- Rust `shield-policy` crate extends to consume the wire format
  (deserialize → validate → re-serialize the result).
- Python `shield_policy_client` (landed in #234) gets a
  serialization adapter for the wire format.

Commits in Phase A land independently — no runtime change yet.

### Phase B — Cloud Run Rust sidecar

Goal: deploy a Rust HTTP service that accepts the Phase-A wire
format and returns validate() results. Python Spinner calls this
sidecar BEFORE dispatch.

Artifacts:
- `runtime/spinner-policy/` — new Rust crate, depends on
  shield-policy, exposes a minimal `/validate` endpoint.
- `cloudbuild.yaml` entry that builds + deploys to Cloud Run.
- Python dispatcher wired to call the sidecar.

At this phase, Python is still the primary runtime. The Rust
sidecar is a validator, not a replacer. This gives us:
- End-to-end test of the Rust kernel components in production
- Observable latency cost (HTTP round-trip vs in-process)
- Option to revert (just turn off the sidecar call)

### Phase C — Full Rust hot path

Goal: migrate invocation ingress itself to Rust. Python becomes
the slow-path orchestrator (Taskade workflows, Paperform-like
surfaces) and the Rust service is the hot dispatcher.

Artifacts:
- `runtime/spinner-core/` — new Rust crate handling auth +
  rate-limit + dispatch. Imports shield-policy for validation.
- Graceful cutover: traffic split between Python and Rust via
  Cloud Run traffic management. Start at 1%, ramp as audit
  chains confirm parity.
- Python Spinner shrinks to non-hot-path surfaces.

## Substrate heterogeneity fits here

Phase B's Rust sidecar is what actually runs on the three
substrates. Each substrate (x86_64-linux, ARM64-darwin, WASM) is
a separate Cloud Run service (or wasm runtime) with its own
independent Vault-signed build. The quorum logic (2-of-3 must
agree) lives in the dispatcher — Python in Phase B, Rust in
Phase C.

The substrate-layer Kani proof landing in the same closeout PR as
this plan MODELS that quorum check. At implementation time, the
dispatcher code (whichever language) is required to match the
model the proof discharges.

## What's NOT in scope for P0

- Full Python Spinner rewrite (peripheral concerns stay Python
  indefinitely)
- New policy features (CIA/SNR/Degradation/Phoenix/ZKP are done;
  P0 is about runtime posture, not feature addition)
- Migration of Hermes / live-look-in / Picker_Ang (those consume
  Spinner but aren't Spinner)
- Changing the Semantic Constraint Profile YAML shape (locked by
  the shield-policy generator)

## Sequencing constraints

1. **Phase A before Phase B:** wire format must be stable before
   anything deploys.
2. **Phase B stable before Phase C:** sidecar must prove parity
   with Python's inline validation before Python hot-path is
   removed.
3. **Cloud Build GitHub App install must happen before any CI-
   gated deployment.** That's the pending user action from
   #237/CLOUD_BUILD.md.
4. **Vault sidecar must land before per-substrate signing** (the
   other infra scaffold shipping in this closeout PR).

## Risks to flag up front

- **Phase B latency.** HTTP round-trip adds 1-2ms per invocation.
  For short agent traces (10-50 tool calls) this is noise. For
  long traces (1000+) it compounds. Monitor; consider PyO3 FFI
  as an alternative if latency becomes load-bearing (Phase A's
  wire format also serves PyO3 marshalling).
- **Multi-substrate operational complexity.** Three services,
  three build pipelines, three sets of Cloud Run configs. Worth
  the byzantine-resilience guarantee, but requires discipline on
  the deploy side.
- **Traffic-split rollback.** Phase C's cutover must preserve
  audit chain continuity across Python→Rust handoff. Design
  assertion: audit entries from either runtime are byte-for-byte
  compatible via Phase A's wire format.

## What to start with next session

Open the next P0 session by:
1. Deciding protobuf vs Cap'n Proto for the wire format (Phase A)
2. Writing the schema (Phase A step 1)
3. Rust consumer implementation in shield-policy or a new
   sibling crate (Phase A step 2)

That's a clean first PR — contract locked, no runtime risk, sets
up Phase B cleanly.

## Success criteria for "P0 complete"

- Invocation ingress runs on Rust on all three substrates
- Audit chain entries are byte-compatible across Python+Rust
- Kani-discharged proofs carry through end-to-end (invoke → hit
  Rust service → validate() → return)
- Python Spinner survives as orchestrator, not as policy enforcer
- Cloud Build pipeline gates every deploy on substrate-verify +
  Kani + tests + drift-gate (already in place for the library;
  extend to the new runtime crates)

## Sign-off

This plan is the gate. The next session that picks up P0 should:
1. Re-read this plan
2. Pick Phase A's protobuf-vs-Cap'n choice
3. Open a single-PR scope for Phase A step 1 (schema)

No implementation before the plan update if scope shifts.
