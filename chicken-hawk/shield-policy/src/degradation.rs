//! Degradation Spectrum — Graceful Fail-Soft (v1.6 §2.2 / P1 #3)
//!
//! Latency (Lil_Pulse_Hawk) owns this component per the YAML.
//! Replaces the v1.5 binary Emergency Sync-Shedding with a four-stage
//! autonomic throttle that scales check DEPTH with compute availability
//! while NEVER bypassing security for actions that matter.
//!
//! The core invariant (v1.6 §2.2):
//!   The system never BYPASSES security. It scales the DEPTH of the
//!   check to match availability of compute. Even Mode 3 Survival
//!   preserves the five formally verified kernel components — those
//!   run always.
//!
//! The innovation is Tiered Consensus in Mode 2 Degraded:
//!   Low-risk    → 1-instance syntactic policy check, no observer quorum
//!   Medium-risk → 2-of-3 syntactic consensus
//!   High-risk   → ALWAYS full 3-instance consensus + CIA
//!
//! The rest of the machinery (mode transitions, shadow pipeline
//! orchestration, sync pipeline shedding) lives in Latency's runtime
//! owner — this module defines the pure structural predicates those
//! systems compose on top of.

use crate::types::RiskLevel;

// ─── four operational modes ───────────────────────────────────────

/// v1.6 §2.2 Degradation Spectrum modes. Higher ordinal = more
/// degraded. Transitions upward (toward more degraded) require
/// 2-of-3 consensus (Latency + Chicken Hawk + Sentry); transitions
/// downward (toward less degraded) are immediate.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub enum OperationalMode {
    /// Mode 0: full sync, all rules active, 3-instance quorum, full
    /// semantic eval. Baseline operation.
    Nominal,
    /// Mode 1: full sync for critical rules, non-critical rules
    /// async. 3-instance quorum still active. Slight latency on
    /// some detections.
    Congested,
    /// Mode 2: sync only for high-risk actions, detection rules
    /// async. TIERED consensus — low-risk 1-instance, medium
    /// 2-of-3, high-risk always 3-of-3 + CIA.
    Degraded,
    /// Mode 3: passive-defensive only. No new offensive operations.
    /// No new agentic capabilities. Formally-verified Rust-core
    /// maintains isolation. Triggers P0 incident + Platform Owner
    /// HITL notification.
    Survival,
}

// ─── consensus depth decision ────────────────────────────────────

/// The consensus-depth decision for a given (mode, risk) pair.
/// This is what the Spinner dispatcher uses to decide how many
/// substrate instances must agree before the action is authorized.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ConsensusDepth {
    /// Single-instance syntactic policy check. Fastest.
    OneInstance,
    /// 2-of-3 syntactic consensus. Moderate.
    TwoOfThree,
    /// Full 3-of-3 consensus + CIA Tri-Factor. Slowest, highest
    /// guarantee. Always used for high-risk regardless of mode.
    ThreeOfThreeWithCia,
    /// Action is refused entirely — Mode 3 Survival with a
    /// non-defensive action class. NO authorization path exists.
    Refused,
}

/// Classification of the action being dispatched, orthogonal to
/// RiskLevel. Mode 3 Survival uses this to refuse offensive work
/// while still permitting defensive continuation.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ActionClass {
    /// Ongoing defensive work (detection, containment, forensic
    /// capture). Permitted under all modes including Survival.
    Defensive,
    /// New offensive operation (Black Squad kinetic, Purple
    /// adversary emulation). Permitted up to Mode 2; refused in
    /// Mode 3.
    OffensiveNew,
    /// New destructive/agentic action (patches, reconfigurations,
    /// cross-tenant bridging). Permitted up to Mode 2 with
    /// appropriate tier; refused in Mode 3.
    DestructiveNew,
}

// ─── core predicate ──────────────────────────────────────────────

/// The heart of the Degradation Spectrum: given mode + risk + action
/// class, return the required consensus depth (or Refused).
///
/// v1.6 §2.2 invariants encoded:
/// - High-risk ALWAYS requires ThreeOfThreeWithCia, regardless of mode
///   (the "security never bypasses" guarantee)
/// - Mode 3 Survival refuses all OffensiveNew and DestructiveNew,
///   even at high-risk
/// - Mode 2 Degraded introduces tiered consensus: low/medium get
///   lighter checks, high stays tight
/// - Nominal/Congested keep full 3-of-3 for everything
pub fn consensus_for(
    mode: OperationalMode,
    risk: RiskLevel,
    action: ActionClass,
) -> ConsensusDepth {
    // Mode 3 Survival: defensive-only policy
    if mode == OperationalMode::Survival {
        return match action {
            ActionClass::Defensive => ConsensusDepth::ThreeOfThreeWithCia,
            _ => ConsensusDepth::Refused,
        };
    }

    // High risk ALWAYS gets the tight path regardless of mode — the
    // "security never bypasses for what matters" invariant.
    if risk == RiskLevel::High {
        return ConsensusDepth::ThreeOfThreeWithCia;
    }

    // Mode 2 Degraded: tiered consensus on low/medium
    if mode == OperationalMode::Degraded {
        return match risk {
            RiskLevel::Low => ConsensusDepth::OneInstance,
            RiskLevel::Medium => ConsensusDepth::TwoOfThree,
            RiskLevel::High => unreachable!("handled above"),
        };
    }

    // Nominal or Congested: full consensus for everything that's
    // not high-risk (high-risk already returned above).
    ConsensusDepth::ThreeOfThreeWithCia
}

// ─── mode transition ─────────────────────────────────────────────

/// A mode-transition decision. Upward (more degraded) requires quorum
/// from the three monitor Hawks (Latency + Chicken Hawk + Sentry).
/// Downward (less degraded) is immediate when load permits.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TransitionApproval {
    /// Approved — the transition proceeds.
    Approved,
    /// Refused — insufficient quorum (for upward) or load hasn't
    /// improved (for downward). Stay at current mode.
    Refused,
    /// Transitions to Survival additionally require Paranoia's
    /// confirmation that there's no active adversary (to prevent
    /// Mode 3 being triggered AS an attack vector).
    RequiresParanoiaConfirmation,
}

/// Decide whether a proposed mode transition is approved.
///
/// `quorum_count` is the number of monitor Hawks (out of 3 — Latency,
/// Chicken Hawk, Sentry) voting yes. `paranoia_confirms_no_adversary`
/// is consulted only for transitions into Survival.
pub fn evaluate_transition(
    current: OperationalMode,
    proposed: OperationalMode,
    quorum_count: u8,
    paranoia_confirms_no_adversary: bool,
) -> TransitionApproval {
    // Downward transition (proposed < current): immediate approval
    // when proposed is any less-degraded mode. Load will have
    // already improved if we're proposing to go back toward Nominal.
    if proposed < current {
        return TransitionApproval::Approved;
    }

    // Same mode: no-op, approved trivially.
    if proposed == current {
        return TransitionApproval::Approved;
    }

    // Upward transition: require 2-of-3 monitor quorum.
    if quorum_count < 2 {
        return TransitionApproval::Refused;
    }

    // Survival requires the additional Paranoia check.
    if proposed == OperationalMode::Survival && !paranoia_confirms_no_adversary {
        return TransitionApproval::RequiresParanoiaConfirmation;
    }

    TransitionApproval::Approved
}

// ─── tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    // ── consensus_for ──

    #[test]
    fn nominal_all_risk_levels_get_three_of_three() {
        for risk in [RiskLevel::Low, RiskLevel::Medium, RiskLevel::High] {
            assert_eq!(
                consensus_for(OperationalMode::Nominal, risk, ActionClass::Defensive),
                ConsensusDepth::ThreeOfThreeWithCia
            );
        }
    }

    #[test]
    fn degraded_tiered_consensus() {
        let m = OperationalMode::Degraded;
        let a = ActionClass::Defensive;
        assert_eq!(consensus_for(m, RiskLevel::Low, a), ConsensusDepth::OneInstance);
        assert_eq!(consensus_for(m, RiskLevel::Medium, a), ConsensusDepth::TwoOfThree);
        assert_eq!(consensus_for(m, RiskLevel::High, a), ConsensusDepth::ThreeOfThreeWithCia);
    }

    #[test]
    fn high_risk_never_downgrades_even_under_degraded() {
        // THE critical property — high-risk always full consensus.
        assert_eq!(
            consensus_for(OperationalMode::Degraded, RiskLevel::High, ActionClass::Defensive),
            ConsensusDepth::ThreeOfThreeWithCia
        );
    }

    #[test]
    fn survival_refuses_new_offensive() {
        assert_eq!(
            consensus_for(OperationalMode::Survival, RiskLevel::Low, ActionClass::OffensiveNew),
            ConsensusDepth::Refused
        );
        assert_eq!(
            consensus_for(OperationalMode::Survival, RiskLevel::High, ActionClass::OffensiveNew),
            ConsensusDepth::Refused
        );
    }

    #[test]
    fn survival_refuses_new_destructive() {
        assert_eq!(
            consensus_for(OperationalMode::Survival, RiskLevel::Medium, ActionClass::DestructiveNew),
            ConsensusDepth::Refused
        );
    }

    #[test]
    fn survival_permits_defensive_at_full_consensus() {
        // Defense continues even in Mode 3 — but at full tight path.
        assert_eq!(
            consensus_for(OperationalMode::Survival, RiskLevel::Low, ActionClass::Defensive),
            ConsensusDepth::ThreeOfThreeWithCia
        );
    }

    // ── evaluate_transition ──

    #[test]
    fn downward_transition_is_immediate() {
        assert_eq!(
            evaluate_transition(OperationalMode::Degraded, OperationalMode::Nominal, 0, false),
            TransitionApproval::Approved
        );
    }

    #[test]
    fn upward_transition_needs_quorum() {
        assert_eq!(
            evaluate_transition(OperationalMode::Nominal, OperationalMode::Congested, 1, true),
            TransitionApproval::Refused
        );
        assert_eq!(
            evaluate_transition(OperationalMode::Nominal, OperationalMode::Congested, 2, true),
            TransitionApproval::Approved
        );
    }

    #[test]
    fn survival_transition_needs_paranoia_confirm() {
        // Quorum met but Paranoia hasn't confirmed no-adversary →
        // held pending confirmation (prevents Mode 3 AS an attack).
        assert_eq!(
            evaluate_transition(
                OperationalMode::Degraded,
                OperationalMode::Survival,
                3,
                false
            ),
            TransitionApproval::RequiresParanoiaConfirmation
        );
        // With confirmation, proceeds.
        assert_eq!(
            evaluate_transition(
                OperationalMode::Degraded,
                OperationalMode::Survival,
                3,
                true
            ),
            TransitionApproval::Approved
        );
    }
}
