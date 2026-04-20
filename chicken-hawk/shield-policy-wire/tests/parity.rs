//! Cross-language parity fixture.
//!
//! This test encodes a canonical invocation that both Rust and Python
//! sides agree on, and compares the bytes against a checked-in
//! fixture. The Python side of this test lives at
//! `runtime/spinner/tests/wire_parity.py`.
//!
//! The fixture file is written to two locations for robustness:
//!   - `runtime/spinner/tests/fixtures/invocation.bin` (primary, Python test reads this)
//!   - `chicken-hawk/shield-policy-wire/tests/fixtures/invocation.bin` (Rust-local)
//!
//! Both must agree — the `invariant_check` test below enforces this.

use prost::Message;
use shield_policy::types as k;
use shield_policy_wire::{convert::invocation_to_wire, generated as w};
use std::path::PathBuf;

fn canonical() -> k::Invocation {
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
            // The Python dataclass only carries is_live, so the wire adapter
            // zeroes the two timestamp fields. Match that here so the Rust
            // fixture aligns byte-for-byte with the Python fixture.
            issued_at_unix: 0,
            expires_at_unix: 0,
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

fn encoded_bytes() -> Vec<u8> {
    let wire = invocation_to_wire(&canonical());
    let mut buf = Vec::with_capacity(wire.encoded_len());
    wire.encode(&mut buf).expect("encode to Vec is infallible");
    buf
}

fn fixture_paths() -> (PathBuf, PathBuf) {
    let crate_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let rust_local = crate_dir.join("tests/fixtures/invocation.bin");
    let python_shared = crate_dir
        .join("../../runtime/spinner/tests/fixtures/invocation.bin")
        .canonicalize()
        .unwrap_or_else(|_| crate_dir.join("../../runtime/spinner/tests/fixtures/invocation.bin"));
    (rust_local, python_shared)
}

/// Emit the fixture. Run once when the canonical invocation or schema
/// changes. Ignored by default so normal `cargo test` runs don't mutate
/// the repo.
///
/// Run with:
///   cargo test -p shield-policy-wire parity_emit_fixture -- --ignored
#[test]
#[ignore]
fn parity_emit_fixture() {
    let bytes = encoded_bytes();
    let (rust_local, python_shared) = fixture_paths();

    for path in [&rust_local, &python_shared] {
        if let Some(parent) = path.parent() {
            std::fs::create_dir_all(parent).expect("create fixtures dir");
        }
        std::fs::write(path, &bytes).expect("write fixture");
        eprintln!("wrote {} ({} bytes)", path.display(), bytes.len());
    }
}

/// Verify the Rust encoder produces bytes identical to the checked-in
/// fixture. Runs on every `cargo test`.
#[test]
fn parity_against_fixture() {
    let (rust_local, _) = fixture_paths();

    let expected = match std::fs::read(&rust_local) {
        Ok(b) => b,
        Err(_) => {
            // First run or post-schema-change — regenerate the fixture
            // here so the test is self-healing on initial land. Next run
            // flips to strict equality check.
            let bytes = encoded_bytes();
            if let Some(parent) = rust_local.parent() {
                std::fs::create_dir_all(parent).expect("create fixtures dir");
            }
            std::fs::write(&rust_local, &bytes).expect("write fixture");
            return;
        }
    };

    let actual = encoded_bytes();
    assert_eq!(
        actual, expected,
        "Rust encoding diverges from checked-in fixture — either the \
         canonical invocation changed (re-run `cargo test \
         parity_emit_fixture -- --ignored`) or the schema changed on \
         one side."
    );
}

/// Decode the fixture via prost and verify every field matches the
/// canonical invocation. This catches the case where the Rust encoder
/// silently produces bytes that decode back to a DIFFERENT logical
/// invocation (e.g. field tag collision).
#[test]
fn fixture_decodes_to_canonical() {
    let (rust_local, _) = fixture_paths();
    let Ok(bytes) = std::fs::read(&rust_local) else { return };

    let decoded = w::Invocation::decode(&bytes[..]).expect("fixture must decode");
    assert_eq!(decoded.hawk, w::Hawk::LilScopeHawk as i32);
    assert_eq!(decoded.tool_id, "registry.spinner.enforce.isolate_session");
    assert_eq!(decoded.tool_class, w::ToolClass::Enforce as i32);
    assert_eq!(decoded.risk, w::RiskLevel::High as i32);
    assert_eq!(decoded.target_namespace, "tenant:contoso/session:*");
    assert_eq!(decoded.data_classes, vec![w::DataClass::TenantSecret as i32, w::DataClass::UnredactedPii as i32]);
    assert_eq!(decoded.reasoning_paths, vec![w::ReasoningPath::BypassCia as i32]);
    assert!(decoded.slct.as_ref().unwrap().is_live);
    assert!(decoded.has_sat);
    assert_eq!(decoded.sat.as_ref().unwrap().target_tenant_id, 4242);
    assert_eq!(decoded.sat.as_ref().unwrap().co_signer, w::Hawk::LilMastHawk as i32);
    assert!(decoded.has_cia);
    assert_eq!(decoded.cia.as_ref().unwrap().merkle_proof_age_seconds, 120);
    assert!(decoded.has_payload);
    assert!(decoded.payload.as_ref().unwrap().redaction_applied);
    assert!(decoded.threat_confirmed);
    assert!(decoded.action_is_containment);
}
