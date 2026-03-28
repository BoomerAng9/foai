# =========================================================================
# A.I.M.S. Plug Engine — Container Port/URL Lifecycle Manager
# Manages dynamic port allocation for container plug instances.
# Exposed on: 10.0.0.2:4200
# =========================================================================
FROM node:20-alpine AS base

RUN apk add --no-cache curl docker-cli

WORKDIR /app

COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY src/ ./src/

ENV NODE_ENV=production \
    PORT=4200

EXPOSE 4200

HEALTHCHECK --interval=15s --timeout=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:4200/health || exit 1

CMD ["node", "src/index.js"]
