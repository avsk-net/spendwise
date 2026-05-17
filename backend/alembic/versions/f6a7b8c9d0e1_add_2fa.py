"""add 2fa columns

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-05-17 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "f6a7b8c9d0e1"
down_revision = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("totp_secret", sa.String(64), nullable=True))
    op.add_column(
        "users",
        sa.Column("totp_enabled", sa.Boolean(), server_default="false", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("users", "totp_enabled")
    op.drop_column("users", "totp_secret")
