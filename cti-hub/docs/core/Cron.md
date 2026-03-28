# Cron / Job Routines

Routine background jobs managed securely via the A.I.M.S. Node clusters.

- Database Snapshot: Automated persistence using systemd/cron and PostgreSQL pg_dump.
- Cleanup: Invalidation of stale Prototype states, inactive temporary Memory entries, or log expiry.
- Sync Ops: Trigger webhooks pulling down outside references to update registry scopes.
