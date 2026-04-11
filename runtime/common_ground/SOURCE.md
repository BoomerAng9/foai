# CommonGround — Vendored Subtree

| Field | Value |
|-------|-------|
| **Upstream** | `Intelligent-Internet/CommonGround` |
| **Commit** | `9e8346f` (2026-04-10 shallow clone) |
| **License** | Apache 2.0 |
| **Vendored** | `core/`, `services/` (observer, agent_worker, api, judge, pmo) |
| **Stripped** | OTel telemetry (`infra/observability/otel.py`), Docker/infra, tests, tools services, UI worker |
| **Purpose** | Agent observation protocol + event bus for Live Look In |

## 7-Gate Sanitization

1. **License** — Apache 2.0. PASS. Full commercial use permitted.
2. **Telemetry** — OpenTelemetry in `infra/observability/otel.py`. NOT vendored. Noop stubs remain in-tree (graceful fallback). PASS.
3. **Secrets/Keys** — No hardcoded secrets. API keys loaded from env vars only. PASS.
4. **Model provider leaks** — Provider refs only in test files (not vendored). PASS.
5. **External endpoints** — NATS messaging (configurable). No phone-home. PASS.
6. **Dependencies** — Pydantic, NATS (optional). No supply-chain risk. PASS.
7. **Code quality** — Well-structured Pydantic models, clean event protocol. PASS.

All 7 gates PASSED.
