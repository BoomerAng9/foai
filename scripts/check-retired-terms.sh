#!/usr/bin/env bash
# ============================================================================
# Gate 8 — Retired-term audit scan
# ============================================================================
# Informational scan that reports every occurrence of retired/deprecated
# brand terms in the repo, categorized by directory so reviewers can
# distinguish doc mentions from code references from UI leaks.
#
# Always exits 0 (non-blocking). Intended as a visibility tool, not a
# CI gate. Future PR can wire it as a non-blocking CI job.
#
# Usage:
#   bash scripts/check-retired-terms.sh              # full report
#   bash scripts/check-retired-terms.sh | grep FIX   # only flagged sites
#
# Seed the TERMS array below with new retirements as they land.
# ============================================================================

set -euo pipefail

# Retired terms + canon reference (for operators who want to verify)
# Each entry: "term:canon-memory-key"
TERMS=(
  "Paperform:project_taskade_replaces_paperform"
  "OpenClaw:feedback_openclaw_api_restrictions+reference_openclaw_credentials"
  "acheevy.digital:project_acheevy_digital_deprecated"
)

# Directory categorization. Adjust as the repo evolves.
UI_DIRS=(
  "cti-hub/src/app"
  "cti-hub/src/components"
  "perform/src/app"
  "perform/src/components"
)
API_DIRS=(
  "cti-hub/src/app/api"
  "perform/src/app/api"
)
CODE_DIRS=(
  "cti-hub/src/lib"
  "perform/src/lib"
  "aims-tools"
  "chicken-hawk"
  "luc"
  "runtime"
  "deploy"
)
DOC_DIRS=(
  "docs"
  "README.md"
  "AGENTS.md"
  "INFRASTRUCTURE.md"
  "PLATFORM_DELTA_AUDIT.md"
)

classify() {
  local path="$1"
  # Order matters: API dirs are inside UI dirs; check API first.
  for d in "${API_DIRS[@]}"; do
    case "$path" in
      "$d"/*) echo "KEEP-API"; return ;;
    esac
  done
  for d in "${UI_DIRS[@]}"; do
    case "$path" in
      "$d"/*) echo "FIX"; return ;;
    esac
  done
  for d in "${CODE_DIRS[@]}"; do
    case "$path" in
      "$d"/*) echo "INTERNAL-OK"; return ;;
    esac
  done
  for d in "${DOC_DIRS[@]}"; do
    case "$path" in
      "$d"/*|"$d") echo "DOCS"; return ;;
    esac
  done
  echo "OTHER"
}

printf -- "%s\n" "=============================================="
printf -- "%s\n" "Gate 8 — Retired Term Audit"
printf -- "%s\n" "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
printf -- "%s\n" "=============================================="
printf "\n"

for entry in "${TERMS[@]}"; do
  term="${entry%%:*}"
  canon="${entry##*:}"
  printf -- "----- %s -----\n" "$term"
  printf -- "  Canon: %s\n" "$canon"
  printf -- "\n"

  # Use git ls-files to honor .gitignore and skip node_modules.
  # Use a literal match (-F) by default; if the term contains a regex
  # metachar we can't safely literalize, adjust here.
  while IFS= read -r match; do
    path="${match%%:*}"
    rest="${match#*:}"
    line="${rest%%:*}"
    cat="$(classify "$path")"
    printf -- "  [%-11s] %s:%s\n" "$cat" "$path" "$line"
  done < <(git grep -n -F -w "$term" 2>/dev/null || true)

  printf -- "\n"
done

printf -- "%s\n" "=============================================="
printf -- "%s\n" "Categories:"
printf -- "%s\n" "  FIX        — Customer-facing UI. Replace or relabel."
printf -- "%s\n" "  KEEP-API   — API route path / integration identifier. Do not rename."
printf -- "%s\n" "  INTERNAL-OK — Library/config reference in owner-scoped code."
printf -- "%s\n" "  DOCS       — Retirement docs, session deltas, audits."
printf -- "%s\n" "  OTHER      — Unclassified — review manually."
printf -- "%s\n" "=============================================="

exit 0
