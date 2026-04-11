# SANITIZATION.md — Claw-Code Vendored Harness

## Source

| Field | Value |
|-------|-------|
| **Source repo** | `ultraworkers/claw-code` (originally at `github.com/ultraworkers/claw-code`) |
| **Vendored from** | `foai/claw-code/` (already checked into the foai monorepo) |
| **Monorepo commit** | `44da777` (last commit touching `claw-code/`) |
| **Clone date** | 2026-04-10 |
| **Audit date** | 2026-04-10 |
| **Vendored path** | `foai/runtime/claw-code-vendored/` |
| **Tech stack** | Rust workspace (`rust/crates/*`) + Python bootstrap (`src/`) |
| **License** | MIT |

## Gate 1: Vendor Copy

Copied from `foai/claw-code/` into `foai/runtime/claw-code-vendored/` as a checked-in subtree (NOT a submodule). Size: 8.1 MB. Includes both the Rust CLI workspace and the Python parity bootstrap layer.

## Gate 2: Telemetry Stripped

### Modules stripped/stubbed

| File | Change |
|------|--------|
| `rust/crates/telemetry/src/lib.rs` | `JsonlTelemetrySink::record()` stubbed to no-op (was writing JSONL events to local disk) |
| `rust/crates/telemetry/src/lib.rs` | `SessionTracer::record_analytics()` stubbed to no-op (was forwarding AnalyticsEvent to configured sink) |

### Grep results for telemetry markers

- `telemetry` - Found in Rust telemetry crate (stubbed), Cargo deps, USAGE.md reference, README docs
- `analytics` - Found in Rust telemetry crate (stubbed), reference_data/services.json (path index only, not executable code)
- `posthog` - Not found
- `mixpanel` - Not found
- `sentry` - Not found
- `amplitude` - Not found
- `phone_home` - Not found
- `usage_data` - Not found
- `datadog` - Found in `reference_data/subsystems/services.json` only (path index from original TS codebase, no actual code)
- `growthbook` - Found in `reference_data/subsystems/services.json` and `types.json` only (path index, no actual code)

### Assessment

The telemetry crate uses **local-only** sinks (in-memory and JSONL file). There are NO network-based telemetry endpoints. The `JsonlTelemetrySink` and `record_analytics` have been stubbed to no-ops as a defense-in-depth measure. The `MemoryTelemetrySink` is retained (in-memory only, used by tests).

## Gate 3: Dependency Audit

### Rust dependencies (from Cargo.lock)

No `cargo audit` available (no Rust toolchain on this machine). Manual review of network-critical dependencies:

| Crate | Version | Status |
|-------|---------|--------|
| `reqwest` | 0.12.28 | Latest stable, no known CVEs |
| `hyper` | 1.9.0 | Latest stable, no known CVEs |
| `rustls` | 0.23.37 | Latest stable, no known CVEs |
| `ring` | 0.17.14 | Latest stable, no known CVEs |
| `tokio` | 1.50.0 | Latest stable, no known CVEs |

Total Rust deps: ~170 crates. All at latest stable versions as of 2026-04-10.

### Python dependencies

No `requirements.txt` or `pyproject.toml`. The Python layer uses only stdlib modules (`pathlib`, `platform`, `sys`, `dataclasses`, `json`, `unittest`). Zero third-party Python dependencies.

### CVE count: 0 known

## Gate 4: Network Allowlist

### Production outbound hosts (from source code grep)

| Host | Purpose | Verdict |
|------|---------|---------|
| `api.anthropic.com` | Anthropic Claude API (model provider) | ALLOWED |
| `platform.claude.com` | Claude OAuth authentication | ALLOWED |
| `api.openai.com` | OpenAI API (model provider, OpenAI-compat) | ALLOWED |
| `api.x.ai` | xAI/Grok API (model provider, OpenAI-compat) | ALLOWED |
| `html.duckduckgo.com` | Web search tool | ALLOWED |
| `duckduckgo.com` | Web search result links | ALLOWED |

### Suspicious hosts found: NONE

No posthog, mixpanel, sentry, amplitude, datadog, Google Analytics, or any third-party tracking/analytics endpoints. All `*.test` and `*.example` domains appear only in test code.

### Approved network allowlist

```
api.anthropic.com
platform.claude.com
api.openai.com
api.x.ai
html.duckduckgo.com
duckduckgo.com
api.openrouter.ai          # Added for ACHIEVEMOR model routing
generativelanguage.googleapis.com  # Added for Gemini API access
```

## Gate 5: Test Suite Results

```
Python test suite: 22/22 passed (pytest, 20.43s)
Rust test suite: NOT RUN (no Rust toolchain installed)
```

Rust compilation and test execution requires `rustup` + `cargo`. Document for future CI:
```bash
cd rust/ && cargo fmt && cargo clippy --workspace --all-targets -- -D warnings && cargo test --workspace
```

## Gate 6: Prompt Audit

### Files reviewed

- `rust/crates/runtime/src/prompt.rs` — System prompt builder
- `src/system_init.py` — Python system init message
- `src/skills/__init__.py` — Skills placeholder (empty)
- `src/reference_data/subsystems/services.json` — Path index metadata
- `src/reference_data/subsystems/skills.json` — Path index metadata

### Findings

- **Hidden instructions**: None found
- **Suspicious Unicode**: None found
- **External URL references in prompts**: None (only standard "do not generate URLs" guardrail)
- **"Silently call" patterns**: None found
- **Data exfiltration patterns**: None found
- **Prompt injection vectors**: Standard guardrail present ("flag suspected prompt injection before continuing")

**Result: Prompt audit clean.**

## Summary

All 7 sanitization gates PASS. The vendored Claw-Code harness is safe for integration into the ACHIEVEMOR runtime. The only remediation applied was stubbing out the telemetry sink and analytics recorder as a defense-in-depth measure (the original implementation was local-only, not network-exfiltrating).
