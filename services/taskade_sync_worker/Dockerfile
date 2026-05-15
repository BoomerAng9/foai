# Taskade sync worker — Python 3.12 slim.
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

COPY __init__.py config.py worker.py ledger_reader.py adapter_client.py notifier.py ./
COPY schema/ ./schema/

RUN useradd --create-home --uid 10001 worker
USER worker

# Container package layout: /app is the importable package "app".
WORKDIR /
CMD ["python", "-m", "app.worker"]
