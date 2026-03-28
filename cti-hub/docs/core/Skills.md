# Skills

Skills are modular functional packages executed by Boomer_Angs. Unlike high-level Agents, a Skill maps to an actionable code block or sequence (a specific routine).

## Tool Contracts
All Skills are exposed via **Tool Contracts**. These contracts use Zod-based schemas to define:
- **Inputs**: Explicitly typed arguments.
- **Side Effects**: Declared permissions (e.g., file write, API calls).
- **Evidence Schema**: The structure of the outcome evidence (evidence-backed by design).

## Skill Categories

- **Vision Analysis**: The ability into send vision payloads to multimodal models and parse structured UI/UX insights.
- **Code Execution**: The capacity to generate, test, and patch TS/JS/Py blocks in isolated runtimes.
- **SQL Analysis**: The capacity to build analytical PostgreSQL queries against the Brain or secondary domains.
- **System Hooks**: Intermediaries between system policies and physical hook invocations (e.g., triggering a build, restarting a VPS).
- **Communication**: Generating synthetic voice tokens or formatted manifest strings.

Skills compose the Tool Contracts which agents can run under ACHEEVY's orchestration.

