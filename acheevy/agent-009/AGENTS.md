# Agent Operating Contract

Use `.github/copilot-instructions.md` as the canonical workspace instruction source for this repository.

This file exists as a compatibility entry point for agents that look for `AGENTS.md` first.

## Minimum required behavior

- Before substantive work, output Vision, Mission, and Objective.
- If the task affects UI, UX, workflow, or orchestration, output an ASCII prototype before code changes.
- Use the exact product terminology and UI primitive names defined in `.github/copilot-instructions.md`.
- Treat the sandbox as disposable and the session as durable.
- Keep the Model Selector and Data Source Picker inside the Bottom Composer Bezel.
- Render the chat label exactly as `CHAT W/ ACHEEVY`.

## Where to look next

- Workspace-wide standards: `.github/copilot-instructions.md`
- Frontend rules: `.github/instructions/frontend.instructions.md`
- Data-source rules: `.github/instructions/data-sources.instructions.md`
- Voice-first rules: `.github/instructions/voice-chat.instructions.md`
