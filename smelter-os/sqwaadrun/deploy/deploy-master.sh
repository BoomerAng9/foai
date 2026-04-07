#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════
#  Sqwaadrun MASTER DEPLOY — one command, all 9 steps, idempotent
# ═══════════════════════════════════════════════════════════════════════
#
# Runs the complete Sqwaadrun Backend Wiring sequence in order:
#
#   0. Deploy Puter container on Hostinger VPS
#   1. Create 4 GCS buckets in foai-aims
#   2. Apply Neon migrations (staging schema + profile columns)
#   3. Create Stripe products + 3 prices + Deploy discount coupon
#   4. Create Secret Manager secrets
#   5. Provision sqwaadrun-vm (GCE e2-small, IAP-gated)
#   6. Set cti-hub env vars on myclaw-vps
#   7. Redeploy cti-hub container
#   8. DNS + Traefik for sqwaadrun.foai.cloud (manual — instructions only)
#   9. Verify every layer is connected and responding
#
# Idempotency:
#   - State file at ~/.sqwaadrun-deploy-state — re-runs skip done steps
#   - GCS bucket script is idempotent on its own
#   - Neon DDL uses IF NOT EXISTS + CREATE OR REPLACE
#   - Stripe uses Idempotency-Key headers so re-runs return the same IDs
#   - Secret Manager adds new versions instead of recreating
#   - GCE provisioner only creates the VM if it doesn't already exist
#
# Usage:
#   cp deploy/.sqwaadrun-deploy.env.example ~/.sqwaadrun-deploy.env
#   # edit with your real values
#   ./deploy/deploy-master.sh                 # run everything
#   ./deploy/deploy-master.sh --step 3        # just Stripe
#   ./deploy/deploy-master.sh --from 5        # resume from VM provision
#   ./deploy/deploy-master.sh --verify        # verification only
#   ./deploy/deploy-master.sh --reset         # clear state and re-run
#   ./deploy/deploy-master.sh --help
#
# ═══════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Paths ───
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQWAADRUN_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_ROOT="$(cd "$SQWAADRUN_DIR/../.." && pwd)"
STATE_FILE="${SQWAADRUN_DEPLOY_STATE:-$HOME/.sqwaadrun-deploy-state}"
ENV_FILE="${SQWAADRUN_DEPLOY_ENV:-$HOME/.sqwaadrun-deploy.env}"
STRIPE_IDS_FILE="$HOME/.sqwaadrun-stripe-ids.env"

# ─── Colors ───
if [ -t 1 ]; then
  RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'
  BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
else
  RED=''; GREEN=''; YELLOW=''; BLUE=''; CYAN=''; BOLD=''; NC=''
fi

log_header() { printf "\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n${BOLD}${CYAN} %s${NC}\n${BOLD}${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n" "$1"; }
log_step()   { printf "\n${BOLD}${CYAN}━━━ STEP %s — %s ━━━${NC}\n" "$1" "$2"; }
log_info()   { printf "  ${BLUE}ℹ${NC}  %s\n" "$1"; }
log_ok()     { printf "  ${GREEN}✓${NC}  %s\n" "$1"; }
log_warn()   { printf "  ${YELLOW}⚠${NC}  %s\n" "$1"; }
log_err()    { printf "  ${RED}✗${NC}  %s\n" "$1" >&2; }
log_skip()   { printf "  ${YELLOW}→${NC}  %s ${YELLOW}(already done, use --reset or delete state line to re-run)${NC}\n" "$1"; }

# ─── State tracking ───
mark_done()   { touch "$STATE_FILE"; grep -qxF "$1" "$STATE_FILE" 2>/dev/null || echo "$1" >> "$STATE_FILE"; }
is_done()     { grep -qxF "$1" "$STATE_FILE" 2>/dev/null; }
reset_state() { rm -f "$STATE_FILE" "$STRIPE_IDS_FILE"; log_info "State cleared"; }

# ─── Required command check ───
check_cmd() { command -v "$1" &>/dev/null; }

preflight() {
  log_header "PREFLIGHT"
  local missing=0
  for cmd in gcloud gsutil psql docker ssh scp curl openssl jq sed awk; do
    if check_cmd "$cmd"; then
      log_ok "$cmd"
    else
      log_err "MISSING: $cmd"
      missing=$((missing + 1))
    fi
  done
  if [ "$missing" -gt 0 ]; then
    log_err "$missing tool(s) missing — install them and retry"
    exit 1
  fi
}

# ─── Env loading ───
load_env() {
  if [ -f "$ENV_FILE" ]; then
    log_info "Loading env from $ENV_FILE"
    set -a
    # shellcheck disable=SC1090
    source "$ENV_FILE"
    set +a
  else
    log_warn "No env file at $ENV_FILE — relying on exported vars"
  fi

  # Defaults
  export GCP_PROJECT="${GCP_PROJECT:-foai-aims}"
  export GCP_REGION="${GCP_REGION:-us-east4}"
  export GCP_ZONE="${GCP_ZONE:-us-east4-a}"
  export CTI_HUB_PATH="${CTI_HUB_PATH:-/opt/cti-hub}"

  # Generate secrets if not provided
  if [ -z "${SQWAADRUN_API_KEY:-}" ]; then
    export SQWAADRUN_API_KEY="$(openssl rand -hex 32)"
    log_info "Generated SQWAADRUN_API_KEY (32-byte hex)"
  fi
  if [ -z "${PUTER_API_KEY:-}" ]; then
    export PUTER_API_KEY="$(openssl rand -hex 32)"
    log_info "Generated PUTER_API_KEY (32-byte hex)"
  fi
}

require_env() {
  local name="$1"
  local hint="${2:-}"
  if [ -z "${!name:-}" ]; then
    log_err "$name not set${hint:+ — $hint}"
    return 1
  fi
  return 0
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 0 — Deploy Puter on Hostinger VPS
# ═════════════════════════════════════════════════════════════════════════
step_0_puter() {
  log_step "0" "Deploy Puter on Hostinger VPS"

  if is_done "step_0_puter"; then log_skip "Puter already deployed"; return 0; fi

  require_env HOSTINGER_SSH_HOST "set HOSTINGER_SSH_HOST=user@host in env" || return 1

  log_info "Ensuring /opt/smelter/ on $HOSTINGER_SSH_HOST"
  ssh -o BatchMode=yes "$HOSTINGER_SSH_HOST" "mkdir -p /opt/smelter" || {
    log_err "SSH to $HOSTINGER_SSH_HOST failed — check key + host"
    return 1
  }

  log_info "Copying docker-compose.puter.yml"
  scp -o BatchMode=yes "$REPO_ROOT/smelter-os/docker-compose.puter.yml" \
    "$HOSTINGER_SSH_HOST:/opt/smelter/docker-compose.puter.yml"

  log_info "Ensuring smelter-net Docker network"
  ssh "$HOSTINGER_SSH_HOST" 'docker network inspect smelter-net >/dev/null 2>&1 || docker network create smelter-net'

  log_info "Starting Puter container"
  ssh "$HOSTINGER_SSH_HOST" "cd /opt/smelter && PUTER_API_KEY='$PUTER_API_KEY' docker compose -f docker-compose.puter.yml up -d"

  log_info "Waiting for Puter health (up to 90s)..."
  local attempts=0
  while [ $attempts -lt 45 ]; do
    if ssh "$HOSTINGER_SSH_HOST" 'curl -fsS http://localhost:4100/status' &>/dev/null; then
      log_ok "Puter online"
      mark_done "step_0_puter"
      return 0
    fi
    sleep 2
    attempts=$((attempts + 1))
  done

  log_err "Puter did not come online within 90s"
  log_info "Check logs: ssh $HOSTINGER_SSH_HOST 'docker logs smelter-puter'"
  return 1
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 1 — GCS buckets
# ═════════════════════════════════════════════════════════════════════════
step_1_gcs() {
  log_step "1" "Create GCS buckets in $GCP_PROJECT"

  if is_done "step_1_gcs"; then log_skip "GCS buckets already created"; return 0; fi

  if ! gcloud config get-value project 2>/dev/null | grep -qx "$GCP_PROJECT"; then
    log_info "Setting gcloud project to $GCP_PROJECT"
    gcloud config set project "$GCP_PROJECT" >/dev/null
  fi

  PROJECT="$GCP_PROJECT" LOCATION="$GCP_REGION" bash "$SCRIPT_DIR/create-gcs-buckets.sh"

  mark_done "step_1_gcs"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 2 — Neon migrations
# ═════════════════════════════════════════════════════════════════════════
step_2_neon() {
  log_step "2" "Apply Neon migrations"

  if is_done "step_2_neon"; then log_skip "Neon schema already applied"; return 0; fi

  require_env NEON_DATABASE_URL "Neon read/write DSN (public schema)" || return 1
  require_env NEON_INGEST_DSN   "Neon ingest DSN (sqwaadrun_staging write)" || return 1

  log_info "Applying cti-hub/sql/008_sqwaadrun_addon_neon.sql to public schema"
  psql "$NEON_DATABASE_URL" \
    -v ON_ERROR_STOP=1 \
    -f "$REPO_ROOT/cti-hub/sql/008_sqwaadrun_addon_neon.sql" \
    >/dev/null
  log_ok "profiles.sqwaadrun_* columns added + reset function created"

  log_info "Applying smelter-os/sqwaadrun/migrations/001_sqwaadrun_staging.sql"
  psql "$NEON_INGEST_DSN" \
    -v ON_ERROR_STOP=1 \
    -f "$SQWAADRUN_DIR/migrations/001_sqwaadrun_staging.sql" \
    >/dev/null
  log_ok "sqwaadrun_staging schema + promotion functions created"

  mark_done "step_2_neon"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 3 — Stripe products
# ═════════════════════════════════════════════════════════════════════════
stripe_api() {
  local method="$1"; shift
  local endpoint="$1"; shift
  curl -sS -X "$method" "https://api.stripe.com/v1/$endpoint" \
    -u "$STRIPE_SECRET_KEY:" \
    "$@"
}

create_stripe_product_with_price() {
  local slug="$1"
  local name="$2"
  local price_cents="$3"

  # Stripe Idempotency-Key ensures re-runs return the same object
  local idempotency_key_product="sqwaadrun_${slug}_product_v1"
  local idempotency_key_price="sqwaadrun_${slug}_price_v1"

  log_info "  Product: $name"
  local product_json
  product_json=$(stripe_api POST products \
    -H "Idempotency-Key: $idempotency_key_product" \
    -d "name=$name" \
    -d "metadata[sqwaadrun_tier]=$slug" \
    -d "metadata[source]=deploy-master.sh")

  local product_id
  product_id=$(echo "$product_json" | jq -r '.id // empty')
  if [ -z "$product_id" ]; then
    log_err "Product creation failed: $(echo "$product_json" | jq -r '.error.message // "unknown error"')"
    return 1
  fi
  log_ok "  Product: $product_id"

  log_info "  Price:   \$$((price_cents / 100))/mo"
  local price_json
  price_json=$(stripe_api POST prices \
    -H "Idempotency-Key: $idempotency_key_price" \
    -d "product=$product_id" \
    -d "unit_amount=$price_cents" \
    -d "currency=usd" \
    -d "recurring[interval]=month" \
    -d "metadata[sqwaadrun_tier]=$slug")

  local price_id
  price_id=$(echo "$price_json" | jq -r '.id // empty')
  if [ -z "$price_id" ]; then
    log_err "Price creation failed: $(echo "$price_json" | jq -r '.error.message // "unknown error"')"
    return 1
  fi
  log_ok "  Price:   $price_id"

  # Append to the Stripe IDs env file
  local env_key
  env_key="NEXT_PUBLIC_STRIPE_SQWAADRUN_$(echo "$slug" | tr '[:lower:]' '[:upper:]')_PRICE_ID"
  printf "%s=%s\n" "$env_key" "$price_id" >> "$STRIPE_IDS_FILE"
}

step_3_stripe() {
  log_step "3" "Create Stripe products + prices + discount coupon"

  if is_done "step_3_stripe"; then log_skip "Stripe products already created"; return 0; fi

  require_env STRIPE_SECRET_KEY "sk_live_... or sk_test_..." || return 1

  # Start fresh — Idempotency-Key makes re-runs safe, we want a clean file
  : > "$STRIPE_IDS_FILE"

  create_stripe_product_with_price "lil_hawk_solo"       "Sqwaadrun Lil_Hawk Solo"       1900
  create_stripe_product_with_price "sqwaad"              "Sqwaadrun Sqwaad"              7900
  create_stripe_product_with_price "sqwaadrun_commander" "Sqwaadrun Commander"           29900

  log_info "Deploy-customer 20% discount coupon"

  # Coupon idempotency via deterministic ID
  local coupon_id="sqwaadrun_deploy_20off"
  local coupon_check
  coupon_check=$(stripe_api GET "coupons/$coupon_id" 2>/dev/null || echo "{}")

  if echo "$coupon_check" | jq -e '.id' >/dev/null 2>&1; then
    log_ok "Coupon $coupon_id already exists"
  else
    local coupon_json
    coupon_json=$(stripe_api POST coupons \
      -d "id=$coupon_id" \
      -d "percent_off=20" \
      -d "duration=forever" \
      -d "name=Deploy Platform Customer — Sqwaadrun 20% off")
    if ! echo "$coupon_json" | jq -e '.id' >/dev/null 2>&1; then
      log_err "Coupon creation failed: $(echo "$coupon_json" | jq -r '.error.message // "unknown"')"
      return 1
    fi
    log_ok "Coupon $coupon_id created"
  fi

  printf "STRIPE_SQWAADRUN_DEPLOY_DISCOUNT_COUPON=%s\n" "$coupon_id" >> "$STRIPE_IDS_FILE"

  log_ok "Stripe env additions written to $STRIPE_IDS_FILE"
  log_info "Contents:"
  sed 's/^/    /' "$STRIPE_IDS_FILE"

  mark_done "step_3_stripe"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 4 — Secret Manager
# ═════════════════════════════════════════════════════════════════════════
create_or_version_secret() {
  local name="$1"
  local value="$2"
  if [ -z "$value" ]; then
    log_warn "$name value empty — skipping"
    return 0
  fi
  if gcloud secrets describe "$name" --project="$GCP_PROJECT" &>/dev/null; then
    log_info "$name exists — adding new version"
    printf "%s" "$value" | gcloud secrets versions add "$name" \
      --data-file=- --project="$GCP_PROJECT" >/dev/null
  else
    log_info "$name creating"
    printf "%s" "$value" | gcloud secrets create "$name" \
      --data-file=- --replication-policy=automatic --project="$GCP_PROJECT" >/dev/null
  fi
  log_ok "$name set"
}

step_4_secrets() {
  log_step "4" "Create / update Secret Manager secrets"

  if is_done "step_4_secrets"; then log_skip "Secrets already set"; return 0; fi

  require_env NEON_INGEST_DSN "Neon ingest DSN" || return 1
  require_env NEON_DATABASE_URL "Neon database URL" || return 1

  log_info "Enabling Secret Manager API (if not already)"
  gcloud services enable secretmanager.googleapis.com --project="$GCP_PROJECT" >/dev/null

  create_or_version_secret "SQWAADRUN_API_KEY" "$SQWAADRUN_API_KEY"
  create_or_version_secret "NEON_INGEST_DSN"   "$NEON_INGEST_DSN"
  create_or_version_secret "NEON_DATABASE_URL" "$NEON_DATABASE_URL"
  create_or_version_secret "PUTER_API_KEY"     "$PUTER_API_KEY"

  mark_done "step_4_secrets"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 5 — GCE VM
# ═════════════════════════════════════════════════════════════════════════
step_5_vm() {
  log_step "5" "Provision sqwaadrun-vm"

  if is_done "step_5_vm"; then log_skip "VM already provisioned"; return 0; fi

  (
    cd "$SQWAADRUN_DIR"
    PROJECT="$GCP_PROJECT" REGION="$GCP_REGION" ZONE="$GCP_ZONE" \
      bash "$SCRIPT_DIR/provision.sh"
  )

  mark_done "step_5_vm"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 6 — cti-hub env vars
# ═════════════════════════════════════════════════════════════════════════
step_6_env() {
  log_step "6" "Set cti-hub env vars on myclaw-vps"

  if is_done "step_6_env"; then log_skip "cti-hub env already updated"; return 0; fi

  require_env MYCLAW_SSH_HOST "user@myclaw-vps-ip" || return 1

  log_info "Looking up sqwaadrun-vm internal IP"
  local gateway_ip
  gateway_ip=$(gcloud compute instances describe sqwaadrun-vm \
    --zone="$GCP_ZONE" --project="$GCP_PROJECT" \
    --format='value(networkInterfaces[0].networkIP)' 2>/dev/null || true)

  if [ -z "$gateway_ip" ]; then
    log_warn "sqwaadrun-vm not found or no internal IP — using placeholder"
    gateway_ip="<fill-in-after-step-5>"
  else
    log_ok "Gateway IP: $gateway_ip"
  fi

  local stripe_env=""
  if [ -f "$STRIPE_IDS_FILE" ]; then
    stripe_env=$(cat "$STRIPE_IDS_FILE")
    log_ok "Pulled Stripe IDs from $STRIPE_IDS_FILE"
  else
    log_warn "No Stripe IDs file — run step 3 first or add price IDs manually"
  fi

  log_info "Building env block"
  local env_block
  env_block=$(cat <<EOF
# ─── Sqwaadrun (added by deploy-master.sh $(date -u +%Y-%m-%dT%H:%M:%SZ)) ───
SQWAADRUN_GATEWAY_URL=http://${gateway_ip}:7700
SQWAADRUN_API_KEY=${SQWAADRUN_API_KEY}
PUTER_BASE_URL=http://smelter-puter:4100
PUTER_API_KEY=${PUTER_API_KEY}
${stripe_env}
# ─── end sqwaadrun ───
EOF
)

  log_info "Appending to $CTI_HUB_PATH/.env on $MYCLAW_SSH_HOST"
  # Idempotent: strip any prior sqwaadrun block first, then append fresh
  # shellcheck disable=SC2087
  ssh "$MYCLAW_SSH_HOST" bash <<REMOTE
set -e
ENV_FILE="$CTI_HUB_PATH/.env"
if [ -f "\$ENV_FILE" ]; then
  # Remove any existing sqwaadrun block (from a previous run)
  sed -i.sqwaadrun-bak '/^# ─── Sqwaadrun/,/^# ─── end sqwaadrun ───/d' "\$ENV_FILE"
fi
cat >> "\$ENV_FILE" <<'ENVBLOCK'
$env_block
ENVBLOCK
chmod 600 "\$ENV_FILE"
echo "  → cti-hub .env updated"
REMOTE

  log_ok "Env block applied"
  mark_done "step_6_env"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 7 — cti-hub redeploy
# ═════════════════════════════════════════════════════════════════════════
step_7_redeploy() {
  log_step "7" "Redeploy cti-hub container"

  if is_done "step_7_redeploy"; then log_skip "cti-hub already redeployed"; return 0; fi

  require_env MYCLAW_SSH_HOST "user@myclaw-vps-ip" || return 1

  log_info "docker compose pull + up on $MYCLAW_SSH_HOST"
  ssh "$MYCLAW_SSH_HOST" "cd $CTI_HUB_PATH && docker compose pull cti-hub && docker compose up -d cti-hub"

  log_info "Waiting 15s for cti-hub to boot..."
  sleep 15

  if curl -fsS -o /dev/null https://deploy.foai.cloud/api/sqwaadrun/live; then
    log_ok "cti-hub deployed — /api/sqwaadrun/live reachable"
  else
    log_warn "cti-hub deployed but /api/sqwaadrun/live not responding yet"
    log_info "Check: ssh $MYCLAW_SSH_HOST 'docker logs cti-hub --tail=50'"
  fi

  mark_done "step_7_redeploy"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 8 — DNS + Traefik (manual)
# ═════════════════════════════════════════════════════════════════════════
step_8_dns() {
  log_step "8" "DNS + Traefik for sqwaadrun.foai.cloud (OPTIONAL, MANUAL)"

  if is_done "step_8_dns"; then log_skip "DNS already configured"; return 0; fi

  log_warn "This step is manual. Required actions:"
  log_info "1. Add DNS A record:"
  log_info "     sqwaadrun.foai.cloud → myclaw-vps public IP"
  log_info ""
  log_info "2. Apply Traefik labels per:"
  log_info "     $SCRIPT_DIR/TRAEFIK_SQWAADRUN_DOMAIN.md"
  log_info ""
  log_info "3. Mark done when complete:"
  log_info "     echo step_8_dns >> $STATE_FILE"
  log_info ""
  log_info "Skipping for now — /plug/sqwaadrun on deploy.foai.cloud is the canonical URL anyway"
}

# ═════════════════════════════════════════════════════════════════════════
#  STEP 9 — Verification
# ═════════════════════════════════════════════════════════════════════════
verify_check() {
  local label="$1"
  local cmd="$2"
  if eval "$cmd" &>/dev/null; then
    log_ok "$label"
    return 0
  else
    log_err "$label"
    return 1
  fi
}

step_9_verify() {
  log_step "9" "Verification — end-to-end"

  local fails=0

  # Puter
  if [ -n "${HOSTINGER_SSH_HOST:-}" ]; then
    verify_check "Puter /status" \
      "ssh -o BatchMode=yes $HOSTINGER_SSH_HOST 'curl -fsS http://localhost:4100/status'" \
      || fails=$((fails + 1))
  else
    log_warn "HOSTINGER_SSH_HOST not set — skipping Puter check"
  fi

  # GCS
  for bucket in foai-sqwaadrun-artifacts foai-ingots foai-media foai-backups; do
    verify_check "GCS bucket: $bucket" \
      "gcloud storage buckets describe gs://$bucket --project=$GCP_PROJECT" \
      || fails=$((fails + 1))
  done

  # Neon
  if [ -n "${NEON_INGEST_DSN:-}" ]; then
    verify_check "Neon: sqwaadrun_staging.mission_log exists" \
      "psql '$NEON_INGEST_DSN' -c \"SELECT to_regclass('sqwaadrun_staging.mission_log') IS NOT NULL\" | grep -q t" \
      || fails=$((fails + 1))
  else
    log_warn "NEON_INGEST_DSN not set — skipping staging check"
  fi

  if [ -n "${NEON_DATABASE_URL:-}" ]; then
    verify_check "Neon: profiles.sqwaadrun_tier column exists" \
      "psql '$NEON_DATABASE_URL' -c \"SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='sqwaadrun_tier'\" | grep -q sqwaadrun_tier" \
      || fails=$((fails + 1))
  else
    log_warn "NEON_DATABASE_URL not set — skipping profile check"
  fi

  # Secrets
  for secret in SQWAADRUN_API_KEY NEON_INGEST_DSN PUTER_API_KEY; do
    verify_check "Secret: $secret" \
      "gcloud secrets describe $secret --project=$GCP_PROJECT" \
      || fails=$((fails + 1))
  done

  # GCE VM
  verify_check "GCE VM: sqwaadrun-vm running" \
    "gcloud compute instances describe sqwaadrun-vm --zone=$GCP_ZONE --project=$GCP_PROJECT --format='value(status)' | grep -q RUNNING" \
    || fails=$((fails + 1))

  # cti-hub public endpoints
  verify_check "Public: /plug/sqwaadrun" \
    "curl -fsS -o /dev/null https://deploy.foai.cloud/plug/sqwaadrun" \
    || fails=$((fails + 1))

  verify_check "Public: /api/sqwaadrun/live" \
    "curl -fsS -o /dev/null https://deploy.foai.cloud/api/sqwaadrun/live" \
    || fails=$((fails + 1))

  echo
  if [ "$fails" -eq 0 ]; then
    log_header "✓ SQWAADRUN LIVE — ALL CHECKS PASSED"
    return 0
  else
    log_header "✗ $fails check(s) failed — fix and re-run --verify"
    return 1
  fi
}

# ═════════════════════════════════════════════════════════════════════════
#  MAIN DISPATCHER
# ═════════════════════════════════════════════════════════════════════════
usage() {
  cat <<USAGE
${BOLD}Sqwaadrun Master Deploy${NC}

Usage: $(basename "$0") [OPTIONS]

Options:
  --step N          Run only step N (0-9)
  --from N          Run from step N onwards (default: 0)
  --to N            Run up to and including step N (default: 8)
  --verify          Run verification step only (9)
  --reset           Clear state file and re-run everything
  --dry-run         Show what would run without executing
  --env FILE        Path to env file (default: ~/.sqwaadrun-deploy.env)
  --help, -h        Show this help

Steps:
  0  Deploy Puter container on Hostinger VPS
  1  Create 4 GCS buckets in foai-aims
  2  Apply Neon migrations (public + staging schemas)
  3  Create Stripe products (3 tiers + discount coupon)
  4  Create Secret Manager secrets
  5  Provision sqwaadrun-vm (GCE)
  6  Set cti-hub env vars on myclaw-vps
  7  Redeploy cti-hub container
  8  DNS + Traefik (manual instructions only)
  9  Verify everything is connected

State file: $STATE_FILE
Stripe IDs: $STRIPE_IDS_FILE
Env file:   $ENV_FILE

Required env vars (in env file or exported):
  HOSTINGER_SSH_HOST     user@hostinger-vps-ip
  MYCLAW_SSH_HOST        user@myclaw-vps-ip
  CTI_HUB_PATH           /opt/cti-hub (default)
  NEON_DATABASE_URL      postgresql://...@host.neon.tech/foai
  NEON_INGEST_DSN        postgresql://sqwaadrun_ingest:...@host.neon.tech/foai
  STRIPE_SECRET_KEY      sk_live_... or sk_test_...

Optional:
  GCP_PROJECT            foai-aims (default)
  GCP_REGION             us-east4 (default)
  GCP_ZONE               us-east4-a (default)
  SQWAADRUN_API_KEY      auto-generated if missing
  PUTER_API_KEY          auto-generated if missing

Example first run:
  cp deploy/.sqwaadrun-deploy.env.example ~/.sqwaadrun-deploy.env
  # edit with real values
  ./deploy/deploy-master.sh

Resume from a failed step:
  ./deploy/deploy-master.sh --from 5

Just verify:
  ./deploy/deploy-master.sh --verify
USAGE
}

main() {
  local only_step=""
  local from_step=0
  local to_step=8
  local verify_only=0
  local reset=0
  local dry_run=0

  while [ $# -gt 0 ]; do
    case "$1" in
      --step)    only_step="$2"; shift 2 ;;
      --from)    from_step="$2"; shift 2 ;;
      --to)      to_step="$2"; shift 2 ;;
      --verify)  verify_only=1; shift ;;
      --reset)   reset=1; shift ;;
      --dry-run) dry_run=1; shift ;;
      --env)     ENV_FILE="$2"; shift 2 ;;
      --help|-h) usage; exit 0 ;;
      *)         log_err "Unknown arg: $1"; echo; usage; exit 1 ;;
    esac
  done

  log_header "SQWAADRUN MASTER DEPLOY"

  [ "$reset" -eq 1 ] && reset_state

  preflight
  load_env

  printf "\n  ${BOLD}Project:${NC}  %s\n" "$GCP_PROJECT"
  printf "  ${BOLD}Zone:${NC}     %s\n" "$GCP_ZONE"
  printf "  ${BOLD}State:${NC}    %s\n" "$STATE_FILE"
  printf "  ${BOLD}Env:${NC}      %s\n" "$ENV_FILE"

  if [ "$verify_only" -eq 1 ]; then
    step_9_verify
    exit $?
  fi

  if [ -n "$only_step" ]; then
    from_step="$only_step"
    to_step="$only_step"
  fi

  if [ "$dry_run" -eq 1 ]; then
    log_info "DRY RUN — would execute steps $from_step through $to_step"
    exit 0
  fi

  for step in $(seq "$from_step" "$to_step"); do
    case "$step" in
      0) step_0_puter ;;
      1) step_1_gcs ;;
      2) step_2_neon ;;
      3) step_3_stripe ;;
      4) step_4_secrets ;;
      5) step_5_vm ;;
      6) step_6_env ;;
      7) step_7_redeploy ;;
      8) step_8_dns ;;
      *) log_err "Invalid step: $step"; exit 1 ;;
    esac
  done

  echo
  log_header "FINAL VERIFICATION"
  step_9_verify
}

main "$@"
