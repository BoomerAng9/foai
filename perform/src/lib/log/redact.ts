/**
 * Log redaction helper (SHIP-CHECKLIST Gate 5 · Item 32).
 *
 * Existing console.log calls across perform/src were audited during Gate 5 μ
 * and found to be free of direct email / token / secret / cookie leaks —
 * most log a short tag + an error object, not the request body. Rather
 * than rewrite every call site, this module gives new code a drop-in
 * redactor so future logging additions don't backslide the audit.
 *
 * Usage:
 *   import { redact } from '@/lib/log/redact';
 *   console.log('[checkout]', redact({ user, session }));
 *
 * The redactor walks the object, masks values whose key matches the
 * SENSITIVE_KEYS list, and truncates long strings to prevent accidental
 * request-body dumps. Non-destructive — returns a copy.
 */

const SENSITIVE_KEY_PATTERNS: RegExp[] = [
  /password/i,
  /secret/i,
  /token/i,
  /api[_-]?key/i,
  /bearer/i,
  /^authorization$/i,
  /^cookie$/i,
  /private[_-]?key/i,
  /^email$/i,            // strip raw emails; use `emailHash` if you need to correlate
  /submitter_email/i,
  /phone/i,
  /^dob$/i,
  /webhook[_-]?secret/i,
  /stripe[_-]?secret/i,
  /ssn/i,
];

const MASK = '[REDACTED]';
const MAX_STRING_LEN = 240;

function keyIsSensitive(key: string): boolean {
  return SENSITIVE_KEY_PATTERNS.some(rx => rx.test(key));
}

type JsonLike = unknown;

/**
 * Return a safe-to-log copy of the input. Objects/arrays are walked up to
 * 5 levels deep (defensive against cycles); strings are truncated at 240
 * chars; sensitive keys are replaced with '[REDACTED]'.
 */
export function redact(input: JsonLike, depth = 0): JsonLike {
  if (depth > 5) return '[depth_limit]';
  if (input == null) return input;

  if (typeof input === 'string') {
    return input.length > MAX_STRING_LEN ? input.slice(0, MAX_STRING_LEN) + '…' : input;
  }
  if (typeof input !== 'object') return input;

  if (Array.isArray(input)) {
    return input.map(item => redact(item, depth + 1));
  }

  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (keyIsSensitive(k)) {
      out[k] = MASK;
    } else {
      out[k] = redact(v, depth + 1);
    }
  }
  return out;
}

/**
 * Best-effort email → short stable token so we can correlate events
 * without logging the address. NOT a cryptographic hash — use for grep
 * aid only, never for authorization.
 */
export function emailHash(email: string): string {
  if (!email) return 'anon';
  const [local, domain] = email.split('@');
  if (!domain) return '***';
  const localMask = local.length <= 2 ? local[0] + '*' : local[0] + '***' + local[local.length - 1];
  return `${localMask}@${domain}`;
}
