//! Phoenix Protocol — Ephemeral Rebirth (v1.6 §3.3 / P2 #9)
//!
//! Every Hawk persona and Spinner instance runs in an immutable
//! ephemeral container that is destroyed and re-provisioned from a
//! Vault-signed Golden Image every 24 hours. APT foothold is
//! physically deleted by the system's own heartbeat.
//!
//! Ownership per v1.6 §3.3:
//!   - Deployer:  Doc (Lil_Patch_Hawk) — orchestrates rebirth
//!   - Signer:    Vault (Lil_Salt_Hawk) — signs Golden Images
//!   - Validator: Cipher (Lil_Lab_Hawk) — validates rebirth integrity
//!   - Monitor:   Paranoia (Lil_Doubt_Hawk) — flags deviation
//!
//! This module ships the pure structural predicates. Stateful pieces
//! (which containers exist now, when to stagger rebirths, peer
//! handoff coordination) live in Doc's runtime owner, following the
//! same pattern as cia.rs / snr.rs / degradation.rs.

// ─── time constants ───────────────────────────────────────────────

/// v1.6 §3.3: every Hawk container has a hard 24-hour TTL from
/// provisioning. No instance extends its own lifetime.
pub const REBIRTH_TTL_SECONDS: u64 = 24 * 60 * 60;

/// Grace window during graceful handoff. Outgoing instance stays
/// alive this many seconds after the incoming instance is ready, so
/// in-flight missions don't drop on the hard TTL boundary.
pub const HANDOFF_GRACE_SECONDS: u64 = 60;

// ─── Golden Image ─────────────────────────────────────────────────

/// The cryptographically attested container image a Hawk instance is
/// born from. Vault owns the signature; Paranoia monitors the digest.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct GoldenImage {
    /// Content hash of the image — compared against Paranoia's
    /// rebirth-cadence monitor to detect tampering. u64 tag here for
    /// Kani tractability; production uses SHA-256 bytes.
    pub content_hash_tag: u64,
    /// Vault (Lil_Salt_Hawk) signature verified against its HSM-
    /// backed identity key. Only signed Golden Images can deliver
    /// a rebirth.
    pub vault_signature_valid: bool,
}

impl GoldenImage {
    /// An image is REBIRTH-ELIGIBLE iff its Vault signature verifies.
    /// This is the root-of-trust check — if the signing key is
    /// compromised, rebirths are compromised; but no path exists to
    /// rebirth from an unsigned image.
    pub fn rebirth_eligible(&self) -> bool {
        self.vault_signature_valid
    }
}

// ─── Hawk instance state ──────────────────────────────────────────

/// The lifecycle state of a single Hawk instance within its 24-hour
/// TTL. Monotonic: once terminated, an instance does NOT resurrect;
/// a new instance is provisioned from Golden Image instead.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum InstanceLifecycle {
    /// Provisioned from Golden Image, running normally.
    Alive,
    /// Past TTL, in graceful-handoff window. Peer instance is taking
    /// over active missions; this instance will terminate at
    /// handoff completion.
    Handoff,
    /// Terminated. Never resurrects — a new instance is provisioned.
    Terminated,
}

/// A Hawk container instance with its provenance + age.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub struct HawkInstance {
    /// Reference to the Vault-signed Golden Image this instance
    /// was born from.
    pub golden_image: GoldenImage,
    /// Unix timestamp of provisioning.
    pub provisioned_at_unix: u64,
    /// Current lifecycle position.
    pub lifecycle: InstanceLifecycle,
}

impl HawkInstance {
    /// Age in seconds at `now`. Saturates at 0 if the clock is
    /// observationally monotonic-violating (shouldn't happen in
    /// production but Kani explores all inputs).
    pub fn age_seconds(&self, now_unix: u64) -> u64 {
        now_unix.saturating_sub(self.provisioned_at_unix)
    }

    /// An instance is EXPIRED iff its age reaches or exceeds the
    /// 24-hour TTL. Expiry is the trigger for rebirth scheduling;
    /// the actual rebirth is orchestrated by Doc's runtime.
    pub fn is_expired(&self, now_unix: u64) -> bool {
        self.age_seconds(now_unix) >= REBIRTH_TTL_SECONDS
    }

    /// Whether this instance should transition into Handoff state.
    /// Runtime calls this periodically; stateful transition happens
    /// in Doc's orchestrator. Pure predicate here.
    pub fn should_begin_handoff(&self, now_unix: u64) -> bool {
        matches!(self.lifecycle, InstanceLifecycle::Alive)
            && self.is_expired(now_unix)
    }
}

// ─── rebirth authorization ────────────────────────────────────────

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum RebirthDecision {
    /// Rebirth is authorized — Doc provisions a new instance from
    /// the Golden Image.
    Authorized,
    /// Golden Image's Vault signature doesn't verify — REFUSED.
    /// This is the root-of-trust refusal; the runtime halts and
    /// Paranoia is alerted.
    UnsignedImage,
    /// Instance hasn't reached TTL yet — no rebirth needed.
    NotYetExpired,
    /// Instance is already in Terminated state — a new instance
    /// should have been provisioned already.
    AlreadyTerminated,
}

/// Decide whether to rebirth a given instance from a given Golden
/// Image at the current time. The Rebirth decision is the single
/// entry point Doc's orchestrator queries before provisioning.
pub fn authorize_rebirth(
    instance: &HawkInstance,
    rebirth_image: &GoldenImage,
    now_unix: u64,
) -> RebirthDecision {
    if !rebirth_image.rebirth_eligible() {
        return RebirthDecision::UnsignedImage;
    }
    match instance.lifecycle {
        InstanceLifecycle::Terminated => RebirthDecision::AlreadyTerminated,
        _ if !instance.is_expired(now_unix) => RebirthDecision::NotYetExpired,
        _ => RebirthDecision::Authorized,
    }
}

// ─── rebirth integrity check ──────────────────────────────────────

/// Cipher (Lil_Lab_Hawk) validates that a rebirth is integrity-
/// preserving: new instance's Golden Image content hash matches the
/// currently-blessed hash in Vault, AND both are signed by Vault.
///
/// This is the "no image substitution" invariant — an attacker
/// can't quietly substitute a different signed image and rebirth
/// into it. The hash must match what Vault currently blesses.
pub fn validate_rebirth_integrity(
    new_instance: &HawkInstance,
    currently_blessed_hash_tag: u64,
) -> bool {
    new_instance.golden_image.vault_signature_valid
        && new_instance.golden_image.content_hash_tag == currently_blessed_hash_tag
}

// ─── tests ────────────────────────────────────────────────────────

#[cfg(test)]
mod tests {
    use super::*;

    const NOON: u64 = 1_700_000_000;

    fn signed_image(hash: u64) -> GoldenImage {
        GoldenImage { content_hash_tag: hash, vault_signature_valid: true }
    }

    fn unsigned_image(hash: u64) -> GoldenImage {
        GoldenImage { content_hash_tag: hash, vault_signature_valid: false }
    }

    fn instance_at(provisioned: u64, img: GoldenImage) -> HawkInstance {
        HawkInstance {
            golden_image: img,
            provisioned_at_unix: provisioned,
            lifecycle: InstanceLifecycle::Alive,
        }
    }

    #[test]
    fn ttl_is_exactly_24_hours() {
        assert_eq!(REBIRTH_TTL_SECONDS, 86_400);
    }

    #[test]
    fn instance_not_expired_before_ttl() {
        let i = instance_at(NOON, signed_image(1));
        assert!(!i.is_expired(NOON));
        assert!(!i.is_expired(NOON + REBIRTH_TTL_SECONDS - 1));
    }

    #[test]
    fn instance_expired_at_and_after_ttl() {
        let i = instance_at(NOON, signed_image(1));
        assert!(i.is_expired(NOON + REBIRTH_TTL_SECONDS));
        assert!(i.is_expired(NOON + 2 * REBIRTH_TTL_SECONDS));
    }

    #[test]
    fn should_begin_handoff_gates_on_alive_and_expired() {
        let mut i = instance_at(NOON, signed_image(1));
        assert!(!i.should_begin_handoff(NOON));     // fresh
        assert!(i.should_begin_handoff(NOON + REBIRTH_TTL_SECONDS));
        i.lifecycle = InstanceLifecycle::Handoff;
        assert!(!i.should_begin_handoff(NOON + REBIRTH_TTL_SECONDS));  // already in handoff
        i.lifecycle = InstanceLifecycle::Terminated;
        assert!(!i.should_begin_handoff(NOON + REBIRTH_TTL_SECONDS));  // already dead
    }

    #[test]
    fn unsigned_golden_image_refuses_rebirth() {
        let i = instance_at(NOON, signed_image(1));
        let unsigned = unsigned_image(1);
        assert_eq!(
            authorize_rebirth(&i, &unsigned, NOON + REBIRTH_TTL_SECONDS),
            RebirthDecision::UnsignedImage
        );
    }

    #[test]
    fn not_yet_expired_refuses_rebirth() {
        let i = instance_at(NOON, signed_image(1));
        assert_eq!(
            authorize_rebirth(&i, &signed_image(2), NOON + 1000),
            RebirthDecision::NotYetExpired
        );
    }

    #[test]
    fn already_terminated_signals_that_state() {
        let mut i = instance_at(NOON, signed_image(1));
        i.lifecycle = InstanceLifecycle::Terminated;
        assert_eq!(
            authorize_rebirth(&i, &signed_image(2), NOON + REBIRTH_TTL_SECONDS),
            RebirthDecision::AlreadyTerminated
        );
    }

    #[test]
    fn authorized_when_signed_and_expired() {
        let i = instance_at(NOON, signed_image(1));
        assert_eq!(
            authorize_rebirth(&i, &signed_image(42), NOON + REBIRTH_TTL_SECONDS),
            RebirthDecision::Authorized
        );
    }

    #[test]
    fn rebirth_integrity_requires_signed_and_matching_hash() {
        let new = instance_at(NOON + REBIRTH_TTL_SECONDS, signed_image(0xBEEF));
        assert!(validate_rebirth_integrity(&new, 0xBEEF));           // match
        assert!(!validate_rebirth_integrity(&new, 0xDEAD));          // hash drift
        let unsigned_new = instance_at(NOON, unsigned_image(0xBEEF));
        assert!(!validate_rebirth_integrity(&unsigned_new, 0xBEEF)); // unsigned
    }
}
