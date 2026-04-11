# DeerFlow 2.0 — Telemetry Strip Log

**Date**: 2026-04-10
**Gate**: Wave 2, Gate 2 telemetry strip
**Commit stripped**: `092bf13f5e1b3f9f76c08a332051b4bb76257107`

## Modules stripped

### 1. tracing/factory.py — LangSmith + Langfuse callback factories
- **Original**: Called `langchain_core.tracers.langchain.LangChainTracer` (phones home to `api.smith.langchain.com`) and `langfuse.Langfuse` (phones home to `cloud.langfuse.com`)
- **Action**: Replaced with no-op `build_tracing_callbacks()` that returns `[]`
- **Type safety**: Maintained — return type `list[Any]` preserved

### 2. config/tracing_config.py — LangSmith + Langfuse config classes
- **Original**: `LangSmithTracingConfig`, `LangfuseTracingConfig`, `TracingConfig` with env var readers for `LANGSMITH_*`, `LANGFUSE_*`, `LANGCHAIN_*`
- **Action**: Replaced with no-op `TracingConfig` stub. All public functions preserved with no-op returns
- **Type safety**: Maintained — all function signatures preserved

### 3. community/infoquest/infoquest_client.py — ByteDance InfoQuest proprietary client
- **Original**: HTTP POST calls to `reader.infoquest.bytepluses.com` and `search.infoquest.bytepluses.com` (ByteDance/BytePlus proprietary search service)
- **Action**: Replaced with no-op stub class returning descriptive error messages
- **Type safety**: Maintained — class API preserved

### 4. pyproject.toml — langfuse dependency
- **Original**: `"langfuse>=3.4.1"` in dependencies
- **Action**: Commented out with strip annotation

### 5. .env.example — External service credentials
- **Removed**: `INFOQUEST_API_KEY`, `FEISHU_APP_ID`, `FEISHU_APP_SECRET`, `SLACK_BOT_TOKEN`, `SLACK_APP_TOKEN`, `TELEGRAM_BOT_TOKEN`, `WECOM_BOT_ID`, `WECOM_BOT_SECRET`, `LANGSMITH_*`, `VOLCENGINE_API_KEY`, `NOVITA_API_KEY`, `MINIMAX_API_KEY`, `VLLM_API_KEY`
- **Action**: Stripped to only model provider keys relevant to ACHIEVEMOR stack

### 6. agents/lead_agent/agent.py — Comment reference
- **Original**: Comment `"# Inject run metadata for LangSmith trace tagging"`
- **Action**: Changed to `"# Inject run metadata for internal trace tagging"`

## Grep verification (post-strip)

Searched patterns: `telemetry`, `analytics`, `TIAMAT`, `usage_data`, `phone_home`, `posthog`, `mixpanel`, `sentry`, `datadog`, `segment.io`, `amplitude`, `heap.io`, `hotjar`, `fullstory`

**Result**: Zero matches (clean)

External HTTP endpoints remaining: Only model provider APIs (OpenAI, Anthropic, Google, DeepSeek) which are the configured model providers for the agent harness.
