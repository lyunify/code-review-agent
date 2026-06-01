"""Add auth lookup indexes.

Revision ID: 0003_auth_lookup_indexes
Revises: 0002_auth_foundation
Create Date: 2026-06-01
"""

from collections.abc import Sequence

from alembic import op

revision: str = "0003_auth_lookup_indexes"
down_revision: str | None = "0002_auth_foundation"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_index("ix_sessions_user_id", "sessions", ["user_id"])
    op.create_index("ix_analysis_history_user_id", "analysis_history", ["user_id"])
    op.create_index("ix_analysis_jobs_user_id", "analysis_jobs", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_analysis_jobs_user_id", table_name="analysis_jobs")
    op.drop_index("ix_analysis_history_user_id", table_name="analysis_history")
    op.drop_index("ix_sessions_user_id", table_name="sessions")
