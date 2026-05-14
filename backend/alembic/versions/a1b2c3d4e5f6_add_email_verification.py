"""Add email verification and password reset tokens

Revision ID: a1b2c3d4e5f6
Revises: 7f3a9d2e1b8c
Create Date: 2026-05-14

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "a1b2c3d4e5f6"
down_revision = "7f3a9d2e1b8c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_email_verified", sa.Boolean(), server_default="false", nullable=False))
    op.add_column("users", sa.Column("email_verified_at", sa.DateTime(), nullable=True))

    op.create_table(
        "email_tokens",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False, unique=True),
        sa.Column("purpose", sa.String(30), nullable=False),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("used_at", sa.DateTime(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_email_tokens_token_hash", "email_tokens", ["token_hash"])
    op.create_index("ix_email_tokens_user_id", "email_tokens", ["user_id"])


def downgrade() -> None:
    op.drop_table("email_tokens")
    op.drop_column("users", "email_verified_at")
    op.drop_column("users", "is_email_verified")
