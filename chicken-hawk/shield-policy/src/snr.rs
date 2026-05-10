//! SNR Throttling — Privacy-to-Security Elasticity (v1.6 §2.1 / P1 #2)
//!
//! Privacy (Lil_Seal_Hawk) owns this component. It replaces the v1.5
//! Epsilon-Backoff mechanism with a structural invariant: when the
//! Privacy Budget reaches a Critical Threshold (20% remaining), the
//! system enters High-Fidelity Mode — throttling low-risk telemetry
//! while ELEVATING precision on high-risk signals. Budget is spent on
//! signal, not noise.
//!
//! The adversarial defeat (v1.6 §2.1): an attacker trying to burn
//! budget via near-anomalies finds their near-anomalies get MORE
//! visibility (higher precision), not less. The bait becomes the
//! hook.
//!
//! This module implements the PURE predicates — `snr_mode_for()`,
//! `sample_rate()`, `epsilon_for()`. Stateful per-tier budget
//! accounting is a follow-up (it needs a persistent store, which
//! this kernel doesn't own).

// ─── telemetry classification ─────────────────────────────────────

/// v1.6 §2.1 telemetry tier tagging. Sparks (Lil_Wire_Hawk) tags at
/// ingestion; Privacy (Lil_Seal_Hawk) applies tier-specific sampling
/// and epsilon based on the current SNR mode.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TelemetryTier {
    /// Routine employee logins, cached file access, UI telemetry.
    /// Throttled aggressively under Critical mode.
    LowRisk,
    /// Authentication events, configuration changes, data access
    /// patterns. Throttled moderately under Critical mode.
    MediumRisk,
    /// Outbound API calls, shell executions, cross-tenant boundary
    /// touches, privilege elevations. PRECISION IS ELEVATED under
    /// Critical mode — epsilon drops from 0.1 to 0.01.
    HighRisk,
}

// ─── mode determination ───────────────────────────────────────────

/// The two operational modes of the SNR throttle.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum SnrMode {
    Nominal,
    Critical,
}

/// v1.6 §2.1: Critical Threshold is 20% of the Privacy Budget
/// remaining. Below that, the throttle activates.
pub const CRITICAL_THRESHOLD_FRACTION: f64 = 0.20;

/// Decide the SNR mode from the current privacy-budget remaining
/// fraction. `budget_remaining_fraction` is in [0.0, 1.0].
///
/// This is the ONLY place the threshold is checked — all
/// downstream policy (sample_rate, epsilon_for) composes on top
/// of this decision.
pub fn snr_mode_for(budget_remaining_fraction: f64) -> SnrMode {
    if budget_remaining_fraction <= CRITICAL_THRESHOLD_FRACTION {
        SnrMode::Critical
    } else {
        SnrMode::Nominal
    }
}

// ─── sampling rates ───────────────────────────────────────────────

/// Sample rate for a tier under a given SNR mode. Returns a fraction
/// in [0.0, 1.0]; the ingestion layer drops events probabilistically
/// to match.
///
/// v1.6 §2.1 table:
///   Nominal:   LowRisk 1.00, MediumRisk 1.00, HighRisk 1.00
///   Critical:  LowRisk 0.01, MediumRisk 0.50, HighRisk 1.00
///
/// The invariant: high-risk is NEVER downsampled. That's the
/// "budget spent on signal, not noise" property — the rarest,
/// most expensive events always get 100% visibility.
pub fn sample_rate(tier: TelemetryTier, mode: SnrMode) -> f64 {
    match (mode, tier) {
        (SnrMode::Nominal, _) => 1.0,
        (SnrMode::Critical, TelemetryTier::LowRisk) => 0.01,
        (SnrMode::Critical, TelemetryTier::MediumRisk) => 0.50,
        (SnrMode::Critical, TelemetryTier::HighRisk) => 1.00,
    }
}

// ─── differential-privacy epsilon ─────────────────────────────────

/// Per-tier epsilon under a given SNR mode. LOWER epsilon = MORE
/// precision (less noise added by the DP mechanism).
///
/// v1.6 §2.1:
///   Nominal:   all tiers at baseline ε = 0.1
///   Critical:  LowRisk/MediumRisk stay at 0.1 (their spend is
///              reduced by sample-rate throttling instead);
///              HighRisk drops to 0.01 (near-zero noise — the
///              precision elevation that inverts the bait attack)
pub fn epsilon_for(tier: TelemetryTier, mode: SnrMode) -> f64 {
    const BASELINE_EPSILON: f64 = 0.10;
    const HIGH_FIDELITY_EPSILON: f64 = 0.01;

    match (mode, tier) {
        (SnrMode::Critical, TelemetryTier::HighRisk) => HIGH_FIDELITY_EPSILON,
        _ => BASELINE_EPSILON,
    }
}

// ─── budget-spend multiplier ──────────────────────────────────────

/// Expected privacy-budget burn rate per event, given tier and mode.
/// Used by the budget custodian (Warden / Lil_Lock_Hawk) to project
/// when the critical threshold will be reached.
///
/// The product captures the full policy: `sample_rate * (1/epsilon)`
/// approximates the effective spend per unit of time, ignoring the
/// denominator's zero case (epsilon is always > 0 by definition).
pub fn expected_spend_rate(tier: TelemetryTier, mode: SnrMode) -> f64 {
    sample_rate(tier, mode) / epsilon_for(tier, mode)
}

// ─── tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn nominal_mode_above_threshold() {
        assert_eq!(snr_mode_for(1.0), SnrMode::Nominal);
        assert_eq!(snr_mode_for(0.50), SnrMode::Nominal);
        assert_eq!(snr_mode_for(0.21), SnrMode::Nominal);
    }

    #[test]
    fn critical_mode_at_and_below_threshold() {
        assert_eq!(snr_mode_for(0.20), SnrMode::Critical);
        assert_eq!(snr_mode_for(0.10), SnrMode::Critical);
        assert_eq!(snr_mode_for(0.00), SnrMode::Critical);
    }

    #[test]
    fn nominal_preserves_full_sampling_all_tiers() {
        for tier in [
            TelemetryTier::LowRisk,
            TelemetryTier::MediumRisk,
            TelemetryTier::HighRisk,
        ] {
            assert_eq!(sample_rate(tier, SnrMode::Nominal), 1.0);
        }
    }

    #[test]
    fn critical_throttles_low_and_medium_risk() {
        assert_eq!(sample_rate(TelemetryTier::LowRisk, SnrMode::Critical), 0.01);
        assert_eq!(sample_rate(TelemetryTier::MediumRisk, SnrMode::Critical), 0.50);
    }

    #[test]
    fn critical_preserves_full_sampling_on_high_risk() {
        // THE critical property: high-risk is never downsampled.
        // This is what inverts the bait-attack — attacker's near-
        // anomalies get MORE visibility, not less.
        assert_eq!(sample_rate(TelemetryTier::HighRisk, SnrMode::Critical), 1.00);
    }

    #[test]
    fn critical_elevates_high_risk_precision() {
        // Epsilon drops from baseline (0.1) to high-fidelity (0.01).
        // Same budget; 10x sharper signal on high-risk events.
        assert_eq!(epsilon_for(TelemetryTier::HighRisk, SnrMode::Nominal), 0.10);
        assert_eq!(epsilon_for(TelemetryTier::HighRisk, SnrMode::Critical), 0.01);
    }

    #[test]
    fn low_and_medium_epsilon_unchanged_in_critical() {
        // Low/medium tiers don't get precision elevation — their
        // budget relief comes from sample-rate throttling, not
        // epsilon reduction.
        assert_eq!(epsilon_for(TelemetryTier::LowRisk, SnrMode::Critical), 0.10);
        assert_eq!(epsilon_for(TelemetryTier::MediumRisk, SnrMode::Critical), 0.10);
    }

    #[test]
    fn expected_spend_rate_invariants() {
        // At critical, low-risk spend drops 100x (sample_rate 1.0→0.01).
        let low_nominal = expected_spend_rate(TelemetryTier::LowRisk, SnrMode::Nominal);
        let low_critical = expected_spend_rate(TelemetryTier::LowRisk, SnrMode::Critical);
        assert!((low_nominal / low_critical - 100.0).abs() < 1e-9);

        // At critical, high-risk spend increases 10x (epsilon 0.1→0.01
        // means 1/eps goes 10→100, while sample_rate stays 1.0).
        let high_nominal = expected_spend_rate(TelemetryTier::HighRisk, SnrMode::Nominal);
        let high_critical = expected_spend_rate(TelemetryTier::HighRisk, SnrMode::Critical);
        assert!((high_critical / high_nominal - 10.0).abs() < 1e-9);
    }
}
