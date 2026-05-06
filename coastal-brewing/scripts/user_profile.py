"""User-profile + greeting layer for Coastal Brewing Co.

Persists per-customer profile, session, and purchase records in the
shared FOAI Neon database (`coastal` schema). Powers the canonical
ACHEEVY first-time / returning / within-24h greeting variants per
`Chain of thought research.txt` lines 846-942.

Identity model:
- Anonymous-first via `coastal_uid` cookie (UUIDv4, set by the runner
  on first contact, persisted client-side for 1 year).
- Upgrade-on-login: when a customer authenticates (Stripe email match
  or future auth), the runner merges any anonymous profile into the
  identity-bound profile so preferences and history carry forward.

Tables (created out-of-band via migration; see scripts/migrate_neon.py):
- coastal.user_profile  — one row per coastal_uid
- coastal.user_session  — one row per chat session (with summary + embedding)
- coastal.user_purchase — one row per Stripe checkout completion

The Neon DSN is read from NEON_DATABASE_URL. Connections are pooled
client-side via psycopg2's SimpleConnectionPool so the runner doesn't
exhaust Neon's connection cap under chat traffic.
"""
from __future__ import annotations

import json
import logging
import os
import secrets
import threading
import uuid
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any, Iterator, Optional

import psycopg2
import psycopg2.extras
from psycopg2 import pool

log = logging.getLogger("coastal.user_profile")

NEON_DATABASE_URL = os.environ.get("NEON_DATABASE_URL", "").strip()

# Greeting cadence thresholds (per Chain of thought research.txt).
WITHIN_SAME_SESSION_MINUTES = 60          # under 1h since last_visit → no re-greeting
RETURNING_LONG_BREAK_HOURS = 24           # ≥24h since last_visit → returning long-break

# Path-selection canon (per feedback_coastal_is_retail_sales_not_rfp.md).
PATH_CHOICES = ("guide_me", "shop_for_me", "direct_to_marketplace")

# Preference categories surfaced as buttons on first-time greeting.
PREFERENCE_CATEGORIES = ("coffee", "tea", "mushroom_functional")


# ─── Connection pool ──────────────────────────────────────────────────────


_pool: Optional[pool.SimpleConnectionPool] = None
_pool_lock = threading.Lock()


def _get_pool() -> Optional[pool.SimpleConnectionPool]:
    global _pool
    if not NEON_DATABASE_URL:
        return None
    with _pool_lock:
        if _pool is None:
            _pool = pool.SimpleConnectionPool(
                minconn=1,
                maxconn=8,
                dsn=NEON_DATABASE_URL,
                connect_timeout=10,
            )
            log.info("user_profile: Neon connection pool initialized (1-8)")
    return _pool


@contextmanager
def _conn() -> Iterator[Any]:
    p = _get_pool()
    if p is None:
        raise RuntimeError(
            "NEON_DATABASE_URL is not configured — user-profile RAG is disabled. "
            "Set the env var on coastal-runner to enable."
        )
    c = p.getconn()
    try:
        yield c
    finally:
        p.putconn(c)


def is_configured() -> bool:
    """True iff NEON_DATABASE_URL is set. Callers should fall back to
    anonymous-no-RAG behavior when this is False rather than raising."""
    return bool(NEON_DATABASE_URL)


# ─── Identity ─────────────────────────────────────────────────────────────


def new_coastal_uid() -> str:
    """Generate a new anonymous coastal_uid (cookie value).
    Format: `cuid_<32-hex>` for grep-ability in logs."""
    return f"cuid_{secrets.token_hex(16)}"


# ─── Profile dataclass ────────────────────────────────────────────────────


@dataclass
class Profile:
    coastal_uid: str
    identity: Optional[str]
    first_visit_at: datetime
    last_visit_at: datetime
    visit_count: int
    preferences: dict
    last_path_choice: Optional[str]
    last_summary: Optional[str]
    last_purchase_sku: Optional[str]
    last_purchase_label: Optional[str]
    last_purchase_at: Optional[datetime]
    metadata: dict

    @classmethod
    def from_row(cls, row: dict) -> "Profile":
        return cls(
            coastal_uid=row["coastal_uid"],
            identity=row.get("identity"),
            first_visit_at=row["first_visit_at"],
            last_visit_at=row["last_visit_at"],
            visit_count=row["visit_count"],
            preferences=row.get("preferences") or {},
            last_path_choice=row.get("last_path_choice"),
            last_summary=row.get("last_summary"),
            last_purchase_sku=row.get("last_purchase_sku"),
            last_purchase_label=row.get("last_purchase_label"),
            last_purchase_at=row.get("last_purchase_at"),
            metadata=row.get("metadata") or {},
        )


# ─── Profile reads ────────────────────────────────────────────────────────


def get_profile(coastal_uid: str) -> Optional[Profile]:
    """Fetch the profile for a given coastal_uid. Returns None if no row."""
    if not is_configured():
        return None
    with _conn() as c:
        with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                "SELECT * FROM coastal.user_profile WHERE coastal_uid = %s",
                (coastal_uid,),
            )
            row = cur.fetchone()
            if row is None:
                return None
            return Profile.from_row(row)


def upsert_profile_visit(coastal_uid: str) -> Profile:
    """Touch a profile: create if missing, otherwise bump last_visit_at +
    visit_count. Returns the resulting profile."""
    with _conn() as c:
        c.autocommit = True
        with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                INSERT INTO coastal.user_profile (coastal_uid)
                VALUES (%s)
                ON CONFLICT (coastal_uid) DO UPDATE
                SET last_visit_at = NOW(),
                    visit_count = coastal.user_profile.visit_count + 1
                RETURNING *
                """,
                (coastal_uid,),
            )
            row = cur.fetchone()
            return Profile.from_row(row)


def update_preferences(
    coastal_uid: str,
    preferences: dict,
    path_choice: Optional[str] = None,
) -> Profile:
    """Merge new preferences into the profile (JSONB ||) and optionally
    record the path-selection choice. Profile must already exist."""
    if path_choice and path_choice not in PATH_CHOICES:
        raise ValueError(f"path_choice must be one of {PATH_CHOICES}, got {path_choice!r}")
    with _conn() as c:
        c.autocommit = True
        with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            if path_choice:
                cur.execute(
                    """
                    UPDATE coastal.user_profile
                    SET preferences = preferences || %s::jsonb,
                        last_path_choice = %s
                    WHERE coastal_uid = %s
                    RETURNING *
                    """,
                    (json.dumps(preferences), path_choice, coastal_uid),
                )
            else:
                cur.execute(
                    """
                    UPDATE coastal.user_profile
                    SET preferences = preferences || %s::jsonb
                    WHERE coastal_uid = %s
                    RETURNING *
                    """,
                    (json.dumps(preferences), coastal_uid),
                )
            row = cur.fetchone()
            if row is None:
                raise LookupError(f"no profile for coastal_uid={coastal_uid}")
            return Profile.from_row(row)


def find_by_identity(identity: str) -> Optional[Profile]:
    """Look up a profile by identity (email). Returns the most-recently-active
    row for that identity, or None. Used by the login flow to find the
    canonical `coastal_uid` to bind a returning user's session to so a
    customer signing in on a new device picks up their existing history."""
    p = _get_pool()
    if p is None:
        return None
    with _conn() as c:
        c.autocommit = True
        with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                SELECT *
                FROM coastal.user_profile
                WHERE identity = %s
                ORDER BY last_visit_at DESC
                LIMIT 1
                """,
                (identity,),
            )
            row = cur.fetchone()
            return Profile.from_row(row) if row else None


def update_metadata(coastal_uid: str, metadata: dict) -> Profile:
    """Replace the metadata JSON for a profile (e.g. to record stripe
    customer_id + display_name on signup). Caller is responsible for
    merging with existing metadata if they want partial-update semantics."""
    with _conn() as c:
        c.autocommit = True
        with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE coastal.user_profile
                SET metadata = %s::jsonb
                WHERE coastal_uid = %s
                RETURNING *
                """,
                (json.dumps(metadata), coastal_uid),
            )
            row = cur.fetchone()
            if row is None:
                raise LookupError(f"no profile for coastal_uid={coastal_uid}")
            return Profile.from_row(row)


def update_identity(coastal_uid: str, identity: str) -> Profile:
    """Upgrade an anonymous profile to identity-bound (e.g. Stripe email).
    If two anonymous profiles point at the same identity, the most recent
    visit wins for top-level fields; preferences are merged.

    For now the simple case: just set the identity field. Cross-uid merge
    (when a user uses multiple devices) is a future enhancement."""
    with _conn() as c:
        c.autocommit = True
        with c.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                """
                UPDATE coastal.user_profile
                SET identity = %s
                WHERE coastal_uid = %s
                RETURNING *
                """,
                (identity, coastal_uid),
            )
            row = cur.fetchone()
            if row is None:
                raise LookupError(f"no profile for coastal_uid={coastal_uid}")
            return Profile.from_row(row)


# ─── Purchase + session writes ────────────────────────────────────────────


def record_purchase(
    *,
    coastal_uid: str,
    sku: str,
    sku_label: Optional[str] = None,
    amount_cents: Optional[int] = None,
    currency: str = "usd",
    stripe_session_id: Optional[str] = None,
    metadata: Optional[dict] = None,
) -> str:
    """Insert a purchase row + update the profile's last_purchase_* fields.
    Returns the purchase_id (UUID-based)."""
    purchase_id = f"pur_{uuid.uuid4().hex[:24]}"
    md = metadata or {}
    with _conn() as c:
        c.autocommit = True
        with c.cursor() as cur:
            # Ensure the profile exists (chat may not have happened yet for
            # this uid — direct-to-cart flow).
            cur.execute(
                "INSERT INTO coastal.user_profile (coastal_uid) VALUES (%s) "
                "ON CONFLICT (coastal_uid) DO NOTHING",
                (coastal_uid,),
            )
            cur.execute(
                """
                INSERT INTO coastal.user_purchase
                    (purchase_id, coastal_uid, sku, sku_label, amount_cents,
                     currency, stripe_session_id, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s::jsonb)
                """,
                (
                    purchase_id, coastal_uid, sku, sku_label, amount_cents,
                    currency, stripe_session_id, json.dumps(md),
                ),
            )
            cur.execute(
                """
                UPDATE coastal.user_profile
                SET last_purchase_sku = %s,
                    last_purchase_label = %s,
                    last_purchase_at = NOW()
                WHERE coastal_uid = %s
                """,
                (sku, sku_label, coastal_uid),
            )
    return purchase_id


def record_session_summary(
    *,
    coastal_uid: str,
    session_id: Optional[str] = None,
    summary: str,
    summary_embedding: Optional[list[float]] = None,
    metadata: Optional[dict] = None,
) -> str:
    """Insert a session-summary row + update the profile's last_summary.
    Returns the session_id (UUID-based, generated if not provided)."""
    sid = session_id or f"ses_{uuid.uuid4().hex[:24]}"
    md = metadata or {}
    with _conn() as c:
        c.autocommit = True
        with c.cursor() as cur:
            cur.execute(
                "INSERT INTO coastal.user_profile (coastal_uid) VALUES (%s) "
                "ON CONFLICT (coastal_uid) DO NOTHING",
                (coastal_uid,),
            )
            cur.execute(
                """
                INSERT INTO coastal.user_session
                    (session_id, coastal_uid, ended_at, summary,
                     summary_embedding, metadata)
                VALUES (%s, %s, NOW(), %s, %s, %s::jsonb)
                """,
                (sid, coastal_uid, summary, summary_embedding, json.dumps(md)),
            )
            cur.execute(
                "UPDATE coastal.user_profile SET last_summary = %s WHERE coastal_uid = %s",
                (summary, coastal_uid),
            )
    return sid


# ─── Greeting variant logic ───────────────────────────────────────────────


def pick_greeting_variant(profile: Optional[Profile]) -> dict:
    """Resolve which greeting variant to fire for this customer.

    Returns a dict shaped for the chat-panel:
      {
        "variant": "first_time" | "within_session" | "returning" | "returning_long_break",
        "greeting": str,
        "show_path_buttons": bool,
        "show_preference_buttons": bool,
        "context": {                   # optional, for personalization
            "last_purchase_label": str | None,
            "preferences": dict,
            "visit_count": int,
        }
      }

    Variants:
      first_time           — no profile yet
      within_session       — last_visit < WITHIN_SAME_SESSION_MINUTES ago, no re-intro
      returning            — between WITHIN_SAME_SESSION_MINUTES and RETURNING_LONG_BREAK_HOURS
      returning_long_break — ≥ RETURNING_LONG_BREAK_HOURS since last_visit
    """
    if profile is None or profile.visit_count <= 1:
        return {
            "variant": "first_time",
            "greeting": "Welcome to Coastal Brewing Co. I'm ACHEEVY. How can I help you today?",
            "show_path_buttons": True,
            "show_preference_buttons": True,
            "context": {
                "last_purchase_label": None,
                "preferences": {},
                "visit_count": 1,
            },
        }

    now = datetime.now(timezone.utc)
    last_visit = profile.last_visit_at
    if last_visit.tzinfo is None:
        last_visit = last_visit.replace(tzinfo=timezone.utc)
    delta = now - last_visit

    ctx = {
        "last_purchase_label": profile.last_purchase_label,
        "preferences": profile.preferences,
        "visit_count": profile.visit_count,
    }

    if delta < timedelta(minutes=WITHIN_SAME_SESSION_MINUTES):
        # Same session — pick up seamlessly, no re-greeting at all.
        return {
            "variant": "within_session",
            "greeting": "",
            "show_path_buttons": False,
            "show_preference_buttons": False,
            "context": ctx,
        }

    if delta < timedelta(hours=RETURNING_LONG_BREAK_HOURS):
        # Same-day returning, but separate session — light re-engage.
        return {
            "variant": "returning",
            "greeting": (
                "Welcome back to Coastal Brewing Co. Picking up where we left off — "
                "what can I help you find?"
            ),
            "show_path_buttons": True,
            "show_preference_buttons": False,
            "context": ctx,
        }

    # Long break — reference last purchase if we have one.
    if profile.last_purchase_label:
        greeting = (
            f"Welcome back to Coastal Brewing Co. How was that "
            f"{profile.last_purchase_label}? Ready for more, or want to try "
            f"something new?"
        )
    else:
        greeting = (
            "Welcome back to Coastal Brewing Co. Good to see you again. "
            "What are you in the mood for today?"
        )
    return {
        "variant": "returning_long_break",
        "greeting": greeting,
        "show_path_buttons": True,
        "show_preference_buttons": True,
        "context": ctx,
    }


# ─── Profile context for system prompt injection ──────────────────────────


def profile_context_for_prompt(profile: Optional[Profile]) -> str:
    """Render a compact human-readable summary of the customer's profile,
    suitable for prepending to ACHEEVY's system prompt so he can reference
    history naturally. Returns an empty string when there's no useful
    history to inject (first-time visitor).
    """
    if profile is None or profile.visit_count <= 1:
        return ""

    lines: list[str] = ["CUSTOMER CONTEXT (use naturally, don't recite):"]
    lines.append(f"- visit count: {profile.visit_count}")

    last_seen = profile.last_visit_at
    if last_seen.tzinfo is None:
        last_seen = last_seen.replace(tzinfo=timezone.utc)
    age_hours = (datetime.now(timezone.utc) - last_seen).total_seconds() / 3600
    if age_hours < 1:
        lines.append(f"- last seen: {int(age_hours * 60)} minutes ago")
    elif age_hours < 24:
        lines.append(f"- last seen: {int(age_hours)} hours ago")
    else:
        lines.append(f"- last seen: {int(age_hours / 24)} days ago")

    if profile.last_purchase_label:
        lines.append(f"- last purchase: {profile.last_purchase_label}")
        if profile.last_purchase_at:
            pa = profile.last_purchase_at
            if pa.tzinfo is None:
                pa = pa.replace(tzinfo=timezone.utc)
            days = (datetime.now(timezone.utc) - pa).days
            lines.append(f"- purchased: {days} days ago")

    if profile.preferences:
        likes = profile.preferences.get("likes")
        if likes:
            lines.append(f"- preferences: {', '.join(likes)}")

    if profile.last_summary:
        lines.append(f"- last conversation: {profile.last_summary}")

    if profile.last_path_choice:
        lines.append(f"- preferred path: {profile.last_path_choice}")

    lines.append(
        "Reference this only if it makes the response more useful. Never recite "
        "verbatim. Never explicitly acknowledge tracking the customer."
    )
    return "\n".join(lines) + "\n\n===\n\n"
