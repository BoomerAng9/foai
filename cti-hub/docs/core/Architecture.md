# Architecture

GRAMMAR's architecture revolves around a multimodal orchestrator that evaluates intent, references the Brain (memory & states), enforces Policy, and invokes specialized Agents and Plugs (OpenClaw) to achieve dynamic runtime capabilities.

## Layers
1. **Control / Orchestration Plane**: Evaluates inputs (text, voice, vision), makes routing decisions.
2. **Brain Plane**: Manages state, persistent memory, and change orders.
3. **Agent / Execution Plane**: Runs designated agent tasks against specific Tool contracts.
4. **Integration / Integration Plane**: Connects external hooks and webhooks.
5. **UI / Multimodal Plane**: Renders ASCII prototypes or routes text to synthesis.

## Core Flow
Input -> Multimodal Normalize -> Brain/Memory Context -> Orchestrator Router -> Policy Check -> Agent Selection -> OpenClaw Execution -> Review/Hone -> Formatting (Composer) -> Response.
