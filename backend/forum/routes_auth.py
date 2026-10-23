"""/api/forum/auth/*: sign-up, e-mail verification, login (+ second factor), logout, password reset, SSO.

Anti-enumeration: sign-up and "forgot password" answer the same thing whether the e-mail exists or
not; login says "identifiants incorrects" for both unknown e-mail and wrong password, with the same
computation time (dummy Argon2 verification).
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import RedirectResponse
from pydantic import BaseModel, ConfigDict, Field, StrictBool, StrictInt, StrictStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import antibot, mfa, sso
from .auth import (
    Current,
    clear_cookie,
    create_session,
    csrf,
    current,
    link,
    log_security,
    require_user,
    revoke_sessions,
    send_mail,
    _set_cookie,
)
from .config import get_settings
from .db import EmailToken, Identity, LoginChallenge, User, get_db, utcnow
from .security import (
    PASSWORD_MAX,
    InputError,
    check_password_policy,
    clean_display_name,
    clean_email,
    hash_password,
    needs_rehash,
    new_token,
    token_hash,
    verify_password,
)

router = APIRouter(prefix="/auth")

MFA_TTL = timedelta(minutes=5)
MFA_MAX_ATTEMPTS = 5
VERIFY_TTL = timedelta(hours=48)
RESET_TTL = timedelta(hours=1)
LOCK_AFTER = 5  # failed logins on one account → growing delay before the next try


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class RegisterIn(Strict):
    email: StrictStr = Field(max_length=320)
    password: StrictStr = Field(max_length=PASSWORD_MAX * 4)
    display_name: StrictStr = Field(max_length=80)
    accept: StrictBool  # read the privacy notice, 15 years old or more
    pow: dict[str, Any]
    website: StrictStr = Field(default="", max_length=200)  # honeypot
    elapsed_ms: StrictInt = 0


class LoginIn(Strict):
    email: StrictStr = Field(max_length=320)
    password: StrictStr = Field(max_length=PASSWORD_MAX * 4)


class TokenIn(Strict):
    token: StrictStr = Field(max_length=100)


class CodeIn(Strict):
    code: StrictStr = Field(max_length=40)


class CredentialIn(Strict):
    credential: dict[str, Any]


class ForgotIn(Strict):
    email: StrictStr = Field(max_length=320)
    pow: dict[str, Any]


class ResetIn(Strict):
    token: StrictStr = Field(max_length=100)
    password: StrictStr = Field(max_length=PASSWORD_MAX * 4)


class SSOStartIn(Strict):
    intent: StrictStr = Field(pattern="^(login|link)$")


def _bad(status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail=message)


def _email_token(db: Session, user: User, purpose: str, ttl: timedelta) -> str:
    for old in db.scalars(select(EmailToken).where(EmailToken.user_id == user.id, EmailToken.purpose == purpose, EmailToken.used_at.is_(None))):
        old.used_at = utcnow()  # one valid link at a time
    token = new_token()
    db.add(EmailToken(user_id=user.id, purpose=purpose, token_hash=token_hash(token), expires_at=utcnow() + ttl))
    return token


def send_verification(db: Session, user: User) -> None:
    token = _email_token(db, user, "verify", VERIFY_TTL)
    send_mail(
        user.email,
        "Camarine — confirmez votre adresse e-mail",
        f"Bonjour {user.display_name},\n\nPour activer votre compte du forum Camarine, ouvrez ce lien (valable 48 heures) :\n{link('verifier?token=' + token)}\n\n"
        "Si vous n’avez pas créé de compte, ignorez ce message : sans confirmation, le compte est supprimé au bout de 7 jours.",
    )


def _use_email_token(db: Session, token: str, purpose: str) -> EmailToken:
    row = db.scalar(select(EmailToken).where(EmailToken.token_hash == token_hash(token), EmailToken.purpose == purpose))
    if row is None or row.used_at is not None or row.expires_at < utcnow():
        raise _bad(400, "Lien invalide ou expiré : demandez-en un nouveau.")
    row.used_at = utcnow()
    return row


def mfa_methods(db: Session, user: User) -> list[str]:
    methods = []
    if user.totp_secret_enc is not None:
        methods.append("totp")
    if user.webauthn_credentials:
        methods.append("webauthn")
    if mfa.remaining_recovery_codes(db, user):
        methods.append("recovery")
    return methods


def start_second_factor(db: Session, user: User, response: Response, method: str) -> dict[str, Any]:
    token = new_token()
    db.add(LoginChallenge(token_hash=token_hash(token), user_id=user.id, method=method, expires_at=utcnow() + MFA_TTL))
    _set_cookie(response, get_settings().mfa_cookie, token, int(MFA_TTL.total_seconds()))
    return {"status": "mfa", "methods": mfa_methods(db, user)}


def _challenge(request: Request, db: Session) -> tuple[LoginChallenge, User]:
    token = request.cookies.get(get_settings().mfa_cookie)
    row = db.scalar(select(LoginChallenge).where(LoginChallenge.token_hash == token_hash(token))) if token else None
    if row is None or row.expires_at < utcnow():
        raise _bad(401, "Délai dépassé : reconnectez-vous.")
    if row.attempts >= MFA_MAX_ATTEMPTS:
        db.delete(row)
        db.commit()
        raise _bad(429, "Trop d’essais : reconnectez-vous.")
    user = db.get(User, row.user_id)
    if user is None or user.status != "active":
        raise _bad(401, "Délai dépassé : reconnectez-vous.")
    return row, user


def _finish_second_factor(db: Session, request: Request, response: Response, row: LoginChallenge, user: User, factor: str) -> dict[str, Any]:
    db.delete(row)
    create_session(db, user, request, response, f"{row.method}+{factor}")
    db.commit()
    return {"status": "ok"}


def _failed_factor(db: Session, request: Request, row: LoginChallenge, user: User, factor: str) -> HTTPException:
    row.attempts += 1
    log_security(db, request, user, "mfa_failed", factor)
    db.commit()
    return _bad(400, "Code incorrect.")


# ---------------------------------------------------------------- routes


@router.get("/pow")
def proof_of_work(purpose: str = "signup") -> dict[str, object]:
    if purpose not in ("signup", "reset"):
        raise _bad(400, "Usage inconnu.")
    return antibot.new_challenge(purpose)


@router.post("/register", status_code=201)
def register(body: RegisterIn, request: Request, db: Session = Depends(get_db), cur: Current | None = Depends(csrf)) -> dict[str, str]:
    if cur is not None:
        raise _bad(400, "Vous êtes déjà connecté.")
    if not body.accept:
        raise _bad(422, "Merci d’accepter la politique de confidentialité (et d’avoir 15 ans ou plus).")
    ok_message = {"status": "ok", "message": "Si l’adresse est valide, un e-mail de confirmation vient d’y être envoyé."}
    if not antibot.looks_human(body.website, body.elapsed_ms):
        return ok_message  # bot: pretend it worked, create nothing
    if not antibot.verify_challenge(body.pow, "signup"):
        raise _bad(400, "Vérification anti-robot échouée : rechargez la page et réessayez.")
    if not antibot.signup_limiter.allow(antibot.client_ip(request)):
        raise _bad(429, "Trop de comptes créés depuis cette connexion aujourd’hui.")
    try:
        email, email_norm = clean_email(body.email)
        name, name_norm = clean_display_name(body.display_name)
        check_password_policy(body.password, email=email, display_name=name)
    except InputError as exc:
        raise _bad(422, str(exc)) from exc
    if db.scalar(select(User).where(User.display_name_norm == name_norm)):
        raise _bad(409, "Ce pseudo est déjà pris.")  # public anyway: not an enumeration of e-mails
    existing = db.scalar(select(User).where(User.email_norm == email_norm))
    if existing is not None:
        send_mail(
            existing.email,
            "Camarine — tentative de création de compte",
            "Quelqu’un (peut-être vous) a essayé de créer un compte sur le forum Camarine avec cette adresse, qui en a déjà un.\n\n"
            f"Pour vous connecter : {link('connexion')}\nMot de passe oublié : {link('mot-de-passe-oublie')}\n\nSi ce n’est pas vous, ignorez ce message.",
        )
        return ok_message
    user = User(email=email, email_norm=email_norm, display_name=name, display_name_norm=name_norm, password_hash=hash_password(body.password), password_changed_at=utcnow())
    db.add(user)
    db.flush()
    log_security(db, request, user, "signup")
    send_verification(db, user)
    db.commit()
    return ok_message


@router.post("/verify-email")
def verify_email(body: TokenIn, request: Request, response: Response, db: Session = Depends(get_db), cur: Current | None = Depends(csrf)) -> dict[str, Any]:
    row = _use_email_token(db, body.token, "verify")
    user = db.get(User, row.user_id)
    if user is None:
        raise _bad(400, "Lien invalide ou expiré : demandez-en un nouveau.")
    user.email_verified_at = user.email_verified_at or utcnow()
    log_security(db, request, user, "email_verified")
    logged_in = False
    if cur is None and not user.mfa_enabled and user.status == "active":
        create_session(db, user, request, response, "email-link")
        logged_in = True
    db.commit()
    return {"status": "ok", "logged_in": logged_in or (cur is not None and cur.user.id == user.id)}


@router.post("/resend-verification")
def resend_verification(cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, str]:
    if cur.user.email_verified:
        return {"status": "ok"}
    if not antibot.reset_limiter.allow(f"verify:{cur.user.id}"):
        raise _bad(429, "Un e-mail vient déjà d’être envoyé : patientez un peu.")
    send_verification(db, db.merge(cur.user))
    db.commit()
    return {"status": "ok"}


@router.post("/login")
def login(body: LoginIn, request: Request, response: Response, db: Session = Depends(get_db), cur: Current | None = Depends(csrf)) -> dict[str, Any]:
    if not antibot.login_limiter.allow(antibot.client_ip(request)):
        raise _bad(429, "Trop de tentatives : réessayez dans 15 minutes.")
    generic = _bad(401, "E-mail ou mot de passe incorrect.")
    try:
        _, email_norm = clean_email(body.email)
    except InputError:
        verify_password(None, body.password)
        raise generic from None
    user = db.scalar(select(User).where(User.email_norm == email_norm))
    now = utcnow()
    if user is not None and user.locked_until and user.locked_until > now:
        verify_password(None, body.password)
        raise _bad(429, "Trop d’essais sur ce compte : réessayez dans quelques minutes.")
    if not verify_password(user.password_hash if user else None, body.password) or user is None:
        if user is not None:
            user.failed_logins += 1
            if user.failed_logins >= LOCK_AFTER:
                user.locked_until = now + timedelta(minutes=min(60, 2 ** (user.failed_logins - LOCK_AFTER)))
            log_security(db, request, user, "login_failed")
            db.commit()
        raise generic
    if user.status != "active":
        log_security(db, request, user, "login_banned")
        db.commit()
        raise _bad(403, "Ce compte est suspendu.")
    if needs_rehash(user.password_hash or ""):
        user.password_hash = hash_password(body.password)
    if cur is not None:
        db.delete(db.merge(cur.session))  # replace any previous session (fixation)
    if user.mfa_enabled:
        result = start_second_factor(db, user, response, "password")
        db.commit()
        return result
    create_session(db, user, request, response, "password")
    db.commit()
    return {"status": "ok"}


@router.get("/mfa/methods")
def mfa_pending_methods(request: Request, db: Session = Depends(get_db)) -> dict[str, Any]:
    """Second factors available for the pending login (after an SSO redirect the page doesn't know them)."""
    _, user = _challenge(request, db)
    return {"methods": mfa_methods(db, user)}


@router.post("/mfa/totp")
def mfa_totp(body: CodeIn, request: Request, response: Response, db: Session = Depends(get_db), _: Current | None = Depends(csrf)) -> dict[str, Any]:
    row, user = _challenge(request, db)
    if not mfa.verify_totp(user, body.code):
        raise _failed_factor(db, request, row, user, "totp")
    return _finish_second_factor(db, request, response, row, user, "totp")


@router.post("/mfa/recovery")
def mfa_recovery(body: CodeIn, request: Request, response: Response, db: Session = Depends(get_db), _: Current | None = Depends(csrf)) -> dict[str, Any]:
    row, user = _challenge(request, db)
    if not mfa.use_recovery_code(db, user, body.code):
        raise _failed_factor(db, request, row, user, "recovery")
    left = mfa.remaining_recovery_codes(db, user)
    send_mail(user.email, "Camarine — code de secours utilisé", f"Un code de secours vient d’être utilisé pour vous connecter. Il vous en reste {left}.\nSi ce n’est pas vous, changez votre mot de passe : {link('compte')}")
    return _finish_second_factor(db, request, response, row, user, "recovery")


@router.post("/mfa/webauthn/options")
def mfa_webauthn_options(request: Request, db: Session = Depends(get_db), _: Current | None = Depends(csrf)) -> dict[str, Any]:
    row, user = _challenge(request, db)
    if not user.webauthn_credentials:
        raise _bad(400, "Aucune clé de sécurité enregistrée.")
    options, challenge = mfa.authentication_options(user)
    row.webauthn_challenge = challenge
    db.commit()
    return options


@router.post("/mfa/webauthn")
def mfa_webauthn(body: CredentialIn, request: Request, response: Response, db: Session = Depends(get_db), _: Current | None = Depends(csrf)) -> dict[str, Any]:
    row, user = _challenge(request, db)
    if row.webauthn_challenge is None or not mfa.finish_authentication(user, body.credential, row.webauthn_challenge):
        row.webauthn_challenge = None
        raise _failed_factor(db, request, row, user, "webauthn")
    return _finish_second_factor(db, request, response, row, user, "webauthn")


@router.post("/logout")
def logout(request: Request, response: Response, db: Session = Depends(get_db), cur: Current | None = Depends(csrf)) -> dict[str, str]:
    if cur is not None:
        log_security(db, request, cur.user, "logout")
        db.delete(db.merge(cur.session))
        db.commit()
    clear_cookie(response, get_settings().session_cookie)
    return {"status": "ok"}


@router.post("/logout-all")
def logout_all(request: Request, response: Response, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, str]:
    revoke_sessions(db, cur.user.id)
    log_security(db, request, cur.user, "logout_all")
    db.commit()
    clear_cookie(response, get_settings().session_cookie)
    return {"status": "ok"}


@router.post("/password/forgot")
def forgot_password(body: ForgotIn, request: Request, db: Session = Depends(get_db), _: Current | None = Depends(csrf)) -> dict[str, str]:
    if not antibot.verify_challenge(body.pow, "reset"):
        raise _bad(400, "Vérification anti-robot échouée : rechargez la page et réessayez.")
    if not antibot.reset_limiter.allow(antibot.client_ip(request)):
        raise _bad(429, "Trop de demandes : réessayez dans une heure.")
    try:
        _, email_norm = clean_email(body.email)
        user = db.scalar(select(User).where(User.email_norm == email_norm))
    except InputError:
        user = None
    if user is not None and user.status == "active":
        token = _email_token(db, user, "reset", RESET_TTL)
        log_security(db, request, user, "password_reset_requested")
        send_mail(
            user.email,
            "Camarine — nouveau mot de passe",
            f"Pour choisir un nouveau mot de passe, ouvrez ce lien (valable 1 heure) :\n{link('nouveau-mot-de-passe?token=' + token)}\n\nSi vous n’avez rien demandé, ignorez ce message : votre mot de passe actuel reste valable.",
        )
        db.commit()
    return {"status": "ok", "message": "Si un compte existe pour cette adresse, un lien vient d’y être envoyé."}


@router.post("/password/reset")
def reset_password(body: ResetIn, request: Request, db: Session = Depends(get_db), _: Current | None = Depends(csrf)) -> dict[str, str]:
    row = _use_email_token(db, body.token, "reset")
    user = db.get(User, row.user_id)
    if user is None:
        raise _bad(400, "Lien invalide ou expiré : demandez-en un nouveau.")
    try:
        check_password_policy(body.password, email=user.email, display_name=user.display_name)
    except InputError as exc:
        db.rollback()  # the link stays usable
        raise _bad(422, str(exc)) from exc
    user.password_hash, user.password_changed_at = hash_password(body.password), utcnow()
    user.email_verified_at = user.email_verified_at or utcnow()  # the link proves the mailbox
    user.failed_logins, user.locked_until = 0, None
    revoke_sessions(db, user.id)
    log_security(db, request, user, "password_reset")
    send_mail(user.email, "Camarine — mot de passe modifié", "Le mot de passe de votre compte Camarine vient d’être changé et toutes vos sessions ont été fermées.\nSi ce n’est pas vous, répondez à ce message ou contactez l’administrateur au plus vite.")
    db.commit()
    return {"status": "ok"}


# ---------------------------------------------------------------- SSO


@router.get("/providers")
def sso_providers() -> list[dict[str, str]]:
    return [{"id": p.name, "label": p.label} for p in sso.providers().values()]


@router.post("/sso/{provider}/start")
def sso_start(provider: str, body: SSOStartIn, response: Response, db: Session = Depends(get_db), cur: Current | None = Depends(csrf)) -> dict[str, str]:
    if body.intent == "link" and cur is None:
        raise _bad(401, "Connectez-vous pour lier un compte.")
    try:
        url, binding = sso.start(db, provider, cur.user.id if body.intent == "link" and cur else None)
    except sso.SSOError as exc:
        raise _bad(400, "Connexion par ce fournisseur indisponible.") from exc
    db.commit()
    _set_cookie(response, sso.BINDING_COOKIE, binding, int(sso.STATE_TTL.total_seconds()))
    return {"url": url}


def _unique_name(db: Session, wanted: str) -> tuple[str, str]:
    try:
        base, _ = clean_display_name(wanted)
    except InputError:
        base = "Membre"
    base = base[:24]
    for i in range(0, 1000):
        candidate = base if i == 0 else f"{base} {i + 1}"
        try:
            name, norm = clean_display_name(candidate)
        except InputError:
            continue
        if not db.scalar(select(User).where(User.display_name_norm == norm)):
            return name, norm
    raise sso.SSOError("sso-refuse")


@router.get("/sso/{provider}/callback")
def sso_callback(provider: str, request: Request, db: Session = Depends(get_db), cur: Current | None = Depends(current)) -> RedirectResponse:
    def go(path: str) -> RedirectResponse:
        resp = RedirectResponse(link(path), status_code=303)
        clear_cookie(resp, sso.BINDING_COOKIE)
        return resp

    if request.query_params.get("error"):
        return go("connexion?erreur=sso-annule")
    try:
        state = sso.consume_state(db, provider, request.query_params.get("state", ""), request.cookies.get(sso.BINDING_COOKIE))
        db.commit()  # consumed for good, even if what follows fails
        ident = sso.finish(db, provider, request.query_params.get("code", ""), state)
        identity = db.scalar(select(Identity).where(Identity.provider == provider, Identity.subject == ident.subject))
        if state.link_user_id is not None:  # "link my Google / Microsoft account"
            if cur is None or cur.user.id != state.link_user_id:
                raise sso.SSOError("sso-session-expiree")
            if identity is not None and identity.user_id != cur.user.id:
                raise sso.SSOError("sso-deja-lie")
            if identity is None:
                db.add(Identity(user_id=cur.user.id, provider=provider, subject=ident.subject, email=ident.email[:254]))
                log_security(db, request, cur.user, "sso_linked", provider)
            db.commit()
            return go("compte?lie=" + provider)
        if identity is not None:
            user = db.get(User, identity.user_id)
        else:
            email_norm = ident.email.casefold() if ident.email else ""
            if not email_norm:
                raise sso.SSOError("sso-sans-email")
            if db.scalar(select(User).where(User.email_norm == email_norm)):
                raise sso.SSOError("sso-email-existant")
            if not antibot.signup_limiter.allow(antibot.client_ip(request)):
                raise sso.SSOError("sso-limite")
            email, email_norm = clean_email(ident.email)
            name, name_norm = _unique_name(db, ident.name or email.split("@", 1)[0])
            user = User(email=email, email_norm=email_norm, display_name=name, display_name_norm=name_norm, email_verified_at=utcnow() if ident.email_verified else None)
            db.add(user)
            db.flush()
            db.add(Identity(user_id=user.id, provider=provider, subject=ident.subject, email=ident.email[:254]))
            log_security(db, request, user, "signup", provider)
            if not user.email_verified:
                send_verification(db, user)
        if user is None or user.status != "active":
            raise sso.SSOError("sso-compte-suspendu")
        resp = go("connexion?mfa=1" if user.mfa_enabled else "")
        if user.mfa_enabled:
            start_second_factor(db, user, resp, provider)
        else:
            create_session(db, user, request, resp, provider)
        db.commit()
        clear_cookie(resp, sso.BINDING_COOKIE)
        return resp
    except (sso.SSOError, InputError) as exc:
        db.rollback()
        code = exc.code if isinstance(exc, sso.SSOError) else "sso-refuse"
        return go(f"connexion?erreur={code}")
