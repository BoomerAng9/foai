# =========================================================================
# A.I.M.S. VPS2 Monitoring Agent
# Reports Docker host health metrics back to VPS1 every 15 s.
# Exposed on: 10.0.0.2:4300
# =========================================================================
FROM node:20-alpine

RUN apk add --no-cache curl procps

WORKDIR /app
COPY package.json ./
RUN npm install --omit=dev && npm cache clean --force
COPY src/ ./src/

ENV NODE_ENV=production PORT=4300

EXPOSE 4300

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
    CMD wget -q -O /dev/null http://127.0.0.1:4300/health || exit 1

CMD ["node", "src/index.js"]
