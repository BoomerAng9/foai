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

## Current gaps (2026-04-19)

This crate has not yet been made substrate-portable. Expected gaps when the verification script first runs:

1. **wasm32 — `thiserror` dependency is `std`-only.** The current `Denial` enum uses `#[derive(thiserror::Error)]` which requires `std`. For WASM support, either:
   - Feature-gate `thiserror` behind `feature = "std"` and provide a manual `Display` impl for `no_std` builds
   - Replace `thiserror` with `core::fmt::Display` manual implementations (simpler, drops the dep)
2. **macOS ARM64 — may work out of box.** The crate has no OS-specific syscalls or paths. Likely compiles clean on first try once target is installed.
3. **Per-substrate signing (Vault)** — not yet wired. Each substrate's build artifact needs to be signed by Vault independently per v1.6 §3.1's Phoenix-integration requirement.

## Follow-up work

Ordered by scope:

1. **WASM no_std compatibility** — drop `thiserror` dependency OR feature-gate it. ~30 min of work + re-verification.
2. **macOS CI runner** — add `macos-latest` Cloud Build step OR a GitHub-hosted macOS job. Validates Observer 1 independently.
3. **Per-substrate Vault signing** — Cloud Build step that runs after each substrate's build, pipes the artifact to Vault's HSM-signing endpoint. Scaffolding only until Vault sidecar lands.
4. **Kani proof of consensus quorum** — harness proving that `consensus_for(..., HighRisk, ...)` returning `ThreeOfThreeWithCia` means ALL THREE substrates agree before the action fires. Currently proved at the *policy-layer* (degradation.rs); the *substrate-layer* proof is a follow-up.

## Why this ships as scaffolding today

The infrastructure pattern (build script + docs + CI step) is trivially correct. The actual WASM portability work depends on dependency choices that deserve their own PR with focused review. Scaffolding lets the next contributor see exactly which substrate gaps exist and what shape the fix takes, without forcing a multi-day hygiene PR into this session.
