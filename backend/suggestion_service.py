"""Species suggestions sent from the expert catalogue ("Une espèce manque ?").

Each accepted suggestion is appended as one JSON line to SUGGESTIONS_FILE, for the team to review.
No personal data is stored: no IP address, no e-mail, only the text the visitor typed + a UTC timestamp.
Pure functions (no FastAPI import) so they can be unit-tested without the web stack.
"""

from __future__ import annotations

import json
import os
import threading
import time
import unicodedata
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

SUGGESTIONS_FILE = Path(os.environ.get("CAMARINE_SUGGESTIONS_FILE", "suggestions_data/suggestions.jsonl"))

NAME_MAX = 120
MESSAGE_MAX = 2000

# Simple anti-flood: at most RATE_LIMIT suggestions per client per RATE_WINDOW_S seconds (in memory).
RATE_LIMIT = 5
RATE_WINDOW_S = 600

_write_lock = threading.Lock()
_rate_lock = threading.Lock()
_recent: dict[str, deque[float]] = {}


class SuggestionError(ValueError):
    """Invalid suggestion (message is safe to show to the visitor)."""


def clean_text(value: str, max_len: int) -> str:
    """Strip control characters (except newlines/tabs) and surrounding spaces, cap the length."""
    kept = "".join(ch for ch in value if ch in "\n\t" or unicodedata.category(ch)[0] != "C")
    return kept.strip()[:max_len]


def build_record(species_name: str, message: str, now: datetime | None = None) -> dict[str, str]:
    name = clean_text(species_name, NAME_MAX)
    if len(name) < 2:
        raise SuggestionError("Le nom de l'espèce est obligatoire (2 caractères minimum).")
    return {
        "received_at": (now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        "species_name": name,
        "message": clean_text(message, MESSAGE_MAX),
        "status": "à relire",
    }


def append_record(record: dict[str, str], path: Path | None = None) -> None:
    target = path or SUGGESTIONS_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    line = json.dumps(record, ensure_ascii=False)
    with _write_lock, target.open("a", encoding="utf-8") as f:
        f.write(line + "\n")


def allow_request(client_key: str, now: float | None = None) -> bool:
    """Sliding-window rate limit per client key. The key is only kept in memory, never written."""
    t = time.monotonic() if now is None else now
    with _rate_lock:
        window = _recent.setdefault(client_key, deque())
        while window and t - window[0] > RATE_WINDOW_S:
            window.popleft()
        if len(window) >= RATE_LIMIT:
            return False
        window.append(t)
        return True
