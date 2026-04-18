//! Gold & Platinum Squad — "The Soul & Core"
//! Hand-written imperative logic; prohibition tables from generated::gold_platinum.

use crate::types::*;
use crate::generated::gold_platinum::{
    GOLD_PLATINUM_PROHIBITED_TOOL_CALLS,
    GOLD_PLATINUM_PROHIBITED_REASONING,
};

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    if GOLD_PLATINUM_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if GOLD_PLATINUM_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    // Gold & Platinum commander prohibition: Crypt_Ang cannot issue SAT
    // for this squad. This is the STRUCTURAL bar referenced in v1.6 §1.6.
    if let Some(sat) = &inv.sat {
        if sat.issuer == Persona::CryptAng {
            return Err(Denial::CryptAngBarredFromGoldSat);
        }
    }

    // Gold ops require Halo co-sign (unless this IS Halo acting alone).
    // The hawks::lil_mast_hawk::validate override handles the self-exception.
    if inv.hawk != Hawk::LilMastHawk {
        match &inv.sat {
            Some(sat) if sat.co_signer == Some(Hawk::LilMastHawk) => {}
            _ => return Err(Denial::CoSignRequired),
        }
    }

    Ok(())
}
