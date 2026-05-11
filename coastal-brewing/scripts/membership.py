"""Coastal Brewing Co. — Standard Membership pure logic.

No Stripe, no DB, no HTTP. The api_server layer wraps this module.
Built TDD-first per project canon.
"""
from __future__ import annotations

import secrets


REFERRAL_PREFIX = "CBC-"
REFUND_THRESHOLD = 2
MEMBERSHIP_PRODUCT_ID = "coastal_membership_standard_annual"
MEMBER_DISCOUNT_COUPON = "MEMBER_15"
# NOTE 2026-05-11: Lifetime Member + Lifetime Concierge tiers were retired
# from Coastal canon per owner directive (see
# `docs/lifetime-tier-positioning-2026-05-11.md`). Lifetime is now the
# AIMS / Plug-Me-In licensee tier, NOT a Coastal beverage tier.
#
# The lifetime_* tier keys are KEPT in this frozenset as
# legacy/grandfathered so any existing Stripe Customer records minted
# pre-retirement continue to receive the MEMBER_15 auto-coupon at
# checkout. No NEW Coastal customers should be assigned these tiers.
# Owner ratification pending on whether to actively migrate grandfathered
# customers off these tier keys; until then, behavior is unchanged.
MEMBER_TIERS = frozenset({"standard", "lifetime_member", "lifetime_concierge"})


def is_member(customer_metadata: dict | None) -> bool:
    """True if the Stripe Customer's metadata flags them as a member tier
    eligible for the MEMBER_15 auto-discount.
    """
    if not customer_metadata:
        return False
    tier = (customer_metadata.get("membership_tier") or "").strip().lower()
    return tier in MEMBER_TIERS


def discount_for(customer_metadata: dict | None) -> list[dict]:
    """Return the Stripe `discounts` list to attach to a Checkout Session
    for this Customer. Empty list for non-members (Stripe accepts both
    omit and empty list)."""
    if is_member(customer_metadata):
        return [{"coupon": MEMBER_DISCOUNT_COUPON}]
    return []


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


def build_checkout_params(
    *,
    customer_email: str,
    membership_price_id: str,
    public_url: str,
) -> dict:
    """Build the Stripe Checkout Session params for the Standard Membership
    subscription. Pure dict — no SDK call. Caller passes this to
    `stripe.checkout.Session.create(**params)`.
    """
    return {
        "mode": "subscription",
        "payment_method_types": ["card"],
        "line_items": [{"price": membership_price_id, "quantity": 1}],
        "customer_email": customer_email,
        "success_url": f"{public_url}/membership/welcome?session_id={{CHECKOUT_SESSION_ID}}",
        "cancel_url": f"{public_url}/membership",
        "metadata": {
            "customer_email": customer_email,
            "flow": "membership_signup",
            "vertical": "coastal-brewing",
        },
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
