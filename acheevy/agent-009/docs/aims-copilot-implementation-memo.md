# AIMS UI + Technical Terminology Integration Memo

## Objective

Implement the AIMS authenticated chat workspace so it matches the refined AIMS dashboard direction already established in this repo, while preserving the prompt-intelligence flow and the technical terminology engine as a first-class but optional assist layer.

This memo is for a Copilot coding agent. It should operate against the current `ii-agent` repo, not rebuild the app from scratch.

## Ground Truth

- The real signed-in surface is `/chat`, not `/`.
- The live frontend is the React app in `frontend/`.
- The live backend for authenticated chat is on port `8000`.
- The prompt enhancement and terminology work already exist in this repo and must be reused, not reimagined.

## Design Intent

The desired UI is not the older dark ACHEEVY marketing shell. The target is a calmer product workspace:

- light neutral application shell
- pale gray page background
- white cards and panels
- thin neutral borders
- muted monochrome controls
- restrained shadows
- compact enterprise dashboard density
- minimal brand noise in signed-in chat surfaces

The signed-in product should feel like a serious operator console, not a glossy landing page.

## What To Study In This Repo

Use these files as the implementation source of truth for AIMS:

- `frontend/src/app/routes/chat.tsx`
- `frontend/src/components/header.tsx`
- `frontend/src/components/sidebar.tsx`
- `frontend/src/components/right-sidebar.tsx`
- `frontend/src/components/session-item.tsx`
- `frontend/src/components/search-history.tsx`
- `frontend/src/components/question-input.tsx`
- `frontend/src/components/question-file-upload.tsx`
- `frontend/src/components/question-files-preview.tsx`
- `frontend/src/components/question-submit-button.tsx`
- `frontend/src/components/chat-message-content.tsx`
- `frontend/src/components/prompt-intelligence-panel.tsx`
- `frontend/src/components/acheevy/ntntn-analyzer.tsx`
- `frontend/src/components/ai-elements/conversation.tsx`

Use these backend and service files for terminology integration behavior:

- `src/ii_agent/server/api/enhance_prompt.py`
- `src/ii_agent/utils/technical_terminology.py`
- `frontend/src/services/prompt.service.ts`

## What To Study In The ACHEEVY Reference Repo

Reference repo: `BoomerAng9/acheevy-whisper-build`

Study it for product language and orchestration concepts, not for literal visual cloning.

Relevant patterns from that repo:

- `src/services/mockOrchestrator.ts`
  - converts plain-English prompts into technical interpretation
  - produces structured outputs like SME brief, ASCII blueprint, and specialist prompts
  - reinforces a plan-first workflow instead of immediate code generation
- `src/components/PromptInput.tsx`
  - shows how the prompt composer can be framed as a guided control surface
- `src/components/AgentLog.tsx`
  - shows a dedicated orchestration activity stream
- `src/components/OutputPanel.tsx`
  - shows how generated artifacts can be displayed as explicit output objects
- `src/components/ui/sidebar.tsx`
  - useful as a compositional pattern library for sidebar structure and collapsible behavior

Do not port over the old dark branded shell from that repo. AIMS should keep the lighter authenticated dashboard direction already established here.

## Required Product Behavior

### 1. Authenticated Chat Layout

Preserve the current AIMS workspace structure:

- left navigation rail for sessions and history
- central chat workspace
- composer fixed to the chat workflow
- right utility rail where applicable

Do not regress into a single marketing-style page.

### 2. Prompt Intelligence Layer

The composer must support a guided prompt-improvement flow:

- user types naturally
- user can invoke prompt enhancement
- UI shows interpreted categories, scope, and terminology guidance
- enhanced prompt can be reviewed without disrupting the send flow

Existing components already support this. Reuse them.

### 3. Technical Terminology Engine

The terminology engine is a core feature, but it must remain optional.

Required behavior:

- keep the user-facing on/off switch in the composer
- persist the user preference locally
- when enabled, enhancement requests include terminology analysis
- when disabled, enhancement bypasses terminology extraction and returns a lightweight result
- the prompt intelligence panel should hide or gracefully reduce itself when the engine is off

### 4. Domain Vocabulary

The terminology engine should continue to cover terms across areas such as:

- computer science fundamentals
- prompt engineering
- vibe coding / agentic build workflows
- frontend systems
- backend systems
- AI agents and orchestration

Do not replace the existing catalog with a toy dictionary. Extend the current structured catalog only if there is a concrete gap.

## Visual Rules

For the signed-in AIMS chat UI:

- use neutral backgrounds instead of dark glass
- prefer white or near-white panels over tinted translucent blocks
- use subtle border separation instead of heavy glow or gradients
- keep typography crisp and product-like
- reserve accent color for sparse emphasis only
- keep session rows, utility buttons, and history lists visually quiet
- make user and assistant messages legible on light surfaces
- keep file upload, attachments, and submit controls consistent with the light system

Avoid:

- hero-page visuals in authenticated routes
- loud orange gradient branding across the whole workspace
- inconsistent component chrome between center panel and side rails
- introducing inline styles when classes or tokens will do

## Implementation Constraints

- Work incrementally on the existing files.
- Do not rewrite routing architecture.
- Do not move the chat workflow away from `/chat`.
- Do not break file attachments.
- Do not break chat submission against backend `8000`.
- Do not remove the terminology engine toggle.
- Prefer minimal, local edits over broad refactors.

## Suggested Execution Order

1. Verify frontend and backend are running.
2. Start from `frontend/src/app/routes/chat.tsx` and confirm the real authenticated route is being modified.
3. Align the shell first: header, sidebar, right rail, page background.
4. Align the central chat cards and message surfaces.
5. Align the composer and attachment controls.
6. Validate the prompt intelligence panel and terminology toggle flow.
7. Validate send, enhance, and attach-file flows end to end.
8. Run diagnostics and fix only issues introduced by the change.

## Acceptance Criteria

The task is complete when all of the following are true:

- `/chat` loads successfully
- authenticated chat submissions still work
- file attachment UI is usable and visually consistent
- the signed-in workspace reads as a light neutral dashboard
- side rails and center panel share one visual system
- terminology engine toggle works on and off
- prompt intelligence analysis still renders when enabled
- no new lint or editor diagnostics remain in edited files

## Practical Note For The Agent

If there is ambiguity between the ACHEEVY reference repo and the current AIMS repo, prefer the current AIMS runtime architecture and the current AIMS light dashboard styling. Use the ACHEEVY repo for orchestration concepts, terminology framing, and workflow inspiration, not as a literal UI transplant.
