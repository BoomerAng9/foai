# CLAUDE.md

**The Deploy Platform** — Your production studio with a conversational interface.

## What This Is

The Deploy Platform is the user-facing product of the FOAI-AIMS ecosystem.
Users interact with ACHEEVY (Digital CEO) and Chicken Hawk (tactical operator).
Internal tooling, model names, and integrations are never exposed to users.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Auth**: Firebase Auth (Google OAuth + invitation-based access keys)
- **Database**: Neon Postgres via postgres.js (server-side only)
- **Backend**: Cloud Run services in GCP foai-aims
- **LLM**: OpenRouter (model selection via LUC router)
- **Memory**: Gemini Embeddings + pgvector for semantic recall
- **Video**: Seedance 2.0 (flagship) via fal.ai/Kie AI
- **Scraping**: Firecrawl + Apify
- **Forms**: Paperform + Stepper
- **Payments**: Stripe

## User-Facing Names

| Internal | User Sees |
|----------|-----------|
| The app | The Deploy Platform |
| Chat input | Chat w/ ACHEEVY |
| Team page | My Squad |
| Live Look In | Operations Floor |
| Workspace Jobs | My Projects |
| Scrape/Clean/Export | Research / Organize / Deliver |
| Access Keys | Invitations |

## IP Protection

NEVER expose in user-facing text:
- Model names (DeepSeek, Gemini, GPT, Qwen, MiniMax)
- Tool names (Firecrawl, Apify, OpenRouter, fal.ai)
- Internal service names (NemoClaw, OpenClaw, Hermes)
- LUC routing logic
- API endpoints or infrastructure details

Users see: agent names, quality scores, token counts, costs. That's it.

## Rules

- All user-facing text in English
- Revenue-first: if it doesn't serve the product, it doesn't ship
- Memory persistence is mandatory: users never lose conversations or data
- Cost transparency: show tokens and cost per operation
- MIM governance: block IP violations, redirect don't refuse
