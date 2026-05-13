from datetime import date, datetime, timezone


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def month_start(d: date) -> date:
    return d.replace(day=1)


def current_month_start() -> date:
    return month_start(date.today())
