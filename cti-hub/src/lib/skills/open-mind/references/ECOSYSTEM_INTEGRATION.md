# Open Mind — Ecosystem Integration Map v3.0

## Overview

Open Mind does not exist in isolation. It operates within the FOAI AOS-10 ecosystem
where ORACLE provides execution discipline, UEF provides orchestration infrastructure,
VL-JEPA provides semantic perception, KYB provides governance, and ByteRover provides
organizational memory. This document maps exactly where each framework plugs into
Open Mind's creation loop — and where it does not.

**Principle**: Open Mind is still a prompt-level creation harness. These integrations
do not turn it into an execution engine. They enrich the thinking process and provide
the invoking agent with richer context, stronger verification, measurable novelty,
auditable decisions, and persistent learning.

---

## 1. ORACLE Framework Integration

### What ORACLE Brings
ORACLE (Open Recursive Architecture for Logical Execution) provides a 7-gate
verification system, a FDH (FOSTER/DEVELOP/HONE) phased execution model, a virtue
alignment formula, and a dual-loop verification pattern. Open Mind adopts the
relevant *thinking patterns* — not the execution machinery.

### Integration Points

| ORACLE Component | Open Mind Stage | How It Integrates |
|-----------------|----------------|-------------------|
| FDH Framework (FOSTER/DEVELOP/HONE) | Entire creation loop | FDH is the structural backbone. FOSTER = Stages 0-2 (search, compile evidence via Brave API + AutoResearch + ByteRover). DEVELOP = Stages 3-4 (shape ideas, apply divergent protocols). HONE = Stages 5-8 (evaluate, verify, deliver, audit). |
| FOSTER (Research) | Stage 2 | Open Mind's evidence grounding maps to FOSTER's research phase. Brave API + AutoResearch + ByteRover provide the discovery. |
| DEVELOP (Implementation) | Stage 3 + Stage 4 | Open Mind's divergent planning and constrained generation map to DEVELOP — developing ideas from fostered evidence. |
| HONE (Testing + Optimization) | Stage 5 + Stage 6 + Stage 7 | Open Mind's evaluation, 7-gate verification, and output delivery map to HONE — extracting the solution from developed proposals. |
| 7 Gates | Stage 6 | Open Mind adopts 7 gate categories aligned with ORACLE's model. |
| Virtue Formula (f_virtue) | Stage 5 (new dimension) | Added as an ethical alignment check within the evaluation rubric. |
| Dual-Loop Verification | Stage 5 (inner) + Stage 6 (outer) | Stage 5 is the inner loop (continuous self-evaluation). Stage 6 is the outer loop (pre-delivery gate check). |
| Tri-Consciousness | Core Principles | Active (velocity), Reflective (alignment), Strategic (long-term value) map to Open Mind's creation mindset. |
| RLM (Recursive Language Model) | Stage 2 | For massive creation tasks, the agent can use RLM-style recursive context distillation during evidence grounding. |

### What Open Mind Does NOT Adopt from ORACLE
- Cloud Run Jobs execution (Open Mind does not execute code)
- Direct LLM calls (the invoking agent handles model calls)
- MCP tool definitions (Open Mind does not call tools)
- Container constraints (Open Mind is prompt-level, not infrastructure)
- RLM REPL execution (Open Mind does not spawn sub-agents via Python REPL)

### What Open Mind DOES Adopt from ORACLE
- **FDH as a creation thinking framework** (FOSTER → DEVELOP → HONE), reframed from
  code execution phases to creation thinking phases:
  - FOSTER = search the web (Brave API), compile evidence (AutoResearch + ByteRover)
  - DEVELOP = make sense of evidence, shape ideas, apply divergent protocols
  - HONE = evaluate, score, stress-test, deliver the creation packet
- **7-gate verification model** (mapped to Open Mind's creation context)
- **Virtue alignment formula** (f_virtue as an ethical scoring dimension)
- **Dual-loop verification pattern** (inner evaluation + outer gate check)

### ORACLE 7-Gate Alignment for Open Mind

Open Mind's Stage 6 (Creation Quality Gates) now maps to ORACLE's 7-gate model:

```
Gate 1: TECHNICAL       → Requirements Match + Evidence Coverage
Gate 2: ETHICS          → Virtue Alignment (f_virtue ≥ threshold)
Gate 3: JUDGE           → ZTDC MUG Protocol (adversarial review)
Gate 4: STRATEGY        → Long-term value + integration fitness
Gate 5: PERCEPTION      → VL-JEPA semantic novelty measurement
Gate 6: EFFORT          → LUC cost estimation + token tracking
Gate 7: DOCUMENTATION   → Creative rationale + protocol reasoning recorded
```

### Virtue Alignment Formula (Adopted from ORACLE)

```
f_virtue = α·Intent_alignment(I) + β·Creation_quality(E) + γ·Ethical_score(M) + δ·Ecosystem_value(C)

Where:
  α + β + γ + δ = 1.0
  α = 0.30 (Does the creation match the stated objective?)
  β = 0.35 (Is the creation well-reasoned, evidence-backed, novel?)
  γ = 0.15 (Are there no ethical shortcuts or harmful patterns?)
  δ = 0.20 (Does the creation benefit the ecosystem/organization?)

Thresholds:
  Standard creation: f_virtue ≥ 0.85
  Production-bound creation: f_virtue ≥ 0.95
  Safety-critical creation: f_virtue ≥ 0.99
```

---

## 2. UEF (Unified Execution Framework) Integration

### What UEF Brings
UEF provides a 4-layer orchestration stack (Ingress → Orchestration → Execution →
Egress), ZTDC zero-trust verification, LUC cost estimation, and SmelterOS routing.
Open Mind operates within UEF's Layer 2 (Orchestration) as a skill that agents apply
during Layer 3 (Execution).

### Integration Points

| UEF Component | Open Mind Stage | How It Integrates |
|--------------|----------------|-------------------|
| ZTDC (Zero-Trust Diffusion) | Stage 6 (new sub-gate) | ZTDC's "verify before trust" principle applied to creation outputs. MUG Protocol runs adversarial testing on creation proposals. |
| LUC (Cost Estimation) | Stage 7 (output packet) | Creation proposals include estimated implementation cost via LUC component breakdown. |
| SmelterOS Router | Pre-Stage 0 | UEF routes the creation request to the appropriate agent, which then applies Open Mind. |
| VL-JEPA (via UEF) | Stage 5 + Stage 6 | Semantic embedding comparison for novelty measurement and hallucination detection. |
| KYB Flight Recorder (via UEF) | Post-Stage 7 | Every Open Mind activation is logged as a KYB Flight Recorder entry. |
| Verification Tool (MCP) | Stage 6 | If the creation output includes code/artifacts, the agent can run UEF's verification tool. Open Mind does not call it — the agent does. |

### ZTDC Integration: Zero-Trust Creation Verification

ZTDC's core insight — "verify before trust" — maps directly to Open Mind's
evidence-first philosophy. Specifically:

**Semantic Entropy Check** (applied at Stage 5):
The creation output is analyzed for "Low-Confidence Regions" (LCRs) — sections where
the reasoning is uncertain, speculative without evidence, or internally contradictory.
If LCRs are detected, the output loops back to Stage 2 for additional evidence
grounding before proceeding.

**MUG Protocol** (applied at Stage 6 as an adversarial gate):
```
Agent A (Creator): Submits creation proposal
Agent B (Critic): "I will try to break this proposal"
  - Generates counterfactual tests
  - Challenges assumptions
  - Identifies failure modes the creator missed
Agent A defends the proposal against each challenge

If Agent A fails defense → return to Stage 3 (Divergent Planning)
If Agent A passes defense → creation is "denoised" and verified
Maximum 3 MUG rounds before escalation
```

The MUG Protocol is particularly valuable for HIGH novelty tasks where the creation
is speculative and needs adversarial stress-testing before delivery.

### LUC Integration: Cost-Aware Creation

Every creation proposal in the output packet now includes an estimated implementation
cost. The invoking agent provides domain-specific LUC adapter data, and Open Mind
includes cost estimates for each of the three options (Conventional, Differentiated,
Experimental):

```json
{
  "options": [
    {
      "type": "CONVENTIONAL",
      "estimated_cost": {
        "tokens": 15000,
        "model_options": {
          "qwen_3.6_plus": "$0.00",
          "glm5_turbo": "$0.075",
          "gemini_3.1_pro": "$0.12"
        },
        "implementation_hours": 40,
        "cost_confidence": 0.90
      }
    }
  ]
}
```

This enables decision-makers to weigh novelty against cost when selecting which
option to pursue.

---

## 3. VL-JEPA Integration (Semantic Perception Layer)

### What VL-JEPA Brings
VL-JEPA (Vision-Language Joint Embedding Predictive Architecture) provides semantic
embeddings that represent meaning as vectors. This enables measurable comparison
between creation outputs and known patterns — turning "is this novel?" from a
subjective question into a computable metric.

### Integration Points

| VL-JEPA Capability | Open Mind Stage | How It Integrates |
|-------------------|----------------|-------------------|
| Semantic Embeddings | Stage 5 | Embed the creation output and compare cosine similarity against known pattern embeddings. Low similarity = genuinely novel. |
| Hallucination Detection | Stage 6 | Compare creation proposal embeddings against evidence ledger embeddings. Semantic drift between claimed evidence and actual evidence triggers rejection. |
| Embedding-Based Novelty Scoring | Stage 5 (enhances Q4) | Q4 (uniqueness) can be computed objectively: cosine_similarity(creation_embedding, template_embedding). |
| Agent Health Monitoring | Post-Stage 7 | Track embedding stability across multiple Open Mind activations by the same agent. Degrading creativity = semantic convergence over time. |
| Selective Decoding | Stage 2 | During evidence gathering, selective decoding reduces processing: only decode when semantic content actually changes. |

### Semantic Novelty Measurement

VL-JEPA transforms Open Mind's novelty scoring from purely rubric-based to
rubric + embedding-based:

```
Traditional (rubric only):
  Q4 uniqueness = human/LLM judgment (subjective, 0-6 scale)

Enhanced (rubric + VL-JEPA):
  creation_embedding = vljepa.embed(creation_output)
  template_embeddings = [vljepa.embed(known_pattern) for each in pattern_library]

  max_similarity = max(cosine_similarity(creation_embedding, t) for t in template_embeddings)

  adjusted_Q4 = (1 - max_similarity) × 6  # 0 = identical to known, 6 = completely novel

  # Blend rubric and embedding scores
  final_Q4 = 0.5 × rubric_Q4 + 0.5 × adjusted_Q4
```

This means an agent cannot claim novelty if VL-JEPA detects that the creation
output is semantically identical to existing work.

### Hallucination Detection in Evidence

VL-JEPA also strengthens the evidence ledger by detecting when an agent's claims
drift from retrieved evidence:

```
For each VERIFIED claim in the evidence ledger:
  claim_embedding = vljepa.embed(claim_text)
  source_embedding = vljepa.embed(source_text)
  similarity = cosine_similarity(claim_embedding, source_embedding)

  If similarity < 0.6:
    Flag as CITATION_DRIFT
    Downgrade claim from VERIFIED to PARTIALLY_SUPPORTED
    Add to retrieval_gaps for additional evidence
```

---

## 4. KYB (Know Your Boomer_Ang) Integration

### What KYB Brings
KYB provides a three-tier identity and audit system: Public Passport (trust),
Flight Recorder (operational audit), and Anchor Chain (immutable proof). For Open
Mind, KYB ensures every creation decision is auditable and traceable.

### Integration Points

| KYB Component | Open Mind Stage | How It Integrates |
|--------------|----------------|-------------------|
| Flight Recorder | Post-Stage 7 | Every Open Mind activation generates a Flight Recorder entry with: intake JSON, evidence ledger hash, options generated, novelty scores, gate results, and final recommendation. |
| Public Passport | Pre-Stage 0 | The invoking agent's KYB charter is checked before Open Mind activates. Only verified agents (technical ✓, security ✓, ethics ✓) can invoke Open Mind. |
| Anchor Chain | Post-Stage 7 | A hash of the creation output packet is included in the daily anchor batch for immutable proof. |
| Kill Switch | Escalation | If an agent repeatedly fails Open Mind gates (error rate > 15%), KYB auto-suspends the agent's ability to use Open Mind. |

### Flight Recorder Entry Schema (Open Mind Activation)

```json
{
  "timestamp": "2026-04-03T...",
  "eventId": "evt-openmind-...",
  "angSerialId": "ANG-...",
  "skillActivation": {
    "skill": "open-mind",
    "version": "3.0.0",
    "novelty_level": "HIGH",
    "uncertainty_level": "MEDIUM"
  },
  "executionLog": {
    "intake_hash": "sha256:...",
    "evidence_ledger_hash": "sha256:...",
    "options_generated": 3,
    "protocols_applied": ["SCAMPER", "Cross-Domain Analogy"],
    "constraints_applied": ["Do-It-In-Reverse"],
    "refinement_loops": 1,
    "mug_rounds": 2
  },
  "verificationResults": {
    "novelty_score": 4.2,
    "quality_score": 5.1,
    "coherence_score": 4.8,
    "overall_score": 4.7,
    "virtue_score": 0.96,
    "gates_passed": 7,
    "gates_failed": 0,
    "vljepa_novelty": 0.73,
    "ztdc_confidence": 0.91
  },
  "recommendation": {
    "option_type": "DIFFERENTIATED",
    "confidence": 0.88
  },
  "costMetrics": {
    "tokensUsed": 32000,
    "estimatedImplementationCost": "$0.16",
    "executionTimeMs": 45000
  }
}
```

---

## 5. ByteRover Integration (Organizational Memory)

### What ByteRover Brings
ByteRover provides a Context Tree — a structured, queryable knowledge base of
organizational patterns, decisions, and learnings. For Open Mind, ByteRover serves
as the "institutional memory" that prevents agents from reinventing what already
exists and enables them to build on prior creative work.

### Integration Points

| ByteRover Capability | Open Mind Stage | How It Integrates |
|---------------------|----------------|-------------------|
| Context Tree Query | Stage 2 (pre-AutoResearch) | Before requesting evidence from AutoResearch, the agent queries ByteRover for prior Open Mind creation packets related to the current task. This provides organizational context that web search cannot. |
| Prior Creation Lookup | Stage 1 (enhances Pre-Mortem) | The pre-mortem inversion can check: "Has our organization already tried something like this? What happened?" ByteRover provides that history. |
| Learning Storage | Post-Stage 7 | Successful creation packets (those that passed all gates) are stored in ByteRover's Context Tree for future agents. |
| Pattern Library | Stage 5 (enhances novelty scoring) | ByteRover's stored patterns serve as the "known pattern library" against which VL-JEPA measures novelty. |
| Agent Knowledge Continuity | Stage 0 | When one agent's Open Mind session produces a creation that another agent will build, ByteRover preserves the full creation context across the handoff. |

### ByteRover Query Flow in Open Mind

```
Stage 0: Intent Normalization
  ↓
  Agent queries ByteRover: "brv query 'prior creations for {task_domain}'"
  ↓
  ByteRover returns:
    - 0 results → Fully novel task, proceed normally
    - 1-3 results → Related prior work exists
      ├── Feed into Stage 1 Pre-Mortem: "We tried X before, it resulted in Y"
      ├── Feed into Stage 2 Evidence: organizational context alongside web evidence
      └── Feed into Stage 5 Novelty: prior creation embeddings as comparison baseline
    - 4+ results → Dense prior work
      ├── Risk: Agent might converge on existing patterns
      └── Open Mind should increase creative constraint intensity
  ↓
Stage 1: Pre-Mortem now includes: "What has our organization already created in this space?"
```

### Learning Loop (Post-Creation)

```
Creation packet passes all 7 gates
  ↓
Agent executes: brv curate "Open Mind creation: {task_summary}"
  ↓
ByteRover stores:
  - Creation packet (options, evidence, recommendation)
  - Novelty scores
  - Protocols applied
  - What worked / what was rejected
  ↓
Future agent activates Open Mind for similar task
  ↓
ByteRover returns prior creation context
  ↓
New agent builds ON prior work instead of repeating it
  ↓
Organizational creativity compounds over time
```

---

## Integration Stack Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  UEF Layer 1: Ingress Gateway                               │
│  (Request arrives, routed to agent)                         │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  UEF Layer 2: Orchestration Core                            │
│  SmelterOS routes to agent → Agent applies Open Mind        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  OPEN MIND FDH CREATION LOOP (prompt-level harness)         │
│                                                             │
│  ┌─ FOSTER (30%) ────────────────────────────────────────┐  │
│  │  Stage 0: Intent + ByteRover prior lookup             │  │
│  │  Stage 1: Pre-Mortem + ByteRover history              │  │
│  │  Stage 2: Brave API + AutoResearch + ByteRover        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ DEVELOP (50%) ───────────────────────────────────────┐  │
│  │  Stage 3: Divergent Planning (SCAMPER/TRIZ/Analogy)   │  │
│  │  Stage 4: Constrained Generation                      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌─ HONE (20%) ──────────────────────────────────────────┐  │
│  │  Stage 5: Evaluation (Rubric + VL-JEPA + Virtue)      │  │
│  │  Stage 6: 7 Gates (ORACLE + ZTDC MUG Protocol)        │  │
│  │  Stage 7: Output Packet (+ LUC cost estimates)        │  │
│  │  Stage 8: Post-Creation (KYB + ByteRover + Hermes)    │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  UEF Layer 3: Agent Execution                               │
│  (Agent uses creation packet to build)                      │
│  Agent's own ORACLE FDH for code: FOSTER → DEVELOP → HONE  │
│  UEF Verification Tool for artifacts                        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│  UEF Layer 4: Egress                                        │
│  KYB Flight Recorder entry + Anchor Chain hash              │
│  ByteRover learning storage                                 │
└─────────────────────────────────────────────────────────────┘
```

---

## What Was NOT Integrated (and Why)

| Component | Reason for Exclusion |
|-----------|---------------------|
| ORACLE Cloud Run Jobs | Open Mind does not execute code — execution isolation is the agent's concern |
| UEF MCP tool definitions | Open Mind does not call tools — the invoking agent uses MCP |
| UEF ACP agent negotiation | Open Mind does not negotiate between agents — it shapes one agent's thinking |
| UEF UCP commerce protocol | Open Mind does not handle payments — UEF handles that at Layer 1 |
| VL-JEPA video streaming | Open Mind is not a real-time video processor — VL-JEPA streaming is for Locale agents |
| VL-JEPA voice integration | Open Mind is text/prompt-based — voice embeddings are ACHEEVY's domain |
| ByteRover git operations | Open Mind does not manage source code — ByteRover's git features are for code agents |
| ORACLE RLM REPL execution | Open Mind does not spawn sub-agents via Python REPL — that's ORACLE's execution layer |
