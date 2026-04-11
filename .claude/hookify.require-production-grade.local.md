---
name: require-production-grade
enabled: true
event: stop
pattern: .*
action: warn
---

**DoD-Grade Verification Checklist — Before claiming work is complete:**

- [ ] Code compiles with zero errors (`npm run build`)
- [ ] No hardcoded credentials, API keys, or connection strings
- [ ] All mutations require `requireAuth()` — no unauthenticated POST/PUT/DELETE
- [ ] All DB queries use parameterized inputs — no string interpolation in SQL
- [ ] Timing-safe comparison on all key/token checks (`safeCompare`)
- [ ] No `console.log` in production code
- [ ] No provider names in user-facing UI
- [ ] Input validation on all user-submitted data
- [ ] XSS protection — escape all user data rendered in HTML/SVG
- [ ] Deployed and verified with HTTP status checks

**Only production-grade, commercially shippable code ships. Verify multiple times. No slipping.**
