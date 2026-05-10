# ii-agent — Tier 3 Engine Reference

**This is NOT a SKILL.md.** ii-agent is infrastructure. Any tier (Tier 1
ACHEEVY, Tier 2 Boomer_Angs / Hawks / Coastal cast / Roo's, Tier 3
Cloud Run services) can invoke ii-agent through its published interface.

Per FOAI-RUNTIME-002 §"Cross-tier accessibility rule" — ii-agent is
**not exclusive to ACHEEVY**.

## What it is

General-purpose agent harness for workloads outside the Anthropic-only
Tier 2 envelope. Runs on `foai-aims` GCP (Cloud Run + GKE Autopilot per
FOAI-RUNTIME-001 §2.3). Skills mounted via Cloud Storage FUSE from
`gs://foai-aims-skills/`.

## Use cases

- Workloads that exceed Managed-Agent session-hour envelopes.
- Workloads with regulatory air-gap requirements (no Anthropic compute).
- Workloads that must stream into deploy.foai.cloud or per-tenant
  Cloudflare Sandbox SDK isolates.
- A/B testing of non-Anthropic models (OpenRouter passthrough, vendor
  diversity).

## Invocation contract

```http
POST https://ii-agent.foai-aims.run.app/v1/run
Authorization: Bearer ${II_AGENT_TOKEN}
Content-Type: application/json

{
  "skill_id": "<skill_id from foai/skills/.../SKILL_ID.json>",
  "input": { ... },
  "memory_store": "/mnt/memory/<scoped>",
  "egress_policy": "<nemoclaw_policy_id>",
  "max_session_hours": 4
}
```

Returns `{ "task_id": "...", "stream_url": "wss://...", "memory_handle": "..." }`.

## Egress policy

Every ii-agent call passes through NemoClaw (Gate 6 — egress audit).
Unscoped outbound is denied at the WAF edge. Calls log to BigQuery
`foai_audit.ii_agent_invocations` for cost-meter and forensic trace.

## Cost metering

Per-call billed against the calling tier's cost envelope (Gate 7).
Hermes evals dashboard surfaces frequency by invoking tier + by skill.

## Promotion path

If an ii-agent invocation pattern stabilizes into a recurring workflow,
it gets promoted to a standing Boomer_Ang (Tier 2 Managed Agent) by
Code_Ang's 7-gate audit.
