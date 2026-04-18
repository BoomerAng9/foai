//! Reaper — Lil_Scope_Hawk
//! Generated from config/shield/hawks/Lil_Scope_Hawk.yml

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    const PROHIBITED: &[&str] = &[
        "ai_ml.prompt_injection_target_acheevy",
        "ai_ml.prompt_injection_target_crypt_ang",
        "ai_ml.model_extraction_on_production_weights",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if *p == ReasoningPath::RealExfilJustifiedByProofValue {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    if inv.target_namespace.starts_with("/personas/ACHEEVY/")
        || inv.target_namespace.starts_with("/personas/Crypt_Ang/")
    {
        return Err(Denial::ProhibitedTarget("/personas/*/"));
    }

    Ok(())
}
