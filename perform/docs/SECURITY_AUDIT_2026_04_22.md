# Per|Form Security Audit — Gate 6 (ξ + ο)

**Date:** 2026-04-22
**Scope:** Gate 6 Items 35 (input fuzz + Semgrep) + 38 (secret hygiene + gitleaks full history)
**Tools:** Semgrep (p/typescript + p/nextjs + p/owasp-top-ten + p/javascript rule packs) · Gitleaks v8+

---

## Item 35 — Static analysis (Semgrep)

**Findings on `perform/src` + `perform/scripts`:** 1 WARNING, 0 ERROR.

| Severity | Rule | Location | Status |
|---|---|---|---|
| WARNING | `javascript.browser.security.open-redirect.js-open-redirect` | `src/app/page.tsx:125` | **FIXED** in PR ξ — added explicit `://` + `\` reject + type guard to the existing `startsWith('/')` / `!startsWith('//')` defense chain |

**Item 35 status: PASS** after PR ξ fix. CI workflow at `.github/workflows/semgrep.yml` blocks future regressions on ERROR severity.

---

## Item 38 — Secret hygiene (Gitleaks full history)

**Repo visibility:** PUBLIC (`BoomerAng9/foai`) → any leaked secret in history is world-readable since the commit date.

**Scan result:** 31 findings across 795 commits (283 MB scanned in 4m17s). Breakdown:

### By rule

| Rule | Count |
|---|---|
| `generic-api-key` | 24 |
| `gcp-api-key` | 5 |
| `curl-auth-header` | 1 |
| `curl-auth-user` | 1 |

### By file / provenance

| Provenance | Count | Notes |
|---|---|---|
| `acheevy/agent-009/*` | 14 | Imported external agent tree (commit `38647e18`). Docs + test files, not runtime code. Likely examples / training data. Separate from Per\|Form runtime. |
| `cti-hub/*` | 8 | CTI Hub scripts + `.env.example` + kilocode skill docs (commits `c16cf8a1`, `d6506c09`). Separate project, not Per\|Form runtime. |
| **`perform/scripts/rewrite-scouting-batch.mjs`** | **2** | **Per\|Form production code.** Key was in the file at commits `5596f221` + `ad01c40f`; removed later in `d3b26ae` ("security: fix CRITICAL+HIGH vulnerabilities in perform/"). Current `HEAD` uses `process.env.OPENROUTER_API_KEY`. |
| `docs/canon/Deploy-Unified-Command-Center.md` | 1 | Doc, likely example curl line |
| `smelter-os/sqwaadrun/deploy/deploy-master.sh` | 1 | Sqwaadrun deploy, separate project |

---

## Owner-action rotation list (MANDATORY before full Gate 6 pass)

Any key below that is **still active** must be rotated. Keys already dead (expired / revoked) can be accepted and documented.

### Per|Form-scope (direct Per|Form runtime)

- **GCP API key** in `perform/scripts/rewrite-scouting-batch.mjs` at commits `5596f221`, `ad01c40f`
  - **Action:** GCP Console → APIs & Services → Credentials → identify the key from the commit diff, check "last used" date, rotate if active.
  - **If rotated:** no runtime impact — current file already uses env vars.

### CTI Hub scope (shared monorepo)

- 8 findings at commits `c16cf8a1` + `d6506c09`. Owner should review each and rotate any still-active keys via the CTI Hub runbook.

### Acheevy agent-009 scope (imported tree)

- 14 findings from a single merge commit `38647e18` bringing in an external agent workspace.
- **Recommendation:** `git rm -r acheevy/agent-009` if the subtree is no longer needed, then purge from history via `git filter-repo --invert-paths --path acheevy/agent-009`.
- Alternatively: if the keys in those docs are already-public examples (likely — `SERVICES_QUICK_REFERENCE.md` naming suggests docs), no rotation needed, just documented as false-positives.

### Sqwaadrun + Deploy docs

- 2 findings in one-shot deploy scripts + one doc. Owner check-and-rotate.

---

## Why history rewrite isn't automated

`git filter-repo` to surgically strip the 31 findings from history would:
- Rewrite every commit after the first leak → all open PRs would need re-bases
- Invalidate every existing clone / fork / Codespace
- Force-push to a public main — breaks anyone pulling the repo

This is a deliberate owner choice, not a tool decision. If the owner decides to rewrite, a separate PR would contain the `git filter-repo` invocation + the force-push playbook + a co-ordinated timing window with any collaborators.

---

## CI workflows landed in this PR

1. `.github/workflows/semgrep.yml` — on push / PR / weekly cron. Blocks merge on any ERROR. Rule packs: typescript, nextjs, owasp-top-ten, javascript.
2. `.github/workflows/gitleaks.yml` — on push / PR / weekly cron. Enforces a NEW-COMMIT floor — no new secret may land even while the historical 31 await rotation.

Both workflows use pinned action versions per Code_Ang supply-chain protocol.

---

## Item 38 status

**FAIL** until either:
- Every still-active key in the rotation list above is rotated, OR
- Each key is verified already-dead / was-an-example and documented in this file

**When that's done:** Item 38 flips to PASS. The CI workflow enforces the NEW-COMMIT floor thereafter.
