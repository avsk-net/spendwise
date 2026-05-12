import enum

class CategoryType(str, enum.Enum):
    income = "income"
    expense = "expense"
    both = "both"