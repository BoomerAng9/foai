"""Resend email delivery adapter for Coastal Brewing Co.

Thin wrapper around Resend's REST API. Used by /api/v1/auth/login to
deliver magic-link sign-in emails. When RESEND_API_KEY is absent, the
adapter is a no-op and the caller falls back to inline dev-mode link
return (so the auth flow still works end-to-end without email infra).

Resend docs: https://resend.com/docs/api-reference/emails/send-email
"""
from __future__ import annotations

import logging
import os
from typing import Optional

import httpx

log = logging.getLogger("coastal.resend")

RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
RESEND_API_URL = "https://api.resend.com/emails"
RESEND_FROM = os.environ.get(
    "RESEND_FROM_ADDRESS",
    "Coastal Brewing Co. <coastal@brewing.foai.cloud>",
)


def is_configured() -> bool:
    return bool(RESEND_API_KEY)


def send_email(
    to: str,
    subject: str,
    html: str,
    text: Optional[str] = None,
    timeout: float = 15.0,
) -> Optional[str]:
    """Send a transactional email via Resend. Returns the email ID on
    success, None on any failure (logs the error). Caller decides whether
    that's recoverable — for magic-link login the answer is yes
    (response stays generic to avoid email-enumeration).
    """
    if not RESEND_API_KEY:
        log.info("resend not configured — skipping send to %s", to)
        return None
    payload = {
        "from": RESEND_FROM,
        "to": [to],
        "subject": subject,
        "html": html,
    }
    if text:
        payload["text"] = text
    headers = {
        "Authorization": f"Bearer {RESEND_API_KEY}",
        "Content-Type": "application/json",
    }
    try:
        resp = httpx.post(
            RESEND_API_URL, headers=headers, json=payload, timeout=timeout,
        )
    except httpx.HTTPError as exc:
        log.warning("resend http error for %s: %s", to, exc)
        return None
    if resp.status_code != 200:
        log.warning(
            "resend send failed %s for %s: %s",
            resp.status_code, to, resp.text[:300],
        )
        return None
    body = resp.json()
    return body.get("id")


def magic_link_email_body(
    *, recipient_email: str, magic_link: str, ttl_minutes: int = 30,
) -> tuple[str, str]:
    """Compose the brand-voice HTML + plaintext body for the magic-link
    login email. Returns (html, text). Single CTA, brand palette inline,
    no marketing fluff. Designed to render cleanly in Gmail / Apple Mail
    / Outlook without external CSS."""
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
