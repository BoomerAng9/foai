//! Conversion from `shield_policy::types` (kernel) to wire types.
//!
//! **Direction — kernel → wire only.** Phase A step 2 scope: serialize a
//! kernel `Invocation` out across the wire. The reverse direction (wire
//! bytes → kernel `Invocation`) is Phase B scope because the kernel
//! `Invocation` uses `&'static str` / `&'static [T]` internally, which
//! cannot be constructed from runtime-owned strings without a lifetime
//! refactor that touches every existing test harness.
//!
//! Use the wire types directly for deserialization in the Phase B
//! Cloud Run sidecar — the sidecar will own the strings and hold them
//! for the duration of the validate() call.

use crate::generated as w;
use shield_policy::types as k;

// ─────────────────────────────────────────────────────────────────────
// Enum conversions (kernel → wire ordinal)
// ─────────────────────────────────────────────────────────────────────

pub fn hawk_to_wire(h: k::Hawk) -> w::Hawk {
    match h {
        k::Hawk::LilHookHawk => w::Hawk::LilHookHawk,
        k::Hawk::LilReconHawk => w::Hawk::LilReconHawk,
        k::Hawk::LilTagHawk => w::Hawk::LilTagHawk,
        k::Hawk::LilScopeHawk => w::Hawk::LilScopeHawk,
        k::Hawk::LilSiteHawk => w::Hawk::LilSiteHawk,
        k::Hawk::LilTestHawk => w::Hawk::LilTestHawk,
        k::Hawk::LilWatchHawk => w::Hawk::LilWatchHawk,
        k::Hawk::LilWireHawk => w::Hawk::LilWireHawk,
        k::Hawk::LilTrackHawk => w::Hawk::LilTrackHawk,
        k::Hawk::LilPatchHawk => w::Hawk::LilPatchHawk,
        k::Hawk::LilLabHawk => w::Hawk::LilLabHawk,
        k::Hawk::LilPulseHawk => w::Hawk::LilPulseHawk,
        k::Hawk::LilArcHawk => w::Hawk::LilArcHawk,
        k::Hawk::LilMimeHawk => w::Hawk::LilMimeHawk,
        k::Hawk::LilChordHawk => w::Hawk::LilChordHawk,
        k::Hawk::LilLoopHawk => w::Hawk::LilLoopHawk,
        k::Hawk::LilScriptHawk => w::Hawk::LilScriptHawk,
        k::Hawk::LilVaneHawk => w::Hawk::LilVaneHawk,
        k::Hawk::LilGridHawk => w::Hawk::LilGridHawk,
        k::Hawk::LilLockHawk => w::Hawk::LilLockHawk,
        k::Hawk::LilBookHawk => w::Hawk::LilBookHawk,
        k::Hawk::LilTellHawk => w::Hawk::LilTellHawk,
        k::Hawk::LilPlayHawk => w::Hawk::LilPlayHawk,
        k::Hawk::LilSealHawk => w::Hawk::LilSealHawk,
        k::Hawk::LilMastHawk => w::Hawk::LilMastHawk,
        k::Hawk::LilOmenHawk => w::Hawk::LilOmenHawk,
        k::Hawk::LilSaltHawk => w::Hawk::LilSaltHawk,
        k::Hawk::LilDriftHawk => w::Hawk::LilDriftHawk,
        k::Hawk::LilBellHawk => w::Hawk::LilBellHawk,
        k::Hawk::LilVeilHawk => w::Hawk::LilVeilHawk,
        k::Hawk::LilPeelHawk => w::Hawk::LilPeelHawk,
        k::Hawk::LilDoubtHawk => w::Hawk::LilDoubtHawk,
    }
}

pub fn risk_to_wire(r: k::RiskLevel) -> w::RiskLevel {
    match r {
        k::RiskLevel::Low => w::RiskLevel::Low,
        k::RiskLevel::Medium => w::RiskLevel::Medium,
        k::RiskLevel::High => w::RiskLevel::High,
    }
}

pub fn reasoning_path_to_wire(p: k::ReasoningPath) -> w::ReasoningPath {
    match p {
        k::ReasoningPath::BypassCia => w::ReasoningPath::BypassCia,
        k::ReasoningPath::BypassSlct => w::ReasoningPath::BypassSlct,
        k::ReasoningPath::BypassPrivacyBudget => w::ReasoningPath::BypassPrivacyBudget,
        k::ReasoningPath::DowngradeConsensus => w::ReasoningPath::DowngradeConsensus,
        k::ReasoningPath::StaleMerkleAccept => w::ReasoningPath::StaleMerkleAccept,
        k::ReasoningPath::ScopeCreepFromSat => w::ReasoningPath::ScopeCreepFromSat,
        k::ReasoningPath::DetectionPriorityOverIsolation => w::ReasoningPath::DetectionPriorityOverIsolation,
        k::ReasoningPath::CrossSquadDataLeakage => w::ReasoningPath::CrossSquadDataLeakage,
        k::ReasoningPath::BudgetViolationOverride => w::ReasoningPath::BudgetViolationOverride,
        k::ReasoningPath::GuardrailViolationOverride => w::ReasoningPath::GuardrailViolationOverride,
        k::ReasoningPath::TrustWithoutAttestation => w::ReasoningPath::TrustWithoutAttestation,
        k::ReasoningPath::CryptAngSatAcceptance => w::ReasoningPath::CryptAngSatAcceptance,
        k::ReasoningPath::CosignByPolicyNotVerification => w::ReasoningPath::CosignByPolicyNotVerification,
        k::ReasoningPath::RealExfilJustifiedByProofValue => w::ReasoningPath::RealExfilJustifiedByProofValue,
        k::ReasoningPath::AcceptablePiiLeakForUtility => w::ReasoningPath::AcceptablePiiLeakForUtility,
        k::ReasoningPath::TrustTestsOverProof => w::ReasoningPath::TrustTestsOverProof,
        k::ReasoningPath::PartialVerificationAcceptable => w::ReasoningPath::PartialVerificationAcceptable,
        k::ReasoningPath::DeferToCryptAngOnAuditConflict => w::ReasoningPath::DeferToCryptAngOnAuditConflict,
        k::ReasoningPath::ExcludeCryptAngFromSimulationScope => w::ReasoningPath::ExcludeCryptAngFromSimulationScope,
    }
}

pub fn data_class_to_wire(d: k::DataClass) -> w::DataClass {
    match d {
        k::DataClass::UnredactedPii => w::DataClass::UnredactedPii,
        k::DataClass::UnredactedPhi => w::DataClass::UnredactedPhi,
        k::DataClass::TenantSecret => w::DataClass::TenantSecret,
        k::DataClass::RootKeyMaterial => w::DataClass::RootKeyMaterial,
        k::DataClass::CanarySat => w::DataClass::CanarySat,
        k::DataClass::CrossTenantIdentifier => w::DataClass::CrossTenantIdentifier,
    }
}

pub fn tool_class_to_wire(t: k::ToolClass) -> w::ToolClass {
    match t {
        k::ToolClass::Unknown => w::ToolClass::Unknown,
        k::ToolClass::AiMlTest => w::ToolClass::AiMlTest,
        k::ToolClass::Emit => w::ToolClass::Emit,
        k::ToolClass::CrossTenantSignal => w::ToolClass::CrossTenantSignal,
        k::ToolClass::Enforce => w::ToolClass::Enforce,
        k::ToolClass::Execute => w::ToolClass::Execute,
        k::ToolClass::RealExfil => w::ToolClass::RealExfil,
        k::ToolClass::SimulatedCapture => w::ToolClass::SimulatedCapture,
        k::ToolClass::CoSign => w::ToolClass::CoSign,
        k::ToolClass::Redact => w::ToolClass::Redact,
    }
}

pub fn persona_to_wire(p: k::Persona) -> w::Persona {
    let kind = match p {
        k::Persona::Acheevy => w::persona::Kind::Flat(w::FlatPersona::Acheevy as i32),
        k::Persona::CryptAng => w::persona::Kind::Flat(w::FlatPersona::CryptAng as i32),
        k::Persona::PlatformOwner => w::persona::Kind::Flat(w::FlatPersona::PlatformOwner as i32),
        k::Persona::PmoShieldLead => w::persona::Kind::Flat(w::FlatPersona::PmoShieldLead as i32),
        k::Persona::TenantAdmin => w::persona::Kind::Flat(w::FlatPersona::TenantAdmin as i32),
        k::Persona::Hawk(h) => w::persona::Kind::Hawk(hawk_to_wire(h) as i32),
    };
    w::Persona { kind: Some(kind) }
}

// ─────────────────────────────────────────────────────────────────────
// Record conversions
// ─────────────────────────────────────────────────────────────────────

pub fn slct_to_wire(s: &k::Slct) -> w::Slct {
    w::Slct {
        issued_at_unix: s.issued_at_unix,
        expires_at_unix: s.expires_at_unix,
        is_live: s.is_live,
    }
}

pub fn sat_to_wire(s: &k::Sat) -> w::Sat {
    w::Sat {
        issuer: Some(persona_to_wire(s.issuer)),
        has_target_tenant_id: s.target_tenant_id.is_some(),
        target_tenant_id: s.target_tenant_id.unwrap_or(0),
        valid: s.valid,
        has_co_signer: s.co_signer.is_some(),
        co_signer: s.co_signer.map(|h| hawk_to_wire(h) as i32).unwrap_or(w::Hawk::Unspecified as i32),
    }
}

pub fn cia_proof_to_wire(c: &k::CiaProof) -> w::CiaProof {
    w::CiaProof {
        plan_signed: c.plan_signed,
        intent_token_present: c.intent_token_present,
        intent_token_plan_hash_matches: c.intent_token_plan_hash_matches,
        merkle_scope_proof_valid: c.merkle_scope_proof_valid,
        merkle_proof_age_seconds: c.merkle_proof_age_seconds,
    }
}

pub fn payload_to_wire(p: &k::Payload) -> w::Payload {
    w::Payload {
        redaction_applied: p.redaction_applied,
        is_zkp: p.is_zkp,
    }
}

pub fn invocation_to_wire(inv: &k::Invocation) -> w::Invocation {
    w::Invocation {
        hawk: hawk_to_wire(inv.hawk) as i32,
        tool_id: inv.tool_id.to_string(),
        tool_class: tool_class_to_wire(inv.tool_class) as i32,
        risk: risk_to_wire(inv.risk) as i32,
        commander: Some(persona_to_wire(inv.commander)),
        target_namespace: inv.target_namespace.to_string(),
        data_classes: inv.data_classes.iter().map(|d| data_class_to_wire(*d) as i32).collect(),
        reasoning_paths: inv.reasoning_paths.iter().map(|p| reasoning_path_to_wire(*p) as i32).collect(),
        slct: Some(slct_to_wire(&inv.slct)),
        has_sat: inv.sat.is_some(),
        sat: inv.sat.as_ref().map(sat_to_wire),
        has_cia: inv.cia.is_some(),
        cia: inv.cia.as_ref().map(cia_proof_to_wire),
        has_payload: inv.payload.is_some(),
        payload: inv.payload.as_ref().map(payload_to_wire),
        crosses_tenant: inv.crosses_tenant,
        threat_confirmed: inv.threat_confirmed,
        action_is_containment: inv.action_is_containment,
        privacy_budget_violated: inv.privacy_budget_violated,
        guardrail_violated: inv.guardrail_violated,
    }
}

pub fn denial_to_wire(d: &k::Denial) -> w::Denial {
    use w::denial::Reason;
    let reason = match d {
        k::Denial::ProhibitedToolCall(id) => Reason::ProhibitedToolCall(w::ProhibitedToolCall {
            tool_id: id.to_string(),
        }),
        k::Denial::ProhibitedReasoningPath(p) => Reason::ProhibitedReasoningPath(w::ProhibitedReasoningPath {
            reasoning_path: reasoning_path_to_wire(*p) as i32,
        }),
        k::Denial::ProhibitedTarget(ns) => Reason::ProhibitedTarget(w::ProhibitedTarget {
            target_namespace: ns.to_string(),
        }),
        k::Denial::ProhibitedDataClass(dc) => Reason::ProhibitedDataClass(w::ProhibitedDataClass {
            data_class: data_class_to_wire(*dc) as i32,
        }),
        k::Denial::ProhibitedCommander(p) => Reason::ProhibitedCommander(w::ProhibitedCommander {
            commander: Some(persona_to_wire(*p)),
        }),
        k::Denial::SlctNotLive => Reason::SlctNotLive(w::DenialUnit {}),
        k::Denial::CiaRequired => Reason::CiaRequired(w::DenialUnit {}),
        k::Denial::SatRequired => Reason::SatRequired(w::DenialUnit {}),
        k::Denial::CoSignRequired => Reason::CosignRequired(w::DenialUnit {}),
        k::Denial::CryptAngBarredFromGoldSat => Reason::CryptAngBarredFromGoldSat(w::DenialUnit {}),
        k::Denial::MerkleStale => Reason::MerkleStale(w::DenialUnit {}),
        k::Denial::PrivacyBudgetViolation => Reason::PrivacyBudgetViolation(w::DenialUnit {}),
        k::Denial::GuardrailViolation => Reason::GuardrailViolation(w::DenialUnit {}),
        k::Denial::DetectionOverIsolation => Reason::DetectionOverIsolation(w::DenialUnit {}),
    };
    w::Denial { reason: Some(reason) }
}

pub fn decision_from_result(r: &Result<(), k::Denial>) -> w::Decision {
    let outcome = match r {
        Ok(()) => w::decision::Outcome::Pass(w::Pass {}),
        Err(d) => w::decision::Outcome::Deny(denial_to_wire(d)),
    };
    w::Decision { outcome: Some(outcome) }
}
