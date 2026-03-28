# =========================================================================
# A.I.M.S. OpenSandbox — VPS2 Code Execution Engine
# Wraps ii_sandbox_server (FastAPI/Python) behind a lean image.
# Exposed on: 10.0.0.2:4400
# =========================================================================
FROM python:3.12-slim AS base

# System deps for Docker-in-Docker exec + file handling
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl ca-certificates docker.io libmagic1 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Layer-cache: install from requirements.txt first
COPY src/ii_sandbox_server/requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Application source
COPY src/ii_sandbox_server ./src/ii_sandbox_server
COPY src/ii_agent ./src/ii_agent

ENV PYTHONPATH=/app/src \
    HOST=0.0.0.0 \
    PORT=4400 \
    SANDBOX_MODE=docker \
    LOG_LEVEL=info

EXPOSE 4400

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD curl -fs http://127.0.0.1:4400/health || exit 1

CMD ["uvicorn", "ii_sandbox_server.main:app", \
     "--host", "0.0.0.0", "--port", "4400", \
     "--workers", "2", "--log-level", "info"]
