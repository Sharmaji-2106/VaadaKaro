import hmac

from fastapi import Request
from limits import parse
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.config import get_settings


def client_ip(request: Request) -> str:
    """The end user's IP for rate limiting.

    Browsers reach this API through the Next.js proxy, so the socket address is the proxy's.
    The proxy reports the real client in X-Client-IP, which is trusted only when it comes with
    the shared secret. X-Forwarded-For is never trusted: browsers can set it to anything.
    """
    secret = get_settings().proxy_shared_secret
    if secret:
        reported = request.headers.get("x-client-ip", "").strip()
        given = request.headers.get("x-proxy-secret", "")
        if reported and hmac.compare_digest(given.encode(), secret.encode()):
            return reported[:64]
    return get_remote_address(request)


limiter = Limiter(key_func=client_ip, storage_uri=get_settings().rate_limit_storage_uri)

# Failed logins per email, whatever IP they come from, so one account can't be brute-forced
# by rotating addresses.
_FAILED_LOGINS = parse(get_settings().failed_login_limit)


def login_allowed(email: str) -> bool:
    return not limiter.enabled or limiter.limiter.test(_FAILED_LOGINS, "failed-login", email)


def record_failed_login(email: str) -> None:
    if limiter.enabled:
        limiter.limiter.hit(_FAILED_LOGINS, "failed-login", email)
