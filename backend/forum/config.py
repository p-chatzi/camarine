"""Forum settings, all from environment variables (see FORUM.md). Nothing secret is in the code.

Secrets: CAMARINE_SECRET_KEY (HMAC of the anti-bot challenges) and CAMARINE_DATA_KEY (Fernet key that
encrypts the TOTP secrets at rest). If they are not set, they are generated once and stored in
forum_data/keys.json (mode 0600) so that a restart doesn't lock everybody out of their MFA; in
production, set them as environment variables (or a secret manager) and back them up.
"""

from __future__ import annotations

import base64
import json
import logging
import os
import secrets
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path

log = logging.getLogger("camarine.forum")


def _env(name: str, default: str = "") -> str:
    return os.environ.get(name, default).strip()


def _flag(name: str, default: bool) -> bool:
    value = _env(name)
    return default if not value else value.lower() in ("1", "true", "yes", "on")


@dataclass(frozen=True)
class Settings:
    dev: bool
    data_dir: Path
    database_url: str
    public_url: str  # where the site is served, e.g. https://camarine.example.org
    rp_id: str  # WebAuthn relying-party id = the site's domain (no scheme, no port)
    cookie_secure: bool
    secret_key: bytes
    data_key: bytes
    google_client_id: str
    google_client_secret: str
    microsoft_client_id: str
    microsoft_client_secret: str
    microsoft_tenant: str
    privacy_contact: str
    check_breached_passwords: bool
    log_retention_days: int

    @property
    def session_cookie(self) -> str:
        # "__Host-": the browser only accepts it over HTTPS, for this exact host, path /.
        return "__Host-camarine_session" if self.cookie_secure else "camarine_session"

    @property
    def mfa_cookie(self) -> str:
        return "__Host-camarine_mfa" if self.cookie_secure else "camarine_mfa"

    @property
    def origin(self) -> str:
        return self.public_url.rstrip("/")


def _load_or_create_keys(data_dir: Path) -> dict[str, str]:
    path = data_dir / "keys.json"
    if path.exists():
        return json.loads(path.read_text(encoding="utf-8"))
    from cryptography.fernet import Fernet

    keys = {"secret_key": secrets.token_urlsafe(48), "data_key": Fernet.generate_key().decode()}
    data_dir.mkdir(parents=True, exist_ok=True)
    fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        json.dump(keys, fh)
    log.warning("Clés du forum générées dans %s : en production, utilisez CAMARINE_SECRET_KEY / CAMARINE_DATA_KEY.", path)
    return keys


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    dev = _flag("CAMARINE_DEV", False)
    data_dir = Path(_env("CAMARINE_FORUM_DIR", "forum_data"))
    public_url = _env("CAMARINE_PUBLIC_URL", "http://localhost:5173")
    secret_key, data_key = _env("CAMARINE_SECRET_KEY"), _env("CAMARINE_DATA_KEY")
    if not (secret_key and data_key):
        stored = _load_or_create_keys(data_dir)
        secret_key = secret_key or stored["secret_key"]
        data_key = data_key or stored["data_key"]
    host = public_url.split("://", 1)[-1].split("/", 1)[0].split(":", 1)[0]
    return Settings(
        dev=dev,
        data_dir=data_dir,
        database_url=_env("CAMARINE_FORUM_DB", f"sqlite:///{data_dir / 'forum.db'}"),
        public_url=public_url,
        rp_id=_env("CAMARINE_WEBAUTHN_RP_ID", host),
        cookie_secure=_flag("CAMARINE_COOKIE_SECURE", not dev),
        secret_key=secret_key.encode(),
        data_key=data_key.encode(),
        google_client_id=_env("CAMARINE_GOOGLE_CLIENT_ID"),
        google_client_secret=_env("CAMARINE_GOOGLE_CLIENT_SECRET"),
        microsoft_client_id=_env("CAMARINE_MICROSOFT_CLIENT_ID"),
        microsoft_client_secret=_env("CAMARINE_MICROSOFT_CLIENT_SECRET"),
        microsoft_tenant=_env("CAMARINE_MICROSOFT_TENANT", "common"),
        privacy_contact=_env("CAMARINE_PRIVACY_CONTACT"),
        check_breached_passwords=_flag("CAMARINE_CHECK_BREACHED_PASSWORDS", True),
        log_retention_days=int(_env("CAMARINE_LOG_RETENTION_DAYS", "180")),
    )


def b64(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode()
