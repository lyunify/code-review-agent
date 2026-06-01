"""Repair legacy analysis columns.

Revision ID: 0007_repair_legacy_analysis_columns
Revises: 0006_repair_legacy_user_columns
Create Date: 2026-06-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0007_repair_legacy_analysis_columns"
down_revision: str | None = "0006_repair_legacy_user_columns"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    bind = op.get_bind()
    inspector = sa.inspect(bind)

    _ensure_columns(
        inspector,
        "analysis_history",
        [
            ("repo_url", sa.String(), False),
            ("created_at", sa.String(), False),
            ("total_files", sa.Integer(), False),
            ("total_directories", sa.Integer(), False),
            ("language_count", sa.Integer(), False),
            ("risk_count", sa.Integer(), False),
            ("summary", sa.Text(), False),
            ("analysis_json", sa.Text(), False),
            ("report_json", sa.Text(), False),
            ("readiness_json", sa.Text(), True),
            ("mentor_feedback_json", sa.Text(), True),
            ("action_plan_json", sa.Text(), True),
            ("github_metadata_json", sa.Text(), True),
            ("user_id", sa.Integer(), True),
        ],
    )
    _ensure_columns(
        inspector,
        "analysis_jobs",
        [
            ("repo_url", sa.String(), False),
            ("status", sa.String(), False),
            ("progress", sa.String(), False),
            ("result_history_id", sa.Integer(), True),
            ("error", sa.Text(), True),
            ("created_at", sa.String(), False),
            ("updated_at", sa.String(), False),
            ("user_id", sa.Integer(), True),
        ],
    )


def downgrade() -> None:
    pass


def _ensure_columns(
    inspector: sa.Inspector,
    table_name: str,
    columns: list[tuple[str, object, bool]],
) -> None:
    existing = {column["name"] for column in inspector.get_columns(table_name)}
    for name, column_type, nullable in columns:
        if name not in existing:
            op.add_column(table_name, sa.Column(name, column_type, nullable=nullable))
