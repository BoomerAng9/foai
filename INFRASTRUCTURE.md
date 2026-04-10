# INFRASTRUCTURE.md — myclaw-vps Live Services

> Generated: 2026-04-10 | VPS: srv1492108 (myclaw-vps) | Disk: 43% used (41G/96G)

## Reverse Proxy

| Container | Image | Purpose |
|-----------|-------|---------|
| traefik-traefik-1 | traefik:latest | Edge router, TLS termination (Let's Encrypt), domain routing |

## Live Services

| Container | Image | Domain | Port | Purpose | Key Env Vars |
|-----------|-------|--------|------|---------|-------------|
| perform-perform-1 | perform-perform | perform.foai.cloud | 3000 | Per\|Form sports data platform (Next.js) | DATABASE_URL, DIRECT_URL, GEMINI_API_KEY, BRAVE_API_KEY, FAL_KEY, ELEVENLABS_API_KEY, DEEPGRAM_API_KEY, GROK_API_KEY, IDEOGRAM_API_KEY, KIE_AI_API_KEY, HF_TOKEN, FIREBASE_* |
| cti-hub-cti-1 | cti-hub-cti | cti.foai.cloud, deploy.foai.cloud | 3000 | CTI Hub + Deploy Platform (Next.js) | DATABASE_URL, GEMINI_API_KEY, FAL_KEY, FAL_API_KEY, ELEVENLABS_API_KEY, DEEPGRAM_API_KEY, KIE_AI_API_KEY, FIRECRAWL_API_KEY, OPENROUTER_API_KEY, ACHEEVY_V1_*, FIREBASE_*, OWNER_EMAILS, PAPERFORM_ACCESS_TOKEN |
| myclaw-okai-1 | myclaw-okai | ok.foai.cloud | 3000 (mapped 3001) | OPEN\|KLASS AI (Next.js) | ANTHROPIC_API_KEY, OPENAI_API_KEY, GOOGLE_API_KEY, BRAVE_API_KEY, DEEPSEEK_API_KEY, TAVILY_API_KEY, NEXT_PUBLIC_FIREBASE_*, ASR/TTS_OPENAI_* |
| blockwise-web-1 | nginx:alpine | block.foai.cloud | 80 | Blockwise AI static site | (nginx only) |
| foai-web-1 | nginx:alpine | foai.cloud, www.foai.cloud | 80 | foai.cloud main landing page | (nginx only) |
| foai-assets-nginx | nginx:alpine | foai.cloud (assets), partners.foai.cloud | 80 | Static assets + partners redirect | (nginx only) |
| myclaw-myclaw-1 | myclaw-myclaw | myclaw.foai.cloud, app.myclaw.foai.cloud | 80 (mapped 8090) | MyClaw personal dashboard | (nginx only) |

## Infrastructure Services

| Container | Image | Domain | Port | Purpose | Key Env Vars |
|-----------|-------|--------|------|---------|-------------|
| openclaw-sop5-openclaw-1 | ghcr.io/hostinger/hvps-openclaw:latest | (internal) | — | OpenClaw AI assistant + secret store | GEMINI_API_KEY, BRAVE_API_KEY, FAL_KEY, ELEVENLABS_API_KEY, DEEPGRAM_API_KEY, GROK_API_KEY, FIRECRAWL_API_KEY, HF_TOKEN, KIE_AI_API_KEY, NVIDIA_API_KEY, OXYLABS_AISTUDIO_API_KEY, C1_API_KEY, OPENCLAW_GATEWAY_TOKEN, DISCORD_BOT_TOKEN |
| mcp_gateway-mcp-1 | mcp_gateway-mcp | mcp.foai.cloud | 8090 | MCP Gateway (SSE + HTTP tool server) | ACHEEVY_URL, CHICKEN_HAWK_URL, CTI_HUB_URL, MCP_DEV_API_KEY |
| voice_relay-voice-1 | voice_relay-voice | voice.foai.cloud | — | Voice relay proxy (routes to Boomer_Ang endpoints) | GOOGLE_KEY, BIZ_ANG_URL, CFO_ANG_URL, CONTENT_ANG_URL, EDU_ANG_URL, OPS_ANG_URL, SCOUT_ANG_URL |

## Domain Routing Summary

| Domain | Target |
|--------|--------|
| foai.cloud / www.foai.cloud | foai-web-1 |
| perform.foai.cloud | perform-perform-1 |
| cti.foai.cloud | cti-hub-cti-1 |
| deploy.foai.cloud | cti-hub-cti-1 |
| ok.foai.cloud | myclaw-okai-1 |
| block.foai.cloud | blockwise-web-1 |
| mcp.foai.cloud | mcp_gateway-mcp-1 |
| voice.foai.cloud | voice_relay-voice-1 |
| myclaw.foai.cloud | myclaw-myclaw-1 |
| app.myclaw.foai.cloud | myclaw-myclaw-1 |
| partners.foai.cloud | foai-assets-nginx (redirect) |

## Notes

- All services use Traefik with Let's Encrypt TLS (certresolver)
- OpenClaw container holds the canonical secret store -- pull keys with `docker exec openclaw-sop5-openclaw-1 printenv KEY_NAME`
- Per|Form (perform-perform-1) is LIVE production -- never stop without coordination
- CTI Hub serves both cti.foai.cloud and deploy.foai.cloud from the same container
- partners.foai.cloud is a redirect, scheduled for retirement (merge into cti.foai.cloud)
