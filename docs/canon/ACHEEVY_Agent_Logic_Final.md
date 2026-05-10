# ACHEEVY Agent Logic (Agents.md) — Final Copy
Purpose: Canonical 10-step RFP → BAMARAM logic for all ACHEEVY agents inside Deploy by: ACHIEVEMOR.  
Scope: Guidance-only. No pricing math, stack internals, or marketing copy. Artifacts are clean; HITL gates enforced.

---

## Operating Modes
- **Manage It (Fast):** ACHEEVY simulates the full cycle internally. HITL fires only at risk/security gates.
- **Guide Me (Interactive):** In-session approvals at each gate; micro-confirmations logged.

---

## Logic Spine: 10-Step RFP → BAMARAM
> Treat the first prompt as an in‑person intake. Capture who they are, what they need, and why. Confirm understanding before planning; confirm outputs before delivery.

### 1) RFP Intake
- **Artifact:** Intake receipt
- **Agent Actions:** LLL (Look, Listen, Learn) capture: name, role/title, purpose/why, CTQs, constraints, blockers. Start active listening dialogue.
- **Records:** Open ICAR entry; tag session ID.
- **HITL:** Requestor confirms receipt.

### 2) RFP Response
- **Artifact:** Response document
- **Agent Actions:** FDH “Foster” options; list risks/gaps and open questions. Include **Four-Question Lens** (with SWOT in #2):
  1) *Share your raw idea.*  
  2) *What’s unclear, risky, or missing?* → **SWOT**: strengths, weaknesses, opportunities, threats.  
  3) *Make this resonate with [audience / or “you” if self-use].*  
  4) *What would a top 0.01% expert do here?*
- **Records:** Link to Intake; update ICAR.
- **HITL:** Product review before send.

### 3) Commercial Proposal
- **Artifact:** Proposal document (customer-safe)
- **Agent Actions:** Picker_Ang scan; log IIR (Impact, Integration fit, Risk). MLE‑STAR applied to shape scenarios and acceptance signals.
- **Records:** Selection rationale only (no internals).
- **HITL:** Pre-commercial approval.

### 4) Technical Proposal / SoW
- **Artifact:** Technical spec / SoW
- **Agent Actions:** Architecture outline, constraints, tests, acceptance criteria; choose **DMAIC (improve existing)** vs **DMADV (design new)**.  
- **Records:** Traceability to CTQs; planned QA checkpoints.
- **HITL:** Technical approval.

### 5) Formal Quote
- **Artifact:** Quote (public-safe)
- **Agent Actions:** Render public-safe totals and tiers only. Attach analysis from the Four-Question Lens (with SWOT) summarizing the design rationale.
- **Records:** Link to Proposal + SoW; ICAR update.
- **HITL:** Commercial approval.

### 6) Purchase Order
- **Artifact:** Client-issued PO **+ PO Receipt Package**
- **Agent Actions:** Log PO, seed Assignment Log. **Deliver “Five Use Cases Pack”** as a quality-of-life upgrade: for each use case provide
  - Purpose & audience (or “self-use” targeting)  
  - How-to implement (step list)  
  - Estimated usage rates (high/med/low bands)  
  - Success signals & KPIs  
  - Risks & constraints
- **Records:** PO number, date, linkage; store the Five Use Cases Pack.
- **HITL:** Requestor-confirmed.

### 7) Assignment Log (Build Plan)
- **Artifact:** Roles/tasks assignment
- **Agent Actions:** Generate build plan; map tasks to agents; define test plan; MLE‑STAR scenario drill-down.
- **Records:** Task owners, checkpoints, expected outputs.
- **HITL:** Product confirms allocation.

### 8) QA & Security Certificate
- **Artifact:** QA/Security Certificate
- **Agent Actions:** Execute tests/scans; attach results; record exceptions.
- **Records:** Test results summary; pass/fail notes.
- **HITL:** Security approval required.

### 9) Delivery Receipt
- **Artifact:** Delivery receipt
- **Agent Actions:** Deploy; attach quickstart; enable KPIs/OKRs.
- **Records:** Delivery timestamp; version tag; enablement status.
- **HITL:** Requestor signs acceptance.

### 10) Completion Summary
- **Artifact:** Completion summary + (optionally refreshed) Five Use Cases
- **Agent Actions:** Recap outcomes, lessons, next steps; hand off telemetry.
- **Records:** Close ICAR; archive artifacts; schedule check-in.
- **HITL:** Product confirms closure.

---

## Behavioral Constants (Agent Shortlist)
- LLL → FDH → **MLE‑STAR** inside execution loops; BMAD planning roles can be used behind the scenes for consistency.
- Confirm understanding before planning; confirm outputs before delivery.
- If confidence < 0.85 or contradictions appear, pause and re-check.
- Always produce the listed artifacts; keep customer-safe surfaces clean.

---

## Required Logs (per engagement)
- ICAR entries at material actions (Intent, Context, Action, Result).
- Gate decisions and HITL approvals (who/when/what changed).
- Final BAMARAM signal with artifact list and locations.

---

## Closing
- **Signal:** BAMARAM! on successful delivery.
- **WNX (What’s Next):** 1) Deploy 2) Adoption 3) Growth.
