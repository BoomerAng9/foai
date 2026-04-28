"""Email send adapter — Resend-first, env-gated.

If RESEND_API_KEY is set, transactional email goes through Resend.
If not set, the adapter returns a skip-receipt without sending — keeps
the system functional for dev/no-creds without faking completion.

Receipts are recorded to AuditLedger.action_receipts via the caller.
This module only handles the send + result shape.
"""
from __future__ import annotations

import os
from dataclasses import dataclass
from typing import Optional

import requests

RESEND_API_BASE = "https://api.resend.com"


@dataclass
class EmailSendResult:
    sent: bool
    message_id: Optional[str]
    provider: str
    detail: Optional[str]
    skipped: bool = False
    error: Optional[str] = None


def _resend_api_key() -> str:
    return os.environ.get("RESEND_API_KEY", "").strip()


def _default_from() -> str:
    """Sender address. Owner overrides via RESEND_FROM env.
    Falls back to Resend's verified onboarding domain so transactional
    email works before owner verifies a brand domain."""
    return os.environ.get("RESEND_FROM", "Coastal Brewing <onboarding@resend.dev>")


def is_configured() -> bool:
    return bool(_resend_api_key())


def send(
    to: str,
    subject: str,
    body_markdown: str,
    *,
    from_addr: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> EmailSendResult:
    """Send a transactional email. Returns a structured result; never raises.

    body_markdown is rendered as both plain-text and a minimal HTML wrap.
    """
    if not _resend_api_key():
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="resend",
            detail="RESEND_API_KEY not configured — email skipped",
            skipped=True,
        )

    if not to or "@" not in to:
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="resend",
            detail=f"invalid recipient: {to!r}",
            error="invalid_recipient",
        )

    payload: dict = {
        "from": from_addr or _default_from(),
        "to": [to],
        "subject": subject or "(no subject)",
        "text": body_markdown,
        "html": _markdown_to_html(body_markdown),
    }
    if reply_to:
        payload["reply_to"] = [reply_to]

    headers = {
        "Authorization": f"Bearer {_resend_api_key()}",
        "Content-Type": "application/json",
    }

    try:
        r = requests.post(
            f"{RESEND_API_BASE}/emails",
            json=payload,
            headers=headers,
            timeout=20.0,
        )
        if r.status_code >= 400:
            return EmailSendResult(
                sent=False,
                message_id=None,
                provider="resend",
                detail=f"HTTP {r.status_code}: {r.text[:240]}",
                error=f"http_{r.status_code}",
            )
        data = r.json()
        return EmailSendResult(
            sent=True,
            message_id=str(data.get("id") or ""),
            provider="resend",
            detail=f"to={to} subject={subject!r}",
        )
    except requests.RequestException as e:
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="resend",
            detail=f"network error: {e}",
            error="network",
        )


def _markdown_to_html(md: str) -> str:
    """Minimal markdown → HTML wrap for transactional email.
    Not a full markdown engine — handles paragraphs, line breaks, headers,
    and unordered lists. Sufficient for owner-drafted emails where the
    source already reads cleanly."""
    if not md:
        return "<p></p>"
    safe = (
        md.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    paragraphs: list[str] = []
    for block in safe.split("\n\n"):
        block = block.strip("\n")
        if not block:
            continue
        if block.startswith("# "):
            paragraphs.append(f"<h1>{block[2:].strip()}</h1>")
        elif block.startswith("## "):
            paragraphs.append(f"<h2>{block[3:].strip()}</h2>")
        elif block.startswith("### "):
            paragraphs.append(f"<h3>{block[4:].strip()}</h3>")
        elif all(line.lstrip().startswith(("- ", "* ")) for line in block.splitlines()):
            items = "".join(
                f"<li>{line.lstrip()[2:].strip()}</li>" for line in block.splitlines()
            )
            paragraphs.append(f"<ul>{items}</ul>")
        else:
            paragraphs.append("<p>" + block.replace("\n", "<br>") + "</p>")
    body_html = "\n".join(paragraphs)
    return (
        "<!doctype html><html><body style=\"font-family:ui-sans-serif,system-ui,"
        "-apple-system,Segoe UI,sans-serif;color:#1a1a1a;line-height:1.55;"
        "max-width:560px;margin:24px auto;padding:0 16px\">"
        f"{body_html}"
        "</body></html>"
    )
