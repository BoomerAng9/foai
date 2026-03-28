# A.I.M.S. Role Bindings

This file binds concrete agents and systems to the abstract roles in `ACHEEVY_ROLE_BASED_OPERATING_SPEC.md`.
Identity updates belong here, not in the abstract spec.

## 1. Role to Agent Bindings

- Primary Orchestrator Executor
  - Bound Agent: ACHEEVY
  - Notes: only user-facing orchestrator; owns planning, delegation, synthesis.

- Specialist Executors
  - Bound Agent Patterns:
    - Boomer_Ang (Growth): acquisition and growth objective
    - Boomer_Ang (Content): scripts, posts, publishing cadence
    - Boomer_Ang (Design): UI/UX and brand expression
    - Boomer_Ang (Data): analytics, reporting, KPI interpretation
    - Boomer_Ang (PM): project coordination and delivery tracking
  - Notes: each instance must define one objective, 3-5 KPIs, and <=10 active skills.

- Code Generation Executor
  - Bound Agent: Chicken Hawk
  - Notes: code generation and refactor execution under approved plans.

- Code Execution Executor
  - Bound Agent: CodeAng
  - Notes: sandbox/container execution and runtime validation.

- Strategy and Deep Reasoning Executor
  - Bound Agent: AVVA NOON
  - Notes: long-form reasoning and architecture-level guidance.

- Automation Executors
  - Bound Systems:
    - OpenClaw loops
    - n8n workflows
    - Cloud Tasks / cron

- Review Executors
  - Bound Agents:
    - Senior Boomer_Ang variants
    - Human operators (admins/lead engineers)

## 2. Tool and MCP Bindings (Examples)

- STT/TTS Stack
  - Groq Whisper, Deepgram, ElevenLabs, Gemini Voice
  - Roles: voice skills in Specialist and Automation Executors

- Media and Persona Stack
  - Nano Banana Pro, Key AI, Google Vids
  - Roles: synthetic SME and media pipeline skills

- Infra and Deployment Stack
  - Docker, Nginx, Cloudflare, Hostinger VPS, GCP
  - Roles: automation executors for CI/CD and infra operations

## 3. Binding Governance

- Keep this file synchronized with active production identities.
- Do not modify abstract role definitions here.
- Any binding change must preserve objective narrowness and KPI ownership.
