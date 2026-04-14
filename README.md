# FOAI-AIMS Ecosystem — CTI Hub/THE DEPLOY PLATFORM

AI-Managed Solutions for businesses. Powered by autonomous agent hierarchies, enforced tenant isolation, and a revenue-first mandate.

## Live Services

| Service | Engine | Endpoint |
|---------|--------|----------|
| **OpenClaw** | RuntimeAng | https://openclaw-service-939270059361.us-central1.run.app |
| **NemoClaw** | GuardAng | https://nemoclaw-service-939270059361.us-central1.run.app |
| **Money Engine** | API | https://money-engine-api-939270059361.us-central1.run.app |
| **Hermes** | LearnAng | https://hermes-agent-939270059361.us-central1.run.app |
| **Edu_Ang** | Boomer_Ang | https://edu-ang-939270059361.us-central1.run.app |
| **Scout_Ang** | Boomer_Ang | https://scout-ang-939270059361.us-central1.run.app |
| **Content_Ang** | Boomer_Ang | https://content-ang-939270059361.us-central1.run.app |
| **Ops_Ang** | Boomer_Ang | https://ops-ang-939270059361.us-central1.run.app |
| **Biz_Ang** | Boomer_Ang | https://biz-ang-939270059361.us-central1.run.app |

## Core Hubs

- `ai-managed-solutions.cloud` — Primary SaaS platform
- `plugmein.cloud` — Integration marketplace

## Structure

See `AGENTS.md` for the full agent hierarchy.
See `docs/SOUL.md` for mission and revenue mandate.
See `docs/BRAIN.md` for tenant isolation rules.

## Repo Topology

This root repository is an operational umbrella workspace, not a single-package app.

- `cti-hub/` serves CTI Hub and `deploy.foai.cloud`
- `perform/` serves Per|Form and related producer flows
- `runtime/` contains the Python runtime services and tests
- `GRAMMAR/`, `SmelterOS/`, and `aims-tools/aims-core/` are tracked as nested git repos/submodules and need to be initialized or updated intentionally

Validation and deployment happen through local/Docker workflows, Hostinger VPS services, Cloud Run services/jobs, and GCP-managed secrets rather than GitHub-native CI/CD alone.
