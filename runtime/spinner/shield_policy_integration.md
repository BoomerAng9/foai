# Spinner ↔ shield-policy integration design

Spinner is the Python/FastAPI tool-calling layer above ACHEEVY's triad.
`shield-policy` is the Rust formally-verified policy enforcement kernel
at `chicken-hawk/shield-policy/`. Before a Spinner-dispatched tool call
executes, it must pass `shield_policy::validate()` — a union of
universal-base, squad, and per-Hawk prohibition checks derived from
`config/shield/*.yml`.

Three integration paths, recommendation below.

## Option A — PyO3 FFI (in-process Rust binding)

Bind `shield-policy` as a Python extension module via `pyo3` +
`maturin`. Spinner `import shield_policy` and calls
`shield_policy.validate(invocation_dict)`.

- **Pros:** lowest latency (function call, no IPC). Zero network. One
  deploy artifact. Typechecked at the Rust boundary.
- **Cons:** Python and Rust toolchains must coexist in the Spinner
  container. Rebuild required when shield-policy YAML changes (the
  generator emits new Rust constants → crate rebuilt → wheel rebuilt
  → Python module reimported). Cross-platform wheel builds needed
  (Linux x86_64 is the production target but dev on macOS/Windows
  will want their wheels too).
- **Effort:** medium. `maturin` is the canonical path; ~2 days to
  build, test, and wire into CI.

## Option B — HTTP sidecar (Rust microservice)

Run `shield-policy` as a standalone HTTP service (e.g., `axum` on port
7080). Spinner POSTs invocations, sidecar returns `200 Ok` or
`403 Forbidden + {reason}`.

- **Pros:** language-agnostic. Shield sidecar can be reused by other
  services (Hermes, runtime/live-look-in). Independent deploy cycle
  for shield-policy. Horizontal scaling without Spinner rebuild.
- **Cons:** IPC latency (~1-2ms local). Extra deploy surface. Need
  HTTP auth to prevent circumvention. Kubernetes or equivalent
  service mesh required in prod.
- **Effort:** medium. The `axum` server is ~100 LOC thin wrapper
  around `validate()`. Main cost is ops — health checks, deployment
  config, TLS.

## Option C — Wasm module (shared-across-language primitive)

Compile `shield-policy` to `wasm32-unknown-unknown`, load via
`wasmtime` from Python. Spinner `import shield_policy_wasm`.

- **Pros:** one artifact runs in Python, Node, browser, anywhere.
  Sandboxed by definition. Aligned with v1.6 §3.1 Substrate
  Heterogeneity (the WASM RISC-V observer already needs this target).
- **Cons:** `wasmtime-py` is mature but less common. Enum marshalling
  needs `wit-bindgen` or equivalent. Initial tooling cost.
- **Effort:** medium-high. ~3 days initial, but unlocks the Substrate
  Heterogeneity proof harness properly.

## Recommendation — **Option A (PyO3) as the v1 path**

Three reasons:

1. **Locality matters for this specific boundary.** Every tool call
   invokes `validate()`. An HTTP round-trip adds milliseconds that
   compound across long agent traces. PyO3 keeps it a function call.

2. **The bundling cost is bounded.** `maturin` produces a wheel per
   target; Spinner's Dockerfile already pins Linux x86_64 as the
   production runtime. One wheel covers that case. Dev wheels for
   macOS/Windows are easy adds.

3. **Option B's reusability argument is weak today.** Only Spinner
   needs `validate()` right now. If/when Hermes or live-look-in also
   need it, we can graduate to a sidecar without rewriting — the
   PyO3 path leaves the underlying crate intact.

**Option C graduates into the picture later** when Substrate
Heterogeneity deployment (v1.6 §3.1) lands. At that point the WASM
target already exists and the marshalling work pays off across
multiple substrates.

## Integration contract

`shield_policy_client.py` in this directory defines the Python-side
shape. Its `Invocation` dataclass mirrors the Rust struct; the
`validate()` stub documents the call sequence and return contract.
When the PyO3 build lands, the stub gets replaced with the real
binding without changing the caller's API.

## What the Spinner dispatcher wires up

```python
from shield_policy_client import Invocation, ShieldPolicyClient, Denial

client = ShieldPolicyClient.default()

async def dispatch_tool_call(req):
    inv = Invocation.from_spinner_request(req)
    try:
        client.validate(inv)
    except Denial as d:
        # Tamper-evident audit entry + caller-facing refusal
        await audit.append_denial(inv, d)
        return {"status": "refused", "reason": str(d)}
    # passes: proceed with downstream execution
    return await dispatch_to_tool(inv)
```

The `audit.append_denial` hook is where Paranoia's `sec_audit` chain
gets extended. That's a separate integration (v1.6 §4.4 Audit Loop)
that also needs wiring but is orthogonal to the validate() boundary.

## Sequencing

1. **This PR:** design + client stub. Locks the contract.
2. **Follow-up PR:** Spinner service lands (main.py / auth.py / etc.)
   with the stub `shield_policy_client` imported as a no-op. Works
   today without `shield_policy` actually wired.
3. **PyO3 build PR:** `maturin` config + GitHub Action that builds
   and publishes the `shield_policy` wheel. Replace stub with real
   binding in one commit.
4. **Audit-loop PR:** wire `audit.append_denial` to sec_audit chain
   so denials become tamper-evident.

Each step is reversible independently. No big-bang integration.

## Security boundary

- Spinner runs `validate()` ON the invocation before dispatch
- Caller cannot influence the policy tables — they're compile-time
  constants in the Rust crate, rebuilt only when `config/shield/*.yml`
  changes
- A compromised Spinner replica cannot weaken policy without also
  compromising the build pipeline that produces the wheel — two
  attacks, not one
- Paranoia's audit of the compromise-simulation loop (v1.6 §4.4)
  covers this boundary via `audit.rebirth_cadence_check` running
  every hour against the deployed wheel's content hash
