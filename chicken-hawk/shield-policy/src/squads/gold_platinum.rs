//! Gold & Platinum Squad — "The Soul & Core"
//! Generated from config/shield/squads/gold_platinum.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    const PROHIBITED: &[&str] = &[
        "operate.without_halo_cosign",
        "sat.accept_from_crypt_ang",
        "trust.unattested_component",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if matches!(p,
            ReasoningPath::TrustWithoutAttestation
            | ReasoningPath::CryptAngSatAcceptance)
        {
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
