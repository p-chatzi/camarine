"""Tiny JSON-on-disk cache so repeated requests don't hit Copernicus again."""

from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

CACHE_DIR = Path(os.environ.get("CAMARINE_CACHE_DIR", "cache_data"))
CACHE_DIR.mkdir(parents=True, exist_ok=True)


def _path(key: str) -> Path:
    return CACHE_DIR / f"{key}.json"


def load(key: str) -> dict[str, Any] | None:
    path = _path(key)
    if not path.exists():
        return None
    with path.open("r") as f:
        return json.load(f)


def save(key: str, payload: dict[str, Any]) -> None:
    with _path(key).open("w") as f:
        json.dump(payload, f)
