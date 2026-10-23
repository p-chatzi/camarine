"""/api/forum/admin/*: scientist validation, reports, moderation, users, audit and security logs.
Admins must have a second factor enabled (auth.require_admin). Every action goes to the audit log."""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import Field, StrictBool, StrictStr
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from .auth import Current, audit, link, log_security, require_admin, revoke_sessions, send_mail
from .common import ROLE_LABELS, Strict, author, iso
from .db import AuditLog, Post, Report, ScientistRequest, SecurityEvent, Thread, User, get_db, utcnow
from .security import clean_line

router = APIRouter(prefix="/admin")


class DecisionIn(Strict):
    decision: StrictStr = Field(pattern="^(approve|reject)$")
    note: StrictStr = Field(default="", max_length=500)


class ResolveIn(Strict):
    action: StrictStr = Field(pattern="^(dismiss|hide)$")


class ThreadFlagsIn(Strict):
    locked: StrictBool | None = None
    pinned: StrictBool | None = None
    hidden: StrictBool | None = None


class UserUpdateIn(Strict):
    role: StrictStr | None = Field(default=None, pattern="^(member|scientist|admin)$")
    status: StrictStr | None = Field(default=None, pattern="^(active|banned)$")


def _bad(status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail=message)


@router.get("/overview")
def overview(_: Current = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, int]:
    return {
        "scientist_requests": db.scalar(select(func.count(ScientistRequest.id)).where(ScientistRequest.status == "pending")) or 0,
        "reports": db.scalar(select(func.count(Report.id)).where(Report.resolved_at.is_(None))) or 0,
        "pending_proposals": db.scalar(select(func.count(Post.id)).where(Post.status == "pending")) or 0,
        "users": db.scalar(select(func.count(User.id))) or 0,
    }


@router.get("/scientist-requests")
def scientist_requests(status: str = "pending", _: Current = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.scalars(select(ScientistRequest).where(ScientistRequest.status == status).options(selectinload(ScientistRequest.user)).order_by(ScientistRequest.created_at))
    return [
        {
            "id": r.id,
            "user": {**author(r.user), "email": r.user.email if r.user else "", "created_at": iso(r.user.created_at) if r.user else None},
            "institution": r.institution,
            "field": r.field,
            "orcid": r.orcid,
            "justification": r.justification,
            "status": r.status,
            "created_at": iso(r.created_at),
            "note": r.decision_note,
        }
        for r in rows
    ]


@router.post("/scientist-requests/{req_id}")
def decide(req_id: int, body: DecisionIn, cur: Current = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    req = db.get(ScientistRequest, req_id)
    if req is None or req.status != "pending":
        raise _bad(404, "Demande introuvable ou déjà traitée.")
    note = clean_line(body.note, 500)
    req.status = "approved" if body.decision == "approve" else "rejected"
    req.decided_by, req.decided_at, req.decision_note = cur.user.id, utcnow(), note
    user = req.user
    if body.decision == "approve" and user.role == "member":
        user.role = "scientist"
        revoke_sessions(db, user.id)  # new privileges → new session
    audit(db, cur.user, f"scientist_{req.status}", f"user {user.id}", note)
    send_mail(
        user.email,
        "Camarine — votre demande de statut scientifique",
        ("Votre compte a été validé : vous pouvez maintenant répondre aux questions et valider les propositions de réponse."
         if req.status == "approved" else "Votre demande n’a pas été acceptée." + (f"\nMotif : {note}" if note else ""))
        + f"\n\n{link('compte')}",
    )
    db.commit()
    return {"status": req.status}


@router.get("/reports")
def reports(_: Current = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.scalars(select(Report).where(Report.resolved_at.is_(None)).options(selectinload(Report.post).selectinload(Post.author)).order_by(Report.created_at))
    return [
        {
            "id": r.id,
            "reason": r.reason,
            "created_at": iso(r.created_at),
            "post": {"id": r.post.id, "thread_id": r.post.thread_id, "body": r.post.body, "status": r.post.status, "author": author(r.post.author)},
        }
        for r in rows
    ]


@router.post("/reports/{report_id}")
def resolve_report(report_id: int, body: ResolveIn, cur: Current = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    rep = db.get(Report, report_id)
    if rep is None or rep.resolved_at is not None:
        raise _bad(404, "Signalement introuvable ou déjà traité.")
    if body.action == "hide":
        rep.post.status = "hidden"
    rep.resolved_by, rep.resolved_at = cur.user.id, utcnow()
    # Same post reported several times: one decision closes them all.
    for other in db.scalars(select(Report).where(Report.post_id == rep.post_id, Report.resolved_at.is_(None))):
        other.resolved_by, other.resolved_at = cur.user.id, utcnow()
    audit(db, cur.user, f"report_{body.action}", f"post {rep.post_id}", rep.reason)
    db.commit()
    return {"status": "ok"}


@router.post("/posts/{post_id}/{action}")
def moderate_post(post_id: int, action: str, cur: Current = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    post = db.get(Post, post_id)
    if post is None or action not in ("hide", "unhide"):
        raise _bad(404, "Message introuvable.")
    if action == "hide" and post.status == "published":
        post.status = "hidden"
    elif action == "unhide" and post.status == "hidden":
        post.status = "published"
    audit(db, cur.user, f"post_{action}", f"post {post.id}")
    db.commit()
    return {"status": post.status}


@router.post("/threads/{thread_id}")
def thread_flags(thread_id: int, body: ThreadFlagsIn, cur: Current = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, Any]:
    thread = db.get(Thread, thread_id)
    if thread is None:
        raise _bad(404, "Sujet introuvable.")
    for flag in ("locked", "pinned", "hidden"):
        value = getattr(body, flag)
        if value is not None:
            setattr(thread, flag, value)
            audit(db, cur.user, f"thread_{flag}_{value}".lower(), f"thread {thread.id}")
    db.commit()
    return {"locked": thread.locked, "pinned": thread.pinned, "hidden": thread.hidden}


@router.get("/users")
def users(q: str = "", _: Current = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    query = select(User).order_by(User.created_at.desc()).limit(50)
    term = clean_line(q, 80)
    if term:
        like = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
        query = query.where(or_(User.display_name.ilike(like, escape="\\"), User.email.ilike(like, escape="\\")))
    return [
        {
            "id": u.id,
            "name": u.display_name,
            "email": u.email,
            "email_verified": u.email_verified,
            "role": u.role,
            "role_label": ROLE_LABELS[u.role],
            "status": u.status,
            "mfa": u.mfa_enabled,
            "created_at": iso(u.created_at),
            "last_login_at": iso(u.last_login_at),
        }
        for u in db.scalars(query)
    ]


@router.post("/users/{user_id}")
def update_user(user_id: int, body: UserUpdateIn, request: Request, cur: Current = Depends(require_admin), db: Session = Depends(get_db)) -> dict[str, str]:
    user = db.get(User, user_id)
    if user is None:
        raise _bad(404, "Utilisateur introuvable.")
    if user.id == cur.user.id:
        raise _bad(400, "Vous ne pouvez pas modifier votre propre rôle ou statut.")
    if body.role and body.role != user.role:
        audit(db, cur.user, "role_changed", f"user {user.id}", f"{user.role} → {body.role}")
        user.role = body.role
        revoke_sessions(db, user.id)
    if body.status and body.status != user.status:
        audit(db, cur.user, "status_changed", f"user {user.id}", f"{user.status} → {body.status}")
        user.status = body.status
        if body.status == "banned":
            revoke_sessions(db, user.id)
            log_security(db, request, user, "banned")
    db.commit()
    return {"role": user.role, "status": user.status}


@router.get("/audit")
def audit_log(page: int = 1, _: Current = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    rows = db.scalars(select(AuditLog).options(selectinload(AuditLog.actor)).order_by(AuditLog.id.desc()).offset((max(1, page) - 1) * 50).limit(50))
    def actor(a: AuditLog) -> dict[str, Any]:
        if a.actor_id is None and a.action.endswith("_cli"):
            return {"id": None, "name": "Serveur (ligne de commande)", "role": "admin"}
        return author(a.actor)

    return [{"id": a.id, "actor": actor(a), "action": a.action, "target": a.target, "detail": a.detail, "at": iso(a.created_at)} for a in rows]


@router.get("/security-events")
def security_events(user_id: int | None = None, _: Current = Depends(require_admin), db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    query = select(SecurityEvent).order_by(SecurityEvent.id.desc()).limit(200)
    if user_id is not None:
        query = query.where(SecurityEvent.user_id == user_id)
    return [{"id": e.id, "user_id": e.user_id, "event": e.event, "ip": e.ip, "user_agent": e.user_agent, "detail": e.detail, "at": iso(e.created_at)} for e in db.scalars(query)]
