---
name: prototype-gate
description: "Use when a feature affects UI, workflow, chat composition, orchestration, or agent behavior and must be translated into Vision, Mission, Objective, terminology alignment, and an ASCII prototype before implementation."
---

# Prototype Gate

Use this skill before implementation when the request changes any of the following:

- UI layout or chat shell behavior
- workflow or multi-step user flow
- orchestration between this repo and the external orchestrator repo
- terminology alignment or prompt reconstruction behavior
- data-source composition or session context behavior

## Required output order

1. Vision
2. Mission
3. Objective
4. Terminology Alignment
5. ASCII Prototype
6. Plan
7. Blast Radius
8. Acceptance Criteria
9. Risks

## Terminology Alignment

Before planning, extract layman terms from the request and map them to approved product primitives when possible.

Preferred vocabulary:

- Data Source Catalog
- Context Pack
- Working Notebook
- Session Snapshot
- Technical Knowledge Index
- Lay-to-Technical Lexicon
- Build Intent Resolver
- Prompt Reconstruction Layer
- Data Source Registry
- Sandbox Control Plane
- Session Memory Store
- Bottom Composer Bezel
- Composer Toolbar
- Voice Capture Toggle
- Attachment Trigger
- Model Selector
- Data Source Picker
- Speech Output Toggle
- Prompt Composer
- Send Action

If a requested term conflicts with the approved vocabulary, note the conflict and continue using the approved term in the implementation plan.

## ASCII Prototype Rules

- Produce an ASCII prototype before code changes for any UI or workflow task.
- Keep the first prototype structurally accurate rather than decorative.
- Preserve approved placement rules, especially for the Bottom Composer Bezel.
- If chat is involved, render the label exactly as `CHAT W/ ACHEEVY`.
- If relevant, show where the Data Source Picker, Model Selector, and Speech Output Toggle live.

## Blast Radius Checklist

Call out:

- files likely to change in this repo
- contracts that affect the external orchestrator repo
- persistence impacts
- migration or compatibility risks

## Acceptance Criteria Template

Use acceptance criteria that verify:

- the intended UI or workflow contract is explicit
- terminology is aligned to approved primitives
- repo boundaries are preserved
- durable session expectations are not violated
- validation steps are concrete and testable
