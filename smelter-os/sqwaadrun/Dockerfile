# ═══════════════════════════════════════════════════════════════════
#  Sqwaadrun gateway — production container
# ═══════════════════════════════════════════════════════════════════

FROM python:3.12-slim AS base

# System deps for lxml + psycopg + Playwright browsers
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libxml2-dev \
    libxslt-dev \
    libpq-dev \
    curl \
    ca-certificates \
    # Playwright Chromium deps (complete set)
    libnss3 libatk1.0-0 libatk-bridge2.0-0 libcups2 libdrm2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxrandr2 libgbm1 \
    libpango-1.0-0 libcairo2 libasound2 libxshmfence1 \
    libxfixes3 libxext6 libx11-6 libx11-xcb1 libxcb1 \
    libxi6 libxtst6 libglib2.0-0 libdbus-1-3 \
    fonts-liberation fonts-noto-color-emoji \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install in two layers for cache hits
COPY pyproject.toml ./
COPY sqwaadrun/__init__.py sqwaadrun/__init__.py
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
      aiohttp aiofiles beautifulsoup4 lxml html2text tldextract \
      'brotli>=1.1' \
      'psycopg[binary]>=3.1' 'psycopg_pool>=3.2' \
      'google-cloud-storage>=2.18' \
      playwright && \
    playwright install chromium

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
