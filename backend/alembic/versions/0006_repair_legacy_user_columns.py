"""Repair legacy user columns.

Revision ID: 0006_repair_legacy_user_columns
Revises: 0005_job_events
Create Date: 2026-06-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006_repair_legacy_user_columns"
down_revision: str | None = "0005_job_events"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    if _missing_column(inspector, "analysis_history", "user_id"):
        op.add_column("analysis_history", sa.Column("user_id", sa.Integer(), nullable=True))
    if _missing_index(inspector, "analysis_history", "ix_analysis_history_user_id"):
        op.create_index("ix_analysis_history_user_id", "analysis_history", ["user_id"])

    if _missing_column(inspector, "analysis_jobs", "user_id"):
        op.add_column("analysis_jobs", sa.Column("user_id", sa.Integer(), nullable=True))
    if _missing_index(inspector, "analysis_jobs", "ix_analysis_jobs_user_id"):
        op.create_index("ix_analysis_jobs_user_id", "analysis_jobs", ["user_id"])


def downgrade() -> None:
    pass


def _missing_column(inspector: sa.Inspector, table_name: str, column_name: str) -> bool:
    columns = {column["name"] for column in inspector.get_columns(table_name)}
    return column_name not in columns


def _missing_index(inspector: sa.Inspector, table_name: str, index_name: str) -> bool:
    indexes = {index["name"] for index in inspector.get_indexes(table_name)}
    return index_name not in indexes
