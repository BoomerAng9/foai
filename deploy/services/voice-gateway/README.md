# @aims/voice-gateway

Node.js service for **Deploy by: ACHIEVEMOR** voice surfaces. Three
responsibilities:

1. **Groq Whisper STT** — `POST /v1/transcribe` / `POST /v1/transcribe/detailed`
2. **Inworld Realtime session tokens** — `POST /v1/spinner/session` mints a
   short-lived **Bearer JWT** the browser sends to Inworld's WSS. The root
   `INWORLD_API_KEY` stays on the server.
3. **Async Inworld voice cloning** — `POST /v1/voice/clone/async` +
   `GET /v1/voice/clone/:jobId`.

Migrated from `the-deploy-platform/DEPLOY/services/voice-gateway/` into
`foai/deploy/services/voice-gateway/` per the canonical location in
`project_deploy_platform_in_foai.md`.

## The JWT fix (v0.2.0)

**Prior behavior (pre-0.2.0):** `mintEphemeralCredential()` returned the
root `INWORLD_API_KEY` as `client_token`. That leaked the root key to
every browser that requested a session — a critical security residual
flagged in the 2026-04-17 arbitration (Gate 1a).

**Current behavior:** `mintEphemeralCredential()` signs a short-lived
JWT using the `INWORLD_JWT_SECRET` obtained from the Inworld Portal.
The browser uses that JWT as a Bearer token. Inworld validates it
server-side. **The root API key never leaves the gateway.**

If `INWORLD_JWT_SECRET` is not configured, the session-mint endpoint
refuses with a 503 + a clear log line. This fails closed rather than
silently regressing to the leak.

## Development

```bash
cd foai/deploy/services/voice-gateway
npm install
cp .env.example .env
# Edit .env — set GROQ_API_KEY, INWORLD_API_KEY, INWORLD_JWT_SECRET
npm run dev
```

## Docker

```bash
docker build -t voice-gateway .
docker run -p 3002:3002 \
  -e GROQ_API_KEY=gsk_xxx \
  -e INWORLD_API_KEY=xxx \
  -e INWORLD_JWT_SECRET=xxx \
  voice-gateway
```

## API

| Route | Purpose |
|---|---|
| `GET /health` | Liveness + configured-credentials probe |
| `POST /v1/transcribe` | Groq Whisper STT (multipart `audio` upload) |
| `POST /v1/transcribe/detailed` | STT with timestamps/segments |
| `POST /v1/spinner/session` | Mint ephemeral Inworld Realtime JWT |
| `POST /v1/spinner/tool` | Server-side tool dispatch for Realtime function calls |
| `GET /v1/spinner/tools` | List the base Spinner tool registry |
| `POST /v1/voice/clone/async` | Enqueue a voice-clone job |
| `GET /v1/voice/clone/:jobId` | Poll a voice-clone job |

## Environment

See `.env.example` for the full list. Required:

- `GROQ_API_KEY` — Groq Whisper STT
- `INWORLD_API_KEY` — server-side only, for the voice-clone POST
- `INWORLD_JWT_SECRET` — **required for `/v1/spinner/session`** to work
  post-0.2.0. Obtain from Inworld Portal.

## Canon references

- `@aims/brand-tokens` — voice surfaces are brand-compliant downstream
- `@aims/spinner` — Spinner tool registry consumed by `/v1/spinner/tool`
- `feedback_spinner_grammar_inworld_roles.md` — Inworld = multi-surface
  (LLM Router + Realtime + TTS + STT + Agent Runtime + voice clone)
- `project_deploy_platform_in_foai.md` — why this service moved into
  `foai/deploy/services/`
- `project_session_delta_2026_04_17_18_20pr_wave.md` — Gate 1a context
