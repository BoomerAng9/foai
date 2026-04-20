//! Paranoia — Lil_Doubt_Hawk — independent auditor
//! Hand-written imperative logic; prohibition tables from generated::lil_doubt_hawk.
//!
//! This is the most structurally important per-Hawk override. It
//! enforces the independent-auditor line: Paranoia cannot receive
//! commands from Crypt_Ang under any circumstances. The commander
//! check runs BEFORE the generated tool_id list so the governance
//! intent (refuse Crypt_Ang, period) is evaluated first.

use crate::types::*;
use crate::generated::lil_doubt_hawk::{
    LIL_DOUBT_HAWK_PROHIBITED_TOOL_CALLS,
    LIL_DOUBT_HAWK_PROHIBITED_REASONING,
    LIL_DOUBT_HAWK_PROHIBITED_COMMANDERS,
};

pub fn validate<'a>(inv: &Invocation<'a>) -> Result<(), Denial<'a>> {
    // The commander prohibition — absolute, all scopes. Runs first so
    // the independent-auditor guarantee doesn't depend on tool_id.
    if LIL_DOUBT_HAWK_PROHIBITED_COMMANDERS.contains(&inv.commander) {
        return Err(Denial::ProhibitedCommander(inv.commander));
    }

    if LIL_DOUBT_HAWK_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    for p in inv.reasoning_paths {
        if LIL_DOUBT_HAWK_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn para_inv() -> Invocation<'static> {
        Invocation {
            hawk: Hawk::LilDoubtHawk,
            tool_id: "audit.hourly_compromise_simulate",
            tool_class: ToolClass::Unknown,
            risk: RiskLevel::Low,
            commander: Persona::Acheevy,
            target_namespace: "/tenants/acme/shield_division",
            data_classes: &[],
            reasoning_paths: &[],
            slct: Slct { issued_at_unix: 0, expires_at_unix: 60, is_live: true },
            sat: None,
            cia: None,
            payload: None,
            crosses_tenant: false,
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
