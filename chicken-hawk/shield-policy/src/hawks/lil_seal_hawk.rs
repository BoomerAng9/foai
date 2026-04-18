//! Privacy — Lil_Seal_Hawk — formally verified kernel component
//! Hand-written imperative logic; prohibition tables from generated::lil_seal_hawk.

use crate::types::*;
use crate::generated::lil_seal_hawk::{
    LIL_SEAL_HAWK_PROHIBITED_TOOL_CALLS,
    LIL_SEAL_HAWK_PROHIBITED_REASONING,
    LIL_SEAL_HAWK_PROHIBITED_DATA_CLASSES,
};

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    if LIL_SEAL_HAWK_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }
    for p in inv.reasoning_paths {
        if LIL_SEAL_HAWK_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }
    for d in inv.data_classes {
        if LIL_SEAL_HAWK_PROHIBITED_DATA_CLASSES.contains(d) {
            return Err(Denial::ProhibitedDataClass(*d));
        }
    }
    Ok(())
}
