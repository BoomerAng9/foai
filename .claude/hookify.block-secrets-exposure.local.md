---
name: block-secrets-exposure
enabled: true
event: bash
pattern: printenv\s+\w*KEY|printenv\s+\w*SECRET|printenv\s+\w*TOKEN|printenv\s+\w*PASSWORD|cat\s+.*\.env|echo\s+\$\w*KEY|echo\s+\$\w*SECRET
action: block
---

**BLOCKED: Secrets exposure detected.**

Never display API keys, tokens, passwords, or credentials in output. Pull secrets from `openclaw-sop5-openclaw-1` container env and ALWAYS mask values.

Use: `printenv KEY_NAME | head -c 10` to verify existence without exposing full value.
