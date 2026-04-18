//! Reaper — Lil_Scope_Hawk
//! Hand-written imperative logic; prohibition tables from generated::lil_scope_hawk.

use crate::types::*;
use crate::generated::lil_scope_hawk::{
    LIL_SCOPE_HAWK_PROHIBITED_TOOL_CALLS,
    LIL_SCOPE_HAWK_PROHIBITED_REASONING,
};

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    if LIL_SCOPE_HAWK_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }
    for p in inv.reasoning_paths {
        if LIL_SCOPE_HAWK_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    if inv.target_namespace.starts_with("/personas/ACHEEVY/")
        || inv.target_namespace.starts_with("/personas/Crypt_Ang/")
    {
        return Err(Denial::ProhibitedTarget("/personas/*/"));
    }

    Ok(())
}
