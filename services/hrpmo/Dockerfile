FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
        ca-certificates \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY __init__.py config.py loop.py scoring.py agent_cards.py ./

RUN useradd --create-home --uid 10001 hrpmo
USER hrpmo

WORKDIR /
# Cron / scheduler triggers this via `python -m app.loop --json`
CMD ["python", "-m", "app.loop"]
