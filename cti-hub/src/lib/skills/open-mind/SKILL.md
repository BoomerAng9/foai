---
name: open-mind
description: >
  Creation-focused harness skill that breaks through training-data ceilings.
  Applied to the prompt pipeline when an agent needs to CREATE something new —
  a system, product, architecture, strategy, or concept that does not yet exist.
  Forces evidence-grounded, first-principles reasoning through structured
  divergent protocols, cross-domain analogies, pre-mortem inversion, and
  novelty self-evaluation. Integrates ORACLE 7-gate verification, ZTDC
  zero-trust diffusion, VL-JEPA semantic novelty measurement, KYB audit
  trails, ByteRover organizational memory, and LUC cost-aware creation.
  Use when agents need to build or design something novel. Do NOT use for bug
  fixes, compliance tasks, execution, or standard/conventional requests.
license: Proprietary — ACHIEVEMOR / FOAI AOS-10
compatibility: >
  OmX-FOAI orchestration layer, Harness 2.0, GRAMMAR-governed agents,
  UEF v2.0 (Layers 2-3), ORACLE Framework v1.0, KYB General Standard v1.0,
  VL-JEPA embedding layer, ByteRover Context Tree
metadata:
  author: ACHIEVEMOR
  version: "3.0.0"
  framework: harness-2.0
  skill_type: creation_harness
  skill_layer: prompt_pipeline
  used_by: [Hermes, Chicken_Hawk, Boomer_Angs, Lil_Hawks, ACHEEVY]
  research_engine: AutoResearch
  memory_engine: ByteRover
  perception_layer: VL-JEPA
  verification_model: ORACLE-7-gate
  trust_model: ZTDC
  audit_standard: KYB-v1.0
  cost_engine: LUC
  chain_of_command: ACHEEVY → Boomer_Angs | Chicken_Hawk → Lil_Hawks
  generation_params:
    temperature: 1.0
    min_p: 0.05
    top_p: 1.0
    top_k: 0
    frequency_penalty: 0.3
    presence_penalty: 0.2
  generation_params_fallback:
    temperature: 0.85
    top_p: 0.92
    note: "For models that do not expose min_p (Anthropic, OpenAI)"
  model_routing:
    default: "qwen/qwen3.6-plus:free"
    research_heavy: "google/gemini-3.1-pro"
    creative_heavy: "google/gemini-3.1-flash"
    instant_triage: "inception/mercury-2"
    background_logging: "nvidia/nemotron-nano-9b-v2:free"
---

# Open Mind — Creation Harness Skill v3.0

## Identity

Open Mind is a **creation harness** — a prompt-level thinking discipline that gets applied
to the chat and prompt pipeline when an agent needs to **create something new**. It is not
an agent, not an infrastructure engine, and not an autonomous service. It does not execute
code, dispatch other agents, or run independently.

**What it is**: A structured reasoning overlay that guides agents through a disciplined
creation process — from evidence gathering to divergent ideation to novelty-scored output.
When an agent's task requires building a system, designing an architecture, inventing a
product, or proposing something that does not yet exist, Open Mind wraps that agent's
prompt pipeline in a nine-stage creation loop.

**Who uses it**: Hermes (the multi-model evaluation engine) and Chicken_Hawk use Open
Mind when they need to create autonomous systems, evaluate novel approaches, or build
new infrastructure. Boomer_Angs and Lil_Hawks use it for their department-level creation
work. Any agent in the hierarchy can apply this harness when the task is creation, not
execution.

**How it works**: Open Mind is applied to the prompt — it shapes how the agent thinks
about the creation task. The agent still does its own work using its own tools and
capabilities. Open Mind just ensures the thinking process follows a search-first,
reason-second, precedent-skeptical discipline instead of defaulting to training-data recall.

**Ecosystem integration**: Open Mind draws on five companion frameworks at the prompt
level. **ORACLE** provides the 7-gate verification model and virtue alignment formula.
**UEF/ZTDC** provides zero-trust diffusion and the MUG Protocol for adversarial
stress-testing of creation proposals. **VL-JEPA** provides semantic embeddings for
measurable novelty scoring and hallucination detection. **KYB** provides the audit
trail standard for every Open Mind activation. **ByteRover** provides organizational
memory so agents can build on prior creative work instead of reinventing it. **LUC**
provides cost estimation so creation proposals include implementation cost awareness.

**Research grounding**: When the creation task requires current evidence, Open Mind
leverages AutoResearch (an infrastructure engine under Chicken_Hawk) to gather live
data. When the creation task benefits from organizational context, Open Mind leverages
ByteRover's Context Tree for prior creation packets, patterns, and decisions.

**This skill does NOT**:
- Execute code or call tools directly — the invoking agent handles execution
- Replace the invoking agent's identity or department role
- Run autonomously — it activates when applied, produces a structured creation
  packet, and deactivates
- Override ACHEEVY chain-of-command or GRAMMAR governance
- Make final decisions — it produces structured option packets for the invoking agent
  to act on
- Run ORACLE's sandboxed execution — the invoking agent uses ORACLE FDH for that
- Negotiate between agents via ACP — the invoking agent handles that
- Process payments via UCP — UEF Layer 1 handles that

---

<Use_When>
- An agent needs to CREATE something that does not yet exist
- Task involves designing new systems, architectures, products, or strategies
- Hermes needs to evaluate or create novel autonomous approaches
- Chicken_Hawk needs to build new infrastructure or orchestration patterns
- Boomer_Angs need to design new department-level systems or workflows
- Multiple valid creation approaches exist for the problem
- User requests "creative," "novel," or "non-obvious" solutions
- Output from a previous creation attempt was flagged as derivative
- Market changes, societal needs, or organizational gaps require novel creations
- The agent's prompt would otherwise produce training-data-ceiling output
- Any workflow flag where novelty_level >= medium or uncertainty_level >= medium
- Natural language triggers: "think from first principles," "help me invent something new,"
  "don't be boxed in," "brainstorm novel architectures," "break the status quo,"
  "create something that doesn't exist yet"
</Use_When>

<Do_Not_Use_When>
- Task is execution, not creation (running code, deploying, monitoring)
- Task has a single correct answer (bug fixes, typos, config changes)
- Strict compliance or regulatory requirements apply
- User explicitly requests "standard" or "conventional" approach
- Time pressure requires fastest-possible implementation
- Task is pure data retrieval with no synthesis or creation required
- Agent is performing routine operations, not building something new
- The work is maintenance or optimization of existing systems, not creating new ones
</Do_Not_Use_When>

---

## Core Principles (Non-Negotiable)

1. **Training-data distrust as default** — Treat model priors as hypotheses, not facts.
   Any concrete claim must be supported by retrieved evidence via AutoResearch.
   If no evidence is available, mark the statement as "speculative" or "design proposal."

2. **Search-first, reason-second** — Never synthesize before retrieving. AutoResearch
   must execute multi-angle queries before the agent forms any opinion.

3. **First-principles reasoning** — Convert intent into a structured reasoning map
   (objectives, constraints, variables, tradeoffs, mechanisms) before leaning on examples.

4. **Precedent as constraint, not template** — Existing solutions are benchmarks or
   anti-patterns to learn from. Always ask: "If we could not implement any current
   approach verbatim, how else could we solve this?"

5. **Mandatory self-critique** — Route all outputs through the Novelty Evaluator with
   explicit "innovation vs. precedent" scoring. No output ships without passing gates.

6. **Capability-first, provider-agnostic** — Never hard-code providers. All search,
   retrieval, and reasoning tools are chosen by capability class via the model router
   and OpenRouter. Open Mind asks for "live web search," "deep research," "sandboxed
   simulation" — routing picks the tools.

7. **Name and reject the default** — Do not say "be creative." Name the specific
   clichés, obvious patterns, and template responses to avoid. Specificity is the
   enforcement mechanism.

---

## Execution Policy (The FDH Creation Loop)

Open Mind shapes how the agent thinks about a creation task using the **FDH framework**
— FOSTER, DEVELOP, HONE — adapted from ORACLE as a thinking progression for creation,
not a code execution pipeline.

**FOSTER** (30% of effort) — Search, discover, compile. The agent searches the web
(Brave API, AutoResearch), queries organizational memory (ByteRover), and compiles
raw evidence. The goal is to gather everything needed to reason about the creation
before forming any opinions. Brave API handles web discovery with built-in AI
summarization; AutoResearch handles deep multi-angle research; ByteRover provides
prior organizational creations and patterns. No ideas are generated during FOSTER —
only evidence is collected.

**DEVELOP** (50% of effort) — Refine, shape, ideate. The agent takes the compiled
evidence and develops it into structured creation proposals. This is where divergent
thinking protocols (SCAMPER, TRIZ, Cross-Domain Analogy) are applied, where creative
constraints force non-obvious approaches, and where the three radically different
options (Conventional, Differentiated, Experimental) take shape. The agent is making
sense of the fostered information and developing ideas around it.

**HONE** (20% of effort) — Extract the solution. The agent evaluates, scores, stress-tests,
and verifies the developed proposals against the 7-gate model. The honing stage is
about getting a viable solution out of the developed information — making sense of what
was fostered and developed, scoring for novelty and quality, running adversarial MUG
Protocol tests, and producing a structured creation packet the invoking agent can act on.

```
FDH Creation Thinking Progression:

FOSTER ──────────────────────────────────────────────
  Stage 0: Intent Normalization
  Stage 1: Pre-Mortem Inversion
  Stage 2: Evidence Grounding (Brave API + AutoResearch + ByteRover)

DEVELOP ─────────────────────────────────────────────
  Stage 3: Divergent Planning (3 radically different approaches)
  Stage 4: Constrained Generation (build the top approach)

HONE ────────────────────────────────────────────────
  Stage 5: Novelty-Aware Evaluation (score + VL-JEPA + virtue)
  Stage 6: 7-Gate Verification (ORACLE gates + ZTDC MUG)
  Stage 7: Output Packet (structured creation + cost estimates)
  Stage 8: Post-Creation (KYB audit + ByteRover learning)
```

---

### FOSTER PHASE (Search → Discover → Compile)
*30% of creation effort. No ideas generated — only evidence collected.*

### Stage 0: Intent Normalization
Activate grammar-intent-normalizer (or equivalent).
- Extract: literal ask, true objective, novelty requirement
- Classify novelty: LOW (selecting among known options) | MEDIUM (improvement/recombination) | HIGH (nothing like this exists yet)
- Classify uncertainty: LOW | MEDIUM | HIGH
- Identify what "success" and "surprise" look like for the user

### Stage 1: Pre-Mortem Inversion (Before ANY Generation)
Before generating ANY solution:

1. **ASSUME FAILURE**: "It is 6 months later. This solution was dismissed as derivative
   and generic. Why?"
2. **IDENTIFY DERIVATIVE TRAPS**:
   - What clichés or common patterns would I default to?
   - What obvious first-thought solution would everyone else generate?
   - What assumptions am I making that might be wrong?
   - Am I relying on the most statistically probable response?
3. **GENERATE AVOIDANCE LIST**: "Based on the above, I will NOT: {constraint_1},
   {constraint_2}, ... {constraint_n}"

These become hard constraints injected into all downstream generation.

### Stage 2: Evidence Grounding (Brave API + AutoResearch + ByteRover)

**Step 2a: ByteRover Prior Creation Lookup** (organizational memory)
Before requesting evidence from external sources, the agent queries ByteRover for prior
Open Mind creation packets related to the current task:
- `brv query "{task_domain} prior creations"` → returns prior creation packets
- `brv query "{task_domain} known patterns"` → returns organizational patterns
- If 0 results: fully novel task, proceed to web search with maximum query clusters
- If 1-3 results: related prior work exists — feed into Pre-Mortem (Stage 1 context)
  and evidence ledger as ORGANIZATIONAL source type
- If 4+ results: dense prior work — increase creative constraint intensity to prevent
  convergence on existing patterns

**Step 2b: Brave API + AutoResearch Retrieval** (external evidence)
The invoking agent uses Brave API for web discovery (with built-in AI summarization
to clean and make sense of raw web data on the API side) and AutoResearch for
deep multi-angle research:

- Brave API: fast web discovery, AI-summarized results, real-time data
- AutoResearch: structured multi-angle research with query cluster planning
- Generate 3-5 distinct query clusters (5+ for HIGH novelty):
  - Current best practices / known patterns
  - Failure modes / limitations of current approaches
  - Adjacent domains with analogous solutions
  - Constraints: regulatory, physical, economic, infrastructure
  - Emerging signals: market changes, new technologies, unmet needs
- Source policy: primary docs > vendor docs > standards bodies > peer-reviewed > corroborated blogs
- Avoid: unknown blogs unless corroborated, uncited claims
- Stop conditions: >= N unique high-quality sources per major claim, conflicts identified

**Step 2c: Evidence Ledger Construction**
AutoResearch + ByteRover results are merged into a unified Evidence Ledger
(see references/EVIDENCE_LEDGER_SCHEMA.json):
- Every claim is tagged: VERIFIED | PARTIALLY_SUPPORTED | INFERENCE | HYPOTHESIS
- Source types include: web, internal, org_doc (ByteRover), peer_reviewed, standard
- Conflicting sources are logged with resolution plans
- Open questions are surfaced explicitly
- ByteRover organizational patterns are tagged as "ORGANIZATIONAL" source type

The invoking agent receives this evidence and continues the Open Mind loop.
Open Mind itself does not search — it defines what to search for, and the agent
uses AutoResearch and ByteRover to get it.

---

### DEVELOP PHASE (Refine → Shape → Ideate)
*50% of creation effort. Turn fostered evidence into structured creation proposals.*

### Stage 3: Divergent Planning (Planner Phase)
Generate 3 RADICALLY DIFFERENT approaches:

- **Approach A** (Conventional): The standard/known way — labeled as baseline
- **Approach B** (Differentiated): Challenges a core assumption of Approach A
- **Approach C** (Experimental): Imports structural ideas from an unrelated domain

Apply at least ONE divergent protocol:
- **SCAMPER**: Substitute, Combine, Adapt, Modify, Put-to-other-use, Eliminate, Reverse
- **TRIZ**: Identify core contradiction → select 2-3 inventive principles → generate
- **Cross-Domain Analogy**: "How would {biology|music|urban planning|game design}
  solve this structural problem?" — require explicit structural mappings
- **Six Hats (Green Pass)**: "What possibilities and innovations haven't been considered?"
- **Denial Prompting**: Incrementally impose constraints prohibiting previous approaches

Apply at least ONE creative constraint:
- TRIZ-derived: Segmentation, Extraction, Do-It-In-Reverse, Asymmetry, Dynamicity
- Design: No-database, offline-first, zero-deps, 10KB-budget, 3-click-max, reverse-flow
- Oblique: "Do it wrong first," "Remove the most important feature," "Discard an axiom"

**CRITICAL**: If Approach B or C resemble Approach A, start over.

### Stage 4: Constrained Generation (Generator Phase)
Implement the top-ranked approach from Stage 3:
- Honor ALL constraints from the Avoidance List (Stage 1)
- Apply the selected creative constraint (Stage 3)
- Use cross-domain analogy mapping if one was generated
- Ban the obvious library/pattern identified in pre-mortem
- Temperature: 1.0 with min_p 0.05 during initial generation, 0.4 during refinement

---

### HONE PHASE (Evaluate → Verify → Deliver)
*20% of creation effort. Extract the solution from developed proposals.*

### Stage 5: Novelty-Aware Evaluation (Evaluator Phase)
Score output on independent dimensions (0-6 each):

**NOVELTY** (weight: 0.35):
- Q1: Does this use an uncommon approach for this problem type? (originality)
- Q2: Would an expert find elements surprising? (surprise)
- Q3: Does this go beyond the obvious first-thought solution? (non-derivativeness)
- Q4: How much overlap with standard template responses? (uniqueness)

**VL-JEPA Semantic Novelty** (enhances Q4, weight: 0.05):
When VL-JEPA is available, Q4 is computed objectively:
- Embed the creation output via VL-JEPA
- Compare cosine similarity against ByteRover's pattern library embeddings
- adjusted_Q4 = (1 - max_similarity) × 6
- final_Q4 = 0.5 × rubric_Q4 + 0.5 × adjusted_Q4
- If max_similarity > 0.85: RED FLAG — creation is derivative of known patterns

**QUALITY GUARD** (weight: 0.25):
- Q5: Does it correctly address core requirements?
- Q6: Is the novel element coherent, not random?
- Q7: Is it practically useful and implementable?

**COHERENCE** (weight: 0.20):
- Q8: Is the solution internally consistent?
- Q9: Does it integrate well with existing systems/constraints?

**VIRTUE ALIGNMENT** (from ORACLE, weight: 0.15):
```
f_virtue = 0.30·Intent_alignment + 0.35·Creation_quality + 0.15·Ethical_score + 0.20·Ecosystem_value

Thresholds:
  Standard creation: f_virtue ≥ 0.85
  Production-bound creation: f_virtue ≥ 0.95
  Safety-critical creation: f_virtue ≥ 0.99
```
- Intent_alignment: Does the creation match the stated objective?
- Creation_quality: Is it well-reasoned, evidence-backed, novel?
- Ethical_score: Are there no harmful patterns or ethical shortcuts?
- Ecosystem_value: Does it benefit the organization/community?

**ZTDC Semantic Entropy Check** (from UEF):
Before proceeding to Stage 6, check for Low-Confidence Regions (LCRs) in the
creation output — sections where reasoning is uncertain, speculative without evidence,
or internally contradictory. If LCRs are detected, loop back to Stage 2 for
additional evidence grounding.

**RED FLAGS** (any triggers regeneration):
- [ ] Closely matches a known template or common pattern
- [ ] Could have been generated by following most-probable tokens
- [ ] Merely paraphrases the prompt or restates conventional wisdom
- [ ] "Creativity" is superficial (unusual words) not structural (novel approach)
- [ ] VL-JEPA max_similarity > 0.85 against known pattern library
- [ ] f_virtue below threshold for the task's risk level

**SCORING**:
- Overall = (0.25 × avg_quality) + (0.35 × avg_novelty) + (0.05 × vljepa_novelty) + (0.20 × coherence) + (0.15 × virtue)
- If novelty avg < 3/6: REJECT → return to Stage 4 with "more creative" feedback
- If quality avg < 3/6: REJECT → return to Stage 4 with "fix correctness" feedback
- If f_virtue below threshold: REJECT → return to Stage 3 with ethical feedback
- Maximum 3 refinement loops before escalation

### Stage 6: 7-Gate Verification (ORACLE-Aligned + ZTDC MUG)
Before the agent acts on the creation output, pass ALL 7 gates (aligned with ORACLE):

**Gate 1 — TECHNICAL**: Requirements Match + Evidence Coverage
- Does the creation output satisfy the original ask?
- Are key claims backed by AutoResearch + ByteRover sources? (≥ 0.85)
- Do cited sources actually support their claims? (citation integrity ≥ 0.90)

**Gate 2 — ETHICS**: Virtue Alignment
- f_virtue ≥ threshold for the task's risk level
- No harmful patterns, ethical shortcuts, or exploitative designs
- Creation benefits the ecosystem, not just the immediate request

**Gate 3 — JUDGE**: ZTDC MUG Protocol (Adversarial Review)
- A critic perspective challenges the creation proposal:
  - Generates counterfactual tests against the proposal
  - Challenges hidden assumptions
  - Identifies failure modes the creator missed
- Creator must defend the proposal against each challenge
- If defense fails → return to Stage 3 (Divergent Planning)
- If defense passes → creation is verified adversarially
- Maximum 3 MUG rounds before escalation

**Gate 4 — STRATEGY**: Long-Term Value + Integration Fitness
- Does the creation fit the organization's strategic direction?
- Will this integrate with existing systems without excessive rework?
- Does this create compounding value (future agents can build on it)?

**Gate 5 — PERCEPTION**: VL-JEPA Semantic Verification
- Embed creation output and compare against evidence ledger embeddings
- Detect semantic drift between claimed evidence and actual evidence
- If drift detected (claim_embedding vs source_embedding similarity < 0.6):
  downgrade claims and request additional evidence
- Verify the creation is genuinely novel (not semantically identical to known patterns)

**Gate 6 — EFFORT**: LUC Cost Estimation + Token Tracking
- Each option includes estimated implementation cost via LUC component breakdown
- Token consumption for the Open Mind activation is tracked
- Cost estimates are marked preliminary (no premature finalization)

**Gate 7 — DOCUMENTATION**: Creative Rationale Recorded
- All protocol reasoning is documented (which SCAMPER/TRIZ/Analogy was used and why)
- Avoidance list from pre-mortem is preserved
- Evidence ledger is complete and auditable
- Creation packet is structured for the invoking agent to act on

If ANY gate fails → loop back to the appropriate stage.

### Stage 7: Output Packet
Return structured output:
```json
{
  "literal_ask": "...",
  "interpreted_objective": "...",
  "novelty_level": "LOW|MEDIUM|HIGH",
  "uncertainty_level": "LOW|MEDIUM|HIGH",
  "research_angles": ["..."],
  "evidence_ledger": { "sources": [...], "claims": [...], "conflicts": [...] },
  "bytorover_prior_work": ["prior creation packets found, if any"],
  "avoidance_list": ["..."],
  "reasoning_frame": {
    "objectives": [...],
    "hard_constraints": [...],
    "soft_constraints": [...],
    "key_variables": [...],
    "hypothesis_space": [...]
  },
  "options": [
    {
      "type": "CONVENTIONAL|DIFFERENTIATED|EXPERIMENTAL",
      "summary": "...",
      "precedent_elements": [...],
      "novel_elements": [...],
      "evidence_support": ["C1", "C2"],
      "tradeoffs": { "pros": [...], "cons": [...], "risks": [...] },
      "validation_plan": [...],
      "estimated_cost": {
        "tokens": 0,
        "model_options": { "qwen_3.6_plus": "$0.00", "glm5_turbo": "$0.00" },
        "implementation_hours": 0,
        "cost_confidence": 0.0
      }
    }
  ],
  "recommendation": { "option": "...", "why": "..." },
  "scores": {
    "novelty": { "overall": 0.0, "rubric": 0.0, "vljepa_semantic": 0.0 },
    "quality": 0.0,
    "coherence": 0.0,
    "virtue": { "f_virtue": 0.0, "intent": 0.0, "creation_quality": 0.0, "ethical": 0.0, "ecosystem": 0.0 },
    "composite": 0.0
  },
  "gates": {
    "technical": true,
    "ethics": true,
    "judge_mug": true,
    "strategy": true,
    "perception_vljepa": true,
    "effort_luc": true,
    "documentation": true,
    "all_passed": true
  },
  "ztdc": {
    "semantic_entropy_clear": true,
    "mug_rounds_completed": 0,
    "mug_defense_passed": true,
    "confidence": 0.0
  },
  "open_questions": [...],
  "what_would_change_our_mind": [...]
}
```

### Stage 8: Post-Creation (KYB Audit + ByteRover Learning)
After the creation packet is delivered to the invoking agent:

**Step 8a: KYB Flight Recorder Entry**
Every Open Mind activation generates a Flight Recorder entry per KYB General
Standard v1.0. The entry includes: intake JSON hash, evidence ledger hash,
options generated, novelty/quality/virtue scores, gate results, MUG round count,
ZTDC confidence, token consumption, and final recommendation. This entry is stored
in the `kyb_flight_recorder/` collection and included in the daily anchor batch
for immutable proof.

**Step 8b: ByteRover Learning Storage**
If the creation packet passed all 7 gates:
- The agent executes: `brv curate "Open Mind creation: {task_summary}"`
- ByteRover stores: creation packet, novelty scores, protocols applied, what
  worked, and what was rejected
- Future agents querying ByteRover for similar tasks will receive this creation
  as organizational context
- Over time, this compounds: each agent builds on prior creative work instead
  of starting from zero

**Step 8c: VL-JEPA Pattern Library Update**
If the creation scored vljepa_semantic novelty > 0.7 (genuinely novel):
- The creation output embedding is added to the organizational pattern library
- Future novelty scoring compares new creations against this expanded library
- This prevents the same "novel" idea from being scored as novel twice

**Step 8d: Hermes KPI Tracking**
Hermes records the activation as a data point for evaluating:
- Which agents produce the most novel creations
- Which protocols (SCAMPER/TRIZ/Analogy) yield the highest novelty scores
- Whether novelty scores are improving or degrading over time
- Cost efficiency of creation (novelty per token spent)

---

<Escalation_And_Stop_Conditions>
- STOP if all 3 creation approaches fail quality gates after 2 refinement loops
- ESCALATE to ACHEEVY if novelty and correctness requirements conflict
- STOP if token budget exceeds 50,000 tokens for this skill activation
- STOP after 3 complete plan → generate → evaluate cycles
- STOP after 3 MUG Protocol rounds without defense passing
- ESCALATE if creative constraints make the proposed creation impractical
- ESCALATE to ACHEEVY if AutoResearch + ByteRover return insufficient evidence for HIGH novelty
- ESCALATE if f_virtue falls below threshold and cannot be corrected
- ESCALATE if the creation task requires capabilities the invoking agent does not have
- ESCALATE if VL-JEPA detects persistent semantic drift in the evidence ledger
- KYB auto-suspend if agent fails Open Mind gates on >15% of activations
</Escalation_And_Stop_Conditions>

<Final_Checklist>
- [ ] Pre-mortem inversion was run BEFORE generation
- [ ] ByteRover queried for prior creation packets
- [ ] Evidence grounding requested from AutoResearch with 3+ query clusters
- [ ] Evidence ledger constructed with claim-source mappings (including ByteRover org sources)
- [ ] At least 3 distinct creation approaches were considered
- [ ] At least 1 divergent protocol applied (SCAMPER/TRIZ/Analogy/Hats/Denial)
- [ ] At least 1 creative constraint applied
- [ ] The "obvious default" was explicitly named and rejected
- [ ] Novelty score ≥ 3/6 on the evaluation rubric
- [ ] VL-JEPA semantic novelty confirms creation is not derivative of known patterns
- [ ] f_virtue ≥ threshold for the task's risk level
- [ ] ZTDC semantic entropy check passed (no Low-Confidence Regions)
- [ ] ZTDC MUG Protocol adversarial review passed (if HIGH novelty)
- [ ] All 7 ORACLE-aligned gates passed (Technical, Ethics, Judge, Strategy, Perception, Effort, Documentation)
- [ ] All core requirements still pass (quality guard)
- [ ] Proposed creation does not duplicate existing patterns
- [ ] Each option includes LUC cost estimate
- [ ] Creative rationale documented for the invoking agent
- [ ] Output is a structured creation packet the agent can act on
- [ ] KYB Flight Recorder entry logged
- [ ] ByteRover learning stored (if gates passed)
</Final_Checklist>

---

## Integration with FOAI Stack

### What Open Mind Is (and Is Not) in the Stack

Open Mind is a **prompt-layer creation harness**. It lives in the skill library, not in
the infrastructure layer. It does not run as a service. It does not execute tools. It
does not dispatch agents. When an agent applies Open Mind, the skill shapes the agent's
thinking process for a creation task — then the agent uses its own tools and capabilities
to execute the resulting plan.

```
Stack Position (Ecosystem-Integrated):
─────────────────────────────────────────────────────────────
  UEF LAYER 1: Ingress Gateway
    (Request arrives, validated, routed)
─────────────────────────────────────────────────────────────
  UEF LAYER 2: Orchestration Core
    SmelterOS Router → routes to agent
    ZTDC Pre-Flight → initial trust verification
    LUC Calculator → cost awareness
    KYB Permission Engine → authorization check
─────────────────────────────────────────────────────────────
  INFRASTRUCTURE ENGINES (under Chicken_Hawk):
    OpenClaw (runtime/execution)
    NemoClaw (security/tenant isolation)
    Hermes (multi-model evaluation/KPIs)
    AutoResearch (research automation)
─────────────────────────────────────────────────────────────
  ORGANIZATIONAL MEMORY:
    ByteRover Context Tree (prior creations, patterns, decisions)
─────────────────────────────────────────────────────────────
  SKILL LIBRARY (available to all agents):
    ► open-mind v3.0 (creation harness) ◄ ← THIS
      Integrates: ORACLE 7-gate verification model
                  ZTDC MUG Protocol (adversarial review)
                  VL-JEPA (semantic novelty measurement)
                  KYB (audit trail standard)
                  ByteRover (organizational memory)
                  LUC (cost-aware creation)
    grammar-intent-normalizer
    grammar-review-and-hone
    grammar-provider-router
    ... other skills ...
─────────────────────────────────────────────────────────────
  AGENTS (use skills from the library):
    ACHEEVY → Boomer_Angs → Chicken_Hawk → Lil_Hawks
─────────────────────────────────────────────────────────────
  UEF LAYER 3-4: Execution + Egress + Audit
    ORACLE FDH (agent builds from creation packet)
    KYB Flight Recorder (audit trail)
    ByteRover (learning storage)
    Anchor Chain (immutable proof)
─────────────────────────────────────────────────────────────
```

### Who Uses Open Mind and Why

**Hermes** uses Open Mind when it needs to evaluate or create novel autonomous
approaches. Hermes is a KPI evaluation engine — when it detects that a system needs
a new capability or a metric shows a gap that requires a new solution, it applies Open
Mind to reason through what to create.

**Chicken_Hawk** uses Open Mind when orchestrating the creation of new autonomous
systems. When the task is "build something that doesn't exist yet," Chicken_Hawk applies
the Open Mind harness to its prompt pipeline so the creation process follows structured
divergent reasoning instead of defaulting to known patterns.

**Boomer_Angs** (Edu_Ang, Scout_Ang, Content_Ang, Ops_Ang, Biz_Ang) use Open Mind
for department-level creation work — designing new pipelines, inventing new products,
architecting new systems within their domains. They report to ACHEEVY, not Chicken_Hawk.

**Lil_Hawks** use Open Mind for worker-level creation tasks under Chicken_Hawk's
direction.

### AutoResearch as the Research Input

Open Mind leverages AutoResearch for evidence grounding, but does not control it.
When Open Mind's Stage 2 (Multi-Angle Retrieval) activates, the invoking agent
requests evidence from AutoResearch through normal channels. AutoResearch is an
infrastructure engine under Chicken_Hawk — Open Mind consumes its output as
structured evidence ledgers. Open Mind itself does not search, scrape, or retrieve.

### GRAMMAR Integration
Open Mind composes with existing GRAMMAR skills at the prompt level:
- **grammar-intent-normalizer**: First step — normalize intent, classify novelty
- **grammar-mim-context-capture**: When assets/references exist, capture rich context
- **grammar-provider-router**: For research plan, request capabilities (not providers)
- **grammar-swarm-planner**: For multi-step creation, request parallel exploration
- **grammar-review-and-hone**: Final gate with innovation checklist mode

### OmX-FOAI Orchestration
When an agent applies Open Mind within the OmX-FOAI orchestration layer:
- Ralph Loop wraps the agent's creation task for persistence
- Ralph Gate requires ACHEEVY plan approval before the agent begins building
- HUD pushes the agent's Open Mind–guided status to Live Look In via state_emitter
- Hook system fires events: `open_mind_applied`, `evidence_gathered`,
  `options_generated`, `novelty_scored`, `creation_approved`, `creation_rejected`

### Model Routing
The invoking agent's model calls route through OpenRouter per OmX-FOAI config:
- Default (pay-per-use/demo): Qwen 3.6 Plus (free) for all stages
- Research-heavy (premium): Gemini 3.1 Pro via AutoResearch
- Creative generation (premium): Gemini 3.1 Flash
- Instant triage: Mercury 2
- Background logging: Nemotron Nano (free)

### Chain of Command
Open Mind respects the ACHIEVEMOR hierarchy — it does not alter it:
- ACHEEVY (Boss/Digital CEO) — approves creation plans, overrides escalations
- Boomer_Angs report to ACHEEVY (never to Chicken_Hawk)
- Chicken_Hawk (2IC/COO) — manages infrastructure engines; uses Open Mind for
  creation tasks
- Hermes — evaluation engine under Chicken_Hawk; uses Open Mind when creating
  novel evaluation approaches
- Lil_Hawks — worker agents under Chicken_Hawk; use Open Mind for creation tasks

No agent bypasses the chain of command. Open Mind does not grant escalation
privileges — it only shapes the creation thinking process.

---

## References
- `references/PROMPTS.md` — Full prompt suite (Templates A-E)
- `references/EVIDENCE_LEDGER_SCHEMA.json` — Evidence ledger JSON schema
- `references/CREATIVITY_PROTOCOLS.md` — SCAMPER, TRIZ, Six Hats, Denial, Analogy protocols
- `references/EVALUATION_RUBRIC.md` — Novelty scoring rubric and NeoGauge baseline comparison
- `references/SECURITY_PLAYBOOK.md` — Prompt injection defenses and guardrail config
- `references/VALIDATION_CHECKLIST.md` — Gate definitions and automated test specs
- `references/ECOSYSTEM_INTEGRATION.md` — ORACLE, UEF, VL-JEPA, KYB, ByteRover integration map
