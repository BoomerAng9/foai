//! Universal base — applies to every Shield Division Hawk.
//!
//! Compiled from `config/shield/universal_base.yml`. Do not edit by
//! hand; edit the YAML and regenerate via `scripts/compile-shield-policy.py`.

use crate::types::{
    Denial, Invocation, ReasoningPath, RiskLevel, DataClass,
};

/// Enforces universal_base.yml — the floor that every Hawk must clear
/// before squad and per-Hawk validation runs.
pub fn universal_base_validate(inv: &Invocation) -> Result<(), Denial> {
    // ── prohibitions.tool_calls ────────────────────────────────────
    const PROHIBITED_TOOL_CALLS: &[&str] = &[
        "spinner.bypass_consensus",
        "spinner.disable_policy_engine",
        "vault.exfiltrate_root_key",
        "sec_audit.append_backdated",
        "sec_audit.truncate",
        "identity.impersonate_other_hawk",
        "phoenix.skip_rebirth",
    ];
    if PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }

    // ── prohibitions.reasoning_paths ───────────────────────────────
    const PROHIBITED_REASONING: &[ReasoningPath] = &[
        ReasoningPath::BypassCia,
        ReasoningPath::BypassSlct,
        ReasoningPath::BypassPrivacyBudget,
        ReasoningPath::DowngradeConsensus,
        ReasoningPath::StaleMerkleAccept,
    ];
    for p in inv.reasoning_paths {
        if PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }

    // ── prohibitions.targets ───────────────────────────────────────
    const PROHIBITED_TARGETS: &[&str] = &[
        "/sec_audit/",
        "/vault/root_keys/",
        "/spinner/policy_engine/",
    ];
    for t in PROHIBITED_TARGETS {
        if inv.target_namespace.starts_with(t) {
            return Err(Denial::ProhibitedTarget(t));
        }
    }

    // ── prohibitions.data_classes ──────────────────────────────────
    const PROHIBITED_DATA: &[DataClass] = &[
        DataClass::RootKeyMaterial,
        DataClass::CanarySat,
    ];
    for d in inv.data_classes {
        if PROHIBITED_DATA.contains(d) {
            return Err(Denial::ProhibitedDataClass(*d));
        }
    }

    // ── Kani-property-level checks (runtime equivalents) ───────────
    if !inv.slct.is_live() {
        return Err(Denial::SlctNotLive);
    }
    if inv.risk == RiskLevel::High {
        match &inv.cia {
            Some(c) if c.valid() => {}
            _ => return Err(Denial::CiaRequired),
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::types::*;

    fn base_inv() -> Invocation {
        Invocation {
            hawk: Hawk::LilWatchHawk,
            tool_id: "hunt.execute",
            risk: RiskLevel::Low,
            commander: Persona::Acheevy,
            target_namespace: "/tenants/acme/workloads/api",
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
    fn universal_rejects_bypass_consensus() {
        let mut inv = base_inv();
        inv.tool_id = "spinner.bypass_consensus";
        assert!(matches!(universal_base_validate(&inv), Err(Denial::ProhibitedToolCall(_))));
    }

    #[test]
    fn universal_rejects_high_risk_without_cia() {
        let mut inv = base_inv();
        inv.risk = RiskLevel::High;
        assert!(matches!(universal_base_validate(&inv), Err(Denial::CiaRequired)));
    }

    #[test]
    fn universal_rejects_dead_slct() {
        let mut inv = base_inv();
        inv.slct.is_live = false;
        assert!(matches!(universal_base_validate(&inv), Err(Denial::SlctNotLive)));
    }

    #[test]
    fn universal_passes_clean_low_risk() {
        assert!(universal_base_validate(&base_inv()).is_ok());
    }
}
