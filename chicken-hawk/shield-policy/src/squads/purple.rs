//! Purple Squad — "The Nervous System"
//! Hand-written imperative logic; prohibition tables from generated::purple.

use crate::types::*;
use crate::generated::purple::{
    PURPLE_PROHIBITED_TOOL_CALLS,
    PURPLE_PROHIBITED_REASONING,
    PURPLE_PROHIBITED_DATA_CLASSES,
};

pub fn validate<'a>(inv: &Invocation<'a>) -> Result<(), Denial<'a>> {
    if PURPLE_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }
    for p in inv.reasoning_paths {
        if PURPLE_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }
    for d in inv.data_classes {
        if PURPLE_PROHIBITED_DATA_CLASSES.contains(d) {
            return Err(Denial::ProhibitedDataClass(*d));
        }
    }
    Ok(())
}
