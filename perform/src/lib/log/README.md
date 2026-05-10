# Logging conventions (SHIP-CHECKLIST Gate 5 · Item 32)

Short guidance for anyone adding a `console.log` / `console.error` to `perform/src`.

## Never log

- Raw email addresses (use `emailHash()` from `./redact`)
- API keys, bearer tokens, cookies, session IDs of third parties
- Webhook secrets, Stripe secret keys, Firebase private keys
- Full request bodies (they may contain submitter fields)
- Full response bodies from upstream vendors without truncation

## Safe to log

- Tagged prefixes: `[webhook]`, `[tts-router]`, `[tokens/checkout]` etc.
- Error classes / status codes
- Internal IDs (Firebase UID, submission UUID, perform_player_id)
- Operation booleans (`credited=true`, `is_unlimited=false`)
- Tier and subscription_status values

## Patterns

**Error path, unknown payload shape**
```ts
import { redact } from '@/lib/log/redact';
catch (err) {
  console.error('[my-module]', redact({ op: 'do-thing', err, input }));
}
```

**Correlating a user without exposing email**
```ts
import { emailHash } from '@/lib/log/redact';
console.log(`[upload] who=${emailHash(auth.email)} size=${bytes}`);
```

## Audit history

- 2026-04-22 (Gate 5 μ): 82 console.log/error/warn calls scanned across 30+
  files. No direct email / token / secret / cookie leaks found. Redactor
  helper added for defense-in-depth on future additions.
