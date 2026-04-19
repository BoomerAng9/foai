# syntax=docker/dockerfile:1.7
# ─────────────────────────────────────────────────────────────────────
# Destinations AI — production image for Cloud Run.
#
# Multi-stage build optimized for:
#   - small final image (~200MB, Node 20 alpine base)
#   - layer cache reuse across lockfile-only changes
#   - uses Next.js standalone output (output: 'standalone' in next.config)
# ─────────────────────────────────────────────────────────────────────

# ─── Stage 1: dependencies ──────────────────────────────────────────
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev && npm cache clean --force

# ─── Stage 2: builder (build-time deps + next build) ────────────────
FROM node:20-alpine AS builder
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .

# Public build envs — embedded into the client bundle.
ARG NEXT_PUBLIC_MAP_PROVIDER
ARG NEXT_PUBLIC_MAPTILER_KEY
ARG NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
ARG NEXT_PUBLIC_FIREBASE_API_KEY
ARG NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
ARG NEXT_PUBLIC_FIREBASE_PROJECT_ID
ARG NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
ARG NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
ARG NEXT_PUBLIC_FIREBASE_APP_ID
ARG NEXT_PUBLIC_BASE_URL

ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# ─── Stage 3: runner (minimal production image) ─────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=8080
ENV HOSTNAME=0.0.0.0

# Non-root user matches Cloud Run security guidance.
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Next standalone build ships its own node_modules and server.js
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 8080

# Cloud Run always listens on $PORT — Next standalone respects this.
CMD ["node", "server.js"]
