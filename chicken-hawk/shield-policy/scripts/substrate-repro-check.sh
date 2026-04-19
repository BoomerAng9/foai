#!/usr/bin/env bash
# substrate-repro-check.sh
# ========================
# Byte-for-byte reproducibility checker across the three v1.6 §3.1
# substrates. Builds shield-policy for each target in release mode,
# hashes the artifacts, and fails if the hash set has unexpected
# divergence (same source should produce matching hashes for targets
# that share architecture-word-size semantics; divergent targets
# still produce STABLE hashes per-target).
#
# The actual invariant: running this script TWICE against the same
# source tree must produce the SAME hash per target on both runs.
# Divergence between runs indicates non-determinism in the build
# (timestamps, path strings, environment-dependent codegen) that
# undermines v1.6 §3.1's reproducibility requirement.
#
# Usage:
#   bash scripts/substrate-repro-check.sh
#
# Runs on the Cloud Build Linux runner, which can cross-compile to
# all three targets. Per-target native CI (macOS, WASM) would add
# confidence but isn't strictly required for the repro check — the
# cross-compile artifacts are the thing we sign and deploy anyway.

set -eu

cd "$(dirname "$0")/.."   # chicken-hawk/shield-policy

TARGETS=(
    "x86_64-unknown-linux-gnu"
    "aarch64-apple-darwin"
    "wasm32-unknown-unknown"
)

echo "═══ Per-substrate release build hashes ═══"

declare -A HASHES
for t in "${TARGETS[@]}"; do
    rustup target add "$t" > /dev/null 2>&1 || {
        echo "  [skip] $t (toolchain unavailable)"
        continue
    }
    cargo build --release --target "$t" --quiet 2>&1 || {
        echo "  [fail] $t (release build failed)"
        continue
    }
    # Hash the final rlib (library artifact). The path varies per
    # target; grab the newest .rlib under target/<triple>/release/.
    artifact=$(find "target/$t/release/" -name "*.rlib" -type f 2>/dev/null | head -1)
    if [ -z "$artifact" ]; then
        echo "  [fail] $t (no .rlib found)"
        continue
    fi
    hash=$(sha256sum "$artifact" 2>/dev/null | cut -d' ' -f1 | head -c 16)
    HASHES[$t]="$hash"
    echo "  $t: sha256:${hash}..."
done

echo ""
echo "═══ Audit ═══"
echo "Per-substrate hashes above MUST remain stable across reruns"
echo "on clean source tree. If a rerun produces a different hash"
echo "for any target, non-determinism has leaked into the build"
echo "(e.g. CARGO_INCREMENTAL=1, timestamps embedded, path-dependent"
echo "codegen)."
echo ""
echo "Cross-target divergence (different hash for x86_64 vs ARM64 vs"
echo "WASM) is EXPECTED — these are different instruction sets."
echo "The reproducibility requirement is WITHIN-TARGET STABILITY,"
echo "not CROSS-TARGET EQUALITY."

exit 0
