import enum

class TransactionType(str, enum.Enum):
    income = "income"
    expense = "expense"
    transfer = "transfer"