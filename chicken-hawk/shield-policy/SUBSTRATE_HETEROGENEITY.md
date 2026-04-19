# Substrate Heterogeneity — v1.6 §3.1 / P2 #6

One of the three Advanced Technical Advancements shipped in v1.6.
The Shield Division runs the Spinner policy engine on **three
different execution substrates** simultaneously; a single-substrate
zero-day compromises one instance but cannot achieve the 2-of-3
consensus required for policy authorization.

## The three substrates

| Role | Substrate | Rationale |
|---|---|---|
| **Primary** | `x86_64-unknown-linux-gnu` | Production default. Traditional deployment. Fastest reasoning. |
| **Observer 1** | `aarch64-apple-darwin` | Different kernel (XNU/Darwin), different instruction set. A Linux kernel zero-day is inert here. |
| **Observer 2** | `wasm32-unknown-unknown` | Sandboxed execution, memory-safe-by-design runtime. Fundamentally different attack surface. |

An attacker needs **simultaneous zero-days across all three substrates** to compromise the Spinner consensus. That raises the bar from "single-vuln exploitation" to "nation-state-level triple-target development." Each observer is architecturally immune to the specific exploit classes that target the other substrates.

## Consensus + Phoenix combine multiplicatively

Even a successful simultaneous triple-substrate compromise is erased by **Phoenix Protocol** (v1.6 §3.3 / PR #242) every 24 hours. To maintain persistent compromise:

- Attacker re-compromises all three substrates every 24 hours → multiplies detection opportunities by N compromises per window
- OR attacker compromises the **Golden Image itself** → requires Vault compromise (root of trust), which is its own multi-key HSM ceremony

The combination is the actual product. No single piece delivers the guarantee alone.

## Verification

`scripts/verify-substrates.sh` attempts `cargo check` on all three targets. Run locally:

```bash
cd chicken-hawk/shield-policy
bash scripts/verify-substrates.sh
```

The script installs missing target toolchains via `rustup target add` and reports per-substrate pass/fail. Non-strict mode (default) reports gaps but exits 0; `--strict` fails the build on any gap.

## Cloud Build integration

`cloudbuild.yaml` gains a `substrate-verify` step gated on `_RUN_SUBSTRATES=yes` substitution. Pattern matches Kani: soft-gated until the toolchain-install cost is profiled, then tightened to required.

```bash
# Trigger with substrate verification
gcloud builds submit --substitutions=_RUN_SUBSTRATES=yes .
```

## Current status (2026-04-19, post-verification)

**All three substrates compile clean.** First actual run of `verify-substrates.sh` showed:

```
x86_64-unknown-linux-gnu: PASS
aarch64-apple-darwin:     PASS
wasm32-unknown-unknown:   PASS
```

This was unexpected — the earlier version of this doc predicted `thiserror` would break WASM due to `std` dependencies. Turns out `thiserror 1.x` handles trivial `Display` + `Error` derives without requiring `std` for our usage pattern. The kernel-component modules (cia / snr / degradation / phoenix / zkp) are inherently portable because they're pure types + predicates with no OS syscalls, no I/O, no thread primitives.

**The policy engine is substrate-heterogeneous today.** The graduation from soft-gated to required-pass happens in this PR: `_RUN_SUBSTRATES` default flips to `yes` so every CI run validates all three targets.

## What's still follow-up work

Not gaps in the crate itself — surrounding infrastructure:

1. **Per-substrate Vault signing** — each build artifact must be signed by Vault independently per v1.6 §3.1. Cloud Build step that pipes per-target artifacts through Vault's HSM-signing endpoint is scaffolding-ready once the Vault sidecar lands.
2. **Cross-substrate build reproducibility check** — a script that compares content hashes of the three artifacts after release builds. If hashes diverge for the same source, something non-deterministic slipped in. Currently the `[profile.release]` config pins LTO + single codegen-unit to minimize this risk.
3. **Kani proof of consensus quorum** — currently `consensus_for(..., HighRisk, ...)` returning `ThreeOfThreeWithCia` is proven at the policy layer (see `kani_harnesses.rs`). A substrate-layer proof showing the three instances actually agree byte-for-byte on the same input is a follow-up — requires modeling the three-instance runtime, not just the single-instance policy check.
4. **macOS CI runner** — Cloud Build's Linux runner can cross-compile to macOS ARM64 (proven by the PASS above via `cargo check --target`), but native macOS CI would validate syscall-level behavior. Follow-up when/if OS-specific code gets added.

## Why the WASM worry was wrong

When this doc was first written (#245), the assumption was "anything depending on `thiserror` requires `std`." That's true for `thiserror 2.0+` used with `std::io::Error` or similar concrete-std types. For the `Denial` enum — which only derives `Error` + uses `#[error("...")]` string attributes — `thiserror 1.x` generates code that works on `core::fmt::Display` alone. No `std` actually required. The pessimism was an artifact of not having installed the WASM target yet; once installed and checked, the crate just worked.

This is a useful lesson worth naming: **infrastructure scaffolding should reflect verified state, not assumed state.** The original gap list was a guess. Running the script found the real state.
