# Budget thresholds
BUDGET_WARNING_THRESHOLD = 80.0  # percent — triggers warning notification
BUDGET_EXCEEDED_THRESHOLD = 100.0  # percent — triggers exceeded notification

# Pagination
DEFAULT_PAGE_SIZE = 50
MAX_PAGE_SIZE = 200

# Tokens
REFRESH_TOKEN_LENGTH = 36  # UUID v4

# System
SYSTEM_CATEGORY_SEED = [
    ("Salary", "💼", "income"),
    ("Freelance", "💻", "income"),
    ("Investment", "📈", "income"),
    ("Business", "🏢", "income"),
    ("Gift", "🎁", "both"),
    ("Food & Dining", "🍽️", "expense"),
    ("Transport", "🚗", "expense"),
    ("Shopping", "🛍️", "expense"),
    ("Entertainment", "🎬", "expense"),
    ("Healthcare", "🏥", "expense"),
    ("Utilities", "💡", "expense"),
    ("Rent / EMI", "🏠", "expense"),
    ("Education", "📚", "expense"),
    ("Travel", "✈️", "expense"),
    ("Other", "📦", "both"),
]
