//! HTTP-level tests. Uses tower::ServiceExt to issue requests against
//! the Router directly — no TCP listener, no port binding.

use axum::{
    body::Body,
    http::{Request, StatusCode},
};
use http_body_util::BodyExt;
use prost::Message;
use shield_policy::types as k;
use shield_policy_wire::{convert::invocation_to_wire, generated as w};
use spinner_policy::{router, AppState};
use tower::ServiceExt;

fn sample_invocation() -> k::Invocation<'static> {
    // Designed to PASS the kernel validator — no prohibited tool,
    // no bad reasoning path, no SAT required (blue squad), SLCT live.
    k::Invocation {
        hawk: k::Hawk::LilWatchHawk,
        tool_id: "telemetry.metric.emit",
        tool_class: k::ToolClass::Emit,
        risk: k::RiskLevel::Low,
        commander: k::Persona::TenantAdmin,
        target_namespace: "/tenants/acme/workloads/api",
        data_classes: &[],
        reasoning_paths: &[],
        slct: k::Slct {
            issued_at_unix: 1_745_000_000,
            expires_at_unix: 1_745_000_060,
            is_live: true,
        },
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

fn denying_invocation() -> k::Invocation<'static> {
    // Carries a BypassCia reasoning path — universal_base rejects.
    k::Invocation {
        hawk: k::Hawk::LilScopeHawk,
        tool_id: "registry.spinner.enforce.isolate_session",
        tool_class: k::ToolClass::Enforce,
        risk: k::RiskLevel::High,
        commander: k::Persona::PmoShieldLead,
        target_namespace: "tenant:contoso/session:*",
        data_classes: &[],
        reasoning_paths: &[k::ReasoningPath::BypassCia],
        slct: k::Slct {
            issued_at_unix: 1_745_000_000,
            expires_at_unix: 1_745_000_060,
            is_live: true,
        },
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

fn encode(inv: &k::Invocation<'_>) -> Vec<u8> {
    let wire = invocation_to_wire(inv);
    let mut buf = Vec::with_capacity(wire.encoded_len());
    wire.encode(&mut buf).unwrap();
    buf
}

#[tokio::test]
async fn health_ok() {
    let app = router(AppState::default());
    let response = app
        .oneshot(
            Request::builder()
                .uri("/health")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::OK);
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    assert_eq!(&bytes[..], b"ok\n");
}

#[tokio::test]
async fn validate_passing_invocation_returns_decision_pass() {
    let app = router(AppState::default());
    let body = encode(&sample_invocation());
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/validate")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let decision = w::Decision::decode(&bytes[..]).expect("response must be a valid Decision");
    match decision.outcome {
        Some(w::decision::Outcome::Pass(_)) => {}
        other => panic!("expected Pass, got {:?}", other),
    }
}

#[tokio::test]
async fn validate_denying_invocation_returns_decision_deny() {
    let app = router(AppState::default());
    let body = encode(&denying_invocation());
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/validate")
                .body(Body::from(body))
                .unwrap(),
        )
        .await
        .unwrap();

    assert_eq!(response.status(), StatusCode::OK);
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let decision = w::Decision::decode(&bytes[..]).expect("response must be a valid Decision");
    match decision.outcome {
        Some(w::decision::Outcome::Deny(d)) => match d.reason {
            Some(w::denial::Reason::ProhibitedReasoningPath(p)) => {
                assert_eq!(p.reasoning_path, w::ReasoningPath::BypassCia as i32);
            }
            other => panic!("expected ProhibitedReasoningPath, got {:?}", other),
        },
        other => panic!("expected Deny, got {:?}", other),
    }
}

#[tokio::test]
async fn validate_rejects_malformed_prost_bytes() {
    let app = router(AppState::default());
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/validate")
                .body(Body::from(b"\x99\xff\x00garbage".to_vec()))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
}

#[tokio::test]
async fn validate_rejects_unspecified_hawk() {
    let app = router(AppState::default());

    // Build a wire::Invocation with hawk=0 (Unspecified).
    let mut wire = invocation_to_wire(&sample_invocation());
    wire.hawk = 0;
    let mut buf = Vec::new();
    wire.encode(&mut buf).unwrap();

    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/validate")
                .body(Body::from(buf))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::BAD_REQUEST);
    let bytes = response.into_body().collect().await.unwrap().to_bytes();
    let msg = String::from_utf8_lossy(&bytes);
    assert!(msg.contains("Unspecified") || msg.contains("unknown"), "got: {msg}");
}

#[tokio::test]
async fn validate_rejects_oversize_body() {
    let app = router(AppState::default());
    let huge = vec![0u8; spinner_policy::MAX_BODY_BYTES + 1];
    let response = app
        .oneshot(
            Request::builder()
                .method("POST")
                .uri("/validate")
                .body(Body::from(huge))
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::PAYLOAD_TOO_LARGE);
}

#[tokio::test]
async fn get_on_validate_returns_method_not_allowed() {
    let app = router(AppState::default());
    let response = app
        .oneshot(
            Request::builder()
                .uri("/validate")
                .body(Body::empty())
                .unwrap(),
        )
        .await
        .unwrap();
    assert_eq!(response.status(), StatusCode::METHOD_NOT_ALLOWED);
}
