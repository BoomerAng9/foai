# ============================================================================
# Voice Gateway — Dockerfile for Cloud Run
# ============================================================================
# Groq Whisper STT + Inworld Realtime ephemeral JWT minting + async voice
# cloning. Migrated from the-deploy-platform/ into foai/deploy/services/.
# ============================================================================

FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

WORKDIR /app

# Copy package files first for better caching
COPY package.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev for building)
RUN pnpm install --frozen-lockfile || pnpm install

# Copy source
COPY src/ ./src/

# Build TypeScript
RUN pnpm run build

# Prune dev dependencies
RUN pnpm prune --prod

# ============================================================================
# Production image
# ============================================================================
FROM node:20-alpine AS production

WORKDIR /app

# Security: Install security updates
RUN apk upgrade --no-cache

# Copy built files and dependencies
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules

# Security: Run as non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001 && \
    mkdir -p /app/uploads && \
    chown -R nodejs:nodejs /app/uploads

USER nodejs

# Environment variables
ENV NODE_ENV=production
ENV PORT=8080

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

CMD ["node", "dist/index.js"]
