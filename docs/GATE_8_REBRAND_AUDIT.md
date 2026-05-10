# Gate 8 — Rebrand + Content Audit

Catalogs retired brand terms and internal-name leaks found across the
monorepo as of 2026-04-19. Flags each occurrence with a category so
follow-up PRs can fix the right things without touching the wrong
ones.

**Companion script:** `scripts/check-retired-terms.sh` — reusable
audit tool that reproduces these findings. Not yet wired to CI; run
locally or add as a non-blocking CI job in a follow-up PR.

## Category legend

| Flag | Meaning | Action |
|------|---------|--------|
| **KEEP** | Legitimate URL, email slug, API identifier, or internal-integration name. Must not change. | None |
| **INTERNAL-OK** | Appears only in internal docs, comments, or owner-only surfaces where dev vocab is allowed per `feedback_internal_vs_user_facing_voice.md`. | None (spot-check only) |
| **FIX** | Customer-facing UI string, live-system reference, or stale constant that violates the retirement canon. | Dedicated follow-up PR |
| **DOCS** | Memory files, retirement decision docs, or skill files documenting the retirement itself. | None — they're supposed to mention it |

## Findings by retired term

### 1. Paperform (retired 2026-04-15 → Taskade)

Canon: `project_taskade_replaces_paperform.md`. Taskade owns the funnel,
Stepper, billing flow now. `Forms` in CLAUDE.md still reads "Paperform +
Stepper" — stale, worth updating in a follow-up.

| File | Line | Category | Notes |
|------|-----:|----------|-------|
| `cti-hub/src/app/(dashboard)/smelter-os/forms/page.tsx` | 161 | **FIX** | User-visible UI: *"Dispatched through the Pipedream MCP bridge to Paperform"*. The page's OWN rule on line 275 says "Public-facing copy never reveals Paperform" — self-contradiction. Even though this is owner-only gated, the integration is retired and the copy should reflect Taskade. |
| `cti-hub/src/app/(dashboard)/smelter-os/forms/page.tsx` | 267 | **FIX** | User-visible UI: *"no direct Paperform API"*. Same fix window. |
| `cti-hub/src/app/(dashboard)/smelter-os/forms/page.tsx` | 275 | **INTERNAL-OK** | The meta-rule itself ("never reveal Paperform"). Keep as a rule citation. |
| `cti-hub/src/app/(dashboard)/smelter-os/forms/page.tsx` | 4, 7, 293 | **INTERNAL-OK** | Comments + internal skill-file path reference. |
| `cti-hub/src/app/api/aiplug/webhook/paperform/route.ts` | multiple | **KEEP** | API route directory name IS the integration slug; changing would break the webhook endpoint contract. |
| `cti-hub/CLAUDE.md` | "Forms: Paperform + Stepper" | **FIX** | This is the consumer CLAUDE.md — stale description. Update to "Taskade + Stepper" per the retirement canon. |
| `perform/src/lib/paperform/client.ts` | directory | **FIX** | If the actual wiring is now Taskade, this directory should be renamed (with a shim if callers still import the old path). Investigate before renaming. |
| `perform/src/lib/podcasters/{pricing,plans}.ts` | multiple | **NEEDS TRIAGE** | Podcaster-plan code references Paperform; verify whether the billing flow has flipped to Taskade and update. |
| `aims-tools/aims-pmo/**` | schema + types | **INTERNAL-OK** | PMO internal data model. Name is an enum value referencing a historical integration; migration, not rebrand. |
| `aims-tools/grammar-content/glossary/sigma-terms.md` | — | **DOCS** | Glossary entry. |
| `docs/**` | various | **DOCS** | Retirement docs + session plans. |

### 2. OpenClaw (retired 2026-04-15 → Hermes V1.0)

Canon: `reference_openclaw_credentials.md` (marked SUPERSEDED) +
`feedback_openclaw_api_restrictions.md` (marked SUPERSEDED). Gate 0a
ran `retire-openclaw.sh` across VPSes + Cloud Run. Remaining in-repo
references are ALL doc / historical mentions.

| File | Category | Notes |
|------|----------|-------|
| `AGENTS.md` | **DOCS** | Agent hierarchy doc — references OpenClaw's historical role (now Hermes). Should be updated but low-risk. |
| `README.md` | **DOCS** | Historical mention. |
| `INFRASTRUCTURE.md` | **DOCS** | Architecture map. Fine to leave OR update to Hermes. |
| `PLATFORM_DELTA_AUDIT.md` (17 refs) | **DOCS** | This IS a historical delta audit — deliberately names OpenClaw. Keep. |
| `chicken-hawk/README.md` (4 refs) | **DOCS** | Integration notes. Worth updating to Hermes in a follow-up. |
| `chicken-hawk/system-prompt/chicken-hawk.md` (2 refs) | **DOCS** | System prompt scaffold. Update in a follow-up. |
| `cti-hub/src/app/api/dispatch/route.ts` (6 refs) | **NEEDS TRIAGE** | Active API route that still references OpenClaw. If calls have been migrated to Hermes, update; if OpenClaw lives on, rename references. |
| `luc/src/router/dispatch_tree.py` | **NEEDS TRIAGE** | Python dispatcher. Same triage as above. |
| `cti-hub/src/lib/skills/virtual-office.md` | **DOCS** | Skill doc. |
| Everything else | **DOCS** | |

### 3. acheevy.digital (deprecated 2026-04-15 — domain dead)

Canon: `project_acheevy_digital_deprecated.md`. Site was archived;
repo marked read-only. Live references in active code must go.

| File | Line | Category | Notes |
|------|-----:|----------|-------|
| `chicken-hawk/hawk3d/src/lib/constants.ts` | 53 | **FIX** | 3D topology visualization lists `acheevy.digital` as an active "Public Portal" component. Domain is dead — either remove the entry or relabel it as `foai.cloud` (current public portal). |
| `acheevy/acheevy.conf`, `acheevy/docker-compose.yml`, `acheevy/ecosystem.node.json`, `acheevy/deploy.ps1`, `acheevy/CLAUDE.md` | various | **NEEDS TRIAGE** | The `acheevy/` service directory has config files referencing the dead domain. If the service has been re-homed (to foai.cloud or elsewhere), update configs. If the service is retired, remove the directory. |
| `chicken-hawk/hawk3d/README.md`, `chicken-hawk/config/event-ctih.yml`, `chicken-hawk/CLAUDE.md` | — | **FIX (doc)** | Chicken Hawk docs that reference the dead domain. |
| `docs/risk-register.md`, `docs/session-delta-7749de04.md`, `aims-tools/ui-kit/README.md` | — | **DOCS** | Historical docs. |

### 4. Provider-name leaks in user-facing copy (per cti-hub/CLAUDE.md)

`cti-hub/CLAUDE.md` says NEVER expose in user-facing text: Model
names, Tool names (Firecrawl, Apify, OpenRouter, fal.ai), Internal
service names (NemoClaw, OpenClaw, Hermes). This audit covers the
Tool-names category inside customer-facing pages only.

| Term | Hits in `cti-hub/src/app/**` excluding `api/**` | Notes |
|------|:--|-------|
| Firecrawl | Not surveyed in this pass | Run the check script for a fresh sweep. |
| Apify | Not surveyed | Same. |
| OpenRouter | Not surveyed | Same. |
| fal.ai | Not surveyed | Same. |
| NemoClaw | Not surveyed | Same. |
| Hermes | Not surveyed | Same. |

Surface these via `scripts/check-retired-terms.sh` + dedicated
remediation PRs when the owner chooses to prioritize.

## Recommended follow-up PRs

Not bundled into this audit PR (each is independently reviewable):

1. **`smelter-os/forms` UI copy** — replace user-visible "Paperform" with "your form builder" or "Taskade form" depending on current wiring.
2. **`cti-hub/CLAUDE.md` Forms line** — update "Paperform + Stepper" → "Taskade + Stepper".
3. **`chicken-hawk/hawk3d` constants** — remove `acheevy.digital` entry or relabel to `foai.cloud`.
4. **`acheevy/` service directory** — retirement triage: re-home or remove.
5. **Dispatch routes** — audit `cti-hub/src/app/api/dispatch/route.ts` + `luc/.../dispatch_tree.py` for live OpenClaw calls and migrate to Hermes V1.0 if applicable.

Each of these is a real code change against active surfaces — not bundled
here specifically because audit visibility and remediation are separable
concerns. The owner picks priorities; the script gives the signal.

## How to run the audit yourself

```bash
bash scripts/check-retired-terms.sh
```

Exit code is always 0 (informational). Pipe through `| grep FIX` to
see only the flagged items.
