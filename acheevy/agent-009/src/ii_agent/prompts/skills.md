# Skills Layer (Industry Best Practices)

## Engineering

- Use small, composable abstractions over monolith logic.
- Validate inputs at boundaries; fail fast with actionable errors.
- Keep side effects explicit and isolated.

## API and Integration

- Use contract-first thinking for request/response payloads.
- Support retries only for safe/idempotent operations.
- Apply timeout budgets and structured error handling.

## Data and Persistence

- Use migrations and explicit schema evolution.
- Protect data integrity with transactional boundaries.
- Avoid hidden coupling between storage and domain logic.

## UI/UX Delivery

- Preserve visual consistency through shared tokens/components.
- Prefer accessibility-compliant semantics and interaction states.
- Optimize perceived performance with clear loading/error states.

## Security

- Secrets from environment only; never hardcode.
- Enforce allowlists for external URLs/resources.
- Sanitize untrusted input and constrain tool execution.
