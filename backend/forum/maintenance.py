"""Data retention (RGPD art. 5-1-e: no longer than necessary), run at startup then every 6 hours:
- security log: CAMARINE_LOG_RETENTION_DAYS (180 by default, CNIL recommendation 6 months - 1 year);
- expired sessions, second-factor challenges, e-mail links, SSO states, WebAuthn challenges;
- accounts whose e-mail was never confirmed, 7 days after sign-up (and that never posted).
"""

from __future__ import annotations

import logging
import threading
import time
from datetime import timedelta

from sqlalchemy import delete, select

from .config import get_settings
from .db import AuthSession, EmailToken, LoginChallenge, OAuthState, PendingWebAuthn, Post, SecurityEvent, User, new_session, utcnow

log = logging.getLogger("camarine.forum")
UNVERIFIED_TTL = timedelta(days=7)


def purge() -> dict[str, int]:
    now = utcnow()
    counts: dict[str, int] = {}
    with new_session() as db:
        for name, stmt in {
            "security_events": delete(SecurityEvent).where(SecurityEvent.created_at < now - timedelta(days=get_settings().log_retention_days)),
            "sessions": delete(AuthSession).where(AuthSession.expires_at < now),
            "login_challenges": delete(LoginChallenge).where(LoginChallenge.expires_at < now),
            "email_tokens": delete(EmailToken).where(EmailToken.expires_at < now - timedelta(days=1)),
            "oauth_states": delete(OAuthState).where(OAuthState.expires_at < now),
            "pending_webauthn": delete(PendingWebAuthn).where(PendingWebAuthn.expires_at < now),
        }.items():
            counts[name] = db.execute(stmt).rowcount or 0
        stale = db.scalars(
            select(User).where(User.email_verified_at.is_(None), User.created_at < now - UNVERIFIED_TTL, ~User.id.in_(select(Post.author_id).where(Post.author_id.is_not(None))))
        ).all()
        for user in stale:
            db.delete(user)
        counts["unverified_users"] = len(stale)
        db.commit()
    return counts


def start_background_purge(interval_s: int = 6 * 3600) -> None:
    def loop() -> None:
        while True:
            try:
                counts = purge()
                if any(counts.values()):
                    log.info("forum : purge %s", counts)
            except Exception as exc:  # noqa: BLE001
                log.warning("forum : purge échouée : %s", exc)
            time.sleep(interval_s)

    threading.Thread(target=loop, daemon=True, name="forum-purge").start()
