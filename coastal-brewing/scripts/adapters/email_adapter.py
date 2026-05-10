"""Email delivery adapter for Coastal Brewing Co.

Owner directive 2026-05-09: email automation routes through GCP
Application Integration ("Send Email" task), NOT SendGrid or any
third-party email vendor. The adapter POSTs to an AppInt API-trigger
URL; the integration's Send Email task fires inside the
ai-managed-services GCP project.

Constraints inherited from AppInt Send Email:
- Plaintext body only (no HTML — AppInt task supports plaintext only).
- Up to 30 recipients per call (we send 1-to-1 here).
- Subject + Body string properties; recipient is the integration
  variable wired into the task's `Recipients` field.

Env:
- `COASTAL_APPINT_EMAIL_URL`  — full executeIntegration URL for the
  Send Email integration's API trigger. Format:
  https://<region>-integrations.googleapis.com/v2/projects/<PROJECT>/locations/<REGION>/integrations/<INTEGRATION>:execute
- `COASTAL_APPINT_AUTH_TOKEN` — Bearer token for the request. Either
  a Google-issued OAuth access token from a service account with
  `roles/integrations.integrationInvoker`, OR the API key configured
  on the integration's API trigger (depending on owner's chosen auth
  mode in the AppInt console).
- `COASTAL_EMAIL_FROM`         — from-display string. AppInt sender
  identity is owned by the integration's service account / Workspace
  binding, not by the runner. This env is recorded for audit only.

When `COASTAL_APPINT_EMAIL_URL` is unset, send_*() are no-ops and
callers fall back to dev-mode (e.g. inline magic-link return on
/api/v1/auth/login).
"""
from __future__ import annotations

import json
import logging
import os
import time
from typing import Optional

import httpx

log = logging.getLogger("coastal.email")

APPINT_EMAIL_URL = os.environ.get("COASTAL_APPINT_EMAIL_URL", "").strip()
APPINT_AUTH_TOKEN = os.environ.get("COASTAL_APPINT_AUTH_TOKEN", "").strip()
EMAIL_FROM = os.environ.get(
    "COASTAL_EMAIL_FROM",
    "Coastal Brewing Co. <coastal@brewing.foai.cloud>",
)


def is_configured() -> bool:
    return bool(APPINT_EMAIL_URL)


def send_email(
    *,
    to: str,
    subject: str,
    text: str,
    template_id: str = "transactional_basic",
    timeout: float = 20.0,
    html: Optional[str] = None,  # accepted for backward-compat; ignored
) -> Optional[str]:
    """POST a single transactional email through the AppInt Send Email
    integration. Returns the integration's executionId on success, None
    on failure (logs the error). Never raises — caller decides
    recoverability.

    `html` is accepted for backward-compat with prior callers but is
    discarded — AppInt Send Email is plaintext-only. Pass the same
    content as `text` for now; HTML support requires a different
    delivery surface (Workspace SMTP relay or Gmail API service
    account) layered on later.
    """
    if html is not None:
        log.debug("html argument ignored — AppInt Send Email is plaintext-only")

    if not APPINT_EMAIL_URL:
        log.info("appint email url not configured — skip send to %s", to)
        return None

    # Application Integration executeIntegration body shape. Input
    # parameters map to integration variables wired into the Send Email
    # task's Recipients / Subject / Body fields.
    payload = {
        "inputParameters": {
            "recipient_email": {"stringValue": to},
            "email_subject":   {"stringValue": subject},
            "email_body":      {"stringValue": text},
            "template_id":     {"stringValue": template_id},
            "issued_at":       {"longValue": str(int(time.time()))},
        },
    }
    headers = {"Content-Type": "application/json"}
    if APPINT_AUTH_TOKEN:
        headers["Authorization"] = f"Bearer {APPINT_AUTH_TOKEN}"

    try:
        resp = httpx.post(
            APPINT_EMAIL_URL,
            content=json.dumps(payload).encode("utf-8"),
            headers=headers,
            timeout=timeout,
        )
    except httpx.HTTPError as exc:
        log.warning("appint email http error for %s: %s", to, exc)
        return None
    if resp.status_code not in (200, 202):
        log.warning(
            "appint email returned %s for %s: %s",
            resp.status_code, to, resp.text[:300],
        )
        return None
    try:
        body_data = resp.json()
    except Exception:
        return None
    return body_data.get("executionId") or body_data.get("execution_id")


def magic_link_email_body(
    *, recipient_email: str, magic_link: str, ttl_minutes: int = 30,
) -> tuple[str, str]:
    """Compose plaintext body + matching subject-friendly preamble for
    the magic-link login email. AppInt Send Email is plaintext-only,
    so HTML is not produced. Return shape stays `(html, text)` so
    existing callers don't break — `html` mirrors `text`.
    """
    text = (
        "Pull up to the counter.\n\n"
        "Click below to sign in to your Coastal Brewing Co. account "
        "— same cup, new device, no password to remember.\n\n"
        f"{magic_link}\n\n"
        f"This link expires in {ttl_minutes} minutes and can only be used once. "
        "If you didn't ask to sign in, you can ignore this email — your "
        "account stays as it is.\n\n"
        "Real fine — Coastal Brewing Co.\n"
    )
    # Keep tuple shape for backward-compat with api_server.py call site.
    # Both elements are identical plaintext under AppInt.
    return text, text
