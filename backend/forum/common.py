"""Shared serializers and request models of the forum API."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict

from .db import User

ROLE_LABELS = {"member": "Membre", "scientist": "Scientifique", "admin": "Admin"}


class Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


def iso(dt: datetime | None) -> str | None:
    return dt.isoformat(timespec="seconds") if dt else None


def author(user: User | None) -> dict[str, Any]:
    """Public view of a user: pseudo + role only (never the e-mail)."""
    if user is None:
        return {"id": None, "name": "Compte supprimé", "role": "deleted"}
    return {"id": user.id, "name": user.display_name, "role": user.role}
