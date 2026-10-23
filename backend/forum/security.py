"""Credentials and input checks of the forum. Recognised libraries only for the cryptography:
argon2-cffi (Argon2id, RFC 9106), cryptography (Fernet), zxcvbn (strength estimate), stdlib secrets
/hashlib/hmac. Choices follow NIST SP 800-63B and the CNIL / ANSSI password recommendations.

Passwords
- 12 to 256 characters, any character (spaces, emoji…), NFKC-normalised before hashing so the same
  password typed on another keyboard / OS still matches; no composition rule (NIST), but:
  zxcvbn score ≥ 3 ("hard to guess"), must not contain the e-mail / display name, and must not
  appear in a known breach (Have I Been Pwned "range" API, k-anonymity: only the first 5 hex chars
  of the SHA-1 leave the server; skipped if the API is unreachable).
- Stored as Argon2id (memory-hard, per-hash random salt, parameters inside the hash so they can be
  raised later: check_needs_rehash at login).
"""

from __future__ import annotations

import hashlib
import hmac
import logging
import re
import secrets
import unicodedata
from functools import lru_cache

import httpx
from argon2 import PasswordHasher
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError
from cryptography.fernet import Fernet, InvalidToken
from email_validator import EmailNotValidError, validate_email
from zxcvbn import zxcvbn

from ..suggestion_service import clean_text
from .config import get_settings

log = logging.getLogger("camarine.forum")

PASSWORD_MIN = 12
PASSWORD_MAX = 256
DISPLAY_NAME_MIN = 3
DISPLAY_NAME_MAX = 30

_hasher = PasswordHasher()  # Argon2id, RFC 9106 "low memory" profile: t=3, m=64 MiB, p=4
# Verified when the e-mail is unknown, so that "unknown e-mail" and "wrong password" take the same time.
_DUMMY_HASH = _hasher.hash(secrets.token_urlsafe(16))


class InputError(ValueError):
    """Invalid user input; the message is safe to show (French)."""


# ---------------------------------------------------------------- passwords


def normalize_password(password: str) -> str:
    return unicodedata.normalize("NFKC", password)


def check_password_policy(password: str, *, email: str = "", display_name: str = "") -> None:
    pw = normalize_password(password)
    if len(pw) < PASSWORD_MIN:
        raise InputError(f"Mot de passe trop court : {PASSWORD_MIN} caractères au minimum (une phrase de passe est idéale).")
    if len(pw) > PASSWORD_MAX:
        raise InputError(f"Mot de passe trop long : {PASSWORD_MAX} caractères au maximum.")
    lowered = pw.casefold()
    local = email.split("@", 1)[0].casefold()
    for personal in (local, display_name.casefold()):
        if len(personal) >= 4 and personal in lowered:
            raise InputError("Le mot de passe ne doit pas contenir votre e-mail ni votre pseudo.")
    # zxcvbn accepts at most 72 characters (beyond that, length alone makes the password strong).
    result = zxcvbn(pw[:72], user_inputs=[email, display_name, "camarine", "forum", "ocean", "mer"])
    if result["score"] < 3:
        hint = (result.get("feedback") or {}).get("warning") or ""
        raise InputError("Mot de passe trop facile à deviner." + (" Essayez une phrase de plusieurs mots." if not hint else ""))
    if get_settings().check_breached_passwords and is_breached(pw):
        raise InputError("Ce mot de passe figure dans une fuite de données connue : choisissez-en un autre.")


def is_breached(password: str) -> bool:
    """Have I Been Pwned, k-anonymity range query. Fails open (False) if the service can't be reached."""
    digest = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()  # noqa: S324 (protocol of the API)
    prefix, suffix = digest[:5], digest[5:]
    try:
        resp = httpx.get(f"https://api.pwnedpasswords.com/range/{prefix}", headers={"Add-Padding": "true"}, timeout=4)
        resp.raise_for_status()
    except httpx.HTTPError as exc:
        log.info("HIBP indisponible (%s) : vérification des fuites ignorée", exc)
        return False
    for line in resp.text.splitlines():
        hash_suffix, _, count = line.partition(":")
        if hash_suffix == suffix and count.strip() not in ("", "0"):
            return True
    return False


def hash_password(password: str) -> str:
    return _hasher.hash(normalize_password(password))


def verify_password(stored_hash: str | None, password: str) -> bool:
    """Constant work whether the account exists or not."""
    try:
        return _hasher.verify(stored_hash or _DUMMY_HASH, normalize_password(password[:PASSWORD_MAX * 4])) and stored_hash is not None
    except (VerifyMismatchError, VerificationError, InvalidHashError):
        return False


def needs_rehash(stored_hash: str) -> bool:
    return _hasher.check_needs_rehash(stored_hash)


# ---------------------------------------------------------------- tokens & encryption


def new_token() -> str:
    """256-bit random token for URLs and cookies."""
    return secrets.token_urlsafe(32)


def token_hash(token: str) -> str:
    """Tokens are high-entropy: a plain SHA-256 is enough to store them (no need for a slow hash)."""
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


def safe_equals(a: str, b: str) -> bool:
    return hmac.compare_digest(a.encode(), b.encode())


@lru_cache(maxsize=1)
def _fernet() -> Fernet:
    return Fernet(get_settings().data_key)


def encrypt(data: str) -> bytes:
    return _fernet().encrypt(data.encode())


def decrypt(blob: bytes) -> str:
    try:
        return _fernet().decrypt(blob).decode()
    except InvalidToken as exc:
        raise RuntimeError("CAMARINE_DATA_KEY ne correspond pas aux secrets enregistrés") from exc


# ---------------------------------------------------------------- identity fields

_NAME_ALLOWED = re.compile(r"^[\w .\-']+$", re.UNICODE)


def clean_display_name(value: str) -> tuple[str, str]:
    """(display name, normalised form for uniqueness). Letters, digits, space . - _ ' only."""
    name = " ".join(unicodedata.normalize("NFKC", value).split())
    name = clean_text(name, DISPLAY_NAME_MAX + 1, multiline=False, neutralize_formulas=False)
    if not DISPLAY_NAME_MIN <= len(name) <= DISPLAY_NAME_MAX:
        raise InputError(f"Pseudo : entre {DISPLAY_NAME_MIN} et {DISPLAY_NAME_MAX} caractères.")
    if not _NAME_ALLOWED.fullmatch(name) or not re.search(r"[^\W\d_]", name):
        raise InputError("Pseudo : lettres, chiffres, espaces et . - _ ' seulement, avec au moins une lettre.")
    norm = name.casefold().replace(" ", "")
    if norm in {"admin", "administrateur", "moderateur", "modérateur", "camarine", "support", "scientifique"}:
        raise InputError("Ce pseudo est réservé.")
    return name, norm


def clean_email(value: str) -> tuple[str, str]:
    """(e-mail, normalised form for uniqueness). Syntax only (no DNS lookup: the verification mail
    proves the address works)."""
    try:
        info = validate_email(value.strip(), check_deliverability=False)
    except EmailNotValidError as exc:
        raise InputError("Adresse e-mail invalide.") from exc
    email = info.normalized
    if len(email) > 254:
        raise InputError("Adresse e-mail trop longue.")
    return email, email.casefold()


def clean_post(value: str, max_len: int) -> str:
    return clean_text(value, max_len, multiline=True, max_lines=200, neutralize_formulas=False)


def clean_line(value: str, max_len: int) -> str:
    return clean_text(value, max_len, multiline=False, neutralize_formulas=False)
