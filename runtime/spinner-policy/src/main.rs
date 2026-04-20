//! Cloud Run entry point.
//!
//! Reads PORT from env (Cloud Run injects it; defaults to 8080 locally).
//! Binds 0.0.0.0 and serves the Router from `spinner_policy::router`.

use std::{env, net::SocketAddr};

use spinner_policy::{router, AppState};
use tokio::net::TcpListener;
use tower_http::trace::TraceLayer;
use tracing_subscriber::{fmt, prelude::*, EnvFilter};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    tracing_subscriber::registry()
        .with(
            EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| EnvFilter::new("info,spinner_policy=info")),
        )
        .with(fmt::layer().with_target(false).json())
        .init();

    let port: u16 = env::var("PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(8080);
    let addr: SocketAddr = ([0, 0, 0, 0], port).into();

    let state = AppState::default();
    let app = router(state).layer(TraceLayer::new_for_http());

    let listener = TcpListener::bind(&addr).await?;
    tracing::info!(%addr, "spinner-policy listening");

    axum::serve(listener, app)
        .with_graceful_shutdown(shutdown_signal())
        .await?;

    tracing::info!("spinner-policy stopped");
    Ok(())
}

async fn shutdown_signal() {
    let ctrl_c = async {
        tokio::signal::ctrl_c()
            .await
            .expect("ctrl_c handler install failed");
    };

    #[cfg(unix)]
    let terminate = async {
        tokio::signal::unix::signal(tokio::signal::unix::SignalKind::terminate())
            .expect("SIGTERM handler install failed")
            .recv()
            .await;
    };

    #[cfg(not(unix))]
    let terminate = std::future::pending::<()>();

    tokio::select! {
        _ = ctrl_c => {},
        _ = terminate => {},
    }
}
