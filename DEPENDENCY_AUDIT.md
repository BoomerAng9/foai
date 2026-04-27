# Dependency Audit Report

**Generated:** 2026-04-27
**Repo:** `/home/user/foai`
**Manifests scanned:** 77

Vulnerability data sourced from OSV.dev bulk advisory snapshots (PyPI, npm, crates.io) downloaded 2026-04-27. Latest-version data from PyPI JSON API, npm registry, and crates.io API.

Notes / caveats:
- Only manifests are inspected; transitive dependencies (lock files, node_modules, Cargo.lock) are NOT audited.
- For exact-pinned entries (`==X.Y.Z` in PyPI; bare or `=X.Y.Z` in npm), an OSV match means the installed version is definitely vulnerable.
- For range constraints (`>=`, `^`, `~`, `~=`, etc.) we suppress matches where the latest registry version is NOT vulnerable, because a resolver will normally pick a safe newer version. Range matches that the latest version is *also* vulnerable are reported.
- Cargo specs are usually `^X.Y.Z` (caret) — these are treated as ranges; matches are reported with the same logic as npm ranges. A `cargo update` may already be safe.
- Severity labels come from GHSA `database_specific.severity`. Records sourced only from PYSEC/RUSTSEC may surface as `UNKNOWN` even if a CVSS vector is present.

## Table of Contents

1. [Executive summary](#executive-summary)
2. [Critical & High vulnerabilities (cross-cutting)](#critical--high-vulnerabilities-cross-cutting)
3. [Per-manifest detail](#per-manifest-detail)

## Executive summary

- **Vulnerable package-version pairs detected:**
  - CRITICAL — pinned (definitely vulnerable): 4;  range-floor (resolver may upgrade away): 5
  - HIGH     — pinned: 5;  range-floor: 19
  - MODERATE — pinned: 10;  range-floor: 26
  - LOW      — pinned: 3;  range-floor: 8
- **Outdated unique packages (across all manifests):**
  - Major behind: 59
  - Minor behind: 87
  - Patch behind: 34
  - Current/ahead: 70

### Per-manifest summary

Vulnerability columns count *advisories* (one package may match multiple). `CRIT*/HIGH*` count only PINNED matches (definitely affected); `CRITr/HIGHr` count range-floor matches (resolver may pick a safe version).

| Manifest | CRIT* | HIGH* | MOD* | LOW* | CRITr | HIGHr | MODr | LOWr | Major | Minor | Patch |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `acheevy-telegram/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| `aims-memory/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| `aims-tools/aims-pmo/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 1 |
| `aims-tools/aims-pricing-matrix/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 1 |
| `aims-tools/brand-tokens/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| `aims-tools/contracts/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 |
| `aims-tools/forms/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 1 | 0 |
| `aims-tools/melanium/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 |
| `aims-tools/picker-ang/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 |
| `aims-tools/spinner/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 2 | 0 |
| `aims-tools/tie-matrix/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 0 |
| `aims-tools/tool-warehouse/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 1 |
| `aims-tools/tps-report-ang/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 1 | 1 |
| `aims-tools/ui-kit/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 2 | 0 |
| `aims-tools/voice-library/package.json` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 |
| `api/requirements.txt` | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 |
| `app/biz_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 |
| `app/cfo_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 4 | 0 |
| `app/content_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 5 | 0 |
| `app/edu_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 |
| `app/iller_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `app/live_look_in/frontend/package.json` | 0 | 0 | 0 | 0 | 0 | 1 | 8 | 2 | 2 | 2 | 0 |
| `app/live_look_in/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 |
| `app/live_look_in_v2/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 |
| `app/ops_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 |
| `app/scout_ang/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 4 | 0 |
| `chicken-hawk/gateway/requirements.txt` | 1 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 2 | 8 | 2 |
| `chicken-hawk/hawk3d/package.json` | 1 | 4 | 7 | 2 | 0 | 0 | 1 | 0 | 13 | 4 | 2 |
| `chicken-hawk/hawks/lil_agent_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_back_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_blend_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_coding_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_deep_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_flow_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_graph_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_memory_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_sand_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_trae_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/hawks/lil_viz_hawk/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `chicken-hawk/shield-policy-wire/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| `chicken-hawk/shield-policy/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 |
| `coastal-brewing/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 1 | 4 | 1 |
| `coastal-brewing/web/package.json` | 2 | 4 | 7 | 1 | 0 | 0 | 1 | 0 | 9 | 8 | 3 |
| `cti-hub/package.json` | 0 | 0 | 0 | 0 | 0 | 1 | 17 | 0 | 10 | 8 | 8 |
| `deploy/services/voice-gateway/package.json` | 0 | 0 | 0 | 0 | 1 | 7 | 1 | 1 | 11 | 1 | 4 |
| `destinations-ai/package.json` | 0 | 0 | 0 | 0 | 2 | 2 | 7 | 2 | 5 | 2 | 2 |
| `forge/pyproject.toml` | 0 | 0 | 0 | 0 | 2 | 2 | 1 | 0 | 0 | 4 | 2 |
| `luc/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 3 | 0 |
| `mcp_gateway/requirements.txt` | 1 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 5 | 0 |
| `perform/ml/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 8 | 2 |
| `perform/package.json` | 0 | 0 | 0 | 0 | 2 | 2 | 9 | 2 | 8 | 11 | 2 |
| `runtime/chronicle/pyproject.toml` | 1 | 4 | 10 | 1 | 0 | 2 | 8 | 0 | 8 | 13 | 6 |
| `runtime/claw-code-vendored/rust/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| `runtime/claw-code-vendored/rust/crates/api/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 0 | 2 | 1 |
| `runtime/claw-code-vendored/rust/crates/mock-anthropic-service/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 0 | 1 | 0 |
| `runtime/claw-code-vendored/rust/crates/plugins/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| `runtime/claw-code-vendored/rust/crates/runtime/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 2 | 0 | 4 | 2 |
| `runtime/claw-code-vendored/rust/crates/rusty-claude-cli/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 1 | 3 | 2 |
| `runtime/claw-code-vendored/rust/crates/telemetry/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 |
| `runtime/claw-code-vendored/rust/crates/tools/Cargo.toml` | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 2 | 0 | 2 | 1 |
| `runtime/common_ground/pyproject.toml` | 0 | 0 | 0 | 0 | 1 | 4 | 1 | 0 | 4 | 16 | 2 |
| `runtime/commons/commons-store/requirements.txt` | 0 | 4 | 6 | 0 | 0 | 0 | 0 | 0 | 6 | 12 | 3 |
| `runtime/commons/examples/api_server/requirements.txt` | 0 | 0 | 2 | 0 | 0 | 0 | 0 | 0 | 0 | 6 | 0 |
| `runtime/commons/examples/model_server/requirements.txt` | 0 | 0 | 6 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 |
| `runtime/deerflow/pyproject.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 5 | 13 | 6 |
| `runtime/dspy/pyproject.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 1 | 2 |
| `runtime/hermes/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 2 | 6 | 1 |
| `runtime/ii_researcher/pyproject.toml` | 0 | 0 | 2 | 0 | 1 | 5 | 2 | 1 | 3 | 13 | 1 |
| `runtime/spinner/requirements.txt` | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 4 | 0 |
| `runtime/ttd-dr/requirements.txt` | 0 | 0 | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 5 | 0 |
| `runtime/vault-signer/pyproject.toml` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 1 |
| `services/avatars/package.json` | 0 | 0 | 0 | 0 | 0 | 5 | 16 | 1 | 4 | 4 | 0 |
| `smelter-os/sqwaadrun/pyproject.toml` | 0 | 0 | 0 | 0 | 0 | 4 | 12 | 11 | 6 | 7 | 0 |
| `voice_relay/requirements.txt` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 3 | 0 |

## Critical & High vulnerabilities (cross-cutting)

### `PyPI` :: **fastmcp** @ `2.10.6`

**Used in:** `runtime/chronicle/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | PINNED | GHSA-vv7q-7jx5-f767 / CVE-2026-32871 | 3.2.0 | FastMCP OpenAPI Provider has an SSRF & Path Traversal Vulnerability |
| **HIGH** | PINNED | GHSA-rww4-4w9c-7733 / CVE-2026-27124 | 3.2.0 | FastMCP: Missing Consent Verification in OAuth Proxy Callback Facilitates Confused Deputy Vulnerabilities |
| **HIGH** | PINNED | GHSA-rcfx-77hg-w2wv | 2.14.0 | FastMCP updated to MCP 1.23+ due to CVE-2025-66416 |
| **HIGH** | PINNED | GHSA-c2jp-c369-7pvx | 2.13.0 | FastMCP Auth Integration Allows for Confused Deputy Account Takeover |
| **HIGH** | PINNED | GHSA-5h2m-4q8j-pqpj / CVE-2025-69196 | 2.14.2 | FastMCP OAuth Proxy token reuse across MCP servers |

### `PyPI` :: **gitpython** @ `3.1`

**Used in:** `forge/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | RANGE-floor | GHSA-hcpj-qp55-gfph / CVE-2022-24439 | 3.1.30 | GitPython vulnerable to Remote Code Execution due to improper user input validation |
| **CRITICAL** | RANGE-floor | GHSA-pr76-5cm5-w9cj / CVE-2023-40267 | 3.1.32 | GitPython vulnerable to remote code execution due to insufficient sanitization of input arguments |
| **HIGH** | RANGE-floor | GHSA-wfm5-v35h-vwf4 / CVE-2023-40590 | 3.1.33 | GitPython untrusted search path on Windows systems leading to arbitrary code execution |
| **HIGH** | RANGE-floor | GHSA-2mqj-m65w-jghx / CVE-2024-22190 | 3.1.41 | Untrusted search path under some conditions on Windows allows arbitrary code execution |

### `PyPI` :: **litellm** @ `1.80.9`

**Used in:** `runtime/common_ground/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | RANGE-floor | GHSA-jjhc-v7c2-5hh6 / CVE-2026-35030 | 1.83.0 | LiteLLM: Authentication bypass via OIDC userinfo cache key collision |
| **HIGH** | RANGE-floor | GHSA-xqmj-j6mv-4862 | 1.83.7 | LiteLLM: Server-Side Template Injection in /prompts/test endpoint |
| **HIGH** | RANGE-floor | GHSA-53mr-6c8q-9789 / CVE-2026-35029 | 1.83.0 | LiteLLM: Privilege escalation via unrestricted proxy configuration endpoint |
| **HIGH** | RANGE-floor | GHSA-69x8-hrgq-fjj8 | 1.83.0 | LiteLLM: Password hash exposure and pass-the-hash authentication bypass |

### `PyPI` :: **litellm** @ `1.63.6`

**Used in:** `runtime/ii_researcher/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | RANGE-floor | GHSA-jjhc-v7c2-5hh6 / CVE-2026-35030 | 1.83.0 | LiteLLM: Authentication bypass via OIDC userinfo cache key collision |
| **HIGH** | RANGE-floor | GHSA-53mr-6c8q-9789 / CVE-2026-35029 | 1.83.0 | LiteLLM: Privilege escalation via unrestricted proxy configuration endpoint |
| **HIGH** | RANGE-floor | GHSA-69x8-hrgq-fjj8 | 1.83.0 | LiteLLM: Password hash exposure and pass-the-hash authentication bypass |

### `PyPI` :: **python-jose** @ `3.3.0`

**Used in:** `chicken-hawk/gateway/requirements.txt`, `mcp_gateway/requirements.txt`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | PINNED | GHSA-6c5p-j8vq-pqhj / CVE-2024-33663 | 3.4.0 | python-jose algorithm confusion with OpenSSH ECDSA keys |

### `npm` :: **next** @ `15.1.6`

**Used in:** `coastal-brewing/web/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | PINNED | GHSA-9qr9-h5gf-34mp | 15.1.9 | Next.js is vulnerable to RCE in React flight protocol |
| **CRITICAL** | PINNED | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 15.2.3 | Authorization Bypass in Next.js Middleware |
| **HIGH** | PINNED | GHSA-h25m-26qc-wcjf | 15.1.12 | Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components |
| **HIGH** | PINNED | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| **HIGH** | PINNED | GHSA-67rr-84xm-4c7r / CVE-2025-49826 | 15.1.8 | Next.JS vulnerability can lead to DoS via cache poisoning |
| **HIGH** | PINNED | GHSA-mwv6-3258-q52c | 15.1.10 | Next Vulnerable to Denial of Service with Server Components |

### `npm` :: **next** @ `14.2.15`

**Used in:** `chicken-hawk/hawk3d/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | PINNED | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 14.2.25 | Authorization Bypass in Next.js Middleware |
| **HIGH** | PINNED | GHSA-h25m-26qc-wcjf | 15.0.8 | Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components |
| **HIGH** | PINNED | GHSA-5j59-xgg2-r9c4 | 14.2.35 | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up |
| **HIGH** | PINNED | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| **HIGH** | PINNED | GHSA-mwv6-3258-q52c | 14.2.34 | Next Vulnerable to Denial of Service with Server Components |

### `npm` :: **next** @ `15.1.0`

**Used in:** `destinations-ai/package.json`, `perform/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | RANGE-floor | GHSA-9qr9-h5gf-34mp | 15.1.9 | Next.js is vulnerable to RCE in React flight protocol |
| **CRITICAL** | RANGE-floor | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 15.2.3 | Authorization Bypass in Next.js Middleware |
| **HIGH** | RANGE-floor | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| **HIGH** | RANGE-floor | GHSA-67rr-84xm-4c7r / CVE-2025-49826 | 15.1.8 | Next.JS vulnerability can lead to DoS via cache poisoning |

### `npm` :: **vitest** @ `1.2.0`

**Used in:** `deploy/services/voice-gateway/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **CRITICAL** | RANGE-floor | GHSA-9crc-q9x8-hgqq / CVE-2025-24964 | 1.6.1 | Vitest allows Remote Code Execution when accessing a malicious website while Vitest API server is listening |

### `PyPI` :: **aiohttp** @ `3.9`

**Used in:** `smelter-os/sqwaadrun/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-5m98-qgg9-wh84 / CVE-2024-30251 | 3.9.4 | aiohttp vulnerable to Denial of Service when trying to parse malformed POST requests |
| **HIGH** | RANGE-floor | GHSA-5h86-8mv2-jq9f / CVE-2024-23334 | 3.9.2 | aiohttp is vulnerable to directory traversal |
| **HIGH** | RANGE-floor | GHSA-6mq8-rvhq-8wgg / CVE-2025-69223 | 3.13.3 | AIOHTTP's HTTP Parser auto_decompress feature is vulnerable to zip bomb |

### `PyPI` :: **black** @ `23.11.0`

**Used in:** `runtime/chronicle/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-3936-cmfr-pm3m / CVE-2026-32274 | 26.3.1 | Black: Arbitrary file writes from unsanitized user input in cache file name |

### `PyPI` :: **langchain-community** @ `0.3.18`

**Used in:** `runtime/ii_researcher/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-pc6w-59fv-rh23 / CVE-2025-6984 | 0.3.27 | Langchain Community Vulnerable to XML External Entity (XXE) Attacks |

### `PyPI` :: **lxml** @ `4.9`

**Used in:** `smelter-os/sqwaadrun/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-vfmq-68hx-4jfw / CVE-2026-41066 | 6.1.0 | lxml: Default configuration of iterparse() and ETCompatXMLParser() allows XXE to local files |

### `PyPI` :: **lxml** @ `5.3.1`

**Used in:** `runtime/ii_researcher/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-vfmq-68hx-4jfw / CVE-2026-41066 | 6.1.0 | lxml: Default configuration of iterparse() and ETCompatXMLParser() allows XXE to local files |

### `PyPI` :: **protobuf** @ `6.31.1`

**Used in:** `runtime/commons/commons-store/requirements.txt`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | PINNED | GHSA-7gcm-g887-7qv7 / CVE-2026-0994 | 6.33.5 | protobuf affected by a JSON recursion depth bypass |

### `PyPI` :: **python-multipart** @ `0.0.20`

**Used in:** `runtime/common_ground/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-wp53-j4wj-2cfg / CVE-2026-24486 | 0.0.22 | Python-Multipart has Arbitrary File Write via Non-Default Configuration |

### `PyPI` :: **scikit-learn** @ `1.0.0`

**Used in:** `runtime/chronicle/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-jxfp-4rvq-9h9m / CVE-2020-28975 | 1.0.1 | scikit-learn Denial of Service |

### `PyPI` :: **urllib3** @ `2.4.0`

**Used in:** `runtime/commons/commons-store/requirements.txt`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | PINNED | GHSA-38jv-5279-wg99 / CVE-2026-21441 | 2.6.3 | Decompression-bomb safeguards bypassed when following HTTP redirects (streaming API) |
| **HIGH** | PINNED | GHSA-gm62-xv2j-4w53 / CVE-2025-66418 | 2.6.0 | urllib3 allows an unbounded number of links in the decompression chain |
| **HIGH** | PINNED | GHSA-2xpw-w6gg-jr37 / CVE-2025-66471 | 2.6.0 | urllib3 streaming API improperly handles highly compressed data |

### `PyPI` :: **yt-dlp** @ `2025.2.19`

**Used in:** `runtime/ii_researcher/pyproject.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-g3gw-q23r-pgqm / CVE-2026-26331 | 2026.02.21 | yt-dlp: Arbitrary Command Injection when using the `--netrc-cmd` option |

### `crates.io` :: **regex** @ `1`

**Used in:** `runtime/claw-code-vendored/rust/crates/runtime/Cargo.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-m5pq-gvj9-9vr8 / CVE-2022-24713 | 1.5.5 | Rust's regex crate vulnerable to regular expression denial of service |

### `crates.io` :: **tokio** @ `1`

**Used in:** `runtime/claw-code-vendored/rust/crates/api/Cargo.toml`, `runtime/claw-code-vendored/rust/crates/mock-anthropic-service/Cargo.toml`, `runtime/claw-code-vendored/rust/crates/runtime/Cargo.toml`, `runtime/claw-code-vendored/rust/crates/rusty-claude-cli/Cargo.toml`, `runtime/claw-code-vendored/rust/crates/tools/Cargo.toml`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-fg7r-2g4j-5cgr / CVE-2021-45710 | 1.8.4 | Race Condition in tokio |

### `npm` :: **@hono/node-server** @ `1.13.7`

**Used in:** `services/avatars/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-wc8c-qw6v-h7f6 / CVE-2026-29087 | 1.19.10 | @hono/node-server has authorization bypass for protected static paths via encoded slashes in Serve Static Middleware |

### `npm` :: **hono** @ `4.6.14`

**Used in:** `services/avatars/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-f67f-6cw9-8mq4 / CVE-2026-22817 | 4.11.4 | Hono JWT Middleware's JWT Algorithm Confusion via Unsafe Default (HS256) Allows Token Forgery and Auth Bypass |
| **HIGH** | RANGE-floor | GHSA-3vhc-576x-3qv4 / CVE-2026-22818 | 4.11.4 | Hono JWK Auth Middleware has JWT algorithm confusion when JWK lacks "alg" (untrusted header.alg fallback) |
| **HIGH** | RANGE-floor | GHSA-m732-5p4w-x69g / CVE-2025-62610 | 4.10.2 | Hono Improper Authorization vulnerability |
| **HIGH** | RANGE-floor | GHSA-q5qw-h33p-qvwr / CVE-2026-29045 | 4.12.4 | Hono vulnerable to arbitrary file access via serveStatic vulnerability |

### `npm` :: **multer** @ `1.4.5-lts.1`

**Used in:** `deploy/services/voice-gateway/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-44fp-w29j-9vj5 / CVE-2025-47935 | 2.0.0 | Multer vulnerable to Denial of Service via memory leaks from unclosed streams |
| **HIGH** | RANGE-floor | GHSA-g5hg-p3ph-g8qg / CVE-2025-48997 | 2.0.1 | Multer vulnerable to Denial of Service via unhandled exception |
| **HIGH** | RANGE-floor | GHSA-4pg4-qvpc-4q3h / CVE-2025-47944 | 2.0.0 | Multer vulnerable to Denial of Service from maliciously crafted requests |
| **HIGH** | RANGE-floor | GHSA-fjgf-rc76-4x9p / CVE-2025-7338 | 2.0.2 | Multer vulnerable to Denial of Service via unhandled exception from malformed request |
| **HIGH** | RANGE-floor | GHSA-5528-5vmv-3xc2 / CVE-2026-3520 | 2.1.1 | Multer Vulnerable to Denial of Service via Uncontrolled Recursion |
| **HIGH** | RANGE-floor | GHSA-v52c-386h-88mc / CVE-2026-2359 | 2.1.0 | Multer vulnerable to Denial of Service via resource exhaustion |
| **HIGH** | RANGE-floor | GHSA-xf7r-hgr6-v32p / CVE-2026-3304 | 2.1.0 | Multer vulnerable to Denial of Service via incomplete cleanup |

### `npm` :: **next** @ `15.5.12`

**Used in:** `cti-hub/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |

### `npm` :: **vite** @ `6.0.5`

**Used in:** `app/live_look_in/frontend/package.json`

| Severity | Confidence | Advisory | Fixed in | Summary |
|---|---|---|---|---|
| **HIGH** | RANGE-floor | GHSA-p9ff-h696-f583 / CVE-2026-39363 | 6.4.2 | Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket |

## Per-manifest detail

### `acheevy-telegram/package.json`

_2 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 1 minor / 1 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `node-telegram-bot-api` | `0.66.0` | `0.67.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-memory/requirements.txt`

_1 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 1 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `asyncpg` | `0.30.0` | `0.31.0` |

### `aims-tools/aims-pmo/package.json`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 0 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-tools/aims-pricing-matrix/package.json`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 0 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-tools/brand-tokens/package.json`

_1 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 0 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |

### `aims-tools/contracts/package.json`

_4 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 1 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.19.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-tools/forms/package.json`

_4 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 3 major / 1 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/node` | `22.0.0` | `25.6.0` |
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.19.0` | `4.21.0` |

### `aims-tools/melanium/package.json`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 1 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.19.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-tools/picker-ang/package.json`

_6 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 1 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.19.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-tools/spinner/package.json`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 3 major / 2 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/node` | `22.0.0` | `25.6.0` |
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@types/ws` | `8.5.13` | `8.18.1` |
| `ws` | `8.18.0` | `8.20.0` |

### `aims-tools/tie-matrix/package.json`

_2 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 0 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

### `aims-tools/tool-warehouse/package.json`

_4 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 1 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.19.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |

### `aims-tools/tps-report-ang/package.json`

_8 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 4 major / 1 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/node` | `22.0.0` | `25.6.0` |
| `express` | `4.21.0` | `5.2.1` |
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.19.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `@types/express` | `5.0.0` | `5.0.6` |

### `aims-tools/ui-kit/package.json`

_6 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 3 major / 2 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `react` | `18.0.0` | `19.2.5` |
| `react-dom` | `18.0.0` | `19.2.5` |
| `typescript` | `5.6.0` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@types/react` | `19.0.0` | `19.2.14` |
| `@types/react-dom` | `19.0.0` | `19.2.3` |

### `aims-tools/voice-library/package.json`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 3 major / 0 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/node` | `22.0.0` | `25.6.0` |
| `typescript` | `5.6.0` | `6.0.3` |
| `zod` | `3.23.8` | `4.3.6` |

### `api/requirements.txt`

_6 declared deps; pinned: 0 crit / 0 high / 1 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 6 minor / 0 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-dotenv` | `==1.0.1` | PINNED | GHSA-mf9w-mj56-hr94 / CVE-2026-28684 | 1.2.2 | python-dotenv: Symlink following in set_key allows arbitrary file overwrite via cross-device rename fallback |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `google-cloud-secret-manager` | `2.21.1` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `python-dotenv` | `1.0.1` | `1.2.2` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/biz_ang/requirements.txt`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 4 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/cfo_ang/requirements.txt`

_4 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 4 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/content_ang/requirements.txt`

_7 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 5 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `openai` | `1.58.1` | `2.32.0` |
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `google-cloud-secret-manager` | `2.21.1` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/edu_ang/requirements.txt`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 4 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/iller_ang/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/live_look_in/frontend/package.json`

_4 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 1 high / 8 mod / 2 low; outdated: 2 major / 2 minor / 0 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `vite` | `^6.0.5` | floor | GHSA-p9ff-h696-f583 / CVE-2026-39363 | 6.4.2 | Vite Vulnerable to Arbitrary File Read via Vite Dev Server WebSocket |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `vite` | `^6.0.5` | floor | GHSA-93m4-6634-74q7 / CVE-2025-62522 | 6.4.1 | vite allows server.fs.deny bypass via backslash on Windows |
| `vite` | `^6.0.5` | floor | GHSA-356w-63v5-8wf4 / CVE-2025-32395 | 6.0.15 | Vite has an `server.fs.deny` bypass with an invalid `request-target` |
| `vite` | `^6.0.5` | floor | GHSA-x574-m823-4x7w / CVE-2025-30208 | 6.0.12 | Vite bypasses server.fs.deny when using ?raw?? |
| `vite` | `^6.0.5` | floor | GHSA-4w7w-66w2-5vf9 / CVE-2026-39365 | 6.4.2 | Vite Vulnerable to Path Traversal in Optimized Deps `.map` Handling |
| `vite` | `^6.0.5` | floor | GHSA-xcj6-pq6g-qj4x / CVE-2025-31486 | 6.0.14 | Vite allows server.fs.deny to be bypassed with .svg or relative paths |
| `vite` | `^6.0.5` | floor | GHSA-4r4m-qw57-chr8 / CVE-2025-31125 | 6.0.13 | Vite has a `server.fs.deny` bypassed for `inline` and `raw` with `?import` query |
| `vite` | `^6.0.5` | floor | GHSA-vg6x-rcgg-rjx6 / CVE-2025-24010 | 6.0.9 | Websites were able to send any requests to the development server and read the response in vite |
| `vite` | `^6.0.5` | floor | GHSA-859w-5945-r5v3 / CVE-2025-46565 | 6.1.6 | Vite's server.fs.deny bypassed with /. for files under project root |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `vite` | `^6.0.5` | floor | GHSA-jqfw-vq24-v9c3 / CVE-2025-58752 | 6.3.6 | Vite's `server.fs` settings were not applied to HTML files |
| `vite` | `^6.0.5` | floor | GHSA-g4jq-h2w9-997c / CVE-2025-58751 | 6.3.6 | Vite middleware may serve files starting with the same name with the public directory |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@vitejs/plugin-react` | `4.3.4` | `6.0.1` |
| `vite` | `6.0.5` | `8.0.10` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `react` | `19.0.0` | `19.2.5` |
| `react-dom` | `19.0.0` | `19.2.5` |

### `app/live_look_in/requirements.txt`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 4 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/live_look_in_v2/requirements.txt`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 4 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/ops_ang/requirements.txt`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 4 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `app/scout_ang/requirements.txt`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 4 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/gateway/requirements.txt`

_13 declared deps; pinned: 1 crit / 0 high / 2 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 8 minor / 2 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-jose` | `==3.3.0` | PINNED | GHSA-6c5p-j8vq-pqhj / CVE-2024-33663 | 3.4.0 | python-jose algorithm confusion with OpenSSH ECDSA keys |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-dotenv` | `==1.0.1` | PINNED | GHSA-mf9w-mj56-hr94 / CVE-2026-28684 | 1.2.2 | python-dotenv: Symlink following in set_key allows arbitrary file overwrite via cross-device rename fallback |
| `python-jose` | `==3.3.0` | PINNED | GHSA-cjwg-qfpm-7377 / CVE-2024-33664 | 3.4.0 | python-jose denial of service via compressed JWE content |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `openai` | `1.59.3` | `2.32.0` |
| `structlog` | `24.4.0` | `25.5.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `anthropic` | `0.42.0` | `0.97.0` |
| `fastapi` | `0.115.6` | `0.136.1` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `pydantic-settings` | `2.7.0` | `2.14.0` |
| `python-dotenv` | `1.0.1` | `1.2.2` |
| `python-jose` | `3.3.0` | `3.5.0` |
| `tenacity` | `9.0.0` | `9.1.4` |
| `uvicorn` | `0.32.1` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `pyyaml` | `6.0.2` | `6.0.3` |
| `reme-ai` | `0.3.1` | `0.3.1.8` |

### `chicken-hawk/hawk3d/package.json`

_19 declared deps; pinned: 1 crit / 4 high / 7 mod / 2 low; range-floor: 0 crit / 0 high / 1 mod / 0 low; outdated: 13 major / 4 minor / 2 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `14.2.15` | PINNED | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 14.2.25 | Authorization Bypass in Next.js Middleware |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `14.2.15` | PINNED | GHSA-h25m-26qc-wcjf | 15.0.8 | Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components |
| `next` | `14.2.15` | PINNED | GHSA-5j59-xgg2-r9c4 | 14.2.35 | Next has a Denial of Service with Server Components - Incomplete Fix Follow-Up |
| `next` | `14.2.15` | PINNED | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| `next` | `14.2.15` | PINNED | GHSA-mwv6-3258-q52c | 14.2.34 | Next Vulnerable to Denial of Service with Server Components |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `14.2.15` | PINNED | GHSA-ggv3-7p47-pfv8 / CVE-2026-29057 | 15.5.13 | Next.js: HTTP request smuggling in rewrites |
| `next` | `14.2.15` | PINNED | GHSA-xv57-4mr9-wg8v / CVE-2025-55173 | 14.2.31 | Next.js Content Injection Vulnerability for Image Optimization |
| `next` | `14.2.15` | PINNED | GHSA-g5qg-72qw-gw5v / CVE-2025-57752 | 14.2.31 | Next.js Affected by Cache Key Confusion for Image Optimization API Routes |
| `next` | `14.2.15` | PINNED | GHSA-4342-x723-ch2f / CVE-2025-57822 | 14.2.32 | Next.js Improper Middleware Redirect Handling Leads to SSRF |
| `next` | `14.2.15` | PINNED | GHSA-7m27-7ghc-44w9 / CVE-2024-56332 | 14.2.21 | Next.js Allows a Denial of Service (DoS) with Server Actions |
| `next` | `14.2.15` | PINNED | GHSA-9g9p-9gw9-jx7f / CVE-2025-59471 | 15.5.10 | Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration |
| `next` | `14.2.15` | PINNED | GHSA-3x4c-7xq6-9pq8 / CVE-2026-27980 | 15.5.14 | Next.js: Unbounded next/image disk cache growth can exhaust storage |
| `postcss` | `^8.4.47` | floor | GHSA-qx2v-qp2m-jg93 / CVE-2026-41305 | 8.5.10 | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `14.2.15` | PINNED | GHSA-qpjv-v59x-3qc4 / CVE-2025-32421 | 14.2.24 | Next.js Race Condition to Cache Poisoning |
| `next` | `14.2.15` | PINNED | GHSA-3h52-269p-cp9r / CVE-2025-48068 | 14.2.30 | Information exposure in Next.js dev server due to lack of origin verification |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@react-three/drei` | `9.114.0` | `10.7.7` |
| `@react-three/fiber` | `8.17.0` | `9.6.0` |
| `@react-three/postprocessing` | `2.16.0` | `3.0.4` |
| `@types/node` | `22.7.0` | `25.6.0` |
| `@types/react` | `18.3.11` | `19.2.14` |
| `@types/react-dom` | `18.3.1` | `19.2.3` |
| `framer-motion` | `11.11.0` | `12.38.0` |
| `lucide-react` | `0.451.0` | `1.11.0` |
| `next` | `14.2.15` | `16.2.4` |
| `react` | `18.3.1` | `19.2.5` |
| `react-dom` | `18.3.1` | `19.2.5` |
| `tailwindcss` | `3.4.13` | `4.2.4` |
| `typescript` | `5.6.3` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@types/three` | `0.169.0` | `0.184.0` |
| `autoprefixer` | `10.4.20` | `10.5.0` |
| `postcss` | `8.4.47` | `8.5.12` |
| `three` | `0.169.0` | `0.184.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `socket.io-client` | `4.8.0` | `4.8.3` |
| `zustand` | `5.0.0` | `5.0.12` |

### `chicken-hawk/hawks/lil_agent_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_back_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_blend_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_coding_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_deep_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_flow_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_graph_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_memory_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_sand_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_trae_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/hawks/lil_viz_hawk/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `chicken-hawk/shield-policy-wire/Cargo.toml`

_2 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 0 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `thiserror` | `1` | `2.0.18` |

### `chicken-hawk/shield-policy/Cargo.toml`

_1 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 0 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `thiserror` | `1` | `2.0.18` |

### `coastal-brewing/requirements.txt`

_6 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 3 mod / 0 low; outdated: 1 major / 4 minor / 1 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `requests` | `>=2.31.0` | floor | GHSA-gc5v-m9x4-r6x2 / CVE-2026-25645 | 2.33.0 | Requests has Insecure Temp File Reuse in its extract_zipped_paths() utility function |
| `requests` | `>=2.31.0` | floor | GHSA-9wx4-h78v-vm56 / CVE-2024-35195 | 2.32.0 | Requests `Session` object does not verify requests after making first request with verify=False |
| `requests` | `>=2.31.0` | floor | GHSA-9hjg-9r4m-mvj7 / CVE-2024-47081 | 2.32.4 | Requests vulnerable to .netrc credentials leak via malicious URLs |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `stripe` | `11.0.0` | `15.1.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.110.0` | `0.136.1` |
| `pydantic` | `2.6.0` | `2.13.3` |
| `requests` | `2.31.0` | `2.33.1` |
| `uvicorn` | `0.27.0` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `pyyaml` | `6.0.0` | `6.0.3` |

### `coastal-brewing/web/package.json`

_23 declared deps; pinned: 2 crit / 4 high / 7 mod / 1 low; range-floor: 0 crit / 0 high / 1 mod / 0 low; outdated: 9 major / 8 minor / 3 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `15.1.6` | PINNED | GHSA-9qr9-h5gf-34mp | 15.1.9 | Next.js is vulnerable to RCE in React flight protocol |
| `next` | `15.1.6` | PINNED | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 15.2.3 | Authorization Bypass in Next.js Middleware |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `15.1.6` | PINNED | GHSA-h25m-26qc-wcjf | 15.1.12 | Next.js HTTP request deserialization can lead to DoS when using insecure React Server Components |
| `next` | `15.1.6` | PINNED | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| `next` | `15.1.6` | PINNED | GHSA-67rr-84xm-4c7r / CVE-2025-49826 | 15.1.8 | Next.JS vulnerability can lead to DoS via cache poisoning |
| `next` | `15.1.6` | PINNED | GHSA-mwv6-3258-q52c | 15.1.10 | Next Vulnerable to Denial of Service with Server Components |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `15.1.6` | PINNED | GHSA-ggv3-7p47-pfv8 / CVE-2026-29057 | 15.5.13 | Next.js: HTTP request smuggling in rewrites |
| `next` | `15.1.6` | PINNED | GHSA-xv57-4mr9-wg8v / CVE-2025-55173 | 15.4.5 | Next.js Content Injection Vulnerability for Image Optimization |
| `next` | `15.1.6` | PINNED | GHSA-g5qg-72qw-gw5v / CVE-2025-57752 | 15.4.5 | Next.js Affected by Cache Key Confusion for Image Optimization API Routes |
| `next` | `15.1.6` | PINNED | GHSA-w37m-7fhw-fmv9 | 15.1.10 | Next Server Actions Source Code Exposure |
| `next` | `15.1.6` | PINNED | GHSA-4342-x723-ch2f / CVE-2025-57822 | 15.4.7 | Next.js Improper Middleware Redirect Handling Leads to SSRF |
| `next` | `15.1.6` | PINNED | GHSA-9g9p-9gw9-jx7f / CVE-2025-59471 | 15.5.10 | Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration |
| `next` | `15.1.6` | PINNED | GHSA-3x4c-7xq6-9pq8 / CVE-2026-27980 | 15.5.14 | Next.js: Unbounded next/image disk cache growth can exhaust storage |
| `postcss` | `^8.5.1` | floor | GHSA-qx2v-qp2m-jg93 / CVE-2026-41305 | 8.5.10 | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `15.1.6` | PINNED | GHSA-3h52-269p-cp9r / CVE-2025-48068 | 15.2.2 | Information exposure in Next.js dev server due to lack of origin verification |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/node` | `22.10.5` | `25.6.0` |
| `eslint` | `9.18.0` | `10.2.1` |
| `eslint-config-next` | `15.1.6` | `16.2.4` |
| `framer-motion` | `11.15.0` | `12.38.0` |
| `lucide-react` | `0.468.0` | `1.11.0` |
| `next` | `15.1.6` | `16.2.4` |
| `tailwind-merge` | `2.6.0` | `3.5.0` |
| `tailwindcss` | `3.4.17` | `4.2.4` |
| `typescript` | `5.7.2` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@radix-ui/react-slot` | `1.1.1` | `1.2.4` |
| `@radix-ui/react-tooltip` | `1.1.6` | `1.2.8` |
| `@types/react` | `19.0.7` | `19.2.14` |
| `@types/react-dom` | `19.0.3` | `19.2.3` |
| `autoprefixer` | `10.4.20` | `10.5.0` |
| `react` | `19.0.0` | `19.2.5` |
| `react-dom` | `19.0.0` | `19.2.5` |
| `zod` | `4.0.0` | `4.3.6` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `@radix-ui/react-dialog` | `1.1.4` | `1.1.15` |
| `@radix-ui/react-tabs` | `1.1.2` | `1.1.13` |
| `postcss` | `8.5.1` | `8.5.12` |

### `cti-hub/package.json`

_41 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 1 high / 17 mod / 0 low; outdated: 10 major / 8 minor / 8 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.5.12` | floor | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `axios` | `^1.13.6` | floor | GHSA-fvcv-3m26-pcqx / CVE-2026-40175 | 1.15.0 | Axios has Unrestricted Cloud Metadata Exfiltration via Header Injection Chain |
| `axios` | `^1.13.6` | floor | GHSA-3p68-rc4w-qgx5 / CVE-2025-62718 | 1.15.0 | Axios has a NO_PROXY Hostname Normalization Bypass that Leads to SSRF |
| `dompurify` | `^3.2.4` | floor | GHSA-v2wj-7wpq-c8vv / CVE-2026-0540 | 3.3.2 | DOMPurify contains a Cross-site Scripting vulnerability |
| `dompurify` | `^3.2.4` | floor | GHSA-h7mw-gpvr-xq4m / CVE-2026-41240 | 3.4.0 | DOMPurify: FORBID_TAGS bypassed by function-based ADD_TAGS predicate (asymmetry with FORBID_ATTR fix) |
| `dompurify` | `^3.2.4` | floor | GHSA-v9jr-rg53-9pgp / CVE-2026-41238 | 3.4.0 | DOMPurify: Prototype Pollution to XSS Bypass via CUSTOM_ELEMENT_HANDLING Fallback |
| `dompurify` | `^3.2.4` | floor | GHSA-h8r8-wccr-v5f2 | 3.3.2 | DOMPurify is vulnerable to mutation-XSS via Re-Contextualization |
| `dompurify` | `^3.2.4` | floor | GHSA-cjmm-f4jc-qw8r | 3.3.2 | DOMPurify ADD_ATTR predicate skips URI validation |
| `dompurify` | `^3.2.4` | floor | GHSA-39q2-94rc-95cp | 3.4.0 | DOMPurify's ADD_TAGS function form bypasses FORBID_TAGS due to short-circuit evaluation |
| `dompurify` | `^3.2.4` | floor | GHSA-crv5-9vww-q3g8 / CVE-2026-41239 | 3.4.0 | DOMPurify has a SAFE_FOR_TEMPLATES bypass in RETURN_DOM mode |
| `dompurify` | `^3.2.4` | floor | GHSA-cj63-jhhr-wcxv | 3.3.2 | DOMPurify USE_PROFILES prototype pollution allows event handlers |
| `dompurify` | `^3.2.4` | floor | GHSA-v8jm-5vwx-cfxm / CVE-2025-15599 | 3.2.7 | DOMPurify contains a Cross-site Scripting vulnerability |
| `next` | `^15.5.12` | floor | GHSA-ggv3-7p47-pfv8 / CVE-2026-29057 | 15.5.13 | Next.js: HTTP request smuggling in rewrites |
| `next` | `^15.5.12` | floor | GHSA-3x4c-7xq6-9pq8 / CVE-2026-27980 | 15.5.14 | Next.js: Unbounded next/image disk cache growth can exhaust storage |
| `postcss` | `^8` | floor | GHSA-hwj9-h5mp-3pm3 / CVE-2021-23368 | 8.2.10 | Regular Expression Denial of Service in postcss |
| `postcss` | `^8` | floor | GHSA-qx2v-qp2m-jg93 / CVE-2026-41305 | 8.5.10 | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |
| `postcss` | `^8` | floor | GHSA-7fh5-64p2-3v2j / CVE-2023-44270 | 8.4.31 | PostCSS line return parsing error |
| `postcss` | `^8` | floor | GHSA-566m-qj78-rww5 / CVE-2021-23382 | 8.2.13 | Regular Expression Denial of Service in postcss |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@stripe/stripe-js` | `8.9.0` | `9.3.1` |
| `@types/node` | `20` | `25.6.0` |
| `eslint` | `8` | `10.2.1` |
| `eslint-config-next` | `15.5.12` | `16.2.4` |
| `firebase` | `11.6.0` | `12.12.1` |
| `lucide-react` | `0.577.0` | `1.11.0` |
| `next` | `15.5.12` | `16.2.4` |
| `stripe` | `20.4.1` | `22.1.0` |
| `tailwindcss` | `3.4.1` | `4.2.4` |
| `typescript` | `5` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@playwright/test` | `1.56.1` | `1.59.1` |
| `axios` | `1.13.6` | `1.15.2` |
| `dompurify` | `3.2.4` | `3.4.1` |
| `firebase-admin` | `13.4.0` | `13.8.0` |
| `framer-motion` | `12.36.0` | `12.38.0` |
| `jose` | `6.0.11` | `6.2.3` |
| `mermaid` | `11.13.0` | `11.14.0` |
| `postcss` | `8` | `8.5.12` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `@langchain/core` | `1.1.32` | `1.1.42` |
| `@langchain/langgraph` | `1.2.2` | `1.2.9` |
| `@remotion/player` | `4.0.419` | `4.0.452` |
| `@swc/core` | `1.15.24` | `1.15.32` |
| `postgres` | `3.4.5` | `3.4.9` |
| `react` | `19.2.4` | `19.2.5` |
| `react-dom` | `19.2.4` | `19.2.5` |
| `remotion` | `4.0.0` | `4.0.452` |

### `deploy/services/voice-gateway/package.json`

_16 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 1 crit / 7 high / 1 mod / 1 low; outdated: 11 major / 1 minor / 4 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `vitest` | `^1.2.0` | floor | GHSA-9crc-q9x8-hgqq / CVE-2025-24964 | 1.6.1 | Vitest allows Remote Code Execution when accessing a malicious website while Vitest API server is listening |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `multer` | `^1.4.5-lts.1` | floor | GHSA-44fp-w29j-9vj5 / CVE-2025-47935 | 2.0.0 | Multer vulnerable to Denial of Service via memory leaks from unclosed streams |
| `multer` | `^1.4.5-lts.1` | floor | GHSA-g5hg-p3ph-g8qg / CVE-2025-48997 | 2.0.1 | Multer vulnerable to Denial of Service via unhandled exception |
| `multer` | `^1.4.5-lts.1` | floor | GHSA-4pg4-qvpc-4q3h / CVE-2025-47944 | 2.0.0 | Multer vulnerable to Denial of Service from maliciously crafted requests |
| `multer` | `^1.4.5-lts.1` | floor | GHSA-fjgf-rc76-4x9p / CVE-2025-7338 | 2.0.2 | Multer vulnerable to Denial of Service via unhandled exception from malformed request |
| `multer` | `^1.4.5-lts.1` | floor | GHSA-5528-5vmv-3xc2 / CVE-2026-3520 | 2.1.1 | Multer Vulnerable to Denial of Service via Uncontrolled Recursion |
| `multer` | `^1.4.5-lts.1` | floor | GHSA-v52c-386h-88mc / CVE-2026-2359 | 2.1.0 | Multer vulnerable to Denial of Service via resource exhaustion |
| `multer` | `^1.4.5-lts.1` | floor | GHSA-xf7r-hgr6-v32p / CVE-2026-3304 | 2.1.0 | Multer vulnerable to Denial of Service via incomplete cleanup |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `express` | `^4.18.2` | floor | GHSA-rv95-896h-c2vc / CVE-2024-29041 | 4.19.2 | Express.js Open Redirect in malformed URLs |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `express` | `^4.18.2` | floor | GHSA-qw6h-vgh9-j6wx / CVE-2024-43796 | 4.20.0 | express vulnerable to XSS via response.redirect() |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/express` | `4.17.21` | `5.0.6` |
| `@types/multer` | `1.4.11` | `2.1.0` |
| `@types/node` | `20.10.6` | `25.6.0` |
| `dotenv` | `16.3.1` | `17.4.2` |
| `express` | `4.18.2` | `5.2.1` |
| `groq-sdk` | `0.3.0` | `1.1.2` |
| `multer` | `1.4.5-lts.1` | `2.1.1` |
| `pino` | `8.17.2` | `10.3.1` |
| `pino-http` | `9.0.0` | `11.0.0` |
| `typescript` | `5.3.3` | `6.0.3` |
| `vitest` | `1.2.0` | `4.1.5` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tsx` | `4.7.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `@types/cors` | `2.8.17` | `2.8.19` |
| `@types/jsonwebtoken` | `9.0.6` | `9.0.10` |
| `cors` | `2.8.5` | `2.8.6` |
| `jsonwebtoken` | `9.0.2` | `9.0.3` |

### `destinations-ai/package.json`

_25 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 2 crit / 2 high / 7 mod / 2 low; outdated: 5 major / 2 minor / 2 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-9qr9-h5gf-34mp | 15.1.9 | Next.js is vulnerable to RCE in React flight protocol |
| `next` | `^15.1.0` | floor | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 15.2.3 | Authorization Bypass in Next.js Middleware |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| `next` | `^15.1.0` | floor | GHSA-67rr-84xm-4c7r / CVE-2025-49826 | 15.1.8 | Next.JS vulnerability can lead to DoS via cache poisoning |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-ggv3-7p47-pfv8 / CVE-2026-29057 | 15.5.13 | Next.js: HTTP request smuggling in rewrites |
| `next` | `^15.1.0` | floor | GHSA-xv57-4mr9-wg8v / CVE-2025-55173 | 15.4.5 | Next.js Content Injection Vulnerability for Image Optimization |
| `next` | `^15.1.0` | floor | GHSA-g5qg-72qw-gw5v / CVE-2025-57752 | 15.4.5 | Next.js Affected by Cache Key Confusion for Image Optimization API Routes |
| `next` | `^15.1.0` | floor | GHSA-4342-x723-ch2f / CVE-2025-57822 | 15.4.7 | Next.js Improper Middleware Redirect Handling Leads to SSRF |
| `next` | `^15.1.0` | floor | GHSA-7m27-7ghc-44w9 / CVE-2024-56332 | 15.1.2 | Next.js Allows a Denial of Service (DoS) with Server Actions |
| `next` | `^15.1.0` | floor | GHSA-9g9p-9gw9-jx7f / CVE-2025-59471 | 15.5.10 | Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration |
| `next` | `^15.1.0` | floor | GHSA-3x4c-7xq6-9pq8 / CVE-2026-27980 | 15.5.14 | Next.js: Unbounded next/image disk cache growth can exhaust storage |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-qpjv-v59x-3qc4 / CVE-2025-32421 | 15.1.6 | Next.js Race Condition to Cache Poisoning |
| `next` | `^15.1.0` | floor | GHSA-3h52-269p-cp9r / CVE-2025-48068 | 15.2.2 | Information exposure in Next.js dev server due to lack of origin verification |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `eslint` | `9.19.0` | `10.2.1` |
| `eslint-config-next` | `15.1.0` | `16.2.4` |
| `next` | `15.1.0` | `16.2.4` |
| `tailwindcss` | `3.4.0` | `4.2.4` |
| `typescript` | `5.7.0` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `lucide-react` | `1.8.0` | `1.11.0` |
| `maplibre-gl` | `5.23.0` | `5.24.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `firebase` | `12.12.0` | `12.12.1` |
| `postcss` | `8.5.10` | `8.5.12` |

### `forge/pyproject.toml`

_6 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 2 crit / 2 high / 1 mod / 0 low; outdated: 0 major / 4 minor / 2 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `gitpython` | `>=3.1` | floor | GHSA-hcpj-qp55-gfph / CVE-2022-24439 | 3.1.30 | GitPython vulnerable to Remote Code Execution due to improper user input validation |
| `gitpython` | `>=3.1` | floor | GHSA-pr76-5cm5-w9cj / CVE-2023-40267 | 3.1.32 | GitPython vulnerable to remote code execution due to insufficient sanitization of input arguments |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `gitpython` | `>=3.1` | floor | GHSA-wfm5-v35h-vwf4 / CVE-2023-40590 | 3.1.33 | GitPython untrusted search path on Windows systems leading to arbitrary code execution |
| `gitpython` | `>=3.1` | floor | GHSA-2mqj-m65w-jghx / CVE-2024-22190 | 3.1.41 | Untrusted search path under some conditions on Windows allows arbitrary code execution |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `gitpython` | `>=3.1` | floor | GHSA-cwvm-v4w8-q58c / CVE-2023-41040 | 3.1.37 | GitPython blind local file inclusion |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `asyncpg` | `0.29` | `0.31.0` |
| `click` | `8.1` | `8.3.3` |
| `fastapi` | `0.110` | `0.136.1` |
| `pydantic` | `2.5` | `2.13.3` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `gitpython` | `3.1` | `3.1.47` |
| `pyyaml` | `6.0` | `6.0.3` |

### `luc/requirements.txt`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 3 minor / 0 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.6` | `0.136.1` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `mcp_gateway/requirements.txt`

_6 declared deps; pinned: 1 crit / 0 high / 1 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 5 minor / 0 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-jose` | `>=3.3.0` | PINNED | GHSA-6c5p-j8vq-pqhj / CVE-2024-33663 | 3.4.0 | python-jose algorithm confusion with OpenSSH ECDSA keys |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-jose` | `>=3.3.0` | PINNED | GHSA-cjwg-qfpm-7377 / CVE-2024-33664 | 3.4.0 | python-jose denial of service via compressed JWE content |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `sse-starlette` | `2.2.0` | `3.4.1` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.10.0` | `2.13.3` |
| `pydantic-settings` | `2.7.0` | `2.14.0` |
| `python-jose` | `3.3.0` | `3.5.0` |
| `uvicorn` | `0.34.0` | `0.46.0` |

### `perform/ml/requirements.txt`

_11 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 1 mod / 0 low; outdated: 1 major / 8 minor / 2 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-dotenv` | `>=1.0` | floor | GHSA-mf9w-mj56-hr94 / CVE-2026-28684 | 1.2.2 | python-dotenv: Symlink following in set_key allows arbitrary file overwrite via cross-device rename fallback |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `pandas` | `2.0` | `3.0.2` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.110` | `0.136.1` |
| `joblib` | `1.4` | `1.5.3` |
| `numpy` | `2.0` | `2.4.4` |
| `python-dotenv` | `1.0` | `1.2.2` |
| `scikit-learn` | `1.5` | `1.8.0` |
| `scipy` | `1.12` | `1.17.1` |
| `uvicorn` | `0.30` | `0.46.0` |
| `xgboost` | `3.0` | `3.2.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `nfl-data-py` | `0.3` | `0.3.3` |
| `psycopg2-binary` | `2.9` | `2.9.12` |

### `perform/package.json`

_31 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 2 crit / 2 high / 9 mod / 2 low; outdated: 8 major / 11 minor / 2 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-9qr9-h5gf-34mp | 15.1.9 | Next.js is vulnerable to RCE in React flight protocol |
| `next` | `^15.1.0` | floor | GHSA-f82v-jwr5-mffw / CVE-2025-29927 | 15.2.3 | Authorization Bypass in Next.js Middleware |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-q4gf-8mx6-v5v3 | 15.5.15 | Next.js has a Denial of Service with Server Components |
| `next` | `^15.1.0` | floor | GHSA-67rr-84xm-4c7r / CVE-2025-49826 | 15.1.8 | Next.JS vulnerability can lead to DoS via cache poisoning |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-ggv3-7p47-pfv8 / CVE-2026-29057 | 15.5.13 | Next.js: HTTP request smuggling in rewrites |
| `next` | `^15.1.0` | floor | GHSA-xv57-4mr9-wg8v / CVE-2025-55173 | 15.4.5 | Next.js Content Injection Vulnerability for Image Optimization |
| `next` | `^15.1.0` | floor | GHSA-g5qg-72qw-gw5v / CVE-2025-57752 | 15.4.5 | Next.js Affected by Cache Key Confusion for Image Optimization API Routes |
| `next` | `^15.1.0` | floor | GHSA-4342-x723-ch2f / CVE-2025-57822 | 15.4.7 | Next.js Improper Middleware Redirect Handling Leads to SSRF |
| `next` | `^15.1.0` | floor | GHSA-7m27-7ghc-44w9 / CVE-2024-56332 | 15.1.2 | Next.js Allows a Denial of Service (DoS) with Server Actions |
| `next` | `^15.1.0` | floor | GHSA-9g9p-9gw9-jx7f / CVE-2025-59471 | 15.5.10 | Next.js self-hosted applications vulnerable to DoS via Image Optimizer remotePatterns configuration |
| `next` | `^15.1.0` | floor | GHSA-3x4c-7xq6-9pq8 / CVE-2026-27980 | 15.5.14 | Next.js: Unbounded next/image disk cache growth can exhaust storage |
| `postcss` | `^8.4.0` | floor | GHSA-qx2v-qp2m-jg93 / CVE-2026-41305 | 8.5.10 | PostCSS has XSS via Unescaped </style> in its CSS Stringify Output |
| `postcss` | `^8.4.0` | floor | GHSA-7fh5-64p2-3v2j / CVE-2023-44270 | 8.4.31 | PostCSS line return parsing error |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `next` | `^15.1.0` | floor | GHSA-qpjv-v59x-3qc4 / CVE-2025-32421 | 15.1.6 | Next.js Race Condition to Cache Poisoning |
| `next` | `^15.1.0` | floor | GHSA-3h52-269p-cp9r / CVE-2025-48068 | 15.2.2 | Information exposure in Next.js dev server due to lack of origin verification |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@types/node` | `22.0.0` | `25.6.0` |
| `eslint` | `9` | `10.2.1` |
| `eslint-config-next` | `15.1.0` | `16.2.4` |
| `firebase` | `11.0.0` | `12.12.1` |
| `lucide-react` | `0.460.0` | `1.11.0` |
| `next` | `15.1.0` | `16.2.4` |
| `tailwindcss` | `3.4.0` | `4.2.4` |
| `typescript` | `5.7.0` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@eslint/eslintrc` | `3` | `3.3.5` |
| `@lhci/cli` | `0.14.0` | `0.15.1` |
| `@types/react` | `19.0.0` | `19.2.14` |
| `@types/react-dom` | `19.0.0` | `19.2.3` |
| `autoprefixer` | `10.4.0` | `10.5.0` |
| `firebase-admin` | `13.0.0` | `13.8.0` |
| `postcss` | `8.4.0` | `8.5.12` |
| `react` | `19.0.0` | `19.2.5` |
| `react-dom` | `19.0.0` | `19.2.5` |
| `stripe` | `22.0.1` | `22.1.0` |
| `tsx` | `4.19.0` | `4.21.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `postgres` | `3.4.5` | `3.4.9` |
| `vega-lite` | `6.4.2` | `6.4.3` |

### `runtime/chronicle/pyproject.toml`

_46 declared deps; pinned: 1 crit / 4 high / 10 mod / 1 low; range-floor: 0 crit / 2 high / 8 mod / 0 low; outdated: 8 major / 13 minor / 6 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `fastmcp` | `==2.10.6` | PINNED | GHSA-vv7q-7jx5-f767 / CVE-2026-32871 | 3.2.0 | FastMCP OpenAPI Provider has an SSRF & Path Traversal Vulnerability |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `black` | `>=23.11.0` | floor | GHSA-3936-cmfr-pm3m / CVE-2026-32274 | 26.3.1 | Black: Arbitrary file writes from unsanitized user input in cache file name |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-rww4-4w9c-7733 / CVE-2026-27124 | 3.2.0 | FastMCP: Missing Consent Verification in OAuth Proxy Callback Facilitates Confused Deputy Vulnerabilities |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-rcfx-77hg-w2wv | 2.14.0 | FastMCP updated to MCP 1.23+ due to CVE-2025-66416 |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-c2jp-c369-7pvx | 2.13.0 | FastMCP Auth Integration Allows for Confused Deputy Account Takeover |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-5h2m-4q8j-pqpj / CVE-2025-69196 | 2.14.2 | FastMCP OAuth Proxy token reuse across MCP servers |
| `scikit-learn` | `>=1.0.0` | floor | GHSA-jxfp-4rvq-9h9m / CVE-2020-28975 | 1.0.1 | scikit-learn Denial of Service |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `black` | `>=23.11.0` | floor | GHSA-fj7x-q9j7-g6q6 / CVE-2024-21503 | 24.3.0 | Black vulnerable to Regular Expression Denial of Service (ReDoS) |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-mxxr-jv3v-6pgc / CVE-2025-62800 | 2.13.0 | FastMCP vulnerable to reflected XSS in client's callback page |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-rj5c-58rq-j5g5 / CVE-2025-62801 | 2.13.0 | FastMCP vulnerable to windows command injection in FastMCP Cursor installer via server_name |
| `fastmcp` | `==2.10.6` | PINNED | GHSA-m8x7-r2rg-vh5g / CVE-2025-64340 | 3.2.0 | FastMCP has a Command Injection vulnerability - Gemini CLI |
| `jinja2` | `>=3.1.0` | floor | GHSA-gmj6-6f8f-6699 / CVE-2024-56201 | 3.1.5 | Jinja has a sandbox breakout through malicious filenames |
| `jinja2` | `>=3.1.0` | floor | GHSA-q2x7-8rv6-6q7h / CVE-2024-56326 | 3.1.5 | Jinja has a sandbox breakout through indirect reference to format method |
| `jinja2` | `>=3.1.0` | floor | GHSA-h75v-3vvj-5mfj / CVE-2024-34064 | 3.1.4 | Jinja vulnerable to HTML attribute injection when passing user input as keys to xmlattr filter |
| `jinja2` | `>=3.1.0` | floor | GHSA-h5c8-rqwp-cp95 / CVE-2024-22195 | 3.1.3 | Jinja vulnerable to HTML attribute injection when passing user input as keys to xmlattr filter |
| `jinja2` | `>=3.1.0` | floor | GHSA-cpwx-vrp4-4pq7 / CVE-2025-27516 | 3.1.6 | Jinja2 vulnerable to sandbox breakout through attr filter selecting format method |
| `numpy` | `>=1.21.0` | floor | GHSA-fpfv-jqm9-f5jm / CVE-2021-34141 | 1.22 | Incorrect Comparison in NumPy |
| `python-dotenv` | `==1.1.0` | PINNED | GHSA-mf9w-mj56-hr94 / CVE-2026-28684 | 1.2.2 | python-dotenv: Symlink following in set_key allows arbitrary file overwrite via cross-device rename fallback |
| `scikit-learn` | `>=1.0.0` | floor | GHSA-jw8x-6495-233v / CVE-2024-5206 | 1.5.0 | scikit-learn sensitive data leakage vulnerability |
| `transformers` | `==4.51.3` | PINNED | GHSA-59p9-h35m-wg4g / CVE-2025-6638 | 4.53.0 | Hugging Face Transformers is vulnerable to ReDoS through its MarianTokenizer |
| `transformers` | `==4.51.3` | PINNED | GHSA-69w3-r845-3855 / CVE-2026-1839 | 5.0.0rc3 | HuggingFace Transformers allows for arbitrary code execution in the `Trainer` class |
| `transformers` | `==4.51.3` | PINNED | GHSA-4w7r-h757-3r74 / CVE-2025-6921 | 4.53.0 | Hugging Face Transformers vulnerable to Regular Expression Denial of Service (ReDoS) in the AdamWeightDecay optimizer |
| `transformers` | `==4.51.3` | PINNED | GHSA-9356-575x-2w9m / CVE-2025-5197 | 4.53.0 | Hugging Face Transformers Regular Expression Denial of Service (ReDoS) vulnerability |
| `transformers` | `==4.51.3` | PINNED | GHSA-37mw-44qp-f5jm / CVE-2025-3933 | 4.52.1 | Transformers is vulnerable to ReDoS attack through its DonutProcessor class |
| `transformers` | `==4.51.3` | PINNED | GHSA-rcv9-qm8p-9p6j / CVE-2025-6051 | 4.53.0 | Hugging Face Transformers library has Regular Expression Denial of Service |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `transformers` | `==4.51.3` | PINNED | GHSA-phhr-52qp-3mj4 / CVE-2025-3777 | 4.52.1 | Transformers's Improper Input Validation vulnerability can be exploited through username injection |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `a2a-sdk` | `0.1.0` | `1.0.2` |
| `bcrypt` | `4.3.0` | `5.0.0` |
| `black` | `23.11.0` | `26.3.1` |
| `fastmcp` | `2.10.6` | `3.2.4` |
| `numpy` | `1.21.0` | `2.4.4` |
| `sentence_transformers` | `4.1.0` | `5.4.1` |
| `transformers` | `4.51.3` | `5.6.2` |
| `websockets` | `15.0.1` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `alembic` | `1.16.1` | `1.18.4` |
| `async-lru` | `2.0.5` | `2.3.0` |
| `asyncpg` | `0.30.0` | `0.31.0` |
| `fastapi` | `0.115.12` | `0.136.1` |
| `google-genai` | `1.16.1` | `1.73.1` |
| `httpx` | `0.24.0` | `0.28.1` |
| `mypy` | `1.7.1` | `1.20.2` |
| `pre-commit` | `4.2.0` | `4.6.0` |
| `pydantic-settings` | `2.10.1` | `2.14.0` |
| `python-dotenv` | `1.1.0` | `1.2.2` |
| `ruff` | `0.1.8` | `0.15.12` |
| `scikit-learn` | `1.0.0` | `1.8.0` |
| `uvicorn` | `0.34.2` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `jinja2` | `3.1.0` | `3.1.6` |
| `pgvector` | `0.4.1` | `0.4.2` |
| `psycopg2-binary` | `2.9.10` | `2.9.12` |
| `python-dateutil` | `2.9.0` | `2.9.0.post0` |
| `sqlalchemy` | `2.0.40` | `2.0.49` |
| `xformers` | `0.0.31` | `0.0.35` |

### `runtime/claw-code-vendored/rust/Cargo.toml`

_1 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 0 minor / 1 patch_

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `serde_json` | `1` | `1.0.149` |

### `runtime/claw-code-vendored/rust/crates/api/Cargo.toml`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 1 high / 1 mod / 2 low; outdated: 0 major / 2 minor / 1 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-fg7r-2g4j-5cgr / CVE-2021-45710 | 1.8.4 | Race Condition in tokio |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-2grh-hm3w-w7hv / CVE-2021-38191 | 1.5.1 | Race condition in tokio |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-4q83-7cq4-p6wg | 1.18.5 | `tokio::io::ReadHalf<T>::unsplit` is Unsound |
| `tokio` | `1` | floor | GHSA-rr8g-9fpq-6wmg | 1.38.2 | Tokio broadcast channel calls clone in parallel, but does not require `Sync` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `reqwest` | `0.12` | `0.13.3` |
| `tokio` | `1` | `1.52.1` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `serde` | `1` | `1.0.228` |

### `runtime/claw-code-vendored/rust/crates/mock-anthropic-service/Cargo.toml`

_1 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 1 high / 1 mod / 2 low; outdated: 0 major / 1 minor / 0 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-fg7r-2g4j-5cgr / CVE-2021-45710 | 1.8.4 | Race Condition in tokio |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-2grh-hm3w-w7hv / CVE-2021-38191 | 1.5.1 | Race condition in tokio |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-4q83-7cq4-p6wg | 1.18.5 | `tokio::io::ReadHalf<T>::unsplit` is Unsound |
| `tokio` | `1` | floor | GHSA-rr8g-9fpq-6wmg | 1.38.2 | Tokio broadcast channel calls clone in parallel, but does not require `Sync` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `tokio` | `1` | `1.52.1` |

### `runtime/claw-code-vendored/rust/crates/plugins/Cargo.toml`

_1 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 0 minor / 1 patch_

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `serde` | `1` | `1.0.228` |

### `runtime/claw-code-vendored/rust/crates/runtime/Cargo.toml`

_6 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 2 high / 1 mod / 2 low; outdated: 0 major / 4 minor / 2 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `regex` | `1` | floor | GHSA-m5pq-gvj9-9vr8 / CVE-2022-24713 | 1.5.5 | Rust's regex crate vulnerable to regular expression denial of service |
| `tokio` | `1` | floor | GHSA-fg7r-2g4j-5cgr / CVE-2021-45710 | 1.8.4 | Race Condition in tokio |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-2grh-hm3w-w7hv / CVE-2021-38191 | 1.5.1 | Race condition in tokio |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-4q83-7cq4-p6wg | 1.18.5 | `tokio::io::ReadHalf<T>::unsplit` is Unsound |
| `tokio` | `1` | floor | GHSA-rr8g-9fpq-6wmg | 1.38.2 | Tokio broadcast channel calls clone in parallel, but does not require `Sync` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `regex` | `1` | `1.12.3` |
| `sha2` | `0.10` | `0.11.0` |
| `tokio` | `1` | `1.52.1` |
| `walkdir` | `2` | `2.5.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `glob` | `0.3` | `0.3.3` |
| `serde` | `1` | `1.0.228` |

### `runtime/claw-code-vendored/rust/crates/rusty-claude-cli/Cargo.toml`

_7 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 1 high / 1 mod / 2 low; outdated: 1 major / 3 minor / 2 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-fg7r-2g4j-5cgr / CVE-2021-45710 | 1.8.4 | Race Condition in tokio |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-2grh-hm3w-w7hv / CVE-2021-38191 | 1.5.1 | Race condition in tokio |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-4q83-7cq4-p6wg | 1.18.5 | `tokio::io::ReadHalf<T>::unsplit` is Unsound |
| `tokio` | `1` | floor | GHSA-rr8g-9fpq-6wmg | 1.38.2 | Tokio broadcast channel calls clone in parallel, but does not require `Sync` |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `rustyline` | `15` | `18.0.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `crossterm` | `0.28` | `0.29.0` |
| `syntect` | `5` | `5.3.0` |
| `tokio` | `1` | `1.52.1` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `pulldown-cmark` | `0.13` | `0.13.3` |
| `serde` | `1` | `1.0.228` |

### `runtime/claw-code-vendored/rust/crates/telemetry/Cargo.toml`

_2 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 0 minor / 2 patch_

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `serde` | `1` | `1.0.228` |
| `serde_json` | `1` | `1.0.149` |

### `runtime/claw-code-vendored/rust/crates/tools/Cargo.toml`

_3 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 1 high / 1 mod / 2 low; outdated: 0 major / 2 minor / 1 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-fg7r-2g4j-5cgr / CVE-2021-45710 | 1.8.4 | Race Condition in tokio |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-2grh-hm3w-w7hv / CVE-2021-38191 | 1.5.1 | Race condition in tokio |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `tokio` | `1` | floor | GHSA-4q83-7cq4-p6wg | 1.18.5 | `tokio::io::ReadHalf<T>::unsplit` is Unsound |
| `tokio` | `1` | floor | GHSA-rr8g-9fpq-6wmg | 1.38.2 | Tokio broadcast channel calls clone in parallel, but does not require `Sync` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `reqwest` | `0.12` | `0.13.3` |
| `tokio` | `1` | `1.52.1` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `serde` | `1` | `1.0.228` |

### `runtime/common_ground/pyproject.toml`

_26 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 1 crit / 4 high / 1 mod / 0 low; outdated: 4 major / 16 minor / 2 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `litellm` | `>=1.80.9` | floor | GHSA-jjhc-v7c2-5hh6 / CVE-2026-35030 | 1.83.0 | LiteLLM: Authentication bypass via OIDC userinfo cache key collision |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `litellm` | `>=1.80.9` | floor | GHSA-xqmj-j6mv-4862 | 1.83.7 | LiteLLM: Server-Side Template Injection in /prompts/test endpoint |
| `litellm` | `>=1.80.9` | floor | GHSA-53mr-6c8q-9789 / CVE-2026-35029 | 1.83.0 | LiteLLM: Privilege escalation via unrestricted proxy configuration endpoint |
| `litellm` | `>=1.80.9` | floor | GHSA-69x8-hrgq-fjj8 | 1.83.0 | LiteLLM: Password hash exposure and pass-the-hash authentication bypass |
| `python-multipart` | `>=0.0.20` | floor | GHSA-wp53-j4wj-2cfg / CVE-2026-24486 | 0.0.22 | Python-Multipart has Arbitrary File Write via Non-Default Configuration |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-multipart` | `>=0.0.20` | floor | GHSA-mj87-hwqh-73pj / CVE-2026-40347 | 0.0.26 | python-multipart affected by Denial of Service via large multipart preamble or epilogue data |

#### UNKNOWN security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `duckdb` | `>=0.10` | floor | GHSA-w2gf-jxc9-pf2q / CVE-2024-41672 | c9b7c98aa0e1cd7363fe8bb8543a95f38e980d8a, c9b7c98aa0e1cd7363fe8bb8543a95f38e980d8a, 1.1.0 |  |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `duckdb` | `0.10` | `1.5.2` |
| `e2b-code-interpreter` | `0.1.0` | `2.6.0` |
| `google-cloud-storage` | `2.16.0` | `3.10.1` |
| `tenacity` | `8.2.3` | `9.1.4` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `aiosqlite` | `0.21.0` | `0.22.1` |
| `boto3` | `1.41.1` | `1.42.96` |
| `fastapi` | `0.115.0` | `0.136.1` |
| `google-genai` | `1.53.0` | `1.73.1` |
| `instructor` | `1.13.0` | `1.15.1` |
| `jsonschema` | `4.25.1` | `4.26.0` |
| `litellm` | `1.80.9` | `1.83.14` |
| `nats-py` | `2.12.0` | `2.14.0` |
| `openai` | `2.8` | `2.32.0` |
| `opentelemetry-api` | `1.30.0` | `1.41.1` |
| `opentelemetry-exporter-otlp-proto-http` | `1.30.0` | `1.41.1` |
| `opentelemetry-sdk` | `1.30.0` | `1.41.1` |
| `psycopg` | `3.1` | `3.3.3` |
| `pydantic` | `2.10.6` | `2.13.3` |
| `pydantic-settings` | `2.2` | `2.14.0` |
| `uvicorn` | `0.30.0` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `python-multipart` | `0.0.20` | `0.0.27` |
| `pyyaml` | `6.0.1` | `6.0.3` |

### `runtime/commons/commons-store/requirements.txt`

_28 declared deps; pinned: 0 crit / 4 high / 6 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 6 major / 12 minor / 3 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `protobuf` | `==6.31.1` | PINNED | GHSA-7gcm-g887-7qv7 / CVE-2026-0994 | 6.33.5 | protobuf affected by a JSON recursion depth bypass |
| `urllib3` | `==2.4.0` | PINNED | GHSA-38jv-5279-wg99 / CVE-2026-21441 | 2.6.3 | Decompression-bomb safeguards bypassed when following HTTP redirects (streaming API) |
| `urllib3` | `==2.4.0` | PINNED | GHSA-gm62-xv2j-4w53 / CVE-2025-66418 | 2.6.0 | urllib3 allows an unbounded number of links in the decompression chain |
| `urllib3` | `==2.4.0` | PINNED | GHSA-2xpw-w6gg-jr37 / CVE-2025-66471 | 2.6.0 | urllib3 streaming API improperly handles highly compressed data |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `filelock` | `==3.18.0` | PINNED | GHSA-qmgc-5h2g-mvrw / CVE-2026-22701 | 3.20.3 | filelock Time-of-Check-Time-of-Use (TOCTOU) Symlink Vulnerability in SoftFileLock |
| `filelock` | `==3.18.0` | PINNED | GHSA-w853-jp5j-5j7f / CVE-2025-68146 | 3.20.1 | filelock has a TOCTOU race condition which allows symlink attacks during lock file creation |
| `requests` | `==2.32.3` | PINNED | GHSA-gc5v-m9x4-r6x2 / CVE-2026-25645 | 2.33.0 | Requests has Insecure Temp File Reuse in its extract_zipped_paths() utility function |
| `requests` | `==2.32.3` | PINNED | GHSA-9hjg-9r4m-mvj7 / CVE-2024-47081 | 2.32.4 | Requests vulnerable to .netrc credentials leak via malicious URLs |
| `urllib3` | `==2.4.0` | PINNED | GHSA-pq67-6m6q-mj2v / CVE-2025-50181 | 2.5.0 | urllib3 redirects are not disabled when retries are disabled on PoolManager instantiation |
| `urllib3` | `==2.4.0` | PINNED | GHSA-48p4-8xcf-vxj5 / CVE-2025-50182 | 2.5.0 | urllib3 does not control redirects in browsers and Node.js |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `certifi` | `2025.4.26` | `2026.4.22` |
| `fsspec` | `2025.5.1` | `2026.3.0` |
| `huggingface-hub` | `0.25.2` | `1.12.0` |
| `numpy` | `1.26.4` | `2.4.4` |
| `packaging` | `25.0` | `26.2` |
| `protobuf` | `6.31.1` | `7.34.1` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `duckdb` | `1.3.0` | `1.5.2` |
| `filelock` | `3.18.0` | `3.29.0` |
| `flatbuffers` | `25.2.10` | `25.12.19` |
| `idna` | `3.10` | `3.13` |
| `matplotlib` | `3.9.2` | `3.10.9` |
| `mpmath` | `1.3.0` | `1.4.1` |
| `numba` | `0.61.2` | `0.65.1` |
| `onnxruntime` | `1.22.0` | `1.25.0` |
| `requests` | `2.32.3` | `2.33.1` |
| `tokenizers` | `0.21.1` | `0.23.1` |
| `typing_extensions` | `4.14.0` | `4.15.0` |
| `urllib3` | `2.4.0` | `2.6.3` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `charset-normalizer` | `3.4.2` | `3.4.7` |
| `pyyaml` | `6.0.2` | `6.0.3` |
| `tqdm` | `4.67.1` | `4.67.3` |

### `runtime/commons/examples/api_server/requirements.txt`

_15 declared deps; pinned: 0 crit / 0 high / 2 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 6 minor / 0 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `requests` | `==2.32.3` | PINNED | GHSA-gc5v-m9x4-r6x2 / CVE-2026-25645 | 2.33.0 | Requests has Insecure Temp File Reuse in its extract_zipped_paths() utility function |
| `requests` | `==2.32.3` | PINNED | GHSA-9hjg-9r4m-mvj7 / CVE-2024-47081 | 2.32.4 | Requests vulnerable to .netrc credentials leak via malicious URLs |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `boto3` | `1.35.73` | `1.42.96` |
| `pgvector` | `0.3.6` | `0.4.2` |
| `psycopg` | `3.2.3` | `3.3.3` |
| `psycopg-binary` | `3.2.3` | `3.3.3` |
| `psycopg-pool` | `3.2.4` | `3.3.0` |
| `requests` | `2.32.3` | `2.33.1` |

### `runtime/commons/examples/model_server/requirements.txt`

_11 declared deps; pinned: 0 crit / 0 high / 6 mod / 1 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 0 minor / 1 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `transformers` | `==4.51.3` | PINNED | GHSA-59p9-h35m-wg4g / CVE-2025-6638 | 4.53.0 | Hugging Face Transformers is vulnerable to ReDoS through its MarianTokenizer |
| `transformers` | `==4.51.3` | PINNED | GHSA-69w3-r845-3855 / CVE-2026-1839 | 5.0.0rc3 | HuggingFace Transformers allows for arbitrary code execution in the `Trainer` class |
| `transformers` | `==4.51.3` | PINNED | GHSA-4w7r-h757-3r74 / CVE-2025-6921 | 4.53.0 | Hugging Face Transformers vulnerable to Regular Expression Denial of Service (ReDoS) in the AdamWeightDecay optimizer |
| `transformers` | `==4.51.3` | PINNED | GHSA-9356-575x-2w9m / CVE-2025-5197 | 4.53.0 | Hugging Face Transformers Regular Expression Denial of Service (ReDoS) vulnerability |
| `transformers` | `==4.51.3` | PINNED | GHSA-37mw-44qp-f5jm / CVE-2025-3933 | 4.52.1 | Transformers is vulnerable to ReDoS attack through its DonutProcessor class |
| `transformers` | `==4.51.3` | PINNED | GHSA-rcv9-qm8p-9p6j / CVE-2025-6051 | 4.53.0 | Hugging Face Transformers library has Regular Expression Denial of Service |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `transformers` | `==4.51.3` | PINNED | GHSA-phhr-52qp-3mj4 / CVE-2025-3777 | 4.52.1 | Transformers's Improper Input Validation vulnerability can be exploited through username injection |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `transformers` | `4.51.3` | `5.6.2` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `xformers` | `v0.0.29.post2` | `0.0.35` |

### `runtime/deerflow/pyproject.toml`

_30 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 1 low; outdated: 5 major / 13 minor / 6 patch_

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `langchain-openai` | `>=1.1.7` | floor | GHSA-r7w7-9xr2-qq2r | 1.1.14 | langchain-openai: Image token counting SSRF protection can be bypassed via DNS rebinding |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `exa-py` | `1.0.0` | `2.12.1` |
| `firecrawl-py` | `1.15.0` | `4.23.0` |
| `kubernetes` | `30.0.0` | `35.0.0` |
| `langchain-ollama` | `0.3.0` | `1.1.0` |
| `pymupdf4llm` | `0.0.17` | `1.27.2.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `agent-client-protocol` | `0.4.0` | `0.9.0` |
| `ddgs` | `9.10.0` | `9.14.1` |
| `duckdb` | `1.4.4` | `1.5.2` |
| `langchain-anthropic` | `1.3.4` | `1.4.1` |
| `langchain-mcp-adapters` | `0.1.0` | `0.2.2` |
| `langchain-openai` | `1.1.7` | `1.2.1` |
| `langgraph` | `1.0.10` | `1.1.10` |
| `langgraph-api` | `0.7.0` | `0.8.1` |
| `langgraph-runtime-inmem` | `0.22.1` | `0.28.0` |
| `langgraph-sdk` | `0.1.51` | `0.3.13` |
| `markitdown` | `0.0.1a2` | `0.1.5` |
| `pydantic` | `2.12.5` | `2.13.3` |
| `tiktoken` | `0.8.0` | `0.12.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `agent-sandbox` | `0.0.19` | `0.0.30` |
| `httpx` | `0.28.0` | `0.28.1` |
| `langchain` | `1.2.3` | `1.2.15` |
| `langchain-google-genai` | `4.2.1` | `4.2.2` |
| `langgraph-cli` | `0.4.14` | `0.4.24` |
| `tavily-python` | `0.7.17` | `0.7.24` |

### `runtime/dspy/pyproject.toml`

_5 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 1 mod / 0 low; outdated: 2 major / 1 minor / 2 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `pytest` | `>=8.0` | floor | GHSA-6w46-j5rx-g56g / CVE-2025-71176 | 9.0.3 | pytest has vulnerable tmpdir handling |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `pytest` | `8.0` | `9.0.3` |
| `pytest-asyncio` | `0.24` | `1.3.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `dspy` | `3.1.3` | `3.2.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `google-generativeai` | `0.8.0` | `0.8.6` |
| `psycopg2-binary` | `2.9.9` | `2.9.12` |

### `runtime/hermes/requirements.txt`

_9 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 6 minor / 1 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `openai` | `1.58.1` | `2.32.0` |
| `structlog` | `24.4.0` | `25.5.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `asyncpg` | `0.30.0` | `0.31.0` |
| `fastapi` | `0.115.6` | `0.136.1` |
| `google-cloud-firestore` | `2.19.0` | `2.27.0` |
| `google-cloud-secret-manager` | `2.21.1` | `2.27.0` |
| `pydantic` | `2.10.4` | `2.13.3` |
| `uvicorn` | `0.34.0` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `apscheduler` | `3.11.0` | `3.11.2` |

### `runtime/ii_researcher/pyproject.toml`

_25 declared deps; pinned: 0 crit / 0 high / 2 mod / 0 low; range-floor: 1 crit / 5 high / 2 mod / 1 low; outdated: 3 major / 13 minor / 1 patch_

#### CRITICAL security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `litellm` | `>=1.63.6` | floor | GHSA-jjhc-v7c2-5hh6 / CVE-2026-35030 | 1.83.0 | LiteLLM: Authentication bypass via OIDC userinfo cache key collision |

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `langchain-community` | `>=0.3.18` | floor | GHSA-pc6w-59fv-rh23 / CVE-2025-6984 | 0.3.27 | Langchain Community Vulnerable to XML External Entity (XXE) Attacks |
| `litellm` | `>=1.63.6` | floor | GHSA-53mr-6c8q-9789 / CVE-2026-35029 | 1.83.0 | LiteLLM: Privilege escalation via unrestricted proxy configuration endpoint |
| `litellm` | `>=1.63.6` | floor | GHSA-69x8-hrgq-fjj8 | 1.83.0 | LiteLLM: Password hash exposure and pass-the-hash authentication bypass |
| `lxml` | `>=5.3.1` | floor | GHSA-vfmq-68hx-4jfw / CVE-2026-41066 | 6.1.0 | lxml: Default configuration of iterparse() and ETCompatXMLParser() allows XXE to local files |
| `yt-dlp` | `>=2025.2.19` | floor | GHSA-g3gw-q23r-pgqm / CVE-2026-26331 | 2026.02.21 | yt-dlp: Arbitrary Command Injection when using the `--netrc-cmd` option |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `markdown` | `>=3.7` | floor | GHSA-5wmx-573v-2qwq / CVE-2025-69534 | 3.8.1 | Python-Markdown has an Uncaught Exception |
| `pydantic` | `>=2.0.0` | floor | GHSA-mr82-8j83-vxmv / CVE-2024-3772 | 2.4.0 | Pydantic regular expression denial of service |
| `requests` | `>=2.32.3` | PINNED | GHSA-gc5v-m9x4-r6x2 / CVE-2026-25645 | 2.33.0 | Requests has Insecure Temp File Reuse in its extract_zipped_paths() utility function |
| `requests` | `>=2.32.3` | PINNED | GHSA-9hjg-9r4m-mvj7 / CVE-2024-47081 | 2.32.4 | Requests vulnerable to .netrc credentials leak via malicious URLs |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `langchain-openai` | `>=0.3.7` | floor | GHSA-r7w7-9xr2-qq2r | 1.1.14 | langchain-openai: Image token counting SSRF protection can be bypassed via DNS rebinding |

#### UNKNOWN security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `fastapi` | `>=0.100.0` | floor | GHSA-2jv5-9r88-3w3p / CVE-2024-24762 | 9d34ad0ee8a0dfbbcce06f76c2d5d851085024fc, 0.109.1 |  |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `langchain-openai` | `0.3.7` | `1.2.1` |
| `lxml` | `5.3.1` | `6.1.0` |
| `yt-dlp` | `2025.2.19` | `2026.3.17` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `baml-py` | `0.77.0` | `0.221.0` |
| `clean-text` | `0.6.0` | `0.7.1` |
| `click` | `8.1.8` | `8.3.3` |
| `fastapi` | `0.100.0` | `0.136.1` |
| `langchain-community` | `0.3.18` | `0.4.1` |
| `litellm` | `1.63.6` | `1.83.14` |
| `markdown` | `3.7` | `3.10.2` |
| `markdownify` | `1.0.0` | `1.2.2` |
| `pydantic` | `2.0.0` | `2.13.3` |
| `pymupdf` | `1.25.3` | `1.27.2.3` |
| `requests` | `2.32.3` | `2.33.1` |
| `tavily-python` | `0.5.1` | `0.7.24` |
| `uvicorn` | `0.29.0` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `readability-lxml` | `0.8.1` | `0.8.4.1` |

### `runtime/spinner/requirements.txt`

_7 declared deps; pinned: 0 crit / 0 high / 1 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 2 major / 4 minor / 0 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-dotenv` | `==1.0.1` | PINNED | GHSA-mf9w-mj56-hr94 / CVE-2026-28684 | 1.2.2 | python-dotenv: Symlink following in set_key allows arbitrary file overwrite via cross-device rename fallback |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `redis` | `5.0.8` | `7.4.0` |
| `structlog` | `24.4.0` | `25.5.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `pydantic` | `2.9.2` | `2.13.3` |
| `python-dotenv` | `1.0.1` | `1.2.2` |
| `uvicorn` | `0.30.6` | `0.46.0` |

### `runtime/ttd-dr/requirements.txt`

_6 declared deps; pinned: 0 crit / 0 high / 1 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 5 minor / 0 patch_

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `python-dotenv` | `==1.0.1` | PINNED | GHSA-mf9w-mj56-hr94 / CVE-2026-28684 | 1.2.2 | python-dotenv: Symlink following in set_key allows arbitrary file overwrite via cross-device rename fallback |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `structlog` | `24.4.0` | `25.5.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `psycopg` | `3.2.3` | `3.3.3` |
| `pydantic` | `2.9.2` | `2.13.3` |
| `python-dotenv` | `1.0.1` | `1.2.2` |
| `uvicorn` | `0.30.6` | `0.46.0` |

### `runtime/vault-signer/pyproject.toml`

_7 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 0 major / 1 minor / 1 patch_

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `uvicorn` | `0.44.0` | `0.46.0` |

#### Patch updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.136.0` | `0.136.1` |

### `services/avatars/package.json`

_8 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 5 high / 16 mod / 1 low; outdated: 4 major / 4 minor / 0 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `@hono/node-server` | `^1.13.7` | floor | GHSA-wc8c-qw6v-h7f6 / CVE-2026-29087 | 1.19.10 | @hono/node-server has authorization bypass for protected static paths via encoded slashes in Serve Static Middleware |
| `hono` | `^4.6.14` | floor | GHSA-f67f-6cw9-8mq4 / CVE-2026-22817 | 4.11.4 | Hono JWT Middleware's JWT Algorithm Confusion via Unsafe Default (HS256) Allows Token Forgery and Auth Bypass |
| `hono` | `^4.6.14` | floor | GHSA-3vhc-576x-3qv4 / CVE-2026-22818 | 4.11.4 | Hono JWK Auth Middleware has JWT algorithm confusion when JWK lacks "alg" (untrusted header.alg fallback) |
| `hono` | `^4.6.14` | floor | GHSA-m732-5p4w-x69g / CVE-2025-62610 | 4.10.2 | Hono Improper Authorization vulnerability |
| `hono` | `^4.6.14` | floor | GHSA-q5qw-h33p-qvwr / CVE-2026-29045 | 4.12.4 | Hono vulnerable to arbitrary file access via serveStatic vulnerability |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `@hono/node-server` | `^1.13.7` | floor | GHSA-92pp-h63x-v22m / CVE-2026-39406 | 1.19.13 | @hono/node-server: Middleware bypass via repeated slashes in serveStatic |
| `hono` | `^4.6.14` | floor | GHSA-xf4j-xp2r-rqqx / CVE-2026-39408 | 4.12.12 | Hono: Path traversal in toSSG() allows writing files outside the output directory |
| `hono` | `^4.6.14` | floor | GHSA-q7jf-gf43-6x6p | 4.10.3 | Hono vulnerable to Vary Header Injection leading to potential CORS Bypass |
| `hono` | `^4.6.14` | floor | GHSA-92vj-g62v-jqhh / CVE-2025-59139 | 4.9.7 | Hono has Body Limit Middleware Bypass |
| `hono` | `^4.6.14` | floor | GHSA-v8w9-8mx6-g223 | 4.12.7 | Hono vulnerable to Prototype Pollution possible through __proto__ key allowed in parseBody({ dot: true }) |
| `hono` | `^4.6.14` | floor | GHSA-r354-f388-2fhh / CVE-2026-24398 | 4.11.7 | Hono IPv4 address validation bypass in IP Restriction Middleware allows IP spoofing |
| `hono` | `^4.6.14` | floor | GHSA-wmmm-f939-6g9c / CVE-2026-39407 | 4.12.12 | Hono: Middleware bypass via repeated slashes in serveStatic |
| `hono` | `^4.6.14` | floor | GHSA-6wqw-2p9w-4vw4 / CVE-2026-24472 | 4.11.7 | Hono cache middleware ignores "Cache-Control: private" leading to Web Cache Deception |
| `hono` | `^4.6.14` | floor | GHSA-458j-xx4x-4375 | 4.12.14 | hono Improperly Handles JSX Attribute Names Allows HTML Injection in hono/jsx SSR |
| `hono` | `^4.6.14` | floor | GHSA-9r54-q6cx-xmh5 / CVE-2026-24771 | 4.11.7 | Hono vulnerable to XSS through ErrorBoundary component |
| `hono` | `^4.6.14` | floor | GHSA-xpcf-pg52-r92g / CVE-2026-39409 | 4.12.12 | Hono has incorrect IP matching in ipRestriction() for IPv4-mapped IPv6 addresses |
| `hono` | `^4.6.14` | floor | GHSA-r5rp-j6wh-rvv4 / CVE-2026-39410 | 4.12.12 | Hono: Non-breaking space prefix bypass in cookie name handling in getCookie() |
| `hono` | `^4.6.14` | floor | GHSA-5pq2-9x2x-5p6w / CVE-2026-29086 | 4.12.4 | Hono Vulnerable to Cookie Attribute Injection via Unsanitized domain and path in setCookie() |
| `hono` | `^4.6.14` | floor | GHSA-w332-q679-j88p / CVE-2026-24473 | 4.11.7 | Hono has an Arbitrary Key Read in Serve static Middleware (Cloudflare Workers Adapter) |
| `hono` | `^4.6.14` | floor | GHSA-p6xx-57qc-3wxr / CVE-2026-29085 | 4.12.4 | Hono Vulnerable to SSE Control Field Injection via CR/LF in writeSSE() |
| `hono` | `^4.6.14` | floor | GHSA-26pp-8wgv-hjvm | 4.12.12 | Hono missing validation of cookie name on write path in setCookie() |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `hono` | `^4.6.14` | floor | GHSA-gq3j-xvxp-8hrf | 4.11.10 | Hono added timing comparison hardening in basicAuth and bearerAuth |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `@google-cloud/vision` | `4.3.2` | `5.3.5` |
| `@hono/node-server` | `1.13.7` | `2.0.0` |
| `@types/node` | `22.10.5` | `25.6.0` |
| `typescript` | `5.7.2` | `6.0.3` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `@google-cloud/storage` | `7.14.0` | `7.19.0` |
| `hono` | `4.6.14` | `4.12.15` |
| `sharp` | `0.33.5` | `0.34.5` |
| `tsx` | `4.19.2` | `4.21.0` |

### `smelter-os/sqwaadrun/pyproject.toml`

_15 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 4 high / 12 mod / 11 low; outdated: 6 major / 7 minor / 0 patch_

#### HIGH security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `aiohttp` | `>=3.9` | floor | GHSA-5m98-qgg9-wh84 / CVE-2024-30251 | 3.9.4 | aiohttp vulnerable to Denial of Service when trying to parse malformed POST requests |
| `aiohttp` | `>=3.9` | floor | GHSA-5h86-8mv2-jq9f / CVE-2024-23334 | 3.9.2 | aiohttp is vulnerable to directory traversal |
| `aiohttp` | `>=3.9` | floor | GHSA-6mq8-rvhq-8wgg / CVE-2025-69223 | 3.13.3 | AIOHTTP's HTTP Parser auto_decompress feature is vulnerable to zip bomb |
| `lxml` | `>=4.9` | floor | GHSA-vfmq-68hx-4jfw / CVE-2026-41066 | 6.1.0 | lxml: Default configuration of iterparse() and ETCompatXMLParser() allows XXE to local files |

#### MODERATE security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `aiohttp` | `>=3.9` | floor | GHSA-8495-4g3g-x7pr / CVE-2024-52304 | 3.10.11 | aiohttp allows request smuggling due to incorrect parsing of chunk extensions |
| `aiohttp` | `>=3.9` | floor | GHSA-m5qp-6w8w-w647 / CVE-2026-34516 | 3.13.4 | AIOHTTP has a Multipart Header Size Bypass |
| `aiohttp` | `>=3.9` | floor | GHSA-c427-h43c-vf67 / CVE-2026-34525 | 3.13.4 | AIOHTTP accepts duplicate Host headers |
| `aiohttp` | `>=3.9` | floor | GHSA-w2fm-2cpv-w7v5 / CVE-2026-22815 | 3.13.4 | aiohttp allows unlimited trailer headers, leading to possible uncapped memory usage |
| `aiohttp` | `>=3.9` | floor | GHSA-p998-jp59-783m / CVE-2026-34515 | 3.13.4 | AIOHTTP affected by UNC SSRF/NTLMv2 Credential Theft/Local File Read in static resource handler on Windows |
| `aiohttp` | `>=3.9` | floor | GHSA-8qpw-xqxj-h4r2 / CVE-2024-23829 | 3.9.2 | aiohttp's HTTP parser (the python one, not llhttp) still overly lenient about separators |
| `aiohttp` | `>=3.9` | floor | GHSA-g84x-mcqj-x9qq / CVE-2025-69229 | 3.13.3 | AIOHTTP vulnerable to DoS through chunked messages |
| `aiohttp` | `>=3.9` | floor | GHSA-jj3x-wxrx-4x23 / CVE-2025-69227 | 3.13.3 | AIOHTTP vulnerable to DoS when bypassing asserts |
| `aiohttp` | `>=3.9` | floor | GHSA-6jhg-hg63-jvvf / CVE-2025-69228 | 3.13.3 | AIOHTTP vulnerable to  denial of service through large payloads |
| `aiohttp` | `>=3.9` | floor | GHSA-7gpw-8wmc-pm8g / CVE-2024-27306 | 3.9.4 | aiohttp Cross-site Scripting vulnerability on index pages for static file handling |
| `lxml` | `>=4.9` | floor | GHSA-wrxv-2j5q-m38w / CVE-2022-2309 | 4.9.1 | lxml NULL Pointer Dereference allows attackers to cause a denial of service |
| `pytest` | `>=8.0` | floor | GHSA-6w46-j5rx-g56g / CVE-2025-71176 | 9.0.3 | pytest has vulnerable tmpdir handling |

#### LOW security advisories

| Package | Spec | Conf. | Advisory | Fixed in | Summary |
|---|---|---|---|---|---|
| `aiohttp` | `>=3.9` | floor | GHSA-69f9-5gxw-wvc2 / CVE-2025-69224 | 3.13.3 | AIOHTTP's unicode processing of header values could cause parsing discrepancies |
| `aiohttp` | `>=3.9` | floor | GHSA-3wq7-rqq7-wx6j / CVE-2026-34517 | 3.13.4 | AIOHTTP has late size enforcement for non-file multipart fields causes memory DoS |
| `aiohttp` | `>=3.9` | floor | GHSA-2vrm-gr82-f7m5 / CVE-2026-34514 | 3.13.4 | AIOHTTP has CRLF injection through multipart part content type header construction |
| `aiohttp` | `>=3.9` | floor | GHSA-54jq-c3m8-4m76 / CVE-2025-69226 | 3.13.3 | AIOHTTP vulnerable to brute-force leak of internal static ﬁle path components |
| `aiohttp` | `>=3.9` | floor | GHSA-966j-vmvw-g2g9 / CVE-2026-34518 | 3.13.4 | AIOHTTP leaks Cookie and Proxy-Authorization headers on cross-origin redirect |
| `aiohttp` | `>=3.9` | floor | GHSA-mqqc-3gqh-h2x8 / CVE-2025-69225 | 3.13.3 | AIOHTTP has unicode match groups in regexes for ASCII protocol elements |
| `aiohttp` | `>=3.9` | floor | GHSA-mwh4-6h8g-pg8w / CVE-2026-34519 | 3.13.4 | AIOHTTP has HTTP response splitting via \r in reason phrase |
| `aiohttp` | `>=3.9` | floor | GHSA-fh55-r93g-j68g / CVE-2025-69230 | 3.13.3 | AIOHTTP Vulnerable to Cookie Parser Warning Storm |
| `aiohttp` | `>=3.9` | floor | GHSA-hcc4-c3v8-rx92 / CVE-2026-34513 | 3.13.4 | AIOHTTP Affected by Denial of Service (DoS) via Unbounded DNS Cache in TCPConnector |
| `aiohttp` | `>=3.9` | floor | GHSA-63hf-3vf5-4wqf / CVE-2026-34520 | 3.13.4 | AIOHTTP's C parser (llhttp) accepts null bytes and control characters in response header values - header injection/se... |
| `aiohttp` | `>=3.9` | floor | GHSA-9548-qrrj-x5pj / CVE-2025-53643 | 3.12.14 | AIOHTTP is vulnerable to HTTP Request/Response Smuggling through incorrect parsing of chunked trailer sections |

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `aiofiles` | `23.2` | `25.1.0` |
| `google-cloud-storage` | `2.18` | `3.10.1` |
| `html2text` | `2024.2.26` | `2025.4.15` |
| `lxml` | `4.9` | `6.1.0` |
| `pytest` | `8.0` | `9.0.3` |
| `pytest-asyncio` | `0.23` | `1.3.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `aiohttp` | `3.9` | `3.13.5` |
| `beautifulsoup4` | `4.12` | `4.14.3` |
| `mypy` | `1.8` | `1.20.2` |
| `playwright` | `1.42` | `1.58.0` |
| `psycopg` | `3.1` | `3.3.3` |
| `ruff` | `0.3` | `0.15.12` |
| `tldextract` | `5.1` | `5.3.1` |

### `voice_relay/requirements.txt`

_4 declared deps; pinned: 0 crit / 0 high / 0 mod / 0 low; range-floor: 0 crit / 0 high / 0 mod / 0 low; outdated: 1 major / 3 minor / 0 patch_

#### Major version updates available  _(major bump — review changelog before upgrading)_

| Package | Pinned | Latest |
|---|---|---|
| `websockets` | `14.0` | `16.0` |

#### Minor version updates available

| Package | Pinned | Latest |
|---|---|---|
| `fastapi` | `0.115.0` | `0.136.1` |
| `google-genai` | `1.0.0` | `1.73.1` |
| `uvicorn` | `0.34.0` | `0.46.0` |

## Methodology

1. **Aggregation:** All `requirements.txt`, `pyproject.toml`, `package.json`, and `Cargo.toml` were parsed. 651 dependency declarations across 79 manifests reduced to 441 unique (ecosystem, name, version) triples.
2. **Vulnerability scan:** Bulk OSV advisory snapshots (`https://osv-vulnerabilities.storage.googleapis.com/<ecosystem>/all.zip`) were downloaded and matched locally against the 383 triples that have an explicit version. Range matching uses the OSV `events` schema (`introduced`/`fixed`/`last_affected`).
3. **Latest-version check:** Concurrent calls to PyPI JSON, npm registry, and crates.io APIs.

### What was NOT checked
- **Transitive dependencies** — lock files (`package-lock.json`, `poetry.lock`, `Cargo.lock`, `uv.lock`) were not parsed. Many real-world vulns hide in the transitive graph.
- **Range-only constraints** are matched against OSV using the lower-bound version, but tagged `RANGE-floor`. These are *possible* vulnerabilities — without a lock file, the resolver may have already picked a safe newer version. Triage by running `pip list`, `npm ls`, or `cargo tree` in each environment.
- **Yarn/pnpm workspaces, monorepo aliases, and `workspace:*` deps** were skipped.
- **System / OS packages, container base images, Go modules, Java jars** are out of scope.
- **OSV.dev live API** was unreachable from this environment (sandbox blocked `api.osv.dev`); the bulk OSV snapshot from `osv-vulnerabilities.storage.googleapis.com` was used instead — coverage is equivalent but data freshness is the snapshot timestamp (~2026-04-27).

