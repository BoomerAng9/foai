# Chicken Hawk Runtime — Composite Vision

**Date:** 2026-04-26
**Authority:** Owner directive 2026-04-26 (third correction) — *"Hermes Agent doesn't derive capabilities from Chicken Hawk. Chicken Hawk derives capabilities from Hermes Agent, NemoClaw and Autoresearch. They combine to create Chicken Hawk."*
**Scope:** Uncapped, no pruning, efficient routing per job type.

---

## 0. The single sentence

**Chicken Hawk is the customer-facing FOAI executor identity, with its own runtime + persona + bot + UI, that internally orchestrates three tools — Hermes Agent (LLM agent loop, 75 skills, 29 toolsets, 19 messaging gateways, 20+ providers), NemoClaw (policy gate over 68 actions across 4 decision sets), and Autoresearch (TTD-DR Think→Test→Decide→Do→Review evidence loop with FDH escalation) — invisible to the customer.**

---

## 1. The three ingredients (uncapped capability surface)

### 1.1 Hermes Agent (the LLM agent + tool dispatch layer)

| Dimension | Surface |
|---|---|
| CLI subcommands | **36 top-level**, 150+ subcommands |
| Bundled skills | **75** across 19 categories |
| Native toolsets | **29** (web, browser, terminal, file, code_execution, vision, image_gen, moa, tts, skills, todo, memory, session_search, clarify, **delegation**, **cronjob**, messaging, rl, homeassistant, spotify) |
| Messaging gateways | **19** (Telegram, Discord, WhatsApp, Slack, Signal, SMS, DingTalk, Mattermost, Matrix, Webhook, Email IMAP/SMTP, Feishu/Lark, WeCom, WeChat, BlueBubbles, Home Assistant, API Server, QQBot) |
| LLM providers | **20+** (anthropic, openai, gemini, openrouter, nous, xai, ollama, huggingface, kimi, minimax, stepfun, nvidia, etc.) |
| Memory backends | **9 external** + built-in MEMORY.md (honcho, openviking, mem0, hindsight, holographic, retaindb, byterover, supermemory) |
| Personalities | **14** built-in (override-able via config) |
| MCP servers | Bidirectional — Hermes consumes MCP **and** can serve itself as MCP |
| Container backends | Docker, Modal, Singularity, Daytona |
| Voice/audio | Mic input + Whisper STT + multi-backend TTS |
| Cron scheduling | Full cron-expression scheduler with pause/resume/manual-trigger |
| Webhooks | Dynamic subscriptions for event-driven activation |
| Hooks | Pre/post-action shell scripts with consent allowlist |
| ACP | IDE integration (VS Code, Zed, JetBrains) |
| Profiles | Multi-tenant isolation via separate profiles |
| Sessions | SQLite-backed conversation persistence with browse/search/export |
| Worktree mode | Git worktree isolation for parallel agent runs |
| Checkpoints | Filesystem snapshots with `/rollback` |
| Skills hub | Discovery/install/audit/publish via skills.sh, ClawHub, GitHub |

### 1.2 NemoClaw (the policy gate)

| Dimension | Surface |
|---|---|
| Endpoints | `POST /check`, `POST /risk-event`, `GET /risk-events` |
| Decision sets | **68 actions** (17 blocked, 25 require-approval, 26 allowed-without-approval) |
| Risk tag taxonomy | 10 escalating categories (legal, money, certification, health, fda, final_public, supplier_change, ad_spend, contract, customer_payment_data) |
| Verdict shape | `{verdict: allow\|escalate\|deny, reason, basis, check_id, decided_at}` |
| Side effects | Risk event persistence to atomic JSON ledger; auto-Telegram on escalate |
| Persistence | `/data/nemoclaw/risk_events.json` (file-mutex + atomic write) |
| Future enterprise extensions | Shield Division reasoning-path constraints (18 prohibition patterns), 6 data classes, 5 squads, 32 hawk profiles, YAML-compiled to Rust |

### 1.3 Autoresearch (Karpathy's autonomous ML experimentation loop)

> **Correction 2026-04-26 — owner-provided**: Autoresearch is **Andrej Karpathy's `autoresearch`** (github.com/karpathy/autoresearch, released 2026-03-07, 21k★, 8.6M views), NOT TTD-DR. TTD-DR is a separate FOAI internal service for RFP-stage research; do not conflate. The Karpathy pattern is autonomous ML experimentation, not citation-grounded research.

| Dimension | Surface |
|---|---|
| Repo | `github.com/karpathy/autoresearch` (open source, ~630 lines Python) |
| Pattern | **Autonomous experiment loop**: read `program.md` → propose code change → `git commit` → train 5 min → measure → keep or `git reset` → cycle |
| Throughput | ~12 experiments/hour, ~100 overnight |
| Decision metric | training metric (originally `val_bpb` for nanochat); per FOAI use case, replaced with relevant outcome metric (task-success rate, prompt-eval score, latency, etc.) |
| Karpathy's vision | Asynchronously massively collaborative (SETI@home-style); not single-PhD emulation but a research-community emulation |
| Role in CH | **Self-improvement engine** — drives autonomous tuning of CH's prompts, Lil_Hawk toolset profiles, routing rules, model selections, fine-tuned weights |
| Current state | Karpathy upstream proven on nanochat training; FOAI deployment is Wave 2 work — clone the repo, adapt `program.md` + `train.py` to FOAI use cases (prompt eval, Lil_Hawk specialization, routing experiments) |
| FOAI-side wrapper | A small adapter that lets CH submit experiments + retrieve results; persists experiment runs to audit_chain so improvements are tamper-evident |

**What Autoresearch does NOT do:**
- Citation-grounded research with sources (that's a different pattern, served by Hermes Agent's `web` + `arxiv` skill + `sequential-thinking` MCP)
- Per-RFP confidence loops (that's TTD-DR — separate FOAI service at `ttd-dr-apbgyi35aq-uc.a.run.app` with its own purpose)
- Customer-facing claim verification (that's owner-action through NemoClaw's escalation path)

**Canonical use cases for CH calling Autoresearch:**
1. *"Find the best prompt for Lil_Coding_Hawk's TDD task"* — overnight loop tries 100 variants, keeps the winners on a held-out eval set
2. *"Discover which toolset profile makes Lil_Sand_Hawk fastest at containerized code-execution tasks"* — A/B variants, kept-if-improved
3. *"Tune routing decisions for ambiguous customer intents"* — submit decision-tree variants, eval on logged customer-task outcomes
4. *"Run overnight fine-tune on a candidate Gemma 4 LoRA for FOAI-internal copy generation"* — when GPU lane (Step E Vast.ai) is provisioned

---

## 2. Chicken Hawk identity (the synthesis)

### 2.1 Persona

Chicken Hawk is **the FOAI executor that gets things done with policy backbone and evidence**. Voice register: confident, dry, concrete; speaks in receipts and decisions, not theory; never reveals tool plumbing to the customer; addresses owner as "Boss" or first name (configurable per profile). Catchphrase shape: *"On it."* + result; never *"I'll try"*. Citation discipline: every public-facing claim grounded in Autoresearch evidence + a chain entry.

### 2.2 Customer-facing surface (single front door)

```
Customer  ──► Telegram bot (5981955177:...)        ─┐
          ──► Discord bot                          ─┤
          ──► Slack bot                            ─┤
          ──► WhatsApp                             ─┤    All routes land
          ──► SMS                                  ─┼──► at CH runtime
          ──► Email (IMAP/SMTP)                    ─┤
          ──► Web UI / Dashboard                   ─┤
          ──► API Server (REST + ACP)              ─┘
```

Customer never sees Hermes / NemoClaw / Autoresearch names. Branding, tone, error messages, escalation language all come from CH's persona — even when the underlying call landed in Hermes' chat tool, NemoClaw's deny verdict, or Autoresearch's FDH ticket.

### 2.3 Internal capability inheritance

CH gets the union of all three ingredient surfaces, mediated through routing rules:

| From Hermes Agent | From NemoClaw | From Autoresearch |
|---|---|---|
| Multi-LLM-provider chat | 68-action policy gate | Source-backed research |
| 75 skills | 10-tag risk taxonomy | Multi-cycle confidence climb |
| 29 toolsets | Verdict-with-receipt | FDH escalation |
| **delegation tool** (Lil_Hawk spawning) | Risk event ledger | ICAR audit trail |
| **cronjob tool** (scheduled jobs) | Future enterprise: Shield Division | Option matrix decisioning |
| 19 messaging gateways | | Charter+CTQ awareness |
| 9 memory backends | | |
| MCP bidirectional | | |
| Worktree + checkpoints + profiles | | |

---

## 3. Efficient routing — decision tree per intent

When a query arrives at CH, the runtime classifies intent and dispatches to the right ingredient combination. Goal: zero wasted ingredient calls, parallelize where independent, fail fast on policy denials.

### 3.1 Intent → ingredient mapping

```
Intent class               | NemoClaw | Hermes Agent | Autoresearch | Notes
───────────────────────────┼──────────┼──────────────┼──────────────┼──────
informational chat         |    -     |     ✓        |      -       | Simple Q&A; just LLM
codebase question          |    -     |     ✓        |      -       | coastal-fs MCP read
file edit / code change    |    -     |     ✓        |      -       | terminal + file tool
research / fact-check      |    -     |     ✓        |      -       | web tool + arxiv skill + sequential-thinking
verb-action ("run X")      |    ✓     |     ✓        |      -       | NemoClaw /check first; Hermes executes
public claim / promotion   |    ✓     |     ✓        |      -       | NemoClaw gates; Hermes web tool gathers sources
money / supplier / contract|    ✓     |     ✓        |      -       | Always escalate to owner via Telegram
schedule a job             |    ✓     |     ✓        |      -       | Cron tool; gate at trigger time per action
multi-step task            |    ✓     |     ✓        |      -       | Delegate to Lil_Hawks; check at boundaries
audit query                |    -     |     ✓        |      -       | Read audit_chain via chicken-hawk MCP
self-improvement / tuning  |    -     |     ✓        |     ✓        | Submit experiments; overnight loop; kept-if-better
prompt experimentation     |    -     |     ✓        |     ✓        | A/B prompt variants; eval on held-out tasks
Lil_Hawk specialization    |    -     |     ✓        |     ✓        | Toolset profile + skill combo search
fine-tune / LoRA           |    -     |     ✓        |     ✓        | Gated by GPU lane availability (Step E)
```

### 3.2 Pre-flight / post-flight rule

For every intent with side effects (action verbs):

1. **Pre-flight**: NemoClaw `/check` → if `deny`, refuse with the deny reason + offer alternative; if `escalate`, route to owner approval first; if `allow`, proceed.
2. **Execute**: Hermes Agent dispatches with the relevant tool (terminal, code_execution, messaging, etc.).
3. **Post-flight**: chicken-hawk `/run` writes receipt to audit_chain (tamper-evident); customer sees result + optional integrity confirmation.

### 3.3 Parallelization strategy

For customer-facing intents, the parallelization wins are:
- **Pre-flight checks**: when an action might trigger several risk tags, batch the NemoClaw `/check` calls in parallel (one verdict per tag combination) — saves serial latency
- **Multi-Lil_Hawk dispatch**: when a customer task decomposes into independent subtasks (e.g. "build a report AND draft an email AND verify metrics"), CH spawns parallel Lil_Hawks via Hermes' `delegation` tool — wall-clock time is the longest single Lil_Hawk, not the sum
- **Web research**: when an answer needs multiple sources, parallel web searches via Hermes' `web` tool

**Autoresearch does NOT participate in customer-facing latency budgets.** It runs *background experimental loops* — overnight, off-the-critical-path, never blocking a customer DM. The customer-visible effect of Autoresearch is *over time* (CH gets better at routing, prompts get tighter, Lil_Hawks specialize), not within a single request.

### 3.4 Skill / MCP routing within Hermes Agent

CH delegates to Hermes Agent with a *toolset profile* per intent class:

- **Code intent** → enable `file`, `terminal`, `code_execution`, `coastal-fs MCP`, `sequential-thinking MCP`, skills: `plan`, `test-driven-development`, `systematic-debugging`, `requesting-code-review`. Disable `image_gen`, `tts`, `homeassistant`.
- **Research intent** → enable `web`, `browser`, `vision`, `memory MCP`, skills: `arxiv`, `research-paper-writing`, `polymarket`, `blogwatcher`. Plus Autoresearch ingredient.
- **Customer ops intent** → enable `messaging`, `web`, skills: `linear`, `notion`, `google-workspace`. NemoClaw on every send.
- **Content/media intent** → enable `image_gen`, `tts`, `vision`, skills: `excalidraw`, `manim-video`, `creative-ideation`, `popular-web-designs`.
- **Scheduled job intent** → use `cronjob` tool to register; trigger calls back into CH with the job's intent class.

This is `hermes tools enable/disable` per session, scoped via Hermes' toolset filtering (`-t` flag in chat). Eliminates accidental tool-call noise.

---

## 4. Lil_Hawks — CH's delegation surface

Per owner: *"CH is able to create Lil_Hawks, delegate tasks to Lil_Hawks."*

### 4.1 Spawn semantics

Lil_Hawks are **scoped sub-agents** CH creates on demand for parallelizable or specialized work. Each Lil_Hawk:

- Has a name (`Lil_<Skill>_Hawk` per FOAI naming canon)
- Inherits a subset of CH's toolsets (least-privilege)
- Gets a task brief + budget cap (token limit, time limit)
- Reports back to CH with structured output
- Has its own session (resumable, traceable)

### 4.2 Implementation path (uses Hermes Agent's existing primitives)

CH uses Hermes Agent's `delegation` tool (already in the 29 native toolsets) + `worktree` mode for isolation:

```
CH receives: "build a sales report from Q1 data, draft email to investors,
              and verify all metrics against Coastal's audit ledger"

CH decomposes into 3 parallel Lil_Hawks:
  Lil_Report_Hawk    → toolsets: file, code_execution, sequential-thinking
                        skill: research-paper-writing
                        task: read Q1 ledger → produce metrics report
  Lil_Draft_Hawk     → toolsets: file, web
                        skill: research-paper-writing
                        task: draft investor email from report
  Lil_Verify_Hawk    → toolsets: chicken-hawk MCP, terminal
                        task: chain-verify every metric in the report

Each runs in its own session/worktree. CH joins their outputs at convergence,
gates the email send via NemoClaw (action_type=send_email_externally,
risk_tags=[final_public]), surfaces approval to owner via Telegram.
```

### 4.3 Lil_Hawk catalog (canonical roster)

Built from FOAI's existing HawkRole enum (per `chicken-hawk/CLAUDE.md`):

| Lil_Hawk | Specialty | Inherited toolsets |
|---|---|---|
| Lil_TRAE_Hawk | Heavy coding, repo-wide refactors | file, terminal, code_execution, coastal-fs MCP, skills: tdd, plan, code-review |
| Lil_Coding_Hawk | Plan-first feature work | terminal, file, sequential-thinking MCP, plan skill |
| Lil_Agent_Hawk | OS/browser/CLI workflows | terminal, browser, file (calls Agent Zero internally) |
| Lil_Flow_Hawk | SaaS/CRM/payment automation | web, messaging, skills: linear, google-workspace, n8n |
| Lil_Sand_Hawk | Safe containerized code execution | code_execution (Docker backend), terminal in sandbox |
| Lil_Memory_Hawk | RAG memory ops | memory MCP, ReMe sidecar |
| Lil_Graph_Hawk | LangGraph stateful conditional workflows | code_execution, terminal |
| Lil_Back_Hawk | Backend scaffolding, auth, APIs | file, terminal, skills: github, plan |
| Lil_Viz_Hawk | Monitoring dashboards | web, vision, image_gen |
| Lil_Blend_Hawk | 3D modeling, rendering | vision, image_gen, terminal (Blender CLI) |
| Lil_Deep_Hawk | DeerFlow Squad mode (multi-sub-agent) | delegation, all toolsets |
| Lil_Plan_Hawk | Plan-mode authority | sequential-thinking MCP, plan skill |
| Lil_Worktree_Hawk | Git worktree management | terminal, file (worktree-scoped) |
| Lil_Exec_Hawk | Bare execution under tight gating | code_execution, terminal (with approval) |
| Lil_Gate_Hawk | NemoClaw verdict consumer + dispatcher | chicken-hawk MCP |
| Lil_Chronicle_Hawk | Audit chain integrity + receipt writes | chicken-hawk MCP (audit_run, audit_check) |

These are NOT separate processes today — each is a *Hermes Agent session with a constrained toolset profile + named persona*. CH spawns one by calling Hermes' `delegation` tool with `(name, toolset_profile, skill_set, brief, budget)`. All sessions persist to the SQLite session store, queryable via `hermes sessions browse`.

---

## 5. Scheduled jobs

Per owner: *"handles a wide range of tasks and scheduled jobs."*

### 5.1 Mechanism

CH uses Hermes Agent's `cronjob` tool (one of 29 native toolsets) plus the `cron` subcommand surface:

- **Create**: CH receives "every weekday at 9am, summarize Coastal's overnight orders" → calls `cronjob.create(name, schedule="0 9 * * 1-5", prompt="...")` → Hermes persists to `/opt/data/cron/` with the job's intent class
- **Trigger**: scheduler tick fires the job; Hermes invokes CH's runtime with the prompt; CH runs the same intent-classification + routing decision tree as for live messages
- **Gate at trigger time**: NemoClaw runs `/check` per cron-fired action — same policy as ad-hoc actions. A scheduled "send daily summary email externally" still escalates if recipient not on allowlist.

### 5.2 Use cases the owner enabled

- Daily ops digest at 09:00 (calls coastal-fs MCP, summarizes ledger, posts to Telegram)
- Hourly chain integrity audit (calls chicken-hawk MCP `chicken_hawk_audit()` no task_id; alerts owner if `broken_at` non-null)
- Weekly supplier due diligence (Hermes web tool + arxiv/research skills + LLM synthesis; flags anything anomalous; surfaces to owner)
- Monthly cost-cap report (LiteLLM spend + Vast.ai burn + provider keys; emails owner)
- Real-time webhook on GitHub PR open (calls `requesting-code-review` skill, posts review to PR)
- **Overnight Autoresearch experiment runs** (Karpathy pattern) — see §5.4 below for the canonical self-improvement loop

### 5.3 Continuous-improvement self-review (audit_chain pattern)

Nightly job: query `audit_chain` for the day's escalations + denials, cluster them by action_type pattern (sequential-thinking MCP), generate proposed NemoClaw rule diffs (Hermes synthesis + Autoresearch ranking of which proposals improve a held-out simulated-task pass rate). Surfaces digest to owner with approve/reject; never auto-mutates policy. This is governance-style self-review, distinct from §5.4's algorithmic improvement.

### 5.4 Karpathy-style overnight Autoresearch loops (the differentiator job)

This is what Autoresearch *as Karpathy designed it* enables CH to do:

```yaml
job: chicken_hawk_overnight_autoresearch
schedule: "0 22 * * *"  # 10pm daily, runs through the night
intent_class: self_improvement
mechanism:
  1. Pick a target from CH's open improvement queue:
     - "Improve Lil_Coding_Hawk task-success rate on test-driven feature work"
     - "Reduce Lil_Sand_Hawk container-startup latency"
     - "Tighten the NemoClaw escalation prompt for ambiguous risk tags"
  2. CH writes a program.md describing:
     - Search space (prompt variants, toolset profiles, hyperparameters)
     - Evaluation metric (task-success rate on held-out eval set)
     - Constraints (budget, time, kept-if-improved threshold)
  3. CH submits to Autoresearch worker (FOAI-side wrapper around Karpathy's loop)
  4. Autoresearch runs ~100 experiments through the night:
     - Per-cycle: agent modifies the configuration in train.py-equivalent
     - Runs the eval (5 minutes per experiment)
     - If metric improves: keep (git commit). If not: git reset.
  5. Morning: CH posts overnight digest to owner — best variant found, % improvement,
     proposed promotion to production (e.g., "promote Lil_Coding_Hawk's prompt v23 →
     11% higher task-success rate on the eval set; deploy?")
  6. Owner approves promotion; NemoClaw gates the production swap as a regular action
nemoclaw_gate: required_owner_approval at promotion time (action_type=update_lil_hawk_config or similar)
audit_chain: every kept variant gets a chain entry (provenance — "this prompt won
              against these 99 alternatives on this metric on this date")
```

This is the kind of job no out-of-the-box agent does alone — it requires CH composing all three ingredients with a self-improvement loop tied to receipts. **It's the demonstration that CH genuinely improves itself overnight, with policy backbone, on tamper-evident receipts.** That's the AOF buyer-pitch crystallized.

Karpathy's own framing — *"emulate a research community"* — fits perfectly: each overnight session is one research thread; CH's continuous-improvement queue is the community's collective agenda; the audit_chain is the published-papers record.

---

## 6. Codebase awareness

Per owner: *"understands the full codebase."*

### 6.1 Static surface

- **coastal-fs MCP** mounts Coastal repo at `/workspace/coastal` (read-only): 14 tools — read_file, read_text_file, list_directory, search_files, directory_tree, etc.
- **Read-only git mounts** for sibling FOAI repos (chicken-hawk, foai/runtime, AIMS, perform, cti-hub, smelter-os) — Wave 2 add additional MCP filesystem servers per repo OR a single multi-root server.
- **Skills index** — Hermes' `codebase-inspection` skill uses pygount for size/structure analysis; `github-repo-management` skill for cross-repo PR awareness.

### 6.2 Dynamic surface

- **Symbolic search** via `web` tool's grep-like capability across mounted directories
- **Sequential-thinking MCP** for multi-step trace/refactor plans
- **Memory MCP** persists code-related findings across sessions ("the audit_ledger schema lives at memory/audit_ledger_schema.sql")

### 6.3 Codebase-grounded answers

Customer asks "where does the NemoClaw deny basis come from?" — CH:
1. Searches mounted repos for `BLOCKED_ACTIONS` definition (coastal-fs `search_files`)
2. Reads the file (`read_file`)
3. Returns location + actual list with context — sourced, not made up.

---

## 7. The two differentiator scheduled jobs

CH's distinctness from generic AI assistants comes from two scheduled-job patterns no single ingredient can do alone:

### 7.1 Algorithmic self-improvement (Karpathy's autoresearch pattern — see §5.4)

CH submits experiments overnight; Autoresearch keeps the variants that beat the metric; CH proposes promotions to owner in the morning. This is *quantitative* improvement — better prompts, better toolset profiles, better routing decisions, all measured against eval sets, all logged to audit_chain with provenance.

### 7.2 Governance self-review (audit_chain clustering pattern — see §5.3)

CH clusters the day's escalations + denials, identifies patterns (e.g., 7 customer requests for the same action_type that all escalated due to identical risk tags), proposes NemoClaw rule additions or refinements, surfaces to owner. This is *qualitative* improvement — better policy.

These two together = the FOAI buyer claim: *"Your humanless company gets smarter and safer every night, on receipts you can verify."* The first improves capability; the second improves discipline. Audit_chain is the receipt for both.

---

## 8. The runtime — implementation paths

Three options ranked by effort:

### Path A: Extend chicken-hawk-hawk-gateway-1 (recommended — minimal new infra)

Add to existing FastAPI service on myclaw-vps:
- `/chat` endpoint with CH persona system prompt
- Telegram poller (replacing Hermes' poller as the canonical owner; Hermes becomes called-as-tool)
- Intent classifier + router (the §3 decision tree)
- Lil_Hawk spawner that invokes Hermes' OpenAI-compat API on `:9119` for LLM agent loop
- NemoClaw embedded module (already there)
- Autoresearch HTTP client (HMAC-signed)
- Cron scheduler (use Hermes' cron via subprocess OR re-implement in FastAPI)

Effort: ~2 days. Reuses existing chicken-hawk gateway. Most architecturally honest given owner's "CH has its own runtime" rule.

### Path B: New dedicated CH runtime (clean break)

Stand up a new Python service (FastAPI + LangGraph or AutoGen) on aims-vps next to Hermes:
- New container `chicken-hawk-runtime` 
- Owns all messaging gateways
- Calls Hermes Agent (`:9119` OpenAI-compat) as one of three internal tools
- Calls NemoClaw + Autoresearch via HTTP
- Persists state to its own SQLite + Postgres (audit_chain)

Effort: ~5–8 days. Cleanest architectural separation. Highest implementation cost.

### Path C: Wrap Hermes Agent as an MCP server, build CH as MCP client

Treat Hermes Agent as an MCP server (it already supports `hermes mcp serve`!) and write CH runtime as a thin MCP client + persona orchestrator. CH calls Hermes' tools natively via MCP, calls NemoClaw + Autoresearch as additional MCP servers (write small wrappers).

Effort: ~3 days. Most elegant — uses MCP as the connective tissue, no HTTP plumbing.

**Recommendation: Path C.** Hermes Agent's `hermes mcp serve` capability means we don't need to invent transport. CH becomes an MCP-orchestrating runtime with persona + delegation + cron. Three internal tools become three MCP servers. Customer never sees any of this.

---

## 9. What changes vs. Wave 1 today

| Wave 1 reality | Canonical end state |
|---|---|
| Telegram bot wired to Hermes Agent runtime; customer talks to Hermes | Telegram bot wired to CH runtime; customer talks to CH; CH calls Hermes via MCP for LLM/agent work |
| `chicken-hawk` MCP server I built earlier (calls hawk.foai.cloud) | Replaced by NemoClaw + chicken-hawk-runtime native — no HTTP hop |
| Hermes' chicken-hawk skill + autoresearch skill | Removed; capabilities native to CH's routing layer |
| coastal-fs MCP, memory MCP, sequential-thinking MCP on Hermes | Same MCPs on CH; Hermes becomes one MCP among many that CH consumes |
| 4 owner-action gates (Vast key, MOONSHOT key, DNS A-records, Hermes setup) | Hermes setup gate removed (CH owns the bot); other 3 unchanged |
| 70+ skills on Hermes runtime | Same skills accessible via Hermes-as-MCP from CH runtime |
| Lil_Hawks defined as enum, not invokable | CH spawns Lil_Hawks via Hermes' delegation tool with toolset profiles |
| Cron jobs not configured | CH's cron scheduler runs nightly self-review + ops digests |

---

## 10. Owner decision points

1. **Persona definition**: voice, tone, name preferences, escalation language. Drafting a system prompt requires owner input on brand voice. Suggest: starting from "FOAI/AOF executor — confident, terse, receipt-discipline" baseline and refining.

2. **Implementation path**: A / B / C above.

3. **Lil_Hawk catalog**: confirm the 16-Hawk roster from §4.3 OR amend.

4. **Scheduled jobs catalog**: confirm the §5.2 list as initial roster.

5. **Migration timing**: ship CH runtime as Wave 2 (after Coastal CwoaC end-to-end is proven on the current Wave 1 setup) OR as Wave 1.5 (sooner, but parallel to other gaps).

6. **Personality system prompt review**: every public release of CH should have its system prompt reviewed by NemoClaw for "no bypass language" + by Autoresearch for "no unverified claims about FOAI" — meta-policy.

---

## 11. Code_Ang ship-checklist alignment

When CH runtime ships, the per-app audit:
- **Gate 1 (Does It Run)**: single-command start, env var docs, health endpoint, error handling
- **Gate 3 (Core Feature)**: customer DM → CH agent loop → tool dispatch → response with receipt
- **Gate 6 (Security)**: NemoClaw on every action, virtual-key support per Lil_Hawk, no token leak
- **Gate 7 (Survive)**: graceful degradation when Hermes/NemoClaw/Autoresearch each fail; cost caps; load test under 10× owner traffic

Betty-Anne_Ang scope-eval gate fires at Path A/B/C selection — three-layer A.I.M.S. evaluation before any code.

---

## End of vision

This is the uncapped, no-pruning composite. Routing is intent-driven, parallelized where independent, gated at every action with policy + audit trail. Customer never knows about Hermes / NemoClaw / Autoresearch. Owner sees the full receipt chain anytime. Lil_Hawks scale CH's parallelism on demand. Scheduled jobs let CH evolve itself nightly under owner approval.

Owner decisions on the 6 points in §10 unlock the implementation phase.
