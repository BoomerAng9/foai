# ═══════════════════════════════════════════════════════════════════
#  Sqwaadrun gateway — production container
# ═══════════════════════════════════════════════════════════════════

FROM python:3.12-slim AS base

# System deps for lxml + psycopg
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    libpq-dev \
    curl \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install in two layers for cache hits
COPY pyproject.toml ./
COPY sqwaadrun/__init__.py sqwaadrun/__init__.py
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      aiohttp aiofiles beautifulsoup4 lxml html2text tldextract \
      'psycopg[binary]>=3.1'

COPY sqwaadrun/ ./sqwaadrun/
COPY migrations/ ./migrations/

# Persist Sqwaadrun state outside the writable layer
RUN mkdir -p /var/lib/sqwaadrun && \
    chown -R nobody:nogroup /var/lib/sqwaadrun

ENV PYTHONUNBUFFERED=1 \
    PYTHONIOENCODING=utf-8 \
    PYTHONUTF8=1 \
    SQWAADRUN_DATA_DIR=/var/lib/sqwaadrun

EXPOSE 7700

USER nobody

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD curl -fsS http://localhost:7700/health || exit 1

ENTRYPOINT ["python", "-m", "sqwaadrun.service"]
CMD ["--host", "0.0.0.0", "--port", "7700"]
