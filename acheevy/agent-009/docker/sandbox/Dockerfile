# =========================================================================
# ii-agent-sandbox  —  Self-hosted sandbox image for the Docker provider
# =========================================================================
# Adapted from e2b.Dockerfile but without PyArmor obfuscation
# (no need to obfuscate code running on your own VPS).
#
# Build:  docker build -t ii-agent-sandbox -f docker/sandbox/Dockerfile .
# =========================================================================

# ---------- Stage 1: Codex SSE HTTP server (Rust) ----------
FROM rust:1.75-slim AS codex-builder

RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    git ca-certificates pkg-config libssl-dev

WORKDIR /build
RUN git clone --branch v0.0.1 https://github.com/Intelligent-Internet/codex.git
WORKDIR /build/codex/codex-rs

RUN --mount=type=cache,target=/usr/local/cargo/registry \
    --mount=type=cache,target=/build/codex/codex-rs/target \
    cargo build --release --bin sse-http-server && \
    cp /build/codex/codex-rs/target/release/sse-http-server /sse-http-server


# ---------- Stage 2: Main sandbox image ----------
FROM nikolaik/python-nodejs:python3.10-nodejs24-slim

# Shell config for root + pn user
COPY docker/sandbox/.bashrc /root/.bashrc
COPY docker/sandbox/.bashrc /home/pn/.bashrc

# System packages
RUN --mount=type=cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,target=/var/lib/apt,sharing=locked \
    apt-get update && apt-get install -y \
    build-essential procps lsof git tmux bc net-tools ripgrep unzip \
    libmagic1 xvfb pandoc weasyprint libpq-dev wget gosu dos2unix \
    && rm -rf /var/lib/apt/lists/*

# code-server + global npm tools
RUN curl -fsSL https://code-server.dev/install.sh | sh

RUN --mount=type=cache,target=/root/.npm \
    npm install -g playwright@1.55.0 @intelligent-internet/codex @ast-grep/cli @anthropic-ai/claude-code

RUN --mount=type=cache,target=/root/.npm \
    npm install -g vercel

# pn user setup + Bun + Playwright browsers
RUN usermod -aG sudo pn
USER pn
RUN curl -fsSL https://bun.sh/install | bash
RUN playwright install chromium
USER root
RUN playwright install-deps

ENV NODE_OPTIONS="--max-old-space-size=4096"

# ---------- Python project (ii_tool — unobfuscated) ----------
RUN mkdir -p /app/ii_agent
WORKDIR /app/ii_agent

ENV UV_COMPILE_BYTECODE=1
ENV UV_LINK_MODE=copy

# Dependencies first (layer cache)
COPY uv.lock pyproject.toml /app/ii_agent/

RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --prerelease=allow --no-install-project --no-dev

# Source code — plain, no obfuscation
COPY src/ii_tool /app/ii_agent/src/ii_tool

# Codex binary from builder stage
COPY --from=codex-builder /sse-http-server /usr/local/bin/sse-http-server

COPY README.md /app/ii_agent/

RUN mkdir -p /app/ii_agent/src/ii_agent && \
    touch /app/ii_agent/src/ii_agent/__init__.py

# Config files
RUN mkdir -p /root/.codex /home/pn/.codex /home/pn/.claude
COPY docker/sandbox/template.css /app/template.css
COPY docker/sandbox/claude_template.json /root/.claude.json
COPY docker/sandbox/claude_template.json /home/pn/.claude.json

# Template files (optional — copy only if they exist)
COPY .template[s] /app/ii_agent/.templates

# Final uv sync (installs the project itself)
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --locked --prerelease=allow --no-dev

# Workspace
RUN mkdir /workspace
WORKDIR /workspace

# Startup scripts
COPY docker/sandbox/start-services.sh /app/start-services.sh
COPY docker/sandbox/entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/start-services.sh /app/entrypoint.sh && \
    chmod +x /app/start-services.sh /app/entrypoint.sh

# Ownership
RUN chown -R pn:pn /home/pn /app /workspace && \
    chmod -R 755 /app && \
    chmod -R 755 /home/pn/.claude

ENV HOME=/home/pn
ENV PATH="/home/pn/.bun/bin:/app/ii_agent/.venv/bin:$PATH"

ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["bash", "/app/start-services.sh"]
