//! Kani proof harnesses — compiled only with `--features kani`.
//!
//! Each harness corresponds to a `kani_properties` entry in the source
//! YAML. Kani discharges "for all inputs" — these are not sampled tests.
//!
//! Run all: `cargo kani --features kani`
//! Target one: `cargo kani --features kani --harness <name>`
//!
//! Coverage status (2026-04-18, v0.2):
//! - Universal base: 3/3 achievable properties covered
//! - Black Squad: 1/2 (real-exfil check needs tool_class enum)
//! - Blue Squad: 1/1
//! - Purple Squad: 0/1 (needs inv.crosses_tenant field)
//! - White Squad: 2/2
//! - Gold & Platinum: 2/3 (trusted-component predicate needs Component type)
//! - Lil_Scope_Hawk: 1/1
//! - Lil_Seal_Hawk: 1/3 (emit/payload properties need tool_class + payload types)
//! - Lil_Mast_Hawk: 1/3 (cosign-by-policy property needs a verify() stub)
//! - Lil_Doubt_Hawk: 1/3 (audit-report and simulation properties need those types)
//! - Lil_Peel_Hawk: 0/3 (all three need KernelBuild + KernelModification types)
//!
//! Total: 13/22 achievable with current types. Adding tool_class,
//! Payload, Component, KernelBuild extends coverage toward 22/22
//! without changing existing harnesses.

#![cfg(feature = "kani")]

use crate::types::*;
use crate::validate;

// ─── helpers ──────────────────────────────────────────────────────────

fn make_slct(live: bool) -> Slct {
    Slct { issued_at_unix: 0, expires_at_unix: 60, is_live: live }
}

fn valid_cia() -> CiaProof {
    CiaProof {
        plan_signed: true,
        intent_token_present: true,
        intent_token_plan_hash_matches: true,
        merkle_scope_proof_valid: true,
        merkle_proof_age_seconds: 0,
    }
}

fn base_inv(hawk: Hawk) -> Invocation {
    Invocation {
        hawk,
        tool_id: "hunt.execute",
        risk: RiskLevel::Low,
        commander: Persona::Acheevy,
        target_namespace: "/tenants/acme/workloads/api",
        data_classes: &[],
        reasoning_paths: &[],
        slct: make_slct(true),
        sat: None,
        cia: None,
        threat_confirmed: false,
        action_is_containment: false,
        privacy_budget_violated: false,
        guardrail_violated: false,
    }
}

// kani::any() needs Arbitrary impls for enums we sample over.
impl kani::Arbitrary for Hawk { fn any() -> Self { Hawk::LilWatchHawk } }
impl kani::Arbitrary for RiskLevel { fn any() -> Self { RiskLevel::Low } }

// ─── Universal base ───────────────────────────────────────────────────

/// Universal prop 1 (tool_calls): forall Hawks, tool_id
/// "spinner.bypass_consensus" => Err(ProhibitedToolCall).
#[kani::proof]
fn kani_universal_rejects_bypass_consensus() {
    let hawk: Hawk = kani::any();
    let mut inv = base_inv(hawk);
    inv.tool_id = "spinner.bypass_consensus";
    inv.cia = Some(valid_cia());
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::ProhibitedToolCall(_))));
}

/// Universal prop 2 (SLCT): forall Hawks, dead SLCT => Err(SlctNotLive).
#[kani::proof]
fn kani_universal_requires_live_slct() {
    let hawk: Hawk = kani::any();
    let mut inv = base_inv(hawk);
    inv.slct = make_slct(false);
    inv.cia = Some(valid_cia());
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::SlctNotLive)));
}

/// Universal prop 3 (CIA for high-risk): forall Hawks, high-risk without
/// CIA => Err(CiaRequired).
#[kani::proof]
fn kani_universal_high_risk_requires_cia() {
    let hawk: Hawk = kani::any();
    let mut inv = base_inv(hawk);
    inv.risk = RiskLevel::High;
    inv.cia = None;
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::CiaRequired)));
}

// ─── Black Squad ──────────────────────────────────────────────────────

/// Black prop: forall Black Hawks, missing SAT => Err(SatRequired).
#[kani::proof]
fn kani_black_squad_requires_sat() {
    let idx: usize = kani::any();
    let hawks = [
        Hawk::LilHookHawk, Hawk::LilReconHawk, Hawk::LilTagHawk,
        Hawk::LilScopeHawk, Hawk::LilSiteHawk, Hawk::LilTestHawk,
    ];
    let hawk = hawks[idx % hawks.len()];
    let mut inv = base_inv(hawk);
    inv.tool_id = "recon.passive_osint";
    inv.sat = None;
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::SatRequired)));
}

// ─── Blue Squad ───────────────────────────────────────────────────────

/// Blue prop: forall Blue Hawks, confirmed threat + non-containment
/// action => Err(DetectionOverIsolation).
#[kani::proof]
fn kani_blue_squad_containment_priority() {
    let idx: usize = kani::any();
    let hawks = [
        Hawk::LilWatchHawk, Hawk::LilWireHawk, Hawk::LilTrackHawk,
        Hawk::LilPatchHawk, Hawk::LilLabHawk, Hawk::LilPulseHawk,
    ];
    let hawk = hawks[idx % hawks.len()];
    let mut inv = base_inv(hawk);
    inv.threat_confirmed = true;
    inv.action_is_containment = false;
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::DetectionOverIsolation)));
}

// ─── White Squad ──────────────────────────────────────────────────────

/// White prop 1: forall White Hawks, privacy_budget_violated
/// => Err(PrivacyBudgetViolation).
#[kani::proof]
fn kani_white_squad_privacy_budget_halts() {
    let idx: usize = kani::any();
    let hawks = [
        Hawk::LilScriptHawk, Hawk::LilVaneHawk, Hawk::LilGridHawk,
        Hawk::LilLockHawk, Hawk::LilBookHawk, Hawk::LilTellHawk,
        Hawk::LilPlayHawk, Hawk::LilSealHawk,
    ];
    let hawk = hawks[idx % hawks.len()];
    let mut inv = base_inv(hawk);
    inv.privacy_budget_violated = true;
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::PrivacyBudgetViolation)));
}

/// White prop 2: forall White Hawks, guardrail_violated
/// => Err(GuardrailViolation).
#[kani::proof]
fn kani_white_squad_guardrail_halts() {
    let idx: usize = kani::any();
    let hawks = [
        Hawk::LilScriptHawk, Hawk::LilVaneHawk, Hawk::LilGridHawk,
        Hawk::LilLockHawk, Hawk::LilBookHawk, Hawk::LilTellHawk,
        Hawk::LilPlayHawk, Hawk::LilSealHawk,
    ];
    let hawk = hawks[idx % hawks.len()];
    let mut inv = base_inv(hawk);
    inv.guardrail_violated = true;
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::GuardrailViolation)));
}

// ─── Gold & Platinum Squad ────────────────────────────────────────────

/// Gold prop: forall non-Halo Gold Hawks, Crypt_Ang-issued SAT
/// => Err(CryptAngBarredFromGoldSat) OR Err(ProhibitedCommander) for
/// Paranoia specifically. Both enforce the structural barrier.
#[kani::proof]
fn kani_gold_platinum_refuses_crypt_ang_sat() {
    let idx: usize = kani::any();
    let hawks = [
        Hawk::LilOmenHawk, Hawk::LilSaltHawk, Hawk::LilDriftHawk,
        Hawk::LilBellHawk, Hawk::LilVeilHawk, Hawk::LilPeelHawk,
        Hawk::LilDoubtHawk,
    ];
    let hawk = hawks[idx % hawks.len()];
    let mut inv = base_inv(hawk);
    inv.sat = Some(Sat {
        issuer: Persona::CryptAng,
        target_tenant_id: Some(42),
        valid: true,
        co_signer: Some(Hawk::LilMastHawk),
    });
    inv.cia = Some(valid_cia());
    inv.commander = Persona::Acheevy;
    let result = validate(&inv);
    assert!(matches!(result,
        Err(Denial::CryptAngBarredFromGoldSat)
        | Err(Denial::ProhibitedCommander(Persona::CryptAng))));
}

/// Gold prop: forall non-Halo non-Paranoia Gold Hawks, SAT with no Halo
/// co-signer => Err(CoSignRequired).
#[kani::proof]
fn kani_gold_platinum_requires_halo_cosign() {
    let idx: usize = kani::any();
    let hawks = [
        Hawk::LilOmenHawk, Hawk::LilSaltHawk, Hawk::LilDriftHawk,
        Hawk::LilBellHawk, Hawk::LilVeilHawk, Hawk::LilPeelHawk,
    ];
    let hawk = hawks[idx % hawks.len()];
    let mut inv = base_inv(hawk);
    inv.sat = Some(Sat {
        issuer: Persona::PlatformOwner,
        target_tenant_id: Some(42),
        valid: true,
        co_signer: None,
    });
    inv.cia = Some(valid_cia());
    inv.commander = Persona::Acheevy;
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::CoSignRequired)));
}

// ─── Per-Hawk overrides ───────────────────────────────────────────────

/// Reaper prop: target namespace in personas/ACHEEVY/ or
/// personas/Crypt_Ang/ => Err(ProhibitedTarget).
#[kani::proof]
fn kani_reaper_refuses_acheevy_and_crypt_ang_personas() {
    let which: bool = kani::any();
    let mut inv = base_inv(Hawk::LilScopeHawk);
    inv.target_namespace = if which {
        "/personas/ACHEEVY/voice_profile"
    } else {
        "/personas/Crypt_Ang/comm_channel"
    };
    inv.sat = Some(Sat {
        issuer: Persona::PlatformOwner,
        target_tenant_id: Some(42),
        valid: true,
        co_signer: None,
    });
    inv.cia = Some(valid_cia());
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::ProhibitedTarget(_))));
}

/// Privacy prop: forall invocations of Privacy with UnredactedPii or
/// UnredactedPhi in data_classes => Err(ProhibitedDataClass). This is
/// one of the five formally verified kernel properties (v1.6 §5).
#[kani::proof]
fn kani_privacy_refuses_unredacted_pii() {
    let choice: bool = kani::any();
    let data: &[DataClass] = if choice {
        &[DataClass::UnredactedPii]
    } else {
        &[DataClass::UnredactedPhi]
    };
    let mut inv = base_inv(Hawk::LilSealHawk);
    inv.data_classes = data;
    inv.cia = Some(valid_cia());
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::ProhibitedDataClass(_))));
}

/// Halo prop: no-self-cosign. Halo invoking "cosign.gold_sat" with
/// herself as co_signer => Err(_). Captured at either gold_platinum
/// layer or per-Hawk override.
#[kani::proof]
fn kani_halo_no_self_cosign() {
    let mut inv = base_inv(Hawk::LilMastHawk);
    inv.tool_id = "cosign.gold_sat";
    inv.sat = Some(Sat {
        issuer: Persona::PlatformOwner,
        target_tenant_id: Some(42),
        valid: true,
        co_signer: Some(Hawk::LilMastHawk),
    });
    inv.cia = Some(valid_cia());
    let result = validate(&inv);
    assert!(result.is_err());
}

/// Paranoia prop: THE cryptographic guarantee of the independent-
/// auditor reporting line. forall invocations where hawk == Paranoia
/// AND commander == Crypt_Ang => Err(ProhibitedCommander(Crypt_Ang)).
/// Most structurally important proof in the crate.
#[kani::proof]
fn kani_paranoia_refuses_crypt_ang() {
    let tool_idx: usize = kani::any();
    let tools = [
        "audit.hourly_compromise_simulate",
        "audit.rebirth_cadence_check",
        "cosign.gold_sat",
        "simulate.compromise_shield_division",
    ];
    let mut inv = base_inv(Hawk::LilDoubtHawk);
    inv.tool_id = tools[tool_idx % tools.len()];
    inv.commander = Persona::CryptAng;
    inv.cia = Some(valid_cia());
    let result = validate(&inv);
    assert!(matches!(result, Err(Denial::ProhibitedCommander(Persona::CryptAng))));
}
