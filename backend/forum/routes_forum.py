"""/api/forum: categories, threads, posts, Q&A validation, reports.

Who can do what
- read: everyone (even logged out);
- create a thread / reply: logged-in members with a confirmed e-mail;
- Q&A: answers by validated scientists (and admins) are published at once; anyone else's answer is a
  "proposition" visible to its author, scientists and admins until a scientist validates or rejects it;
- edit / delete: the author (and admins); hide, lock, pin: admins (routes_admin.py).
Messages are plain text (rendered escaped by React; links made clickable client-side, http/https only).
"""

from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import Field, StrictStr
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session, selectinload

from . import antibot
from .auth import Current, audit, current, require_scientist, require_verified
from .common import Strict, author, iso
from .db import Category, Post, Report, Thread, User, get_db, utcnow
from .security import clean_line, clean_post

router = APIRouter()

TITLE_MIN, TITLE_MAX = 8, 160
BODY_MIN, BODY_MAX = 2, 10_000
PAGE_SIZE = 20


class ThreadIn(Strict):
    title: StrictStr = Field(max_length=400)
    body: StrictStr = Field(max_length=BODY_MAX * 2)


class PostIn(Strict):
    body: StrictStr = Field(max_length=BODY_MAX * 2)


class ReportIn(Strict):
    reason: StrictStr = Field(max_length=1000)


class NoteIn(Strict):
    note: StrictStr = Field(default="", max_length=500)


def _bad(status: int, message: str) -> HTTPException:
    return HTTPException(status_code=status, detail=message)


def _clean_body(raw: str) -> str:
    body = clean_post(raw, BODY_MAX)
    if len(body) < BODY_MIN:
        raise _bad(422, "Message vide.")
    return body


def _can_moderate(user: User | None) -> bool:
    return user is not None and user.role == "admin"


def _visible(post: Post, viewer: User | None) -> bool:
    if post.status in ("published", "deleted", "hidden"):
        return True  # deleted / hidden are shown as a placeholder
    if viewer is None:
        return False
    if post.status == "pending":
        return post.author_id == viewer.id or viewer.can_answer
    return post.author_id == viewer.id or viewer.role == "admin"  # rejected


def post_json(p: Post, viewer: User | None) -> dict[str, Any]:
    show_body = p.status not in ("deleted", "hidden") or _can_moderate(viewer)
    return {
        "id": p.id,
        "kind": p.kind,
        "status": p.status,
        "body": p.body if show_body else "",
        "author": author(p.author),
        "created_at": iso(p.created_at),
        "edited_at": iso(p.edited_at),
        "validated_by": author(p.validator) if p.validated_by else None,
        "validated_at": iso(p.validated_at),
        "can_edit": viewer is not None and p.author_id == viewer.id and p.status in ("published", "pending"),
        "can_validate": viewer is not None and viewer.can_answer and p.status == "pending" and p.author_id != viewer.id,
    }


def _category(db: Session, slug: str) -> Category:
    cat = db.get(Category, slug)
    if cat is None:
        raise _bad(404, "Rubrique introuvable.")
    return cat


def _thread(db: Session, thread_id: int, viewer: User | None) -> Thread:
    thread = db.get(Thread, thread_id)
    if thread is None or (thread.hidden and not _can_moderate(viewer)):
        raise _bad(404, "Sujet introuvable.")
    return thread


@router.get("/categories")
def categories(db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    counts = dict(db.execute(select(Thread.category_slug, func.count(Thread.id)).where(Thread.hidden.is_(False)).group_by(Thread.category_slug)).all())
    last = dict(db.execute(select(Thread.category_slug, func.max(Thread.last_activity_at)).where(Thread.hidden.is_(False)).group_by(Thread.category_slug)).all())
    rows = db.scalars(select(Category).order_by(Category.position))
    return [
        {
            "slug": c.slug,
            "parent": c.parent_slug,
            "title": c.title,
            "description": c.description,
            "kind": c.kind,
            "species_id": c.species_id,
            "threads": counts.get(c.slug, 0),
            "last_activity_at": iso(last.get(c.slug)),
        }
        for c in rows
    ]


@router.get("/categories/{slug}")
def category_threads(slug: str, page: int = 1, db: Session = Depends(get_db), cur: Current | None = Depends(current)) -> dict[str, Any]:
    cat = _category(db, slug)
    viewer = cur.user if cur else None
    page = max(1, min(page, 10_000))
    q = select(Thread).where(Thread.category_slug == slug)
    if not _can_moderate(viewer):
        q = q.where(Thread.hidden.is_(False))
    total = db.scalar(select(func.count()).select_from(q.subquery())) or 0
    threads = db.scalars(q.options(selectinload(Thread.author)).order_by(Thread.pinned.desc(), Thread.last_activity_at.desc()).offset((page - 1) * PAGE_SIZE).limit(PAGE_SIZE)).all()
    ids = [t.id for t in threads]
    replies = dict(db.execute(select(Post.thread_id, func.count(Post.id)).where(Post.thread_id.in_(ids), Post.status == "published").group_by(Post.thread_id)).all()) if ids else {}
    answered = set(db.scalars(select(Post.thread_id).where(Post.thread_id.in_(ids), Post.kind == "answer", Post.status == "published"))) if ids else set()
    return {
        "category": {"slug": cat.slug, "parent": cat.parent_slug, "title": cat.title, "description": cat.description, "kind": cat.kind, "species_id": cat.species_id},
        "page": page,
        "pages": max(1, -(-total // PAGE_SIZE)),
        "threads": [
            {
                "id": t.id,
                "title": t.title,
                "author": author(t.author),
                "created_at": iso(t.created_at),
                "last_activity_at": iso(t.last_activity_at),
                "replies": max(0, replies.get(t.id, 0) - 1),
                "answered": t.id in answered,
                "pinned": t.pinned,
                "locked": t.locked,
                "hidden": t.hidden,
            }
            for t in threads
        ],
    }


@router.post("/categories/{slug}/threads", status_code=201)
def create_thread(slug: str, body: ThreadIn, cur: Current = Depends(require_verified), db: Session = Depends(get_db)) -> dict[str, Any]:
    cat = _category(db, slug)
    if cat.kind == "group":
        raise _bad(400, "Choisissez une sous-rubrique.")
    if not antibot.post_limiter.allow(f"user:{cur.user.id}"):
        raise _bad(429, "Beaucoup de messages en peu de temps : patientez un peu.")
    title = clean_line(body.title, TITLE_MAX)
    if len(title) < TITLE_MIN:
        raise _bad(422, f"Titre trop court ({TITLE_MIN} caractères minimum).")
    thread = Thread(category_slug=slug, author_id=cur.user.id, title=title)
    thread.posts.append(Post(author_id=cur.user.id, kind="question" if cat.kind == "qa" else "message", body=_clean_body(body.body)))
    db.add(thread)
    db.commit()
    return {"id": thread.id}


@router.get("/threads/{thread_id}")
def get_thread(thread_id: int, db: Session = Depends(get_db), cur: Current | None = Depends(current)) -> dict[str, Any]:
    viewer = cur.user if cur else None
    thread = _thread(db, thread_id, viewer)
    cat = _category(db, thread.category_slug)
    posts = db.scalars(select(Post).where(Post.thread_id == thread.id).options(selectinload(Post.author), selectinload(Post.validator)).order_by(Post.id)).all()
    can_post = viewer is not None and viewer.email_verified and (not thread.locked or _can_moderate(viewer))
    return {
        "thread": {
            "id": thread.id,
            "title": thread.title,
            "author": author(thread.author),
            "created_at": iso(thread.created_at),
            "locked": thread.locked,
            "pinned": thread.pinned,
            "hidden": thread.hidden,
            "category": {"slug": cat.slug, "parent": cat.parent_slug, "title": cat.title, "kind": cat.kind},
        },
        "posts": [post_json(p, viewer) for p in posts if _visible(p, viewer)],
        "can_post": can_post,
        # Q&A: what a reply from this viewer becomes.
        "reply_mode": ("answer" if viewer and viewer.can_answer else "proposal") if cat.kind == "qa" else "message",
    }


@router.post("/threads/{thread_id}/posts", status_code=201)
def reply(thread_id: int, body: PostIn, cur: Current = Depends(require_verified), db: Session = Depends(get_db)) -> dict[str, Any]:
    thread = _thread(db, thread_id, cur.user)
    if thread.locked and not _can_moderate(cur.user):
        raise _bad(403, "Ce sujet est verrouillé.")
    if not antibot.post_limiter.allow(f"user:{cur.user.id}"):
        raise _bad(429, "Beaucoup de messages en peu de temps : patientez un peu.")
    cat = _category(db, thread.category_slug)
    if cat.kind == "qa":
        kind, status = ("answer", "published") if cur.user.can_answer else ("proposal", "pending")
    else:
        kind, status = "message", "published"
    post = Post(thread_id=thread.id, author_id=cur.user.id, kind=kind, status=status, body=_clean_body(body.body))
    db.add(post)
    if status == "published":
        thread.last_activity_at = utcnow()
    db.commit()
    return {"id": post.id, "status": status}


def _own_post(db: Session, post_id: int, cur: Current) -> Post:
    post = db.get(Post, post_id)
    if post is None or (post.author_id != cur.user.id and not _can_moderate(cur.user)):
        raise _bad(404, "Message introuvable.")
    return post


@router.patch("/posts/{post_id}")
def edit_post(post_id: int, body: PostIn, cur: Current = Depends(require_verified), db: Session = Depends(get_db)) -> dict[str, str]:
    post = _own_post(db, post_id, cur)
    if post.author_id != cur.user.id or post.status not in ("published", "pending"):
        raise _bad(403, "Ce message ne peut plus être modifié.")
    post.body, post.edited_at = _clean_body(body.body), utcnow()
    db.commit()
    return {"status": "ok"}


@router.post("/posts/{post_id}/delete")
def delete_post(post_id: int, cur: Current = Depends(require_verified), db: Session = Depends(get_db)) -> dict[str, str]:
    post = _own_post(db, post_id, cur)
    if _can_moderate(cur.user) and post.author_id != cur.user.id:
        audit(db, cur.user, "post_deleted", f"post {post.id}", post.body[:200])
    post.status, post.body, post.edited_at = "deleted", "", utcnow()
    db.commit()
    return {"status": "ok"}


@router.post("/posts/{post_id}/validate")
def validate_proposal(post_id: int, cur: Current = Depends(require_scientist), db: Session = Depends(get_db)) -> dict[str, str]:
    post = db.get(Post, post_id)
    if post is None or post.kind != "proposal" or post.status != "pending":
        raise _bad(404, "Proposition introuvable ou déjà traitée.")
    if post.author_id == cur.user.id:
        raise _bad(403, "Vous ne pouvez pas valider votre propre proposition.")
    post.kind, post.status, post.validated_by, post.validated_at = "answer", "published", cur.user.id, utcnow()
    post.thread.last_activity_at = utcnow()
    audit(db, cur.user, "proposal_validated", f"post {post.id}")
    db.commit()
    return {"status": "ok"}


@router.post("/posts/{post_id}/reject")
def reject_proposal(post_id: int, body: NoteIn, cur: Current = Depends(require_scientist), db: Session = Depends(get_db)) -> dict[str, str]:
    post = db.get(Post, post_id)
    if post is None or post.kind != "proposal" or post.status != "pending":
        raise _bad(404, "Proposition introuvable ou déjà traitée.")
    post.status = "rejected"
    audit(db, cur.user, "proposal_rejected", f"post {post.id}", clean_line(body.note, 500))
    db.commit()
    return {"status": "ok"}


@router.post("/posts/{post_id}/report", status_code=201)
def report_post(post_id: int, body: ReportIn, cur: Current = Depends(require_verified), db: Session = Depends(get_db)) -> dict[str, str]:
    post = db.get(Post, post_id)
    if post is None or post.status != "published":
        raise _bad(404, "Message introuvable.")
    if not antibot.report_limiter.allow(f"user:{cur.user.id}"):
        raise _bad(429, "Trop de signalements : patientez un peu.")
    reason = clean_line(body.reason, 500)
    if len(reason) < 5:
        raise _bad(422, "Dites en quelques mots ce qui pose problème.")
    db.add(Report(post_id=post.id, reporter_id=cur.user.id, reason=reason))
    db.commit()
    return {"status": "ok"}


@router.get("/search")
def search(q: str = "", db: Session = Depends(get_db)) -> list[dict[str, Any]]:
    term = clean_line(q, 80)
    if len(term) < 3:
        return []
    like = "%" + term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_") + "%"
    rows = db.execute(
        select(Thread, Category.title)
        .join(Category, Category.slug == Thread.category_slug)
        .where(Thread.hidden.is_(False), or_(Thread.title.ilike(like, escape="\\"), Thread.posts.any(Post.body.ilike(like, escape="\\") & (Post.status == "published"))))
        .order_by(Thread.last_activity_at.desc())
        .limit(30)
    ).all()
    return [{"id": t.id, "title": t.title, "category": title, "last_activity_at": iso(t.last_activity_at)} for t, title in rows]
