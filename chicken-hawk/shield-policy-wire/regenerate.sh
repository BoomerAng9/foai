#!/usr/bin/env bash
# Regenerate src/generated/mod.rs from runtime/spinner/schema/invocation.proto.
#
# Run manually on a developer host with protoc available. Commit the
# resulting src/generated/mod.rs. Cloud Build never invokes this script —
# generated code is part of the tree.
#
# Usage:
#   chicken-hawk/shield-policy-wire/regenerate.sh
#
# Requirements:
#   - cargo + stable Rust (tested on 1.85+)
#   - protoc OR the protoc-bin-vendored crate compiles on the host
#     (protoc-bin-vendored works on Linux/macOS out of the box;
#     Windows requires the GCC/mingw toolchain for transitive deps)
#
# Divergence from the auto-regenerated output:
#   The checked-in src/generated/mod.rs is a hand-maintained file whose
#   structure matches prost 0.14.3 output exactly. When this script is
#   used to regenerate, review the diff carefully before committing:
#   adjust the module layout / re-exports so downstream imports in
#   src/convert.rs stay valid.

set -euo pipefail

CRATE_DIR="$(cd "$(dirname "$0")" && pwd)"
PROTO_DIR="$CRATE_DIR/../../runtime/spinner/schema"
PROTO_FILE="$PROTO_DIR/invocation.proto"
OUT_FILE="$CRATE_DIR/src/generated/mod.rs"

if [ ! -f "$PROTO_FILE" ]; then
    echo "error: schema not found at $PROTO_FILE" >&2
    exit 1
fi

WORK=$(mktemp -d)
trap 'rm -rf "$WORK"' EXIT

cat > "$WORK/Cargo.toml" <<EOF
[package]
name = "shield-policy-wire-regen"
version = "0.0.0"
edition = "2021"

[dependencies]
prost = "=0.14.3"

[build-dependencies]
prost-build = "=0.14.3"
protoc-bin-vendored = "=3.2.0"
EOF

cat > "$WORK/build.rs" <<EOF
fn main() {
    let protoc = protoc_bin_vendored::protoc_bin_path().unwrap();
    std::env::set_var("PROTOC", protoc);
    prost_build::Config::new()
        .out_dir("src/generated")
        .compile_protos(
            &["$PROTO_FILE"],
            &["$PROTO_DIR"],
        )
        .unwrap();
}
EOF

mkdir -p "$WORK/src/generated"
echo 'pub fn main() {}' > "$WORK/src/lib.rs"

(cd "$WORK" && cargo build --quiet)

GENERATED="$WORK/src/generated/deploy.spinner.shield.v1.rs"
if [ ! -f "$GENERATED" ]; then
    echo "error: prost-build did not produce expected output at $GENERATED" >&2
    exit 1
fi

# Preserve the crate's module header; splice prost output beneath it.
{
    head -n 14 "$OUT_FILE"
    echo ""
    echo "// --- BEGIN prost-generated output (do not edit by hand) ---"
    cat "$GENERATED"
    echo "// --- END prost-generated output ---"
} > "$OUT_FILE.new"

mv "$OUT_FILE.new" "$OUT_FILE"

echo "regenerated $OUT_FILE"
echo "  run: cargo test -p shield-policy-wire"
