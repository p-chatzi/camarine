"""Construit public/geo/pelagos.geojson : zone marine du Sanctuaire Pelagos (mer uniquement).

Limites = article 3 de l'Accord relatif à la création en Méditerranée d'un sanctuaire pour les
mammifères marins (Rome, 25/11/1999) :
- ouest : de la pointe Escampobariou (presqu'île de Giens) à Capo Falcone (Sardaigne) ;
- est   : de Capo Ferro (Sardaigne) à Fosso Chiarone (Toscane) ;
- entre ces lignes : les côtes françaises, monégasques, italiennes et le nord de la Sardaigne
  (Corse et îles toscanes incluses).
La coordonnée d'Escampobariou est publiée « 43°01'70"N, 06°05'90"E » (secondes > 59) : elle est lue
comme des minutes décimales (43°01,70' ; 6°05,90'), ce qui correspond bien à la pointe ouest de Giens.

Les terres sont retirées avec le trait de côte Natural Earth 10 m (domaine public).
Usage :  python scripts/build_pelagos.py <ne_10m_land.geojson>   (nécessite shapely)
"""

import json
import sys
from pathlib import Path

from shapely.geometry import Polygon, mapping, shape
from shapely.ops import unary_union

OUT = Path(__file__).resolve().parent.parent / "public" / "geo" / "pelagos.geojson"

ESCAMPOBARIOU = (6 + 5.90 / 60, 43 + 1.70 / 60)
CAPO_FALCONE = (8 + 12 / 60, 40 + 58 / 60)
CAPO_FERRO = (9 + 31 / 60 + 18 / 3600, 41 + 9 / 60 + 18 / 3600)
FOSSO_CHIARONE = (11 + 31 / 60, 42 + 21 / 60 + 24 / 3600)

# Polygone englobant : les deux lignes de l'accord + des points À TERRE qui referment la zone
# (intérieur de la Provence/Ligurie/Toscane au nord, intérieur de la Sardaigne au sud).
# Seule la mer est conservée ensuite, donc la position exacte de ces points terrestres importe peu,
# tant qu'ils restent à terre.
ENVELOPE = Polygon([
    ESCAMPOBARIOU,
    (6.0983, 44.70),        # nord, à terre (Provence intérieure)
    (11.5167, 44.70),       # nord-est, à terre (Apennins)
    FOSSO_CHIARONE,         # ligne est ↓
    CAPO_FERRO,
    (9.38, 40.95),          # sud, à terre (Gallura) : évite le golfe d'Olbia, hors sanctuaire
    (8.60, 40.70),          # sud, à terre (Logudoro)
    (8.20, 40.70),          # sud, à terre
    CAPO_FALCONE,           # ligne ouest ↑
])


def _west_coast_sliver(part) -> bool:
    x, y = part.representative_point().coords[0]
    return y < CAPO_FALCONE[1] and x < CAPO_FALCONE[0] + 0.15


def main(land_path: str) -> None:
    land = json.loads(Path(land_path).read_text(encoding="utf-8"))
    near = ENVELOPE.buffer(0.5)
    land_geoms = [shape(f["geometry"]) for f in land["features"]]
    land_union = unary_union([g for g in land_geoms if g.intersects(near)])
    sea = ENVELOPE.difference(land_union)
    # The envelope closes on land south of Capo Falcone, but leaves a sliver of the Sardinian WEST
    # coast (south of Capo Falcone, outside the sanctuary): keep only parts on the sanctuary side of
    # the western line, i.e. east of it or north of Capo Falcone.
    parts = list(sea.geoms) if hasattr(sea, "geoms") else [sea]
    sea = unary_union([p for p in parts if not _west_coast_sliver(p)])
    sea = sea.simplify(0.005, preserve_topology=True)
    feature = {
        "type": "Feature",
        "properties": {
            "nom": "Sanctuaire Pelagos",
            "source": "Accord de Rome du 25/11/1999 (art. 3) ; côtes Natural Earth 10 m",
            "construit_par": "scripts/build_pelagos.py",
        },
        "geometry": json.loads(json.dumps(mapping(sea), default=float)),
    }

    def rnd(obj):
        if isinstance(obj, float):
            return round(obj, 4)
        if isinstance(obj, (list, tuple)):
            return [rnd(x) for x in obj]
        if isinstance(obj, dict):
            return {k: rnd(v) for k, v in obj.items()}
        return obj

    OUT.write_text(json.dumps(rnd({"type": "FeatureCollection", "features": [feature]}), separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    # Surface approximative (projection équivalente locale) pour contrôle : l'accord annonce ~87 500 km².
    import math
    import numpy as np
    import shapely
    scale = np.array([111.32 * math.cos(math.radians(42.5)), 110.57])
    km2 = shapely.transform(sea, lambda coords: coords * scale).area
    print(f"{OUT.name}: {OUT.stat().st_size / 1024:.0f} Ko, {len(sea.geoms) if hasattr(sea, 'geoms') else 1} polygone(s), ~{km2:,.0f} km²")


if __name__ == "__main__":
    main(sys.argv[1])
