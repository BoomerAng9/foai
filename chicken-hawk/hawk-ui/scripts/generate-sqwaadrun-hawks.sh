#!/usr/bin/env bash
# Generate Sqwaadrun fleet character art via Recraft V4.
#
# Source roster: ~/foai/smelter-os/sqwaadrun/sqwaadrun/sqwaadrun_hawks.json
# Output: ~/foai/chicken-hawk/hawk-ui/public/hawks/<lowercase_id>.png
#
# Style: cohesive Sqwaadrun fleet — character portrait, FOAI palette
# (amber + slate base, accent colors per role), 1024x1024 square,
# transparent background, digital-illustration register.
#
# Cost: ~40 credits per image × 17 hawks. Re-running is idempotent —
# files are skipped if they already exist with non-zero size.

set -euo pipefail

ROSTER="${ROSTER:-/c/Users/rishj/foai/smelter-os/sqwaadrun/sqwaadrun/sqwaadrun_hawks.json}"
OUT_DIR="${OUT_DIR:-/c/Users/rishj/foai/chicken-hawk/hawk-ui/public/hawks}"
mkdir -p "$OUT_DIR"

# Pull the Recraft key from the openclaw vault on myclaw-vps so the script
# can run without echoing secrets locally. Override RECRAFT_API_KEY env to skip.
if [[ -z "${RECRAFT_API_KEY:-}" ]]; then
  RECRAFT_API_KEY=$(ssh myclaw-vps "docker exec openclaw-sop5-openclaw-1 sh -c 'echo \$RECRAFT_API_KEY'")
fi

if [[ -z "$RECRAFT_API_KEY" ]]; then
  echo "FATAL: no RECRAFT_API_KEY available" >&2
  exit 1
fi

# Shared style directive layered on top of each hawk's individual visual prompt.
# Read by Iller_Ang's `references/image-gen-routing.md` — character art register.
STYLE_DIRECTIVE='digital illustration, character portrait, square composition, vibrant amber-and-slate palette with role-specific accent color, dynamic pose, clean studio background, cohesive Sqwaadrun fleet style — cinematic but illustrated, bold linework, semi-realistic anthropomorphic hawk in tactical gear'

count_total=$(jq 'length' "$ROSTER")
count_done=0
count_skipped=0
count_failed=0

echo "🦅 Generating $count_total Sqwaadrun hawks → $OUT_DIR"

for i in $(seq 0 $((count_total - 1))); do
  id=$(jq -r ".[$i].id" "$ROSTER")
  title=$(jq -r ".[$i].title" "$ROSTER")
  visual=$(jq -r ".[$i].visual" "$ROSTER")
  personality=$(jq -r ".[$i].personality" "$ROSTER")

  filename="$(echo "$id" | tr '[:upper:]' '[:lower:]').png"
  out_path="$OUT_DIR/$filename"

  if [[ -s "$out_path" ]]; then
    echo "⏭  $id — already at $out_path ($(stat -c%s "$out_path") bytes), skipping"
    count_skipped=$((count_skipped + 1))
    continue
  fi

  prompt="$visual Personality: $personality. Title: $title. Style: $STYLE_DIRECTIVE."

  echo "🎨 [$((i + 1))/$count_total] $id ($title)"

  body=$(jq -nc \
    --arg prompt "$prompt" \
    --arg style "digital_illustration" \
    --arg size "1024x1024" \
    '{prompt: $prompt, style: $style, size: $size, n: 1}')

  resp=$(curl -fsS -X POST \
    -H "Authorization: Bearer $RECRAFT_API_KEY" \
    -H "Content-Type: application/json" \
    -d "$body" \
    https://external.api.recraft.ai/v1/images/generations 2>&1) || {
      echo "  ❌ Recraft API call failed: $resp" >&2
      count_failed=$((count_failed + 1))
      continue
    }

  url=$(echo "$resp" | jq -r '.data[0].url')
  if [[ -z "$url" || "$url" == "null" ]]; then
    echo "  ❌ no URL in response: $resp" >&2
    count_failed=$((count_failed + 1))
    continue
  fi

  curl -fsSL "$url" -o "$out_path" || {
    echo "  ❌ download failed: $url" >&2
    rm -f "$out_path"
    count_failed=$((count_failed + 1))
    continue
  }

  size=$(stat -c%s "$out_path")
  echo "  ✅ saved $filename ($size bytes)"
  count_done=$((count_done + 1))
done

echo ""
echo "──────────────────────────────────"
echo "🦅 Sqwaadrun fleet generation done"
echo "  generated: $count_done"
echo "  skipped:   $count_skipped"
echo "  failed:    $count_failed"
echo "──────────────────────────────────"
