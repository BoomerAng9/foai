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

1. **Write `scripts/compile-shield-policy.py`** — auto-generate the
   `.rs` files from YAML so constraint changes flow through without
   hand-editing. The hand-written code here is the reference target.

2. **Expand Kani harnesses** — the two harnesses in `kani_harnesses.rs`
   are proofs of concept. Every `kani_properties` entry in every YAML
   should have a corresponding harness. The Paranoia harness is the
   most structurally important; replicate its thoroughness for Halo's
   no-self-cosign property and Privacy's no-PII-emit invariant.

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
