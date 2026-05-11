"""Coastal Brewing Co. — Standard Membership pure logic.

No Stripe, no DB, no HTTP. The api_server layer wraps this module.
Built TDD-first per project canon.
"""
from __future__ import annotations

import secrets


REFERRAL_PREFIX = "CBC-"
REFUND_THRESHOLD = 2


class ReferralRejected(Exception):
    """Raised when a referral cannot be recorded — e.g., existing customer."""


def mint_referral_code() -> str:
    """Mint a new referral code with the CBC- prefix.

    Body is URL-safe base64 from cryptographic randomness. Length tuned to
    keep the printed code short on welcome cards while staying collision-
    resistant at expected member volume.
    """
    body = secrets.token_urlsafe(6)
    return f"{REFERRAL_PREFIX}{body}"


class ReferralLedger:
    """In-memory ledger of code → set-of-referred-emails.

    The api_server layer wraps this with persistence (Firestore) when it
    composes the membership routes. The pure dict makes the logic easy to
    test and reason about.
    """

    def __init__(self, existing_customers: set[str] | None = None) -> None:
        self._referrals: dict[str, set[str]] = {}
        self._existing_customers: set[str] = existing_customers or set()

    def count_referrals(self, code: str) -> int:
        return len(self._referrals.get(code, set()))

    def record_referral(self, code: str, email: str) -> None:
        if email in self._existing_customers:
            raise ReferralRejected(
                f"{email} is an existing customer — referrals must be brand new"
            )
        self._referrals.setdefault(code, set()).add(email)

    def refund_eligible(self, code: str) -> bool:
        return self.count_referrals(code) >= REFUND_THRESHOLD
