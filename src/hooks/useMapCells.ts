// Fetches the satellite SST pixels for the selected day.
// - short debounce, stale requests cancelled;
// - the last MAP_CELLS_CACHE_DAYS days are kept in memory: going back to a day is instant;
// - while a new day loads, the previous pixels stay on screen (no blank map).
import { useEffect, useState } from 'react';
import { fetchMapCells } from '../api/copernicus';
import { MAP_CELLS_CACHE_DAYS, MAP_FETCH_DEBOUNCE_MS } from '../config';
import type { MapCell } from '../types';

/** Day → pixels, least recently used first (Map keeps insertion order). Module-level: survives tab switches. */
const cache = new Map<string, MapCell[]>();

function remember(day: string, cells: MapCell[]) {
  cache.delete(day);
  cache.set(day, cells);
  while (cache.size > MAP_CELLS_CACHE_DAYS) cache.delete(cache.keys().next().value!);
}

export function useMapCells(day: string) {
  const [cells, setCells] = useState<MapCell[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!day) return;
    const cached = cache.get(day);
    if (cached) {
      remember(day, cached); // mark as recently used
      setCells(cached);
      setIsLoading(false);
      return;
    }
    const controller = new AbortController();
    setIsLoading(true); // previous pixels stay displayed meanwhile

    const timer = window.setTimeout(() => {
      fetchMapCells(day, controller.signal)
        .then((payload) => {
          if (payload.date !== day) return; // stale response
          if (payload.cells.length > 0) remember(day, payload.cells); // never cache an empty (failed) map
          setCells(payload.cells);
        })
        .catch((error: Error) => {
          if (error.name !== 'AbortError') setCells([]);
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
    }, MAP_FETCH_DEBOUNCE_MS);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [day]);

  return { cells, isLoading };
}
