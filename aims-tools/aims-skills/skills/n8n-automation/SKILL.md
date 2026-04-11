# n8n Automation Skill — SME_Ang

## Overview

Self-hosted n8n on vps2 (srv1328075, port 5678, unlimited runs, $0 cost). This is the UNLIMITED automation driver for the ACHIEVEMOR ecosystem. Paperform handles billing only (200 calls/mo). n8n handles EVERYTHING else.

## Instance

- **Host:** vps2 (srv1328075.hstgr.cloud, IP 76.13.96.107)
- **Port:** 5678
- **Access:** `ssh root@76.13.96.107` → `http://localhost:5678`
- **Container:** Docker, name `n8n`, always running
- **Storage:** Persistent volume, survives restarts

## When to Use n8n vs Paperform

| Use Case | Tool | Why |
|----------|------|-----|
| Payment processing | Paperform | Stripe integration built-in |
| Plan upgrades | Paperform | Billing event → webhook |
| Content distribution | n8n | Unlimited runs, scheduling |
| RSS monitoring | n8n | Scheduled triggers, free |
| Social posting | n8n | OAuth + scheduling |
| Lead processing | n8n | Form trigger + logic |
| Data pipeline | n8n | HTTP + code nodes |
| Scrape scheduling | n8n | Cron triggers |
| Email automation | n8n | Gmail integration |
| Notification dispatch | n8n | Multi-channel (Slack, Telegram, email) |

## Core Node Types (from 36 templates)

### Triggers (how workflows start)
| Node | Purpose |
|------|---------|
| `scheduleTrigger` | Cron/interval-based (every 15min, daily, weekly) |
| `webhook` | External HTTP POST triggers workflow |
| `formTrigger` | n8n-hosted form submission |
| `gmailTrigger` | New email arrives |
| `telegramTrigger` | Telegram bot message |
| `googleSheetsTrigger` | Sheet row added/changed |
| `googleDriveTrigger` | File uploaded to Drive |
| `manualTrigger` | Click to run manually |
| `chatTrigger` | AI chat interface trigger |
| `errorTrigger` | Another workflow fails |

### AI Nodes
| Node | Purpose |
|------|---------|
| `agent` | AI agent with tools (LangChain-style) |
| `lmChatGoogleGemini` | Gemini LLM calls |
| `lmChatOpenRouter` | OpenRouter multi-model |
| `lmChatOpenAi` | OpenAI calls |
| `lmChatAnthropic` | Claude calls |
| `outputParserStructured` | Force JSON output from LLM |
| `textClassifier` | Categorize text |
| `guardrails` | Input/output validation on AI |

### Data & Integration
| Node | Purpose |
|------|---------|
| `httpRequest` | Call any API |
| `googleSheets` | Read/write spreadsheets |
| `gmail` | Send email |
| `telegram` | Send Telegram messages |
| `slack` | Send Slack messages |
| `discord` | Send Discord messages |
| `elevenLabs` | TTS voice generation |
| `youTube` | YouTube API operations |
| `airtable` | Airtable CRUD |
| `supabase` | Supabase/Postgres queries |

### Logic & Transform
| Node | Purpose |
|------|---------|
| `if` | Conditional branching |
| `switch` | Multi-path routing |
| `code` | Custom JavaScript/Python |
| `set` | Set/transform fields |
| `merge` | Combine data streams |
| `splitInBatches` | Process items in chunks |
| `filter` | Filter items by condition |
| `aggregate` | Combine items into one |
| `wait` | Pause execution (timed delay) |

### Vector/RAG
| Node | Purpose |
|------|---------|
| `vectorStorePinecone` | Pinecone vector ops |
| `vectorStoreSupabase` | Supabase pgvector ops |
| `embeddingsOpenAi` | Generate embeddings |
| `textSplitterRecursiveCharacterTextSplitter` | Chunk text for RAG |

## Workflow Templates Available

36 pre-built templates in `~/iCloudDrive/ACHIEVEMOR_/n8n docs/`:

### High Priority for Per|Form
| Template | Use Case |
|----------|----------|
| `Voice Workflows.json` | ElevenLabs TTS automation for podcast episodes |
| `YouTube_Strategist.json` | YouTube content scheduling + analytics |
| `Faceless_Shorts_System.json` | Auto-generate short-form video content |
| `AI Newsletter System.json` | Automated newsletter from War Room data |
| `UGC Ads Veo & Sora.json` | Video ad generation pipeline |
| `Twitter_X_Scraper.json` | Social monitoring for sports news |

### Operational
| Template | Use Case |
|----------|----------|
| `17 Nodes to Master.json` | Reference: all core node patterns |
| `5 Error Handling Techniques.json` | Error handling patterns |
| `Guardrails (1).json` | AI guardrail patterns |
| `Parallelization.json` | Parallel execution patterns |

### Agent Patterns
| Template | Use Case |
|----------|----------|
| `Agent Swarm.json` | Multi-agent coordination |
| `Technical_Analyst_Agent.json` | Data analysis agent |
| `Ultimate_Personal_Assistant (1).json` | Full assistant with tools |
| `Voice_RAG_Agent.json` | Voice-enabled RAG agent |

## Creating a Workflow

### Via n8n UI
1. SSH tunnel: `ssh -L 5678:localhost:5678 root@76.13.96.107`
2. Open `http://localhost:5678` in browser
3. Import template JSON or build from scratch

### Via API
```bash
# Create workflow
curl -X POST http://localhost:5678/api/v1/workflows \
  -H "Content-Type: application/json" \
  -d @workflow.json

# Activate workflow
curl -X PATCH http://localhost:5678/api/v1/workflows/{id}/activate

# List workflows
curl http://localhost:5678/api/v1/workflows

# Execute manually
curl -X POST http://localhost:5678/api/v1/workflows/{id}/run
```

### Import Template
```bash
# Copy template to vps2 and import
scp "template.json" root@76.13.96.107:/tmp/
ssh root@76.13.96.107 "curl -X POST http://localhost:5678/api/v1/workflows -H 'Content-Type: application/json' -d @/tmp/template.json"
```

## Per|Form Webhook Endpoints (n8n targets)

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/podcasters/upgrade-plan` | POST | webhook_secret | Plan tier upgrade |
| `/api/webhooks/stepper` | POST | WEBHOOK_SECRET | Stepper automation |
| `/api/pipeline/run` | POST | PIPELINE_AUTH_KEY | Data pipeline trigger |
| `/api/podcast/generate` | POST | PIPELINE_AUTH_KEY | Podcast generation |

## Example: Sports News Monitor Workflow

```json
{
  "name": "Per|Form News Monitor",
  "nodes": [
    {
      "type": "n8n-nodes-base.scheduleTrigger",
      "parameters": { "rule": { "interval": [{ "field": "minutes", "minutesInterval": 15 }] } }
    },
    {
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "POST",
        "url": "https://perform.foai.cloud/api/pipeline/run",
        "headers": { "Authorization": "Bearer {{$env.PIPELINE_AUTH_KEY}}" }
      }
    }
  ]
}
```

## Security

- n8n API is localhost-only (not exposed to internet)
- Access via SSH tunnel only
- Workflow secrets stored in n8n credential store
- Webhook endpoints validate secrets via timing-safe comparison
- No credentials in workflow JSON files

## Responsibilities

- **SME_Ang** owns n8n workflow design and maintenance
- **Chicken Hawk** dispatches n8n-triggered scrape missions
- **Ops_Ang** monitors n8n health and workflow success rates
- **ACHEEVY** approves new workflow creation above threshold
