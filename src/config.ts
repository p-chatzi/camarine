// App-wide constants. Change a value here instead of hunting for magic numbers.
import type { Basin, LatLon, MarineZone } from './types';

/** Point whose time series is requested from /api/mhw (Toulon). */
export const PIPELINE_LOCATION = { lat: 43, lon: 6, radius: 0.05 };

/** First date offered by the period picker. */
export const DEFAULT_START_DATE = '1982-01-01';

/** Map "Moyenne période" by default: the last year of data (users can pick any range). */
export const AVERAGE_DEFAULT_DAYS = 365;

/** Hobday climatology baseline (WMO 30-year normal). */
export const BASELINE = { start: 1991, end: 2020 };

/** Metropolitan France incl. Corsica: the initial view always shows all of it. */
export const FRANCE_BOUNDS = { minLat: 41.3, maxLat: 51.1, minLon: -5.2, maxLon: 9.6 };

/**
 * Area fetched from /api/map and the pan limit of the map: every bit of sea on screen has a
 * temperature. Zoom-out stops at the France view (minZoomFor in useLeafletMap.ts), so the box only
 * needs to cover that view on screens up to 1920×1080 and the species focus (species centred left of
 * its card, zoom 7.5). Checked on 1280×800, 1440×900 and 1920×1080. Was 36.5–55.5° N / −20–24.5° E
 * (≈338k grid points); now ≈232k, i.e. ~31 % less to download, convert, send and paint.
 */
export const DATA_BOUNDS = { minLat: 39.0, maxLat: 53.5, minLon: -17.0, maxLon: 23.0 };

/** Contour de la France métropolitaine + Corse (IGN Admin Express, simplifié). Servi depuis public/. */
export const FRANCE_OUTLINE_URL = '/geo/france-metropole.geojson';

/**
 * Species card (SpeciesCard.tsx): full screen below `fullScreenBelowPx`; above, a panel on the right
 * of min(maxWidthPx, widthVw × window width) — must match `lg:w-[min(42rem,46vw)]` — and the camera
 * keeps the species in the part of the map left visible.
 */
export const SPECIES_CARD = { fullScreenBelowPx: 1024, maxWidthPx: 672, widthVw: 0.46, marginPx: 12 };

/** Height of the floating header + map tools rows (px): the camera keeps targets below them. */
export const TOP_CONTROLS_PX = 112;

/** Zoom minimal quand on sélectionne une espèce (l'espèce est centrée à gauche de sa fiche). */
export const SPECIES_FOCUS_ZOOM = 7.5;

/** Sous ce zoom, si beaucoup d'espèces sont affichées, les étiquettes ne s'affichent qu'au survol. */
export const DENSE_LABELS_MIN_ZOOM = 8.5;
export const DENSE_LABELS_SPECIES_COUNT = 12;
/** …or when the map is narrower than this (phones): labels overlap even with the 9 public species. */
export const DENSE_LABELS_NARROW_MAP_PX = 640;

/** Size of one /api/map pixel in degrees. */
export const MAP_CELL_RESOLUTION = 0.05;

/** Debounce before fetching map pixels after the date changes (ms). Was 800 ms. */
export const MAP_FETCH_DEBOUNCE_MS = 250;

/** Number of days of map pixels kept in memory in the browser (~170k pixels per day). */
export const MAP_CELLS_CACHE_DAYS = 12;

/** Fallback Hobday values when telemetry is missing. */
export const FALLBACK_CLIMATOLOGY = 20.0;
export const FALLBACK_THRESHOLD = 22.0;

/** Marine zones: geometry file (public/geo, built by scripts/) and the box the camera frames. */
export const MARINE_ZONES: Record<MarineZone, { url: string; bounds: [LatLon, LatLon] }> = {
  Pelagos: { url: '/geo/pelagos.geojson', bounds: [[40.95, 6.05], [44.45, 11.55]] },
};

/** Sanctuaire Pelagos — facts shown in the info card (source: Barcelo et al. 2013, PN Port-Cros). */
export const PELAGOS_INFO = {
  signed: '25 novembre 1999 (Rome)',
  inForce: '21 février 2002',
  areaKm2: 87_500,
  parties: 'France, Italie, Monaco',
  regularCetaceans: [
    'rorqual commun', 'cachalot', 'grand dauphin', 'dauphin de Risso',
    'dauphin commun', 'dauphin bleu et blanc', 'baleine à bec de Cuvier', 'globicéphale noir',
  ],
  sources: [
    { label: 'Barcelo et al. (2013), Sci. Rep. Port-Cros natl. Park 27 : 451-460', url: 'https://www.portcros-parcnational.fr/sites/portcros-parcnational.fr/files/4035c0e917b8f9cc414f76b7b69d584d.pdf' },
    { label: 'Accord de Rome du 25/11/1999 (texte, art. 3 : limites)', url: 'https://mase.gov.it/sites/default/files/accordo_santuario_mammiferi_marini_25_11_1999.pdf' },
  ],
};

/** Where the map flies when a basin is selected. */
export const BASIN_VIEWS: Record<Basin, { center: LatLon; zoom: number }> = {
  Méditerranée: { center: [42.95, 5.85], zoom: 7.4 },
  Atlantique: { center: [47.2, -3.2], zoom: 7.2 },
  Manche: { center: [49.05, -2.15], zoom: 8.0 },
};

/** Single base map: Esri World Ocean Base (bathymetry), free and keyless. */
export const BASE_TILE_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/Ocean/World_Ocean_Base/MapServer/tile/{z}/{y}/{x}';
export const BASE_TILE_ATTRIBUTION =
  'Tiles &copy; Esri &mdash; Sources: GEBCO, NOAA, CHS, OSU, UNH, CSUMB, National Geographic, DeLorme, NAVTEQ, and Esri · SST &copy; Copernicus C3S';

export const SATELLITE_RASTER_URL =
  'https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GHRSST_L4_MUR_Sea_Surface_Temperature/default/2023-08-15/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png';
