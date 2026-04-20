# ============================================================================
# Per|Form Cloud Run image — Next.js 15 standalone build
# ============================================================================
# Build context: foai/ monorepo root (NOT perform/) so file:../aims-tools/*
# workspace dependencies resolve. Submit via:
#   gcloud builds submit --config=perform/cloudbuild.yaml \
#     --ignore-file=perform/cloudbuild.gcloudignore --project=foai-aims foai/
# ============================================================================

# ── deps stage ──────────────────────────────────────────────────────────────
# Install npm deps with workspace siblings present so file:../aims-tools/*
# entries in perform/package.json resolve correctly.
FROM node:20-alpine AS deps
WORKDIR /workspace

# Workspace siblings first — must be present BEFORE npm ci so file: deps work.
COPY aims-tools/tie-matrix ./aims-tools/tie-matrix
COPY aims-tools/spinner    ./aims-tools/spinner

# Install perform's deps; npm ci will install + symlink the workspace siblings.
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

# Next.js standalone output already bundles needed node_modules.
COPY --from=builder /workspace/perform/public                       ./public
COPY --from=builder --chown=nextjs:nodejs /workspace/perform/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /workspace/perform/.next/static     ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
