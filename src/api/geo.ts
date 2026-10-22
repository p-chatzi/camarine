// Static geographic files served from public/geo/ (no backend needed).
import type { GeoJsonObject } from 'geojson';
import { FRANCE_OUTLINE_URL } from '../config';

/** Contour de la France métropolitaine, Corse comprise. */
export async function fetchFranceOutline(signal?: AbortSignal): Promise<GeoJsonObject> {
  const response = await fetch(FRANCE_OUTLINE_URL, { signal });
  if (!response.ok) throw new Error('France outline unavailable');
  return response.json();
}

/** Geometry of a protected marine zone (e.g. Pelagos), sea only. */
export async function fetchZoneGeometry(url: string, signal?: AbortSignal): Promise<GeoJsonObject> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error('Zone geometry unavailable');
  return response.json();
}
