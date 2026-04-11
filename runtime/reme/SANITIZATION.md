# ReMe Sanitization Report — 7-Gate Audit

## Audit Date: 2026-04-10
## Source: agentscope-ai/ReMe @ 9663ee3dbcc4d69931b501a6f64040f66366afae
## Verdict: REJECTED — Custom implementation built instead

---

## Gate 1: Telemetry & Analytics

**FAIL** — Multiple telemetry vectors identified:
- `dashscope` SDK (Alibaba Cloud) is a hard dependency — sends API calls to Alibaba infrastructure
- AgentScope integration (`agentscope==1.0.18`) includes CoPaw telemetry paths
- `flowllm[reme]` — Alibaba orchestration framework with unknown telemetry

## Gate 2: Network Egress Audit

**FAIL** — Outbound hosts found:

| Host | Type | Risk |
|------|------|------|
| `bailian.console.aliyun.com` | Alibaba Cloud console | Data exfiltration risk |
| `help.aliyun.com` | Alibaba help docs | Low (documentation) |
| `help-static-aliyun-doc.aliyuncs.com` | Alibaba CDN | Medium (asset loading) |
| `img.alicdn.com` | Alibaba CDN | Medium (tracking pixels possible) |
| `hf-mirror.com` | Chinese HuggingFace mirror | Medium (model downloads rerouted) |
| `huggingface.co` | HuggingFace | Low (expected for embeddings) |
| `api.openai.com` | OpenAI | Low (expected for LLM calls) |
| `11.160.132.46:6333` | Internal Alibaba IP (Qdrant) | HIGH — hardcoded internal endpoint |
| `11.160.132.46:8200` | Internal Alibaba IP (Elasticsearch) | HIGH — hardcoded internal endpoint |

## Gate 3: Alibaba Cloud SDK Calls

**FAIL** — Direct Alibaba service integrations:
- `reme/core/tools/search/dashscope_search.py` — DashScope web search API
- `reme/core/as_llm/` — AgentScope LLM wrapper (routes through Alibaba)
- `reme/core/as_llm_formatter/` — AgentScope message formatting
- `reme/core/utils/agentscope_utils.py` — AgentScope utility functions
- `pyobvector` dependency — OceanBase (Alibaba database) vector store

## Gate 4: Dependency Audit

**FAIL** — Problematic dependencies:
- `dashscope>=1.25.1` — Alibaba Cloud LLM/embedding SDK (HARD dep, not optional)
- `pyobvector>=0.1.20` — OceanBase vector client (Alibaba database)
- `agentscope==1.0.18` — Full AgentScope framework (optional but integrated)
- `flowllm[reme]>=0.2.0.10` — Alibaba flow orchestration (optional)
- `litellm==1.80.0` — Pinned version (optional, but LiteLLM removed per project policy)
- `chromadb>=1.3.5` — Heavy (C++ compilation, telemetry known)
- `transformers>=4.57.3` — 500MB+ download, HuggingFace telemetry
- `elasticsearch>=9.2.0` — Elastic telemetry
- `qdrant-client>=1.16.0` — Qdrant telemetry

## Gate 5: License Phone-Home

**PASS** — Apache 2.0 license, no license validation code found.

## Gate 6: Data Collection Endpoints

**FAIL** — Multiple data collection vectors:
- DashScope search tool sends queries to Alibaba
- AgentScope message formatting may log conversations
- Internal IPs suggest development against Alibaba internal infrastructure

## Gate 7: Source Provenance

**PARTIAL** — Authors are all `@alibaba-inc.com` employees. Code is open-source (Apache 2.0) but deeply coupled to Alibaba ecosystem.

---

## Summary

| Gate | Result |
|------|--------|
| 1. Telemetry | FAIL |
| 2. Network Egress | FAIL |
| 3. Alibaba SDK | FAIL |
| 4. Dependencies | FAIL |
| 5. License | PASS |
| 6. Data Collection | FAIL |
| 7. Provenance | PARTIAL |

**5 of 7 gates failed.** Vendoring this codebase would require stripping approximately 60% of the source files and all hard dependencies. The risk/reward ratio strongly favors a clean-room implementation using the same algorithmic concepts (token-ratio compaction, hybrid search, three-tier memory) without any Alibaba code.

## Custom Implementation Dependencies

The replacement implementation uses ONLY:
- `tiktoken` — OpenAI's token counter (offline after initial cache)
- `psycopg[binary]` — PostgreSQL driver for Neon
- `numpy` — Vector math (cosine similarity)
- Standard library: `hashlib`, `json`, `math`, `collections`, `re`, `uuid`, `datetime`

Zero outbound network connections at runtime (all operations are local compute + Neon database).
