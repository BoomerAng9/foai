# Taskade Genesis App Clone Factory (Phase 8, Track #103)

Provisions a fresh Taskade Organization per consultancy client from the canonical `manifest.yaml`. Each clone is per-client tenant-isolated (separate Taskade Org + separate `foai_<slug>` Neon schema). Sacred Separation enforced at the rendering layer; AI stays inside the client's FOAI gateway, not Taskade-native (Tier 3 LTD 0 AI credits canon).

## Scaffold status

This PR ships the **factory scaffold + manifest + tests** — the actual Taskade API provisioning steps (Org create, workspace create, folder create, etc.) are deferred to the first-client PR per the Forward-Deploy receipt anti-pattern guard:

> "Vertical Skin destination requires at least one named licensee prospect with active conversation — not a hypothetical TAM list."

Once a consultancy prospect is named + in active conversation, the first-client PR:
1. Fills in the actual Taskade REST calls in `clone.py` steps 2-8
2. Captures the real provisioning sequence
3. Promotes the Forward-Deploy receipt status `proposed → proven → promoted`

Until then, `clone_to_client()` walks the NemoClaw gate, renders the manifest, returns a `ClientCloneResult` with placeholder IDs + the SAML setup doc path. Useful as a dry-run / structure validator.

## Files

- `manifest.yaml` — canonical Org structure. 2 workspaces (`<CLIENT> — Operations`, `<CLIENT> — AI Ecosystem`), 7 folders (audit-ledger-mirror / hrpmo-cycles / forward-deploy-receipts / incidents / agent-roster / skill-library / playbooks), 3 project skeletons, 3 stub agents (FOAI-gateway-backed, NOT Taskade-native), 2 automation triggers, per-client Neon schema declaration.
- `clone.py` — factory entry point `clone_to_client(...)`. Walks the manifest, substitutes `{{CLIENT_NAME}} / {{CLIENT_SLUG}}` placeholders, opens NemoClaw owner-approval gate, records every provisioned resource for rollback. `rollback()` walks `created_resources` in reverse and destroys each.
- `tests/test_clone.py` — 10 pytest cases: slugify edge cases, manifest substitution, missing-param error, NemoClaw approval / rejection paths, scaffold completion, telegram_id capture, to_dict serialization, rollback reverse-order.

## NemoClaw gate (load-bearing)

Every clone call opens an owner-approval Telegram message via `NemoClawProtocol.request_owner_approval()` with:
- `risk_tag: client_org_provisioning` (NEW — added by this PR, requires owner approval per FOAI risk-tag canon)
- `action_summary` — exactly which resources will be created
- `rollback_instructions` — how to undo if owner rejects mid-provision
- `estimated_cost` — Taskade Org seats + Neon schema storage estimate

If owner rejects (or Telegram times out): factory returns `ClientCloneResult.status = "failed"` with `owner_rejected_via_nemoclaw` in errors. Zero resources provisioned.

## Sacred Separation in client clones

Each client Org's `audit-ledger-mirror` and `hrpmo-cycles` folders default to `owner_tier` (raw agent names visible to client owner + FOAI consulting team only). `client-tier` rendering applies if a client invites their own end-customers to a project — agent names map to role descriptors via `foai/integrations/taskade/role_descriptors.py`.

Stub agents in `manifest.yaml.stub_agents` declare `foai_gateway_route: true` — Taskade automation entries fire webhooks pointing back at the client's FOAI deployment, never invoke Taskade-native AI. This enforces the Tier 3 LTD 0-AI-credits constraint structurally.

## Tests

```bash
# From foai/ repo root
pip install pyyaml pytest
PYTHONPATH=. pytest integrations/taskade/genesis_template/tests/ -v
```

10 cases. SQLite not required (factory is in-memory until first-client PR).

## Forward-Deploy receipt

`iCloud/.../FOAI Project/receipts/forward_deploy/2026-05-14_taskade-org-as-vertical-skin.md` — status `proposed`. Promotion criteria:
- Instance #1: Coastal Brewing Co.'s `companion_taskade.py` (existing production)
- Instance #2: FOAI internal Org "The Future of A.I." (this integration plan, PR α–ζ)
- Instance #3: first named consultancy client (when owner signs)

Receipt lives in iCloud, not in this repo, because the receipt's promotion gate depends on owner-controlled events (signing a client) — not code state.
