"""/api/forum/me*: the logged-in user's account.

Sensitive changes (password, MFA, recovery codes, deletion) need "sudo mode": the current password,
or for SSO-only accounts a login less than 10 minutes old. Every change is in the security log and
the user is e-mailed for the most sensitive ones.
"""

from __future__ import annotations

import json
import re
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from fastapi.responses import JSONResponse
from pydantic import Field, StrictStr
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import mfa, sso
from .auth import Current, clear_cookie, current, log_security, recently_authenticated, require_user, revoke_sessions, send_mail
from .common import ROLE_LABELS, Strict, iso
from .config import get_settings
from .db import AuthSession, Identity, PendingWebAuthn, Post, ScientistRequest, SecurityEvent, Thread, User, get_db, utcnow
from .security import PASSWORD_MAX, InputError, check_password_policy, clean_display_name, clean_line, clean_post, hash_password, verify_password

router = APIRouter(prefix="/me")


class SudoIn(Strict):
    password: StrictStr = Field(default="", max_length=PASSWORD_MAX * 4)


class ProfileIn(Strict):
    display_name: StrictStr = Field(max_length=80)


class PasswordIn(Strict):
    current: StrictStr = Field(default="", max_length=PASSWORD_MAX * 4)
    new: StrictStr = Field(max_length=PASSWORD_MAX * 4)


class CodeIn(Strict):
    code: StrictStr = Field(max_length=20)


class WebAuthnRegisterIn(Strict):
    credential: dict[str, Any]
    name: StrictStr = Field(default="Clé de sécurité", max_length=60)


class ScientistIn(Strict):
    institution: StrictStr = Field(max_length=200)
    field: StrictStr = Field(max_length=200)
    orcid: StrictStr = Field(default="", max_length=40)
    justification: StrictStr = Field(max_length=2000)


class DeleteIn(Strict):
    password: StrictStr = Field(default="", max_length=PASSWORD_MAX * 4)
    confirm: StrictStr = Field(max_length=20)


def _bad(status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail=message)


def require_sudo(cur: Current, password: str) -> None:
    if cur.user.password_hash:
        if not verify_password(cur.user.password_hash, password):
            raise _bad(403, "Mot de passe actuel incorrect.")
    elif not recently_authenticated(cur):
        raise _bad(403, "Par sécurité, reconnectez-vous puis recommencez dans les 10 minutes.")


def me_payload(db: Session, cur: Current) -> dict[str, Any]:
    u = cur.user
    req = db.scalar(select(ScientistRequest).where(ScientistRequest.user_id == u.id).order_by(ScientistRequest.id.desc()))
    return {
        "user": {
            "id": u.id,
            "email": u.email,
            "email_verified": u.email_verified,
            "display_name": u.display_name,
            "role": u.role,
            "role_label": ROLE_LABELS[u.role],
            "has_password": u.password_hash is not None,
            "created_at": iso(u.created_at),
        },
        "csrf": cur.session.csrf_token,
        "mfa": {
            "enabled": u.mfa_enabled,
            "totp": u.totp_secret_enc is not None,
            "webauthn": [{"id": c.id, "name": c.name, "created_at": iso(c.created_at), "last_used_at": iso(c.last_used_at)} for c in u.webauthn_credentials],
            "recovery_remaining": mfa.remaining_recovery_codes(db, u),
        },
        "identities": [{"id": i.id, "provider": i.provider, "email": i.email, "created_at": iso(i.created_at)} for i in u.identities],
        "scientist_request": {"status": req.status, "created_at": iso(req.created_at), "note": req.decision_note} if req else None,
    }


@router.get("")
def me(cur: Current | None = Depends(current), db: Session = Depends(get_db)) -> dict[str, Any]:
    site = {"providers": [{"id": p.name, "label": p.label} for p in sso.providers().values()], "privacy_contact": get_settings().privacy_contact}
    if cur is None:
        return {"user": None, **site}
    return {**me_payload(db, cur), **site}


@router.patch("")
def update_profile(body: ProfileIn, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    try:
        name, norm = clean_display_name(body.display_name)
    except InputError as exc:
        raise _bad(422, str(exc)) from exc
    other = db.scalar(select(User).where(User.display_name_norm == norm))
    if other is not None and other.id != cur.user.id:
        raise _bad(409, "Ce pseudo est déjà pris.")
    cur.user.display_name, cur.user.display_name_norm = name, norm
    db.commit()
    return me_payload(db, cur)


@router.post("/password")
def change_password(body: PasswordIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    require_sudo(cur, body.current)
    try:
        check_password_policy(body.new, email=cur.user.email, display_name=cur.user.display_name)
    except InputError as exc:
        raise _bad(422, str(exc)) from exc
    cur.user.password_hash, cur.user.password_changed_at = hash_password(body.new), utcnow()
    revoke_sessions(db, cur.user.id, keep_id=cur.session.id)
    log_security(db, request, cur.user, "password_changed")
    send_mail(cur.user.email, "Camarine — mot de passe modifié", "Le mot de passe de votre compte Camarine vient d’être modifié ; vos autres sessions ont été fermées.\nSi ce n’est pas vous, réinitialisez-le immédiatement.")
    db.commit()
    return me_payload(db, cur)


@router.post("/totp/setup")
def totp_setup(cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, str]:
    secret, uri = mfa.start_totp(cur.user)
    db.commit()
    return {"secret": secret, "uri": uri}


@router.post("/totp/confirm")
def totp_confirm(body: CodeIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    first_factor = not cur.user.mfa_enabled
    if not mfa.confirm_totp(cur.user, body.code):
        raise _bad(400, "Code incorrect : vérifiez l’heure de votre téléphone et réessayez.")
    codes = mfa.new_recovery_codes(db, cur.user) if first_factor or not mfa.remaining_recovery_codes(db, cur.user) else []
    log_security(db, request, cur.user, "mfa_totp_enabled")
    send_mail(cur.user.email, "Camarine — double authentification activée", "Une application d’authentification vient d’être associée à votre compte.")
    db.commit()
    return {**me_payload(db, cur), "recovery_codes": codes}


@router.post("/totp/disable")
def totp_disable(body: SudoIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    require_sudo(cur, body.password)
    if cur.user.role == "admin" and not cur.user.webauthn_credentials:
        raise _bad(400, "Un administrateur doit garder au moins une double authentification.")
    cur.user.totp_secret_enc = cur.user.totp_pending_enc = None
    log_security(db, request, cur.user, "mfa_totp_disabled")
    send_mail(cur.user.email, "Camarine — double authentification désactivée", "L’application d’authentification a été retirée de votre compte. Si ce n’est pas vous, changez votre mot de passe.")
    db.commit()
    return me_payload(db, cur)


@router.post("/webauthn/options")
def webauthn_options(cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    options, challenge = mfa.registration_options(cur.user)
    row = db.get(PendingWebAuthn, cur.user.id)
    if row is None:
        db.add(PendingWebAuthn(user_id=cur.user.id, challenge=challenge, expires_at=utcnow() + mfa.CHALLENGE_TTL))
    else:
        row.challenge, row.expires_at = challenge, utcnow() + mfa.CHALLENGE_TTL
    db.commit()
    return options


@router.post("/webauthn/register")
def webauthn_register(body: WebAuthnRegisterIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    row = db.get(PendingWebAuthn, cur.user.id)
    if row is None or row.expires_at < utcnow():
        raise _bad(400, "Délai dépassé : recommencez.")
    challenge = row.challenge
    db.delete(row)
    first_factor = not cur.user.mfa_enabled
    try:
        mfa.finish_registration(cur.user, body.credential, challenge, clean_line(body.name, 60) or "Clé de sécurité")
    except Exception as exc:  # noqa: BLE001 (invalid attestation / origin / challenge)
        db.commit()
        raise _bad(400, "La clé n’a pas pu être enregistrée.") from exc
    codes = mfa.new_recovery_codes(db, cur.user) if first_factor or not mfa.remaining_recovery_codes(db, cur.user) else []
    log_security(db, request, cur.user, "mfa_webauthn_added")
    send_mail(cur.user.email, "Camarine — clé de sécurité ajoutée", "Une clé de sécurité ou une passkey vient d’être ajoutée à votre compte.")
    db.commit()
    return {**me_payload(db, cur), "recovery_codes": codes}


@router.post("/webauthn/{cred_id}/delete")
def webauthn_delete(cred_id: int, body: SudoIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    require_sudo(cur, body.password)
    cred = next((c for c in cur.user.webauthn_credentials if c.id == cred_id), None)
    if cred is None:
        raise _bad(404, "Clé introuvable.")
    if cur.user.role == "admin" and cur.user.totp_secret_enc is None and len(cur.user.webauthn_credentials) == 1:
        raise _bad(400, "Un administrateur doit garder au moins une double authentification.")
    cur.user.webauthn_credentials.remove(cred)
    log_security(db, request, cur.user, "mfa_webauthn_removed")
    db.commit()
    return me_payload(db, cur)


@router.post("/recovery-codes")
def recovery_codes(body: SudoIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    require_sudo(cur, body.password)
    if not cur.user.mfa_enabled:
        raise _bad(400, "Activez d’abord la double authentification.")
    codes = mfa.new_recovery_codes(db, cur.user)
    log_security(db, request, cur.user, "mfa_recovery_regenerated")
    db.commit()
    return {**me_payload(db, cur), "recovery_codes": codes}


@router.get("/sessions")
def sessions(cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.scalars(select(AuthSession).where(AuthSession.user_id == cur.user.id).order_by(AuthSession.last_seen_at.desc()))
    return [
        {"id": s.id, "current": s.id == cur.session.id, "created_at": iso(s.created_at), "last_seen_at": iso(s.last_seen_at), "ip": s.ip, "user_agent": s.user_agent, "method": s.auth_method}
        for s in rows
    ]


@router.post("/sessions/{session_id}/revoke")
def revoke(session_id: int, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, str]:
    row = db.get(AuthSession, session_id)
    if row is None or row.user_id != cur.user.id:
        raise _bad(404, "Session introuvable.")
    db.delete(row)
    log_security(db, request, cur.user, "session_revoked")
    db.commit()
    return {"status": "ok"}


@router.post("/identities/{identity_id}/unlink")
def unlink(identity_id: int, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    ident = next((i for i in cur.user.identities if i.id == identity_id), None)
    if ident is None:
        raise _bad(404, "Compte lié introuvable.")
    if cur.user.password_hash is None and len(cur.user.identities) == 1:
        raise _bad(400, "Définissez d’abord un mot de passe (« Mot de passe oublié ») : sinon vous ne pourriez plus vous connecter.")
    cur.user.identities.remove(ident)
    log_security(db, request, cur.user, "sso_unlinked", ident.provider)
    db.commit()
    return me_payload(db, cur)


@router.post("/scientist-request", status_code=201)
def scientist_request(body: ScientistIn, request: Request, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, Any]:
    if not cur.user.email_verified:
        raise _bad(403, "Confirmez d’abord votre adresse e-mail.")
    if cur.user.role != "member":
        raise _bad(400, "Votre compte a déjà ce statut.")
    pending = db.scalar(select(ScientistRequest).where(ScientistRequest.user_id == cur.user.id, ScientistRequest.status == "pending"))
    if pending is not None:
        raise _bad(409, "Une demande est déjà en cours d’examen.")
    orcid = body.orcid.strip().removeprefix("https://orcid.org/")
    if orcid and not re.fullmatch(r"\d{4}-\d{4}-\d{4}-\d{3}[\dX]", orcid):
        raise _bad(422, "ORCID au format 0000-0000-0000-0000.")
    institution, field, why = clean_line(body.institution, 160), clean_line(body.field, 160), clean_post(body.justification, 2000)
    if len(institution) < 2 or len(field) < 2 or len(why) < 20:
        raise _bad(422, "Précisez votre institution, votre domaine et, en quelques lignes, votre activité (publications, poste…).")
    db.add(ScientistRequest(user_id=cur.user.id, institution=institution, field=field, orcid=orcid, justification=why))
    log_security(db, request, cur.user, "scientist_requested")
    db.commit()
    return me_payload(db, cur)


@router.get("/export")
def export(cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> JSONResponse:
    """RGPD art. 15 / 20: everything stored about the user, machine-readable."""
    u = cur.user
    posts = db.scalars(select(Post).where(Post.author_id == u.id).order_by(Post.id))
    threads = db.scalars(select(Thread).where(Thread.author_id == u.id).order_by(Thread.id))
    events = db.scalars(select(SecurityEvent).where(SecurityEvent.user_id == u.id).order_by(SecurityEvent.id))
    reqs = db.scalars(select(ScientistRequest).where(ScientistRequest.user_id == u.id))
    data = {
        "exported_at": iso(utcnow()),
        **me_payload(db, cur),
        "posts": [{"id": p.id, "thread_id": p.thread_id, "kind": p.kind, "status": p.status, "created_at": iso(p.created_at), "body": p.body} for p in posts],
        "threads": [{"id": t.id, "title": t.title, "category": t.category_slug, "created_at": iso(t.created_at)} for t in threads],
        "scientist_requests": [{"institution": r.institution, "field": r.field, "orcid": r.orcid, "justification": r.justification, "status": r.status, "created_at": iso(r.created_at)} for r in reqs],
        "security_log": [{"event": e.event, "ip": e.ip, "user_agent": e.user_agent, "detail": e.detail, "at": iso(e.created_at)} for e in events],
        "sessions": sessions(cur, db),
    }
    data.pop("csrf", None)
    return JSONResponse(json.loads(json.dumps(data, default=str)), headers={"Content-Disposition": 'attachment; filename="camarine-mes-donnees.json"'})


@router.post("/delete")
def delete_account(body: DeleteIn, request: Request, response: Response, cur: Current = Depends(require_user), db: Session = Depends(get_db)) -> dict[str, str]:
    """RGPD art. 17. The account and its login data are deleted; messages stay (the discussions would
    no longer make sense) but are shown as written by "Compte supprimé"."""
    if body.confirm != "SUPPRIMER":
        raise _bad(422, "Tapez SUPPRIMER pour confirmer.")
    require_sudo(cur, body.password)
    if cur.user.role == "admin" and db.scalar(select(User).where(User.role == "admin", User.id != cur.user.id)) is None:
        raise _bad(400, "Vous êtes le seul administrateur : nommez-en un autre avant de supprimer votre compte.")
    email = cur.user.email
    log_security(db, request, None, "account_deleted", f"user {cur.user.id}")
    db.delete(cur.user)
    db.commit()
    clear_cookie(response, get_settings().session_cookie)
    send_mail(email, "Camarine — compte supprimé", "Votre compte du forum Camarine et vos données de connexion ont été supprimés. Vos messages restent visibles sous le nom « Compte supprimé ».")
    return {"status": "ok"}

