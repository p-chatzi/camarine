"""Forum structure, created / updated at startup.

    Questions & réponses        (qa: everyone asks, validated scientists answer, others propose)
    Zoom sur les espèces
      Faune → one sub-forum per species of src/data/species.ts
      Flore → idem
    Zone Pelagos
    Bons gestes
    Suggestions

The species list is read from src/data/species.ts (single source of truth with the map): adding a
species there adds its sub-forum at the next backend start.
"""

from __future__ import annotations

import re
from pathlib import Path

from sqlalchemy.orm import Session

from .db import Category

SPECIES_FILE = Path(__file__).resolve().parents[2] / "src" / "data" / "species.ts"

TOP_LEVEL = [
    ("questions", None, "Questions & réponses", "Posez vos questions sur les canicules marines : les scientifiques validés y répondent, et chacun peut proposer une réponse qu’un scientifique validera.", "qa"),
    ("especes", None, "Zoom sur les espèces", "Une discussion par espèce suivie par Camarine.", "group"),
    ("especes-faune", "especes", "Faune", "Animaux", "group"),
    ("especes-flore", "especes", "Flore", "Végétaux et micro-algues", "group"),
    ("pelagos", None, "Zone Pelagos", "Le sanctuaire pour les mammifères marins de Méditerranée : observations, questions, actualités.", "discussion"),
    ("bons-gestes", None, "Bons gestes", "Comment respecter la mer et ses espèces : mouillage, plongée, pêche, plage…", "discussion"),
    ("suggestions", None, "Suggestions", "Vos idées pour Camarine et pour ce forum.", "discussion"),
]

_BLOCK = re.compile(r"^\s{2}\{\s*$(.*?)^\s{2}\},?\s*$", re.M | re.S)
_FIELD = {k: re.compile(rf"^\s{{4}}{k}: '((?:[^'\\]|\\.)*)'", re.M) for k in ("id", "name", "scientificName", "kingdom")}


def read_species(path: Path = SPECIES_FILE) -> list[dict[str, str]]:
    """[{id, name, scientificName, kingdom}] in file order."""
    out = []
    for block in _BLOCK.findall(path.read_text(encoding="utf-8")):
        fields = {k: (m.group(1).replace("\\'", "'") if (m := rx.search(block)) else "") for k, rx in _FIELD.items()}
        if fields["id"] and fields["kingdom"] in ("faune", "flore"):
            out.append(fields)
    return out


def seed_categories(db: Session) -> int:
    wanted: list[Category] = [
        Category(slug=slug, parent_slug=parent, title=title, description=desc, kind=kind, position=i)
        for i, (slug, parent, title, desc, kind) in enumerate(TOP_LEVEL)
    ]
    for i, sp in enumerate(read_species()):
        wanted.append(
            Category(
                slug=f"espece-{sp['id']}",
                parent_slug=f"especes-{sp['kingdom']}",
                title=sp["name"],
                description=sp["scientificName"],
                kind="discussion",
                species_id=sp["id"],
                position=100 + i,
            )
        )
    for cat in wanted:
        existing = db.get(Category, cat.slug)
        if existing is None:
            db.add(cat)
        else:
            existing.parent_slug, existing.title, existing.description, existing.kind, existing.species_id, existing.position = (
                cat.parent_slug,
                cat.title,
                cat.description,
                cat.kind,
                cat.species_id,
                cat.position,
            )
    db.commit()
    return len(wanted)
