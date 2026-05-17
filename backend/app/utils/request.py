from fastapi import Request


def get_client_ip(request: Request) -> str | None:
    """Read real client IP from X-Real-IP (set by nginx), falling back to X-Forwarded-For then the direct connection."""
    real_ip = request.headers.get("X-Real-IP")
    if real_ip:
        return real_ip.strip()
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else None
