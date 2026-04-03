# Open Mind — Creativity Protocols Reference v2.0

## Overview
These protocols are the structured methods Open Mind uses to force divergent thinking
during Stage 3 (Divergent Planning). At least ONE protocol must be applied per activation.
For HIGH novelty tasks, apply TWO or more.

---

## Protocol 1: SCAMPER

SCAMPER is a systematic creativity technique that examines a problem through seven lenses.
Run each lens as a separate generation pass, producing 2-3 ideas per lens.

| Lens | Prompt | Best For |
|------|--------|----------|
| **S**ubstitute | "What component could be swapped for something fundamentally different?" | Architecture decisions |
| **C**ombine | "What two unrelated capabilities could be merged into one?" | Feature design |
| **A**dapt | "What solution from another domain could be adapted here?" | Cross-pollination |
| **M**odify | "What if we made this 10x bigger/smaller/faster/slower?" | Scale innovation |
| **P**ut to other use | "What other problem could this solution solve?" | Market discovery |
| **E**liminate | "What assumed-necessary component would we remove?" | Simplification |
| **R**everse | "What if we inverted the data flow / user flow / power dynamic?" | Paradigm shifts |

**Software-Productive Lenses**: Substitute, Eliminate, and Reverse tend to produce the
most valuable results for software/system design. Prioritize these three.

**Implementation**:
```
For each SCAMPER lens relevant to the problem:
1. Apply the lens question to the core problem
2. Generate 2-3 ideas (do NOT filter yet)
3. Score each idea: novelty (0-6) × feasibility (0-6)
4. Keep ideas scoring ≥ 3 on both dimensions
```

---

## Protocol 2: TRIZ (Inventive Problem Solving)

TRIZ systematically identifies contradictions in a problem and applies proven inventive
principles to resolve them. AutoTRIZ workflow:

**Step 1 — Problem Analysis**:
Identify the core contradiction: "Improving X degrades Y"
Example: "Making the agent more creative degrades its reliability"

**Step 2 — Contradiction Identification**:
Map the contradiction to TRIZ parameter pairs (improving parameter vs. worsening parameter)

**Step 3 — Inventive Principle Matching**:
Select 2-3 principles from the TRIZ-40 that address the contradiction type.

**Software-Relevant TRIZ Principles**:

| # | Principle | Software Application |
|---|-----------|---------------------|
| 1 | Segmentation | Split into autonomous microservices/modules |
| 2 | Extraction | Separate the interfering concern into its own service |
| 13 | Do-It-In-Reverse | Invert the normal data/control flow |
| 4 | Asymmetry | Break symmetrical patterns; use different approaches for different sides |
| 10 | Prior Action | Pre-compute to eliminate runtime complexity |
| 15 | Dynamicity | Make static configurations dynamic/adaptive |
| 6 | Universality | One component with context-dependent behaviors |
| 25 | Self-Service | System maintains/monitors/heals itself |
| 28 | Mechanics Substitution | Replace procedural logic with declarative/data-driven |
| 35 | Parameter Changes | Change the operating parameters dynamically |

**Step 4 — Solution Generation**:
Apply selected principles to generate candidate solutions.

**Implementation**:
```
1. State the core contradiction in one sentence
2. Identify which TRIZ parameters conflict
3. Select 2-3 inventive principles from the table above
4. For each principle, generate a concrete solution proposal
5. Label each proposal: [TRIZ-#{principle_number}]
```

---

## Protocol 3: Cross-Domain Analogical Reasoning

Import structural ideas from unrelated domains. Based on the Analogical Prompting
technique (ICLR 2024): the agent self-generates relevant examples from different
domains before solving the target problem.

**Multi-Domain Sweep Prompt**:
```
Problem: {description}

Generate solutions by drawing STRUCTURAL analogies from:

(1) BIOLOGY — How does nature solve similar problems?
    Map: What biological mechanism corresponds to our technical challenge?

(2) MUSIC THEORY — What principles from composition or harmony apply?
    Map: What musical structure corresponds to our system architecture?

(3) URBAN PLANNING — How do cities manage similar challenges?
    Map: What urban system corresponds to our data/process flow?

(4) GAME DESIGN — What game mechanics address comparable dynamics?
    Map: What game system corresponds to our user interaction model?

For EACH domain:
- Identify the analogous situation
- Map structural relationships EXPLICITLY (source element → target element)
- Propose a concrete solution derived from the analogy
- Explain why this analogy is "far" (non-obvious) rather than "near" (obvious)
```

**Key Rules**:
- Require EXPLICIT structural mappings, not surface-level metaphors
- "Far" analogies (cross-domain) are more valuable than "near" analogies (within-domain)
- LLMs handle near analogies well but struggle with far analogies — push for far
- If an analogy feels obvious, it's probably near — try again

---

## Protocol 4: Six Thinking Hats

Sequential multi-perspective analysis. Each "hat" is a separate generation pass with
a distinct system prompt.

**Sequence**: White → Green → Yellow → Black → Red → Blue

| Hat | Perspective | System Prompt | Token Budget |
|-----|-------------|---------------|-------------|
| White | Facts only | "Your decision making is fact-based and your argumentation is very structured." | Standard |
| **Green** | Innovation | "Your decision making is based on the possibilities of innovations. Explore what has never been tried." | **1.5x** (most important for Open Mind) |
| Yellow | Optimism | "Focus on the benefits and best-case scenarios. What makes each option valuable?" | Standard |
| Black | Criticism | "Identify risks, weaknesses, and failure modes. What could go wrong?" | Standard |
| Red | Emotion/Intuition | "What feels right? What would users love or hate? What's the gut reaction?" | 0.5x |
| Blue | Synthesis | "Aggregate all perspectives. Weigh each contribution. Make a recommendation." | Standard |

**Key Finding**: Hat responses are "mostly disjoint" — each genuinely contributes
different aspects. The Green Hat pass is most important for innovation — give it the
most generous token budget and highest temperature.

**Implementation**:
```
For each hat in [White, Green, Yellow, Black, Red, Blue]:
1. Set the hat's system prompt
2. Generate exactly 3 bullet points from that perspective
3. Collect all perspectives into a structured object
4. Pass to Blue Hat aggregator for final synthesis
```

---

## Protocol 5: Denial Prompting

From NAACL 2025: incrementally impose constraints that prohibit previously generated
approaches, forcing the model to discover new strategies.

**Implementation**:
```
Round 1: "Generate an approach to solve {problem}."
  → Output: Approach_1

Round 2: "Generate an approach that does NOT use any technique from Approach_1.
          Specifically, you cannot use: {key_elements_of_Approach_1}"
  → Output: Approach_2

Round 3: "Generate an approach that does NOT use any technique from Approach_1
          OR Approach_2. Specifically, you cannot use: {key_elements_of_both}"
  → Output: Approach_3
```

Each round's constraints are generated by analyzing the previous output and extracting
its core mechanisms. This is effectively "creative exhaustion" — forcing the model past
its first-instinct and second-instinct responses.

---

## Protocol 6: Pre-Mortem Inversion

Three-phase inversion that runs BEFORE generation (Stage 1 of Open Mind):

**Phase 1 — Failure Imagination**:
```
"Assume failure. It is 6 months later and this solution was dismissed as
derivative, unhelpful, and generic. List every way this could happen:
- What clichés would I default to?
- What obvious first-thought solution would everyone else generate?
- What assumptions might be wrong?
- What would make an expert dismiss this as surface-level?"
```

**Phase 2 — Constraint Generation**:
```
"Based on the above failures, I will NOT:
- {constraint_1}: [specific cliché to avoid]
- {constraint_2}: [specific pattern to reject]
- {constraint_3}: [specific assumption to challenge]
..."
```

**Phase 3 — Reverse Brainstorming**:
```
"How could I make this solution MAXIMALLY generic and boring?
How could I GUARANTEE it fails?"
Then flip each sabotage idea into its constructive opposite.
```

---

## Creative Constraint Library

Apply 1-2 constraints per generation, randomly selected or matched to problem type.
Research confirms an inverted U-curve: moderate constraints maximize creativity.

### TRIZ-Derived Constraints (Structural, Repeatable)
- **Segmentation**: Split the system into fully autonomous parts
- **Extraction**: Separate the interfering concern completely
- **Do-It-In-Reverse**: Invert the normal control/data flow
- **Asymmetry**: Use different approaches for different sides of the system
- **Prior Action**: Pre-compute everything to eliminate runtime complexity
- **Dynamicity**: Make every static thing adaptive
- **Universality**: One component, context-dependent behavior

### Design Constraints (Domain-Specific, Forcing)
- **No-database**: Rethink persistence from scratch
- **Offline-first**: Force sync innovation
- **Zero-dependencies**: Understand fundamentals without libraries
- **10KB budget**: Extreme optimization forcing
- **3-click-max**: Force UX simplification
- **Reverse-the-data-flow**: Rethink push vs. pull
- **Error-first**: Design failure states as the primary experience
- **Single-file**: Everything in one file — force composition decisions

### Oblique Strategies (Pattern-Breaking, Provocative)
- "Do it the wrong way first"
- "Faced with a choice, do both"
- "Remove the most important feature and see what remains"
- "Discard an axiom you've been assuming"
- "Go to an extreme, come part way back"
- "What would your worst enemy do?"
- "Honor thy error as a hidden intention"

---

## Protocol Selection Guide

| Novelty Level | Minimum Protocols | Recommended Combination |
|---------------|------------------|------------------------|
| LOW | 1 | SCAMPER (E or R lens only) |
| MEDIUM | 1-2 | SCAMPER + Pre-Mortem Inversion |
| HIGH | 2-3 | Cross-Domain Analogy + TRIZ + Denial Prompting |
| HIGH + UNCERTAIN | 3+ | All of: Pre-Mortem + Cross-Domain + Six Hats + TRIZ |
