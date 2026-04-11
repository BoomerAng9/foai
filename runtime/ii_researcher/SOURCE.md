# ii-researcher — Vendored Subtree

| Field | Value |
|-------|-------|
| **Upstream** | `Intelligent-Internet/ii-researcher` |
| **Commit** | `2956256` (2026-04-10 shallow clone) |
| **License** | Apache 2.0 |
| **Vendored** | `ii_researcher/` (cli, config, reasoning, tool_clients) |
| **Stripped** | Docker configs, frontend, examples, benchmarks, MCP server |
| **Purpose** | Research agent for Scout_Ang — search + extract + summarize |

## 7-Gate Sanitization

1. **License** — Apache 2.0. PASS. Full commercial use permitted.
2. **Telemetry** — None found (only tool_history tracking internal to agent). PASS.
3. **Secrets/Keys** — API keys loaded from env vars (TAVILY_API_KEY, JINA_API_KEY, SERPAPI_API_KEY, OPENAI_API_KEY). No hardcoded values. PASS.
4. **Model provider leaks** — OpenAI client used as base (OpenAI-compatible endpoint pattern). Provider name in internal client file only, not user-facing. PASS with note: wrap via research_client.py to abstract.
5. **External endpoints** — Search providers (Tavily, Jina, SerpAPI) all configurable. PASS.
6. **Dependencies** — requests, tavily, openai SDK. Manageable. PASS.
7. **Code quality** — Clean async agent with ReAct loop, structured models. PASS.

All 7 gates PASSED.
