# FOAI / The Deploy Platform — Comprehensive Delta Audit
## For Third-Party Review & Assessment
## Generated: April 2, 2026

---

## PURPOSE

This document provides a complete overview of The Deploy Platform (deploy.foai.cloud) — its codebase, services, integrations, and operational state. It is structured for a third-party AI agent or auditor to assess the platform, identify gaps, and recommend improvements.

**Question for the reviewer:** Given everything this platform currently provides and can do, what would you do differently? Where are the architectural weaknesses? What's over-engineered? What's missing? How would you get this to production-grade, one-click-deployable, white-label-ready state?

---

## 1. PLATFORM OVERVIEW

**What it is:** An AI-powered autonomous workforce platform. Users describe what they need, and a hierarchy of AI agents plans, builds, and delivers it. The platform sells access to this workforce via subscriptions ($7–$499/month).

**Primary domain:** deploy.foai.cloud (customer-facing)
**Operations domain:** cti.foai.cloud (owner-only)
**Infrastructure:** VPS (Hostinger, 31.97.133.29) + GCP Cloud Run + Neon Postgres + Firebase Auth

**Tech stack:**
- Frontend: Next.js 15 (App Router, Turbopack, TypeScript)
- Backend: Next.js API routes (40 endpoints) + 7 FastAPI microservices on Cloud Run
- Database: Neon Postgres (pgvector for semantic search)
- Auth: Firebase Authentication (Google OAuth, email/password, magic link)
- Payments: Stripe (subscriptions, webhooks, usage metering)
- LLM: OpenRouter (sole provider, 20+ models available)
- Image gen: Gemini 2.5 Flash Image, Flux, OpenAI via OpenRouter
- Voice: ElevenLabs, Grok Voice, NVIDIA Personaplex, Gemini TTS
- Deployment: Docker + Traefik (VPS), Cloud Run (GCP)

---

## 2. AGENT HIERARCHY

### Tier 1 — Executive
| Agent | Role | Runtime | Status | Model |
|-------|------|---------|--------|-------|
| ACHEEVY | Digital CEO — routes all requests, maintains memory, oversees operations | Next.js API route (/api/chat) | OPERATIONAL | nvidia/nemotron-3-super-120b-a12b:free |
| Consult_Ang | Fast responder in Guide Me mode — acknowledges, clarifies, handles simple requests | Next.js (guide-me-engine.ts) | OPERATIONAL | qwen/qwen3-next-80b-a3b-instruct:free |
| Note_Ang | Session recorder — tracks intent, patterns, action items (background) | Next.js (guide-me-engine.ts) | OPERATIONAL (ephemeral — lost on restart) | nvidia/nemotron-nano-9b-v2:free |

### Tier 2 — Boomer_Angs (Department Heads)
| Agent | Role | Runtime | Cloud Run URL | Status |
|-------|------|---------|---------------|--------|
| Scout_Ang | Research & Intelligence — web scraping, market data, lead discovery | FastAPI | scout-ang-apbgyi35aq-uc.a.run.app | OPERATIONAL |
| Content_Ang | Content Operations — SEO, social, blog, newsletters | FastAPI | content-ang-apbgyi35aq-uc.a.run.app | OPERATIONAL |
| Biz_Ang | Business Development — pipeline, leads, outreach, CRM | FastAPI | biz-ang-apbgyi35aq-uc.a.run.app | OPERATIONAL |
| Ops_Ang | Operations — health monitoring, audits, budgets | FastAPI | ops-ang-apbgyi35aq-uc.a.run.app | OPERATIONAL |
| Edu_Ang | Education & Sales — enrollment, affiliates, commissions | FastAPI | edu-ang-apbgyi35aq-uc.a.run.app | OPERATIONAL |
| CFO_Ang | Finance — LUC metering, billing, cost tracking | FastAPI | cfo-ang-apbgyi35aq-uc.a.run.app | OPERATIONAL |
| Iller_Ang | Creative Director — design briefs, text-to-image prompts | FastAPI | iller-ang-apbgyi35aq-uc.a.run.app | PARTIAL (chat only, no image gen endpoint) |
| BuildSmith | The Builder — scaffolds, codes, deploys | Registry only | N/A | NOT IMPLEMENTED as standalone service |
| Picker_Ang | The Selector — agent routing, task scoring | Registry only | N/A | NOT IMPLEMENTED as standalone service |
| Code_Ang | Full-Stack Coder — writes, reviews, tests code | Registry only | N/A | NOT IMPLEMENTED as standalone service |

### Tier 3 — Tactical (Chicken Hawk + Lil_Hawks)
| Agent | Role | Runtime | Status |
|-------|------|---------|--------|
| Chicken Hawk | Tactical Commander — dispatches Lil_Hawks | OpenClaw (VPS Docker) | RUNNING but not wired to ACHEEVY dispatch |
| Lil_Deep_Hawk | Deep research | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Memory_Hawk | Memory management | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Flow_Hawk | Workflow automation | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Viz_Hawk | Data visualization | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Blend_Hawk | Integration specialist | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Sand_Hawk | Sandbox execution | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Trae_Hawk | Training/fine-tuning | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Coding_Hawk | Coding tasks | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Build_Hawk | Build tasks | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Graph_Hawk | Graph/visualization | OpenClaw sub-agent | AVAILABLE via OpenClaw |
| Lil_Back_Hawk | Backend ops | OpenClaw sub-agent | AVAILABLE via OpenClaw |

### Supporting Services
| Service | Role | Runtime | Status |
|---------|------|---------|--------|
| OpenClaw | RuntimeAng — data ingestion, execution engine | Docker (VPS) | RUNNING, not wired to cti-hub |
| NemoClaw | GuardAng — concurrent analysis, security scanning | Cloud Run | RUNNING, health-checked only |
| Hermes | LearnAng — report refinement, quality loops | Cloud Run | RUNNING, health-checked only |
| MCP Gateway | Tool exposure for IDE integration | Docker (VPS) | RUNNING, 17 tools defined |
| Money Engine (CFO_Ang) | LUC metering, billing backend | Cloud Run | OPERATIONAL |

---

## 3. CODEBASE STRUCTURE

```
foai/
├── cti-hub/                          # Main Next.js application
│   ├── src/
│   │   ├── app/                      # Next.js App Router
│   │   │   ├── (dashboard)/          # Authenticated routes (chat, agents, billing, etc.)
│   │   │   ├── api/                  # 40 API endpoints
│   │   │   ├── deploy-landing/       # Landing page (deploy.foai.cloud root)
│   │   │   ├── meet/                 # Agent intro pages (house-of-ang, chicken-hawk)
│   │   │   ├── plug/                 # Demo plug pages (perform, teacher, smb-marketing, finance)
│   │   │   ├── grammar/              # NTNTN Engine standalone page
│   │   │   ├── about/                # About page with agent tiles
│   │   │   └── auth/                 # Login, signup, callback, redeem
│   │   ├── components/               # React components
│   │   │   ├── chat/                 # Chat UI (MessageBubble, AttachmentMenu, SkillsMenu, etc.)
│   │   │   ├── landing/              # LiveSandbox, VerbSpinner, PlugGallery
│   │   │   ├── voice/                # VoiceBar (TTS + STT)
│   │   │   └── circuit-box/          # Admin panels (19 panels)
│   │   ├── lib/                      # Core logic
│   │   │   ├── acheevy/              # ACHEEVY agent, guide-me-engine, auto-research
│   │   │   ├── ai/                   # OpenRouter client
│   │   │   ├── grammar/              # NTNTN converter (Smart Translate)
│   │   │   ├── memory/               # Neon store + semantic recall + embeddings
│   │   │   ├── image/                # Multi-model image generation
│   │   │   ├── video/                # Seedance 2.0 video pipeline
│   │   │   ├── budget/               # LUC budget tracking
│   │   │   ├── agents/               # Agent registry + dispatch
│   │   │   ├── skills/               # 19 executive skills with system contexts
│   │   │   └── subscription/         # Stripe tier management
│   │   ├── hooks/                    # useAuth, useMarketplace, useQuota, etc.
│   │   └── context/                  # AuthProvider (Firebase + session cookie)
│   ├── public/                       # Static assets (favicons, hero images, agent portraits)
│   ├── Dockerfile                    # Production Docker image
│   └── docker-compose.yml            # VPS deployment config
│
├── app/                              # Boomer_Ang FastAPI services
│   ├── scout_ang/main.py             # Research agent
│   ├── biz_ang/main.py               # Business development agent
│   ├── content_ang/main.py           # Content operations agent
│   ├── ops_ang/main.py               # Operations monitor (5-min health checks)
│   ├── edu_ang/main.py               # Education/sales agent
│   ├── cfo_ang/main.py               # Finance agent (LUC engine)
│   └── iller_ang/main.py             # Creative director agent
│
├── aims-tools/                       # Shared utilities
│   └── luc/luc_engine.py             # Liquid Utility Credits calculation
│
├── aims-memory/                      # Agent memory schemas
│   └── aiplug/                       # Marketplace catalog specs
│
├── acheevy/                          # ACHEEVY standalone (II Agent integration)
│   ├── agent-009/                    # II Agent fork
│   └── ii-agent/                     # Intelligent Internet agent
│
├── mcp_gateway/                      # MCP tool server (SSE + HTTP)
├── GRAMMAR/                          # Standalone NTNTN runtime
└── deer-flow/                        # DeerFlow 2.0 (multi-agent coordinator)
```

---

## 4. API ROUTES — ALL 40 ENDPOINTS

### Authentication & User Management
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/auth/session | POST/DELETE | None | Sets/clears Firebase auth cookie (7-day, httpOnly) | WORKING |
| /api/auth/provision | POST | Token | Verifies Firebase token, creates user in Neon, enforces allowlist | WORKING |
| /api/auth/profile | GET/PUT | requireAuth | User profile CRUD | WORKING |
| /api/auth/organization | GET/POST | requireAuth | Organization/workspace management | WORKING |
| /api/access-keys | GET/POST | Owner only | Generate invitation keys | WORKING |
| /api/access-keys/redeem | POST | requireAuth | Redeem invitation key for access | WORKING |

### Core Chat & AI
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/chat | POST | requireAuth | Main ACHEEVY chat — SSE streaming, memory recall, agent dispatch, Guide Me mode, Grammar mode | WORKING |
| /api/conversations | GET/POST/DELETE | requireAuth | Conversation CRUD, archiving | WORKING |
| /api/memory | GET/POST | requireAuth | Semantic memory store + recall (pgvector) | WORKING |
| /api/sources | GET/POST/DELETE | requireAuth | User data sources for memory enrichment | WORKING |

### Content Generation
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/image/generate | POST | requireAuth | Multi-model image gen (Gemini → Flux → OpenAI fallback) | WORKING |
| /api/video/generate | POST | requireAuth | Seedance 2.0 video pipeline (plan → shots → assemble) | WORKING |
| /api/research | POST | requireAuth | Brave Search integration | PARTIAL (search only, other modes "coming soon") |
| /api/scrape | POST | requireAuth | Web scraping via Firecrawl + Apify | WORKING |

### Voice
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/voice/synthesize | POST | requireAuth | TTS via ElevenLabs/Grok/NVIDIA (multi-vendor fallback) | WORKING |
| /api/voice/transcribe | POST | requireAuth | STT via Groq Whisper | WORKING |

### Billing & Metering
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/stripe/checkout | POST | requireAuth | Create Stripe checkout session | WORKING |
| /api/stripe/webhook | POST | None (Stripe sig) | Subscription state machine (created → active → cancelled) | WORKING |
| /api/budget | GET | requireAuth | User budget balance (LUC) | WORKING |
| /api/luc/estimate | POST | requireAuth | Cost estimation before execution | WORKING |
| /api/luc/accept | POST | requireAuth | Accept cost estimate, proceed | WORKING |
| /api/paywall/* | Various | requireAuth | Tier checks, usage tracking, policy enforcement | WORKING |

### Agent Management
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/agents | GET | requireAuth | List available agents with capabilities | WORKING (tier detection hardcoded) |
| /api/agents/activity | GET | requireAuth | Agent activity logs | WORKING |
| /api/live/state | GET | requireAuth | Live Look-In — real-time agent state aggregation | WORKING |

### Infrastructure
| Route | Method | Auth | What It Does | Status |
|-------|--------|------|-------------|--------|
| /api/healthz | GET | None | System health check (OpenRouter, Google, Firebase, Neon) | WORKING |
| /api/sandbox | POST | requireAuth | Cloud Run sandbox code execution | WORKING |
| /api/upload | POST | requireAuth | File upload and ingestion | WORKING |
| /api/workspace | GET/PUT | requireAuth | User workspace data | WORKING |

---

## 5. DATABASE SCHEMA (Neon Postgres)

| Table | Columns (key) | Purpose | Row Count (est.) |
|-------|---------------|---------|-----------------|
| conversations | id, user_id, title, status, created_at, updated_at | Chat sessions | ~500 |
| messages | id, conversation_id, user_id, role, agent_name, content, metadata | Chat turns | ~5,000 |
| memory | id, user_id, content, summary, embedding (vector), source_type, source_id | Semantic memory for recall | ~2,000 |
| memory_sources | id, user_id, source_type, title, content, metadata | User-uploaded data sources | ~100 |
| profiles | id, user_id, display_name, avatar_url, tier, metadata | User profiles | ~50 |
| subscriptions | id, user_id, stripe_subscription_id, status, tier, current_period_end | Stripe state | ~30 |
| allowed_users | id, email, role, is_active, invited_by | Access control (allowlist) | ~50 |
| access_keys | id, key, is_active, redeemed_by, created_at | Invitation codes | ~20 |
| organizations | id, name, owner_id, created_at | Workspace tenants | ~5 |
| organization_memberships | id, organization_id, user_id, role | RBAC | ~10 |
| budget_ledger | id, user_id, action, cost, metadata, created_at | Cost tracking per action | ~3,000 |

**Extensions:** pgvector (semantic search), uuid-ossp

---

## 6. FEATURE DELTA — CURRENT STATE vs. TARGET STATE

### OPERATIONAL (Works end-to-end)
| Feature | Current State | Target State | Gap |
|---------|--------------|-------------|-----|
| Chat with ACHEEVY | Streaming SSE, memory recall, 20+ models | Same + dispatch to all agents | Dispatch only partially wired |
| Guide Me (3-party) | Consult_Ang + ACHEEVY + Note_Ang working | Same + persistent sessions + voice greeting | Note_Ang sessions lost on restart |
| Firebase Auth | Google OAuth, email/password, magic link, session cookies | Same | Auto-refresh on 401 added but untested at scale |
| Stripe Billing | Checkout, webhooks, subscription lifecycle | Same + usage-based billing | Usage metering exists but not tied to Stripe |
| Image Generation | Gemini + Flux + OpenAI with fallback chain | Same + Iller_Ang as API endpoint | Iller_Ang only does chat, not image gen |
| Video Generation | Seedance 2.0 pipeline (plan → shots) | Same + assembly + distribution | Individual shots work, full assembly TBD |
| Voice I/O | TTS (3 vendors) + STT (Groq Whisper) | Same + voice-first greeting | Greeting not implemented |
| Semantic Memory | pgvector embeddings, recall by similarity | Same + cross-session persistence for Guide Me | Note_Ang sessions ephemeral |
| Web Scraping | Firecrawl + Apify | Same | Working |
| LUC Metering | Cost tracking per action, budget limits | Same + auto-top-up | Auto-top-up not built |
| Agent Registry | 19 skills, dispatch to Cloud Run services | Same + all agents dispatchable | Only 6 Boomer_Angs on Cloud Run |

### PARTIALLY BUILT (Framework exists, not fully wired)
| Feature | Current State | Target State | Gap |
|---------|--------------|-------------|-----|
| OpenClaw (Chicken Hawk) | Running on VPS, has Telegram/Discord, web tools | Wired as Chicken Hawk dispatch engine, Lil_Hawks execute via OpenClaw | Not connected to ACHEEVY/cti-hub |
| NemoClaw (GuardAng) | Running on Cloud Run, health-checked by Ops_Ang | Concurrent analysis engine, security scanning | Monitored only, not called |
| Hermes (LearnAng) | Running on Cloud Run, health-checked by Ops_Ang | Report refinement loop agent, quality control | Monitored only, not called |
| AutoResearch | Evaluates every 10th turn, scores quality | Auto-applies improvements, persistent feedback loop | Evaluation only, no auto-application |
| Multi-tenancy | DEFAULT_TENANT concept, Firestore scoped by tenant_id | Full white-label: custom domains, branding, tenant switching | Framework only, single tenant "cti" |
| MCP Gateway | 17 tools defined, SSE streaming, API key auth | All agents + tools accessible from any IDE | Running, but edge cases remain |
| Agent Dispatch | ACHEEVY can route to Boomer_Angs via /api/agents | Full dispatch chain: ACHEEVY → Boomer_Angs → Chicken Hawk → Lil_Hawks | Only top-level dispatch works |
| Smart Translate (NTNTN) | Converts plain language → technical spec | Same + auto-confirm + seamless execution | Manual confirmation step still required |

### NOT IMPLEMENTED (Referenced but no code)
| Feature | Current State | Target State | Gap |
|---------|--------------|-------------|-----|
| DeerFlow 2.0 | Mentioned in registry, repo exists at foai/deer-flow | Multi-agent coordination for complex workflows | Zero integration code |
| LangGraph | Package installed (v1.2.2), never imported | Workflow orchestration for multi-step agent tasks | Unused dependency |
| II Agent / II Commons / II Researcher | Repos exist at foai/acheevy/ii-agent | ACHEEVY powered by Intelligent Internet tools | Not wired to production ACHEEVY |
| Common Ground Core | Repo exists at tmp_repo_study | Cross-agent consensus mechanism | Not integrated |
| White-label UI | — | Tenant switching, branding, custom domains | No UI exists |
| PDF Export | — | Downloadable reports from completed work | Not built |
| Audit Logging | — | Full data access audit trail for compliance | Not built |
| Key Rotation | — | Automated API key rotation for all services | Not built |
| DoD Security Alignment | — | NIST 800-53 controls, FedRAMP-ready posture | Not started |

### DEMO PLUGS — Current vs. Target
| Plug | Current State | Target State |
|------|--------------|-------------|
| Per|Form 2026 | Static site at perform.foai.cloud with real OpenClaw data (50 prospects) | Full interactive draft board, podcast engine, white-label API |
| Teacher's Digital Twin | Basic page with synthetic data at /plug/teacher | Full classroom UI, Arabic/English + Russian/English translation, parent portal, teacher dashboard, student logins |
| SMB Marketing Agency | Basic page with synthetic data at /plug/smb-marketing | Full bakery marketing dashboard, real content calendar, competitor monitoring, social post generation |
| Finance Command Center | Basic page with synthetic data at /plug/finance | Full transaction tracker, subscription monitor, PDF weekly briefings, anomaly detection |

---

## 7. SECURITY POSTURE

### What's in Place
- All 40 API routes require authentication (except /healthz and /stripe/webhook)
- Firebase ID tokens verified server-side via Admin SDK
- Stripe webhooks cryptographically signed
- Rate limiting: chat (30 req/min), Stripe (5 req/min)
- Owner-only routes protected by email allowlist
- Database queries scoped to user_id (no cross-user data access)
- HTTPS everywhere via Traefik + Let's Encrypt
- Security headers: X-Content-Type-Options, X-Frame-Options, X-XSS-Protection, Strict-Transport-Security

### What's Missing
- No API key rotation mechanism
- No audit logging for data access events
- No penetration testing performed
- No vulnerability scanning in CI/CD
- LLM API keys in some client-accessible code paths
- No rate limiting on image/video generation endpoints
- No content moderation on user inputs (beyond basic length checks)
- No RBAC beyond owner/beta-tester/member
- No secrets management (HashiCorp Vault or equivalent)
- No container image scanning (Trivy/Snyk)
- No network policies between Docker containers on VPS

---

## 8. INFRASTRUCTURE MAP

### VPS (myclaw-vps, 31.97.133.29)
```
Docker containers running:
├── cti-hub-cti-1          (Next.js app, port 3000) → deploy.foai.cloud + cti.foai.cloud
├── openclaw-sop5-openclaw-1 (OpenClaw runtime)     → app.myclaw.foai.cloud
├── chicken-hawk-gateway-1  (Chicken Hawk gateway)   → port 8000
├── mcp_gateway-mcp-1      (MCP tool server)        → port 8090
├── voice_relay-voice-1    (Voice relay)
├── foai-web-1             (nginx, static assets)    → foai.cloud
├── perform-web-1          (nginx, Per|Form)         → perform.foai.cloud
├── traefik-traefik-1      (Reverse proxy, SSL)     → all domains
├── coolify-coolify-1      (Deployment manager)     → port 8000 local
├── myclaw-okai-1          (MyClaw app)             → port 3001
├── myclaw-studio-1        (MyClaw studio)          → port 3000
└── ollama.service         (Local LLM, systemd)
```

### GCP Cloud Run (project: foai-aims)
```
Services:
├── scout-ang              → Research agent
├── biz-ang                → Business development
├── content-ang            → Content operations
├── ops-ang                → Operations monitor
├── edu-ang                → Education/sales
├── cfo-ang (money-engine) → Finance/LUC
├── iller-ang              → Creative director
├── hermes-agent           → Quality/learning
├── nemoclaw-service       → Security/analysis
├── openclaw-service       → Runtime (Cloud Run mirror)
├── lil-agent-hawk through lil-viz-hawk → 11 Lil_Hawk services
└── live-look-in-state     → Agent state aggregation
```

### External Services
| Service | Purpose | Auth Method |
|---------|---------|-------------|
| OpenRouter | All LLM calls (20+ models) | Bearer token |
| Firebase | Auth, Firestore, Analytics | Service account key |
| Neon Postgres | Primary database | Connection string (SSL) |
| Stripe | Payments, subscriptions | Secret key + webhook signing |
| Firecrawl | Web scraping | API key |
| Apify | Web scraping (fallback) | API token |
| Brave Search | Research queries | API key |
| ElevenLabs | Text-to-speech | API key |
| Google Gemini | Image generation, embeddings | API key |

---

## 9. COST STRUCTURE

### Current Monthly Costs (Estimated)
| Item | Cost |
|------|------|
| Hostinger VPS (myclaw) | ~$15/month |
| GCP Cloud Run (all services) | ~$20-30/month (min instances: 0) |
| Neon Postgres (free tier) | $0 |
| Firebase (free tier) | $0 |
| OpenRouter (LLM calls) | $10-50/month (depends on usage) |
| Stripe | 2.9% + $0.30 per transaction |
| Domain (foai.cloud) | ~$15/year |
| **Total** | **~$50-100/month** |

### Target Monthly Costs (Per|Form + full platform)
| Item | Cost |
|------|------|
| GCP (full Per|Form stack) | $55-87/month |
| VPS | $15/month |
| OpenRouter (demo plugs, free models) | $0 |
| CFBD API | $10/month |
| **Total** | **~$80-112/month** |

---

## 10. QUESTIONS FOR THE REVIEWER

1. **Architecture:** Is the Next.js API routes + FastAPI microservices split the right pattern? Should we consolidate or further decompose?

2. **Agent dispatch:** ACHEEVY currently dispatches via HTTP to Cloud Run services. Should we use Google ADK's sub_agents pattern instead? A2A protocol? Or keep the current HTTP dispatch?

3. **Memory:** We have pgvector for semantic recall + in-process Map for Guide Me sessions. Is this sufficient? Should we add Redis for short-term state? A dedicated vector DB (Pinecone/Weaviate)?

4. **OpenClaw integration:** OpenClaw runs on the VPS with Telegram/Discord/web tools. How should it connect to the ACHEEVY dispatch chain? Direct HTTP? Message queue? A2A?

5. **Multi-tenancy:** The tenant framework exists (DEFAULT_TENANT, Firestore scoping) but is single-tenant. What's the fastest path to production multi-tenancy — Row-Level Security in Neon, or Cloudflare for SaaS with tenant routing?

6. **Security:** Given the DoD alignment goal, what's the minimum viable security posture we need before accepting paying customers? NIST 800-53? FedRAMP Tailored? SOC 2 Type I?

7. **Cost optimization:** We're running 24 Cloud Run services with min_instances: 0. Is this the right approach? Should some be consolidated? Should the VPS handle more?

8. **Demo plugs:** The 4 demo plugs (Per|Form, Teacher, SMB Marketing, Finance) need to look like real applications. Should they be separate deployments (like perform.foai.cloud) or embedded within the main app?

9. **White-labeling:** For the "one-click deployment" vision — Cloudflare for SaaS, Kubernetes, or Cloud Run multi-region? What's the simplest path that scales?

10. **What would you do differently?** If you were building this platform from scratch with the same goals, what architectural decisions would you change?

---

*FOAI Platform Delta Audit — Generated by Claude Opus 4.6*
*April 2, 2026*
*For third-party review and assessment*
