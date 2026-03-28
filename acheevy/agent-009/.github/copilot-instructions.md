---
applyTo: "**"
description: "Repository-wide AIMS implementation standard for chat UI, terminology alignment, durable sessions, and repo boundary discipline."
---

# AIMS Repository Standard

This repository is a commercial software product. Every implementation must optimize for consistency, maintainability, customer trust, traceability, accessibility, and recoverability.

## Non-negotiable operating rules

- Do not guess. If requirements are vague, reduce ambiguity by restating the requirement in precise technical language before implementation.
- Do not redesign the product without instruction. Preserve approved layout, hierarchy, terminology, and interaction patterns.
- Use exact product terminology from this file. Do not substitute synonyms for named UI regions or product primitives.
- Build in small, reviewable increments. Explain what changed, why it changed, and what remains.
- Before writing code for a feature, output:
  - Vision: one sentence
  - Mission: one sentence
  - Objective: one sentence
- Before building any UI or workflow feature, produce an ASCII prototype.
- Before executing a large refactor, state the blast radius: files, modules, risks, migration concerns.
- Favor extension of existing architecture over one-off implementations.
- Keep business logic out of the UI layer.
- Treat the sandbox as disposable and the session as durable.
- Persist all critical state outside the sandbox.
- Never place important state only in memory inside a running container.
- Prefer typed interfaces, clear contracts, and explicit state transitions.
- Prefer reusable components over duplicated markup.
- Prefer deterministic flows over hidden behavior.
- Use accessible semantics, keyboard support, and responsive layouts by default.
- Treat voice-first behavior as a first-class requirement, not an enhancement.

## Product primitives

These terms are mandatory.

- Data Source Catalog: the user-facing library of reusable sources.
- Context Pack: a reusable bundle of sources, artifacts, and guidance.
- Working Notebook: the session-specific composition of selected Context Packs.
- Session Snapshot: the persisted record of active context, tools, artifacts, and state.
- Technical Knowledge Index: the canonical technical terminology knowledge base.
- Lay-to-Technical Lexicon: the mapping from plain language to canonical technical terms.
- Build Intent Resolver: the engine that infers what the user is trying to build.
- Prompt Reconstruction Layer: the layer that rewrites user language into build-ready prompts.
- Data Source Registry: the system of record for sources, artifacts, permissions, versions, and adapters.
- Sandbox Control Plane: the system that provisions, renews, monitors, and destroys execution environments.
- Session Memory Store: the durable store for chat history, summaries, retrieval context, and checkpoints.

## Mandatory workflow for every feature

1. Restate the feature in implementation language.
2. Run terminology alignment:
   - extract layman phrases
   - map them to canonical technical terms
   - identify ambiguities
3. Identify whether the request changes:
   - UI
   - workflow
   - data model
   - orchestration
   - sandbox/session lifecycle
   - knowledge sources
4. Produce an ASCII prototype.
5. Produce a short implementation plan.
6. Implement the smallest complete increment.
7. Validate against acceptance criteria.
8. Report:
   - files changed
   - risks
   - follow-up work
   - persistence implications

## Chat UI standard

The chat shell must be described and implemented using these exact names:

- Bottom Composer Bezel: the docked composer shell at the bottom of the thread.
- Composer Toolbar: the inline controls inside the bezel.
- Prompt Composer: the multiline text input.
- Voice Capture Toggle: the microphone control.
- Attachment Trigger: the file attachment control.
- Model Selector: the inline model switcher.
- Data Source Picker: the inline selector for Context Packs and data sources.
- Speech Output Toggle: the read-aloud on/off control.
- Send Action: the submit control.

## Literal UI requirements

- Render this label exactly: `CHAT W/ ACHEEVY`
- Keep the Model Selector inside the Bottom Composer Bezel.
- Keep the Data Source Picker inside the Bottom Composer Bezel.
- Do not move the Model Selector to the top app bar.
- Do not move the Data Source Picker to the top app bar.
- The default chat shell must include:
  - Voice Capture Toggle
  - Attachment Trigger
  - Model Selector
  - Data Source Picker
  - Speech Output Toggle
  - Prompt Composer
  - Send Action

## Voice-first requirements

- Voice input is a default interaction path.
- Assistant speech output is on by default and may be toggled off by the user.
- Support live transcription.
- Support barge-in.
- Support voice activity detection.
- Support device selection and permission handling.
- Do not ship a silent-text-first experience unless explicitly requested.

## Data-source architecture rules

- The Data Source Registry is the source of truth.
- Notebook providers are adapters, not the master record.
- Context Packs are reusable and user-selectable.
- A Working Notebook is composed per session from selected Context Packs.
- Session Snapshot must persist active selections and artifacts outside the sandbox.

## Design constraints

- Use a standard shell first, then style it.
- Do not invent layout patterns during implementation.
- Prefer familiar, production-ready SaaS structures:
  - dashboards
  - portals
  - tables
  - cards
  - lists
  - split panes
  - inspector drawers
- Use consistent spacing, typography, and control placement.
- Do not mix unrelated visual styles in the same surface.

## Engineering constraints

- Prefer TypeScript for app code.
- Prefer modular services with explicit contracts.
- Use durable persistence for chat history, artifacts, and checkpoints.
- Do not couple orchestration logic directly into the website repo.
- Keep the bridge thin and versioned.
- The website requests actions; the orchestrator decides and executes them.

## Build and test commands

- Frontend install: `cd frontend && pnpm install`
- Frontend dev: `cd frontend && pnpm dev`
- Frontend build: `cd frontend && pnpm build`
- Frontend lint: `cd frontend && pnpm lint`
- Frontend format: `cd frontend && pnpm format`
- Frontend desktop dev: `cd frontend && pnpm tauri dev`
- Python install: `poetry install` or equivalent environment install from `pyproject.toml`
- Backend dev: `uvicorn ii_agent.server.app:create_app --factory --reload --port 8000`
- Python tests: `pytest tests/`
- Full production-like stack: `docker compose --project-name ii-agent-stack --env-file docker/.stack.env -f docker/docker-compose.stack.yaml up`

## Architecture boundaries

- `frontend/`: React, TypeScript, Vite, and Tauri customer-facing client surfaces.
- `src/ii_agent/`: primary backend, APIs, orchestration, agents, storage, and session logic.
- `src/ii_sandbox_server/`: sandbox lifecycle service, isolated execution, delayed lifecycle queueing, and timeout control.
- `src/ii_tool/`: MCP and tool-serving integration layer.
- `docker/`: stack orchestration, local production-style wiring, PostgreSQL, Redis, frontend, backend, and sandbox runtime.
- `docs/`: operator and deployment documentation. Prefer runbooks here over stale handoff notes.
- `include/aims/`: separate AIMS planning and implementation subtree. Treat it as a distinct product/subproject unless the task explicitly targets it.

## Repository conventions and pitfalls

- The real authenticated workspace is `/chat`; do not treat `/` as the primary signed-in chat surface.
- Use the live backend on port `8000` for real runtime flows. Port `8002` appears in test/demo utilities and should not be treated as the production path unless the task explicitly targets the test harness.
- Treat `include/aims/` as separate from the root `ii-agent` runtime. Do not conflate AIMS planning artifacts with the active root application unless the request explicitly spans both.
- Prefer current runbooks, compose files, and active app code over old handoff or memo files when sources disagree.
- Frontend lint is strict and fails on warnings; avoid introducing unused imports, unused locals, or formatting drift.
- Changes to dependency manifests or container wiring may require rebuilding Docker images instead of only restarting containers.
- For chat, terminology, session, voice, or data-source work, also follow the scoped files under `.github/instructions/` instead of duplicating those rules here.

## Canonical references

- Root product and operator setup: `README.md`
- Production deployment workflow: `docs/II_AGENT_DEPLOYMENT_RUNBOOK.md`
- Frontend structure and scripts: `frontend/README.md` and `frontend/package.json`
- Python dependencies and entry points: `pyproject.toml`
- Frontend-specific rules: `.github/instructions/frontend.instructions.md`
- Data-source and notebook rules: `.github/instructions/data-sources.instructions.md`
- Voice-first rules: `.github/instructions/voice-chat.instructions.md`

## Output format for all implementation responses

Always return:
1. Vision
2. Mission
3. Objective
4. ASCII Prototype (if UI or workflow related)
5. Plan
6. Implementation Notes
7. Validation Notes
8. Risks
