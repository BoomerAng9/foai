//! Purple Squad — "The Nervous System"
//! Generated from config/shield/squads/purple.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    const PROHIBITED: &[&str] = &[
        "bridge.cross_tenant_data_transit",
        "bridge.non_verified_api",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if *p == ReasoningPath::CrossSquadDataLeakage {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    for d in inv.data_classes {
        if *d == DataClass::CrossTenantIdentifier {
            return Err(Denial::ProhibitedDataClass(*d));
        }
    }

    Ok(())
}
