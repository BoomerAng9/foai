# ACHEEVY Role-Based Operating Spec (Abstract)

This is the executor-identity-neutral operating spec for ACHEEVY.
It defines role contracts, skill contracts, hooks, SOPs, GSD checks, tool governance, and swarm lifecycle without assuming specific persona names.

## 1. Standards

### 1.1 Abstract Roles

- Primary Orchestrator Executor
  - Single front door for user input.
  - Converts requests into plans, delegates execution, synthesizes responses.

- Specialist Executors
  - Narrow actors with one primary objective and bounded skill bundles.
  - Typical objective classes: growth, content, infra, UI, analytics, delivery.

- Automation Executors
  - Event or schedule driven systems for recurring work, retries, and looped execution.

- Review Executors
  - Human or agentic reviewers that run KPI, risk, and quality gates before release.

### 1.2 Skill Contract

Every skill MUST be represented in markdown and use this shape:

```md
# Skill: <Name>

- Role: <Which executor roles can own this skill>
- Intent: <Single clear outcome>
- KPIs: <Measurable success metrics>
- Stack: <Frameworks, APIs, services, repos>
- Inputs: <Required inputs>
- Outputs: <Guaranteed outputs>
- Quality Gates: <Checks before done>
- Hooks:
  - trigger:
  - pre_gsd:
  - post_gsd:
  - stitch_design:
- Limits:
  - Max iterations / runtime
  - Max external tool/API calls
```

### 1.3 Hook Semantics

- `trigger`: activation conditions from intent, context, or events.
- `pre_gsd`: pre-execution checks for scope, permissions, required data/tools.
- `post_gsd`: validation, metrics logging, and handoff recording.
- `stitch_design`: optional UX pass for UI/flow changes.

### 1.4 Narrowness Standard

Each Specialist Executor MUST:

- own exactly one primary objective,
- track 3-5 KPIs,
- run no more than 7-10 active skills concurrently.

If a plan exceeds this budget, split work across additional role instances.

## 2. SOPs

### SOP-01 Fast Planning and Role Realization

1. Extract one-line Intent Statement.
2. Map to vertical/workspace.
3. Role realization by role capability, not identity.
4. Query tool/MCP registry and build role-labeled draft plan.
5. Run GSD pre-check (alignment, skill budget, evidence pathing).
6. Commit plan to shared memory.

### SOP-02 Execution Loop

1. Load assigned plan segment and relevant context.
2. Choose minimal next action.
3. Invoke approved tools autonomously when preconditions match.
4. Log checkpoint: change, evidence, expectation, next action.
5. Handoff or re-loop via automation scheduler.

### SOP-03 Review Pass/Fail

1. Define evaluation window by objective.
2. Collect KPI metrics in a uniform schema.
3. Mark pass/fail by thresholds.
4. On fail windows, trigger re-scope or retire configuration.
5. Store review outcomes in shared memory.

### SOP-04 Stitch Design Trigger

Trigger `stitch_design` when UI layout, flow, or brand expression is impacted.
Stitch can propose layout/components/copy but cannot alter architecture or role model.

## 3. GSD Bridge Contract

### Inputs

- Intent Statement
- Draft Plan Outline
- Active SOP ID
- Skill registry snapshot

### Outputs

- Tightened executable plan
- Explicit Goal -> Skills -> Tools mapping
- Rejected skills/tools list
- Clarifying questions if underspecified

### Mandatory Checks

- Goal alignment with KPI linkage
- Skill budget enforcement
- Registry consistency and tenant permissions
- Evidence pathing for important claims

## 4. Tool and MCP Governance

Maintain one Tool/MCP Registry entry per integration with:

- branded tool name,
- endpoint or MCP address,
- operations/schema,
- allowed roles,
- tenant/vertical constraints,
- cost/quotas.

Planning must record selected tools and rationale.
Execution must log tool call summary, status, and cost units.

## 5. Agentic Swarms

Swarm = Primary Orchestrator + Specialist Executors + Automation Executors around one objective.

Each member has:

- narrow objective slice,
- KPI set and evaluation window,
- explicit memory surface.

Delegation is capability/skill/workload based and primarily coordinated through shared memory artifacts.

### Swarm Member Lifecycle

1. Design objective, KPIs, skills, heartbeat.
2. Instantiate role configuration.
3. Wire skills to tools.
4. Run under current plans.
5. Evaluate pass/fail.
6. Keep, re-scope, or retire.

## 6. Single-Host Driver Pattern

A single host can function as Automation + Specialist container if it:

- runs narrow role configs,
- stores skills in markdown,
- uses a dedicated journal writer configuration,
- supports cloneable skill folders,
- supports scheduled loops.

## 7. ACHEEVY Adoption Rules

- Identity changes must occur in role bindings, not in this spec.
- Runtime policy layers may import and enforce these constraints.
- Any new skill or task must satisfy this document before activation.
