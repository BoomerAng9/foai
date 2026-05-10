//! Halo — Lil_Mast_Hawk — Gold & Platinum Squad Lead, SAT co-signer
//! Hand-written imperative logic; prohibition tables from generated::lil_mast_hawk.

use crate::types::*;
use crate::generated::lil_mast_hawk::LIL_MAST_HAWK_PROHIBITED_TOOL_CALLS;

pub fn validate<'a>(inv: &Invocation<'a>) -> Result<(), Denial<'a>> {
    if LIL_MAST_HAWK_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    // No self-cosign: if Halo is invoking AND the SAT's invoking Hawk
    // is also Halo, refuse (per YAML invariant).
    if inv.hawk == Hawk::LilMastHawk && inv.tool_id == "cosign.gold_sat" {
        if let Some(sat) = &inv.sat {
            if sat.co_signer == Some(Hawk::LilMastHawk) {
                return Err(Denial::ProhibitedToolCall("cosign.self_issued"));
            }
        }
    }

    Ok(())
}
