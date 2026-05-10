# Multi-stage build for the vault-signer sidecar.
# Target: Cloud Run on foai-aims/us-central1.
#
# Size-minimized: final image is python:3.12-slim with only the sidecar's
# runtime dependencies + the app source. No build tooling, no test deps.

FROM python:3.12-slim AS builder

WORKDIR /build

RUN pip install --no-cache-dir --quiet "pip-tools==7.5.1"

COPY pyproject.toml .

# Resolve pyproject.toml's [project].dependencies into a pinned
# requirements.txt that the runtime stage installs. This keeps the
# runtime image deterministic and excludes the dev extras.
RUN pip-compile --quiet --output-file=requirements.runtime.txt pyproject.toml


FROM python:3.12-slim AS runtime

# Non-root service account. Cloud Run's container runtime honors USER
# and enforces read-only rootfs by default when combined with
# service.yaml's runtimeClassName.
RUN groupadd --system --gid 10001 vault \
 && useradd  --system --uid 10001 --gid vault --home-dir /app --shell /usr/sbin/nologin vault

WORKDIR /app

COPY --from=builder /build/requirements.runtime.txt .

RUN pip install --no-cache-dir --quiet --require-hashes=no -r requirements.runtime.txt \
 && rm requirements.runtime.txt

COPY --chown=vault:vault src/vault_signer ./vault_signer

USER vault
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    VAULT_SIGNER_HIDE_DOCS=1

# Cloud Run injects PORT; default to 8080 if not set (local testing).
# uvicorn bind 0.0.0.0 required for Cloud Run health checks.
CMD exec uvicorn vault_signer.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8080}" \
    --workers 1 \
    --no-access-log
