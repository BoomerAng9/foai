# FOAI Host Surfaces

`cti-hub` is the shared Next.js application behind two FOAI host surfaces:

- `https://cti.foai.cloud` → `CTI Hub`, the owner/operator control surface
- `https://deploy.foai.cloud` → `The Deploy Platform`, the customer-facing deployment surface

Host-aware middleware, metadata, and shared chrome keep those surfaces connected in one codebase while routing them through distinct entry paths.

Primary product flow:

1. User lands on the host root or a product surface such as `/chat`
2. The host resolves into CTI Hub or Deploy Platform branding and route policy
3. ACHEEVY routes requests across chat, broadcast, partner, and deployment surfaces
4. The app persists tenant-scoped state and calls the configured model, media, and billing backends

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- Firebase Auth + Firebase Admin
- Neon Postgres via `postgres.js`
- OpenRouter for text generation
- ElevenLabs / NVIDIA PersonaPlex / Grok adapters for voice replies
- Stripe for subscriptions

## Core Routes

- `/` host-aware entry point:
  `cti.foai.cloud` rewrites to `/chat`
  `deploy.foai.cloud` rewrites to `/deploy-landing`
- `/chat` shared authenticated workspace
- `/deploy-landing` deploy-only public landing page
- `/pricing` CTI billing surface
- `/billing` Deploy billing surface
- `/api/chat` prompt-generation API
- `/api/voice` voice vendor catalog and synthesis API
- `/api/research` NotebookLM-backed research API
- `/api/stripe/checkout` Stripe Checkout Session creation
- `/api/stripe/webhook` Stripe subscription lifecycle updates

## Environment

Copy `.env.example` to a local env file and fill in the required values.

Minimum required for a working local app:

- `NEXT_PUBLIC_INSFORGE_URL`
- `NEXT_PUBLIC_INSFORGE_ANON_KEY`
- `INSFORGE_API_KEY`
- `OPENROUTER_KEY` or `OPENAI_API_KEY`

Required for billing:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `NEXT_PUBLIC_STRIPE_PRO_PRICE_ID`

Required for voice vendors:

- `ELEVENLABS_API_KEY` for ElevenLabs
- `GROK_VOICE_*` values for Grok voice
- `NVIDIA_PERSONAPLEX_*` values for NVIDIA PersonaPlex

Required for NotebookLM grounding:

- `GCP_PROJECT_ID`
- `NOTEBOOKLM_ACCESS_TOKEN` or `NOTEBOOKLM_API_KEY`

## Local Development

```bash
npm install
npm run dev
```

Default local app URL is `http://localhost:3000`, which resolves to CTI behavior unless you provide a deploy-style host header locally.

## Validation

```bash
npm run validate
npm run validate:deploy
```

`npm run validate` is the local/operator gate.
`npm run validate:deploy` is the pre-deploy gate for Docker, VPS, and Cloud Run rollouts.

## Database

Apply the SQL files in `sql/` to the target database. The current launch path expects:

- `001_user_management.sql`
- `002_research_lab.sql`
- `003_data_sources.sql`
- `multi_tenant_schema.sql`
- `policies.sql`

## Security Notes

- Do not commit real secrets.
- `.env.example` is the only env template that should stay in git.
- Auth cookies are written through `/api/auth/session` as `HttpOnly`.
- Admin mutation routes, runtime routes, research routes, and voice synthesis are server-auth protected.

## Deployment Notes

- Secrets should come from local env files in development and GCP Secret Manager / bound service accounts in production.
- VPS rollouts use Docker builds and restarts.
- Cloud Run services/jobs should run the same `npm run validate:deploy` gate before image promotion.

## Current Launch Standard

Before deploying, verify:

1. Stripe checkout creates a live Checkout Session.
2. Stripe webhook is configured with the correct signing secret.
3. Voice vendors are configured in the target environment.
4. NotebookLM credentials are valid.
5. `npm run validate:deploy` passes in the deployment environment.
