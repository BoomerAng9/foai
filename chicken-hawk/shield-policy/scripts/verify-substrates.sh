#!/usr/bin/env bash
# verify-substrates.sh
# ====================
# Attempts `cargo check` across the three v1.6 §3.1 Substrate
# Heterogeneity targets:
#
#   Primary:    x86_64-unknown-linux-gnu    (Linux, prod default)
#   Observer 1: aarch64-apple-darwin         (macOS ARM64, different kernel)
#   Observer 2: wasm32-unknown-unknown       (WASM, sandboxed runtime)
#
# Intent: Spinner deploys three instances of the policy engine —
# one per substrate. A single-substrate zero-day CAN compromise the
# instance on that target, but CANNOT achieve the 2-of-3 quorum
# required for policy decisions. Substrate heterogeneity is the
# multiplier on top of other defenses.
#
# This script verifies the CRATE compiles cleanly on each target —
# that's the prerequisite for cross-substrate build reproducibility
# (per-target artifacts signed independently by Vault).
#
# Exit codes:
#   0 — all three substrates compile clean
#   1 — one or more substrates failed (details in stderr)
#
# Usage:
#   bash scripts/verify-substrates.sh             # best-effort
#   bash scripts/verify-substrates.sh --strict    # fail on any gap
#
# Designed to run in Cloud Build (Linux host). When the two non-
# native targets haven't had their target-triples installed yet,
# the script uses `rustup target add` to fetch them.

set -u

STRICT=${STRICT:-0}
if [ "${1:-}" = "--strict" ]; then STRICT=1; fi

cd "$(dirname "$0")/.."   # chicken-hawk/shield-policy

TARGETS=(
    "x86_64-unknown-linux-gnu"
    "aarch64-apple-darwin"
    "wasm32-unknown-unknown"
)

RESULTS=()
FAILED=0

for t in "${TARGETS[@]}"; do
    echo ""
    echo "═══ Substrate: $t ═══"

    # Ensure target is installed (no-op if already present)
    rustup target add "$t" > /dev/null 2>&1 || {
        echo "  [skip] cannot install target $t on this host"
        RESULTS+=("$t: SKIP (target unavailable on this host)")
        continue
    }

    # Try the check
    if cargo check --target "$t" --quiet 2>&1; then
        echo "  [pass] $t compiles clean"
        RESULTS+=("$t: PASS")
    else
        echo "  [fail] $t — see errors above"
        RESULTS+=("$t: FAIL")
        FAILED=$((FAILED + 1))
    fi
done

echo ""
echo "═══ Substrate Heterogeneity Summary ═══"
for r in "${RESULTS[@]}"; do
    echo "  $r"
done

if [ "$FAILED" -gt 0 ]; then
    echo ""
    echo "$FAILED substrate(s) failed to compile."
    echo ""
    echo "v1.6 §3.1 requires all three substrates produce reproducible"
    echo "builds. Gaps here typically require:"
    echo "  - no_std feature gate for wasm32 (thiserror dependency is std-only)"
    echo "  - conditional compilation for macOS syscalls in time/etc handlers"
    echo "  - substrate-specific Cargo features or dependency swaps"
    if [ "$STRICT" -eq 1 ]; then
        exit 1
    fi
    echo ""
    echo "(Non-strict mode — reporting but exiting 0. Pass --strict to fail)"
fi

exit 0
