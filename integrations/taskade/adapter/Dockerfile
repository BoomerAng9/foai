# Taskade adapter — Python 3.12 slim, no system deps beyond libcurl for requests.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# System deps — minimal. requests + httpx don't need anything beyond ca-certs.
RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy adapter source (excluding tests — production image is slim).
COPY __init__.py main.py capabilities.py schemas.py role_descriptors.py ./

# Non-root user for runtime.
RUN useradd --create-home --uid 10001 adapter
USER adapter

EXPOSE 8000

# Adapter port is configurable via ADAPTER_PORT env (default 8000).
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${ADAPTER_PORT:-8000} --workers 2"]
