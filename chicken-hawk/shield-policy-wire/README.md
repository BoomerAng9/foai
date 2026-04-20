# shield-policy-wire

Protobuf wire format for Shield Division policy enforcement. Phase A step 2
of the Spinner Rust rewrite plan (`runtime/spinner/RUST_REWRITE_PLAN.md`).

This crate materializes `runtime/spinner/schema/invocation.proto` as Rust
types + `prost` derive macros, plus one-way conversion from the kernel's
`shield_policy::Invocation` to the wire format. It is a separate crate from
`shield-policy` so the kernel's `[dependencies]` list stays auditable
(the kernel's own `Cargo.toml` states: *"Keep dependencies minimal — the
kernel must be auditable"*).

## Layout

```
shield-policy-wire/
├── Cargo.toml               # prost + shield-policy deps only
├── README.md
├── regenerate.sh            # developer-run; overwrites src/generated/mod.rs
├── src/
│   ├── lib.rs               # public API + re-exports
│   ├── convert.rs           # kernel → wire conversion
│   └── generated/
│       └── mod.rs           # prost-annotated wire types (COMMITTED)
└── tests/
    └── roundtrip.rs         # 13 round-trip tests
```

## Usage

```rust
use prost::Message;
use shield_policy::types as k;
use shield_policy_wire::convert::invocation_to_wire;

fn encode(inv: &k::Invocation) -> Vec<u8> {
    let wire = invocation_to_wire(inv);
    let mut buf = Vec::with_capacity(wire.encoded_len());
    wire.encode(&mut buf).expect("encode to Vec is infallible");
    buf
}
```

## Scope

**In scope (Phase A step 2, this crate):**

- Wire types mirroring `deploy.spinner.shield.v1` byte-for-byte.
- Encoding via `prost::Message::encode_to_vec()`.
- Decoding via `prost::Message::decode(&[u8])`.
- One-way conversion `shield_policy::Invocation` → `wire::Invocation`.
- Round-trip parity tests (Rust-only + Python ↔ Rust).

**Deferred to Phase B (Cloud Run sidecar):**

- Reverse conversion `wire::Invocation` → `shield_policy::Invocation`.
  Blocked by the kernel crate's `&'static str` / `&'static [T]` lifetime
  choice. The sidecar will own the deserialized strings and pass
  references directly into `validate()` at call time, bypassing the
  need for a kernel-side struct reconstruction.

## Generated code policy

`src/generated/mod.rs` is hand-maintained with prost annotations matching
what `prost-build` 0.14.3 would emit from `invocation.proto`. This choice
mirrors the existing `chicken-hawk/shield-policy/src/generated/` pattern:
**generated code is committed, not rebuilt in CI**.

Benefits:

- No protoc / C toolchain required in Cloud Build (`rust:1-bookworm`
  stays unmodified).
- Windows developers can `cargo check` / `cargo test` without needing
  MinGW (the `protoc-bin-vendored` build-dep chain requires it).
- Wire format is stable and reviewable — schema changes appear as
  reviewable diffs in `src/generated/mod.rs`.

To regenerate after changing `invocation.proto`:

```bash
chicken-hawk/shield-policy-wire/regenerate.sh
```

The script creates a temporary prost-build crate, downloads `protoc` via
`protoc-bin-vendored`, emits the Rust output, and splices it into
`src/generated/mod.rs`. Review the diff against the prior committed
version before committing.

## Verification

```bash
cd chicken-hawk/shield-policy-wire
cargo check
cargo test
```

Cross-language parity with the Python adapter lives at
`runtime/spinner/tests/wire_parity.py` and runs against known byte
fixtures in this crate's `tests/fixtures/` (Phase A step 2 second half).

## Wire format versioning

- Current package: `deploy.spinner.shield.v1`.
- Additive schema changes (new optional fields, enum values appended)
  stay on `v1`.
- Breaking schema changes bump the package (→ `v2`), live alongside `v1`
  until every caller migrates, and drive a new sibling crate
  (`shield-policy-wire-v2`).
- Every enum has an `Unspecified = 0` sentinel. Decoding code treats
  `Unspecified` in a required enum field as a hard error.

## Not included in this crate

- No axum / tonic server (Phase B — `runtime/spinner-policy/`).
- No tokio runtime dependency.
- No async. The wire format is synchronous encode/decode only.

This keeps the crate's dependency footprint small — the only runtime
dep beyond `prost` is `shield-policy` itself.
