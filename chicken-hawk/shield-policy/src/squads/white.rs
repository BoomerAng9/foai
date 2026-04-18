//! White Squad — "The Conscience & Law"
//! Hand-written imperative logic; prohibition tables from generated::white.

use crate::types::*;
use crate::generated::white::{
    WHITE_PROHIBITED_TOOL_CALLS,
    WHITE_PROHIBITED_REASONING,
};

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    // Squad constraint: halt on privacy-budget or guardrail violation
    if inv.privacy_budget_violated {
        return Err(Denial::PrivacyBudgetViolation);
    }
    if inv.guardrail_violated {
        return Err(Denial::GuardrailViolation);
    }

    if WHITE_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if WHITE_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    // Enforcement actions require SAT
    if inv.tool_id.starts_with("enforce.") {
        match &inv.sat {
            Some(sat) if sat.valid() => {}
            _ => return Err(Denial::SatRequired),
        }
    }

    Ok(())
}
