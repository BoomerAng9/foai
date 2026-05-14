# INTAKE — ii-commons (Intelligent Internet shared utilities)

**Component:** `ii-commons`
**Source (candidate):** github.com/Intelligent-Internet/ii-commons (Apache 2.0 — to verify on clone)
**Status:** intake_complete (Step 1)
**Composes into:** ACHEEVY Super App (shared substrate slice — used by ii-agent + ii-researcher)
**Date:** 2026-05-14

---

## 1. Technical intent

Adapt ii-commons as the **shared utility layer** under ii-agent + ii-researcher inside the ACHEEVY Super App. ii-commons is not a standalone runtime — it's a library of HTTP clients, schemas, retry logic, and shared type definitions that the other Intelligent Internet projects depend on. The "intake" of ii-commons is therefore lighter-weight: install as a Python/Node dependency in the ii-agent + ii-researcher containers, version-pin, and ensure update propagation across both.

Unlike ii-agent / ii-researcher, ii-commons does NOT get its own adapter service or its own tool registry "endpoint" — it's a vendored dependency. The "tool registry entry" for ii-commons is more a **dependency manifest** than a callable tool, but it lives in the same registry for consistency + auditability.

## 2. Target architecture

```
foai/integrations/
  ├─ ii-agent/          (uses ii-commons as a dep)
  ├─ ii-researcher/     (uses ii-commons as a dep)
  └─ ii-commons/        (vendored library — version-pinned)
```

No standalone container. No endpoint. Version-pin via package manager (uv lockfile / poetry / npm).

## 3. Repository intake checklist

- [ ] Clone github.com/Intelligent-Internet/ii-commons to `foai/integrations/ii-commons/upstream/`
- [ ] Confirm Apache 2.0 license
- [ ] Read README + identify what utilities it provides
- [ ] Identify package manager + how to vendor (PyPI? GitHub direct? built locally?)
- [ ] Identify peer-dep version requirements
- [ ] Run any tests it ships with
- [ ] Note any security risks (HTTP clients with insecure-by-default settings, etc.)

## 4. Deployment path

**No deployment.** This is a library, not a service. It ships INSIDE ii-agent + ii-researcher containers as a vendored dep. The "integration" is the package-manager pin + the documented update protocol.

## 5. Exposure plan

**No exposure.** Library, not service.

## 6. Wrapper contract

ii-commons doesn't have a callable wrapper. The "contract" is the package-manager lockfile entry + the version-pin verification in the parent container's build.

```yaml
# Example placement in foai/integrations/ii-agent/pyproject.toml or equivalent:
dependencies:
  ii-commons = { git = "https://github.com/Intelligent-Internet/ii-commons.git", tag = "<pinned-tag>" }
```

## 7. Router integration

**No router integration.** ii-commons is not a routable tool.

## 8. Automation integration

- Update protocol: AutoResearch should track ii-commons releases on the `huggingface_search` / `ii_commons_github` source (TODO: add adapter in autoresearch/sources/ if not already covered). Drift alerts when upstream tags a new version.
- Auto-bump policy: never auto-bump. Owner approves dependency updates.

## 9. Security gates

- Vendored via git tag pin (not floating `main`)
- Dependency audit at build time (uv audit / npm audit)
- No secrets in the library itself; secrets live in the consuming containers
- License auditor in CI flags any non-Apache/MIT transitive deps

## 10. Coding-agent prompt template

```text
You are vendoring ii-commons as a dependency of ii-agent + ii-researcher inside the FOAI ACHEEVY Super App.

Tasks:
1. Clone github.com/Intelligent-Internet/ii-commons to foai/integrations/ii-commons/upstream/ at a SPECIFIC tag
2. Pin the same tag in foai/integrations/ii-agent/pyproject.toml (or equivalent package manifest)
3. Pin the same tag in foai/integrations/ii-researcher/pyproject.toml (or equivalent)
4. Add ii-commons to AutoResearch tracking — new adapter or entry in registry.py
5. Document the update protocol in foai/integrations/ii-commons/README.md
6. Run consumer tests (in ii-agent + ii-researcher) to verify the pin is consistent
7. PROOF_BUNDLE.md noting the pinned tag + verification

Acceptance: Both ii-agent + ii-researcher run smoke tests using the pinned ii-commons version.
```

## 11. Acceptance criteria

- [ ] Upstream cloned at a specific tag (not `main`)
- [ ] License confirmed Apache 2.0
- [ ] Pinned in both ii-agent + ii-researcher manifests at the same tag
- [ ] AutoResearch tracking entry added for ii-commons releases
- [ ] Consumer smoke tests pass with the pinned version
- [ ] Update protocol documented
- [ ] No secrets committed
