# Chat w/ ACHEEVY — Interface Redesign Spec

**Date:** 2026-03-28
**Status:** Approved
**Route:** `/chat`

## Overview

Redesign the Chat w/ ACHEEVY interface to production-grade quality with: a `+` attachment menu with 7 input sources, a three-tier execution system (Premium / Bucket List / LFG), LUC cost estimation on every job, real SSE streaming, and multimodal file uploads. All internal tool names, model names, and agent names are hidden from users.

## Design Decisions

- Tier selector lives inside the `+` menu, not the input bar. Once selected, it persists for the session. The input bar shows a read-only tier indicator.
- LUC popup appears before every job execution with ACCEPT / ADJUST / STOP. After the 3rd estimate in a session, an auto-accept toggle is revealed.
- LUC estimates always run on a free model (MiniMax M2.5 or equivalent). The estimate itself costs the user nothing.
- Users never see model names, tool names, or agent names. Cost breakdowns use plain language ("AI analysis & response", "Web research", "Summary & formatting").
- "The Deploy Platform" branding appears subtly in the input bar status line.

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
- `POST /api/luc/estimate` — Takes task description, tier, and context. Returns cost breakdown with service names (user-friendly, not model names), estimated tokens, and total cost. Always uses a free model for estimation.
- `POST /api/luc/accept` — User accepted the estimate. Begins execution.
- `POST /api/luc/adjust` — User wants to change parameters (tier, scope). Returns new estimate.
- `POST /api/luc/stop` — User cancelled. No execution, no charge.
- `GET /api/luc/receipt/:jobId` — Returns actual cost breakdown after execution with estimate vs actual comparison.

### Frontend Component: LUC Popup
- Modal overlay that appears before every job execution
- Header: "LUC" label + estimated total cost + active tier badge
- Body: "WHAT'S INCLUDED" table with service descriptions and costs (no model names)
- Actions: ACCEPT (primary) / ADJUST (secondary) / STOP (tertiary)
- After 3rd estimate in a session: auto-accept toggle appears at the bottom ("Auto-accept estimates this session")
- When auto-accept is on, LUC still runs estimates but executes immediately. User can toggle off at any time.

### Frontend Component: LUC Receipt
- Collapsible section attached to every ACHEEVY response
- Collapsed: shows "COST BREAKDOWN" label, total cost, and estimate variance (e.g., "15% under estimate" in green)
- Expanded: shows per-service cost breakdown (same user-friendly labels as estimate)

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
