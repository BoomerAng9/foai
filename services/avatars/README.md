# Avatars Service

Cloud Run port of the `deploy-avatars` Cloudflare Worker (retired 2026-04-15).

## Routes

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/avatars/upload` | Multipart avatar upload → resize → moderate → GCS → Supabase profile |
| POST | `/api/avatars/moderate` | Base64 image → Vertex AI SafeSearch → JSON result |
| GET | `/health` | Service heartbeat |

## Stack

- **Runtime**: Node 20 + Hono (ESM)
- **Image processing**: `sharp` (256×256 webp, `fit: cover` with attention-based cropping)
- **Storage**: Google Cloud Storage (replaces Cloudflare R2)
- **Moderation**: Vertex AI `safeSearchDetection` (replaces Workers AI `@cf/microsoft/resnet-50`). Rejects when adult/violence/racy likelihood ≥ `LIKELY`
- **Session cache**: in-memory LRU with 1h sliding window (replaces Workers KV). Cloud Run instances are ephemeral, so cache is warm-per-instance; Supabase is the source of truth
- **DB**: Supabase REST (unchanged from Worker)

## Env vars (set via Cloud Run)

| Var | Purpose |
|-----|---------|
| `GCS_AVATAR_BUCKET` | Bucket name (e.g. `foai-avatars`) |
| `GCS_PUBLIC_URL` | Public URL base (e.g. `https://storage.googleapis.com/foai-avatars`) |
| `SUPABASE_URL` | Supabase project URL (from Secret Manager) |
| `SUPABASE_SERVICE_KEY` | Service role key (from Secret Manager) |

## Deploy

```bash
gcloud builds submit --config services/avatars/cloudbuild.yaml
```

After first deploy: create the GCS bucket + Artifact Registry repo, and upload the two Supabase secrets to Secret Manager:

```bash
gcloud storage buckets create gs://foai-avatars --project=foai-aims --location=us-central1
gcloud artifacts repositories create avatars --repository-format=docker --location=us-central1 --project=foai-aims
gcloud secrets create SUPABASE_URL --replication-policy=automatic --project=foai-aims
gcloud secrets create SUPABASE_SERVICE_KEY --replication-policy=automatic --project=foai-aims
# then: echo -n "$VALUE" | gcloud secrets versions add <name> --data-file=-
```

## DNS cutover

Point `api.deploy.foai.cloud/api/avatars/*` (or wherever the Worker was routed) to the Cloud Run service URL. The Worker can be deleted once traffic has moved.

## Dev

```bash
npm install
npm run dev
```
