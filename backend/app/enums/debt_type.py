import enum


class DebtType(str, enum.Enum):
    borrowed = "borrowed"
    lent = "lent"


class DebtStatus(str, enum.Enum):
    active = "active"
    paid = "paid"
    forgiven = "forgiven"
