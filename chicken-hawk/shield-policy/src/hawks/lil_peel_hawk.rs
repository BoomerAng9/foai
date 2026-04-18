//! Hex — Lil_Peel_Hawk — formal verifier, owns the 5 kernel components
//! Generated from config/shield/hawks/Lil_Peel_Hawk.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    const PROHIBITED: &[&str] = &[
        "build.release_without_kani_green",
        "build.release_without_prusti_green",
        "build.skip_cross_substrate_reproducibility_check",
        "verify.modify_verified_code_without_reverify",
        "verify.weaken_property_to_discharge",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if matches!(p,
            ReasoningPath::TrustTestsOverProof
            | ReasoningPath::PartialVerificationAcceptable)
        {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    if inv.target_namespace.starts_with("/kernel/") {
        // Kernel namespace is write-gated by Kani+Prusti green.
        // Runtime does not know the build-state; the generator marks
        // this as an integration point — the Spinner dispatcher must
        // attach `build_verified: bool` on the invocation for kernel
        // writes. For now, refuse all writes with a specific denial.
        return Err(Denial::ProhibitedTarget("/kernel/"));
    }

    Ok(())
}
