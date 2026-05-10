# Cloud Run image for spinner-policy. Two-stage: rust:1-bookworm builds
# a release binary, then gcr.io/distroless/cc-debian12:nonroot runs it
# with no shell, no package manager, no root access.
#
# Build context: REPO ROOT (path deps on shield-policy + shield-policy-wire
# resolve relative to chicken-hawk/). Invoke from Cloud Build with:
#   docker build -f runtime/spinner-policy/Dockerfile -t <tag> .
#
# Per-substrate deploy (v1.6 §3.1): arm64-darwin and wasm32 substrates
# are separate Cloud Run services. For linux/amd64 (this Dockerfile's
# default), the rust:1-bookworm base is native. For arm64, use a
# multi-arch buildx invocation (--platform linux/arm64); for wasm32,
# a different runtime layer (wasmtime) is needed — deferred.

FROM rust:1-bookworm AS builder

WORKDIR /build

COPY runtime/spinner-policy/Cargo.toml runtime/spinner-policy/
COPY runtime/spinner-policy/src runtime/spinner-policy/src
COPY runtime/spinner-policy/tests runtime/spinner-policy/tests
COPY chicken-hawk/shield-policy chicken-hawk/shield-policy
COPY chicken-hawk/shield-policy-wire chicken-hawk/shield-policy-wire
COPY runtime/spinner/schema runtime/spinner/schema
COPY LICENSE LICENSE

RUN cd runtime/spinner-policy \
 && cargo build --release --bin spinner-policy \
 && strip target/release/spinner-policy


FROM gcr.io/distroless/cc-debian12:nonroot AS runtime

WORKDIR /app
COPY --from=builder /build/runtime/spinner-policy/target/release/spinner-policy /app/spinner-policy

# Cloud Run injects PORT; the binary reads it at startup.
ENV RUST_LOG=info,spinner_policy=info

USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/app/spinner-policy"]
