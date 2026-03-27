# BRAIN — Tenant Isolation Rules

## Infrastructure

| Resource | Value |
|----------|-------|
| GCP Project | `foai-aims` |
| Firebase Project | `foai` |

All tenants share the same GCP project and Firebase project. Cost efficiency is non-negotiable at this stage.

## Tenants

| Tenant | Namespace | Status |
|--------|-----------|--------|
| `cti` | CTI Nerve Center — education vertical | Active |
| `plugmein` | PlugMeIn — integration marketplace | Active |
| *(future)* | New verticals added by ACHEEVY only | — |

## Isolation Model

Tenants share infrastructure but are **strictly isolated** at the data and config level:

1. **Namespace separation** — Every Firestore collection, storage bucket path, and config key is prefixed with the tenant ID (`cti/`, `plugmein/`, etc.).
2. **No cross-tenant access** — No agent reads or writes another tenant's namespace. Ever. This is enforced, not suggested.
3. **GuardAng enforcement** — NemoClaw (`GuardAng`) enforces all tenant boundaries at the runtime layer. Every data operation passes through GuardAng's policy check before execution.
4. **Config isolation** — Tenant-specific configuration lives under `data/{tenant}/config/`. Shared platform config lives under `data/platform/`.

## Rules

- Adding a new tenant requires ACHEEVY approval.
- Tenant namespaces are immutable once assigned.
- GuardAng is the single enforcement point. No agent bypasses it.
- If GuardAng is down, all cross-tenant operations halt. Fail closed, not open.
