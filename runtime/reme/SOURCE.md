# ReMe Memory Substrate — Source Record

## Decision: Custom Implementation

**Evaluated:** `agentscope-ai/ReMe` (https://github.com/agentscope-ai/ReMe)
- Commit: `9663ee3dbcc4d69931b501a6f64040f66366afae`
- Date audited: 2026-04-10
- Repo cloned at: 2026-04-10 (depth=1)

**Reason for rejection:** Alibaba provenance project failed 7-gate sanitization.
- 400+ Python files — massive attack surface
- `dashscope>=1.25.1` is a **hard dependency** (Alibaba Cloud LLM SDK)
- Outbound references to `*.aliyun.com`, `*.aliyuncs.com`, `img.alicdn.com`, `hf-mirror.com` (Chinese HF mirror)
- Internal IP addresses hardcoded (`11.160.132.46:6333`, `11.160.132.46:8200`)
- AgentScope integration pulls `agentscope==1.0.18` + `flowllm[reme]` (Alibaba orchestration)
- `pyobvector` dependency (OceanBase — Alibaba database)
- LiteLLM pinned at specific version
- Too many transitive dependencies to safely vendor (chromadb, elasticsearch, transformers, qdrant-client, etc.)

**Implementation:** Custom minimal ReMe-inspired memory substrate built from scratch.
- Token-ratio compaction via progressive summarization
- Hybrid search: BM25 (keyword) + cosine similarity (vector)
- Three-tier memory: short-term buffer, working memory, long-term compressed
- Per-tenant isolation via Neon PostgreSQL (`reme` schema)
- Zero external network dependencies at runtime (uses local tiktoken cache)

## Algorithms Inspired By

- ReMe paper: "Remember Me, Refine Me" — token-ratio compression, hybrid retrieval
- BM25 scoring: standard Okapi BM25 implementation
- Vector similarity: cosine similarity with optional sentence-transformers embeddings
- Progressive summarization: iterative context compression preserving key entities/facts
