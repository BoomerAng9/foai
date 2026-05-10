FROM python:3.12-slim

WORKDIR /app

# Install hermes deps (aims_memory's deps — asyncpg, httpx — are already covered
# by hermes/requirements.txt, so no separate install step needed for the
# sibling package).
COPY runtime/hermes/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pull in the sibling internal package `aims_memory` so `from aims_memory...`
# resolves at runtime. The package has no setup.py — dropping its source
# at /app makes it importable via Python's default path.
COPY aims-memory/aims_memory /app/aims_memory

# Hermes service source
COPY runtime/hermes /app/

EXPOSE 8080

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
