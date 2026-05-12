import enum

class AccountType(str, enum.Enum):
    cash = "cash"
    bank = "bank"
    credit_card = "credit_card"
    mobile_banking = "mobile_banking"
    other = "other"