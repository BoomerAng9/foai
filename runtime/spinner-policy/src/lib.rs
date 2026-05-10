//! Spinner Policy — Cloud Run Rust sidecar for shield-policy.
//!
//! Phase B of the P0 rewrite plan. Exposes `POST /validate` accepting
//! `deploy.spinner.shield.v1.Invocation` wire bytes, decodes via
//! `shield-policy-wire`, runs `shield_policy::validate()`, and returns
//! a `Decision` wire-encoded in the response body.
//!
//! This is a validator, not a replacer — the Python Spinner keeps the
//! primary orchestration role and calls this sidecar as one pre-dispatch
//! step. The v1.6 §3.1 quorum (2-of-3 substrates) runs in the
//! dispatcher, not here.

use axum::{
    body::Bytes,
    extract::State,
    http::{header, StatusCode},
    response::{IntoResponse, Response},
    routing::{get, post},
    Router,
};
use prost::Message;
use shield_policy::{types as k, validate};
use shield_policy_wire::{
    convert::decision_from_result,
    generated as w,
    owned::{OwnedInvocation, WireConversionError},
};
use std::sync::Arc;

/// Maximum request body size. Invocation records are <1 KB in
/// practice; 16 KB gives a generous headroom while blocking any
/// accidental massive payload.
pub const MAX_BODY_BYTES: usize = 16 * 1024;

/// Shared application state. Empty today; reserved for metrics
/// counters, build-hash attestation, audit-chain cursor in later
/// phases.
#[derive(Clone, Default)]
pub struct AppState {
    pub build_content_hash: Arc<Option<Vec<u8>>>,
}

/// Construct the router. Separated from `main()` so tests can wrap
/// it with `tower::ServiceExt` and issue requests without a network.
pub fn router(state: AppState) -> Router {
    Router::new()
        .route("/health", get(health))
        .route("/validate", post(handle_validate))
        .with_state(state)
}

async fn health() -> &'static str {
    "ok\n"
}

/// Response shape:
///   200 OK application/octet-stream  → wire-encoded Decision
///   400 Bad Request text/plain        → decode or wire-conversion error
///   413 Payload Too Large text/plain  → body over MAX_BODY_BYTES
async fn handle_validate(
    State(_state): State<AppState>,
    body: Bytes,
) -> Response {
    if body.len() > MAX_BODY_BYTES {
        tracing::warn!(size = body.len(), "rejecting oversize body");
        return (
            StatusCode::PAYLOAD_TOO_LARGE,
            format!("body {} > MAX_BODY_BYTES {}", body.len(), MAX_BODY_BYTES),
        )
            .into_response();
    }

    let wire = match w::Invocation::decode(body.as_ref()) {
        Ok(w) => w,
        Err(err) => {
            tracing::warn!(%err, "prost decode failed");
            return (
                StatusCode::BAD_REQUEST,
                format!("prost decode: {err}"),
            )
                .into_response();
        }
    };

    let owned = match OwnedInvocation::try_from_wire(&wire) {
        Ok(o) => o,
        Err(err) => return denial_response(&err).into_response(),
    };

    let inv = owned.as_borrowed();
    let result: Result<(), k::Denial<'_>> = validate(&inv);

    tracing::info!(
        hawk = ?inv.hawk,
        tool_id = inv.tool_id,
        verdict = if result.is_ok() { "pass" } else { "deny" },
        "validated",
    );

    let decision = decision_from_result(&result);
    let mut buf = Vec::with_capacity(decision.encoded_len());
    decision
        .encode(&mut buf)
        .expect("encoding into Vec is infallible");

    Response::builder()
        .status(StatusCode::OK)
        .header(header::CONTENT_TYPE, "application/octet-stream")
        .body(buf.into())
        .expect("response build cannot fail")
}

fn denial_response(err: &WireConversionError) -> (StatusCode, String) {
    (StatusCode::BAD_REQUEST, format!("wire conversion: {err}"))
}
