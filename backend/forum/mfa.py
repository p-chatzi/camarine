"""Second factors.

- TOTP (RFC 6238, pyotp): works with every authenticator app (Google Authenticator, Microsoft
  Authenticator, Aegis, 2FAS, 1Password, Bitwarden…). The secret is encrypted at rest (Fernet);
  a code can't be used twice (last time step stored); ±30 s tolerance.
- WebAuthn (py_webauthn, Duo Labs): security keys (YubiKey, Titan…) and passkeys (phone, Windows
  Hello, Touch ID, password managers). Only public keys are stored; the sign counter detects cloned
  keys.
- Recovery codes: 10 single-use codes, shown once, stored as SHA-256 hashes.
"""

from __future__ import annotations

import hashlib
import hmac
import json
import secrets
import time
from datetime import timedelta

import pyotp
from sqlalchemy import select
from sqlalchemy.orm import Session
from webauthn import (
    generate_authentication_options,
    generate_registration_options,
    options_to_json,
    verify_authentication_response,
    verify_registration_response,
)
from webauthn.helpers.structs import (
    AuthenticatorSelectionCriteria,
    PublicKeyCredentialDescriptor,
    ResidentKeyRequirement,
    UserVerificationRequirement,
)

from .config import get_settings
from .db import RecoveryCode, User, WebAuthnCredential, utcnow
from .security import decrypt, encrypt, safe_equals, token_hash

ISSUER = "Camarine"
RECOVERY_COUNT = 10
_RECOVERY_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789"  # no 0/o/1/l/i


# ---------------------------------------------------------------- TOTP


def start_totp(user: User) -> tuple[str, str]:
    """New pending secret (not active until a first code is confirmed). Returns (secret, otpauth URI)."""
    secret = pyotp.random_base32(32)  # 160 bits
    user.totp_pending_enc = encrypt(secret)
    uri = pyotp.TOTP(secret).provisioning_uri(name=user.email, issuer_name=ISSUER)
    return secret, uri


def _check_code(secret: str, code: str, last_step: int, now: float | None = None) -> int | None:
    """Time step of the matching code (±1 step), or None. Rejects steps ≤ last_step (replay)."""
    code = "".join(ch for ch in code if ch.isdigit())
    if len(code) != 6:
        return None
    totp = pyotp.TOTP(secret)
    t = time.time() if now is None else now
    step = int(t // totp.interval)
    for candidate in (step - 1, step, step + 1):
        if candidate > last_step and safe_equals(totp.at(candidate * totp.interval), code):
            return candidate
    return None


def confirm_totp(user: User, code: str) -> bool:
    if user.totp_pending_enc is None:
        return False
    secret = decrypt(user.totp_pending_enc)
    step = _check_code(secret, code, 0)
    if step is None:
        return False
    user.totp_secret_enc, user.totp_pending_enc, user.totp_last_step = user.totp_pending_enc, None, step
    return True


def verify_totp(user: User, code: str, now: float | None = None) -> bool:
    if user.totp_secret_enc is None:
        return False
    step = _check_code(decrypt(user.totp_secret_enc), code, user.totp_last_step, now)
    if step is None:
        return False
    user.totp_last_step = step
    return True


# ---------------------------------------------------------------- recovery codes


def new_recovery_codes(db: Session, user: User) -> list[str]:
    for old in db.scalars(select(RecoveryCode).where(RecoveryCode.user_id == user.id)):
        db.delete(old)
    codes = ["-".join("".join(secrets.choice(_RECOVERY_ALPHABET) for _ in range(5)) for _ in range(2)) for _ in range(RECOVERY_COUNT)]
    for code in codes:
        db.add(RecoveryCode(user_id=user.id, code_hash=token_hash(code)))
    return codes


def use_recovery_code(db: Session, user: User, code: str) -> bool:
    normalized = code.strip().lower().replace(" ", "")
    if len(normalized) == 10 and "-" not in normalized:
        normalized = normalized[:5] + "-" + normalized[5:]
    row = db.scalar(select(RecoveryCode).where(RecoveryCode.user_id == user.id, RecoveryCode.code_hash == token_hash(normalized), RecoveryCode.used_at.is_(None)))
    if row is None:
        return False
    row.used_at = utcnow()
    return True


def remaining_recovery_codes(db: Session, user: User) -> int:
    return len(list(db.scalars(select(RecoveryCode).where(RecoveryCode.user_id == user.id, RecoveryCode.used_at.is_(None)))))


# ---------------------------------------------------------------- WebAuthn

CHALLENGE_TTL = timedelta(minutes=5)


def _origins() -> list[str]:
    return [get_settings().origin]


def registration_options(user: User) -> tuple[dict, bytes]:
    s = get_settings()
    opts = generate_registration_options(
        rp_id=s.rp_id,
        rp_name="Camarine",
        # Opaque, stable user handle (no e-mail or database id exposed to the authenticator).
        user_id=hmac.new(s.secret_key, f"webauthn-user-{user.id}".encode(), hashlib.sha256).digest()[:32],
        user_name=user.email,
        user_display_name=user.display_name,
        exclude_credentials=[PublicKeyCredentialDescriptor(id=c.credential_id) for c in user.webauthn_credentials],
        authenticator_selection=AuthenticatorSelectionCriteria(
            resident_key=ResidentKeyRequirement.PREFERRED, user_verification=UserVerificationRequirement.PREFERRED
        ),
    )
    return json.loads(options_to_json(opts)), opts.challenge


def finish_registration(user: User, credential: dict, challenge: bytes, name: str) -> WebAuthnCredential:
    s = get_settings()
    verified = verify_registration_response(credential=credential, expected_challenge=challenge, expected_rp_id=s.rp_id, expected_origin=_origins())
    transports = credential.get("response", {}).get("transports") or []
    cred = WebAuthnCredential(
        user_id=user.id,
        credential_id=verified.credential_id,
        public_key=verified.credential_public_key,
        sign_count=verified.sign_count,
        transports=",".join(str(t) for t in transports)[:120],
        name=name,
    )
    user.webauthn_credentials.append(cred)
    return cred


def authentication_options(user: User) -> tuple[dict, bytes]:
    s = get_settings()
    opts = generate_authentication_options(
        rp_id=s.rp_id,
        allow_credentials=[PublicKeyCredentialDescriptor(id=c.credential_id) for c in user.webauthn_credentials],
        user_verification=UserVerificationRequirement.PREFERRED,
    )
    return json.loads(options_to_json(opts)), opts.challenge


def finish_authentication(user: User, credential: dict, challenge: bytes) -> bool:
    from webauthn.helpers import base64url_to_bytes

    try:
        raw_id = base64url_to_bytes(str(credential.get("rawId") or credential.get("id") or ""))
    except Exception:  # noqa: BLE001
        return False
    stored = next((c for c in user.webauthn_credentials if c.credential_id == raw_id), None)
    if stored is None:
        return False
    s = get_settings()
    try:
        verified = verify_authentication_response(
            credential=credential,
            expected_challenge=challenge,
            expected_rp_id=s.rp_id,
            expected_origin=_origins(),
            credential_public_key=stored.public_key,
            credential_current_sign_count=stored.sign_count,
        )
    except Exception:  # noqa: BLE001 (invalid signature, cloned key, wrong origin…)
        return False
    stored.sign_count = verified.new_sign_count
    stored.last_used_at = utcnow()
    return True
