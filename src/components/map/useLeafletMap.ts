// Creates the Leaflet map once, with its base tiles and the two layer groups we draw into.
import L from 'leaflet';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { BASE_TILE_ATTRIBUTION, BASE_TILE_URL, DATA_BOUNDS, FRANCE_BOUNDS } from '../../config';

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

/**
 * Furthest zoom-out = the home view (all of France + Corsica fits, with a small padding): France
 * stays the subject and users can't zoom out further. On wide screens the home view already
 * shows part of Spain and Italy on the sides; everything visible stays inside DATA_BOUNDS
 * (sea with temperature), except on very narrow portrait screens where France has priority.
 */
function minZoomFor(map: L.Map): number {
  return map.getBoundsZoom(FRANCE_LATLNG_BOUNDS, false, HOME_PADDING);
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
 * Locks the map: zoom-out stops at the France view (minZoomFor) and panning stays inside the
 * data box, so every bit of sea on screen has a temperature.
 * Re-applied when the container size changes (first layout, window resize, devtools…).
 */
function lockToData(map: L.Map, container: HTMLElement): () => void {
  // Until the user pans/zooms, a resize re-centres on France; after that we leave their view alone.
  let userMoved = false;
  const markMoved = () => (userMoved = true);
  const userEvents = ['mousedown', 'wheel', 'touchstart', 'keydown'] as const;
  userEvents.forEach((ev) => container.addEventListener(ev, markMoved, { passive: true }));

  const apply = () => {
    map.invalidateSize({ animate: false });
    const minZoom = minZoomFor(map);
    // No animation anywhere here: an animated zoom/pan interrupted by a non-animated jump leaves the
    // base tiles frozen at the wrong scale (20-50 px off the coastline until the user zooms).
    // Hence map.options.minZoom instead of map.setMinZoom() (which may start an animated zoom).
    map.options.minZoom = minZoom;
    if (!userMoved) goHome(map, false);
    else if (map.getZoom() < minZoom) map.setZoom(minZoom, { animate: false });
    map.fire('zoomlevelschange');
  };
  apply();
  // maxBounds AFTER the first framing: set on the provisional zoom-6 view (wider than the data box on
  // 1920 px screens), Leaflet would start an animated "pan inside bounds" that the framing interrupts.
  map.setMaxBounds(DATA_LATLNG_BOUNDS);
  const observer = new ResizeObserver(apply);
  observer.observe(container);

  return () => {
    observer.disconnect();
    userEvents.forEach((ev) => container.removeEventListener(ev, markMoved));
  };
}

export function useLeafletMap(
  containerRef: RefObject<HTMLDivElement | null>,
  onMapClick: () => void,
): LeafletHandles | null {
  const [handles, setHandles] = useState<LeafletHandles | null>(null);
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
    const unlock = lockToData(map, containerRef.current);
    L.tileLayer(BASE_TILE_URL, { maxZoom: 13, attribution: BASE_TILE_ATTRIBUTION }).addTo(map);
    if (import.meta.env.DEV) (window as unknown as { __camarineMap: L.Map }).__camarineMap = map; // for tests
    map.on('click', () => onClickRef.current());

    setHandles({ map, thermalLayer: L.layerGroup().addTo(map), markersLayer: L.layerGroup().addTo(map) });
    return () => {
      unlock();
      map.remove();
      setHandles(null);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return handles;
}

