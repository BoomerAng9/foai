# Policy

Policy dictates the boundaries and laws within GRAMMAR, enforced primarily by the **MIM Governance layer**.

## Governance Pillars

1. **Authority (Gatekeeping)**: Pre-checks user authority and tenant quotas before spawning costly or sensitive tools.
2. **Resource Constraints**: Monitors Redis-based rate limits before advancing multimodal operations (Vision, Voice).
3. **Blacklists**: Hard blocks specific queries or sub-actions (sensitive domains, irreversible PR merges) requiring secondary biometric or MFA checks.
4. **Approval Ledger**: Enforces that Every Change Order modifying the environment state requires strict manual intervention (the "Y" gate).

## Traceable Operations
Success is not a claim but a proof. Policy mandates that agents must provide:
- **Evidence**: Visual or textual proof of action.
- **Traceability**: Linkage to the originating MIM Context Pack.
- **Reversibility**: Where possible, operations must include a rollback path.

MIM interprets policy to decide whether to route a request to ACHEEVY or block it at the gate.

