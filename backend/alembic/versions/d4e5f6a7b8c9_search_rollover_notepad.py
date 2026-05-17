"""Add budget rollover and notepad_entries table

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-05-14

"""

import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

from alembic import op

revision = "d4e5f6a7b8c9"
down_revision = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add rollover column to budgets
    op.add_column(
        "budgets",
        sa.Column("rollover", sa.Boolean(), server_default="false", nullable=False),
    )

    # 2. Create notepad_entries table
    op.create_table(
        "notepad_entries",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("title", sa.String(200), nullable=True),
        sa.Column("content", sa.Text(), nullable=True),
        sa.Column("color", sa.String(20), server_default="#fef9c3", nullable=False),
        sa.Column("is_pinned", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index(
        "ix_notepad_entries_user_id", "notepad_entries", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index("ix_notepad_entries_user_id", "notepad_entries")
    op.drop_table("notepad_entries")
    op.drop_column("budgets", "rollover")
