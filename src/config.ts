// App-wide constants. Change a value here instead of hunting for magic numbers.
import type { Basin, LatLon } from './types';

/** Point whose time series is requested from /api/mhw (Toulon). */
export const PIPELINE_LOCATION = { lat: 43, lon: 6, radius: 0.05 };

/** First date offered by the period picker. */
export const DEFAULT_START_DATE = '1982-01-01';

/** Hobday climatology baseline (WMO 30-year normal). */
export const BASELINE = { start: 1991, end: 2020 };

/** Metropolitan France incl. Corsica: the initial view always shows all of it. */
export const FRANCE_BOUNDS = { minLat: 41.3, maxLat: 51.1, minLon: -5.2, maxLon: 9.6 };

/**
 * Area fetched from /api/map and the pan/zoom limit of the map. Much wider than France so that
 * with all of France on screen (1280×800 → 1920×1080) every visible bit of sea has a temperature,
 * and users can still zoom out a little. Sized from Leaflet's zoom maths, not by eye:
 * on 1280×800 → 1920×1080, the France view sits ~0.25 zoom steps above the furthest zoom-out.
 * Making it wider gives more zoom-out room but every extra degree is ~6k more pixels to download.
 */
export const DATA_BOUNDS = { minLat: 36.5, maxLat: 55.5, minLon: -20.0, maxLon: 24.5 };

/**
 * Zone de déplacement (maxBounds) : la France reste le sujet. Le dézoom maximal est la vue
 * d'accueil (France + Corse en entier, voir minZoomFor dans useLeafletMap.ts) ; une fois zoomé,
 * on peut se déplacer jusqu'à ~1,5° autour de la France. Contenu dans DATA_BOUNDS.
 */
export const MAX_VIEW_BOUNDS = { minLat: 39.5, maxLat: 52.6, minLon: -9.0, maxLon: 13.5 };

/** Contour de la France métropolitaine + Corse (IGN Admin Express, simplifié). Servi depuis public/. */
export const FRANCE_OUTLINE_URL = '/geo/france-metropole.geojson';

/** Sous ce zoom, si beaucoup d'espèces sont affichées, les étiquettes ne s'affichent qu'au survol. */
export const DENSE_LABELS_MIN_ZOOM = 8.5;
export const DENSE_LABELS_SPECIES_COUNT = 12;

/** Size of one /api/map pixel in degrees. */
export const MAP_CELL_RESOLUTION = 0.05;

/** Debounce before fetching map pixels after the date changes (ms). */
export const MAP_FETCH_DEBOUNCE_MS = 800;

/** Fallback Hobday values when telemetry is missing. */
export const FALLBACK_CLIMATOLOGY = 20.0;
export const FALLBACK_THRESHOLD = 22.0;

/** Where the map flies when a basin is selected. */
export const BASIN_VIEWS: Record<Basin, { center: LatLon; zoom: number }> = {
  Méditerranée: { center: [42.95, 5.85], zoom: 7.4 },
  Atlantique: { center: [47.2, -3.2], zoom: 7.2 },
  Manche: { center: [49.05, -2.15], zoom: 8.0 },
};

export const TILE_URLS = {
  osm: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
  voyager: 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}',
} as const;

export const SATELLITE_RASTER_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature/default/2023-08-15/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png';
