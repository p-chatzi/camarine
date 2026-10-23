"""Error reports on species cards ("Signaler une erreur": wrong data, missing or wrong source).

Each accepted report is appended as one JSON line to REPORTS_FILE (same safety rules as the
suggestions: see suggestion_service.py), then the maintainer is notified (notify.py) if a channel
is configured. No personal data is asked for or stored: no IP address, no e-mail.
"""

from __future__ import annotations

import os
import re
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit

from .suggestion_service import RateLimiter, SuggestionError, clean_text

REPORTS_FILE = Path(os.environ.get("CAMARINE_REPORTS_FILE", "suggestions_data/reports.jsonl"))

KINDS: dict[str, str] = {
    "donnee-erronee": "Donnée erronée",
    "source-manquante": "Source manquante",
    "source-erronee": "Source erronée ou lien mort",
    "autre": "Autre",
}

SPECIES_ID = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")  # ids of src/data/species.ts
SPECIES_ID_MAX = 60
NAME_MAX = 120
MESSAGE_MIN = 10
MESSAGE_MAX = 2000
URL_MAX = 500

# Anti-flood: 5 reports per client per 10 minutes (memory only).
_limiter = RateLimiter(5, 600)


def allow_request(client_key: str, now: float | None = None) -> bool:
    return _limiter.allow(client_key, now)


def clean_url(value: str) -> str:
    """Optional source link: http(s) only, no credentials, no spaces; '' if absent."""
    url = clean_text(value, URL_MAX, multiline=False).lstrip("'")
    if not url:
        return ""
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname or parts.username or parts.password or " " in url:
        raise SuggestionError("Le lien de la source doit commencer par http:// ou https://.")
    return url


def build_report(species_id: str, species_name: str, kind: str, message: str, source_url: str = "", now: datetime | None = None) -> dict[str, str]:
    if len(species_id) > SPECIES_ID_MAX or not SPECIES_ID.fullmatch(species_id):
        raise SuggestionError("Espèce inconnue.")
    if kind not in KINDS:
        raise SuggestionError("Type de signalement inconnu.")
    text = clean_text(message, MESSAGE_MAX, multiline=True)
    if len(text) < MESSAGE_MIN:
        raise SuggestionError(f"Décrivez le problème en au moins {MESSAGE_MIN} caractères.")
    return {
        "received_at": (now or datetime.now(timezone.utc)).isoformat(timespec="seconds"),
        "species_id": species_id,
        "species_name": clean_text(species_name, NAME_MAX, multiline=False),
        "kind": kind,
        "message": text,
        "source_url": clean_url(source_url),
        "status": "à vérifier",
    }


def describe(report: dict[str, str]) -> tuple[str, str]:
    """(subject, plain-text body) of the notification. The subject only holds validated values."""
    subject = f"[Camarine] {KINDS[report['kind']]} : {report['species_id']}"
    lines = [
        "Nouveau signalement sur une fiche espèce de Camarine.",
        "",
        f"Espèce   : {report['species_name']} ({report['species_id']})",
        f"Type     : {KINDS[report['kind']]}",
        f"Reçu le  : {report['received_at']}",
    ]
    if report["source_url"]:
        lines.append(f"Source   : {report['source_url']}")
    lines += ["", "Message :", report["message"], "", f"Enregistré dans {REPORTS_FILE} (statut « {report['status']} »)."]
    return subject, "\n".join(lines)
