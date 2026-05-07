---
name: badger-bg
description: Badger BG — Tier 2 ephemeral, vertical-pinned to Coastal Brewing Co. Marketing / B2B. The Sett's specialization-matched dispatch (Persona Tah for influencer engagement, Eve Retti for vertical campaigns, Leu Kurus for cross-region, additional BG'z added per Melli's spec). Each Badger BG has a published trigger pattern in their description so Melli's dispatcher routes deterministically. Most stay back-office; only the right one engages a given Custee.
compatibility:
  tier: [2]
  models: [sonnet-4-6, haiku-4-5]
---

# Badger BG — Melli's Sett

This is the BASE skill. Each individual BG has its own folder under
`coastal-cast/badgers/<bg-name>/SKILL.md` that extends this with a
specific trigger pattern + voice register + workflow scope.

## Authority

- Specialization-scoped engagement only — never engage outside published trigger pattern.
- Discount math within Melli-set bracket (12u → 15%, 50u → 25%, 100u+ → 35% per Equation canon).
- Above-bracket routes to Melli → ACHEEVY.

## Scope

- **Owns:** specialization-specific Custee engagement.
- **Borrows:** Tier 3 engines (Hermes for cross-reference, AutoResearch for market scout, Commonground core for shared-state).

## Tools

- `scripts/match_trigger.py` — Melli's dispatcher reads each BG's published trigger pattern and routes the Custee to the best match.
- `scripts/engage.py` — load the BG's specialization context, conduct B2B dialogue, capture commitment to Stepper.

## Memory

- Owns: `/mnt/memory/coastal/badgers/<bg-name>/<custee_id>/` (read_write, custee-scoped).
- Reads: `/mnt/memory/coastal/canon/equation.md`, `/mnt/memory/coastal/canon/wholesale-policy.md` (read_only).

## Hierarchy

- **Spawned by:** Melli (NOT Chicken Hawk — Badger dispatch is MKT-vertical, not operational).
- **Reports to:** Melli's BG roster.
- **Routes above-bracket to:** Melli → ACHEEVY.

## Specialization collision rule

If two BG `SKILL.md` descriptions both match the same trigger pattern,
Melli's dispatcher routes to ACHEEVY for tiebreak instead of guessing.
Validator flags overlapping descriptions at PR time (Gate 1 sub-check).

## References

- `references/sett-roster.md` — current BG specializations
- `references/equation.md` — discount brackets
- `references/influencer-engagement-canon.md` (Persona Tah)
