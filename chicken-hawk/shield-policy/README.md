# shield-policy

ACHIEVEMOR Shield Division Semantic Constraint Profile enforcement kernel.

This crate implements the runtime half of v1.6 P3 #12 — turning the YAML
Semantic Constraint Profiles at `config/shield/*.yml` into Rust code that
(a) the Spinner policy engine invokes on every tool-call pre-execution,
and (b) Kani+Prusti verify for all possible inputs.

## Layout

```
src/
├── lib.rs              — validate() top-level entry, dispatches to
│                         universal_base → squad → per-Hawk override.
├── types.rs            — Invocation, Denial, Hawk (32-variant enum),
│                         Squad, ReasoningPath (closed set),
│                         DataClass, Persona, Slct, Sat, CiaProof.
├── kernel.rs           — universal_base_validate(), compiled from
│                         config/shield/universal_base.yml.
├── squads/
│   ├── black.rs        — from config/shield/squads/black.yml
│   ├── blue.rs         — from squads/blue.yml
│   ├── purple.rs       — from squads/purple.yml
│   ├── white.rs        — from squads/white.yml
│   └── gold_platinum.rs — from squads/gold_platinum.yml
├── hawks/
│   ├── lil_scope_hawk.rs  — Reaper
│   ├── lil_seal_hawk.rs   — Privacy (formally verified kernel member)
│   ├── lil_mast_hawk.rs   — Halo (SAT co-signer)
│   ├── lil_doubt_hawk.rs  — Paranoia (Crypt_Ang commander prohibition)
│   └── lil_peel_hawk.rs   — Hex (owns formal verification)
└── kani_harnesses.rs    — Kani proof harnesses (feature = "kani")
```

## Monotonic contract

The validation is union-only. A new prohibition added at any of the
three layers can only produce more `Err` returns, never fewer. The Rust
type system encodes this:

- `universal_base_validate()` returns `Err` on any universal violation → `?` propagates
- `squads::*::validate()` runs only if universal_base passes
- `hawks::*::validate()` runs only if squad passes
- Missing per-Hawk file means squad-only (default), not an error

## Building

```bash
cargo build --release
cargo test               # runtime-level property tests
```

## Formal verification (Kani)

```bash
# One-time setup
cargo install --locked kani-verifier
cargo kani setup

# Run all harnesses
cargo kani --features kani

# Target a specific proof
cargo kani --features kani --harness kani_paranoia_refuses_crypt_ang
```

Expected discharge for v0.1:
- `kani_universal_rejects_bypass_consensus` — proves universal_base rejects `spinner.bypass_consensus` for all Hawks
- `kani_paranoia_refuses_crypt_ang` — proves Lil_Doubt_Hawk rejects ANY invocation with commander = Crypt_Ang, regardless of tool_id, risk level, or SAT state. This is the independent-auditor cryptographic guarantee.

## Formal verification (Prusti)

```bash
# Prusti integration is a follow-up (invariants listed in YAML but not
# yet annotated in this Rust scaffold). See TODO below.
```

## Regeneration

Do not edit `squads/*.rs` or `hawks/*.rs` by hand. Edit the source YAML
under `config/shield/` and regenerate:

```bash
cd ../..
python scripts/compile-shield-policy.py
```

The generator (not yet written — tracked as follow-up work) will:

1. Parse each `config/shield/*.yml`
2. Emit corresponding Rust module with enumerated prohibitions
3. Produce Kani harnesses for each `kani_properties` entry
4. Produce Prusti annotations for each `prusti_invariants` entry
5. Verify cross-file consistency with `shield_personas.yml`

For v0.1 the 11 Rust modules in this crate were written by hand as a
reference implementation — the generator's job is to automate this for
future squad / Hawk changes without hand-editing.

## Integration with Spinner policy engine

The Spinner dispatcher calls `shield_policy::validate(&invocation)`
before every tool execution. On `Err(Denial)`:

1. The action is refused
2. A `sec_audit` entry is appended (tamper-evident chain)
3. The Denial reason is returned to the calling Hawk's LLM context
4. For critical denials (ProhibitedCommander on Paranoia, CiaRequired,
   CoSignRequired), additional alerting triggers per v1.6 §2.2
   Degradation Spectrum escalation logic

## Multi-substrate build

Per v1.6 §3.1 Substrate Heterogeneity, this crate must produce
reproducible builds across three target substrates:

- `x86_64-unknown-linux-gnu` (Primary)
- `aarch64-apple-darwin` (Observer 1)
- `wasm32-wasi` / `riscv64gc-unknown-linux-gnu` (Observer 2)

The `Cargo.toml` release profile is tuned for reproducibility (LTO,
single codegen unit). Per-target builds are signed independently by
Vault (`Lil_Salt_Hawk`) per the Phoenix Protocol Golden Image workflow.

## Follow-up work

Ordered by leverage:

1. ~~**Write `scripts/compile-shield-policy.py`**~~ **DONE (v0.1,
   2026-04-18)** — lands at `chicken-hawk/scripts/compile-shield-policy.py`.
   Parses all 11 YAMLs, validates against SCHEMA.md closed vocabularies,
   emits `shield-policy/src/generated/*.rs` with sorted prohibition
   tables (tool_calls / reasoning_paths / targets / data_classes /
   commanders). Deterministic output with per-file SHA-12 content hash.
   `--check` mode is the CI drift gate. v0.2 follow-up: refactor
   hand-written squads/ and hawks/ modules to consume the generated
   constants instead of keeping parallel lists.

2. ~~**Expand Kani harnesses**~~ **PARTIAL — v0.2 (2026-04-18)**:
   `kani_harnesses.rs` grew from 2 harnesses to 13, covering 13 of 22
   `kani_properties` entries across the YAMLs. Achieved coverage:
   universal base (3/3), Black (1/2), Blue (1/1), White (2/2), Gold &
   Platinum (2/3), per-Hawk overrides for Reaper / Privacy / Halo /
   Paranoia. Paranoia's `kani_paranoia_refuses_crypt_ang` remains the
   marquee proof: for every invocation where `hawk == Paranoia AND
   commander == Crypt_Ang`, Kani discharges `Err(ProhibitedCommander)`
   for ALL possible input combinations. The remaining 9 YAML
   properties need Rust types that don't exist yet (`tool_class` enum,
   `Payload`, `Component`, `KernelBuild`, `AuditReport`, `Simulation`)
   — adding those in v0.3 extends coverage toward 22/22 without
   changing the existing harnesses.

3. **Prusti annotations** — the YAML's `prusti_invariants` entries are
   currently documentation-only. Annotate the Rust with Prusti
   `#[requires]` / `#[ensures]` / `#[invariant]` to make them checked.

4. **Wire into Spinner** — the Spinner policy engine at
   `runtime/spinner/` needs to import this crate and call `validate()`
   on every invocation. Currently Spinner enforces a smaller subset.

5. **Add the 27 missing per-Hawk overrides** — schema-permitted default
   is "inherit squad only, no file". If operational experience surfaces
   a delta for any of the 27 unadorned Hawks, land its YAML and
   regenerate.
