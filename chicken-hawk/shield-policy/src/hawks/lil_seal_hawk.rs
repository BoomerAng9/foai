//! Privacy — Lil_Seal_Hawk — formally verified kernel component
//! Generated from config/shield/hawks/Lil_Seal_Hawk.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    const PROHIBITED: &[&str] = &[
        "redaction.emit_unredacted_above_tenant_edge",
        "redaction.share_identifier_across_tenant",
        "unseal.raw_without_controller_approval",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if *p == ReasoningPath::AcceptablePiiLeakForUtility {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    for d in inv.data_classes {
        if matches!(d, DataClass::UnredactedPii | DataClass::UnredactedPhi) {
            return Err(Denial::ProhibitedDataClass(*d));
        }
    }

    Ok(())
}
