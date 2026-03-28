FROM node:18-alpine AS builder
WORKDIR /app

# Install pnpm first
RUN corepack enable pnpm

# Copy only package files for dependency caching
COPY frontend/package.json frontend/pnpm-lock.yaml frontend/pnpm-workspace.yaml* ./
RUN pnpm i --frozen-lockfile

# Now copy source (frontend dir only)
COPY frontend/ .

ARG BUILD_MODE=production
ARG VITE_API_URL="http://localhost:8000"
ARG VITE_GOOGLE_CLIENT_ID=""
ARG VITE_STRIPE_PUBLISHABLE_KEY=""
ARG VITE_SENTRY_DSN=""
ARG VITE_DISABLE_CHAT_MODE="false"
ARG VITE_POLICY_DEBUG_EVENTS="false"

RUN set -e; \
    env_file=".env.${BUILD_MODE:-production}"; \
    printf '%s\n' \
      "VITE_API_URL=${VITE_API_URL}" \
      "VITE_GOOGLE_CLIENT_ID=${VITE_GOOGLE_CLIENT_ID}" \
      "VITE_STRIPE_PUBLISHABLE_KEY=${VITE_STRIPE_PUBLISHABLE_KEY}" \
      "VITE_SENTRY_DSN=${VITE_SENTRY_DSN}" \
      "VITE_DISABLE_CHAT_MODE=${VITE_DISABLE_CHAT_MODE}" \
      "VITE_POLICY_DEBUG_EVENTS=${VITE_POLICY_DEBUG_EVENTS}" \
      > "$env_file"; \
    cp "$env_file" .env

ENV NODE_OPTIONS="--max-old-space-size=8192"

RUN pnpm run build

FROM node:18-alpine AS runner
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 1420
CMD ["serve", "-s", "dist", "-l", "1420"]
