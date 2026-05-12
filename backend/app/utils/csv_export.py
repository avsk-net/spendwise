import csv
import io
from decimal import Decimal
from app.models.transaction import Transaction


def transactions_to_csv(transactions: list[Transaction]) -> str:
    output = io.StringIO()
    writer = csv.DictWriter(
        output,
        fieldnames=["date", "type", "amount", "category_id", "account_id", "notes", "tags"],
    )
    writer.writeheader()
    for t in transactions:
        writer.writerow({
            "date": str(t.date),
            "type": t.type.value,
            "amount": str(t.amount),
            "category_id": str(t.category_id),
            "account_id": str(t.account_id),
            "notes": t.notes or "",
            "tags": ",".join(t.tags or []),
        })
    return output.getvalue()