---
name: "Data source and notebook rules"
description: "Use when working on sources, context packs, notebooks, retrieval, RAG, registry contracts, or session context persistence."
applyTo: "frontend/**/*source*.*,frontend/**/*context*.*,frontend/**/*notebook*.*,frontend/**/*rag*.*,frontend/**/*retriev*.*,src/**/*source*.*,src/**/*context*.*,src/**/*notebook*.*,src/**/*rag*.*,src/**/*retriev*.*"
---

# Data-source rules

- The Data Source Registry is the source of truth.
- Notebook providers are adapters.
- Context Packs are reusable assets.
- A Working Notebook is composed per session.
- Persist the Session Snapshot outside the sandbox.
- Never make the notebook provider the only source of durable state.
