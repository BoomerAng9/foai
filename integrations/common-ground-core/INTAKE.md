# INTAKE — Common Ground Core (cross-vertical state, identity, policy primitives)

**Component:** `common-ground-core`
**Source (candidate):** TBD — owner directive 2026-05-14 names "Common Ground Core" as part of the ACHEEVY Super App stack. Canonical repo not yet confirmed; candidate targets:
- github.com/common-ground/core (unverified)
- github.com/common-ground-ai/core (unverified)
- Could be an internal FOAI canon component that doesn't have an OSS upstream; in that case, the "intake" becomes a SPEC-WRITE rather than a clone

**Status:** intake_complete (Step 1) — **with unverified source**
**Composes into:** ACHEEVY Super App (shared substrate slice — tenant routing, identity, per-vertical policy)
**Date:** 2026-05-14

---

## 1. Technical intent

Adapt Common Ground Core as the **shared substrate for cross-vertical state, identity, and policy primitives** under ACHEEVY. When ACHEEVY routes work, it needs to know: which tenant is this for (Coastal Brewing Co. vs Per|Form vs Recruit Smartly vs licensee X)? What identity is the caller? What policy boundaries apply to this tenant?

Common Ground Core is the **per-tenant state surface** that all FOAI verticals share. It maps roughly to what Stripe Connect / Auth0 Tenants / Vercel Teams provide in their respective stacks — but designed for an agentic-org-orchestrator's needs (per-tenant agent rosters, per-tenant tool allowlists, per-tenant approval thresholds, per-tenant cost ceilings).

## 2. Target architecture

```
ACHEEVY runtime
  └─ Common Ground Core (state + identity + policy)
      ├─ Tenant: coastal-brewing
      │   ├─ Agent allowlist (Sal / LUC / Melli / Marcus / ACHEEVY-coastal)
      │   ├─ Tool allowlist (autoresearch / hermes / stripe-coastal / mercury-coastal)
      │   ├─ Policy bounds (NemoClaw Coastal-specific actions)
      │   └─ State store (audit ledger / artifact registry per-tenant)
      ├─ Tenant: perform
      ├─ Tenant: nurdscode
      └─ Tenant: <licensee X>
          (cloned via Genesis app — per the consulting report Phase 4 platform thesis)
```

Adapter location: `foai/integrations/common-ground-core/adapter/` (next PR)

## 3. Repository intake checklist

**Step 0 — verify source identity:**

- [ ] Owner confirms canonical repo URL (or confirms this is an internal FOAI spec — no upstream)
- [ ] If OSS: clone + confirm Apache 2.0 license
- [ ] If internal: write SPEC.md at `foai/integrations/common-ground-core/SPEC.md` defining the desired primitives + scaffold from scratch under that spec

Then (if OSS):
- [ ] Read README + identify stack
- [ ] Identify package manager + storage backends (Postgres? Neon? Spanner?)
- [ ] Inspect API surface (REST? gRPC?)
- [ ] Inspect identity model (OIDC? magic-link? custom?)
- [ ] Identify tests + run them
- [ ] Security audit (tenancy isolation strength, policy bypass risk)

## 4. Deployment path

**If OSS:** containerized service alongside ii-agent + ii-researcher. Same network. Tenant-state DB on Neon Postgres.

**If internal spec:** scaffold as a FastAPI service at `foai/integrations/common-ground-core/service/` with Postgres + REST API. Build sequence:
1. Define tenant schema (tenant_id, agent_allowlist, tool_allowlist, policy_bounds, cost_ceilings, audit_namespace)
2. Build CRUD service + GET-tenant-context endpoint
3. Wire Chicken Hawk Gateway + ACHEEVY runtime to consult tenant context at dispatch time
4. Wire NemoClaw verdict to read policy_bounds from tenant context
5. Wire Hermes audit_ledger to scope rows by tenant_id

## 5. Exposure plan

| Surface | Target | Auth |
|---|---|---|
| Admin UI (owner-tier) | `https://acheevy.foai.cloud/admin/tenants/` | magic-link owner-tier |
| Tenant context API | `https://acheevy.foai.cloud/api/tenants/{tenant_id}/context` | Bearer `ACHEEVY_INTERNAL_API_KEY` |
| Healthcheck | `https://acheevy.foai.cloud/api/tenants/health` | no auth |

## 6. Wrapper contract

```json
{
  "tool_name": "common_ground_core",
  "task_type": "tenant_context_lookup",
  "input_schema": {
    "type": "object",
    "properties": {
      "tenant_id": { "type": "string", "description": "e.g. 'coastal-brewing', 'perform', 'licensee-coffee-chain-x'" },
      "actor_email": { "type": "string", "description": "Owner or operator email; used for audit + scope" }
    },
    "required": ["tenant_id"]
  },
  "output_schema": {
    "type": "object",
    "properties": {
      "tenant_id": { "type": "string" },
      "display_name": { "type": "string" },
      "agent_allowlist": { "type": "array", "items": { "type": "string" } },
      "tool_allowlist": { "type": "array", "items": { "type": "string" } },
      "policy_bounds": { "type": "object", "description": "NemoClaw rule overlay for this tenant" },
      "cost_ceilings": { "type": "object", "properties": { "monthly_credit_cap": { "type": "integer" }, "per_invocation_cap_usd": { "type": "number" } } },
      "audit_namespace": { "type": "string", "description": "Hermes audit_ledger table or schema name for this tenant" }
    },
    "required": ["tenant_id", "agent_allowlist", "tool_allowlist", "policy_bounds", "audit_namespace"]
  },
  "auth_required": true,
  "timeout_seconds": 10,
  "requires_human_approval": false,
  "side_effect_level": "read_only",
  "callback_url_supported": false
}
```

## 7. Router integration

**Common Ground Core is consulted on EVERY dispatch** — not a routable tool the agent picks but a substrate that's read before every action. ACHEEVY's intent classifier accepts a `tenant_id` parameter; if absent, defaults to the FOAI executive tenant.

**Routing rules:**
- Every Chicken Hawk Gateway `/run` invocation first calls `common_ground_core.get_tenant_context(tenant_id)` to load allowlists + policy
- NemoClaw verdict consults `policy_bounds` from tenant context before its own BLOCKED/REQUIRES_OWNER_APPROVAL/ALLOWED_WITHOUT_APPROVAL evaluation
- Failure to resolve a tenant → fall back to FOAI executive tenant (logged as a warning)

## 8. Automation integration

- Cache: tenant context cached for 60s per tenant_id (configurable)
- Cache invalidation: on tenant updates via the admin UI
- Heartbeat: 30s ping
- No retries on context lookup (fast read; fail-fast)
- Kill switch: tool registry `enabled: false` — if Common Ground Core is disabled, ACHEEVY falls back to a hardcoded FOAI default tenant context (degraded mode)

## 9. Security gates

- Tenant isolation: strict per-tenant data scoping; no cross-tenant reads without explicit owner-tier authorization
- Auth: all admin writes require magic-link owner-tier; all reads require internal Bearer token
- Audit: every tenant_context_lookup logs to `hermes_audit_ledger.common_ground_core_reads`
- Encryption: at rest (Postgres TDE) + in transit (TLS)
- PII handling: minimize PII storage; only what's required for routing decisions
- Tenant deletion: 30-day soft delete with hard purge owner-approved

## 10. Coding-agent prompt template

```text
You are intaking Common Ground Core into the FOAI ACHEEVY Super App.

PRIORITY: confirm the source. Owner directive 2026-05-14 lists this as part of the ACHEEVY architecture but the canonical repo URL is not yet confirmed. Tasks:

1. Ask owner (via Telegram or session): "Common Ground Core — canonical repo URL? Or is this an internal FOAI spec we build from scratch?"

If OSS confirmed:
2. Clone to foai/integrations/common-ground-core/upstream/
3. Run the standard intake (license / readme / docker / smoke / adapter / tests / proof bundle)

If internal-spec confirmed:
2. Write foai/integrations/common-ground-core/SPEC.md per the INTAKE.md §2 architecture
3. Scaffold FastAPI service at foai/integrations/common-ground-core/service/
4. Build CRUD + GET-tenant-context + wire to Neon Postgres
5. Wire Chicken Hawk Gateway + ACHEEVY runtime to consult tenant context
6. Wire NemoClaw to read policy_bounds from tenant context
7. Wire Hermes to scope audit_ledger by tenant_id

Either way:
8. Bump foai/registry/tools/common-ground-core.yaml intake_status from `candidate` → `sandbox_verified`
9. PROOF_BUNDLE.md
10. PR
```

## 11. Acceptance criteria

- [ ] Source identity confirmed (OSS repo URL OR internal-spec greenlight)
- [ ] Adapter / service runs from a clean checkout
- [ ] /health returns 200
- [ ] /api/tenants/{tenant_id}/context returns valid output_schema-shaped response
- [ ] Tenant isolation enforced (cross-tenant access returns 403)
- [ ] Audit log row written for every tenant_context_lookup
- [ ] PROOF_BUNDLE.md produced

## Owner-action question raised by this intake

Per §10 — is Common Ground Core a public OSS repo (and where) or an internal FOAI spec we build from scratch? This is a Step-2 blocker the owner needs to resolve before the actual clone or scaffold work begins.
