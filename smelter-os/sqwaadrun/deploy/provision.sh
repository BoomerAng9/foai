#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════
#  Sqwaadrun GCE provisioning script
# ═══════════════════════════════════════════════════════════════════
#  Idempotent. Re-run safely. Provisions:
#    - GCE e2-small VM in foai-aims
#    - Artifact Registry repo for the gateway image
#    - Cloud Build trigger for image publish
#    - Cloud IAP TCP tunnel firewall rule (private access only)
#    - Secret Manager bindings for NEON_INGEST_DSN + SQWAADRUN_API_KEY
#
#  Prereqs:
#    gcloud auth login
#    gcloud config set project foai-aims
#    Secrets created: NEON_INGEST_DSN, SQWAADRUN_API_KEY
#
#  Run:
#    chmod +x provision.sh
#    ./provision.sh
# ═══════════════════════════════════════════════════════════════════

set -euo pipefail

PROJECT=${PROJECT:-foai-aims}
REGION=${REGION:-us-east4}
ZONE=${ZONE:-us-east4-a}
VM_NAME=${VM_NAME:-sqwaadrun-vm}
MACHINE=${MACHINE:-e2-small}
SA_NAME=${SA_NAME:-sqwaadrun-runner}
REPO=${REPO:-sqwaadrun}
IMAGE_TAG=${IMAGE_TAG:-latest}

echo "═══ Sqwaadrun provisioning ═══"
echo "  project: $PROJECT"
echo "  region:  $REGION / $ZONE"
echo "  vm:      $VM_NAME ($MACHINE)"
echo

# ─── 1. Enable APIs ──────────────────────────────────────────────────
echo "[1/7] Enabling required APIs..."
gcloud services enable \
  compute.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  secretmanager.googleapis.com \
  iap.googleapis.com \
  --project="$PROJECT"

# ─── 2. Service account for the VM ───────────────────────────────────
echo "[2/7] Service account..."
if ! gcloud iam service-accounts describe "${SA_NAME}@${PROJECT}.iam.gserviceaccount.com" \
     --project="$PROJECT" &>/dev/null; then
  gcloud iam service-accounts create "$SA_NAME" \
    --display-name="Sqwaadrun Gateway Runner" \
    --project="$PROJECT"
fi

SA_EMAIL="${SA_NAME}@${PROJECT}.iam.gserviceaccount.com"

# Grant secret access — PUTER_API_KEY added per storage wiring directive
for SECRET in NEON_INGEST_DSN NEON_DATABASE_URL SQWAADRUN_API_KEY PUTER_API_KEY; do
  if gcloud secrets describe "$SECRET" --project="$PROJECT" &>/dev/null; then
    gcloud secrets add-iam-policy-binding "$SECRET" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/secretmanager.secretAccessor" \
      --project="$PROJECT" >/dev/null
  else
    echo "  WARN: secret $SECRET does not exist — create it before running the gateway"
  fi
done

# Storage buckets access — needed for the Sqwaadrun gateway to write
# to GCS from the VM's attached service account
for BUCKET in foai-sqwaadrun-artifacts foai-ingots foai-media foai-backups; do
  if gcloud storage buckets describe "gs://${BUCKET}" --project="$PROJECT" &>/dev/null; then
    gcloud storage buckets add-iam-policy-binding "gs://${BUCKET}" \
      --member="serviceAccount:${SA_EMAIL}" \
      --role="roles/storage.objectAdmin" \
      --project="$PROJECT" >/dev/null 2>&1 || true
  else
    echo "  WARN: bucket gs://${BUCKET} does not exist — run deploy/create-gcs-buckets.sh first"
  fi
done

# Artifact registry pull
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/artifactregistry.reader" >/dev/null

# Logging + monitoring
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/logging.logWriter" >/dev/null
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:${SA_EMAIL}" \
  --role="roles/monitoring.metricWriter" >/dev/null

# ─── 3. Artifact Registry repo ───────────────────────────────────────
echo "[3/7] Artifact Registry repo..."
if ! gcloud artifacts repositories describe "$REPO" \
     --location="$REGION" --project="$PROJECT" &>/dev/null; then
  gcloud artifacts repositories create "$REPO" \
    --repository-format=docker \
    --location="$REGION" \
    --description="Sqwaadrun gateway images" \
    --project="$PROJECT"
fi

IMAGE_URI="${REGION}-docker.pkg.dev/${PROJECT}/${REPO}/gateway:${IMAGE_TAG}"
echo "  image: $IMAGE_URI"

# ─── 4. Build + push image ───────────────────────────────────────────
echo "[4/7] Building and pushing image (cloud build)..."
gcloud builds submit . \
  --tag="$IMAGE_URI" \
  --project="$PROJECT" \
  --region="$REGION"

# ─── 5. VM instance ──────────────────────────────────────────────────
echo "[5/7] Creating / updating VM..."
if ! gcloud compute instances describe "$VM_NAME" \
     --zone="$ZONE" --project="$PROJECT" &>/dev/null; then
  gcloud compute instances create "$VM_NAME" \
    --zone="$ZONE" \
    --machine-type="$MACHINE" \
    --image-family=cos-stable \
    --image-project=cos-cloud \
    --boot-disk-size=20GB \
    --boot-disk-type=pd-balanced \
    --service-account="$SA_EMAIL" \
    --scopes=cloud-platform \
    --no-address \
    --tags=sqwaadrun-gateway,iap-allow \
    --metadata-from-file=startup-script=deploy/startup.sh \
    --project="$PROJECT"
else
  echo "  VM already exists. Updating startup-script + restarting docker..."
  gcloud compute instances add-metadata "$VM_NAME" \
    --zone="$ZONE" \
    --metadata-from-file=startup-script=deploy/startup.sh \
    --project="$PROJECT"
  gcloud compute instances reset "$VM_NAME" \
    --zone="$ZONE" --project="$PROJECT"
fi

# ─── 6. Firewall — Cloud IAP TCP tunnel only ────────────────────────
echo "[6/7] Firewall rule for IAP TCP tunnel..."
if ! gcloud compute firewall-rules describe sqwaadrun-iap \
     --project="$PROJECT" &>/dev/null; then
  gcloud compute firewall-rules create sqwaadrun-iap \
    --direction=INGRESS \
    --action=ALLOW \
    --rules=tcp:7700 \
    --source-ranges=35.235.240.0/20 \
    --target-tags=sqwaadrun-gateway \
    --description="Cloud IAP TCP tunnel access to Sqwaadrun gateway" \
    --project="$PROJECT"
fi

# ─── 7. Health check via IAP tunnel ──────────────────────────────────
echo "[7/7] Waiting for gateway to come up..."
sleep 25
if gcloud compute start-iap-tunnel "$VM_NAME" 7700 \
     --local-host-port=localhost:17700 \
     --zone="$ZONE" --project="$PROJECT" &
then
  TUNNEL_PID=$!
  sleep 5
  if curl -fsS http://localhost:17700/health; then
    echo "  Gateway healthy"
  else
    echo "  Gateway not yet healthy — check VM logs:"
    echo "  gcloud compute ssh $VM_NAME --zone=$ZONE --project=$PROJECT --tunnel-through-iap -- 'docker logs sqwaadrun-gateway'"
  fi
  kill $TUNNEL_PID 2>/dev/null || true
fi

echo
echo "═══ Provisioning complete ═══"
echo
echo "Reach the gateway from your laptop:"
echo "  gcloud compute start-iap-tunnel $VM_NAME 7700 \\"
echo "    --local-host-port=localhost:7700 \\"
echo "    --zone=$ZONE --project=$PROJECT"
echo
echo "Then point cti-hub at it:"
echo "  SQWAADRUN_GATEWAY_URL=http://localhost:7700"
