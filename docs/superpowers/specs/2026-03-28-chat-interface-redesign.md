# Chat w/ ACHEEVY — Interface Redesign Spec

**Date:** 2026-03-28
**Status:** Approved
**Route:** `/chat`

## Overview

Redesign the Chat w/ ACHEEVY interface to production-grade quality with: a `+` attachment menu with 7 input sources, a three-tier execution system (Premium / Bucket List / LFG), LUC cost estimation on every job, real SSE streaming, and multimodal file uploads. All internal tool names, model names, and agent names are hidden from users.

## Design Decisions

- Tier selector lives inside the `+` menu, not the input bar. Once selected, it persists for the session. The input bar shows a read-only tier indicator. Only available to users with a subscription — pay-per-use users get the default path.
- LUC popup appears before every job execution with ACCEPT / ADJUST / STOP. After the 3rd estimate in a session, an auto-accept toggle is revealed.
- LUC estimates ALWAYS run on a free model. No exceptions, even for LFG tier estimation. The estimate itself costs the user nothing.
- Users never see model names, tool names, or agent names. Cost breakdowns use plain language ("AI analysis & response", "Web research", "Summary & formatting").
- "The Deploy Platform" branding appears subtly in the input bar status line.
- LUC popup shows BOTH token impact AND dollar cost so users overstand the true cost of what they're requesting.

## Revenue & Access Model

### Two entry points — subscription or pay-per-use:

**Subscription users:**
- Full cost breakdown in real-time during execution
- Full Purchase Order with line items after execution
- Tier selector available (can toggle Premium / Bucket List / LFG)
- Needs Analysis (Guide Me) and Manage It modes both available
- 5 use cases delivered with every aiPLUG (can prompt for more using free model, no charge)

**Pay-per-use users (no subscription):**
- See total cost only — no breakdown
- Simple receipt of purchase (not a full Purchase Order)
- Surcharge added on top of actual API costs (OpenRouter + other services) — this is the revenue margin
- Default execution path only (no tier toggle)
- 5 use cases delivered with every aiPLUG

**No account:**
- Simple receipt of purchase
- No cost breakdown
- No execution history

**Dev stage:** All costs covered internally. Fees are simulated but never prompt payment to anyone. Payment integration comes later.

## Process Gating — RFP to BAMARAM

Every job follows the RFP → BAMARAM pipeline:
- Charter (customer-facing artifact) — what the user sees
- Ledger (internal audit artifact) — full cost basis, margins, model names, routing logic
- Model names, markup percentages, internal rates, and partner deals are NEVER in the Charter
- Purchase Order goes to: ledger, logs, and user account

## aiPLUG Delivery

Every aiPLUG ships with:
- **Needs Analysis summary** (if Guide Me path was used) — this is as important as the Plug itself
- **5 Use Case summary** — auto-generated, delivered with the aiPLUG
- User can prompt for additional use cases (uses free model, no token charge)
- BAMARAM seal on completion

## Execution Tiers

### Premium
- Cost: ~$0.01-0.05 per task
- Models: Budget/free tier (Qwen 3.5 Flash, Llama 4 Scout, DeepSeek V3.2, MiniMax M2.5 free)
- Mode: Manage It (autonomous)
- Agents: Solo ACHEEVY or Lil_Hawks
- LUC behavior: Cost shown after execution (it's pennies)
- Best for: Quick searches, content drafts, data cleaning, simple builds

### Bucket List
- Cost: ~$0.10-0.50 per task
- Models: Mid-tier (GPT-5.4 Mini, Claude Haiku 4.5, Gemini 3.1 Pro, MiniMax M2.7, Claude Sonnet 4.6)
- Mode: Guide Me (ACHEEVY asks qualifying questions before executing)
- Agents: Boomer_Angs + Lil_Hawks (coordinated)
- LUC behavior: Estimate shown before execution, breakdown shown after
- Best for: Research reports, competitive analysis, business plans, app prototypes

### LFG
- Cost: Open budget, cost-agnostic
- Models: Every model available — Claude Opus 4.6, GPT-5.4 Pro, GPT-5.4, Grok 4.20, Gemini 3.1 Pro, o4 Mini, DeepSeek R1, and any others LUC decides to chain
- Mode: Manage It (full autonomous) — Harness 2.0 multi-model chaining
- Agents: Full fleet — ACHEEVY + Chicken Hawk + Boomer_Angs + Lil_Hawks + AutoResearch QA
- LUC behavior: Full manifest shown before execution (every service, every cost, every agent), actual breakdown shown after with estimate vs actual comparison
- Best for: Full app builds, multi-source research briefs, production deployments

## + Attachment Menu

Popover opens from the `+` button. Seven sources in three groups:

### Group 1: Files
- **Add files or photos** — Opens OS file picker. Accepted: images, PDFs, text, CSV, JSON, MD, DOC/DOCX, XLS/XLSX. Max 5 files. Files upload to R2/GCS and are sent as multimodal content to vision-capable models.
- **Take a screenshot** — Uses `navigator.mediaDevices.getDisplayMedia()` to capture screen. Converts to image attachment.

### Group 2: Integrations
- **Google Drive** — Opens Google Picker API modal (requires OAuth consent). User browses and selects files. Selected files are downloaded and attached.
- **GitHub** — Opens a repo/file browser using GitHub API (already authenticated as BoomerAng9). User selects files or code snippets.

### Group 3: Intelligence
- **Skills** — Opens submenu of registered prompt templates from the skills registry. Selecting a skill injects its template into the conversation context.
- **Deep Research** — Opens submenu with three options:
  - **Search** — Find sources and answers (Brave AI + Firecrawl Search under the hood)
  - **Crawl** — Extract content from an entire site (Firecrawl Crawl)
  - **Extract** — Pull structured data from a page (Firecrawl Agent)

### Group 4: Execution Tier
- **Premium / Bucket List / LFG** — Session-persistent tier selector. Active tier shows checkmark. Changing tier updates the read-only indicator in the input bar.

## LUC Integration

### Backend API
LUC needs its own backend service with these endpoints:
- `POST /api/luc/estimate` — Takes task description, tier, and context. Returns both token impact AND dollar cost. Always uses a free model for estimation — never paid. Service names are user-friendly (no model names). For pay-per-use users, returns total only. For subscribers, returns full breakdown.
- `POST /api/luc/accept` — User accepted the estimate. Begins execution. Creates a job entry in the ledger.
- `POST /api/luc/adjust` — User wants to change parameters (tier, scope). Returns new estimate.
- `POST /api/luc/stop` — User cancelled. No execution, no charge. Logged in ledger as cancelled.
- `GET /api/luc/receipt/:jobId` — Returns Purchase Order for subscribers (full breakdown with token + dollar costs) or simple receipt for pay-per-use users (total only). Model names never included in either format.

### Dual-Artifact System (Charter/Ledger)
Every LUC job produces two artifacts:
- **Charter** (customer-facing) — sent to user account. Shows services used, token counts, and costs in plain language. No model names, no margins, no internal rates.
- **Ledger** (internal audit) — logs actual model names, API costs, routing decisions, margins, and surcharges. Never exposed to users. Used for internal auditing and revenue tracking.

### Pay-Per-Use Surcharge
For users without a subscription, a surcharge is applied on top of actual API costs (OpenRouter + Brave + Firecrawl + any other service). This surcharge is the revenue margin. The user sees only the final total — never the base cost or surcharge breakdown separately.

### Frontend Component: LUC Popup
- Modal overlay that appears before every job execution
- Header: "LUC" label + estimated total cost + active tier badge
- Body: "WHAT'S INCLUDED" table with service descriptions and costs (no model names)
- Actions: ACCEPT (primary) / ADJUST (secondary) / STOP (tertiary)
- After 3rd estimate in a session: auto-accept toggle appears at the bottom ("Auto-accept estimates this session")
- When auto-accept is on, LUC still runs estimates but executes immediately. User can toggle off at any time.

### Frontend Component: LUC Receipt
- Collapsible section attached to every ACHEEVY response
- **Subscriber view (expanded):** "COST BREAKDOWN" label, per-service breakdown (tokens + dollars), estimate vs actual variance, full Purchase Order
- **Pay-per-use view (collapsed):** Total cost only, no breakdown. Simple receipt.
- **No account view:** Total cost, receipt format, no history saved

## Real Streaming (SSE)

### Backend Changes (`/api/chat/route.ts`)
- Add `stream: true` to OpenRouter request
- Return a `ReadableStream` that pipes SSE chunks from OpenRouter to the client
- Each chunk: `data: {"content": "token text", "done": false}\n\n`
- Final chunk includes usage metadata: `data: {"content": "", "done": true, "usage": {...}}\n\n`

### Frontend Changes
- Replace fake character-by-character reveal with `ReadableStream` reader
- Use `response.body.getReader()` + `TextDecoder` to read SSE chunks
- Append each chunk's content to the message in real-time
- On final chunk, update message metadata (tokens, cost, model)

## File Upload Pipeline

1. User selects file(s) via `+` menu or drag-and-drop
2. Frontend generates preview (image thumbnail or file icon + name + size)
3. On send: files upload to R2 (or GCS) via `POST /api/upload`
4. Upload returns URL(s)
5. URLs are included in the chat API request
6. Backend constructs multimodal message with file content for vision-capable models
7. For non-image files (PDF, CSV, etc.): extract text content server-side before sending to LLM

## Input Bar Layout

Bottom to top:
1. **Status line** (read-only): Active tier LED + tier name | "LUC active" or "LUC AUTO" | "The Deploy Platform"
2. **Input row**: `+` button | textarea ("Message ACHEEVY...") | send button
3. **Attachment previews** (when files attached): horizontal row of file chips with type icon, name, size, and remove button

## Message Rendering

- **User messages**: "YOU" label, message text, attachment chips below
- **ACHEEVY messages**: "ACHEEVY" label, response text (streamed), collapsible LUC receipt below
- Per-message metadata hidden by default inside the LUC receipt (tokens, cost, estimate variance)
- No model names, no agent names visible to users

## IP Protection Rules (from CLAUDE.md)

Never expose in user-facing text:
- Model names (DeepSeek, Gemini, GPT, Qwen, MiniMax, Claude, Grok)
- Tool names (Firecrawl, Apify, Brave, OpenRouter, fal.ai)
- Agent names (Scout_Ang, Content_Ang, Chicken Hawk, Lil_Hawks, Boomer_Angs)
- LUC routing logic or internal infrastructure details

Users see: task descriptions, quality outcomes, cost breakdowns in plain language.

## Files to Create/Modify

### New Files
- `src/app/api/luc/estimate/route.ts` — LUC estimate endpoint
- `src/app/api/luc/accept/route.ts` — LUC accept endpoint
- `src/app/api/luc/adjust/route.ts` — LUC adjust endpoint
- `src/app/api/luc/stop/route.ts` — LUC stop endpoint
- `src/app/api/luc/receipt/[jobId]/route.ts` — LUC receipt endpoint
- `src/app/api/upload/route.ts` — File upload endpoint (R2/GCS)
- `src/components/chat/AttachmentMenu.tsx` — The `+` popover menu
- `src/components/chat/LucPopup.tsx` — LUC estimate modal
- `src/components/chat/LucReceipt.tsx` — Collapsible cost receipt
- `src/components/chat/TierSelector.tsx` — Tier picker inside `+` menu
- `src/components/chat/DeepResearchMenu.tsx` — Deep Research submenu
- `src/components/chat/FilePreview.tsx` — Attachment preview chips
- `src/lib/luc/client.ts` — LUC API client functions
- `src/lib/luc/types.ts` — LUC TypeScript types
- `src/lib/upload/client.ts` — File upload client

### Modified Files
- `src/app/(dashboard)/chat/page.tsx` — Major rewrite: SSE streaming, attachment menu integration, tier state, LUC popup flow
- `src/app/api/chat/route.ts` — Add SSE streaming, file URL handling, tier-aware model selection
- `src/lib/acheevy/agent.ts` — Accept tier parameter, support multimodal messages, return streaming response
