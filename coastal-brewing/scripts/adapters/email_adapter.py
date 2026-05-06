"""Email delivery adapter for Coastal Brewing Co.

Owner directive 2026-05-06: email automation routes through GCP /
Firebase, NOT direct third-party APIs. The adapter calls a Firebase
Cloud Function that owns the SendGrid (or future-vendor) integration —
the runner is decoupled from the email vendor entirely.

Function URL via env: COASTAL_EMAIL_FUNCTION_URL.
HMAC auth via env: COASTAL_EMAIL_FUNCTION_SECRET (Function verifies on
its end). When neither is set, send_*() are no-ops and callers fall
back to dev-mode (e.g. inline magic-link return).

Function deploy spec: see `coastal-brewing/firebase-functions/send-email/`
in the repo (TypeScript Cloud Function on the foai-aims Firebase
project, calls SendGrid HTTP API, signs replies, supports the same
template family the runner ships).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import logging
import os
import time
from typing import Optional

import httpx

log = logging.getLogger("coastal.email")

EMAIL_FUNCTION_URL = os.environ.get("COASTAL_EMAIL_FUNCTION_URL", "").strip()
EMAIL_FUNCTION_SECRET = os.environ.get("COASTAL_EMAIL_FUNCTION_SECRET", "").strip()
EMAIL_FROM = os.environ.get("COASTAL_EMAIL_FROM", "Coastal Brewing Co. <coastal@brewing.foai.cloud>")


def is_configured() -> bool:
    return bool(EMAIL_FUNCTION_URL)


def _sign_request(body_bytes: bytes) -> str:
    """HMAC-SHA256(body) using COASTAL_EMAIL_FUNCTION_SECRET. Function
    verifies the signature before forwarding to the email vendor."""
    if not EMAIL_FUNCTION_SECRET:
        return ""
    return hmac.new(
        EMAIL_FUNCTION_SECRET.encode("utf-8"),
        body_bytes,
        hashlib.sha256,
    ).hexdigest()


def send_email(
    *,
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    template_id: str = "transactional_basic",
    timeout: float = 15.0,
) -> Optional[str]:
    """POST a single transactional email through the Firebase Function.
    Returns the function's message_id on success, None on failure
    (logs the error). Never raises — caller decides recoverability."""
    if not EMAIL_FUNCTION_URL:
        log.info("email function not configured — skip send to %s", to)
        return None

    payload = {
        "from": EMAIL_FROM,
        "to": to,
        "subject": subject,
        "html": html,
        "text": text or "",
        "template_id": template_id,
        "issued_at": int(time.time()),
    }
    body = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "X-Coastal-Signature": _sign_request(body),
    }
    try:
        resp = httpx.post(EMAIL_FUNCTION_URL, content=body, headers=headers, timeout=timeout)
    except httpx.HTTPError as exc:
        log.warning("email function http error for %s: %s", to, exc)
        return None
    if resp.status_code != 200:
        log.warning(
            "email function returned %s for %s: %s",
            resp.status_code, to, resp.text[:300],
        )
        return None
    try:
        body_data = resp.json()
    except Exception:
        return None
    return body_data.get("message_id") or body_data.get("id")


def magic_link_email_body(
    *, recipient_email: str, magic_link: str, ttl_minutes: int = 30,
) -> tuple[str, str]:
    """Compose the brand-voice HTML + plaintext body for the magic-link
    login email. Same content shape regardless of email vendor — the
    Cloud Function template_id picks the wrapper."""
    html = f"""<!doctype html>
<html><body style="margin:0;background:#f3efe6;font-family:ui-serif,Georgia,'Times New Roman',serif;color:#1a1612">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3efe6;padding:48px 16px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border:1px solid #d8d2c4;">
        <tr><td style="padding:40px 36px 24px 36px;">
          <p style="margin:0 0 8px 0;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;color:#6b8e4e;">
            Coastal Brewing Co.
          </p>
          <h1 style="margin:0 0 8px 0;font-size:32px;line-height:1.1;font-weight:600;letter-spacing:-0.02em;color:#1a1612;">
            Pull up to the counter.
          </h1>
          <p style="margin:24px 0 0 0;font-size:16px;line-height:1.6;color:#6a665d;">
            Click below to sign in to your Coastal account. Same cup, new
            device — no password to remember.
          </p>
        </td></tr>
        <tr><td style="padding:8px 36px 32px 36px;">
          <a href="{magic_link}" style="display:inline-block;background:#1a1612;color:#f3efe6;padding:14px 28px;font-family:ui-monospace,Menlo,monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;">
            Sign me in
          </a>
        </td></tr>
        <tr><td style="padding:24px 36px 36px 36px;border-top:1px solid #e8e4da;">
          <p style="margin:0 0 8px 0;font-size:12px;line-height:1.5;color:#6a665d;">
            This link expires in {ttl_minutes} minutes and can only be
            used once. If you didn&rsquo;t ask to sign in, you can ignore
            this — your account stays as it is.
          </p>
          <p style="margin:16px 0 0 0;font-family:ui-monospace,Menlo,monospace;font-size:10px;letter-spacing:0.12em;color:#a39b8c;">
            Real fine — Coastal Brewing Co.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>"""

    text = (
        f"Pull up to the counter.\n\n"
        f"Click below to sign in to your Coastal Brewing Co. account:\n\n"
        f"{magic_link}\n\n"
        f"This link expires in {ttl_minutes} minutes and can only be used once.\n"
        f"If you didn't ask to sign in, you can ignore this email.\n\n"
        f"Real fine — Coastal Brewing Co.\n"
    )
    return html, text
