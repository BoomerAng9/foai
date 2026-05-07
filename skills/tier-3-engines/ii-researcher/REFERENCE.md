# ii-researcher — Tier 3 Engine Reference

**Not a SKILL.md — infrastructure.** Cross-tier accessible per
FOAI-RUNTIME-002. Not exclusive to ACHEEVY.

## What it is

Research-specialized agent harness. Pairs with AutoResearch (workflow
engine) and Hermes (NousResearch framework) for deep-research workflows
— literature scan, market intelligence, CVE depth, regulatory canon
review, competitive landscape, citation chain assembly.

## Use cases

- Boomer_Ang Scout_Ang's primary engine for market scout sweeps.
- Cyber_Audit_Hawk + Cyber_Pentest_Hawk for CVE depth and threat-intel
  lookup.
- Iller_Ang for visual-trend research grounded in image corpora.
- Code_Ang for dependency-graph + license analysis.
- Edu_Ang for curriculum source-of-truth assembly.
- Any role can invoke for one-off research dispatch.

## Invocation contract

```http
POST https://ii-researcher.foai-aims.run.app/v1/research
Authorization: Bearer ${II_RESEARCHER_TOKEN}
Content-Type: application/json

{
  "query": "<natural-language research question>",
  "depth": "shallow | standard | deep",
  "time_horizon_hours": 0.5 | 2 | 12,
  "citation_mode": "inline | endnotes | both",
  "egress_policy": "<nemoclaw_policy_id>",
  "memory_handle": "<optional — append to existing research thread>"
}
```

Returns `{ "task_id": "...", "report_url": "...", "citations": [...] }`.

## Pairing

ii-researcher commonly chains with:
- **AutoResearch** for multi-step workflow orchestration (run, refine, re-query).
- **Hermes** for cross-reference reasoning across multi-source citation.
- **Commonground core** for shared-state when multiple agents run parallel research on the same topic.

## Egress policy

Same as ii-agent — NemoClaw policy gate at the edge, audit log to
BigQuery.

## Cost metering

Per-query billed against the calling tier's research budget. Cost
envelope alerts surface in the Hermes evals dashboard.
