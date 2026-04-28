"""Email send adapter — SMTP via Google Workspace, env-gated.

Defaults to Google's SMTP relay (smtp.gmail.com:587 with STARTTLS) using
an App Password generated from the owner's Workspace account. No new
vendor. No new Python dependencies — Python's stdlib smtplib + ssl
handle the entire transport.

If SMTP_USER + SMTP_PASSWORD are not set, send returns skipped=True
without contacting the SMTP server. The system stays functional for
dev/no-creds without faking completion.

Receipts are recorded to AuditLedger.action_receipts via the caller.
This module only handles the send + result shape.
"""
from __future__ import annotations

import os
import smtplib
import ssl
from dataclasses import dataclass
from email.message import EmailMessage
from email.utils import formataddr, make_msgid
from typing import Optional


@dataclass
class EmailSendResult:
    sent: bool
    message_id: Optional[str]
    provider: str
    detail: Optional[str]
    skipped: bool = False
    error: Optional[str] = None


def _smtp_host() -> str:
    return os.environ.get("SMTP_HOST", "smtp.gmail.com")


def _smtp_port() -> int:
    try:
        return int(os.environ.get("SMTP_PORT", "587"))
    except ValueError:
        return 587


def _smtp_user() -> str:
    return os.environ.get("SMTP_USER", "").strip()


def _smtp_password() -> str:
    return os.environ.get("SMTP_PASSWORD", "")


def _default_from() -> str:
    """Sender address. Owner sets EMAIL_FROM (display + address). If not
    set, falls back to the SMTP_USER raw address."""
    explicit = os.environ.get("EMAIL_FROM", "").strip()
    if explicit:
        return explicit
    user = _smtp_user()
    if user:
        return formataddr(("Coastal Brewing", user))
    return ""


def is_configured() -> bool:
    return bool(_smtp_user() and _smtp_password())


def send(
    to: str,
    subject: str,
    body_markdown: str,
    *,
    from_addr: Optional[str] = None,
    reply_to: Optional[str] = None,
) -> EmailSendResult:
    """Send a transactional email via SMTP. Never raises; returns a
    structured result that the caller records into AuditLedger."""
    if not is_configured():
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="smtp",
            detail="SMTP_USER + SMTP_PASSWORD not configured — email skipped",
            skipped=True,
        )

    if not to or "@" not in to:
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="smtp",
            detail=f"invalid recipient: {to!r}",
            error="invalid_recipient",
        )

    sender = from_addr or _default_from()
    if not sender:
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="smtp",
            detail="no sender configured (set EMAIL_FROM or SMTP_USER)",
            error="no_sender",
        )

    msg = EmailMessage()
    msg["From"] = sender
    msg["To"] = to
    msg["Subject"] = subject or "(no subject)"
    msg_id = make_msgid(domain=_smtp_user().split("@")[-1] if "@" in _smtp_user() else "coastal-brewing.local")
    msg["Message-ID"] = msg_id
    if reply_to:
        msg["Reply-To"] = reply_to
    msg.set_content(body_markdown)
    msg.add_alternative(_markdown_to_html(body_markdown), subtype="html")

    host = _smtp_host()
    port = _smtp_port()
    user = _smtp_user()
    password = _smtp_password()

    try:
        if port == 465:
            context = ssl.create_default_context()
            with smtplib.SMTP_SSL(host, port, context=context, timeout=20) as s:
                s.login(user, password)
                s.send_message(msg)
        else:
            with smtplib.SMTP(host, port, timeout=20) as s:
                s.ehlo()
                s.starttls(context=ssl.create_default_context())
                s.ehlo()
                s.login(user, password)
                s.send_message(msg)
        return EmailSendResult(
            sent=True,
            message_id=msg_id,
            provider="smtp",
            detail=f"to={to} subject={subject!r} via {host}:{port}",
        )
    except smtplib.SMTPAuthenticationError as e:
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="smtp",
            detail=f"SMTP auth failed: {e}",
            error="smtp_auth",
        )
    except (smtplib.SMTPException, OSError) as e:
        return EmailSendResult(
            sent=False,
            message_id=None,
            provider="smtp",
            detail=f"SMTP error: {e}",
            error="smtp_error",
        )


def _markdown_to_html(md: str) -> str:
    """Minimal markdown → HTML wrap for transactional email.
    Handles paragraphs, line breaks, headers (h1–h3), and unordered lists.
    Sufficient for owner-drafted emails where the source already reads
    cleanly. Escapes &, <, >."""
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
