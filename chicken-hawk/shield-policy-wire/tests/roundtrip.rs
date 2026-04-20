//! End-to-end round-trip tests for the wire format.
//!
//! Every prost-encoded message is re-decoded and checked for structural
//! equality. This proves the schema is stable at the serialization
//! layer without depending on a second language's decoder.
//!
//! The Python ↔ Rust parity suite is a separate integration in
//! `runtime/spinner/tests/wire_parity.py`.

use prost::Message;
use shield_policy::types as k;
use shield_policy_wire::{
    convert::{
        cia_proof_to_wire, decision_from_result, denial_to_wire, invocation_to_wire,
        persona_to_wire, sat_to_wire, slct_to_wire,
    },
    generated as w,
};

fn sample_invocation() -> k::Invocation<'static> {
    k::Invocation {
        hawk: k::Hawk::LilScopeHawk,
        tool_id: "registry.spinner.enforce.isolate_session",
        tool_class: k::ToolClass::Enforce,
        risk: k::RiskLevel::High,
        commander: k::Persona::PmoShieldLead,
        target_namespace: "tenant:contoso/session:*",
        data_classes: &[k::DataClass::TenantSecret, k::DataClass::UnredactedPii],
        reasoning_paths: &[k::ReasoningPath::BypassCia],
        slct: k::Slct {
            issued_at_unix: 1_745_000_000,
            expires_at_unix: 1_745_000_060,
            is_live: true,
        },
        sat: Some(k::Sat {
            issuer: k::Persona::Acheevy,
            target_tenant_id: Some(4242),
            valid: true,
            co_signer: Some(k::Hawk::LilMastHawk),
        }),
        cia: Some(k::CiaProof {
            plan_signed: true,
            intent_token_present: true,
            intent_token_plan_hash_matches: true,
            merkle_scope_proof_valid: true,
            merkle_proof_age_seconds: 120,
        }),
        payload: Some(k::Payload {
            redaction_applied: true,
            is_zkp: false,
        }),
        crosses_tenant: false,
        threat_confirmed: true,
        action_is_containment: true,
        privacy_budget_violated: false,
        guardrail_violated: false,
    }
}

fn roundtrip<M: Message + Default + PartialEq + std::fmt::Debug>(msg: &M) -> M {
    let mut buf = Vec::with_capacity(msg.encoded_len());
    msg.encode(&mut buf).expect("encode to Vec cannot fail");
    let decoded = M::decode(&buf[..]).expect("decode must succeed for own encoding");
    assert_eq!(msg, &decoded, "round-trip produced divergent message");
    decoded
}

#[test]
fn invocation_roundtrip() {
    let inv = sample_invocation();
    let wire = invocation_to_wire(&inv);
    let decoded = roundtrip(&wire);

    assert_eq!(decoded.hawk, w::Hawk::LilScopeHawk as i32);
    assert_eq!(decoded.tool_id, "registry.spinner.enforce.isolate_session");
    assert_eq!(decoded.tool_class, w::ToolClass::Enforce as i32);
    assert_eq!(decoded.risk, w::RiskLevel::High as i32);
    assert_eq!(decoded.target_namespace, "tenant:contoso/session:*");
    assert_eq!(decoded.data_classes.len(), 2);
    assert_eq!(decoded.reasoning_paths.len(), 1);
    assert!(decoded.has_sat);
    assert!(decoded.has_cia);
    assert!(decoded.has_payload);
    assert!(decoded.threat_confirmed);
    assert!(decoded.action_is_containment);
}

#[test]
fn slct_roundtrip() {
    let s = k::Slct {
        issued_at_unix: 1_745_000_000,
        expires_at_unix: 1_745_000_060,
        is_live: true,
    };
    let wire = slct_to_wire(&s);
    let decoded = roundtrip(&wire);
    assert_eq!(decoded.issued_at_unix, 1_745_000_000);
    assert_eq!(decoded.expires_at_unix, 1_745_000_060);
    assert!(decoded.is_live);
}

#[test]
fn sat_with_cosigner_roundtrip() {
    let sat = k::Sat {
        issuer: k::Persona::Acheevy,
        target_tenant_id: Some(4242),
        valid: true,
        co_signer: Some(k::Hawk::LilMastHawk),
    };
    let wire = sat_to_wire(&sat);
    let decoded = roundtrip(&wire);
    assert!(decoded.has_target_tenant_id);
    assert_eq!(decoded.target_tenant_id, 4242);
    assert!(decoded.valid);
    assert!(decoded.has_co_signer);
    assert_eq!(decoded.co_signer, w::Hawk::LilMastHawk as i32);
}

#[test]
fn sat_without_optional_fields_roundtrip() {
    let sat = k::Sat {
        issuer: k::Persona::TenantAdmin,
        target_tenant_id: None,
        valid: false,
        co_signer: None,
    };
    let wire = sat_to_wire(&sat);
    let decoded = roundtrip(&wire);
    assert!(!decoded.has_target_tenant_id);
    assert!(!decoded.has_co_signer);
    assert!(!decoded.valid);
}

#[test]
fn cia_proof_roundtrip() {
    let cia = k::CiaProof {
        plan_signed: true,
        intent_token_present: true,
        intent_token_plan_hash_matches: false,
        merkle_scope_proof_valid: true,
        merkle_proof_age_seconds: 300,
    };
    let wire = cia_proof_to_wire(&cia);
    let decoded = roundtrip(&wire);
    assert!(!decoded.intent_token_plan_hash_matches);
    assert_eq!(decoded.merkle_proof_age_seconds, 300);
}

#[test]
fn persona_hawk_variant_roundtrip() {
    let p = k::Persona::Hawk(k::Hawk::LilPeelHawk);
    let wire = persona_to_wire(p);
    let decoded = roundtrip(&wire);
    match decoded.kind {
        Some(w::persona::Kind::Hawk(h)) => assert_eq!(h, w::Hawk::LilPeelHawk as i32),
        other => panic!("expected Hawk variant, got {:?}", other),
    }
}

#[test]
fn persona_flat_variant_roundtrip() {
    let p = k::Persona::Acheevy;
    let wire = persona_to_wire(p);
    let decoded = roundtrip(&wire);
    match decoded.kind {
        Some(w::persona::Kind::Flat(f)) => assert_eq!(f, w::FlatPersona::Acheevy as i32),
        other => panic!("expected Flat variant, got {:?}", other),
    }
}

#[test]
fn denial_with_payload_roundtrip() {
    let d = k::Denial::ProhibitedToolCall("registry.spinner.exfil.dump_tenant");
    let wire = denial_to_wire(&d);
    let decoded = roundtrip(&wire);
    match decoded.reason {
        Some(w::denial::Reason::ProhibitedToolCall(ref p)) => {
            assert_eq!(p.tool_id, "registry.spinner.exfil.dump_tenant");
        }
        other => panic!("expected ProhibitedToolCall, got {:?}", other),
    }
}

#[test]
fn denial_unit_variant_roundtrip() {
    let d = k::Denial::CiaRequired;
    let wire = denial_to_wire(&d);
    let decoded = roundtrip(&wire);
    match decoded.reason {
        Some(w::denial::Reason::CiaRequired(_)) => {}
        other => panic!("expected CiaRequired, got {:?}", other),
    }
}

#[test]
fn denial_reasoning_path_variant_roundtrip() {
    let d = k::Denial::ProhibitedReasoningPath(k::ReasoningPath::BypassCia);
    let wire = denial_to_wire(&d);
    let decoded = roundtrip(&wire);
    match decoded.reason {
        Some(w::denial::Reason::ProhibitedReasoningPath(ref p)) => {
            assert_eq!(p.reasoning_path, w::ReasoningPath::BypassCia as i32);
        }
        other => panic!("expected ProhibitedReasoningPath, got {:?}", other),
    }
}

#[test]
fn decision_pass_roundtrip() {
    let wire = decision_from_result(&Ok(()));
    let decoded = roundtrip(&wire);
    match decoded.outcome {
        Some(w::decision::Outcome::Pass(_)) => {}
        other => panic!("expected Pass, got {:?}", other),
    }
}

#[test]
fn decision_deny_roundtrip() {
    let wire = decision_from_result(&Err(k::Denial::SlctNotLive));
    let decoded = roundtrip(&wire);
    match decoded.outcome {
        Some(w::decision::Outcome::Deny(d)) => match d.reason {
            Some(w::denial::Reason::SlctNotLive(_)) => {}
            other => panic!("expected SlctNotLive, got {:?}", other),
        },
        other => panic!("expected Deny, got {:?}", other),
    }
}

#[test]
fn all_32_hawks_preserve_ordinal() {
    use k::Hawk::*;
    let all = [
        LilHookHawk, LilReconHawk, LilTagHawk, LilScopeHawk, LilSiteHawk, LilTestHawk,
        LilWatchHawk, LilWireHawk, LilTrackHawk, LilPatchHawk, LilLabHawk, LilPulseHawk,
        LilArcHawk, LilMimeHawk, LilChordHawk, LilLoopHawk,
        LilScriptHawk, LilVaneHawk, LilGridHawk, LilLockHawk, LilBookHawk, LilTellHawk,
        LilPlayHawk, LilSealHawk,
        LilMastHawk, LilOmenHawk, LilSaltHawk, LilDriftHawk, LilBellHawk, LilVeilHawk,
        LilPeelHawk, LilDoubtHawk,
    ];
    assert_eq!(all.len(), 32);
    for (i, h) in all.iter().enumerate() {
        let wire = shield_policy_wire::convert::hawk_to_wire(*h);
        assert_eq!(wire as i32, (i as i32) + 1, "Hawk ordinal mismatch at position {}", i);
    }
}
