"""add_saving_goals

Revision ID: 7f3a9d2e1b8c
Revises: 0d9000c89c57
Create Date: 2026-05-13 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = "7f3a9d2e1b8c"
down_revision: Union[str, None] = "0d9000c89c57"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "saving_goals",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(length=100), nullable=False),
        sa.Column("icon", sa.String(length=50), nullable=True),
        sa.Column("target_amount", sa.Numeric(precision=15, scale=2), nullable=False),
        sa.Column("current_amount", sa.Numeric(precision=15, scale=2), server_default="0", nullable=False),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("is_completed", sa.Boolean(), server_default="false", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("deleted_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_saving_goals_deleted_at"), "saving_goals", ["deleted_at"], unique=False)
    op.create_index(op.f("ix_saving_goals_user_id"), "saving_goals", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_saving_goals_user_id"), table_name="saving_goals")
    op.drop_index(op.f("ix_saving_goals_deleted_at"), table_name="saving_goals")
    op.drop_table("saving_goals")
