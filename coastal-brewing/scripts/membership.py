"""Coastal Brewing Co. — Standard Membership pure logic.

No Stripe, no DB, no HTTP. The api_server layer wraps this module.
Built TDD-first per project canon.
"""
from __future__ import annotations

import secrets


REFERRAL_PREFIX = "CBC-"
REFUND_THRESHOLD = 2
MEMBERSHIP_PRODUCT_ID = "coastal_membership_standard_annual"


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


def _extract_product_id(event: dict) -> str | None:
    try:
        items = event["data"]["object"]["items"]["data"]
        return items[0]["price"]["product"]
    except (KeyError, IndexError, TypeError):
        return None


def handle_subscription_created(
    event: dict,
    *,
    ledger: ReferralLedger,
    on_welcome_box_queued,
    seen_event_ids: dict | None = None,
) -> dict:
    """Dispatch a Stripe `customer.subscription.created` event for the
    membership product. Returns a result dict; never raises on shape
    issues — invalid events return {handled: False, reason: ...}.

    When `seen_event_ids` is provided (event_id → referral_code), replays
    of the same Stripe event id short-circuit with
    `handled=False, reason='duplicate event'` and echo back the original
    referral_code so callers can avoid re-queueing the welcome box.
    """
    product_id = _extract_product_id(event)
    if product_id != MEMBERSHIP_PRODUCT_ID:
        return {
            "handled": False,
            "reason": f"product {product_id!r} is not a membership product",
        }

    event_id = event.get("id", "")
    if seen_event_ids is not None and event_id in seen_event_ids:
        return {
            "handled": False,
            "reason": "duplicate event",
            "referral_code": seen_event_ids[event_id],
        }

    obj = event["data"]["object"]
    customer_email = obj.get("metadata", {}).get("customer_email", "")
    referral_code = mint_referral_code()

    welcome_task = {
        "customer_email": customer_email,
        "referral_code": referral_code,
        "stripe_subscription_id": obj.get("id"),
    }
    on_welcome_box_queued(welcome_task)

    if seen_event_ids is not None:
        seen_event_ids[event_id] = referral_code

    return {
        "handled": True,
        "referral_code": referral_code,
        "customer_email": customer_email,
    }


def format_welcome_box_telegram(task: dict) -> str:
    """Build the Telegram message the owner sees when a welcome box must ship.

    Customer-facing field stays customer-facing (email, code). Internal
    fields (subscription id) stay out of the message — they live in the
    audit ledger, not the owner-channel ping.
    """
    email = task.get("customer_email", "(missing email)")
    code = task.get("referral_code", "(missing code)")
    return (
        "[Coastal Brewing Co.] new Standard Member — ship welcome box.\n"
        f"  email:    {email}\n"
        f"  referral: {code}\n"
        "  action:   ceramic dripper + sticker set + 50g Habbak tin → ship within 10 business days."
    )
