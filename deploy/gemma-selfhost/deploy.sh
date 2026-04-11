#!/usr/bin/env bash
#
# deploy.sh — Deploy Gemma 4 26B (A4B-IT) on Vertex AI Model Garden
#
# GCP Project : ai-managed-services
# Region      : us-central1
# Machine     : g2-standard-12 (1x NVIDIA L4 24 GB)
#
# This script is NOT auto-run. Execute manually after reviewing.
#
# Prerequisites:
#   - gcloud CLI authenticated (`gcloud auth login`)
#   - Project set (`gcloud config set project ai-managed-services`)
#   - Vertex AI API enabled
#   - Sufficient GPU quota in us-central1
#
# Usage:
#   chmod +x deploy.sh
#   ./deploy.sh
#
set -euo pipefail

# ── Configuration ──────────────────────────────────────────────────
PROJECT_ID="ai-managed-services"
REGION="us-central1"
MODEL_DISPLAY_NAME="gemma-4-26b-a4b-it"
ENDPOINT_DISPLAY_NAME="gemma-4-26b-endpoint"
MACHINE_TYPE="g2-standard-12"        # 12 vCPUs, 48 GB RAM, 1x L4 GPU
ACCELERATOR_TYPE="NVIDIA_L4"
ACCELERATOR_COUNT=1
MIN_REPLICA_COUNT=1                   # Set to 0 for scale-to-zero (saves cost)
MAX_REPLICA_COUNT=1                   # Scale up if needed

# ── Step 0: Verify project and enable APIs ─────────────────────────
echo "==> Setting GCP project to ${PROJECT_ID}"
gcloud config set project "${PROJECT_ID}"

echo "==> Enabling required APIs..."
gcloud services enable aiplatform.googleapis.com
gcloud services enable compute.googleapis.com

# ── Step 1: Create a Vertex AI endpoint ────────────────────────────
# The endpoint is the serving URL that the client connects to.
echo "==> Creating Vertex AI endpoint: ${ENDPOINT_DISPLAY_NAME}"
ENDPOINT_ID=$(gcloud ai endpoints create \
  --region="${REGION}" \
  --display-name="${ENDPOINT_DISPLAY_NAME}" \
  --format="value(name)" \
  2>&1 | tail -1)

# Extract just the numeric endpoint ID from the full resource name
ENDPOINT_NUM=$(echo "${ENDPOINT_ID}" | grep -oE '[0-9]+$')
echo "    Endpoint ID: ${ENDPOINT_NUM}"

# ── Step 2: Upload the model from Model Garden ────────────────────
# Gemma 4 26B is available in Vertex AI Model Garden.
# This registers it as a deployable model resource.
echo "==> Uploading model: ${MODEL_DISPLAY_NAME}"
MODEL_ID=$(gcloud ai models upload \
  --region="${REGION}" \
  --display-name="${MODEL_DISPLAY_NAME}" \
  --container-image-uri="us-docker.pkg.dev/vertex-ai/prediction/text-generation-server:latest" \
  --artifact-uri="gs://vertex-ai-model-garden-public-us/${MODEL_DISPLAY_NAME}" \
  --format="value(name)" \
  2>&1 | tail -1)

MODEL_NUM=$(echo "${MODEL_ID}" | grep -oE '[0-9]+$')
echo "    Model ID: ${MODEL_NUM}"

# ── Step 3: Deploy model to the endpoint ──────────────────────────
# This provisions the GPU machine and starts serving predictions.
# Takes 10-20 minutes for GPU allocation.
echo "==> Deploying model to endpoint (this may take 10-20 minutes)..."
gcloud ai endpoints deploy-model "${ENDPOINT_NUM}" \
  --region="${REGION}" \
  --model="${MODEL_NUM}" \
  --display-name="${MODEL_DISPLAY_NAME}-deployed" \
  --machine-type="${MACHINE_TYPE}" \
  --accelerator-type="${ACCELERATOR_TYPE}" \
  --accelerator-count="${ACCELERATOR_COUNT}" \
  --min-replica-count="${MIN_REPLICA_COUNT}" \
  --max-replica-count="${MAX_REPLICA_COUNT}" \
  --traffic-split="0=100"

# ── Step 4: Output the endpoint URL ───────────────────────────────
ENDPOINT_URL="https://${REGION}-aiplatform.googleapis.com/v1/projects/${PROJECT_ID}/locations/${REGION}/endpoints/${ENDPOINT_NUM}:predict"

echo ""
echo "============================================================"
echo "  Deployment complete!"
echo ""
echo "  Endpoint URL (set as GEMMA_ENDPOINT env var):"
echo "  ${ENDPOINT_URL}"
echo ""
echo "  To test:"
echo "    curl -X POST ${ENDPOINT_URL} \\"
echo "      -H 'Authorization: Bearer \$(gcloud auth print-access-token)' \\"
echo "      -H 'Content-Type: application/json' \\"
echo "      -d '{\"instances\":[{\"prompt\":\"Hello, who are you?\"}],\"parameters\":{\"maxOutputTokens\":256}}'"
echo ""
echo "  To set on VPS:"
echo "    docker exec <container> sh -c 'export GEMMA_ENDPOINT=\"${ENDPOINT_URL}\"'"
echo ""
echo "  To tear down (stop billing):"
echo "    gcloud ai endpoints undeploy-model ${ENDPOINT_NUM} --region=${REGION} --deployed-model-id=\$(gcloud ai endpoints describe ${ENDPOINT_NUM} --region=${REGION} --format='value(deployedModels[0].id)')"
echo "    gcloud ai endpoints delete ${ENDPOINT_NUM} --region=${REGION}"
echo "    gcloud ai models delete ${MODEL_NUM} --region=${REGION}"
echo "============================================================"
