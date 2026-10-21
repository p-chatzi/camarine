// Fetches the satellite SST pixels for the selected day (debounced, cancels stale requests).
import { useEffect, useState } from 'react';
import { fetchMapCells } from '../api/copernicus';
import { MAP_FETCH_DEBOUNCE_MS } from '../config';
import type { MapCell } from '../types';

export function useMapCells(day: string) {
  const [cells, setCells] = useState<MapCell[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!day) return;
    const controller = new AbortController();
    setCells([]);
    setIsLoading(true);

    const timer = window.setTimeout(() => {
      fetchMapCells(day, controller.signal)
        .then((payload) => {
          if (payload.date !== day) return; // stale response
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
