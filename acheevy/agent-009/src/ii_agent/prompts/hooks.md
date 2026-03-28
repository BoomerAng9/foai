# Hooks Layer (Event-Driven Best Practices)

## Trigger Design

- Use explicit trigger conditions and minimal side effects.
- Keep hooks idempotent where feasible.
- Ensure hooks are safe to re-run after partial failures.

## Reliability

- Add bounded retries with jitter for transient failures.
- Emit structured events for traceability.
- Capture compensating actions for critical workflows.

## Security and Guardrails

- Enforce allowlist-based hook activation.
- Reject unknown trigger sources by default.
- Never execute user-provided paths or shell fragments directly.
