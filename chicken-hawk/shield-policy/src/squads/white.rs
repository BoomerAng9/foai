//! White Squad — "The Conscience & Law"
//! Generated from config/shield/squads/white.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    // Squad constraint: halt on privacy-budget or guardrail violation
    if inv.privacy_budget_violated {
        return Err(Denial::PrivacyBudgetViolation);
    }
    if inv.guardrail_violated {
        return Err(Denial::GuardrailViolation);
    }

    const PROHIBITED: &[&str] = &[
        "proceed.under_budget_violation",
        "proceed.under_guardrail_violation",
        "enforce.without_sat",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if matches!(p,
            ReasoningPath::BudgetViolationOverride
            | ReasoningPath::GuardrailViolationOverride)
        {
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
