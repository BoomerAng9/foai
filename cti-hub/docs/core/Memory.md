# Memory

GRAMMAR operates as a memory-aware iteration environment. Every step an agent takes or a response provided by the user is structured within a Context state.

## 0. Multimodal Vector Layer (New)
Leverages **Gemini Embeddings 2** (`gemini-embedding-2-preview`) to map text, vision, and audio samples into a unified semantic space for cross-modal retrieval.

## 1. Transient Context (Paging Context)
Short-term tokens tied to the current query. Paged context avoids overwhelming inference limits. Leveraging the **Antigravity Agent Kit** for context-aware behavior and collaborative job state management.

## 2. Long-term Store (Vectors)
Search structures linked via pg_trgm or pgvector pointing models to relevant historical conversations or code snippets. 

## 3. Approval Ledger
Every change order requiring human verification triggers an explicit state object requiring "Y" equivalent approvals.
