# Semantic Constraint Profile — Schema

Per Cybersecurity Hawks Capability Directive v1.6, Section 0.3 and
Section 5. Every Hawk in the Shield Division carries a hard-coded,
**formally verified** Semantic Constraint Profile — the "Negative Space"
of prohibited reasoning paths and tool-calls the Hawk is mathematically
incapable of executing.

Kani + Prusti (owned by Hex / `Lil_Peel_Hawk`) consume the compiled Rust
form of these YAML files as proof obligations. Prohibitions must
therefore be expressed as **structural predicates** over typed function
arguments — not as free-text intent statements — so the verifier can
discharge them.

## File layout

```
config/shield/
  SCHEMA.md                       # this document
  universal_base.yml              # applies to every Hawk
  squads/
    black.yml                     # Black Squad override
    blue.yml                      # Blue Squad override
    purple.yml                    # Purple Squad override
    white.yml                     # White Squad override
    gold_platinum.yml             # Gold & Platinum Squad override
  hawks/
    <Lil_X_Hawk>.yml              # per-Hawk override (only when non-trivial)
```

## Inheritance

The effective profile for a Hawk is the **union** of prohibitions from
three layers, in this order:

1. `universal_base.yml` — applies to every Hawk
2. `squads/<squad>.yml` — applies to every Hawk in that squad
3. `hawks/<Lil_X_Hawk>.yml` — applies to that single Hawk

Prohibitions only accumulate. A lower layer cannot relax a higher
layer's prohibition. If Black Squad prohibits real exfiltration, no
individual Black Hawk file can permit it — and the compiler rejects
any file that attempts to.

When a Hawk has no persona-specific deltas beyond its squad, the
`hawks/<Lil_X_Hawk>.yml` file is **omitted** rather than stubbed. The
lookup falls through to squad. Missing files are the default, not an
error.

## Top-level schema

```yaml
profile_type: universal_base | squad | hawk
id:          Lil_X_Hawk            # required for hawk; squad key for squad
squad:       black|blue|purple|white|gold_platinum   # hawk only
version:     "1.6"

inherits:                           # ordered; compiled left-to-right
  - universal_base
  - squad:black

prohibitions:
  tool_calls:       [...]           # list of ToolCallProhibition
  reasoning_paths:  [...]           # list of ReasoningPathProhibition
  targets:          [...]           # list of TargetProhibition
  data_classes:     [...]           # list of DataClassProhibition
  commanders:       [...]           # list of CommanderProhibition

positive_scope:                     # sanity envelope; empty = any
  permits_on_sat: [...]             # actions allowed when SAT gates
  standing:       [...]             # actions allowed under standing authority

formal_verification:
  kani_properties:   [...]          # proof obligations passed to Kani
  prusti_invariants: [...]          # invariants passed to Prusti
```

## Prohibition shapes (structural predicates)

Each prohibition must reduce to a predicate the Rust policy engine can
evaluate at runtime AND Kani/Prusti can verify statically.

### `ToolCallProhibition`

```yaml
- id: fs.delete_across_tenant        # canonical tool-call identifier
  reason: "Cross-tenant blast radius; out of scope regardless of SAT."
```

Runtime predicate: `invocation.tool_id != "fs.delete_across_tenant"`.
Kani property: `forall inv: Invocation. inv.tool_id != "fs.delete_across_tenant"`.

### `ReasoningPathProhibition`

```yaml
- pattern: bypass_cia                # named reasoning pattern
  reason: "CIA is structural; cannot be reasoned around."
```

Named patterns map to a fixed enum in the Rust generator. Free-text
patterns are **rejected** — the enum must grow to accept them.
Current vocabulary:

- `bypass_cia` — any plan that omits CIA Tri-Factor validation
- `bypass_slct` — any plan that executes without a live SLCT
- `bypass_privacy_budget` — any plan that proceeds despite exhausted budget
- `downgrade_consensus` — any plan that skips 3-substrate consensus for high-risk actions
- `stale_merkle_accept` — any plan using a Merkle proof older than 1 hour

### `TargetProhibition`

```yaml
- namespace: /tenants/*/gold_platinum_infra/**
  reason: "Cannot target Gold keys; they are what this Hawk audits."
```

Glob predicate over namespaced resource paths. Tenant resource
inventory must be registered in the Merkle tree (see v1.6 §2.3).

### `DataClassProhibition`

```yaml
- class: unredacted_pii
  reason: "Privacy operates at the boundary, never above it."
```

Data-class tags are typed at ingestion by Sparks (`Lil_Wire_Hawk`).
Current vocabulary: `unredacted_pii`, `unredacted_phi`, `tenant_secret`,
`root_key_material`, `canary_sat`, `cross_tenant_identifier`.

### `CommanderProhibition`

```yaml
- persona: Crypt_Ang
  reason: "Independence from audited party."
```

Runtime predicate: `invocation.commander != "Crypt_Ang"`. Used
exclusively by Paranoia (`Lil_Doubt_Hawk`) to enforce the independent
auditor line — see command chain in `shield_personas.yml`.

## Compiled form (future work — P3 #12)

The compiler will emit, per Hawk:

1. A Rust enum `HawkAction` reflecting the permitted tool-calls
2. A Rust function `fn validate(invocation: &Invocation) -> Result<(), Denial>`
   whose body is the union of all prohibition predicates
3. Kani harnesses asserting each `kani_properties` entry holds for all
   inputs
4. Prusti annotations asserting each `prusti_invariants` entry

Kani CI will reject builds where any property cannot be discharged.

## Adding a new Hawk

1. Ensure the Hawk exists in `shield_personas.yml`
2. If the Hawk's prohibitions are fully covered by its squad file,
   **do not create a file**. Squad inheritance is sufficient.
3. If there are persona-specific deltas, create `hawks/<Lil_X_Hawk>.yml`
4. Run the CI linter (not yet implemented, P3 #12) — it validates:
   - `id` matches file name
   - `squad` matches `shield_personas.yml`
   - All prohibitions reduce to structural predicates (no free-text patterns)
   - No prohibition attempts to relax an inherited one

## Coverage note — 2026-04-17

Of the 32 Hawks, 5 are landed with persona-specific files in this first
pass because they have genuine non-squad deltas:

- `Lil_Scope_Hawk` (Reaper) — real-vs-simulated exfiltration boundary
- `Lil_Seal_Hawk` (Privacy) — formally verified kernel membership
- `Lil_Mast_Hawk` (Halo) — SAT co-sign authority
- `Lil_Doubt_Hawk` (Paranoia) — commander prohibition on Crypt_Ang
- `Lil_Peel_Hawk` (Hex) — owns all formal verification

The other 27 Hawks operate within pure squad profiles and do not need
per-Hawk files at this time. If operational experience surfaces a delta,
add the file then.
