# Host Surface Architecture

`cti-hub` is ACHIEVEMOR's shared Next.js application for two connected host surfaces:

- `CTI Hub` on `https://cti.foai.cloud`
- `The Deploy Platform` on `https://deploy.foai.cloud`

The codebase stays unified, but host-aware routing splits the two surfaces at the edge:

- `cti.foai.cloud` defaults to `/chat` and retains owner/operator routes
- `deploy.foai.cloud` defaults to `/deploy-landing` and hides CTI-only routes

That lets the platform share auth, agents, APIs, and persistence without collapsing the two products into one identity.

## System Map

```text
cti-hub/
|
+-- Core_Runtime/                # Governed Logic & Routing
|   |
|   +-- NTNTN/                   # Intent Framing & Normalization
|   +-- MIM/                     # Context Management (NOT an agent)
|   +-- ACHEEVY/                 # Orchestration & Sequencing
|   +-- Picker_Ang/              # Capability-first Routing
|   +-- BuildSmith/              # Output Assembly & Manifests
|   +-- Review_Hone/             # Validation & Gating
|   +-- Packaging/               # Final Delivery Bundling
|
+-- Workflow_Spine/              # Durable Execution & State
|   |
|   +-- LangGraph/               # Graph Definitions & Checkpointing
|
+-- Execution_Branches/          # Specialized Work Units
|   |
|   +-- Boomer_Angs/             # General Execution Roles
|   +-- DeerFlow/                # Research-heavy Search & Synthesis
|   +-- OpenSandbox/             # Isolated Code/Browser Execution
|   +-- Playwright_MCP/          # Deterministic Browser Interaction
|   +-- OpenRouter/              # LLM Layer & Provider Switching
|   +-- Mercury_2/               # Fast Reasoner for Huddles/Intent
|   +-- Brave/                   # Search Grounding
|   +-- Firecrawl/               # Scraping & Extraction
|   +-- CoPaw/                   # Operator-facing Helper Flows
|   +-- OpenCode/                # IDE-side Development Assistance
|
+-- Experience_Plane/            # UI & Interaction Surfaces
|   |
|   +-- Chat_w_ACHEEVY/          # Main Interface
|   +-- Board_Monitor/           # Execution Tracking
|   +-- Review_Surface/          # Approval Gates
|   +-- Artifact_Retrieval/      # Bundle Downloads
|
+-- Platform_Plane/              # Infrastructure & Persistence
    |
    +-- Neon_Postgres/           # Source of Truth (State/Lineage) via postgres.js
    +-- Firebase_Auth/           # Authentication (client + admin SDK)
    +-- GCP_Cloud_Run/           # Deployment & Serverless Compute
    +-- Object_Storage/          # Artifacts & Bundles
    +-- WebSocket_Event_Layer/   # Live Updates
    +-- Observability/           # Traces & Cost Tracking
```

## Runtime Roles

- **NTNTN**: Frames and normalizes user intent into an objective context.
- **MIM**: Governs context, revisions, memory, and distribution. *Explicitly NOT an agent.*
- **ACHEEVY**: Orchestrates sequencing, huddles, and checkpoints.
- **Agent Fleet**: Organization-scoped runtime registry that maps launch workload to active agents and recommended execution order.
- **Boomer_Angs**: Specialized execution roles (Research, Coding, Analysis) selected from the fleet and attached to governed workload steps.
- **Picker_Ang**: Capability-first routing logic.
- **BuildSmith**: Assembles approved deliverables for packaging.
- **Review/Hone**: Validates, corrects, and gates releases.
- **Packaging**: Prepares handoff bundles and evidence manifests.

## Launch Flow

1. **Huddle**: NTNTN frames the objective and MIM loads governed context for the active organization.
2. **Fleet Plan**: ACHEEVY asks the Agent Fleet for a recommended workload sequence and Picker_Ang resolves the best capability for each step.
3. **Execution**: Boomer_Ang execution roles run structured workload steps with assigned agent identity, reason, and expected output.
4. **Assembly**: BuildSmith creates a release manifest with lineage for every contributing agent.
5. **Gate + Package**: Review/Hone approves the manifest and Packaging produces the final handoff bundle.

## Technical Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Node.js/TypeScript
- **Database**: Neon Postgres via postgres.js (`DATABASE_URL`)
- **Auth**: Firebase Auth (client SDK + Admin SDK)
- **Cloud**: GCP (`foai-aims` project), Firebase project `foai`
- **Workflow**: LangGraph
- **Discovery**: Brave Search / Firecrawl
- **Sandbox**: E2B
- **LLM Layer**: OpenRouter (Mercury-2 for high-speed reasoning)
