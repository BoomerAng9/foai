"""Canonical Spinner tool surface.

Each tool below is a thin function that dispatches through Chicken Hawk.
ADK agents register these via the `tools=[...]` param on LlmAgent.

Tool naming convention: `<verb>_<noun>` snake_case.
Tools that mutate state always route through `chicken_hawk.dispatch()`.
Tools that only read state (catalog lookup, audit query) call directly.

Layered authority enforcement (workstream B/C of the 2026-04-30 rework):
Spinner is the SERVER-SIDE enforcement boundary for tier ceilings. Even if
an LLM agent ignores its INSTRUCTION block and tries to apply a discount
above its tier authority, `apply_discount` and `propose_deal` short-circuit
locally via `authority_tiers.is_within_authority()` BEFORE dispatching to
Chicken Hawk, returning an escalation envelope with an HMAC-signed Stepper
token instead. The Chicken Hawk dispatch + NemoClaw policy gate provide a
second line of defense. Cost data NEVER leaves the server — `equation.quote`
returns a Quote dict that gets stripped via `equation.strip_internal_fields`
before any HTTP serialization.
"""
from __future__ import annotations

from typing import Any, Optional

from . import chicken_hawk, nemoclaw, audit_ledger, authority_tiers


# ---------------------------------------------------------------------------
# Sales / Operations PMO tools (Sal_Ang)
# ---------------------------------------------------------------------------

def recommend_bundle(category: str, budget: Optional[float] = None, flavor: Optional[str] = None) -> dict:
    """Suggest a Coastal product bundle to the customer.

    Args:
        category: "coffee" | "tea" | "matcha" | "mixed"
        budget: optional max spend in USD
        flavor: optional flavor preference ("dark", "light", "earthy", etc.)

    Returns the bundle envelope. Read-only — no AuditLedger receipt.
    """
    return chicken_hawk.dispatch(
        "recommend_bundle",
        {"category": category, "budget": budget, "flavor": flavor},
    )


def add_to_cart(sku: str, qty: int, session_id: Optional[str] = None) -> dict:
    """Add an item to the customer's cart. Routes through Chicken Hawk for receipt."""
    return chicken_hawk.dispatch("add_to_cart", {"sku": sku, "qty": qty, "session_id": session_id})


def apply_discount(
    percent: float,
    session_id: str,
    actor: str = "sal_ang",
    qty: int = 1,
    is_bundle: bool = False,
    custee_id: str = "anon",
) -> dict:
    """Apply a discount, enforced by the layered authority schema.

    The `actor` parameter declares which tier-authorized agent is requesting
    the discount. Spinner first checks `authority_tiers.is_within_authority()`
    locally; if the request exceeds the actor's tier ceiling, returns an
    escalation envelope with an HMAC-signed Stepper token rather than
    dispatching to Chicken Hawk.

    Tier ceilings (per `agents/shared/authority_tiers.py`):
      - T1 (acheevy): uncapped at the tier layer; bound only by the global floor
      - T2_BULK (melli): 12u→15%, 50u→25%, 100u+→35%
      - T2_FINANCE (luc): 0% (coupons-only, no margin discount)
      - T3 (sal_ang): ≤10% PPU, ≤15% bundles

    On the wire, the gateway envelope returned has shape:
      `{ok, verdict, ...}` per chicken_hawk.dispatch when allowed, OR
      `{ok=False, verdict="tier_escalation", stepper_token, ...}` when the
      ceiling was breached locally.
    """
    decision = authority_tiers.is_within_authority(
        actor=actor,
        requested_pct=percent,
        qty=qty,
        is_bundle=is_bundle,
    )
    if not decision["allowed"]:
        token = authority_tiers.make_stepper_escalation_token(
            actor=actor,
            sku="",  # caller didn't pass a SKU on this surface; quote_sku has it
            qty=qty,
            requested_pct=percent,
            custee_id=custee_id,
        )
        return {
            "ok": False,
            "verdict": "tier_escalation",
            "actor_tier": decision["actor_tier"],
            "binding_ceiling_pct": decision["binding_ceiling_pct"],
            "reason": decision["reason"],
            "stepper_token": token,
            "message": (
                "This discount exceeds the active agent's tier ceiling. "
                "A Stepper escalation token has been issued; route the Custee "
                "through the T1 commitment-confirmation form before ACHEEVY "
                "can override the ceiling."
            ),
        }
    return chicken_hawk.dispatch(
        "apply_discount",
        {
            "percent": percent,
            "session_id": session_id,
            "actor": actor,
            "actor_tier": decision["actor_tier"],
            "qty": qty,
            "is_bundle": is_bundle,
        },
    )


def propose_deal(
    items: list[dict],
    discount_pct: float,
    session_id: str,
    actor: str = "sal_ang",
    custee_id: str = "anon",
) -> dict:
    """Compose and propose a customer-co-authored offer.

    Goes through `equation.quote()` for the canonical matrix Equation +
    floor + tier-cap decision. If any line item would exceed the actor's
    tier ceiling, returns an escalation envelope with the Stepper token.
    Otherwise dispatches to Chicken Hawk for the receipt + side effects.

    Cost data NEVER leaves this layer — only `equation.strip_internal_fields`
    output is included in the gateway dispatch payload.
    """
    # Lazy import to avoid runtime cycle at agent-construction time.
    import sys as _sys
    if "equation" not in _sys.modules:
        import importlib as _importlib
        _importlib.import_module("equation")
    import equation  # type: ignore[import-not-found]

    is_bundle = len(items) > 1
    total_qty = sum(int(it.get("qty", 1)) for it in items)
    # Quote the FIRST line for the tier-cap decision; multi-SKU bundles get
    # treated as a single deal-shape for ceiling purposes (the BUNDLE flag
    # plus aggregate qty captures the relevant authority semantics).
    primary = items[0] if items else {"product_id": "", "qty": 1}
    q = equation.quote(
        sku_id=primary.get("product_id", ""),
        qty=total_qty,
        vibe=primary.get("vibe", "individual"),
        pillars=primary.get("pillars", []),
        frequency=primary.get("frequency", "ppu"),
        actor=actor,
        requested_discount_pct=discount_pct,
        is_bundle=is_bundle,
        custee_id=custee_id,
    )
    public_quote = equation.strip_internal_fields(q)
    if q["escalation_required"]:
        return {
            "ok": False,
            "verdict": "tier_escalation",
            "actor_tier": q["actor_tier"],
            "binding_ceiling_pct": q["tier_ceiling_pct"],
            "stepper_token": q["stepper_token"],
            "quote": public_quote,
            "message": (
                "This deal exceeds the active agent's tier ceiling. The Custee "
                "must complete the T1 commitment-confirmation form (qty + "
                "cadence + delivery + payment terms) before ACHEEVY can override."
            ),
        }
    return chicken_hawk.dispatch(
        "propose_deal",
        {
            "items": items,
            "discount_pct": discount_pct,
            "session_id": session_id,
            "actor": actor,
            "actor_tier": q["actor_tier"],
            "quote": public_quote,
        },
    )


def quote_sku(
    sku: str,
    qty: int = 1,
    vibe: str = "individual",
    pillars: Optional[list[str]] = None,
    frequency: str = "ppu",
    actor: str = "acheevy",
    is_bundle: bool = False,
    custee_id: str = "anon",
) -> dict:
    """Compute the canonical matrix-billing Equation price for a SKU.

    Read-only. Agents call this to surface a transparent line-item quote
    to the Custee (frequency × V.I.B.E. × pillar uplifts). NEVER returns
    cost or floor — `equation.strip_internal_fields` is applied before
    return so cost data never reaches the LLM context (which can leak
    via prompt injection). Discount path is separate: `apply_discount`
    or `propose_deal` for actual margin asks.
    """
    import sys as _sys
    if "equation" not in _sys.modules:
        import importlib as _importlib
        _importlib.import_module("equation")
    import equation  # type: ignore[import-not-found]
    q = equation.quote(
        sku_id=sku,
        qty=qty,
        vibe=vibe,
        pillars=pillars or [],
        frequency=frequency,
        actor=actor,
        requested_discount_pct=0.0,
        is_bundle=is_bundle,
        custee_id=custee_id,
    )
    return equation.strip_internal_fields(q)


import datetime as _dt
import hashlib as _hashlib

import audit_ledger as _audit_ledger  # type: ignore[import-not-found]


# Per-coupon discount semantics — runner-side mirror of the Stripe Coupon
# objects Chicken Hawk creates server-side. Used to (a) compute the
# Custee-visible price preview that the calling agent speaks during chat,
# and (b) audit-ledger record what was issued. The actual Stripe Coupon /
# Promotion Code lives in Chicken Hawk's response envelope.
COUPON_DISCOUNTS: dict[str, dict] = {
    "WELCOME10": {
        "kind": "percent",
        "amount": 10.0,
        "applies_to": "first_order",
        "single_use_per_email": True,
    },
    "BREW20": {
        "kind": "percent",
        "amount": 20.0,
        "applies_to": "discovery_bundle_for_3plus_month_subscribers",
        "single_use_per_email": True,
    },
    "FREESHIP": {
        "kind": "free_shipping",
        "amount": 0.0,
        "applies_to": "any_order",
        "single_use_per_email": False,
    },
    "TRY-ME": {
        "kind": "amount_off_usd",
        "amount": 5.19,  # $24.99 MSRP - $19.80 cost-recovery floor (catalog.py)
        "applies_to": "sample_pack",
        # Per `samples-program.md`: cap 1 per Custee per 30 days, cross-checked
        # against email + shipping address hash (not just custee_id, to defeat
        # the "multiple emails / same address" abuse pattern).
        "rate_limit_days": 30,
        "rate_limit_keys": ("custee_id", "email_hash", "address_hash"),
    },
}


def _hash_signal(s: str) -> str:
    """Stable, lowercased, whitespace-trimmed hash for cross-check signals.
    Uses SHA-256 hex prefix (16 chars) — collision-resistant within a
    plausible Custee-base size, short enough to fit in audit summaries.
    """
    norm = (s or "").strip().lower()
    return _hashlib.sha256(norm.encode("utf-8")).hexdigest()[:16]


def _check_coupon_rate_limit(
    coupon_code: str,
    custee_id: str,
    email_hash: str,
    address_hash: str,
) -> Optional[dict]:
    """Returns None if the coupon may be issued; returns a `rate_limited`
    envelope dict if a recent issuance matches any of the cross-check
    signals (custee_id, email_hash, address_hash) within the
    coupon-specific rate-limit window.
    """
    spec = COUPON_DISCOUNTS.get(coupon_code, {})
    days = spec.get("rate_limit_days")
    keys = spec.get("rate_limit_keys") or ()
    if not days:
        return None  # no rate limit on this coupon

    since = (_dt.datetime.now(_dt.timezone.utc) - _dt.timedelta(days=int(days))).isoformat()

    signals: dict[str, str] = {
        "custee_id": custee_id,
        "email_hash": email_hash,
        "address_hash": address_hash,
    }
    for key in keys:
        sig = signals.get(key, "")
        if not sig:
            continue
        rows = _audit_ledger.query_recent_action_receipts(
            action_type="coupon_issuance",
            since_iso=since,
            summary_substr=f"{key}={sig}",
            limit=5,
        )
        if rows:
            earliest = min((r["created_at"] for r in rows), default=since)
            retry_dt = _dt.datetime.fromisoformat(earliest) + _dt.timedelta(days=int(days))
            return {
                "ok": False,
                "verdict": "rate_limited",
                "reason": f"coupon_{coupon_code}_used_within_{days}d_match_{key}",
                "retry_after": retry_dt.isoformat(),
                "message": (
                    f"Coupon `{coupon_code}` was already redeemed for this "
                    f"{key.replace('_', ' ')} within the last {days} days. "
                    "Hold the line in-character: offer the next-step move "
                    "(PPU at retail, or a subscription configuration walkthrough)."
                ),
            }
    return None


def issue_coupon(
    coupon_code: str,
    custee_id: str,
    actor: str = "luc",
    custee_email: str = "",
    shipping_address: str = "",
) -> dict:
    """Issue a fixed-list coupon code to a Custee. Server-side enforcement
    chain — bypasses none of these gates regardless of LLM intent:

    1. Authority gate (`authority_tiers.is_coupon_within_authority`):
       only the canonical tier owners can issue (`T2_FINANCE` for the
       fixed list, `T1` for any code).
    2. Cross-check rate-limit (`_check_coupon_rate_limit`): hashes
       email + shipping_address, queries audit ledger for prior
       `coupon_issuance` rows within the coupon's rate-limit window,
       refuses on any cross-check signal match.
    3. Chicken Hawk dispatch: hawk-side `issue_coupon` handler runs
       NemoClaw policy gate then calls Stripe SDK to create a real
       Coupon + Promotion Code keyed to the Custee's email. Returns
       stripe_coupon_id / promotion_code / redemption_url on success.
    4. Audit-ledger emit: on dispatch success, records a
       `coupon_issuance` action receipt with the cross-check signals
       (hashed) so subsequent `_check_coupon_rate_limit` calls find
       this row.

    Routing canon (per owner directive 2026-04-30):
       LUC is invoked by team members — Sal at checkout, Melli for
       B2B, ACHEEVY for math-sim. He is NOT customer-facing on the
       open chat surface; his routing is tightly wound. Other agents
       DELEGATE to LUC (imperative); they do not request permission.

    Args:
        coupon_code: one of `LUC_COUPON_CODES` (or any code if actor=acheevy)
        custee_id: opaque customer identifier
        actor: agent slug — default "luc"; "acheevy" gets unrestricted
        custee_email: required for cross-check + Stripe Promotion Code
        shipping_address: required for cross-check (defeats multi-email abuse)
    """
    # 1. Authority gate
    actor_tier = authority_tiers.get_tier(actor)
    if actor_tier is None:
        return {
            "ok": False,
            "verdict": "denied",
            "reason": f"unknown_actor:{actor}",
            "message": "Coupon issuance refused — actor not recognized.",
        }
    if not authority_tiers.is_coupon_within_authority(actor_tier, coupon_code):
        return {
            "ok": False,
            "verdict": "denied",
            "reason": f"coupon_{coupon_code}_outside_authority_for_{actor_tier}",
            "message": (
                f"Actor at tier {actor_tier} cannot issue coupon "
                f"`{coupon_code}`. LUC owns the fixed-list coupon counter."
            ),
        }

    # 2. Cross-check rate-limit
    email_hash = _hash_signal(custee_email)
    address_hash = _hash_signal(shipping_address)
    blocked = _check_coupon_rate_limit(coupon_code, custee_id, email_hash, address_hash)
    if blocked is not None:
        return blocked

    # 3. Chicken Hawk dispatch
    envelope = chicken_hawk.dispatch(
        "issue_coupon",
        {
            "coupon_code": coupon_code,
            "custee_id": custee_id,
            "actor": actor,
            "actor_tier": actor_tier,
            "custee_email": custee_email,
        },
    )
    if not envelope.get("ok"):
        return envelope  # surface the dispatch error verbatim

    # 4. Audit-ledger emit on success — record cross-check signals so the
    # next `_check_coupon_rate_limit` call finds this row. Signals are
    # hashed (no PII in the ledger summary).
    summary = (
        f"coupon={coupon_code} custee_id={custee_id} email_hash={email_hash} "
        f"address_hash={address_hash} stripe_coupon_id={envelope.get('stripe_coupon_id', '')} "
        f"promotion_code={envelope.get('promotion_code', '')}"
    )
    _audit_ledger.insert_action_receipt(
        task_id=f"coupon_{envelope.get('stripe_coupon_id', custee_id)}",
        executor=f"{actor}:{actor_tier}",
        action_type="coupon_issuance",
        destination=envelope.get("stripe_coupon_id", ""),
        status="issued",
        result_summary=summary,
    )

    return envelope


def start_checkout(session_id: str, customer_email: str) -> dict:
    """Open a Stripe Checkout session for the current cart."""
    return chicken_hawk.dispatch(
        "start_checkout",
        {"session_id": session_id, "customer_email": customer_email},
    )


def escalate_to_owner(reason: str, context: dict, urgency: str = "normal") -> dict:
    """Route a question / decision to the owner via Telegram.

    Use this for: refunds above floor, legal/threat/fraud, unusual customer asks,
    anything outside the published policy floor.
    """
    return chicken_hawk.dispatch(
        "escalate_to_owner",
        {"reason": reason, "context": context, "urgency": urgency},
    )


def handoff_to_marketing(question: str, context: dict, session_id: str) -> dict:
    """Hand off a marketing-shaped question to the Marketing PMO (Melli)."""
    return chicken_hawk.dispatch(
        "handoff",
        {"to": "marketing_pmo", "question": question, "context": context, "session_id": session_id},
    )


# ---------------------------------------------------------------------------
# Marketing PMO tools (Melli + Sett BG'z)
# ---------------------------------------------------------------------------

def draft_campaign_brief(intent_bars: str, audience: str, channels: list[str]) -> dict:
    """Draft a campaign brief in BARS notation (per Sett charter §9).

    Args:
        intent_bars: a 4-stanza BARS draft of the campaign intent (Kick / Snare / Hi-Hat / Crash)
        audience: target audience description
        channels: list of channel surfaces (e.g. ["meta", "tiktok", "podcast"])

    Returns the resolved Technical Schema after Entandra dictionary expansion.
    """
    return chicken_hawk.dispatch(
        "draft_campaign_brief",
        {"intent_bars": intent_bars, "audience": audience, "channels": channels},
    )


def funnel_design(stages: list[str], assets: list[dict]) -> dict:
    """Design a 7-stage Sett funnel (Surface → Entrance → Tunnel → Sett-Chamber → Exit → Home Chamber → Clan).

    Owned by Meles Mehli (Funnel Architect).
    """
    return chicken_hawk.dispatch("funnel_design", {"stages": stages, "assets": assets})


def forecast_funnel(funnel_id: str, horizon_days: int = 30) -> dict:
    """Pre-launch funnel forecast across all 7 stages.

    Owned by Java Nessa (Forecasting & Attribution).
    """
    return chicken_hawk.dispatch(
        "forecast_funnel",
        {"funnel_id": funnel_id, "horizon_days": horizon_days},
    )


def sign_for_culture_attribution(asset_id: str) -> dict:
    """Final brand-attribution gate before any public-facing asset publishes.

    Owned by Melli Capensi. Verifies the BARS Cultural Attribution header is
    present on the asset (per charter Appendix C).
    """
    return chicken_hawk.dispatch("sign_for_culture_attribution", {"asset_id": asset_id})


def publish_signoff(asset_id: str, channel: str) -> dict:
    """Request owner signoff to publish a public-facing marketing asset.

    Always routes to Telegram for HITL approval. Never auto-fires.
    """
    return chicken_hawk.dispatch(
        "publish_signoff",
        {"asset_id": asset_id, "channel": channel},
    )


def dispatch_bg(bg_name: str, brief: dict) -> dict:
    """Melli-only: dispatch a brief to a specific BG.

    Args:
        bg_name: one of meles_mehli, taxi_dea, arcto_nyx, ana_kuma, leu_kurus,
                 moscha_tah, persona_tah, orien_talis, eve_retti, cuc_phuong,
                 java_nessa, mar_che
        brief: the assignment payload
    """
    return chicken_hawk.dispatch("dispatch_bg", {"bg_name": bg_name, "brief": brief})


def escalate_to_acheevy(reason: str, context: dict) -> dict:
    """Sett-charter §3: marketing escalations route up to ACHEEVY (Digital CEO)."""
    return chicken_hawk.dispatch(
        "escalate_to_acheevy",
        {"reason": reason, "context": context},
    )


# ---------------------------------------------------------------------------
# Read-only / utility tools (any agent can use)
# ---------------------------------------------------------------------------

def query_catalog(category: Optional[str] = None) -> dict:
    """Read the current Coastal product catalog. No receipt."""
    return chicken_hawk.dispatch("query_catalog", {"category": category})


def query_audit_trail(task_id: str) -> dict:
    """Read the AuditLedger trail for a task_id."""
    return audit_ledger.query_audit(task_id)


def policy_check(action: str, context: dict) -> dict:
    """Ask NemoClaw to verdict an action without executing it."""
    return nemoclaw.check(action, context)


# ---------------------------------------------------------------------------
# Katteb tools — SEO + content + factcheck + humanizer
# Owner directive 2026-04-30: Katteb integrated for SEO optimization +
# marketing automation. Coastal brand_id=2029 already provisioned at Katteb.
# Tools below surface the most-used capabilities to agents (primarily Melli's
# marketing lane) and emit audit-ledger rows so lil_ledger_hawk can monitor
# credit burn (25k available on AppSumo Pro tier).
# ---------------------------------------------------------------------------

def _katteb():
    """Lazy import — keeps adapter optional at module-load if env unset."""
    from scripts.adapters import katteb_adapter as _k  # type: ignore[import-not-found]
    return _k


def seo_analyze_page(url: str, target_keywords: list[str], actor: str = "melli") -> dict:
    """Submit a Coastal URL for SEO analysis against target keywords. Returns
    a job-ID envelope; poll `seo_get_report(report_id)` for results.

    Marketing PMO tool — Melli owns dispatch; Java Nessa interprets results.
    """
    k = _katteb()
    r = k.seo_analyze(url=url, target_keywords=target_keywords)
    if r.get("ok"):
        report_id = (r.get("data") or {}).get("id", "unknown")
        audit_ledger.insert_action_receipt(
            task_id=f"katteb_seo_{report_id}",
            executor=f"{actor}:katteb",
            action_type="katteb_seo_analyze",
            destination=url,
            status="submitted",
            result_summary=f"keywords={','.join(target_keywords[:5])} latency={r.get('latency_ms')}ms",
        )
    return r


def seo_get_report(report_id: str) -> dict:
    """Poll a Katteb SEO analysis for results."""
    return _katteb().seo_get(report_id)


def factcheck_claim(claim: str, actor: str = "melli") -> dict:
    """Verify a factual claim with web search BEFORE publish. Pairs with
    claims-voider canon — any quantitative or third-party-attributed claim
    on a public-facing surface should pass this gate before
    `sign_for_culture_attribution` fires.
    """
    k = _katteb()
    r = k.factcheck_verify(claim)
    if r.get("ok"):
        audit_ledger.insert_action_receipt(
            task_id=f"katteb_factcheck_{int(_dt.datetime.now().timestamp() * 1000)}",
            executor=f"{actor}:katteb",
            action_type="katteb_factcheck",
            destination="claim_verification",
            status="verified",
            result_summary=f"claim_excerpt={claim[:120]}",
        )
    return r


def humanizer_pass(text: str, actor: str = "melli", style_id: Optional[int] = None) -> dict:
    """Detect AI-likelihood + rewrite if score above threshold. Returns
    combined envelope with detection + (if rewritten) cleaned text.

    Used by Persona Tah / Orien Talis BG'z before social/blog publish so
    AI-detection-shaped deboosts on IG/TikTok/LI don't surprise us.
    """
    k = _katteb()
    detect = k.humanizer_detect(text)
    score = (detect.get("data") or {}).get("ai_score") if detect.get("ok") else None
    rewrite = None
    if detect.get("ok") and score is not None and score > 0.7:
        rewrite = k.humanizer_rewrite(text, style_id=style_id)
    return {
        "detection": detect,
        "rewrite_applied": rewrite is not None and rewrite.get("ok", False),
        "rewrite": rewrite,
    }


def generate_blog_article(
    title: str,
    keywords: list[str],
    word_count: int = 1500,
    tone: str = "professional",
    actor: str = "melli",
) -> dict:
    """Submit a long-form article-generation job. Returns job-ID envelope;
    poll `get_article_status(article_id)` for the final content.

    Coastal use cases: sourcing transparency posts, brewing guides,
    regional-feature pieces, brand-story long-form. ~2-5 min job latency.
    """
    k = _katteb()
    r = k.generate_article(title=title, keywords=keywords, word_count=word_count, tone=tone)
    if r.get("ok"):
        article_id = (r.get("data") or {}).get("id", "unknown")
        audit_ledger.insert_action_receipt(
            task_id=f"katteb_article_{article_id}",
            executor=f"{actor}:katteb",
            action_type="katteb_generate_article",
            destination=title[:60],
            status="submitted",
            result_summary=f"keywords={','.join(keywords[:5])} word_count={word_count} tone={tone}",
        )
    return r


def get_article_status(article_id: str) -> dict:
    """Poll a Katteb article-generation job for status + content."""
    return _katteb().get_article(article_id)


def katteb_credits() -> dict:
    """Read current Katteb credit balance + plan tier. lil_ledger_hawk
    consumes for burn-rate alerts."""
    return _katteb().get_credits()
