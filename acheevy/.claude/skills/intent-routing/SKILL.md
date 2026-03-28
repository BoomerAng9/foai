---
name: intent-routing
description: How ACHEEVY classifies user intent and routes to the correct PMO department and agent.
allowed-tools: Read, Edit, Write, Bash, Glob, Grep
---

# Intent Routing — ACHEEVY Executive Dispatch

Use this skill when building or modifying how ACHEEVY understands user requests
and routes them to the right department/agent.

## How It Works

1. User message arrives
2. ACHEEVY classifies the **intent** (not just keywords — the underlying goal)
3. Intent maps to a **PMO department** (ECHO, SHIELD, PULSE, LAUNCH, LENS)
4. Department lead **Boomer_Ang** is selected (or a specific member if the task is specialized)
5. If tactical execution is needed, dispatch cascades to **Chicken Hawk → Lil_Hawks**

## Classification Approach

ACHEEVY uses LLM-based intent classification (same pattern as Chicken Hawk's `router.py`):

```json
{
  "department": "PMO-ECHO",
  "agent": "API_Ang",
  "confidence": 0.92,
  "reasoning": "User wants to build a REST API endpoint — backend integration work",
  "complexity": "medium",
  "requires_hawk": false
}
```

When `requires_hawk: true`, ACHEEVY dispatches to Chicken Hawk's gateway, which
handles its own internal Lil_Hawk routing.

## Routing Rules

| If the intent involves... | Route to | Agent |
|---------------------------|----------|-------|
| Building, coding, designing | PMO-ECHO | Depends on sub-domain |
| Security, auth, encryption | PMO-SHIELD | Crypt_Ang |
| Data, analytics, pipelines | PMO-PULSE | Data_Ang |
| Deployment, infra, CI/CD | PMO-LAUNCH | Deploy_Ang |
| Testing, review, quality | PMO-LENS | QA_Ang |
| Complex multi-domain work | PMO-ECHO | → Chicken Hawk (Squad mode via Lil_Deep_Hawk) |

## PMO-ECHO Sub-Routing

PMO-ECHO is the largest department. Sub-route within it:

| Sub-intent | Agent |
|------------|-------|
| Backend API, integration | API_Ang |
| Frontend UI, components | UI_Ang |
| Domain expertise, research | SME_Ang |
| Workflow, automation | Flow_Ang |
| Visual design, UX | Design_Ang |

## Fallback Chain

1. If classification confidence < 0.6 → ask user for clarification
2. If agent is unavailable → escalate to department lead
3. If department is unclear → default to PMO-ECHO (Engineering)
4. If task spans multiple departments → create Squad via Lil_Deep_Hawk

## Reference Files

- `config/pmo-departments.yml` — Department definitions with trigger keywords
- `config/boomer_angs.yml` — Agent registry with specialties
- `system-prompt/acheevy.md` — Full dispatch protocol
