# Coastal Brewing Co. — Agent Org (Google ADK)

> Production agent definitions for Coastal Brewing Co., authored on Google's Agent Development Kit (`adk` v1.31.1+). Two PMOs, one human in the loop.

## Org chart

```
                  Jarrett Risher (HITL · sole human approver)
                              │
                              │ governs via Telegram @CoastalBrewBot + AuditLedger
              ┌───────────────┴────────────────┐
              ▼                                ▼
      Operations PMO                   Marketing PMO
      (client-facing, sales)           (back office, Illumin clone)
              │                                │
        Sal_Ang                           Melli Capensi
        (Boomer_Ang, sales lead)          (Honey Badger, Sett PMO head)
                                               │
                       ┌───────────────────────┼────────────────────────┐
                       ▼                       ▼                        ▼
                 Funnel Architect       Programmatic Lead         Creative Director
                 Meles Mehli            Taxi Dea                  Ana Kuma
                       │                       │                        │
                  ─── 12 BG'z (full Sett roster, per charter §6) ──────────────
                  Meles · Taxi · Arcto · Ana · Leu · Moscha
                  Persona · Orien · Eve · Cuc · Java · Mar Ché
```

- **Operations PMO** — client-facing, sales-focused. Sal_Ang is the first member; the team grows as the venture scales.
- **Marketing PMO** — the back office; designed as an Illumin clone (unified-journey advertising platform). Melli Capensi heads the PMO. The 12 BG'z report to Melli, not to Chicken Hawk (per Sett charter §3).
- Both PMOs route every action through the existing Chicken Hawk gateway → NemoClaw policy gate → AuditLedger. ADK is the *agent factory*; Chicken Hawk is the *runtime orchestrator*; NemoClaw is the *policy gate*; AuditLedger is the *audit trail*. Four-layer separation — non-negotiable.

## Run locally

```bash
# install deps (one-time)
pip install google-adk

# set env (one-time)
cp .env.example .env
# edit .env to set GOOGLE_API_KEY

# run an individual agent interactively
adk run operations_pmo/sal_ang
adk run marketing_pmo/melli_capensi

# or run the FastAPI/Web UI
adk web .
```

On Windows: prefix with `PYTHONIOENCODING=utf-8` if you see `UnicodeEncodeError` on cp1252 consoles.

## Production wiring

These agents are designed to delegate execution to **Chicken Hawk** (`https://hawk.foai.cloud/chat`) for any tool call that touches money, suppliers, public claims, or compliance. Their local Spinner tool stubs are the negotiation/dialog surface; the real-world side effects happen behind the gateway. See `shared/chicken_hawk.py` and `shared/nemoclaw.py`.

Audit receipts for every executed action are written to **AuditLedger** (currently SQLite at `~/foai/coastal-brewing/audit_ledger/coastal_brewing.db`, migrating to Neon). See `shared/audit_ledger.py`.

## Reference assets

- **Sal_Ang character** — `~/foai/coastal-brewing/refs/characters/sal_ang.png` — coastal pop-up market scene, "SAL" copper visor, white linen, masked, pour-over kettle. Sal is **always client-facing, in the field**.
- **Melli Capensi character** — `~/foai/coastal-brewing/refs/characters/melli_in_office.png` — branded Coastal Brewing office, dark wood, blazer with chevrons + Coastal patch, focused at her desk. Melli is **always in the back office** (per owner directive 2026-04-26).
- **The Sett canonical charter** — `~/foai/coastal-brewing/refs/badgers/THE_SETT_CHARTER.md` — taxonomy, seeded colony, role, BARS dialect, signature stanza, and Entandra contributions for every BG.

## Adding a new agent

1. `mkdir agents/<pmo>/<agent_name>` with `__init__.py` exposing `agent` and `agent.py` defining `root_agent: LlmAgent`.
2. Document role + Spinner kit at the top of `agent.py`.
3. Wire any new tools through `shared/spinner_tools.py` so every call goes through Chicken Hawk + NemoClaw + AuditLedger.
4. Add the agent to its PMO's roster (`operations_pmo/__init__.py` or `marketing_pmo/melli_capensi/agent.py` `sub_agents=[...]`).
5. Update the org chart in this README.

## Memory pointers

- `feedback_design_extracted_from_owner_reference_images.md` — every visual decision traces to owner reference images.
- `project_vast_ai_gpu_and_gemini_cli_ecosystem_2026_04_26.md` — Vast.ai = GPU substrate; this folder = the Gemini CLI / ADK ecosystem build.
- `project_coastal_sett_marketing_2026_04_25.md` — The Sett is the Marketing PMO; Sales is the Operations PMO.
