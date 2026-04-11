# Common_Chronicle — Vendored Source

| Field | Value |
|-------|-------|
| **Repository** | https://github.com/Intelligent-Internet/Common_Chronicle |
| **Commit** | b934dd1c41cee6116c5ffdbaacf3da423775c9cf |
| **Date** | 2025-08-27 |
| **Branch** | main |
| **License** | See LICENSE in this directory |
| **Tech Stack** | Python 3.12+, FastAPI, SQLAlchemy, asyncpg, pgvector, Pydantic |
| **Vendored** | 2026-04-10 (Wave 4) |

## What was removed during vendoring

- `.git/` directory (not a submodule)
- `.github/` (CI/CD workflows, issue templates)
- `showcase/` (demo images, ~38 MB)
- `frontend/` (React/Vite UI — not needed for backend timeline API)
- `uv.lock` (lock file for uv package manager)

## Purpose in FOAI

Chronicle provides the structured timeline indexer for agent task events.
The `timeline.py` wrapper in this directory adapts it to FOAI's Neon-backed
`chronicle` schema and exposes `record_event`, `get_timeline`, and
`get_agent_timeline` for the agent fleet.
