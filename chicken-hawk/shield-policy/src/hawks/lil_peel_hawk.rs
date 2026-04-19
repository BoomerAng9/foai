//! Hex — Lil_Peel_Hawk — formal verifier, owns the 5 kernel components
//! Hand-written imperative logic; prohibition tables from generated::lil_peel_hawk.

use crate::types::*;
use crate::generated::lil_peel_hawk::{
    LIL_PEEL_HAWK_PROHIBITED_TOOL_CALLS,
    LIL_PEEL_HAWK_PROHIBITED_REASONING,
};

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    if LIL_PEEL_HAWK_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }
    for p in inv.reasoning_paths {
        if LIL_PEEL_HAWK_PROHIBITED_REASONING.contains(p) {
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
