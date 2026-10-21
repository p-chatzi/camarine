// All HTTP calls to the FastAPI backend (backend/main.py) live here.
// In dev, Vite proxies /api to http://127.0.0.1:8000 (see vite.config.mts).
import { DATA_BOUNDS, PIPELINE_LOCATION } from '../config';
import type { MapCell, Pipeline } from '../types';

/** Daily SST + climatology + P90 threshold + detected heatwaves for one location. */
export async function fetchPipeline(start: string, end: string): Promise<Pipeline> {
  const { lat, lon, radius } = PIPELINE_LOCATION;
  const response = await fetch(`/api/mhw?lat=${lat}&lon=${lon}&radius=${radius}&start=${start}&end=${end}`);
  if (!response.ok) throw new Error('Live pipeline unavailable');
  return response.json();
}

/** Satellite SST pixels over France for one day. */
export async function fetchMapCells(day: string, signal?: AbortSignal): Promise<{ date: string; cells: MapCell[] }> {
  const b = DATA_BOUNDS;
  const response = await fetch(
    `/api/map?min_lon=${b.minLon}&max_lon=${b.maxLon}&min_lat=${b.minLat}&max_lat=${b.maxLat}&day=${day}`,
    { signal },
  );
  if (!response.ok) throw new Error('Live map unavailable');
  const payload = await response.json();
  return { date: payload.source.date, cells: payload.cells };
}
