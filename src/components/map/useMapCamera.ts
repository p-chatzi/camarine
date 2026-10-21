// Moves the camera when a basin is focused or a species is selected.
import type L from 'leaflet';
import { useEffect, useRef } from 'react';
import { BASIN_VIEWS } from '../../config';
import { goHome } from './useLeafletMap';
import type { Basin, SpeciesItem } from '../../types';

export function useMapCamera(map: L.Map | undefined, focusedBasin: Basin | null, selectedSpecies: SpeciesItem | null) {
  // Keep the initial locked France view of a freshly created map; only move on later changes.
  const initialisedMap = useRef<L.Map | undefined>(undefined);

  useEffect(() => {
    if (!map) return;
    if (initialisedMap.current !== map) {
      initialisedMap.current = map;
      return;
    }
    if (focusedBasin) {
      const view = BASIN_VIEWS[focusedBasin];
      map.flyTo(view.center, view.zoom, { duration: 1.25 });
    } else {
      goHome(map, true);
    }
  }, [map, focusedBasin]);

  useEffect(() => {
    if (!map || !selectedSpecies) return;
    map.flyTo(selectedSpecies.coords, Math.max(map.getZoom(), 7.5), { duration: 0.9 });
  }, [map, selectedSpecies?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
