// Creates the Leaflet map once, with its base tiles and the two layer groups we draw into.
import L from 'leaflet';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { DATA_BOUNDS, FRANCE_BOUNDS, TILE_URLS } from '../../config';
import type { TileStyle } from '../../types';

export interface LeafletHandles {
  map: L.Map;
  thermalLayer: L.LayerGroup; // satellite SST pixels
  markersLayer: L.LayerGroup; // species pins
}

/** France itself: the "home" view shows all of it. */
export const FRANCE_LATLNG_BOUNDS = L.latLngBounds(
  [FRANCE_BOUNDS.minLat, FRANCE_BOUNDS.minLon],
  [FRANCE_BOUNDS.maxLat, FRANCE_BOUNDS.maxLon],
);

/** Area with temperature data (same box as the /api/map request): users can't leave it. */
export const DATA_LATLNG_BOUNDS = L.latLngBounds(
  [DATA_BOUNDS.minLat, DATA_BOUNDS.minLon],
  [DATA_BOUNDS.maxLat, DATA_BOUNDS.maxLon],
);

/** Furthest zoom-out: the viewport must stay inside the data box (no water without temperature). */
function minZoomFor(map: L.Map): number {
  return map.getBoundsZoom(DATA_LATLNG_BOUNDS, true);
}

const HOME_PADDING = L.point(16, 16);

/**
 * "Home" view: all of France, centred in map (Mercator) space. Leaflet's maxBounds/minZoom
 * clamp it if the screen is so wide that France alone would show area without data.
 */
export function goHome(map: L.Map, animate: boolean) {
  if (animate) map.flyToBounds(FRANCE_LATLNG_BOUNDS, { padding: HOME_PADDING, duration: 1.2 });
  else map.fitBounds(FRANCE_LATLNG_BOUNDS, { padding: HOME_PADDING, animate: false });
}

/**
 * Locks the map to the data box: users can zoom out a little beyond the France view and pan
 * around, but can never see an area without computed temperatures.
 * Re-applied when the container size changes (first layout, window resize, devtools…).
 */
function lockToData(map: L.Map, container: HTMLElement): () => void {
  map.setMaxBounds(DATA_LATLNG_BOUNDS);

  // Until the user pans/zooms, a resize re-centres on France; after that we leave their view alone.
  let userMoved = false;
  const markMoved = () => (userMoved = true);
  const userEvents = ['mousedown', 'wheel', 'touchstart', 'keydown'] as const;
  userEvents.forEach((ev) => container.addEventListener(ev, markMoved, { passive: true }));

  const apply = () => {
    map.invalidateSize({ animate: false });
    map.setMinZoom(minZoomFor(map));
    if (!userMoved) goHome(map, false);
  };
  apply();
  const observer = new ResizeObserver(apply);
  observer.observe(container);

  return () => {
    observer.disconnect();
    userEvents.forEach((ev) => container.removeEventListener(ev, markMoved));
  };
}

export function useLeafletMap(
  containerRef: RefObject<HTMLDivElement | null>,
  tileStyle: TileStyle,
  onMapClick: () => void,
): LeafletHandles | null {
  const [handles, setHandles] = useState<LeafletHandles | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const onClickRef = useRef(onMapClick);
  onClickRef.current = onMapClick;

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current, {
      center: FRANCE_LATLNG_BOUNDS.getCenter(),
      zoom: 6,
      maxZoom: 13,
      zoomSnap: 0.25, // finer zoom steps so the home view fits France tightly
      maxBoundsViscosity: 1.0, // hard edge: can't drag outside the data box
      zoomControl: false,
      preferCanvas: true,
    });
    L.control.zoom({ position: 'bottomright' }).addTo(map);
    tileLayerRef.current = L.tileLayer(TILE_URLS[tileStyle], {
      maxZoom: 13,
      attribution: '&copy; OpenStreetMap France &copy; Esri World Ocean &copy; Copernicus C3S',
    }).addTo(map);
    const unlock = lockToData(map, containerRef.current);
    if (import.meta.env.DEV) (window as unknown as { __camarineMap: L.Map }).__camarineMap = map; // for tests
    map.on('click', () => onClickRef.current());

    setHandles({ map, thermalLayer: L.layerGroup().addTo(map), markersLayer: L.layerGroup().addTo(map) });
    return () => {
      unlock();
      map.remove();
      setHandles(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Swap base tiles without recreating the map.
  useEffect(() => {
    tileLayerRef.current?.setUrl(TILE_URLS[tileStyle]);
  }, [tileStyle]);

  return handles;
}

