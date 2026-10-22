"""Vérifie la position des espèces de src/data/species.ts par rapport au contour de la France.

Usage (depuis la racine du dépôt) :
    python scripts/check_species_points.py

Pour chaque espèce : en mer ou sur terre (d'après public/geo/france-metropole.geojson, le contour
affiché sur la carte), distance à la côte la plus proche, et paires de points trop proches pour
rester lisibles. Code de sortie 1 si un point tombe sur terre, sauf identifiants listés dans
LAGOONS (lagunes côtières, incluses dans le territoire IGN mais bien en eau).
Bibliothèque standard uniquement.
"""

from __future__ import annotations

import json
import math
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SPECIES_FILE = ROOT / "src" / "data" / "species.ts"
OUTLINE_FILE = ROOT / "public" / "geo" / "france-metropole.geojson"

LAGOONS = {"moules-thau"}  # étang de Thau
FAR_KM = 40  # au-delà : "au large" (autorisé, simplement signalé)
TOO_CLOSE_KM = 12  # en dessous : épingles qui se chevauchent au zoom régional


def load_species() -> list[tuple[str, float, float]]:
    src = SPECIES_FILE.read_text(encoding="utf-8")
    ids = re.findall(r"^\s{4}id: '([^']+)'", src, flags=re.M)
    coords = re.findall(r"coords: \[([\d.\-]+), ([\d.\-]+)\]", src)
    if len(ids) != len(coords):
        sys.exit(f"Lecture impossible : {len(ids)} identifiants pour {len(coords)} coordonnées.")
    return [(i, float(lat), float(lon)) for i, (lat, lon) in zip(ids, coords)]


def load_polygons() -> list:
    geo = json.loads(OUTLINE_FILE.read_text(encoding="utf-8"))
    geom = geo["features"][0]["geometry"]
    return geom["coordinates"] if geom["type"] == "MultiPolygon" else [geom["coordinates"]]


def in_ring(x: float, y: float, ring: list) -> bool:
    inside = False
    for i in range(len(ring)):
        x1, y1 = ring[i]
        x2, y2 = ring[i - 1]
        if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1:
            inside = not inside
    return inside


def on_land(lon: float, lat: float, polygons: list) -> bool:
    return any(in_ring(lon, lat, poly[0]) and not any(in_ring(lon, lat, hole) for hole in poly[1:]) for poly in polygons)


def km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = p2 - p1, math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371 * 2 * math.asin(math.sqrt(a))


def main() -> int:
    species = load_species()
    polygons = load_polygons()
    coast = [pt for poly in polygons for ring in poly for pt in ring]
    errors = 0
    for sid, lat, lon in species:
        dist = min(km(lat, lon, y, x) for x, y in coast)
        if on_land(lon, lat, polygons):
            status = "lagune (ok)" if sid in LAGOONS else "SUR TERRE"
            errors += sid not in LAGOONS
        else:
            status = "au large" if dist > FAR_KM else "en mer"
        print(f"{sid:24s} {lat:7.3f} {lon:8.3f}  côte à {dist:5.1f} km  {status}")
    for i, (a, lat_a, lon_a) in enumerate(species):
        for b, lat_b, lon_b in species[i + 1 :]:
            d = km(lat_a, lon_a, lat_b, lon_b)
            if d < TOO_CLOSE_KM:
                print(f"  ⚠ points proches : {a} ↔ {b} ({d:.1f} km)")
    print(f"\n{len(species)} espèces, {errors} sur terre.")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
