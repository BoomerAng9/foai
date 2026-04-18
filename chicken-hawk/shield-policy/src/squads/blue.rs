//! Blue Squad — "The Immune System"
//! Generated from config/shield/squads/blue.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    // Squad constraint: containment priority over detection
    if inv.threat_confirmed && !inv.action_is_containment {
        return Err(Denial::DetectionOverIsolation);
    }

    const PROHIBITED: &[&str] = &[
        "response.delay_containment_for_observation",
        "detection.suppress_alert_without_closure",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if *p == ReasoningPath::DetectionPriorityOverIsolation {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    Ok(())
}
