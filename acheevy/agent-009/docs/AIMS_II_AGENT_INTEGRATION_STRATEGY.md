# A.I.M.S. + ii-agent Integration Strategy

## Architecture: Service Integration (Microservice)

A.I.M.S. and ii-agent run as separate services. A.I.M.S. orchestrates, ii-agent executes.

```text
┌─────────────────────────────────────────────────────┐
│  A.I.M.S. Platform                                  │
│                                                     │
│  ┌──────────────┐      ┌─────────────────────────┐  │
│  │  Next.js 14   │      │  UEF Gateway (Express)  │  │
│  │  Frontend     │◄────►│  Agent Orchestrator     │  │
│  └──────────────┘      └──────────┬──────────────┘  │
│                                   │                  │
│         Agent Hierarchy:          │                  │
│         ACHEEVY → Boomer_Ang      │                  │
│         → Chicken Hawk → Lil_Hawks│                  │
└───────────────────────────────────┼──────────────────┘
                                    │
                          WebSocket + REST
                                    │
┌───────────────────────────────────┼──────────────────┐
│  ii-agent (A.I.M.S.-branded)      │                  │
│                                   ▼                  │
│  ┌──────────────┐      ┌─────────────────────────┐   │
│  │  Frontend     │      │  Backend                │   │
│  │  (Violet/     │      │  Realtime + REST APIs   │   │
│  │   Obsidian)   │      │  50+ Tools              │   │
│  └──────────────┘      │  Multi-model LLM        │   │
│                         └─────────────────────────┘   │
└───────────────────────────────────────────────────────┘
```

---

## What is included in this strategy

### 1) TypeScript Client SDK (`integrations/aims/src/`)

- `types.ts`: Event and API type definitions
- `client.ts`: `IIAgentClient` with reconnect and typed events
- `index.ts`: exports
- `example.ts`: A.I.M.S. usage example

### 2) Docker Overlay (`integrations/aims/docker-compose.aims.yaml`)

- Attach ii-agent to shared `aims` network
- Set `DISABLE_FRONTEND=true` when A.I.M.S. frontend owns UX

### 3) Migration Tooling

- `apply-to-aims.sh`: remove embedded `backend/ii-agent` from A.I.M.S.
- `aims-uef-client.ts`: UEF client adapter toward ii-agent service

---

## Runtime configuration

```bash
II_AGENT_URL=http://ii-agent:8000
# or
II_AGENT_URL=https://agent.aims.app
```

### Candidate REST APIs (service side)

- `GET /api/sessions/{device_id}`
- `GET /api/sessions/{session_id}/events`
- `GET /api/settings`
- `POST /api/upload`

---

## Responsibility split

| Concern | AIMS | ii-agent |
|---|---|---|
| User auth & sessions | ✅ | — |
| Agent hierarchy (ACHEEVY, etc.) | ✅ | — |
| Task orchestration | ✅ dispatches | ✅ executes |
| LLM/tool execution | — | ✅ |
| Frontend UX | ✅ main app | ✅ branded agent UI |
| File uploads | ✅ collects | ✅ processes |
| Model selection | ✅ configures | ✅ uses |

---

## Current-state delta (important)

This monorepo currently contains a Socket.IO-based bridge implementation in A.I.M.S. code and Socket.IO server flow in ii-agent code paths. If raw WebSocket is required as the final protocol, an explicit protocol migration should be scheduled and executed as a tracked workstream.

Known references in-repo:
- `apps/AIMS/backend/uef-gateway/src/ii-agent/client.ts`
- `src/ii_agent/server/socket/socketio.py`

---

## Execution checklist

1. Finalize protocol contract (Socket.IO vs raw WebSocket) and freeze event schema.
2. Implement `integrations/aims` SDK package and adapter.
3. Add Docker overlay and environment wiring for A.I.M.S. deployment targets.
4. Remove embedded ii-agent from A.I.M.S. where still present.
5. Validate end-to-end orchestration through ACHEEVY hierarchy.
6. Run staging soak tests on reconnect, upload, streaming, and cancellation.
