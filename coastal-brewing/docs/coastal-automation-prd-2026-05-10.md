# Coastal Automation PRD — End-to-End Workflow Operationalization

**Date:** 2026-05-10
**Status:** DRAFT — awaiting owner ratification before CLI factory fires
**Author:** ACHEEVY × Code_Ang (under aims-unified-skill governance)

---

## 1. Origin

This session manually executed the Coastal portrait + PR pipeline 13+ times (PRs #319 / #253 / #254 / #310 / #227 / #256 / #217 / #189 / #364–#369). Owner directive 2026-05-10:

> *"Automate the entire process of what we've been working on today. If I have a YouTube transcript that you pull, I want you to not only pull that, but I want you to implement that. Use the anticipatory skill, AIMS Unified Skill, and the Printing Press skill. First write a PRD."*

This document is that PRD. It scopes the missing CLIs that turn each step of today's manual workflow into a single-command op the `auto-implement` chain can dispatch.

## 2. What already exists (re-use, do not rebuild)

| Component | Status | Use |
|---|---|---|
| `auto-implement` skill | ✓ Exists | The 6-stage chain (INGEST → CLASSIFY → ANTICIPATE → OWNER GATE → EXECUTE → RECEIPT). This is the spine. |
| `agentic-cli` (Printing Press) | ✓ Exists | The CLI factory pattern — wraps any service in token-disciplined CLI |
| `aims-unified-skill` | ✓ Exists | Governing doctrine (Teleological Anchor, Breadcrumb Protocol, anticipatory intelligence) |
| `aims-build-control-pack` | ✓ Exists | Build Session Receipt (PASS / FAIL / MISSING / UNVERIFIED / BLOCKED) |
| `transcript` skill | ✓ Exists | YouTube/X URL → plain text |
| `higgsfield` CLI | ✓ Exists | Image/video gen (Nano Banana Pro, GPT Image 2, etc.) |
| `gh` CLI | ✓ Exists | GitHub PR open/merge |
| `youtube-cli` | ✓ Exists | YouTube Hub channel ops |
| 30+ Coastal persona canon files | ✓ Exists at `~/foai/aims-tools/voice-library/personas/<slug>.md` | SME-depth bios per cast member |
| Higgsfield brand canon refs | ✓ Exists at `~/foai/coastal-brewing/web/public/brand/{melli-canon-office,storefront-window-etching-detail}.png` | Visual canon anchors |

## 3. What's missing (the build target)

The 7 CLIs below collapse today's manual orchestration into single commands. Every CLI follows `agentic-cli` doctrine: token-disciplined output (≤2K tokens summary to agent context), full payload to local SQLite, never returns raw JSON walls.

### 3.1 `coastal-canon` — persona canon reader

```
coastal-canon <slug> [--field species|region|role|bio|voice|all]
```

- **Input:** persona slug (e.g. `persona_tah`, `melli_capensi`)
- **Reads:** `~/foai/aims-tools/voice-library/personas/<slug>.md`
- **Returns:** structured JSON (species Latin + common, region, role, reports-to, voice register, bio summary ≤200 words pulled from "Origin & Background")
- **Token discipline:** persona files are 1.5–4K tokens; CLI returns ≤500-token summary
- **Cache:** none needed (filesystem read)

### 3.2 `coastal-portrait` — full portrait pipeline per persona

```
coastal-portrait <slug> [--canon-ref melli-office|sal-canonical|tate-faceplate] [--stages 1|2|both]
```

- **Input:** persona slug, optional visual-canon reference image, optional stage selector
- **Pipeline:**
  1. Read canon via `coastal-canon <slug>`
  2. Build Higgsfield prompt from canon (species, region, role differentiator, brand context)
  3. Fire Stage 1: `higgsfield generate create nano_banana_2 --image <canon-ref> --prompt <built> --wait`
  4. Optionally fire Stage 2: GPT Image 2 refinement using Stage 1 output as primary
  5. Download output to `web/public/team/_<slug>_candidates/<slug>_v<n>.png`
- **Returns:** `{slug, stage1_url, stage2_url, local_paths, prompt_used, credits_spent}`
- **Cache:** `~/.cache/agentic-cli/coastal-portrait/<slug>.db` keyed by (slug, canon_ref, stage)
- **Owner-gate:** Stage 2 + ship only fire on owner confirmation

### 3.3 `coastal-deploy` — SCP file → aims-vps + container rebuild + verify

```
coastal-deploy <local-file> [--remote /docker/coastal-brewing/<path>] [--rebuild web|runner|both] [--verify-url <url>]
```

- **Input:** local file path, optional remote target, optional rebuild target, optional URL to md5-verify after deploy
- **Pipeline:**
  1. `scp <local-file> aims-vps:<remote>`
  2. `ssh aims-vps "cd /docker/coastal-brewing && docker compose build <target> && docker compose up -d <target>"`
  3. After ~12s settle: `curl <verify-url>` + md5 compare local vs live
- **Returns:** `{remote_path, build_status, md5_local, md5_live, match: bool}`
- **Failure handling:** retries SCP once on connection-reset (we hit this 4× today)
- **Cache:** none

### 3.4 `coastal-cast` — team page CAST array editor

```
coastal-cast {add|edit|remove} <slug> [--display-name X] [--function X] [--pmo X] [--story X]
```

- **Input:** action verb + slug + fields
- **Modifies:** `web/app/team/page.tsx` — surgical Edit on the CAST array, preserving everything else
- **Pre-checks:** validates pmo enum value, checks for slug collisions
- **Returns:** `{action, slug, before, after, validated}`
- **Includes typecheck pass** (`tsc --noEmit -p web/tsconfig.json`) before committing
- **Cache:** none

### 3.5 `coastal-ship` — branch → commit → push → PR → merge

```
coastal-ship --files <list> --title <X> --body <X> [--auto-merge true|false]
```

- **Input:** list of changed files, PR title, body
- **Pipeline:**
  1. Stage exact files (no `git add .` — prevents secret leak)
  2. Commit with HEREDOC body
  3. Push (retries once on `SEC_E_MESSAGE_ALTERED`)
  4. `gh pr create`
  5. Wait for CI (until `mergeStateStatus` ∈ {CLEAN, BLOCKED, DIRTY})
  6. If clean + auto-merge: `gh pr merge --merge --delete-branch --admin`
  7. Verify merged via `gh pr view --json state,mergedAt`
- **Returns:** `{pr_number, merge_commit, merged_at, ci_summary}`
- **Owner-gate:** auto-merge ON only when owner has standing-auth (per `feedback_standing_pr_merge_authorization_2026_05_10.md`)

### 3.6 `coastal-sett-pipeline` — orchestrator for 1+ portrait builds

```
coastal-sett-pipeline <slug>... [--ship true|false]
```

- **Input:** one or more persona slugs
- **Pipeline (parallelized via subagents per slug):**
  1. For each slug: `coastal-portrait <slug>`
  2. Owner audit gate (manual visual review per portrait)
  3. For each approved: `coastal-cast add <slug>` (with canon-derived bio from Stage 1 of pipeline)
  4. `coastal-deploy <portraits>` + `coastal-deploy web/app/team/page.tsx`
  5. If `--ship`: `coastal-ship --files=...`
- **Returns:** Build Session Receipt (per `aims-build-control-pack`)
- **Cost estimate:** 9 credits per portrait (Stage 1 + 2) → exposes total before fire

### 3.7 `coastal-anticipate` — bridges `auto-implement` Stage 2 for Coastal-specific intent

```
coastal-anticipate <transcript-path-or-text>
```

- **Input:** plain-text transcript (from Stage 1 `/transcript`)
- **Pattern-match (deterministic, no LLM):**
  - Mentions of "Sett" / "badger" / Marketing tier names → triggers `coastal-sett-pipeline`
  - Mentions of "Sales tier" / Boomer_Ang names → triggers `coastal-portrait` for each
  - Mentions of pricing / SKU / catalog → flags for catalog edit (no CLI yet — defer)
  - Mentions of brand mark / logo / canon → flags for canon-update (no CLI yet — defer)
- **Returns:** `{anticipated_action, confidence, slugs_inferred, rationale}` for `auto-implement` Stage 3
- **No-go:** if confidence < 0.6 → return `no_action` so `auto-implement` produces brief-only

## 4. End-state vision (what the chain looks like once shipped)

```
USER: /auto-implement https://youtube.com/watch?v=ABC123
       (a video saying: "build the Sett — 12 anthropomorphic mustelids representing global marketing regions")

[auto-implement Stage 1 INGEST] /transcript pulls 18K-char transcript
[auto-implement Stage 2 CLASSIFY] coastal-anticipate matches → action=coastal-sett-pipeline,
                                  slugs=[melli_capensi, persona_tah, eve_retti, leu_kurus, ...12]
[auto-implement Stage 3 ANTICIPATE] aims-unified — matches MVO, Sett canon exists, no duplication
[auto-implement Stage 4 OWNER GATE]
   ───────────────────────────────────────────────────────────
   [auto-implement] proposing next move:
   Source:        "Build the Sett" (YouTube ABC123)
   Action:        coastal-sett-pipeline for 12 personas
   Estimated:     ~108 Higgsfield credits, ~15 min, will open 1 PR
   Confidence:    0.94
   Confirm? [y/n]
   ───────────────────────────────────────────────────────────

USER: y

[auto-implement Stage 5 EXECUTE]
   coastal-sett-pipeline melli_capensi persona_tah eve_retti leu_kurus ana_kuma arcto_nyx
                         cuc_phuong java_nessa mar_che meles_mehli moscha_tah orien_talis
                         taxi_dea --ship false
   → 13 portraits generated in parallel (~10 min)
   → owner audits each (mandatory per coastal-sett-pipeline canon)
   → 13 CAST entries added with canon-derived bios
   → all files SCP'd + container rebuilt + md5-verified
   → coastal-ship opens PR

[auto-implement Stage 6 RECEIPT]
   Build Session Receipt → Telegram ping (if Lil_Telegram_Hawk wired)
   PR #XXX merged
   13 portraits live on brewing.foai.cloud/team
```

Same flow works for: a transcript about new SKUs (triggers catalog edit), a transcript about Bun_Ang/Wsl_Ang refresh (triggers re-portrait), a transcript about a new licensee skin (triggers full vertical-spawn pipeline).

## 5. Build order

Dependency graph:

```
coastal-canon  ──────────┐
                         │
                         ▼
coastal-portrait  ◄─── coastal-deploy
       │                 │
       │                 │
       ▼                 │
coastal-cast  ──────► coastal-ship
       │                 │
       └────────► coastal-sett-pipeline (orchestrator)
                         │
                         ▼
              coastal-anticipate (bridge to auto-implement)
```

Build order: 1 (`coastal-canon`) → 2 (`coastal-deploy`) → 3 (`coastal-portrait`) → 4 (`coastal-cast`) → 5 (`coastal-ship`) → 6 (`coastal-sett-pipeline`) → 7 (`coastal-anticipate`).

Each CLI is a single Python file under `~/foai/coastal-brewing/scripts/cli/coastal_<name>.py` with a thin entry-point in `~/.local/bin/coastal-<name>`. Standard Click + argparse pattern. SQLite cache where applicable.

## 6. Build targets (ordered)

| # | CLI | LOC est | Time est | Blocker on |
|---|---|---|---|---|
| 1 | `coastal-canon` | ~120 | 30 min | nothing |
| 2 | `coastal-deploy` | ~80 | 30 min | aims-vps SSH key access (already configured) |
| 3 | `coastal-portrait` | ~250 | 90 min | #1 + Higgsfield CLI (already installed) |
| 4 | `coastal-cast` | ~180 | 60 min | TypeScript AST parser (use ts-morph or string-edit per existing PRD pattern) |
| 5 | `coastal-ship` | ~140 | 45 min | gh CLI (already installed) |
| 6 | `coastal-sett-pipeline` | ~200 | 60 min | #1–#5 done |
| 7 | `coastal-anticipate` | ~150 | 45 min | none — pure pattern match |

**Total build estimate:** ~6 hours of focused work + owner gate at each CLI for smoke test.

## 7. What this PRD is NOT

- **Not the auto-implement skill itself.** That already exists. This PRD scopes the Coastal-specific CLIs the chain can dispatch.
- **Not a replacement for any existing skill.** Builds USE `agentic-cli` factory, USE `aims-unified-skill`, USE `aims-build-control-pack`. This PRD is the inventory of what's missing in our specific pipeline.
- **Not for non-Coastal verticals yet.** Each licensee (when added) gets their own `<vertical>-portrait` / `<vertical>-cast` etc. that mirrors this pattern. That's a multiplier we add later.

## 8. Verification (end-to-end)

Once all 7 CLIs ship, the proof of operationalization is:

1. `coastal-canon persona_tah` returns valid JSON with species + region + bio in <2s
2. `coastal-deploy <some-test-png>` SCPs + rebuilds + md5-verifies in <60s
3. `coastal-portrait moscha_tah --stages 1` produces a Stage-1 mockup at `_moscha_tah_candidates/`
4. `coastal-cast add` updates the CAST array + typecheck passes
5. `coastal-ship` opens a PR + auto-merges on green CI
6. `coastal-sett-pipeline` orchestrates a multi-slug build correctly
7. `coastal-anticipate <Sett build transcript>` returns `action=coastal-sett-pipeline` with confidence ≥0.85
8. `auto-implement <YouTube URL describing a Sett build>` runs the full chain end-to-end with owner gate firing once and producing a PR

## 9. Open decisions

| Decision | Default | Owner override |
|---|---|---|
| Owner-gate mode | `propose-then-confirm` per `auto-implement` canon | Owner can flip to `autonomous` (max 3 builds/session) per session |
| Stage 2 GPT Image 2 refinement | Off by default for Sales-tier (Stage 1 nails it) | On for Marketing tier (chest mark + chevron + brand artworks need precision) |
| PR auto-merge | On (per standing auth memory) | Owner can disable per-PR via `--auto-merge false` |
| Bio voice for new portraits | Audience-first benefit copy with regional flavor | Owner picks per session |
| Memory-hardening on canon-violations | Auto-write to `~/.claude/projects/.../memory/` | Owner can disable session-scoped |

## 10. Risks

- **HAR-capture step (per `agentic-cli` doctrine) is human-required for new external services.** Not a blocker for the 7 CLIs above (all hit local files / aims-vps / Higgsfield CLI / gh CLI — no new external service to HAR-capture).
- **Owner-gate fatigue.** If 12 portraits each need an audit gate, owner reviews 12 portraits before ship. Mitigation: `coastal-sett-pipeline` shows all 12 in one grid for batch-audit, not 12 individual gates.
- **Force-pushes during rebases.** All CLIs use `--force-with-lease`, never raw `--force`. Per existing safety canon.
- **TypeScript CAST array edits.** Risk of breaking the AST. Mitigation: typecheck pass before commit; rollback on fail.

---

## Appendix A — current session as a worked example

Today's manual session (8 PR reviews → 4 fix PRs → 13 PRs total → Sett build for 12 portraits) maps onto the proposed automation as:

| Today's manual step | Future automated equivalent |
|---|---|
| Read 12 persona files manually | `coastal-canon <slug>` × 12 (parallel) |
| Build prompts manually | `coastal-portrait` does it from canon |
| Fire Higgsfield gens manually | `coastal-portrait` |
| Visual-audit each portrait | OWNER GATE — only step that stays manual |
| Promote candidate → canonical | `coastal-portrait` (auto on owner-confirm) |
| Edit team page CAST | `coastal-cast add <slug>` × 12 |
| SCP + rebuild + verify | `coastal-deploy` |
| Open PR + wait CI + merge | `coastal-ship` |
| Memory-harden corrections | `aims-build-control-pack` Receipt step (auto) |

**Time estimate today (manual):** ~6 hours spread across many context-switches.
**Time estimate post-automation:** ~12 minutes setup + Higgsfield gen wall-clock (~10 min for 12 in parallel) + owner audit gate.

The compounding payoff: each new vertical (7-Brew skin / Starbucks skin / etc.) gets its own `<vertical>-portrait` etc. that inherits this pattern. The factory IS the moat per the licensee pitch.
