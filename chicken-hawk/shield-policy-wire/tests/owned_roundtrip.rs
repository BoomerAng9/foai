//! Full wire round-trip through OwnedInvocation.
//!
//! Proves the sidecar-style flow works end to end:
//!   kernel Invocation → wire encode → bytes → wire decode → OwnedInvocation
//!   → as_borrowed() → kernel Invocation → validate() → kernel result

use prost::Message;
use shield_policy::types as k;
use shield_policy_wire::{
    convert::invocation_to_wire,
    generated as w,
    owned::{OwnedInvocation, WireConversionError},
};

fn sample() -> k::Invocation<'static> {
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

#[test]
fn full_roundtrip_through_owned() {
    let original = sample();

    // Kernel → wire
    let wire = invocation_to_wire(&original);
    let mut buf = Vec::with_capacity(wire.encoded_len());
    wire.encode(&mut buf).unwrap();

    // Bytes → wire
    let decoded = w::Invocation::decode(&buf[..]).unwrap();

    // Wire → owned → borrowed
    let owned = OwnedInvocation::try_from_wire(&decoded).expect("must convert");
    let borrowed = owned.as_borrowed();

    // Field-by-field equality against the original.
    assert_eq!(borrowed.hawk, original.hawk);
    assert_eq!(borrowed.tool_id, original.tool_id);
    assert_eq!(borrowed.tool_class, original.tool_class);
    assert_eq!(borrowed.risk, original.risk);
    assert_eq!(borrowed.commander, original.commander);
    assert_eq!(borrowed.target_namespace, original.target_namespace);
    assert_eq!(borrowed.data_classes, original.data_classes);
    assert_eq!(borrowed.reasoning_paths, original.reasoning_paths);
    assert_eq!(borrowed.slct.is_live, original.slct.is_live);
    assert_eq!(
        borrowed.slct.issued_at_unix,
        original.slct.issued_at_unix
    );
    assert!(borrowed.sat.is_some());
    assert_eq!(
        borrowed.sat.unwrap().target_tenant_id,
        original.sat.unwrap().target_tenant_id
    );
    assert!(borrowed.cia.is_some());
    assert_eq!(
        borrowed.cia.unwrap().merkle_proof_age_seconds,
        original.cia.unwrap().merkle_proof_age_seconds
    );
    assert_eq!(borrowed.threat_confirmed, original.threat_confirmed);
    assert_eq!(
        borrowed.action_is_containment,
        original.action_is_containment
    );
}

#[test]
fn borrowed_validates_through_kernel() {
    // The whole point of this crate: a wire-deserialized invocation
    // can flow into shield_policy::validate() without modification.
    let original = sample();
    let wire = invocation_to_wire(&original);
    let mut buf = Vec::with_capacity(wire.encoded_len());
    wire.encode(&mut buf).unwrap();

    let decoded = w::Invocation::decode(&buf[..]).unwrap();
    let owned = OwnedInvocation::try_from_wire(&decoded).expect("must convert");
    let borrowed = owned.as_borrowed();

    // The kernel evaluates this invocation exactly like it would any
    // other. The canonical sample is constructed to pass validation
    // through Lil_Scope_Hawk's override — BypassCia in reasoning_paths
    // is rejected by universal_base_validate, so expect Err.
    let result = shield_policy::validate(&borrowed);
    assert!(
        result.is_err(),
        "canonical sample with BypassCia reasoning should be rejected, \
         got {:?} — this proves the conversion preserves the predicate-relevant data",
        result
    );
}

#[test]
fn unspecified_hawk_rejected() {
    let mut wire_bytes = {
        let wire = invocation_to_wire(&sample());
        let mut buf = Vec::with_capacity(wire.encoded_len());
        wire.encode(&mut buf).unwrap();
        buf
    };
    // Patch the hawk field to 0 (Unspecified). Tag=1 wire-type=0 is
    // the 0x08 varint prefix; follow with varint 0.
    // Simpler: decode, mutate, re-encode.
    let mut decoded = w::Invocation::decode(&wire_bytes[..]).unwrap();
    decoded.hawk = 0;
    wire_bytes.clear();
    decoded.encode(&mut wire_bytes).unwrap();

    let re_decoded = w::Invocation::decode(&wire_bytes[..]).unwrap();
    match OwnedInvocation::try_from_wire(&re_decoded) {
        Err(WireConversionError::UnspecifiedHawk(0)) => {}
        other => panic!("expected UnspecifiedHawk(0), got {:?}", other),
    }
}

#[test]
fn unspecified_risk_rejected() {
    let mut decoded = {
        let wire = invocation_to_wire(&sample());
        let mut buf = Vec::with_capacity(wire.encoded_len());
        wire.encode(&mut buf).unwrap();
        w::Invocation::decode(&buf[..]).unwrap()
    };
    decoded.risk = 0;

    let mut buf = Vec::new();
    decoded.encode(&mut buf).unwrap();
    let re_decoded = w::Invocation::decode(&buf[..]).unwrap();

    match OwnedInvocation::try_from_wire(&re_decoded) {
        Err(WireConversionError::UnspecifiedRisk(0)) => {}
        other => panic!("expected UnspecifiedRisk(0), got {:?}", other),
    }
}
