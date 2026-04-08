# Sigma / Lean / Kaizen Terms — Synonyms Glossary

Source: Rish's Sigma Terms doc, ingested 2026-04-08.
Use: ACHEEVY uses this for term-disambiguation when users mix Lean / Six Sigma / Agile vocabulary.

These terms are often used interchangeably; this glossary documents the synonyms so the system can normalize them in user prompts.

---

| Canonical term | Synonyms |
|---|---|
| **Continuous Improvement Cycle** | Continuous Improvement Process, Kaizen Cycle |
| **Value Flow** | Value Stream, Value Chain, Value Delivery Process |
| **Value Stream Mapping** | Value Stream Map, Value Chain Map, Process Map |
| **Continuous Delivery** | Continuous Deployment, Continuous Release |
| **Kaizen Events** | Continuous Improvement Workshops, Process Improvement Sessions |
| **Agile Sprint Reviews** | Iteration Reviews, Release Reviews |

## Continuous Improvement Feedback Form (Needs Analysis)

A.I.M.S.-branded Paperform variant. Used by Boomer_COO when running process-improvement engagements with customers.

1. **Continuous Improvement Cycle (CIC)** — Briefly describe your organization's CIC: a systematic approach to improving processes, products, or services. It involves identifying areas for improvement, implementing changes, and evaluating results.
2. **Value Flow (VF)** — Walk through your organization's VF: the path a product or service takes from conception to delivery. Identify the value added at each step and any actions that don't add value.
3. **Value Stream Mapping (VSM)** — How does your organization approach VSM: visualizing and analyzing flow of materials and information to identify waste?
4. **Continuous Delivery (CD)** — How does your organization approach CD: software delivery in small, frequent releases with automated pipelines?
5. **Kaizen Events (KE)** — Have you held any KE recently? Short-term focused improvement activities. If so, what were the results?
6. **Agile Sprint Reviews (ASR)** — How does your organization approach ASR: reviewing sprint progress and feeding learnings into future sprints?
7. **Satisfaction (1-10)** — How satisfied are you with your continuous improvement processes?
8. **Suggestions** — Based on your experience, what would you improve?

## How ACHEEVY uses this

When a user prompt contains Lean/Sigma/Agile vocabulary, the Grammar engine normalizes synonyms via this glossary so downstream agents work from the same canonical term. Reduces miscommunication when consultants and engineers discuss the same concept with different words.
