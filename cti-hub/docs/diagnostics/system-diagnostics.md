# GRAMMAR System Diagnostics (Chat + Research Wiring)

## Scope
- Landing flow and auth-entry intent
- ACHEEVY chat loop continuity
- NotebookLM/TLI integration path
- Research UX behavior under backend failure

## What we validated
1. **Landing/auth posture**
   - `/` is public and now points users to chat/research entry points.
   - Protected routes continue to be enforced by middleware.

2. **Chat continuity checks**
   - Chat message state is now persisted in browser storage (`acheevy_chat_v1`) so the user session survives refreshes.
   - Empty model payloads are treated as hard errors instead of pseudo-success responses.
   - Chat header now surfaces `connected` vs `degraded` engine status.

3. **NotebookLM diagnostics checks**
   - `notebooklm.query()` now throws explicit errors on API failure.
   - Research page receives and displays concrete error strings instead of generic “looks successful” messaging.

## Critical findings
- **Environment/config dependency**: Chat and NotebookLM both require runtime keys (`NEXT_PUBLIC_INSFORGE_*`, `NOTEBOOKLM_API_KEY`, `GCP_PROJECT_ID`). Missing keys degrade into user-visible failures.
- **Historical false-positive behavior**: Notebook query previously returned a fallback answer even on backend failure, which could look like success while no useful backend operation occurred.
- **Simulated branch in Research mode**: Non-notebook path still uses a timed simulation block by design; it is not true backend research execution.

## Recommended next diagnostics actions
1. Add server-side health endpoint for InsForge AI + NotebookLM key validation.
2. Add request IDs to chat/research calls and persist in audit table for traceability.
3. Add a backend integration test that asserts non-empty `choices[0].message.content` from AI chat.
4. Replace the current simulated GLM branch with a real route or label it explicitly as demo mode in the UI.
