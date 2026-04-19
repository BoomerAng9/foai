//! Universal base — applies to every Shield Division Hawk.
//!
//! Compiled from `config/shield/universal_base.yml`. Do not edit by
//! hand; edit the YAML and regenerate via `scripts/compile-shield-policy.py`.

use crate::types::{Denial, Invocation, RiskLevel};
use crate::generated::universal_base::{
    UNIVERSAL_BASE_PROHIBITED_TOOL_CALLS,
    UNIVERSAL_BASE_PROHIBITED_REASONING,
    UNIVERSAL_BASE_PROHIBITED_DATA_CLASSES,
    UNIVERSAL_BASE_PROHIBITED_TARGET_PREFIXES,
};

/// Enforces universal_base.yml — the floor that every Hawk must clear
/// before squad and per-Hawk validation runs. Prohibition DATA is
/// imported from the generated module; imperative runtime checks
/// (SLCT liveness, CIA-for-high-risk) stay hand-written.
pub fn universal_base_validate(inv: &Invocation) -> Result<(), Denial> {
    // Data-list prohibitions (consumed from generated module)
    if UNIVERSAL_BASE_PROHIBITED_TOOL_CALLS.contains(&inv.tool_id) {
        return Err(Denial::ProhibitedToolCall(inv.tool_id));
    }
    for p in inv.reasoning_paths {
        if UNIVERSAL_BASE_PROHIBITED_REASONING.contains(p) {
            return Err(Denial::ProhibitedReasoningPath(*p));
        }
    }
    for d in inv.data_classes {
        if UNIVERSAL_BASE_PROHIBITED_DATA_CLASSES.contains(d) {
            return Err(Denial::ProhibitedDataClass(*d));
        }
    }

    // Target prefix-match — the YAML `/foo/**` globs get translated to
    // `/foo/` prefixes by `_glob_to_prefix()` in the generator, so
    // starts_with() is the correct runtime predicate. Complex globs
    // with `*` in the middle (e.g. `/tenants/*/infra/**`) are flagged
    // in generated/*.rs as comments and still need hand-written logic
    // in the squad validators that consume them — none apply at the
    // universal layer.
    for t in UNIVERSAL_BASE_PROHIBITED_TARGET_PREFIXES {
        if inv.target_namespace.starts_with(t) {
            return Err(Denial::ProhibitedTarget(t));
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
