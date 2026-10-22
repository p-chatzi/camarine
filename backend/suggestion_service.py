"""Species suggestions sent from the expert catalogue ("Une espèce manque ?").

Each accepted suggestion is appended as one JSON line to SUGGESTIONS_FILE, for the team to review.
No personal data is stored: no IP address, no e-mail, only the text the visitor typed + a UTC timestamp.
Pure functions (no FastAPI import) so they can be unit-tested without the web stack.

Threat model (public form, untrusted input):
- oversized payloads / disk filling   → body size cap (main.py), field length caps, file size cap
- flooding                            → per-client sliding-window rate limit, bounded memory
- invisible / control characters      → removed (bidi overrides, zero-width, NUL, escape codes…)
- spreadsheet formula injection       → leading = + - @ neutralised (if the file is opened in a tableur)
- HTML / script injection             → never rendered as HTML (React escapes text; JSON-encoded on disk)
- log / line injection                → one json.dumps line per record (newlines are escaped as \\n)
"""

from __future__ import annotations

import json
import os
import re
import threading
import time
import unicodedata
from collections import OrderedDict, deque
from datetime import datetime, timezone
from pathlib import Path

SUGGESTIONS_FILE = Path(os.environ.get("CAMARINE_SUGGESTIONS_FILE", "suggestions_data/suggestions.jsonl"))

NAME_MAX = 120
MESSAGE_MAX = 2000
MAX_BODY_BYTES = 8 * 1024  # largest accepted HTTP body for POST /api/suggestions
MAX_FILE_BYTES = 5 * 1024 * 1024  # stop accepting once the review file reaches 5 MB
MAX_NEWLINES = 30

# Anti-flood: at most RATE_LIMIT suggestions per client per RATE_WINDOW_S seconds (in memory only).
RATE_LIMIT = 5
RATE_WINDOW_S = 600
MAX_TRACKED_CLIENTS = 10_000

_write_lock = threading.Lock()
_rate_lock = threading.Lock()
_recent: OrderedDict[str, deque[float]] = OrderedDict()

_FORMULA_PREFIXES = ("=", "+", "-", "@")
_MANY_BLANK_LINES = re.compile(r"\n{3,}")
_HAS_LETTER = re.compile(r"[^\W\d_]", re.UNICODE)


class SuggestionError(ValueError):
    """Invalid suggestion (message is safe to show to the visitor)."""


class StorageFullError(RuntimeError):
    """The review file reached MAX_FILE_BYTES."""


def clean_text(value: str, max_len: int, *, multiline: bool) -> str:
    """Normalise untrusted text to plain, visible Unicode.

    - NFC normalisation (one canonical form for accents);
    - every character of Unicode category C is removed (Cc control, Cf format such as bidi
      overrides and zero-width chars, Co private use, Cs surrogates, Cn unassigned), except "\\n"
      when `multiline`; tabs become spaces, CRLF/CR become LF;
    - spaces trimmed per line, at most 2 consecutive blank lines and MAX_NEWLINES lines;
    - a leading = + - @ is prefixed with an apostrophe (CSV/tableur formula injection);
    - length capped AFTER cleaning.
    """
    text = unicodedata.normalize("NFC", value).replace("\r\n", "\n").replace("\r", "\n").replace("\t", " ")
    if not multiline:
        text = text.replace("\n", " ")
    allowed_newline = "\n" if multiline else ""
    text = "".join(ch for ch in text if ch == allowed_newline or unicodedata.category(ch)[0] != "C")
    lines = [" ".join(line.split()) for line in text.split("\n")]
    text = "\n".join(lines[:MAX_NEWLINES]).strip()
    text = _MANY_BLANK_LINES.sub("\n\n", text)
    if text.startswith(_FORMULA_PREFIXES):
        text = "'" + text
    return text[:max_len]


def build_record(species_name: str, message: str, now: datetime | None = None) -> dict[str, str]:
    name = clean_text(species_name, NAME_MAX, multiline=False)
    if len(name) < 2 or not _HAS_LETTER.search(name):
        raise SuggestionError("Le nom de l'espèce est obligatoire (au moins 2 caractères, dont une lettre).")
    return {
        "received_at": (now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        "species_name": name,
        "message": clean_text(message, MESSAGE_MAX, multiline=True),
        "status": "à relire",
    }


def append_record(record: dict[str, str], path: Path | None = None) -> None:
    """Append one JSON line. Owner read/write only (0600): the file may hold free text from the public."""
    target = path or SUGGESTIONS_FILE
    target.parent.mkdir(parents=True, exist_ok=True)
    line = (json.dumps(record, ensure_ascii=False) + "\n").encode("utf-8")
    with _write_lock:
        if target.exists() and target.stat().st_size + len(line) > MAX_FILE_BYTES:
            raise StorageFullError("suggestions file is full")
        fd = os.open(target, os.O_WRONLY | os.O_APPEND | os.O_CREAT, 0o600)
        try:
            os.write(fd, line)
        finally:
            os.close(fd)


def allow_request(client_key: str, now: float | None = None) -> bool:
    """Sliding-window rate limit per client key. Keys live in memory only, never written to disk."""
    t = time.monotonic() if now is None else now
    with _rate_lock:
        window = _recent.pop(client_key, None) or deque()
        while window and t - window[0] > RATE_WINDOW_S:
            window.popleft()
        allowed = len(window) < RATE_LIMIT
        if allowed:
            window.append(t)
        _recent[client_key] = window  # most recently seen at the end
        while len(_recent) > MAX_TRACKED_CLIENTS:
            _recent.popitem(last=False)  # forget the least recently seen client
        return allowed
