"""Taskade sync worker — mirrors foai.audit_ledger to Taskade.

Track C of the Taskade integration plan (#94). Owns the cron loop that
reads unsynced rows from foai.audit_ledger and pushes them to the
Taskade audit-ledger-mirror folder via the Taskade adapter service.
"""
