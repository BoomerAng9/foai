# Agents & Roles

Agents in GRAMMAR represent specialized personas operating under the orchestrator, fortified by the **Antigravity Agent Kit**. They follow a governed, multi-role execution model.

## Runtime Roles

### 1. NTNTN (Intent Processor)
- **Purpose**: Frames and normalizes human intent.
- **Action**: Strips away ambiguity, identifies core objectives, and establishes constraints.

### 2. MIM (Context Governance)
- **Note**: **MIM is not an agent.**
- **Purpose**: Governs context, revisions, approvals, memory, and distribution.
- **Action**: Ensures all agent work is performed within a controlled, governed context pack.

### 3. ACHEEVY (Orchestrator)
- **Purpose**: Orchestrates the entire runtime.
- **Action**: Handles sequencing, checkpoints, and maintains the global Board State. It coordinates but does not execute raw tasks directly.

### 4. Boomer_Angs (Specialized Execution)
- **Purpose**: Physical task execution.
- **Action**: Acts on governed context (never guesses) to perform specialized operations via Skills and OpenClaw Plugs.

### 5. Picker_Ang (Router)
- **Purpose**: Routing and capability matching.
- **Action**: Routes tasks by capability class first, provider second. Avoids hard-coded vendor choices.

### 6. BuildSmith (Assembler)
- **Purpose**: Deliverable assembly.
- **Action**: Assembles all approved outputs into final deliverables.

### 7. Review/Hone (Validation)
- **Purpose**: Quality Gate.
- **Action**: Validates, corrects, and gates releases. Ensures every outcome is evidence-backed.

### 8. Packaging (Manifestation)
- **Purpose**: Handoff preparation.
- **Action**: Prepares manifests, evidence bundles, and handoff packages for the user or downstream systems.

## Collaborative Jobs
Agents support **Collaborative Jobs** enabled by the Antigravity Agent Kit, allowing multiple roles to sync on a single Task set (Board State) with shared state awareness and handoff protocols.

All execution entities conform to strict Tool Contracts, ensuring traceable and reviewed outcomes.

