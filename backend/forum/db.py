"""Forum database (SQLAlchemy 2). SQLite by default (forum_data/forum.db); PostgreSQL in production
via CAMARINE_FORUM_DB=postgresql+psycopg://… (same models).

Personal data kept (see the privacy page, FORUM.md → RGPD): e-mail, display name, password hash,
MFA material (TOTP secret encrypted, WebAuthn public keys, hashed recovery codes), SSO subject ids,
posts, security log (IP + user agent, 180 days). Secrets are never stored in clear: passwords →
Argon2id; session / e-mail / recovery tokens → SHA-256 of a 256-bit random value.
"""

from __future__ import annotations

from collections.abc import Iterator
from datetime import datetime, timezone
from functools import lru_cache

from sqlalchemy import (
    Boolean,
    DateTime,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    TypeDecorator,
    UniqueConstraint,
    create_engine,
    event,
)
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column, relationship, sessionmaker

from .config import get_settings


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Base(DeclarativeBase):
    pass


class TZDateTime(TypeDecorator):
    """SQLite drops the timezone: always store UTC and return UTC-aware datetimes."""

    impl = DateTime
    cache_ok = True

    def process_bind_param(self, value, dialect):  # noqa: ANN001
        if value is None:
            return None
        return (value if value.tzinfo else value.replace(tzinfo=timezone.utc)).astimezone(timezone.utc).replace(tzinfo=None)

    def process_result_value(self, value, dialect):  # noqa: ANN001
        return None if value is None else value.replace(tzinfo=timezone.utc)


def aware(dt: datetime | None) -> datetime | None:
    if dt is None:
        return None
    return dt if dt.tzinfo else dt.replace(tzinfo=timezone.utc)


ROLES = ("member", "scientist", "admin")


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(254))
    email_norm: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    email_verified_at: Mapped[datetime | None] = mapped_column(TZDateTime())
    display_name: Mapped[str] = mapped_column(String(40))
    display_name_norm: Mapped[str] = mapped_column(String(40), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(255))  # None = SSO-only account
    password_changed_at: Mapped[datetime | None] = mapped_column(TZDateTime())
    role: Mapped[str] = mapped_column(String(16), default="member")
    status: Mapped[str] = mapped_column(String(16), default="active")  # active | banned
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    last_login_at: Mapped[datetime | None] = mapped_column(TZDateTime())
    totp_secret_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    totp_pending_enc: Mapped[bytes | None] = mapped_column(LargeBinary)
    totp_last_step: Mapped[int] = mapped_column(Integer, default=0)
    failed_logins: Mapped[int] = mapped_column(Integer, default=0)
    locked_until: Mapped[datetime | None] = mapped_column(TZDateTime())

    webauthn_credentials: Mapped[list[WebAuthnCredential]] = relationship(back_populates="user", cascade="all, delete-orphan")
    identities: Mapped[list[Identity]] = relationship(back_populates="user", cascade="all, delete-orphan")

    @property
    def mfa_enabled(self) -> bool:
        return self.totp_secret_enc is not None or bool(self.webauthn_credentials)

    @property
    def email_verified(self) -> bool:
        return self.email_verified_at is not None

    @property
    def can_answer(self) -> bool:
        return self.role in ("scientist", "admin")


class Identity(Base):
    """An SSO login linked to a user. `subject` = Google `sub`, Microsoft `tid:oid` (never the e-mail)."""

    __tablename__ = "identities"
    __table_args__ = (UniqueConstraint("provider", "subject"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    provider: Mapped[str] = mapped_column(String(20))
    subject: Mapped[str] = mapped_column(String(255))
    email: Mapped[str] = mapped_column(String(254), default="")
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)

    user: Mapped[User] = relationship(back_populates="identities")


class AuthSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    csrf_token: Mapped[str] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime())
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(255), default="")
    auth_method: Mapped[str] = mapped_column(String(40), default="password")


class LoginChallenge(Base):
    """Password (or SSO) OK, second factor pending. Short-lived, limited attempts."""

    __tablename__ = "login_challenges"

    id: Mapped[int] = mapped_column(primary_key=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    method: Mapped[str] = mapped_column(String(40))  # how the first factor was done
    webauthn_challenge: Mapped[bytes | None] = mapped_column(LargeBinary)
    attempts: Mapped[int] = mapped_column(Integer, default=0)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime())


class WebAuthnCredential(Base):
    __tablename__ = "webauthn_credentials"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    credential_id: Mapped[bytes] = mapped_column(LargeBinary, unique=True)
    public_key: Mapped[bytes] = mapped_column(LargeBinary)
    sign_count: Mapped[int] = mapped_column(Integer, default=0)
    transports: Mapped[str] = mapped_column(String(120), default="")
    name: Mapped[str] = mapped_column(String(60))
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    last_used_at: Mapped[datetime | None] = mapped_column(TZDateTime())

    user: Mapped[User] = relationship(back_populates="webauthn_credentials")


class PendingWebAuthn(Base):
    """Registration challenge of a logged-in user (one at a time)."""

    __tablename__ = "pending_webauthn"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    challenge: Mapped[bytes] = mapped_column(LargeBinary)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime())


class RecoveryCode(Base):
    __tablename__ = "recovery_codes"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    code_hash: Mapped[str] = mapped_column(String(64))
    used_at: Mapped[datetime | None] = mapped_column(TZDateTime())


class EmailToken(Base):
    __tablename__ = "email_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    purpose: Mapped[str] = mapped_column(String(16))  # verify | reset
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime())
    used_at: Mapped[datetime | None] = mapped_column(TZDateTime())


class OAuthState(Base):
    """SSO round trip: state → nonce + PKCE verifier (single use, 10 minutes)."""

    __tablename__ = "oauth_states"

    state_hash: Mapped[str] = mapped_column(String(64), primary_key=True)
    provider: Mapped[str] = mapped_column(String(20))
    nonce: Mapped[str] = mapped_column(String(64))
    code_verifier: Mapped[str] = mapped_column(String(128))
    link_user_id: Mapped[int | None] = mapped_column(Integer)
    expires_at: Mapped[datetime] = mapped_column(TZDateTime())


class ScientistRequest(Base):
    __tablename__ = "scientist_requests"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    institution: Mapped[str] = mapped_column(String(160))
    field: Mapped[str] = mapped_column(String(160))
    orcid: Mapped[str] = mapped_column(String(19), default="")
    justification: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(16), default="pending")  # pending | approved | rejected
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    decided_by: Mapped[int | None] = mapped_column(Integer)
    decided_at: Mapped[datetime | None] = mapped_column(TZDateTime())
    decision_note: Mapped[str] = mapped_column(String(500), default="")

    user: Mapped[User] = relationship()


class Category(Base):
    __tablename__ = "categories"

    slug: Mapped[str] = mapped_column(String(80), primary_key=True)
    parent_slug: Mapped[str | None] = mapped_column(String(80))
    title: Mapped[str] = mapped_column(String(120))
    description: Mapped[str] = mapped_column(String(300), default="")
    kind: Mapped[str] = mapped_column(String(16), default="discussion")  # qa | discussion | group (no threads)
    species_id: Mapped[str | None] = mapped_column(String(60))
    position: Mapped[int] = mapped_column(Integer, default=0)


class Thread(Base):
    __tablename__ = "threads"

    id: Mapped[int] = mapped_column(primary_key=True)
    category_slug: Mapped[str] = mapped_column(ForeignKey("categories.slug"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    title: Mapped[str] = mapped_column(String(160))
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    last_activity_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow, index=True)
    locked: Mapped[bool] = mapped_column(Boolean, default=False)
    pinned: Mapped[bool] = mapped_column(Boolean, default=False)
    hidden: Mapped[bool] = mapped_column(Boolean, default=False)

    author: Mapped[User | None] = relationship()
    posts: Mapped[list[Post]] = relationship(back_populates="thread", cascade="all, delete-orphan", order_by="Post.id")


POST_KINDS = ("question", "answer", "proposal", "reply")
POST_STATUSES = ("published", "pending", "rejected", "hidden", "deleted")


class Post(Base):
    __tablename__ = "posts"

    id: Mapped[int] = mapped_column(primary_key=True)
    thread_id: Mapped[int] = mapped_column(ForeignKey("threads.id", ondelete="CASCADE"), index=True)
    author_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    kind: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(16), default="published")
    body: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    edited_at: Mapped[datetime | None] = mapped_column(TZDateTime())
    validated_by: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    validated_at: Mapped[datetime | None] = mapped_column(TZDateTime())

    thread: Mapped[Thread] = relationship(back_populates="posts")
    author: Mapped[User | None] = relationship(foreign_keys=[author_id])
    validator: Mapped[User | None] = relationship(foreign_keys=[validated_by])


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(primary_key=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("posts.id", ondelete="CASCADE"), index=True)
    reporter_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    reason: Mapped[str] = mapped_column(String(500))
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow)
    resolved_by: Mapped[int | None] = mapped_column(Integer)
    resolved_at: Mapped[datetime | None] = mapped_column(TZDateTime())

    post: Mapped[Post] = relationship()


class SecurityEvent(Base):
    """Authentication events (NIS2-style traceability). Purged after log_retention_days."""

    __tablename__ = "security_events"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"), index=True)
    event: Mapped[str] = mapped_column(String(40))
    ip: Mapped[str] = mapped_column(String(64), default="")
    user_agent: Mapped[str] = mapped_column(String(255), default="")
    detail: Mapped[str] = mapped_column(String(255), default="")
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow, index=True)


class AuditLog(Base):
    """Moderation / administration actions: who did what to whom."""

    __tablename__ = "audit_log"

    id: Mapped[int] = mapped_column(primary_key=True)
    actor_id: Mapped[int | None] = mapped_column(ForeignKey("users.id", ondelete="SET NULL"))
    action: Mapped[str] = mapped_column(String(40))
    target: Mapped[str] = mapped_column(String(80))
    detail: Mapped[str] = mapped_column(String(500), default="")
    created_at: Mapped[datetime] = mapped_column(TZDateTime(), default=utcnow, index=True)

    actor: Mapped[User | None] = relationship()


@lru_cache(maxsize=1)
def get_engine() -> Engine:
    settings = get_settings()
    url = settings.database_url
    kwargs: dict = {}
    if url.startswith("sqlite"):
        settings.data_dir.mkdir(parents=True, exist_ok=True)
        kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(url, **kwargs)
    if url.startswith("sqlite"):

        @event.listens_for(engine, "connect")
        def _sqlite_pragmas(dbapi_conn, _record):  # noqa: ANN001
            cur = dbapi_conn.cursor()
            cur.execute("PRAGMA foreign_keys=ON")
            cur.execute("PRAGMA journal_mode=WAL")
            cur.close()

    return engine


@lru_cache(maxsize=1)
def _session_factory() -> sessionmaker[Session]:
    return sessionmaker(bind=get_engine(), expire_on_commit=False)


def init_db() -> None:
    Base.metadata.create_all(get_engine())


def get_db() -> Iterator[Session]:
    db = _session_factory()()
    try:
        yield db
    finally:
        db.close()


def new_session() -> Session:
    return _session_factory()()
