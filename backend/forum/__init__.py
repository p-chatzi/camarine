"""Camarine forum: accounts (password, Google / Microsoft SSO, MFA), Q&A with validated scientists,
species / Pelagos / good-practice / suggestion forums, moderation. See FORUM.md."""

from __future__ import annotations

from fastapi import APIRouter

from . import routes_account, routes_admin, routes_auth, routes_forum
from .categories import seed_categories
from .db import init_db, new_session
from .maintenance import start_background_purge

router = APIRouter(prefix="/api/forum", tags=["forum"])
router.include_router(routes_auth.router)
router.include_router(routes_account.router)
router.include_router(routes_admin.router)
router.include_router(routes_forum.router)


def startup(background: bool = True) -> None:
    init_db()
    with new_session() as db:
        seed_categories(db)
    if background:
        start_background_purge()
