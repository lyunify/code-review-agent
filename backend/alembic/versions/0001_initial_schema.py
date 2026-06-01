"""Initial schema.

Revision ID: 0001_initial_schema
Revises:
Create Date: 2026-06-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0001_initial_schema"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "analysis_history",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("repo_url", sa.String(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("total_files", sa.Integer(), nullable=False),
        sa.Column("total_directories", sa.Integer(), nullable=False),
        sa.Column("language_count", sa.Integer(), nullable=False),
        sa.Column("risk_count", sa.Integer(), nullable=False),
        sa.Column("summary", sa.Text(), nullable=False),
        sa.Column("analysis_json", sa.Text(), nullable=False),
        sa.Column("report_json", sa.Text(), nullable=False),
        sa.Column("readiness_json", sa.Text(), nullable=True),
        sa.Column("mentor_feedback_json", sa.Text(), nullable=True),
        sa.Column("action_plan_json", sa.Text(), nullable=True),
        sa.Column("github_metadata_json", sa.Text(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "analysis_jobs",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("repo_url", sa.String(), nullable=False),
        sa.Column("status", sa.String(), nullable=False),
        sa.Column("progress", sa.String(), nullable=False),
        sa.Column("result_history_id", sa.Integer(), nullable=True),
        sa.Column("error", sa.Text(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("updated_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("analysis_jobs")
    op.drop_table("analysis_history")
