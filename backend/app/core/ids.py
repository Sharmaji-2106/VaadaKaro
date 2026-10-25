"""ID and time helpers. Ids keep the cuid shape the app used under Prisma."""

import secrets
import string
import time
import uuid
from datetime import UTC, datetime

_ALPHABET = string.digits + string.ascii_lowercase


def _base36(n: int) -> str:
    out = ""
    while n:
        n, r = divmod(n, 36)
        out = _ALPHABET[r] + out
    return out or "0"


def new_id() -> str:
    """A 25-char cuid-style id: 'c' + timestamp + random, lowercase base36."""
    ts = _base36(int(time.time() * 1000)).rjust(8, "0")
    rand = "".join(secrets.choice(_ALPHABET) for _ in range(16))
    return f"c{ts}{rand}"


def new_tracking_id() -> str:
    """Same format as the Next.js app: VDK-<year>-<8 hex chars>."""
    return f"VDK-{datetime.now(UTC).year}-{uuid.uuid4().hex[:8].upper()}"


def utcnow() -> datetime:
    """Naive UTC, which is what PyMongo returns with tz_aware=False."""
    return datetime.now(UTC).replace(tzinfo=None)
