"""SSO "Se connecter avec Google / Microsoft" — OpenID Connect authorization-code flow.

Protections:
- PKCE (S256) + client secret on the back channel;
- `state` single-use, 10 minutes, stored server-side AND bound to the browser by a cookie (stops
  "login CSRF": an attacker can't make a victim finish the attacker's own SSO login);
- `nonce` checked in the ID token (no token replay);
- ID token signature checked against the provider's published keys (JWKS), plus iss / aud / exp /
  iat. Microsoft "common": the issuer contains the user's tenant id, checked against `tid`;
- accounts are matched on the provider's stable subject (Google `sub`, Microsoft `tid:oid`), NEVER on
  the e-mail: Microsoft's e-mail claim is not verified (the "nOAuth" takeover). A new SSO login whose
  e-mail already belongs to an account is refused: the owner must log in and link SSO in "Mon compte".
"""

from __future__ import annotations

import base64
import hashlib
import secrets
import time
from dataclasses import dataclass
from datetime import timedelta
from urllib.parse import urlencode

import httpx
import jwt
from sqlalchemy.orm import Session

from .config import get_settings
from .db import OAuthState, utcnow
from .security import safe_equals, token_hash

STATE_TTL = timedelta(minutes=10)
BINDING_COOKIE = "camarine_sso"


class SSOError(Exception):
    """`code` is passed to the page (#/forum/connexion?erreur=code)."""

    def __init__(self, code: str) -> None:
        super().__init__(code)
        self.code = code


@dataclass
class ProviderConfig:
    name: str
    label: str
    discovery_url: str
    client_id: str
    client_secret: str


@dataclass
class SSOIdentity:
    provider: str
    subject: str
    email: str
    email_verified: bool
    name: str


def providers() -> dict[str, ProviderConfig]:
    s = get_settings()
    out: dict[str, ProviderConfig] = {}
    if s.google_client_id and s.google_client_secret:
        out["google"] = ProviderConfig("google", "Google", "https://accounts.google.com/.well-known/openid-configuration", s.google_client_id, s.google_client_secret)
    if s.microsoft_client_id and s.microsoft_client_secret:
        out["microsoft"] = ProviderConfig(
            "microsoft",
            "Microsoft",
            f"https://login.microsoftonline.com/{s.microsoft_tenant}/v2.0/.well-known/openid-configuration",
            s.microsoft_client_id,
            s.microsoft_client_secret,
        )
    return out


_metadata_cache: dict[str, tuple[float, dict]] = {}
_jwks_clients: dict[str, jwt.PyJWKClient] = {}


def metadata(cfg: ProviderConfig) -> dict:
    cached = _metadata_cache.get(cfg.name)
    if cached and cached[0] > time.time():
        return cached[1]
    resp = httpx.get(cfg.discovery_url, timeout=8)
    resp.raise_for_status()
    data = resp.json()
    _metadata_cache[cfg.name] = (time.time() + 3600, data)
    return data


def redirect_uri(provider: str) -> str:
    return f"{get_settings().origin}/api/forum/auth/sso/{provider}/callback"


def start(db: Session, provider: str, link_user_id: int | None) -> tuple[str, str]:
    """(authorization URL, browser-binding value to put in a cookie)."""
    cfg = providers().get(provider)
    if cfg is None:
        raise SSOError("sso-indisponible")
    meta = metadata(cfg)
    state, nonce, verifier, binding = secrets.token_urlsafe(32), secrets.token_urlsafe(32), secrets.token_urlsafe(64), secrets.token_urlsafe(32)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b"=").decode()
    db.add(
        OAuthState(
            state_hash=token_hash(state),
            provider=provider,
            nonce=nonce,
            code_verifier=verifier + "." + token_hash(binding),
            link_user_id=link_user_id,
            expires_at=utcnow() + STATE_TTL,
        )
    )
    params = {
        "client_id": cfg.client_id,
        "response_type": "code",
        "redirect_uri": redirect_uri(provider),
        "scope": "openid email profile",
        "state": state,
        "nonce": nonce,
        "code_challenge": challenge,
        "code_challenge_method": "S256",
        "prompt": "select_account",
    }
    return f"{meta['authorization_endpoint']}?{urlencode(params)}", binding


def consume_state(db: Session, provider: str, state: str, binding: str | None) -> OAuthState:
    row = db.get(OAuthState, token_hash(state or ""))
    if row is None:
        raise SSOError("sso-session-expiree")
    db.delete(row)  # single use, whatever happens next
    db.commit()
    verifier, _, binding_hash = row.code_verifier.rpartition(".")
    if row.provider != provider or row.expires_at < utcnow() or not binding or not safe_equals(token_hash(binding), binding_hash):
        raise SSOError("sso-session-expiree")
    row.code_verifier = verifier
    return row


def _expected_issuer(cfg: ProviderConfig, meta: dict, claims: dict) -> set[str]:
    issuer = meta["issuer"]
    if cfg.name == "google":
        return {"https://accounts.google.com", "accounts.google.com"}
    if "{tenantid}" in issuer:
        tid = str(claims.get("tid", ""))
        return {issuer.replace("{tenantid}", tid)} if tid else set()
    return {issuer}


def validate_id_token(cfg: ProviderConfig, meta: dict, id_token: str, nonce: str, signing_key: object | None = None) -> dict:
    if signing_key is None:
        client = _jwks_clients.setdefault(cfg.name, jwt.PyJWKClient(meta["jwks_uri"], cache_keys=True))
        signing_key = client.get_signing_key_from_jwt(id_token).key
    try:
        claims = jwt.decode(
            id_token,
            signing_key,
            algorithms=["RS256"],
            audience=cfg.client_id,
            options={"require": ["exp", "iat", "iss", "aud", "sub"]},
            leeway=60,
        )
    except jwt.PyJWTError as exc:
        raise SSOError("sso-jeton-invalide") from exc
    if claims.get("iss") not in _expected_issuer(cfg, meta, claims):
        raise SSOError("sso-jeton-invalide")
    if not safe_equals(str(claims.get("nonce", "")), nonce):
        raise SSOError("sso-jeton-invalide")
    return claims


def identity_from_claims(provider: str, claims: dict) -> SSOIdentity:
    if provider == "microsoft":
        tid, oid = str(claims.get("tid", "")), str(claims.get("oid", ""))
        if not (tid and oid):
            raise SSOError("sso-jeton-invalide")
        subject = f"{tid}:{oid}"
        email = str(claims.get("email") or "")
        verified = False  # Microsoft doesn't guarantee it: confirmed by our own verification mail
    else:
        subject = str(claims["sub"])
        email = str(claims.get("email") or "")
        verified = claims.get("email_verified") is True
    return SSOIdentity(provider, subject, email, verified, str(claims.get("name") or ""))


def finish(db: Session, provider: str, code: str, state_row: OAuthState) -> SSOIdentity:
    cfg = providers().get(provider)
    if cfg is None:
        raise SSOError("sso-indisponible")
    meta = metadata(cfg)
    try:
        resp = httpx.post(
            meta["token_endpoint"],
            data={
                "grant_type": "authorization_code",
                "code": code,
                "redirect_uri": redirect_uri(provider),
                "client_id": cfg.client_id,
                "client_secret": cfg.client_secret,
                "code_verifier": state_row.code_verifier,
            },
            timeout=10,
        )
        resp.raise_for_status()
        id_token = resp.json()["id_token"]
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise SSOError("sso-refuse") from exc
    claims = validate_id_token(cfg, meta, id_token, state_row.nonce)
    return identity_from_claims(provider, claims)
