# GRAMMAR

GRAMMAR converts plain-language requests into structured technical prompts.

Primary product flow:

1. User lands on `/`
2. User opens `Chat w/ ACHEEVY`
3. User types or speaks a request in normal language
4. ACHEEVY returns a structured prompt block the user can copy into another AI system

## Stack

- Next.js 15 App Router
- React 19
- TypeScript
- Tailwind CSS
- InsForge for auth and data access
- OpenRouter for text generation
- ElevenLabs / NVIDIA PersonaPlex / Grok adapters for voice replies
- Stripe for subscriptions

## Core Routes

- `/` public landing page
- `/chat/librechat` main product experience
- `/pricing` and `/(dashboard)/pricing` billing surfaces
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

Default local app URL:

- `http://localhost:3000`

## Validation

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
```

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

## Current Launch Standard

Before deploying, verify:

1. Stripe checkout creates a live Checkout Session.
2. Stripe webhook is configured with the correct signing secret.
3. Voice vendors are configured in the target environment.
4. NotebookLM credentials are valid.
5. `npm run lint`, `npx tsc --noEmit`, `npm test`, and `npm run build` pass in the deployment environment.
