# Tasks

Tasks define exact, queued assignments intended to be executed autonomously or interactively. They represent the granular units of work within a Change Order.

## Board State Lifecycle
All Tasks must exist within one of the following states, visible on the Admin Command Center (Circuit Box):

1. **Planning**: Intent is normalized and sequenced.
2. **Running**: A Boomer_Ang is actively executing the Task.
3. **Blocked**: Execution is halted due to missing dependencies or failed gates.
4. **Review**: Execution is complete but awaiting validation (Review/Hone).
5. **Approved**: The user has verified the evidence and granted "Y" status.
6. **Packaged**: The manifest and evidence bundle are prepared.
7. **Delivered**: The final output has been handed off to the user or downstream system.

## Task Structure
- **ID**: Unique identifier for traceability.
- **Parent**: Reference to the Change Order or superior Task.
- **Evidence**: Artifacts, logs, or vision captures proving the work.
- **Approvals**: Required manual gates.

## Traceable Outcomes
No Task is considered "Done" without evidence. BuildSmith assembles these outcomes, and Packaging prepares them for history.

