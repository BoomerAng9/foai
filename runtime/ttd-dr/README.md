# runtime/ttd-dr — Test-Time Diffusion Deep-Researcher

Python FastAPI service that runs the **Think → Test → Decide → Do →
Review** diffusion loop defined in
`docs/canon/ACHEEVY — TTD-DR Module Specification.pdf`. Fires at
RFP → BAMARAM Steps 2, 4, 5, 6 when a research-backed answer is required.

## Core loop (k = 0 … K)

1. **Think** — Load Context Pack (Charter excerpt, prior Completion
   Summary, policies). Emit task plan with MLE-STAR mapping.
2. **Test** — Source-grounded assertions. Each step specifies which
   artifact/API verifies success. Pre-score confidence.
3. **Decide** — Option matrix (IIR + KNR + cost bands). Choose option
   satisfying governance + user constraints.
4. **Do** — Orchestrated tool calls via the Responses API. Schema-strict
   I/O. RAG before every generative step.
5. **Review** — Verification battery. Pass/fail with evidence. Write
   ICAR + metrics. If thresholds unmet → open FDH ticket and raise k.

**Confidence gate:** any claim below 0.70 cannot appear in customer
surfaces. If the cycle's confidence exits below 0.85, a follow-up cycle
is required or an FDH ticket is opened.

## Where it fires in RFP → BAMARAM

| Stage | Role |
|---|---|
| Step 2 (RFP Response) | Grounds Four-Question Lens + SWOT with evidence |
| Step 4 (Technical SoW) | Justifies DMAIC vs DMADV decision + arch choices |
| Step 5 (Formal Quote) | Back-fills cost/benefit analysis for tier pricing |
| Step 6 (Five Use Cases Pack) | Evidence-grounded use cases + KPI estimates |

## Scope of this PR

**Scaffold only** — the orchestration skeleton + persistence layer + API
surface. The actual LLM calls inside each phase are placeholders; wiring
them to Gemini 3.1 Flash + the Responses API is a follow-up. What ships
here:

- `main.py` — FastAPI app with `/cycle`, `/run`, `/health`.
- `core.py` — the diffusion loop engine. Calls stubbed phase functions
  in order and writes each cycle to the Ledger.
- `schemas.py` — pydantic models matching `@aims/contracts/ledger-schema`
  `TtdDrCycle` shape. Runtime validation before every DB write.
- `ledger.py` — postgres writes to `ledgers.ttd_dr_cycles` +
  `ledger_entries` (ICAR entries per cycle).
- `auth.py` — HMAC-signed internal service auth (same pattern Spinner
  uses for bot-sig verification — never wired to public surface).
- `requirements.txt`, `Dockerfile`, `setup.sh` — deploy parity with
  `runtime/spinner/`.

## What this does NOT do

- No LLM calls yet. Each phase function returns structurally-valid
  placeholder data. Real inference lands when Gemini 3.1 Flash is wired.
- No RAG index. `_run_rag` stub returns an empty evidence array until
  the FOAI Gemini File Search integration lands.
- No public endpoints. Service assumes a private mesh caller; HMAC
  required on every request.
- No CLI runner. Exercise via `curl` from inside the mesh, or mount a
  Python test harness in a follow-up.

## Environment

- `TTD_DR_DATABASE_URL` (fallback chain: `CONTRACTS_DATABASE_URL` →
  `NEON_DATABASE_URL` → `DATABASE_URL`)
- `TTD_DR_HMAC_SECRET` — shared with calling services (ACHEEVY,
  Picker_Ang) for request authentication
- `TTD_DR_MAX_CYCLES` — default 5; hard cap per engagement-stage
- `TTD_DR_CONFIDENCE_THRESHOLD` — default 0.85

## Cross-references

- `docs/canon/ACHEEVY — TTD-DR Module Specification.pdf` — full spec
- `docs/canon/sivis_governance.md#fdh-loop--self-evolution-cycle` — FDH
  trigger semantics
- `@aims/contracts/ledger-schema` — `TtdDrCycle`, `IcarEntry` target
  shapes
- `runtime/spinner/` — deploy pattern this service mirrors
