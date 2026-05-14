"""Add transaction templates

Revision ID: b2c3d4e5f6a7
Revises: a1b2c3d4e5f6
Create Date: 2026-05-14

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "b2c3d4e5f6a7"
down_revision = "a1b2c3d4e5f6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "transaction_templates",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("users.id", ondelete="CASCADE"), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("type", sa.Enum("income", "expense", "transfer", name="transactiontype", create_type=False), nullable=False),
        sa.Column("account_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("amount", sa.Numeric(12, 2), nullable=True),
        sa.Column("notes", sa.String(500), nullable=True),
        sa.Column("tags", postgresql.ARRAY(sa.String), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_transaction_templates_user_id", "transaction_templates", ["user_id"])


def downgrade() -> None:
    op.drop_index("ix_transaction_templates_user_id", "transaction_templates")
    op.drop_table("transaction_templates")
