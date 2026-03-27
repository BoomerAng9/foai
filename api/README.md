# Money Engine API

FastAPI backend for the FOAI-AIMS CTI Nerve Center revenue engine.
Deployed to GCP Cloud Run in `foai-aims` project.

## Endpoints

### MindEdge Link Manager (`/links`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/links/{category}` | Active Buy Now links + auto UTM |
| POST | `/links/create` | Add a new affiliate link |
| GET | `/links/campaign/{id}/stats` | Click & conversion stats |

### Open Seat Scraper (`/scrape`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/scrape/trigger` | Launch Firecrawl scan |

**Targets:** Savannah State, SCAD, Armstrong, Georgia Southern, Savannah Tech

### Agent Status (`/agent`)
| Method | Path | Description |
|--------|------|-------------|
| POST | `/agent/status` | Write agent heartbeat |

### Health
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health check |

## Firestore Collections

```
agents/{tenant_id}/{agentName}/status
  → name, status, currentTask, lastUpdated

enrollments/{tenant_id}/{id}
  → sku, course, revenue, source_utm, timestamp

openSeats/{tenant_id}/items/{id}
  → institution, course_name, seats_remaining, price, contact_email, scraped_at

links/{tenant_id}/items/{id}
  → category, base_url, tagged_url, sku, course_name, active, created_at

campaigns/{tenant_id}/items/{id}
  → clicks, conversions, revenue

scrapeJobs/{tenant_id}/jobs/{id}
  → institution, status, queued_at
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GCP_PROJECT` | Yes | `foai-aims` | GCP project ID |
| `DEFAULT_TENANT` | Yes | `cti` | Default tenant for CTI operations |
| `GUARDANG_URL` | Yes | `https://nemoclaw-service-...run.app` | NemoClaw enforcement endpoint |
| `PORT` | No | `8080` | Server port (Cloud Run sets this) |

## Secrets (GCP Secret Manager)

| Secret ID | Used By | Purpose |
|-----------|---------|---------|
| `firecrawl-api-key` | Open Seat Scraper | Firecrawl API authentication |

**All secrets are fetched at runtime from GCP Secret Manager. Nothing is hardcoded.**

## Deploy

```bash
# Manual deploy
cd api
gcloud builds submit --config=../deploy/cloudbuild.yaml ..

# Or direct Cloud Run deploy
gcloud run deploy money-engine \
  --source=./api \
  --project=foai-aims \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="GCP_PROJECT=foai-aims,DEFAULT_TENANT=cti,GUARDANG_URL=https://nemoclaw-service-939270059361.us-central1.run.app"
```

## Architecture

All requests pass through **GuardAng (NemoClaw)** middleware for tenant boundary enforcement.
Fail-closed: if GuardAng is unreachable, all requests are denied (503).
