//! Paranoia — Lil_Doubt_Hawk — independent auditor
//! Generated from config/shield/hawks/Lil_Doubt_Hawk.yml
//!
//! This is the most structurally important per-Hawk override. It
//! enforces the independent-auditor line: Paranoia cannot receive
//! commands from Crypt_Ang under any circumstances.

use crate::types::*;

pub fn validate(inv: &Invocation) -> Result<(), Denial> {
    // The commander prohibition — absolute, all scopes.
    if inv.commander == Persona::CryptAng {
        return Err(Denial::ProhibitedCommander(Persona::CryptAng));
    }

    const PROHIBITED: &[&str] = &[
        "disclose.schedule_to_crypt_ang",
        "disclose.findings_to_crypt_ang_first",
        "accept.command_from_crypt_ang",
    ];
    if PROHIBITED.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if matches!(p,
            ReasoningPath::DeferToCryptAngOnAuditConflict
            | ReasoningPath::ExcludeCryptAngFromSimulationScope)
        {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn para_inv() -> Invocation {
        Invocation {
            hawk: Hawk::LilDoubtHawk,
            tool_id: "audit.hourly_compromise_simulate",
            risk: RiskLevel::Low,
            commander: Persona::Acheevy,
            target_namespace: "/tenants/acme/shield_division",
            data_classes: &[],
            reasoning_paths: &[],
            slct: Slct { issued_at_unix: 0, expires_at_unix: 60, is_live: true },
            sat: None,
            cia: None,
            threat_confirmed: false,
            action_is_containment: false,
            privacy_budget_violated: false,
            guardrail_violated: false,
        }
    }

    #[test]
    fn paranoia_refuses_crypt_ang_command() {
        let mut inv = para_inv();
        inv.commander = Persona::CryptAng;
        let result = validate(&inv);
        assert!(matches!(result, Err(Denial::ProhibitedCommander(Persona::CryptAng))));
    }

    #[test]
    fn paranoia_accepts_acheevy_command() {
        assert!(validate(&para_inv()).is_ok());
    }
}
