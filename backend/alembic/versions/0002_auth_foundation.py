"""Auth foundation.

Revision ID: 0002_auth_foundation
Revises: 0001_initial_schema
Create Date: 2026-06-01
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002_auth_foundation"
down_revision: str | None = "0001_initial_schema"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
        sa.Column("github_id", sa.String(), nullable=True),
        sa.Column("username", sa.String(), nullable=False),
        sa.Column("avatar_url", sa.String(), nullable=True),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("github_id"),
        sa.UniqueConstraint("username"),
    )
    op.create_table(
        "sessions",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.String(), nullable=False),
        sa.Column("expires_at", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.add_column("analysis_history", sa.Column("user_id", sa.Integer(), nullable=True))
    op.add_column("analysis_jobs", sa.Column("user_id", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("analysis_jobs", "user_id")
    op.drop_column("analysis_history", "user_id")
    op.drop_table("sessions")
    op.drop_table("users")
