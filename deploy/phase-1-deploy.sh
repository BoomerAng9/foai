#!/usr/bin/env bash
# ============================================================================
# Gate 6 Phase-1 production deploy — orchestration wrapper
# ============================================================================
# Runs the two Phase-1 Cloud Run deploys in order with human-gated pauses
# between each. Every step is explicit; there is no unattended path.
#
# Usage:
#   GCP_PROJECT=foai-aims ./deploy/phase-1-deploy.sh
#
# Flags:
#   --dry-run      Print every gcloud invocation but do not execute
#   --skip-checks  Skip pre-flight checks (NOT recommended)
#   --service=NAME Limit deploy to a single service (voice-gateway | ttd-dr)
#
# Rollback recipe is printed at the end. Rollback-on-failure is NOT
# automatic — you decide whether to revert based on post-deploy health.
# ============================================================================

set -euo pipefail

GCP_PROJECT="${GCP_PROJECT:-foai-aims}"
REGION="${REGION:-us-central1}"
DRY_RUN=0
SKIP_CHECKS=0
ONLY_SERVICE=""

for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --skip-checks) SKIP_CHECKS=1 ;;
    --service=*) ONLY_SERVICE="${arg#--service=}" ;;
    *) echo "Unknown arg: $arg" >&2; exit 2 ;;
  esac
done

c_reset='\033[0m'
c_bold='\033[1m'
c_yellow='\033[33m'
c_green='\033[32m'
c_red='\033[31m'

say()    { printf "%b%s%b\n" "$c_bold" "$1" "$c_reset"; }
warn()   { printf "%b⚠ %s%b\n" "$c_yellow" "$1" "$c_reset" >&2; }
ok()     { printf "%b✓ %s%b\n" "$c_green" "$1" "$c_reset"; }
fail()   { printf "%b✗ %s%b\n" "$c_red" "$1" "$c_reset" >&2; exit 1; }

run() {
  if [[ $DRY_RUN -eq 1 ]]; then
    printf "[DRY-RUN] %s\n" "$*"
  else
    "$@"
  fi
}

confirm() {
  local msg="$1"
  read -rp "$(printf '%b%s%b [y/N] ' "$c_yellow" "$msg" "$c_reset")" ans
  [[ "$ans" == "y" || "$ans" == "Y" ]] || fail "Aborted by operator"
}

# ---------------------------------------------------------------------------
# Pre-flight
# ---------------------------------------------------------------------------
say "Gate 6 Phase-1 deploy — project=${GCP_PROJECT} region=${REGION}"
[[ $DRY_RUN -eq 1 ]] && warn "DRY-RUN mode — no changes will be made"

if [[ $SKIP_CHECKS -eq 0 ]]; then
  say "Pre-flight checks"

  command -v gcloud >/dev/null || fail "gcloud CLI not found on PATH"
  gcloud config get-value project >/dev/null 2>&1 || fail "gcloud not authenticated"
  active_project="$(gcloud config get-value project 2>/dev/null)"
  if [[ "$active_project" != "$GCP_PROJECT" ]]; then
    warn "gcloud active project is '$active_project', expected '$GCP_PROJECT'"
    confirm "Switch gcloud to $GCP_PROJECT?"
    run gcloud config set project "$GCP_PROJECT"
  fi
  ok "gcloud authenticated against $GCP_PROJECT"

  # Verify required secrets exist (fail fast if any are missing)
  required_secrets=(
    voice-gateway-inworld-jwt-secret
    voice-gateway-inworld-workspace-id
    voice-gateway-groq-key
    ttd-dr-hmac-secret
  )
  for sec in "${required_secrets[@]}"; do
    if gcloud secrets describe "$sec" --project="$GCP_PROJECT" >/dev/null 2>&1; then
      ok "Secret present: $sec"
    else
      fail "Secret missing: $sec  (create via: gcloud secrets create $sec --replication-policy=automatic; then add version)"
    fi
  done

  # Verify Artifact Registry repos exist
  required_repos=(voice-gateway ttd-dr)
  for repo in "${required_repos[@]}"; do
    if gcloud artifacts repositories describe "$repo" --location="$REGION" --project="$GCP_PROJECT" >/dev/null 2>&1; then
      ok "Artifact repo present: $repo"
    else
      fail "Artifact repo missing: $repo  (create via: gcloud artifacts repositories create $repo --repository-format=docker --location=$REGION)"
    fi
  done
fi

# ---------------------------------------------------------------------------
# Deploy voice-gateway
# ---------------------------------------------------------------------------
if [[ -z "$ONLY_SERVICE" || "$ONLY_SERVICE" == "voice-gateway" ]]; then
  say ""
  say "Step 1/2 — Deploy voice-gateway"
  confirm "Submit Cloud Build for voice-gateway now?"
  run gcloud builds submit \
    --config=deploy/services/voice-gateway/cloudbuild.yaml \
    --project="$GCP_PROJECT" \
    deploy/services/voice-gateway/
  ok "voice-gateway deploy submitted"

  say "Post-deploy: smoke voice-gateway /health"
  voice_url="$(gcloud run services describe voice-gateway --region="$REGION" --project="$GCP_PROJECT" --format='value(status.url)' 2>/dev/null || echo '')"
  if [[ -n "$voice_url" ]]; then
    run curl --fail --silent --show-error "$voice_url/health" || warn "voice-gateway /health did not return 200"
  else
    warn "Could not resolve voice-gateway URL"
  fi
fi

# ---------------------------------------------------------------------------
# Deploy ttd-dr
# ---------------------------------------------------------------------------
if [[ -z "$ONLY_SERVICE" || "$ONLY_SERVICE" == "ttd-dr" ]]; then
  say ""
  say "Step 2/2 — Deploy ttd-dr"
  confirm "Submit Cloud Build for ttd-dr now?"
  run gcloud builds submit \
    --config=runtime/ttd-dr/cloudbuild.yaml \
    --project="$GCP_PROJECT" \
    runtime/ttd-dr/
  ok "ttd-dr deploy submitted"

  say "Post-deploy: smoke ttd-dr /health (auth-required)"
  ttdr_url="$(gcloud run services describe ttd-dr --region="$REGION" --project="$GCP_PROJECT" --format='value(status.url)' 2>/dev/null || echo '')"
  if [[ -n "$ttdr_url" ]]; then
    # ttd-dr is auth-required; a 401 is expected and proves the service is up
    http_code="$(curl --silent --output /dev/null --write-out '%{http_code}' "$ttdr_url/health" || echo '000')"
    if [[ "$http_code" == "401" || "$http_code" == "200" ]]; then
      ok "ttd-dr /health reachable (HTTP $http_code)"
    else
      warn "ttd-dr /health returned $http_code — investigate"
    fi
  else
    warn "Could not resolve ttd-dr URL"
  fi
fi

# ---------------------------------------------------------------------------
# Rollback recipe (printed, not executed)
# ---------------------------------------------------------------------------
say ""
say "Rollback (manual — run only if post-deploy health fails):"
cat <<EOF
  # List recent revisions:
  gcloud run revisions list --service=<service-name> --region=$REGION --project=$GCP_PROJECT

  # Shift 100% traffic back to the prior revision:
  gcloud run services update-traffic <service-name> \\
    --to-revisions=<prev-revision>=100 --region=$REGION --project=$GCP_PROJECT
EOF

ok "Phase-1 deploy complete"
