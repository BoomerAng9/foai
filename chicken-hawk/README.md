# Chicken Hawk 🦅

**Chicken Hawk** is a sovereign AI operations layer that turns one OpenClaw gateway into a **fleet** of coordinated specialist agents ("Lil_Hawks") running across Dockerized services. It gives you a single interface to orchestrate research, coding, integrations, and backend deployment — while keeping execution sandboxed and remotely manageable.

## What It Is

Chicken Hawk is a voice-first, vision-first AI runtime built for teams and operators who need more than a chatbot. It understands what you actually want, coordinates the right capabilities behind the scenes, and returns reviewed, evidence-backed results — without requiring you to manage the complexity underneath.

## What It Does

- **Research** — deep, multi-source investigation on any topic, synthesized into clear, actionable output
- **Code** — write, review, test, and deploy full-stack applications through conversation
- **Automate** — connect to your tools, services, and data sources to trigger real-world workflows
- **Build** — scaffold and manage backends, APIs, and frontends without writing boilerplate
- **Observe** — monitor, audit, and trace every task your agents perform in real time

## Lil_Hawk Specialist Fleet

| Lil_Hawk | Backed By | Responsibility |
|---|---|---|
| **Lil_TRAE_Hawk** | TRAE Agent | Heavy coding and repo-wide refactors |
| **Lil_Coding_Hawk** | OpenCode | Plan-first, approval-gated feature work |
| **Lil_Agent_Hawk** | Agent Zero | OS-level, browser, and multi-CLI workflows |
| **Lil_Flow_Hawk** | n8n | SaaS/CRM/email/payment automations |
| **Lil_Sand_Hawk** | OpenSandbox | Safe, containerized code execution |
| **Lil_Memory_Hawk** | CoPaw / ReMe | Long-term RAG-style memory |
| **Lil_Graph_Hawk** | LangGraph | Stateful, conditional workflows |
| **Lil_Back_Hawk** | InsForge | LLM-native backend (auth, DB, APIs) |
| **Lil_Viz_Hawk** | SimStudio | Visual workflow monitoring |
| **Lil_Deep_Hawk** | DeerFlow 2.0 | SuperAgent: decomposes missions into Squads |

## High-Level Architecture

```
┌─────────────────────────────────────────┐
│              VPS-1 (Gateway)            │
│  ┌─────────────┐  ┌──────────────────┐  │
│  │  OpenClaw   │  │   SimStudio UI   │  │
│  │  + Gateway  │  │   (Monitoring)   │  │
│  └──────┬──────┘  └──────────────────┘  │
└─────────┼───────────────────────────────┘
          │ Tailscale Private Network
┌─────────▼───────────────────────────────┐
│         VPS-2 (Lil_Hawk Fleet)          │
│  Docker Compose private network         │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │DeerFlow  │ │LangGraph │ │  TRAE   │  │
│  └──────────┘ └──────────┘ └─────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │ OpenCode │ │AgentZero │ │OpenSbox │  │
│  └──────────┘ └──────────┘ └─────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌─────────┐  │
│  │  CoPaw   │ │   n8n    │ │InsForge │  │
│  └──────────┘ └──────────┘ └─────────┘  │
│  ┌──────────────────────────────────┐   │
│  │         PostgreSQL               │   │
│  └──────────────────────────────────┘   │
└─────────────────────────────────────────┘
          │
┌─────────▼───────────────────────────────┐
│      Remote Access (ClawX + Tailscale)  │
│  Laptop / Tablet / Phone                │
└─────────────────────────────────────────┘
```

## Core Principles

- **Intent-first** — Chicken Hawk hears what you mean, not just what you typed
- **Governed execution** — nothing ships without a review gate
- **Provider-agnostic** — no vendor lock-in; the best tool for the job wins
- **Remote-ready** — fully manageable from any device, anywhere
- **Evidence-driven** — every output is traceable back to its source

---

## Quick Start

### Prerequisites

- Two VPS instances (e.g., Hostinger)
- Docker & Docker Compose on both VPS
- Tailscale account
- OpenClaw API key
- (Optional) ClawX for GUI management

### 1. Clone the Repository

```bash
git clone https://github.com/BoomerAng9/Chicken-Hawk.git
cd Chicken-Hawk
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your API keys and configuration
```

### 3. Deploy the Lil_Hawk Fleet (VPS-2)

```bash
# On VPS-2
docker compose up -d
```

### 4. Deploy the Gateway (VPS-1)

```bash
# On VPS-1
docker compose -f docker-compose.gateway.yml up -d
```

### 5. Set Up Tailscale

```bash
# On both VPS instances
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

### 6. Health Check

```bash
./scripts/health-check.sh
```

---

## Repository Structure

```
Chicken-Hawk/
├── docker-compose.yml           # Lil_Hawk fleet (VPS-2)
├── docker-compose.gateway.yml   # Gateway stack (VPS-1)
├── .env.example                 # Environment variable template
├── gateway/                     # Chicken Hawk orchestrator
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── main.py                  # FastAPI entrypoint
│   ├── router.py                # Intent classification & routing
│   └── config.py                # Configuration loader
├── system-prompt/
│   └── chicken-hawk.md          # OpenClaw system prompt
├── config/
│   ├── lil_hawks.yml            # Lil_Hawk endpoint configuration
│   └── tailscale.yml            # Tailscale ACL template
└── scripts/
    ├── setup.sh                 # One-shot bootstrap script
    └── health-check.sh          # Fleet health checker
```

---

## Security

- All inter-service communication runs on a private Docker network
- External access is gated through Tailscale (no public SSH or exposed dashboards)
- Code execution is sandboxed inside OpenSandbox containers
- Every agent output passes through a review gate before delivery
- Secrets are managed via environment variables (never committed)

---

*Chicken Hawk is currently in active development. Access is invite-only.*
