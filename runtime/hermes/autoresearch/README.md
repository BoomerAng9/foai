# AutoResearch — Hermes-hosted model-currency enforcement

Sibling to Deep Think. Runs inside the existing Hermes FastAPI +
apscheduler service. Its job: enforce the **always-latest-OSS-model
rule** by scanning every vendor we depend on weekly, diffing the
latest flagship against our pinned version, and alerting on drift.

Canonical memory lock: `feedback_always_latest_oss_model_autoresearch.md`.

## One-line justification

Model releases ship compounding capability improvements. Running
Nemotron-3-Nano when Nemotron-3-Super is the flagship means the whole
platform reasons worse. Currency is infrastructure, not vibes.

## Architecture

```
                              Hermes scheduler
                              (weekly Monday 06:00 UTC)
                                      │
                      ┌───────────────┴────────────────┐
                      ▼                                ▼
              AutoResearch CLI                AutoResearch API router
              (ad-hoc runs)                   (/autoresearch/*)
                      │                                │
                      └───────────────┬────────────────┘
                                      ▼
                           engine.scan_all()
                                      │
                     ┌────────────────┼─────────────────┐
                     ▼                ▼                 ▼
               registry.py     sources/nvidia.py   sources/<vendor>.py
               (what we        (per-vendor          (per-vendor
                track)          scraper)             scraper)
```

## Files

| File | Role |
|---|---|
| `registry.py` | Canonical list of every tracked model + consumers + pinned id + upgrade-blocker notes |
| `sources/base.py` | `SourceAdapter` interface + `SourceFinding` dataclass |
| `sources/nvidia.py` | NVIDIA HuggingFace scraper + Cosmos GitHub releases adapter |
| `sources/stubs.py` | Stub adapters for fal.ai / Recraft / Google / Anthropic / HF search (wire real ones over time) |
| `sources/__init__.py` | Adapter registry (maps `registry.source` → adapter instance) |
| `engine.py` | `scan_all() → CurrencyReport`. Runs all adapters in parallel, diffs against registry, classifies severity |
| `cli.py` | `hermes-autoresearch` CLI: check / json / explain <family> / registry |
| `routers/autoresearch_router.py` | FastAPI router mounted on Hermes at `/autoresearch/*` |

## Usage

### CLI

```bash
# From runtime/hermes/ (same venv as Hermes)
python -m autoresearch.cli check          # table, exits 1 if drift found
python -m autoresearch.cli json           # machine-readable
python -m autoresearch.cli explain nemotron
python -m autoresearch.cli registry
```

### API

```bash
curl http://hermes.foai.cloud/autoresearch/status
curl http://hermes.foai.cloud/autoresearch/registry
curl http://hermes.foai.cloud/autoresearch/report                 # full scan
curl http://hermes.foai.cloud/autoresearch/report/nemotron        # single family
```

### Scheduler

A weekly cron at Monday 06:00 UTC runs `scan_all()` and persists the
report to Hermes memory. If drift is detected, an alert routes through
the existing Deep Think alerting path (same Slack/Telegram pipeline as
multi-model consensus failures).

## Adding a new vendor

1. Create `sources/<vendor>.py` implementing `SourceAdapter.latest(family)`.
2. Register the adapter in `sources/__init__.py::ADAPTERS`.
3. Add a `TrackedModel` entry to `registry.py` pointing at the new source.
4. Run `python -m autoresearch.cli explain <family>` to sanity-check.

## Adding a new model within an existing vendor

Just add a `TrackedModel` entry in `registry.py`. The existing adapter
handles it. PR-review the entry — we don't auto-PR registry changes.

## What AutoResearch does NOT do

- **Does not auto-apply upgrades.** Engine detects drift; humans approve the PR.
- **Does not pin versions in Dockerfiles or env files.** That's the consumer's job.
- **Does not track closed-source APIs that don't publish version info** (e.g. proprietary wrappers).
- **Does not benchmark cost/quality tradeoffs.** That's Deep Think's job.

## Known unwired sources (stubs — prioritize as needed)

- `fal_models` — scrape fal.ai/models listing
- `recraft_api` — hit `external.api.recraft.ai/v1/models`
- `google_aistudio` — scrape `ai.google.dev/gemini-api/docs/models` (may need Playwright; JS-rendered)
- `anthropic_api` — fetch `docs.claude.com/en/docs/models-overview`
- `huggingface_search` — `huggingface.co/models?search=<family>` sorted by downloads

Wire them as real work demands.

## First known drift (2026-04-19)

- **Nemotron family:** pinned `Nemotron-3-Nano-30B-A3B`, NVIDIA HF surfaces **Nemotron 3 Super** (MoE hybrid Mamba-Transformer, agentic reasoning). Candidate upgrade for PersonaPlex.
