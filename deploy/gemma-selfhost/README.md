# Gemma Self-Host on Vertex AI

Deploys Gemma 4 26B (A4B-IT) to a dedicated Vertex AI endpoint in the `ai-managed-services` GCP project. Replaces the unreliable OpenRouter path with a self-hosted instance under our full control.

## What It Deploys

- **Model**: Gemma 4 26B A4B-IT (from Vertex AI Model Garden)
- **Machine**: `g2-standard-12` — 12 vCPUs, 48 GB RAM, 1x NVIDIA L4 (24 GB VRAM)
- **Region**: `us-central1`
- **Endpoint**: Vertex AI prediction endpoint (REST API with IAM auth)

## How to Deploy

```bash
# 1. Authenticate
gcloud auth login
gcloud config set project ai-managed-services

# 2. Run the script
chmod +x deploy.sh
./deploy.sh
```

The script takes 10-20 minutes (GPU allocation). It prints the endpoint URL on completion.

## Setting GEMMA_ENDPOINT

After deployment, set the env var on the VPS container:

```bash
# SSH to VPS
ssh myclaw-vps

# Set in the running container
docker exec <container-name> sh -c 'export GEMMA_ENDPOINT="https://us-central1-aiplatform.googleapis.com/v1/projects/ai-managed-services/locations/us-central1/endpoints/<ENDPOINT_ID>:predict"'

# Or add to container env in docker-compose / Cloud Run config for persistence
```

The client module at `cti-hub/src/lib/ai/gemma-selfhost.ts` reads this env var automatically.

## Estimated Cost

| Resource | Cost |
|----------|------|
| g2-standard-12 (1x L4) | ~$1.40/hr (~$1,008/mo if 24/7) |
| Scale-to-zero option | Set `MIN_REPLICA_COUNT=0` in deploy.sh — $0 when idle |

**Recommendation**: Use `MIN_REPLICA_COUNT=0` during development. Cold start is ~2-3 minutes but eliminates idle cost. Set to 1 for production workloads that need low latency.

## Teardown

```bash
# Get the endpoint and model IDs from the deploy output, then:
ENDPOINT_ID=<your-endpoint-id>
MODEL_ID=<your-model-id>
REGION=us-central1

# Undeploy model (stops GPU billing)
DEPLOYED_MODEL_ID=$(gcloud ai endpoints describe $ENDPOINT_ID --region=$REGION --format='value(deployedModels[0].id)')
gcloud ai endpoints undeploy-model $ENDPOINT_ID --region=$REGION --deployed-model-id=$DEPLOYED_MODEL_ID

# Delete endpoint and model resources
gcloud ai endpoints delete $ENDPOINT_ID --region=$REGION
gcloud ai models delete $MODEL_ID --region=$REGION
```
