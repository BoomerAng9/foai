//! Blue Squad — "The Immune System"
//! Hand-written imperative logic; prohibition tables from generated::blue.

use crate::types::*;
use crate::generated::blue::{
    BLUE_PROHIBITED_TOOL_CALLS,
    BLUE_PROHIBITED_REASONING,
};

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    // Squad constraint: containment priority over detection (imperative)
    if inv.threat_confirmed && !inv.action_is_containment {
        return Err(Denial::DetectionOverIsolation);
    }

    if BLUE_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if BLUE_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    Ok(())
}
