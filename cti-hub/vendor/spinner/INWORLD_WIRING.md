# Inworld Function Calling — Universal Wiring

Status: **WIRED** across cti-hub, perform, SmelterOS, Deploy Platform, AIMS frontend.

## What shipped

### Core package (`@aims/spinner` v0.2.0)

| Module | Purpose |
|---|---|
| `inworld-client.ts` | OpenAI-compatible LLM Router client — `POST https://api.inworld.ai/v1/chat/completions` with `Authorization: Basic <key>` |
| `inworld-realtime.ts` | WebSocket client for duplex voice sessions with server-side tool dispatch |
| `tool-registry.ts` | Universal tool registry with scope-based authorization |
| `function-calling.ts` | Full tool-use loop orchestrator (bounded by `maxIterations`) |
| `tools/port-authority.ts` | Shared FOAI tool set (plans, cart, billing, checkout, Grammar search, Sqwaadrun dispatch, hawk roster) |
| `chat-route-helper.ts` | Drop-in Next.js POST handler |

### Per-app adapters (each a NEW file, zero edits to existing chat routes)

| App | Boot file | Chat route |
|---|---|---|
| cti-hub | `cti-hub/src/lib/inworld/boot.ts` | `cti-hub/src/app/api/spinner/chat/route.ts` |
| perform | `perform/src/lib/inworld/boot.ts` | `perform/src/app/api/spinner/chat/route.ts` |
| SmelterOS | `SmelterOS/apps/web/src/lib/inworld/boot.ts` | `SmelterOS/apps/web/src/app/api/spinner/chat/route.ts` |
| Deploy | `the-deploy-platform/DEPLOY/apps/web/lib/inworld/boot.ts` | `the-deploy-platform/DEPLOY/apps/web/app/api/spinner/chat/route.ts` |
| AIMS | `AIMS/frontend/lib/inworld/boot.ts` | `AIMS/frontend/app/api/spinner/chat/route.ts` |

## Smoke test (once INWORLD_API_KEY is set)

```bash
# Any app — same contract across all 5
curl -s -X POST http://localhost:3000/api/spinner/chat \
  -H 'Content-Type: application/json' \
  -d '{
    "messages": [
      {"role": "user", "content": "What plans do you have for Sqwaadrun?"}
    ]
  }' | jq .
```

Expected: `message.content` contains plan names, `trace[0].name == "list_plans"`, `iterations >= 2` (one call to `list_plans`, one to compose the answer).

## Enable function calling per surface

Each app's chat route imports `@/lib/inworld/boot` which registers tools once. To expose more tools on a surface, register them in that app's boot file:

```ts
// cti-hub/src/lib/inworld/boot.ts
import { defaultToolRegistry } from '@aims/spinner';
defaultToolRegistry.register({
  source: 'cti-hub',
  scopes: ['owner'],
  schema: {
    type: 'function',
    function: {
      name: 'cti_open_circuit_box',
      description: 'Open the Circuit Box settings panel.',
      parameters: { type: 'object', properties: {} },
    },
  },
  handler: async () => ({ opened: true }),
});
```

## Secrets required

- `INWORLD_API_KEY` — set in openclaw container env. Absent key = chat routes return 503 with a fallback message (no crash).
- Optional: `INWORLD_BASE_URL`, `INWORLD_REALTIME_URL` for future private-routing or regional endpoints.
- `PORT_AUTHORITY_URL` — defaults to `http://localhost:3000/api`, override in prod.

## Realtime voice (server-side)

```ts
import { openRealtimeSession, defaultToolRegistry } from '@aims/spinner';

const session = await openRealtimeSession({
  instructions: 'You are ACHEEVY. Respond briefly.',
  tools: defaultToolRegistry.schemas(),
  registry: defaultToolRegistry,
  callerScopes: ['public', 'authenticated'],
  onEvent: (e) => console.log(e.type),
});
await session.ready;
// stream PCM16 @ 24kHz base64 chunks
session.appendAudio(base64Pcm16Chunk);
session.createResponse();
```

Tool dispatch is automatic — the server handles `response.function_call_arguments.done` by calling the registry and replying with `conversation.item.create` + `response.create`.

## Next steps

1. Set `INWORLD_API_KEY` in openclaw (pull from Inworld Portal → Settings → API Keys).
2. Wire the existing `/api/chat` routes in each app to delegate to `/api/spinner/chat` (or call `handleChatRequest` directly) once smoke-tested.
3. Add per-app local tools to each `boot.ts` as the Port Authority endpoints come online.
4. (Optional) Migrate Grammar voice + Per|Form analyst audio to Realtime WS instead of the current LLM-Router + ElevenLabs TTS pipeline.

## Why this architecture

- **One tool registry, five surfaces** — every chat gets the same baseline capability (plans/cart/billing/hawk roster), with surface-specific tools added locally.
- **No existing-file churn** — every integration point is a NEW file. Apps opt in by importing their boot module; opting out = don't import.
- **Auth via scopes** — each tool declares `scopes: ['public'|'authenticated'|'owner'|'admin']`. The registry filters exposure per-caller before handing tools to Inworld.
- **Fails safe** — missing key returns 503 instead of crashing. Tool handler errors return JSON error strings to the LLM instead of throwing (the model can self-correct).
- **Stripe-safe** — `start_checkout` is the only mutation; it hands off to Stepper (Taskade), never touches Stripe SDK.
