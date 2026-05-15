"""foai.audit_ledger writer + shared SQLAlchemy models.

Track B (#93) Phase 1. Library called by every FOAI service that produces
audit events; sync worker (Phase 5) reads the same models for the Taskade
mirror.

Imports:
    from foai.runtime.audit_ledger import write_event, AuditEvent, Base
"""

from .models import AuditEvent, Base
from .writer import AuditWriter, get_audit_engine, write_event

__all__ = ["AuditEvent", "AuditWriter", "Base", "get_audit_engine", "write_event"]
