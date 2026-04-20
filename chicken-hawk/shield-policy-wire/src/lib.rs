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
//! - Wire → kernel conversion via [`owned::OwnedInvocation`] which owns
//!   the deserialized backing and lends a borrowed `Invocation<'_>` view
//!   into the kernel's generic lifetime-parameterized types.
//!
//! # Kernel → wire example
//!
//! ```no_run
//! use prost::Message;
//! use shield_policy::types as k;
//! use shield_policy_wire::convert::invocation_to_wire;
//!
//! # fn example(inv: &k::Invocation<'_>) -> Vec<u8> {
//! let wire = invocation_to_wire(inv);
//! let mut buf = Vec::with_capacity(wire.encoded_len());
//! wire.encode(&mut buf).expect("encode cannot fail on Vec");
//! buf
//! # }
//! ```
//!
//! # Wire → kernel example (Spinner sidecar hot path)
//!
//! ```no_run
//! use prost::Message;
//! use shield_policy_wire::{generated as w, owned::OwnedInvocation};
//!
//! # fn example(bytes: &[u8]) -> Result<(), Box<dyn std::error::Error>> {
//! let wire = w::Invocation::decode(bytes)?;
//! let owned = OwnedInvocation::try_from_wire(&wire)?;
//! let inv = owned.as_borrowed();
//! // Kernel validate() sees a standard Invocation<'_>, no lifetime leak.
//! let decision = shield_policy::validate(&inv);
//! # let _ = decision; Ok(()) }
//! ```

#![forbid(unsafe_code)]

pub mod generated;
pub mod convert;
pub mod owned;

// Re-export the wire types at the crate root for ergonomic use.
pub use generated::{
    AuditEntry, CiaProof, DataClass, Decision, Denial, DenialUnit, FlatPersona, Hawk, Invocation,
    Pass, Payload, Persona, ProhibitedCommander, ProhibitedDataClass, ProhibitedReasoningPath,
    ProhibitedTarget, ProhibitedToolCall, ReasoningPath, RiskLevel, Sat, Slct, Substrate,
    ToolClass,
};
