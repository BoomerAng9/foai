//! Black Squad — "The Kinetic Hammer"
//! Hand-written imperative logic; prohibition tables imported from
//! the generated::black module (compiled from config/shield/squads/black.yml).

use crate::types::*;
use crate::generated::black::{
    BLACK_PROHIBITED_TOOL_CALLS,
    BLACK_PROHIBITED_REASONING,
};

pub fn validate<'a>(inv: &Invocation<'a>) -> Result<(), Denial<'a>> {
    if BLACK_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if BLACK_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    // prohibitions.targets
    const PROHIBITED_NS: &[&str] = &[
        "/tenants/",                  // + check gold_platinum_infra suffix
        "/production/",               // + check live_customers suffix
    ];
    for ns in PROHIBITED_NS {
        if inv.target_namespace.starts_with(ns)
            && (inv.target_namespace.contains("gold_platinum_infra")
                || inv.target_namespace.contains("live_customers"))
        {
            return Err(Denial::ProhibitedTarget(*ns));
        }
    }

    // Squad constraint: SAT required + confirmed target-tenant ID
    match &inv.sat {
        Some(sat) if sat.valid() && sat.target_tenant_id.is_some() => {}
        _ => return Err(Denial::SatRequired),
    }

    Ok(())
}
