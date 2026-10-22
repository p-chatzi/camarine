// Moves the camera when a basin is focused or a species is selected.
import type L from 'leaflet';
import { useEffect, useRef } from 'react';
import { BASIN_VIEWS, MARINE_ZONES, SPECIES_FOCUS_ZOOM, SPECIES_SHEET_RATIO } from '../../config';
import { goHome } from './useLeafletMap';
import type { MapFocus, SpeciesItem } from '../../types';

export function useMapCamera(map: L.Map | undefined, focusedBasin: MapFocus, selectedSpecies: SpeciesItem | null) {
  // Keep the initial locked France view of a freshly created map; only move on later changes.
  const initialisedMap = useRef<L.Map | undefined>(undefined);

  useEffect(() => {
    if (!map) return;
    if (initialisedMap.current !== map) {
      initialisedMap.current = map;
      return;
    }
    if (focusedBasin === 'Pelagos') {
      // Keep the Pelagos info card (top-left, ~22rem) out of the way on wide screens.
      const wide = map.getSize().x >= 900;
      map.flyToBounds(MARINE_ZONES.Pelagos.bounds, {
        paddingTopLeft: wide ? [390, 24] : [16, 16],
        paddingBottomRight: [24, 24],
        duration: 1.25,
      });
    } else if (focusedBasin) {
      const view = BASIN_VIEWS[focusedBasin];
      map.flyTo(view.center, view.zoom, { duration: 1.25 });
    } else {
      goHome(map, true);
    }
  }, [map, focusedBasin]);

  useEffect(() => {
    if (!map || !selectedSpecies) return;
    // Regional view (zoom 7.5 at least), as before.
    const zoom = Math.max(map.getZoom(), SPECIES_FOCUS_ZOOM);
    // Centre the species in the part of the map NOT covered by its card:
    // ≥ 640 px the card covers the right 420 px (+ margins); phones: a bottom sheet over 60 % of the
    // height, and the "Façades" button row (~64 px) at the top — centre between the two.
    const size = map.getSize();
    const TOP_CONTROLS_PX = 64;
    const offset: [number, number] =
      size.x >= 640 ? [(420 + 32) / 2, 0] : [0, (size.y * SPECIES_SHEET_RATIO) / 2 - TOP_CONTROLS_PX / 2];
    const target = map.unproject(map.project(selectedSpecies.coords, zoom).add(offset), zoom);
    map.flyTo(target, zoom, { duration: 0.9 });
  }, [map, selectedSpecies?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
