# Stage 1: Build React frontend
FROM node:22-slim AS frontend
WORKDIR /build
COPY frontend/package.json frontend/package-lock.json* ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Python backend + static assets
FROM python:3.12-slim
WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY main.py .
COPY --from=frontend /build/dist ./static

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
