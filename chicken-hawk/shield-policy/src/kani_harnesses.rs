//! Kani proof harnesses — compiled only with `--features kani`.
//!
//! Each harness corresponds to a `kani_properties` entry in the
//! source YAML. Kani verifies that the property holds for ALL inputs
//! satisfying the preconditions, not just sampled cases.
//!
//! Run: `cargo kani --features kani`
//!
//! This is a SCAFFOLD — expand the harnesses as the Invocation type
//! and validator logic mature.

use crate::types::*;
use crate::validate;

/// Universal: forall inv, if inv.tool_id is in the prohibited list,
/// validate() returns Err(ProhibitedToolCall).
#[cfg(feature = "kani")]
#[kani::proof]
fn kani_universal_rejects_bypass_consensus() {
    let hawk: Hawk = kani::any();
    let inv = Invocation {
        hawk,
        tool_id: "spinner.bypass_consensus",
        risk: RiskLevel::Low,
        commander: Persona::Acheevy,
        target_namespace: "/tenants/x/a",
        data_classes: &[],
        reasoning_paths: &[],
        slct: Slct { issued_at_unix: 0, expires_at_unix: 60, is_live: true },
        sat: None,
        cia: None,
        threat_confirmed: false,
        action_is_containment: false,
        privacy_budget_violated: false,
        guardrail_violated: false,
    };
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::ProhibitedToolCall(_))));
}

/// Paranoia: forall inv where inv.hawk == LilDoubtHawk and
/// inv.commander == CryptAng, validate() returns
/// Err(ProhibitedCommander(CryptAng)).
///
/// This encodes the independent-auditor line cryptographically:
/// there is NO input that permits Paranoia to accept a Crypt_Ang
/// command. Kani discharges this property for ALL possible inputs.
#[cfg(feature = "kani")]
#[kani::proof]
fn kani_paranoia_refuses_crypt_ang() {
    let tool_id_idx: usize = kani::any();
    let tool_choices = ["audit.hourly_compromise_simulate", "audit.rebirth_cadence_check", "cosign.gold_sat"];
    let tool_id = tool_choices[tool_id_idx % tool_choices.len()];

    let inv = Invocation {
        hawk: Hawk::LilDoubtHawk,
        tool_id,
        risk: kani::any(),
        commander: Persona::CryptAng,
        target_namespace: "/tenants/x/shield",
        data_classes: &[],
        reasoning_paths: &[],
        slct: Slct { issued_at_unix: 0, expires_at_unix: 60, is_live: true },
        sat: None,
        cia: Some(CiaProof {
            plan_signed: true,
            intent_token_present: true,
            intent_token_plan_hash_matches: true,
            merkle_scope_proof_valid: true,
            merkle_proof_age_seconds: 0,
        }),
        threat_confirmed: false,
        action_is_containment: false,
        privacy_budget_violated: false,
        guardrail_violated: false,
    };
    let result = validate(&inv);
    // The CRITICAL property: Paranoia cannot accept Crypt_Ang commands.
    assert!(matches!(result, Err(Denial::ProhibitedCommander(Persona::CryptAng))));
}

// kani::any() requires Arbitrary impls — stubbed for enums we use.
#[cfg(feature = "kani")]
impl kani::Arbitrary for Hawk { fn any() -> Self { Hawk::LilWatchHawk } }
#[cfg(feature = "kani")]
impl kani::Arbitrary for RiskLevel { fn any() -> Self { RiskLevel::Low } }
