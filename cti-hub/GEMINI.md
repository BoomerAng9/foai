# GEMINI.md

> Project instructions for Google Gemini Code Assist / Gemini CLI / Antigravity.

**grammar** — A software project.

## Project Rules

@.ai/rules/*.md

## Antigravity Agent Kit
This project uses the **Antigravity Agent Kit** for collaborative jobs and context-aware agent behaviors.
- Use `npx agentkit` for rule and skill management.
- Integration: **Gemini Embeddings 2** (`gemini-embedding-2-preview`) for multimodal memory.

## InsForge UI Build
Use **InsForge** agents to expedite UI building within the `agenticui-nextui` framework.
- CLI: `@insforge/cli`
- Purpose: Automated backend provisioning and rapid UI prototyping.

## Architecture Decisions & Memory

- `.ai/decisions/` — Architecture Decision Records (ADRs) with context and rationale
  - `ADR-001`: **NotebookLM TLI Integration**. Using Google's Research API for deep context indexing in parallel with GLM-5.
  - `ADR-002`: **InsForge Paywall Tiering**. Hardware-accelerated research queries gated by Pro/Enterprise subscriptions.
- `.ai/changelog/` — Monthly change logs with context, reasoning, and impact
- `.ai/skills/` — Portable skill definitions — read and execute `.ai/skills/<name>/skill.md` when triggered
- `.ai/memory/` — Shared memory files (debugging patterns, known issues, refactoring log)
- `.specs/` — PRD、设计、Epic、Story — 通过 /spec 管理

## Launch Manifest (v1.0-RC)

- [x] **Research Lab**: Multimodal context ingestion (Docs/Video/URLs) + Deep Query.
- [x] **Paywall**: Stripe-integrated Pro/Enterprise tiers.
- [x] **White-Labeling**: Real-time theme injection via InsForge.
- [x] **TLI Infrastructure**: SQL schema for context packs and history persistence.
- [x] **Multi-Tenancy**: Organizations + Membership + RLS isolation.
- [x] **Onboarding**: Customer setup flow and automatic profile provisioning.
- [x] **MIM Policy Manager**: Governance framework for interpretable and operational laws.
- [ ] **Stripe Production Keys**: Awaiting production secret injection.
- [ ] **NotebookLM API Key**: Awaiting production key injection in `.env.local`.

## 交互语言

所有 AI 回复、代码注释、commit message 和文档一律使用 **中文**。
