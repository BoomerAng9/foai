//! Halo — Lil_Mast_Hawk — Gold & Platinum Squad Lead, SAT co-signer
//! Generated from config/shield/hawks/Lil_Mast_Hawk.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    const PROHIBITED: &[&str] = &[
        "cosign.delegate_authority",
        "cosign.batch_without_per_plan_verification",
        "cosign.accept_invalid_plan_signature",
        "cosign.self_issued",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
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
