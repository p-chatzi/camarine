// Geometry of the marine zone selected in the "Façades" filter (loaded once, then cached).
import type { GeoJsonObject } from 'geojson';
import { useEffect, useState } from 'react';
import { fetchZoneGeometry } from '../api/geo';
import { MARINE_ZONES } from '../config';
import type { BasinFilter, MarineZone } from '../types';

const loaded = new Map<MarineZone, GeoJsonObject>();

export function isMarineZone(filter: BasinFilter): filter is MarineZone {
  return filter in MARINE_ZONES;
}

/** Returns the zone geometry when `filter` is a marine zone (null while loading or otherwise). */
export function useMarineZone(filter: BasinFilter): GeoJsonObject | null {
  const zone = isMarineZone(filter) ? filter : null;
  const [geometry, setGeometry] = useState<GeoJsonObject | null>(zone ? loaded.get(zone) ?? null : null);

  useEffect(() => {
    if (!zone) {
      setGeometry(null);
      return;
    }
    const cached = loaded.get(zone);
    if (cached) {
      setGeometry(cached);
      return;
    }
    const controller = new AbortController();
    fetchZoneGeometry(MARINE_ZONES[zone].url, controller.signal)
      .then((geo) => {
        loaded.set(zone, geo);
        setGeometry(geo);
      })
      .catch((err) => {
        if (err?.name !== 'AbortError') console.warn(`[Camarine] zone ${zone} indisponible :`, err);
      });
    return () => controller.abort();
  }, [zone]);

  return zone ? geometry : null;
}
