//! ACHIEVEMOR Shield Division — Protobuf wire format.
//!
//! Phase A step 2 of the P0 Rust rewrite plan. This crate materializes
//! `runtime/spinner/schema/invocation.proto` as Rust types compatible
//! with `prost`, plus a one-way conversion from the kernel's
//! `shield_policy::Invocation` to the wire format.
//!
//! # Scope
//!
//! - Wire types mirror `deploy.spinner.shield.v1` exactly.
//! - Serialization via `prost::Message::encode_to_vec()`.
//! - Deserialization via `prost::Message::decode(&[u8])` on a `Vec<u8>`.
//! - Kernel → wire conversion in [`convert`].
//!
//! The reverse direction (wire → kernel `Invocation`) is deferred to
//! Phase B because the kernel's `Invocation` struct uses `&'static str`
//! lifetimes that cannot be populated from wire-owned strings without
//! a lifetime refactor of the kernel crate. The Cloud Run sidecar
//! introduced in Phase B will own its deserialized strings and pass
//! references into `validate()` at call time.
//!
//! # Example
//!
//! ```no_run
//! use prost::Message;
//! use shield_policy::types as k;
//! use shield_policy_wire::convert::invocation_to_wire;
//!
//! # fn example(inv: &k::Invocation) -> Vec<u8> {
//! let wire = invocation_to_wire(inv);
//! let mut buf = Vec::with_capacity(wire.encoded_len());
//! wire.encode(&mut buf).expect("encode cannot fail on Vec");
//! buf
//! # }
//! ```

#![forbid(unsafe_code)]

pub mod generated;
pub mod convert;

// Re-export the wire types at the crate root for ergonomic use.
pub use generated::{
    AuditEntry, CiaProof, DataClass, Decision, Denial, DenialUnit, FlatPersona, Hawk, Invocation,
    Pass, Payload, Persona, ProhibitedCommander, ProhibitedDataClass, ProhibitedReasoningPath,
    ProhibitedTarget, ProhibitedToolCall, ReasoningPath, RiskLevel, Sat, Slct, Substrate,
    ToolClass,
};
