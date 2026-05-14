"""Debt management, smart categories, and enhanced transaction types

Revision ID: c3d4e5f6a7b8
Revises: b2c3d4e5f6a7
Create Date: 2026-05-14

"""

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql
from sqlalchemy.dialects.postgresql import ENUM, UUID

from alembic import op

revision = "c3d4e5f6a7b8"
down_revision = "b2c3d4e5f6a7"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # 1. Add new values to the transactiontype enum (requires autocommit on PG < 12)
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'refund'")
        op.execute("ALTER TYPE transactiontype ADD VALUE IF NOT EXISTS 'adjustment'")

    # 2. Create debttype and debtstatus enums
    op.execute("CREATE TYPE debttype AS ENUM ('borrowed', 'lent')")
    op.execute("CREATE TYPE debtstatus AS ENUM ('active', 'paid', 'forgiven')")

    # 3. Add columns to transactions
    op.add_column(
        "transactions",
        sa.Column(
            "to_account_id",
            UUID(as_uuid=True),
            sa.ForeignKey("accounts.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "transactions",
        sa.Column(
            "linked_transaction_id",
            UUID(as_uuid=True),
            sa.ForeignKey("transactions.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )

    # Make category_id nullable in transactions (transfers don't need a category)
    op.alter_column("transactions", "category_id", existing_type=UUID(as_uuid=True), nullable=True)

    # 4. Add columns to categories
    op.add_column(
        "categories",
        sa.Column(
            "parent_id",
            UUID(as_uuid=True),
            sa.ForeignKey("categories.id", ondelete="SET NULL"),
            nullable=True,
        ),
    )
    op.add_column(
        "categories",
        sa.Column("color", sa.String(20), nullable=True),
    )

    # 5. Create categorization_rules table
    op.create_table(
        "categorization_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("keyword", sa.String(200), nullable=False),
        sa.Column(
            "category_id",
            UUID(as_uuid=True),
            sa.ForeignKey("categories.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("priority", sa.Integer(), server_default="0", nullable=False),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index(
        "ix_categorization_rules_user_id", "categorization_rules", ["user_id"], unique=False
    )

    # 6. Create debts table
    op.create_table(
        "debts",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "user_id",
            UUID(as_uuid=True),
            sa.ForeignKey("users.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("counterparty", sa.String(200), nullable=False),
        sa.Column("type", ENUM(name="debttype", create_type=False), nullable=False),
        sa.Column(
            "status",
            ENUM(name="debtstatus", create_type=False),
            server_default="active",
            nullable=False,
        ),
        sa.Column("principal", sa.Numeric(15, 2), nullable=False),
        sa.Column("interest_rate", sa.Numeric(5, 2), nullable=True),
        sa.Column("due_date", sa.Date(), nullable=True),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_debts_user_id", "debts", ["user_id"], unique=False)

    # 7. Create debt_payments table
    op.create_table(
        "debt_payments",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column(
            "debt_id",
            UUID(as_uuid=True),
            sa.ForeignKey("debts.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("amount", sa.Numeric(15, 2), nullable=False),
        sa.Column("date", sa.Date(), nullable=False),
        sa.Column("notes", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("NOW()"), nullable=False),
    )
    op.create_index("ix_debt_payments_debt_id", "debt_payments", ["debt_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_debt_payments_debt_id", "debt_payments")
    op.drop_table("debt_payments")

    op.drop_index("ix_debts_user_id", "debts")
    op.drop_table("debts")

    op.execute("DROP TYPE debtstatus")
    op.execute("DROP TYPE debttype")

    op.drop_index("ix_categorization_rules_user_id", "categorization_rules")
    op.drop_table("categorization_rules")

    op.drop_column("categories", "color")
    op.drop_column("categories", "parent_id")

    op.alter_column("transactions", "category_id", existing_type=UUID(as_uuid=True), nullable=False)
    op.drop_column("transactions", "linked_transaction_id")
    op.drop_column("transactions", "to_account_id")

    # NOTE: PostgreSQL does not support removing enum values directly.
    # To downgrade transactiontype, recreate the enum without refund/adjustment.
    op.execute("ALTER TYPE transactiontype RENAME TO transactiontype_old")
    op.execute("CREATE TYPE transactiontype AS ENUM ('income', 'expense', 'transfer')")
    op.execute(
        "ALTER TABLE transactions ALTER COLUMN type TYPE transactiontype "
        "USING type::text::transactiontype"
    )
    op.execute(
        "ALTER TABLE recurring_rules ALTER COLUMN type TYPE transactiontype "
        "USING type::text::transactiontype"
    )
    op.execute(
        "ALTER TABLE transaction_templates ALTER COLUMN type TYPE transactiontype "
        "USING type::text::transactiontype"
    )
    op.execute("DROP TYPE transactiontype_old")
