"""add routing decision to agent run tasks

Revision ID: f2e3d4c5b6a7
Revises: f1c2d3e4a5b6
Create Date: 2026-03-08 12:30:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects import sqlite


revision: str = "f2e3d4c5b6a7"
down_revision: Union[str, None] = "f1c2d3e4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column(
        "agent_run_tasks",
        sa.Column(
            "routing_decision",
            sqlite.JSON().with_variant(postgresql.JSONB(), "postgresql"),
            nullable=True,
        ),
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column("agent_run_tasks", "routing_decision")