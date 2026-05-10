# SIDELINED 2026-05-09 — superseded by GCP Application Integration

Owner directive 2026-05-09: email automation routes through GCP
Application Integration "Send Email" task, NOT through this Firebase
Function + SendGrid path. SendGrid is ruled out as a vendor.

This directory is preserved on disk per the project's never-delete
rule. The runner's `email_adapter.py` no longer calls this function;
it now POSTs to the AppInt API trigger configured per
`docs/email-via-appint-runbook.md`.

## What stays valid here for future reference

- The HMAC request-signing pattern (`X-Coastal-Signature`) is reusable
  if we ever add a Cloud Function for non-email workflows.
- The vendor-abstraction reasoning (template registry, webhook
  termination point, vendor swap) still holds — if we add HTML
  templates later (welcome card share, order confirm, ship notif),
  the candidate path is Workspace SMTP relay or Gmail API service
  account, NOT this function.

## Why we moved off

- Owner removed SendGrid from the candidate vendor list.
- AppInt Send Email is a GCP-native path with no third-party email
  vendor (delivery handled by Google).
- Tradeoff accepted: AppInt is plaintext-only — fine for the
  magic-link auth email, requires a layered HTML path later for
  branded customer emails.
