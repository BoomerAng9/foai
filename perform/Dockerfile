# ============================================================================
# Per|Form Cloud Run image — Next.js 15 standalone build
# ============================================================================
# Build context: foai/ monorepo root (NOT perform/) so file:../aims-tools/*
# workspace dependencies resolve. Staged via /tmp/perform-build-stage/ (only
# perform + aims-tools/{tie-matrix, spinner, aims-pricing-matrix, aims-pmo})
# and submitted with cloudbuild.yaml.
#
# Workspace dep graph (file: links):
#   perform        -> @aims/{tie-matrix, spinner}
#   tie-matrix     -> zod
#   spinner        -> zod, ws, @aims/{pricing-matrix, pmo}
#   pricing-matrix -> zod, postgres
#   pmo            -> zod, postgres
# Deepest-first install order: pricing-matrix, pmo -> tie-matrix, spinner ->
# perform. Each `npm install` materializes the file: symlinks for the layer
# above it.
# ============================================================================

# ── workspace-deps stage ────────────────────────────────────────────────────
# Install each raw-TS workspace package's own deps so its node_modules is
# populated. Symlinks for sibling @aims/* packages are created during the
# install (npm follows file:../ paths).
FROM node:20-alpine AS workspace-deps
WORKDIR /workspace

# Copy workspace package sources first (sibling order matters for file: deps)
COPY aims-tools/aims-pricing-matrix ./aims-tools/aims-pricing-matrix
COPY aims-tools/aims-pmo            ./aims-tools/aims-pmo
COPY aims-tools/tie-matrix          ./aims-tools/tie-matrix
COPY aims-tools/spinner             ./aims-tools/spinner

# Deepest-first install. --no-audit --no-fund keep logs clean.
RUN cd aims-tools/aims-pricing-matrix && npm install --no-audit --no-fund \
 && cd /workspace/aims-tools/aims-pmo            && npm install --no-audit --no-fund \
 && cd /workspace/aims-tools/tie-matrix          && npm install --no-audit --no-fund \
 && cd /workspace/aims-tools/spinner             && npm install --no-audit --no-fund

# ── perform-deps stage ──────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /workspace
COPY --from=workspace-deps /workspace/aims-tools ./aims-tools

WORKDIR /workspace/perform
COPY perform/package.json perform/package-lock.json ./
RUN npm ci --production=false

# ── builder stage ───────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /workspace
COPY --from=deps /workspace/aims-tools ./aims-tools
WORKDIR /workspace/perform
COPY --from=deps /workspace/perform/node_modules ./node_modules
COPY perform/ ./
RUN npm run build

# ── runner stage ────────────────────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup --system --gid 1001 nodejs \
 && adduser  --system --uid 1001 nextjs

COPY --from=builder /workspace/perform/public                       ./public
COPY --from=builder --chown=nextjs:nodejs /workspace/perform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/perform/.next/static     ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
