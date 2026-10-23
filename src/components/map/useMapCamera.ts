// Moves the camera when a basin is focused or a species is selected.
import type L from 'leaflet';
import { useEffect, useRef } from 'react';
import { BASIN_VIEWS, MARINE_ZONES, SPECIES_CARD, SPECIES_FOCUS_ZOOM, TOP_CONTROLS_PX } from '../../config';
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
      // Keep the zone clear of the header / tools (top), the date chips (bottom) and, on wide
      // screens, the Pelagos info card (left, ~22rem). Phones: the card is folded under the tools.
      const wide = map.getSize().x >= 900;
      map.flyToBounds(MARINE_ZONES.Pelagos.bounds, {
        paddingTopLeft: wide ? [390, TOP_CONTROLS_PX] : [16, TOP_CONTROLS_PX + 64],
        paddingBottomRight: [24, 88],
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
    // Centre the species in the part of the map left visible: below the floating header and, from
    // 1024 px, left of the card. (Below 1024 px the card is full screen: the species is centred for
    // when it closes.)
    const cardPx =
      window.innerWidth >= SPECIES_CARD.fullScreenBelowPx
        ? Math.min(SPECIES_CARD.maxWidthPx, SPECIES_CARD.widthVw * window.innerWidth) + SPECIES_CARD.marginPx
        : 0;
    const offset: [number, number] = [cardPx / 2, -TOP_CONTROLS_PX / 2];
    const target = map.unproject(map.project(selectedSpecies.coords, zoom).add(offset), zoom);
    map.flyTo(target, zoom, { duration: 0.9 });
  }, [map, selectedSpecies?.id]); // eslint-disable-line react-hooks/exhaustive-deps
}
