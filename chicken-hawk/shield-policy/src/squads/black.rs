//! Black Squad — "The Kinetic Hammer"
//! Generated from config/shield/squads/black.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    // prohibitions.tool_calls
    const PROHIBITED: &[&str] = &[
        "exfil.real_data_egress",
        "kinetic.execute_without_sat",
        "kinetic.execute_without_target_tenant",
        "persistence.install_beyond_mission_ttl",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    // prohibitions.reasoning_paths
    for p in inv.reasoning_paths {
        if *p == ReasoningPath::ScopeCreepFromSat {
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
