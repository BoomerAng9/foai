# Spinner wire-format schema (P0 Phase A)

This directory holds the contract that both the Python legacy Spinner
(`../shield_policy_client.py`) and the new Rust runtime agree on. It
is the **migration interface** — a progressive Python→Rust cutover
runs through this schema, not around it.

Phase A step 1 scope: **schema only, no runtime change**. The Rust
consumer (a deserialize/validate/re-serialize adapter in the
`shield-policy` crate or a sibling crate) and the Python adapter
(`shield_policy_client` serialization helpers) both land in later
PRs per the sequencing in [`../RUST_REWRITE_PLAN.md`](../RUST_REWRITE_PLAN.md).

## Decision record — Protobuf over Cap'n Proto

The P0 plan left the choice open. Decision: **Protocol Buffers 3**.

| Axis | Protobuf | Cap'n Proto | Winner |
|---|---|---|---|
| Rust ecosystem | `prost` — async/tokio native, used by tonic, mature | `capnp` — usable, smaller community | Protobuf |
| Python bindings | `protobuf` pkg + `mypy-protobuf` → fully typed stubs | `pycapnp` works but typing story is rough | Protobuf |
| WASM third target | `prost` compiles clean to `wasm32-unknown-unknown` | `capnp` Rust → WASM works, no audited path | Protobuf |
| Schema evolution | Field-number reservation is the design center; tag renumbering is a compile error | Requires cap'n-specific evolution discipline; weaker tooling | Protobuf |
| Wire size (Invocation ~200 B serialized) | Compact varint encoding | Smaller with packed scalars | Cap'n |
| Zero-copy read | No | Yes | Cap'n |
| `oneof` for Rust tagged enums (like `Denial`) | First-class, ergonomic | Unions work but codegen is awkward across langs | Protobuf |

The only real win for Cap'n Proto is zero-copy read. Not load-bearing
here — Invocation records are <500 bytes, below the latency floor
where zero-copy pays off. Everything else tips to Protobuf, especially
Rust tagged-enum ergonomics, which the `Denial` type depends on
heavily (14 variants, 5 with payloads).

## Schema versioning

- Package: `deploy.spinner.shield.v1`.
- **Additive changes** (new optional fields, enum values appended at
  the end) stay on `v1`. Readers encountering unknown fields MUST
  ignore them per proto3 semantics; no action needed.
- **Breaking changes** (field removal, type change, renumber, enum
  reordering) bump the package to `v2` and live alongside `v1`
  until every caller migrates. Both packages coexist in-tree during
  transition — no flag day.
- Every enum has an `UNSPECIFIED = 0` sentinel. Rust deserializer
  treats UNSPECIFIED for required enum fields as a decode error
  (misuse bug, not a wire-format bug).

## What's in `invocation.proto`

| Message | Mirrors Rust? | Notes |
|---|---|---|
| `Invocation` | `chicken-hawk/shield-policy/src/types.rs::Invocation` | Every field typed; no string escape hatches. `Slct`/`Sat`/`CiaProof`/`Payload` are sub-messages. |
| `Slct`, `Sat`, `CiaProof`, `Payload` | Yes | `Sat`'s optional fields use explicit `has_*` booleans so `prost`-generated Rust stays boilerplate-free (no Option<T> around enums). |
| `Persona` | Yes, including the `Hawk(Hawk)` variant | Modeled as oneof of `FlatPersona` enum + `Hawk` enum. |
| `Denial` | Yes | oneof of 14 variants. Unit variants use a `DenialUnit {}` marker for codegen uniformity. |
| `Decision` | NEW in wire | `oneof { Pass | Denial }`. Avoids a sentinel Denial for the pass case. |
| `AuditEntry` | **NEW** — proposal | Chain-linked tamper-evident record. See callout in the `.proto`. Wires to sec_audit in a later PR (v1.6 §4.4 Audit Loop). |

## What's NOT in this PR

- `prost` crate scaffolding in `shield-policy` (Phase A step 2).
- Python adapter layer on `shield_policy_client.py` (Phase A step 2).
- `build.rs` calling `protoc` (Phase A step 2).
- Any runtime behaviour change (that's Phase B).

## How to regenerate bindings (for future PRs)

### Rust (`prost` / `prost-build`)

```rust
// build.rs for the consuming crate
fn main() {
    prost_build::Config::new()
        .out_dir("src/generated")
        .compile_protos(
            &["../../runtime/spinner/schema/invocation.proto"],
            &["../../runtime/spinner/schema/"],
        )
        .expect("protoc must be on PATH");
}
```

### Python (`grpcio-tools`)

```bash
python -m grpc_tools.protoc \
  --proto_path=runtime/spinner/schema \
  --python_out=runtime/spinner/_wire \
  --mypy_out=runtime/spinner/_wire \
  runtime/spinner/schema/invocation.proto
```

The `_wire` directory (prefix underscore) is reserved for generated
Python output and should be gitignored by the Phase A step 2 PR.

## Source-of-truth discipline

Any schema change MUST be reviewed against BOTH:

1. `chicken-hawk/shield-policy/src/types.rs` — canonical Rust types
2. `runtime/spinner/shield_policy_client.py` — Python mirror

If the three ever disagree, the Rust file wins (it's the verified
boundary). This directory's `.proto` is derived from it.

## AuditEntry proposal note

`AuditEntry` is the only message in this schema not mirrored from an
existing Rust or Python type. It is a Phase-A design proposal for the
shape the sec_audit chain will consume. Reviewers: please confirm
the `prev_hash`/`this_hash`/`build_content_hash`/`substrate` quartet
meets v1.6 §4.4 Audit Loop requirements before the Phase B audit-loop
PR consumes it. If the shape needs to change, do it here before
bindings land.
