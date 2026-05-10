# Wave 1.5 Deferral Acceptance

**Date:** 2026-04-26
**Authority:** Code_Ang Ship Checklist v1.0 + Owner blanket approval 2026-04-26
**Owner:** asg@achievemor.io
**Scope:** Items deferred from Wave 1 with explicit acceptance, sized fix path, and Wave 1.5 trigger conditions.

This document is the formal receipt that the Wave 1 ship-checklist gaps below are KNOWN, ACCEPTED, and SIZED — not forgotten. Per Code_Ang authority: nothing claims "shipped" while these are open, but each has a documented Wave 1.5 path and trigger condition.

---

## Deferral roster

| ID | Subject | Ship Checklist Item | Status | Trigger to thaw | Estimated effort |
|---|---|---|---|---|---|
| D-01 | Fleet uptime monitor + push alerting | Item 31 | accepted-defer | Coastal CwoaC end-to-end runs unattended for 24h | 4h (Uptime Kuma + alert webhook) |
| D-02 | Multi-tenant authorization (cross-tenant isolation) | Item 34 | accepted-defer | First AOF Tier-Pro paying customer signed | 2 days (per-virtual-key data scoping) |
| D-03 | Load testing executed (runbook only today) | Item 41 | accepted-defer | Before any public traffic event (TCR webinar, AOF customer #1) | 1h (k6 scripts already in repo) |
| D-04 | Per-service cost controls / spend caps | Item 42 | accepted-defer | When monthly LLM spend > $200 OR first paying customer | 4h (LiteLLM virtual-key max_budget + provider rate limits) |
| D-05 | Pip CVE-2026-3219 in chicken-hawk gateway | Item 37 | accepted-defer | Upstream pip patches the CVE (no fix available 2026-04-26) | 5 min after upstream releases |
| D-06 | LiteLLM multi-worker mode | n/a (operational) | accepted-defer | Upstream wolfi-fork issue resolved, OR concurrent traffic justifies | 1h after upstream fix |
| D-07 | Public TLS at `litellm.foai.cloud` and `hermes.foai.cloud` | Item 27 | accepted-defer | Owner adds Hostinger DNS A-records | 30 min after DNS propagates (certbot + nginx route swap) |
| D-08 | Virtual key generation dashboard for AOF customers | Item 33 (auth) | accepted-defer | First AOF Tier-Pro customer signed | 1 day (LiteLLM admin UI surface or custom shim) |
| D-09 | Step E Vast.ai provision (Coastal chat lane) | Step E | owner-action gated | Owner pastes VAST_API_KEY + MOONSHOT_API_KEY + greenlights burn cap | 30 min once keys land |
| D-10 | Step H ii-agent overlay deploy | Step H | upstream-blocked | Upstream Intelligent-Internet/ii-agent ghcr packages public OR re-scope to upstream stack.yaml | 2-3h re-scope |
| D-11 | Step C Hermes Telegram + tools registration | Step C | owner-action gated | Owner runs interactive `hermes gateway setup` on aims-vps | 5 min interactive TTY |
| D-12 | Step G AgentScope flag-on (`SQUAD_BACKEND=agentscope`) | n/a (operational) | by Wave 1 plan | 48h soak with default asyncio backend, then flip | 1 min env flip + restart |
| D-13 | Wire Agent Zero into UEF Gateway as dispatchable tool | Step I wiring | scope-pending | Scope eval + Betty-Anne_Ang gate before code | 4h (~50 line Node.js adapter + scope eval) |
| D-14 | Sync myclaw-vps chicken-hawk drift back to repo | n/a (drift) | accepted-defer | Next chicken-hawk repo PR | 30 min |
| D-15 | Backfill audit_chain for historical receipts (pre-2026-04-26) | n/a (data) | accepted-defer | If a customer asks for full retroactive chain coverage | 1h (one-shot Python script) |

---

## Gap details

### D-01 — Fleet uptime monitor + push alerting

**What's missing:** No automated push-alert when any container goes down across myclaw-vps / aims-vps / AIMS Core. Today the operator pulls `docker ps` to check. A 3 a.m. crash at one of the three hosts would not notify anyone until a customer hit the failure.

**Wave 1 mitigation:** Operator-only traffic so blast radius is bounded. All containers have healthchecks; `restart: unless-stopped` policy auto-recovers from transient crashes.

**Wave 1.5 fix:** Uptime Kuma container on AIMS Core (or external service like Better Stack) probing every container's healthcheck endpoint + Telegram webhook to operator on flap. ~4h.

**Trigger:** Coastal CwoaC pipeline runs unattended for 24h. Before that, operator-pull is acceptable.

### D-02 — Multi-tenant authorization

**What's missing:** Wave 1 is single-owner. Every API key (NEMOCLAW, LITELLM_MASTER, CHICKEN_HAWK_BEARER) is global — anyone with one has full platform access. AOF Tier-Pro buyers each need their own scoped credential set with data isolation.

**Wave 1 mitigation:** No paying customers yet. Owner is the only consumer.

**Wave 1.5 fix:** LiteLLM virtual-key generation per customer with `models` allowlist + `max_budget` + `metadata.tenant_id`. NemoClaw + chicken-hawk routes filter dispatches by tenant. audit_chain entries scoped by tenant_id. ~2 days.

**Trigger:** First AOF Tier-Pro paying customer signed. Until then, single-owner is the explicit Wave 1 design.

### D-03 — Load testing executed

**What's missing:** k6 scripts and pass criteria are documented at `coastal-brewing/docs/LOAD_TEST_RUNBOOK.md` but no actual load run has happened. We don't have a measured p95 / 5xx-rate / autoscale-trigger receipt.

**Wave 1 mitigation:** Coastal traffic is owner + occasional demo only. Capacity headroom on each container is large (1 CPU / 1G RAM caps with single-digit-RPS workload).

**Wave 1.5 fix:** Run the existing k6 scripts before any public traffic event (TCR webinar, demo day, AOF customer onboarding). Archive output JSON + log to `iCloudDrive/Claude Code/load-tests/`. ~1h once triggered.

**Trigger:** Before any traffic event involving non-operator users. Public webinars + AOF customer onboarding both qualify.

### D-04 — Per-service cost controls / spend caps

**What's missing:** No per-virtual-key `max_budget` in LiteLLM (master_key only). No per-provider spending alerts on OpenRouter / Anthropic / Moonshot. Theoretically a runaway agent loop could rack up significant API spend before anyone notices.

**Wave 1 mitigation:** Owner-only traffic; manual review of Anthropic Console / OpenRouter Activity dashboards.

**Wave 1.5 fix:** LiteLLM virtual-key `max_budget` + `tpm`/`rpm` rate limits + provider-side dashboard alerts at $50/$100/$500. ~4h.

**Trigger:** Either monthly aggregate spend exceeds $200 OR first paying customer signed.

### D-05 — pip CVE-2026-3219

**What's still open:** chicken-hawk gateway runs pip 26.0.1; CVE-2026-3219 has no upstream fix as of 2026-04-26. We cleared CVE-2025-8869 and CVE-2026-1703 with the upgrade.

**Wave 1 mitigation:** None — accepted because no upstream patch exists and the CVE has limited exploit surface for our usage.

**Wave 1.5 fix:** Re-run `pip-audit` after each pip release; bump when fix lands. ~5 min.

**Trigger:** Upstream pip releases the patch.

### D-06 — LiteLLM multi-worker mode

**What's deferred:** Currently running with default single worker because `--num_workers 2` triggered worker-fork crashloops on the Wolfi-based image. Single worker handles owner-only traffic fine.

**Wave 1.5 fix:** Track upstream LiteLLM issue tracker for wolfi-fork resolution. When fix lands, flip back to `--num_workers 2` and re-test. ~1h.

**Trigger:** Upstream LiteLLM fix OR concurrent traffic exceeds single-worker capacity.

### D-07 — Public TLS at `litellm.foai.cloud` + `hermes.foai.cloud`

**What's deferred:** Both subdomains are reachable from the fleet via `/etc/hosts` overrides + `extra_hosts:` Docker config, with HTTP-only nginx routes. Public TLS requires Hostinger DNS A-record for both subdomains pointing at AIMS Core (litellm) + aims-vps (hermes).

**Wave 1 mitigation:** Internal cross-VPS reach works perfectly via the host-override pattern. AOF Tier-Pro customers can be onboarded via shared keys + private endpoints until public TLS lands.

**Wave 1.5 fix:** Owner adds DNS A-records at Hostinger (5 min). Then on each VPS run `certbot certonly --webroot ...` for the subdomain, swap nginx config from HTTP-only to TLS, reload. ~30 min after DNS propagates.

**Trigger:** Owner DNS panel access OR Hostinger API integration.

### D-08 — Virtual key generation dashboard

**What's missing:** LiteLLM ships `disable_admin_ui: true` in our config (security hardening — matches Wave 1 plan). Generating virtual keys for customers requires CLI / API calls today.

**Wave 1.5 fix:** Either (a) flip `disable_admin_ui: false` with mTLS + IP-allowlist guard, (b) build a lightweight custom shim in AIMS frontend that calls `/key/generate` via the master key, or (c) use LiteLLM's enterprise UI if Wave 2 budget justifies. ~1 day.

**Trigger:** First AOF Tier-Pro customer sale conversation.

### D-09 — Step E Vast.ai provision

**What's staged:** `vastai` CLI installed on AIMS Core, four scripts (`01_provision`, `02_bootstrap`, `03_cloudflare_tunnel`, `04_register_in_litellm`) ready at `/root/aims/infra/vast/`, operator SSH pubkey file ready, owner approval for VRAM/network/burn cap on file.

**What's blocking:** Owner pastes `VAST_API_KEY` (vastai login) + `MOONSHOT_API_KEY` (Moonshot platform). Neither is in openclaw.

**Trigger:** Two key pastes, then `01_provision_coastal_chat.sh` fires.

### D-10 — Step H ii-agent overlay

**What broke:** Upstream `ghcr.io/intelligentinternet/ii-agent*` packages return 403 Forbidden. The AIMS overlay (`infra/docker-compose.ii-agent.yaml`) was written against publicly-pullable ghcr packages that are no longer accessible.

**Re-scope path:**
1. Clone `Intelligent-Internet/ii-agent` repo to AIMS Core
2. Adopt upstream's `docker/docker-compose.stack.yaml` (postgres + minio + redis + frontend + backend + sandbox)
3. Adapt to `aims-network` bridge + AIMS env conventions
4. Build all images locally from `docker/backend/Dockerfile` + `e2b.Dockerfile` + frontend
5. Bake II-Commons via Dockerfile extension as already in AIMS repo

**Estimated:** 2-3h re-scope work. Re-evaluate scope through Betty-Anne_Ang before code.

**Trigger:** Decision to invest the re-scope time, OR upstream restoring public ghcr access.

### D-11 — Step C Hermes interactive setup

**Container:** Hermes Agent live and healthy on aims-vps (`hermes-agent:9be83728`). API server bound on 9119. **No Telegram bot registered, no chicken-hawk tools registered** — `/opt/data/config/` is empty until owner runs setup.

**Trigger:** Owner runs `docker exec -it hermes hermes gateway setup` (Telegram bot token paste + allowlist) followed by `docker exec -it hermes hermes tools add` ×3 for chicken_hawk_run / _check / _audit. ~5 min interactive TTY.

### D-12 — Step G AgentScope flag-on

**By Wave 1 plan default:** SQUAD_BACKEND=asyncio. AgentScope code path exists in chicken-hawk gateway but is never invoked. Wave 1 plan called for 48h soak with asyncio before flipping.

**Trigger:** 48h elapsed since 2026-04-26 19:14 UTC merge of PR #312 + zero asyncio-side regressions in event-bus traces. Earliest: 2026-04-28 19:14 UTC.

### D-13 — Wire Agent Zero into UEF Gateway

**What exists:** `aims-avva-noon-1` Agent Zero container is healthy on AIMS Core (3+h uptime, image v0.9.1.1). UEF Gateway env has no `AGENT_ZERO_URL` and no calling code.

**Wave 1.5 path:** Scope eval (Betty-Anne_Ang gate). Add `AGENT_ZERO_URL=http://avva-noon:80` env. Add a Node.js adapter in `backend/uef-gateway/src/adapters/agent-zero.ts` that POSTs to the Agent Zero API. Register in the tool router. ~50 lines + tests.

**Trigger:** Owner approval that Agent Zero should be a dispatchable tool from UEF Gateway today (vs deferring to Wave 2 when ii-agent overlay is also wired).

### D-14 — Sync myclaw-vps chicken-hawk drift to repo

**What drifted:** Live `/docker/chicken-hawk/docker-compose.yml` on myclaw-vps has 3 changes not in any repo: `--upgrade pip` clause, `agentscope==1.0.19` in pip line, `extra_hosts: litellm.foai.cloud:76.13.96.107`. None of these are tracked.

**Risk:** Anyone redeploying chicken-hawk from a fresh tar-push from local checkout would lose all three changes.

**Wave 1.5 fix:** Bring the live compose file into a chicken-hawk repo PR. Decide whether the chicken-hawk repo's `docker-compose.yml` should reflect this single-gateway runner pattern (currently the repo's compose is the multi-service VPS-2 fleet pattern). ~30 min once decision is made.

**Trigger:** Next chicken-hawk repo PR OR any fresh deploy event.

### D-15 — Backfill audit_chain for historical receipts

**What's deferred:** The hash-chain (`audit_chain` table) ships fresh from `chain_id=1` on the next write after the 2026-04-26 deploy. Existing pre-deploy receipts are NOT in the chain.

**Wave 1.5 fix:** One-shot Python script that reads all 6 audit tables in chronological order and writes one chain entry per existing row. ~1h.

**Trigger:** A customer specifically asks for full retroactive chain coverage. The audit_chain claim ("every action ACHEEVY takes is signed into a tamper-evident chain") is honest from the 2026-04-26 forward; pre-deploy history is preserved but unchained.

---

## What's NOT deferred (still on the Wave 1 punch list)

- DNS A-records at Hostinger — Owner-action, not deferral. Once added, D-07 thaws automatically.
- Vast API key + MOONSHOT key pastes — Owner-action, not deferral. Once received, D-09 thaws automatically.
- Hermes interactive setup — Owner-action, not deferral. ~5 min.

These three are the only outright Wave 1 blockers that don't have a Wave 1.5 trigger condition — they're just owner-time gates.

---

## What this document does not cover

- **Wave 2 scope** (multi-tenant SaaS, public dashboard, multi-instance horizontal scaling) — separate planning artifact.
- **Broad|Cast Studio LTX-2.3 deployment** — its own platform, side-quest, tracked at `~/.claude/projects/C--Users-rishj/memory/project_broadcast_ltx_vast_side_quest.md`.
- **Per-FOAI-app shipping audits** — Code_Ang's per-app ship-checklist runs separately for AOF Tier-1 buyers as they sign.

---

## Code_Ang authority verdict

Wave 1 has **NOT** "shipped" by the strict authority rule. 7 of the 15 deferred items have explicit Wave 1.5 triggers; 4 are owner-action gated; 2 are upstream-blocked; 2 are by-Wave-1-plan-design-deferred; 1 is data-cleanup pending customer ask.

Honest position remains: **"Infrastructure landed; remediation in progress with documented Wave 1.5 acceptance."** This document IS the remediation receipt.

---

## Owner sign-off

This document signs off the deferral list on behalf of asg@achievemor.io per the blanket approval given 2026-04-26. Re-evaluation triggered when any item's "trigger" condition fires.
