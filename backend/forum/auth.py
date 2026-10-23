"""Sessions, CSRF, permissions, security / audit logs, e-mails of the forum.

Sessions: an opaque 256-bit token in an HttpOnly, Secure, SameSite=Lax cookie ("__Host-" prefix in
production); only its SHA-256 is stored. New token at every login and privilege change (no session
fixation). Expire after 7 days without activity and 30 days in any case; listable and revocable by
the user ("mes sessions").

CSRF: every state-changing request must carry the header `X-Camarine: 1` (a cross-site form can't
set headers, a cross-site fetch with it is stopped by CORS) and, when logged in, `X-CSRF-Token`
equal to the token of the session (returned by GET /api/forum/me, kept in memory by the page).
"""

from __future__ import annotations

import logging
import threading
from collections import deque
from datetime import timedelta

from fastapi import Depends, HTTPException, Request, Response
from sqlalchemy import select
from sqlalchemy.orm import Session

from .. import notify
from .antibot import client_ip
from .config import get_settings
from .db import AuditLog, AuthSession, SecurityEvent, User, get_db, utcnow
from .security import new_token, safe_equals, token_hash

log = logging.getLogger("camarine.forum")

IDLE_TIMEOUT = timedelta(days=7)
ABSOLUTE_TIMEOUT = timedelta(days=30)
RECENT_AUTH = timedelta(minutes=10)  # "sudo mode" for SSO-only accounts (no password to re-enter)


class Current:
    def __init__(self, user: User, session: AuthSession) -> None:
        self.user, self.session = user, session


def user_agent(request: Request) -> str:
    return (request.headers.get("user-agent") or "")[:255]


def log_security(db: Session, request: Request | None, user: User | None, event: str, detail: str = "") -> None:
    db.add(
        SecurityEvent(
            user_id=user.id if user else None,
            event=event,
            ip=client_ip(request) if request else "",
            user_agent=user_agent(request) if request else "",
            detail=detail[:255],
        )
    )


def audit(db: Session, actor: User, action: str, target: str, detail: str = "") -> None:
    db.add(AuditLog(actor_id=actor.id, action=action, target=target[:80], detail=detail[:500]))


def _set_cookie(response: Response, name: str, value: str, max_age: int) -> None:
    response.set_cookie(name, value, max_age=max_age, path="/", httponly=True, secure=get_settings().cookie_secure, samesite="lax")


def clear_cookie(response: Response, name: str) -> None:
    response.delete_cookie(name, path="/", secure=get_settings().cookie_secure, httponly=True, samesite="lax")


def create_session(db: Session, user: User, request: Request, response: Response, method: str) -> AuthSession:
    token = new_token()
    now = utcnow()
    session = AuthSession(
        token_hash=token_hash(token),
        user_id=user.id,
        csrf_token=new_token(),
        created_at=now,
        last_seen_at=now,
        expires_at=now + ABSOLUTE_TIMEOUT,
        ip=client_ip(request),
        user_agent=user_agent(request),
        auth_method=method,
    )
    db.add(session)
    user.last_login_at = now
    user.failed_logins = 0
    user.locked_until = None
    log_security(db, request, user, "login", method)
    _set_cookie(response, get_settings().session_cookie, token, int(ABSOLUTE_TIMEOUT.total_seconds()))
    clear_cookie(response, get_settings().mfa_cookie)
    return session


def revoke_sessions(db: Session, user_id: int, keep_id: int | None = None) -> None:
    for s in db.scalars(select(AuthSession).where(AuthSession.user_id == user_id)):
        if s.id != keep_id:
            db.delete(s)


def current(request: Request, db: Session = Depends(get_db)) -> Current | None:
    token = request.cookies.get(get_settings().session_cookie)
    if not token or len(token) > 100:
        return None
    session = db.scalar(select(AuthSession).where(AuthSession.token_hash == token_hash(token)))
    if session is None:
        return None
    now = utcnow()
    if session.expires_at < now or session.last_seen_at + IDLE_TIMEOUT < now:
        db.delete(session)
        db.commit()
        return None
    user = db.get(User, session.user_id)
    if user is None or user.status != "active":
        return None
    if now - session.last_seen_at > timedelta(minutes=5):
        session.last_seen_at = now
        db.commit()
    return Current(user, session)


def check_csrf(request: Request, cur: Current | None) -> None:
    if request.headers.get("x-camarine") != "1":
        raise HTTPException(status_code=403, detail="Requête refusée (en-tête de sécurité manquant).")
    if cur is not None:
        sent = request.headers.get("x-csrf-token", "")
        if not sent or not safe_equals(sent, cur.session.csrf_token):
            raise HTTPException(status_code=403, detail="Session expirée ou jeton de sécurité invalide : rechargez la page.")


def csrf(request: Request, cur: Current | None = Depends(current)) -> Current | None:
    """Dependency for anonymous-or-logged-in POSTs (login, sign-up…)."""
    check_csrf(request, cur)
    return cur


def require_user(request: Request, cur: Current | None = Depends(current)) -> Current:
    if cur is None:
        raise HTTPException(status_code=401, detail="Connectez-vous pour continuer.")
    if request.method not in ("GET", "HEAD"):
        check_csrf(request, cur)
    return cur


def require_verified(cur: Current = Depends(require_user)) -> Current:
    if not cur.user.email_verified:
        raise HTTPException(status_code=403, detail="Confirmez d’abord votre adresse e-mail (lien reçu par e-mail).")
    return cur


def require_scientist(cur: Current = Depends(require_verified)) -> Current:
    if not cur.user.can_answer:
        raise HTTPException(status_code=403, detail="Réservé aux scientifiques validés.")
    return cur


def require_admin(cur: Current = Depends(require_verified)) -> Current:
    if cur.user.role != "admin":
        raise HTTPException(status_code=403, detail="Réservé aux administrateurs.")
    if not cur.user.mfa_enabled:
        raise HTTPException(status_code=403, detail="Les administrateurs doivent activer la double authentification.")
    return cur


def recently_authenticated(cur: Current) -> bool:
    return utcnow() - cur.session.created_at < RECENT_AUTH


# ---------------------------------------------------------------- e-mails


# Dev only: the last e-mails "sent" (used by the tests; never filled in production).
OUTBOX: deque[tuple[str, str, str]] = deque(maxlen=50)


def send_mail(to: str, subject: str, body: str) -> None:
    """In the background. Without SMTP: in dev (CAMARINE_DEV=1) the mail is printed in the backend
    console so links can be clicked locally; otherwise an error is logged."""
    if notify.smtp_configured():

        def _send() -> None:
            try:
                notify.send_email(subject, body, to=to)
            except Exception as exc:  # noqa: BLE001
                log.warning("e-mail du forum non envoyé : %s", exc)

        threading.Thread(target=_send, daemon=True).start()
    elif get_settings().dev:
        OUTBOX.append((to, subject, body))
        log.warning("\n===== E-MAIL (dev, SMTP non configuré) à %s =====\n%s\n\n%s\n=====", to, subject, body)
    else:
        log.error("SMTP non configuré : e-mail « %s » non envoyé", subject)


def link(path: str) -> str:
    return f"{get_settings().origin}/#/forum/{path}"
