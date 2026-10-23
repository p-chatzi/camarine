"""Discreet anti-bot and anti-mass-account measures (no captcha, nothing for the visitor to do).

1. Proof of work (hashcash): the server hands out a signed challenge; the browser silently finds a
   nonce such that SHA-256(salt + nonce) starts with DIFFICULTY zero bits (~0.2-1 s in a Web
   Worker while the visitor types). Costs nothing for one sign-up, a lot for a million.
   Challenges are HMAC-signed (no server state), expire after 10 minutes and are single-use.
2. Honeypot field + minimum time to fill the form (bots submit instantly).
3. Rate limits per IP (memory): sign-ups, logins, password resets, posts.
4. One account per e-mail, e-mail verification before posting, unverified accounts purged after 7 days.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import threading
import time
from fastapi import Request

from ..suggestion_service import RateLimiter
from .config import b64, get_settings

DIFFICULTY = 18  # leading zero bits ≈ 260 000 hashes on average
CHALLENGE_TTL_S = 600
MIN_FORM_MS = 800  # below: almost certainly a script (a password manager + a click takes longer)

_used: dict[str, float] = {}
_used_lock = threading.Lock()

# Per-IP limits (memory only, never written to disk).
signup_limiter = RateLimiter(3, 24 * 3600)  # 3 accounts per IP per day
login_limiter = RateLimiter(10, 15 * 60)  # 10 attempts per IP per 15 min
reset_limiter = RateLimiter(3, 3600)
post_limiter = RateLimiter(20, 3600)  # 20 messages per account per hour
report_limiter = RateLimiter(10, 3600)


def client_ip(request: Request) -> str:
    """Direct peer address. Behind a reverse proxy, run uvicorn with --proxy-headers so that this is
    the visitor's address (never trust X-Forwarded-For directly: anyone can send it)."""
    return request.client.host if request.client else "unknown"


def _sign(payload: bytes) -> str:
    return b64(hmac.new(get_settings().secret_key, payload, hashlib.sha256).digest())


def new_challenge(purpose: str) -> dict[str, object]:
    body = {"salt": secrets.token_hex(16), "exp": int(time.time()) + CHALLENGE_TTL_S, "bits": DIFFICULTY, "purpose": purpose}
    raw = json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
    return {**body, "sig": _sign(raw)}


def _leading_zero_bits(digest: bytes) -> int:
    bits = 0
    for byte in digest:
        if byte == 0:
            bits += 8
            continue
        return bits + (8 - byte.bit_length())
    return bits


def verify_challenge(pow_data: object, purpose: str, now: float | None = None) -> bool:
    if not isinstance(pow_data, dict):
        return False
    try:
        body = {"salt": str(pow_data["salt"]), "exp": int(pow_data["exp"]), "bits": int(pow_data["bits"]), "purpose": str(pow_data["purpose"])}
        sig, nonce = str(pow_data["sig"]), str(pow_data["nonce"])
    except (KeyError, TypeError, ValueError):
        return False
    t = time.time() if now is None else now
    raw = json.dumps(body, separators=(",", ":"), sort_keys=True).encode()
    if not hmac.compare_digest(sig, _sign(raw)) or body["purpose"] != purpose or body["exp"] < t or body["bits"] < DIFFICULTY:
        return False
    if len(nonce) > 32 or _leading_zero_bits(hashlib.sha256((body["salt"] + nonce).encode()).digest()) < body["bits"]:
        return False
    with _used_lock:  # single use
        for salt, exp in list(_used.items()):
            if exp < t:
                del _used[salt]
        if body["salt"] in _used:
            return False
        _used[body["salt"]] = body["exp"]
    return True


def looks_human(honeypot: str, elapsed_ms: int) -> bool:
    return not honeypot and elapsed_ms >= MIN_FORM_MS
