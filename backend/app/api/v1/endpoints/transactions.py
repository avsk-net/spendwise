import csv
import io
import uuid
from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, File, Response, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.dependencies import get_current_user
from app.enums.transaction_type import TransactionType
from app.exceptions.business import AccountNotFoundError, TransactionNotFoundError
from app.models.account import Account
from app.models.category import Category
from app.models.transaction import Transaction
from app.models.user import User
from app.schemas.transaction import (
    BulkDeleteRequest,
    TransactionCreate,
    TransactionFilters,
    TransactionResponse,
    TransactionUpdate,
)
from app.services.budget_service import check_budget
from app.services.ws_manager import manager

router = APIRouter(prefix="/transactions", tags=["transactions"])

_CREDIT_TYPES = frozenset(
    {TransactionType.income, TransactionType.refund, TransactionType.adjustment}
)


def _delta(txn_type: TransactionType, amount: Decimal) -> Decimal:
    return amount if txn_type in _CREDIT_TYPES else -amount


async def _get_account(account_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Account:
    result = await db.execute(
        select(Account).where(Account.id == account_id, Account.user_id == user_id)
    )
    account = result.scalar_one_or_none()
    if not account:
        raise AccountNotFoundError()
    return account


def _apply_filters(query, filters: TransactionFilters):  # type: ignore[no-untyped-def]
    if filters.account_id:
        query = query.where(Transaction.account_id == filters.account_id)
    if filters.category_id:
        query = query.where(Transaction.category_id == filters.category_id)
    if filters.type:
        query = query.where(Transaction.type == filters.type)
    if filters.date_from:
        query = query.where(Transaction.date >= filters.date_from)
    if filters.date_to:
        query = query.where(Transaction.date <= filters.date_to)
    if filters.tag:
        query = query.where(Transaction.tags.contains([filters.tag]))
    if filters.search:
        s = f"%{filters.search}%"
        query = query.where(
            or_(
                Transaction.notes.ilike(s),
                func.array_to_string(Transaction.tags, ",").ilike(s),
            )
        )
    if filters.recurring_rule_id:
        query = query.where(Transaction.recurring_id == filters.recurring_rule_id)
    return query


@router.get("", response_model=list[TransactionResponse])
async def list_transactions(
    response: Response,
    filters: TransactionFilters = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    base_query = select(Transaction).where(
        Transaction.user_id == user.id,
        Transaction.deleted_at.is_(None),
    )
    base_query = _apply_filters(base_query, filters)

    count_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
    total = count_result.scalar() or 0
    response.headers["X-Total-Count"] = str(total)

    paged = (
        base_query.order_by(Transaction.date.desc())
        .offset((filters.page - 1) * filters.limit)
        .limit(filters.limit)
    )
    result = await db.execute(paged)
    return result.scalars().all()


@router.get("/export/csv")
async def export_transactions_csv(
    filters: TransactionFilters = Depends(),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = select(Transaction).where(
        Transaction.user_id == user.id,
        Transaction.deleted_at.is_(None),
    )
    query = _apply_filters(query, filters)
    query = query.order_by(Transaction.date.desc())

    txns = (await db.execute(query)).scalars().all()

    cats = (
        (
            await db.execute(
                select(Category).where(Category.user_id == user.id, Category.deleted_at.is_(None))
            )
        )
        .scalars()
        .all()
    )
    accs = (await db.execute(select(Account).where(Account.user_id == user.id))).scalars().all()
    cat_map = {c.id: c for c in cats}
    acc_map = {a.id: a for a in accs}

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Date", "Type", "Category", "Account", "Amount", "Notes", "Tags"])
    for t in txns:
        cat = cat_map.get(t.category_id) if t.category_id else None
        acc = acc_map.get(t.account_id)
        writer.writerow(
            [
                t.date,
                t.type.value,
                f"{cat.icon} {cat.name}" if cat else "",
                acc.name if acc else "",
                str(t.amount),
                t.notes or "",
                ", ".join(t.tags or []),
            ]
        )

    filename = f"transactions_{datetime.utcnow().strftime('%Y-%m-%d')}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )


@router.get("/tags", response_model=list[str])
async def list_tags(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from sqlalchemy import func as sqlfunc

    result = await db.execute(
        select(sqlfunc.unnest(Transaction.tags).label("tag"))
        .where(
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
            Transaction.tags.isnot(None),
        )
        .distinct()
        .order_by("tag")
    )
    return [row[0] for row in result.all() if row[0]]


@router.post("/import/csv")
async def import_transactions_csv(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Import transactions from a CSV matching the export format.
    Columns: Date, Type, Category, Account, Amount, Notes, Tags
    Returns { imported: int, errors: [{ row: int, reason: str }] }
    """
    import datetime as dt

    content = await file.read()
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = content.decode("latin-1")

    reader = csv.DictReader(io.StringIO(text))

    accs_result = await db.execute(select(Account).where(Account.user_id == user.id))
    accs = {a.name.lower(): a for a in accs_result.scalars().all()}

    cats_result = await db.execute(
        select(Category).where(Category.user_id == user.id, Category.deleted_at.is_(None))
    )
    cats_raw = cats_result.scalars().all()
    # index by name, and by "icon name" format used in export (e.g. "🍔 Food")
    cats: dict = {}
    for c in cats_raw:
        cats[c.name.lower()] = c
        if c.icon:
            cats[f"{c.icon} {c.name}".lower()] = c

    imported = 0
    errors: list = []

    for i, row in enumerate(reader, start=2):
        try:
            raw_date = (row.get("Date") or "").strip()
            raw_type = (row.get("Type") or "").strip().lower()
            raw_amount = (row.get("Amount") or "").strip()
            raw_acc = (row.get("Account") or "").strip()
            raw_cat = (row.get("Category") or "").strip()
            raw_notes = (row.get("Notes") or "").strip() or None
            raw_tags = [t.strip() for t in (row.get("Tags") or "").split(",") if t.strip()]

            if not raw_date or not raw_type or not raw_amount:
                errors.append({"row": i, "reason": "Missing required field (Date/Type/Amount)"})
                continue

            date_val = dt.date.fromisoformat(raw_date)
            type_val = TransactionType(raw_type)
            amount_val = Decimal(raw_amount)

            acc = accs.get(raw_acc.lower())
            if not acc:
                errors.append({"row": i, "reason": f"Account '{raw_acc}' not found"})
                continue

            cat = cats.get(raw_cat.lower())
            if not cat and type_val != TransactionType.transfer:
                errors.append({"row": i, "reason": f"Category '{raw_cat}' not found"})
                continue

            txn = Transaction(
                user_id=user.id,
                account_id=acc.id,
                category_id=cat.id if cat else None,
                type=type_val,
                amount=amount_val,
                date=date_val,
                notes=raw_notes,
                tags=raw_tags or None,
            )
            db.add(txn)
            acc.balance += _delta(type_val, amount_val)
            imported += 1
        except Exception as exc:
            errors.append({"row": i, "reason": str(exc)})

    if imported:
        await db.commit()

    return {"imported": imported, "errors": errors}


@router.post("", response_model=TransactionResponse, status_code=status.HTTP_201_CREATED)
async def create_transaction(
    data: TransactionCreate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    account = await _get_account(data.account_id, user.id, db)
    txn = Transaction(user_id=user.id, **data.model_dump())
    db.add(txn)
    account.balance += _delta(data.type, data.amount)

    if data.type == TransactionType.transfer and data.to_account_id:
        to_account = await _get_account(data.to_account_id, user.id, db)
        to_account.balance += data.amount

    notif_payload = None
    if data.type == TransactionType.expense and data.category_id:
        notif_payload = await check_budget(user.id, data.category_id, data.date, db)

    await db.commit()
    await db.refresh(txn)

    if notif_payload:
        await manager.send(str(user.id), {"type": "notification", "data": notif_payload})

    return txn


@router.post("/bulk-delete", status_code=204)
async def bulk_delete_transactions(
    data: BulkDeleteRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from datetime import datetime as _dt

    for txn_id in data.ids:
        result = await db.execute(
            select(Transaction).where(
                Transaction.id == txn_id,
                Transaction.user_id == user.id,
                Transaction.deleted_at.is_(None),
            )
        )
        txn = result.scalar_one_or_none()
        if not txn:
            continue
        account = await _get_account(txn.account_id, user.id, db)
        account.balance -= _delta(txn.type, txn.amount)
        if txn.type == TransactionType.transfer and txn.to_account_id:
            try:
                to_acc = await _get_account(txn.to_account_id, user.id, db)
                to_acc.balance -= txn.amount
            except Exception:
                pass
        txn.deleted_at = _dt.utcnow()
    await db.commit()


@router.get("/{txn_id}", response_model=TransactionResponse)
async def get_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise TransactionNotFoundError()
    return txn


@router.patch("/{txn_id}", response_model=TransactionResponse)
async def update_transaction(
    txn_id: uuid.UUID,
    data: TransactionUpdate,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise TransactionNotFoundError()

    account = await _get_account(txn.account_id, user.id, db)

    # Reverse old transfer effect on to_account
    if txn.type == TransactionType.transfer and txn.to_account_id:
        old_to_account = await _get_account(txn.to_account_id, user.id, db)
        old_to_account.balance -= txn.amount

    account.balance -= _delta(txn.type, txn.amount)
    for field, value in data.model_dump(exclude_none=True).items():
        setattr(txn, field, value)
    account.balance += _delta(txn.type, txn.amount)

    # Apply new transfer effect on to_account
    if txn.type == TransactionType.transfer and txn.to_account_id:
        new_to_account = await _get_account(txn.to_account_id, user.id, db)
        new_to_account.balance += txn.amount

    notif_payload = None
    amount_or_category_changed = data.amount is not None or data.category_id is not None
    if txn.type == TransactionType.expense and amount_or_category_changed and txn.category_id:
        notif_payload = await check_budget(user.id, txn.category_id, txn.date, db)

    await db.commit()
    await db.refresh(txn)

    if notif_payload:
        await manager.send(str(user.id), {"type": "notification", "data": notif_payload})

    return txn


@router.delete("/{txn_id}", status_code=204)
async def delete_transaction(
    txn_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Transaction).where(
            Transaction.id == txn_id,
            Transaction.user_id == user.id,
            Transaction.deleted_at.is_(None),
        )
    )
    txn = result.scalar_one_or_none()
    if not txn:
        raise TransactionNotFoundError()

    account = await _get_account(txn.account_id, user.id, db)
    account.balance -= _delta(txn.type, txn.amount)

    # Reverse transfer effect
    if txn.type == TransactionType.transfer and txn.to_account_id:
        to_account = await _get_account(txn.to_account_id, user.id, db)
        to_account.balance -= txn.amount

    txn.deleted_at = __import__("datetime").datetime.utcnow()
    await db.commit()
