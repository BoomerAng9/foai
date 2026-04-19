//! ACHIEVEMOR Shield Division — Policy Enforcement Kernel
//!
//! This crate compiles the Semantic Constraint Profiles from
//! `config/shield/*.yml` into Rust code that:
//!
//! 1. Runs at runtime inside the Spinner policy engine, refusing any
//!    invocation that violates the union of prohibitions from
//!    universal_base → squad → per-Hawk override.
//!
//! 2. Exposes Kani harnesses (`#[cfg(feature = "kani")]`) that prove
//!    each `kani_properties` entry holds for all inputs.
//!
//! 3. Exposes Prusti invariants that the external prusti-rustc tool
//!    can verify.
//!
//! The code in `squads/` and `hawks/` is **generated** by
//! `scripts/compile-shield-policy.py`. Do not edit generated files
//! by hand; edit the YAML and regenerate.

#![cfg_attr(feature = "kani", allow(dead_code))]

pub mod types;
pub mod kernel;
pub mod cia;
pub mod squads;
pub mod hawks;

/// Generated prohibition tables, compiled from `config/shield/*.yml`
/// via `chicken-hawk/scripts/compile-shield-policy.py`. The hand-written
/// squad/Hawk modules will consume these constants after the v0.2
/// refactor (currently the hand-written Rust keeps its local `const`
/// lists; the generated tables are a parallel source of truth that
/// `--check` mode validates against).
pub mod generated;

#[cfg(feature = "kani")]
pub mod kani_harnesses;

pub use kernel::universal_base_validate;
pub use types::{Denial, Invocation, Hawk, Squad, RiskLevel};

/// Top-level validator. The Spinner policy engine calls this on every
/// invocation before execution. Returns `Ok(())` if the invocation
/// passes the union of universal_base, squad, and per-Hawk prohibitions;
/// returns `Err(Denial)` otherwise.
///
/// The contract is monotonic: adding a new prohibition at any layer
/// can only produce more `Err` results, never fewer.
pub fn validate(invocation: &Invocation) -> Result<(), Denial> {
    // Universal base applies to every Hawk.
    kernel::universal_base_validate(invocation)?;

    // Squad validation — dispatched by squad enum.
    match invocation.hawk.squad() {
        Squad::Black => squads::black::validate(invocation)?,
        Squad::Blue => squads::blue::validate(invocation)?,
        Squad::Purple => squads::purple::validate(invocation)?,
        Squad::White => squads::white::validate(invocation)?,
        Squad::GoldPlatinum => squads::gold_platinum::validate(invocation)?,
    }

    // Per-Hawk override — only Hawks with landed override files are
    // checked here; others fall through. Missing override is the
    // default, not an error (per SCHEMA.md).
    match invocation.hawk {
        Hawk::LilScopeHawk => hawks::lil_scope_hawk::validate(invocation)?,
        Hawk::LilSealHawk => hawks::lil_seal_hawk::validate(invocation)?,
        Hawk::LilMastHawk => hawks::lil_mast_hawk::validate(invocation)?,
        Hawk::LilDoubtHawk => hawks::lil_doubt_hawk::validate(invocation)?,
        Hawk::LilPeelHawk => hawks::lil_peel_hawk::validate(invocation)?,
        _ => {} // Squad-only, no override
    }

    Ok(())
}
