import enum

class NotificationType(str, enum.Enum):
    budget_warning = "budget_warning"
    budget_exceeded = "budget_exceeded"
    system = "system"