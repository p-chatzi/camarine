// Shared types used across the app. If a shape crosses a file boundary, it lives here.

// ---- UI state --------------------------------------------------------------
export type AppMode = 'visualiser' | 'comprendre' | 'partager' | 'museum';
export type Basin = 'Méditerranée' | 'Atlantique' | 'Manche';
export type BasinFilter = 'Tous' | Basin;
export type TrendFilter = 'Tous' | 'decline' | 'proliferate';
/** 'daily' = one selected day; 'average' = the whole loaded period. */
export type ColorMode = 'daily' | 'average';
/** What the map pixels show: raw SST, Hobday heatwave categories, or SST + species pins. */
export type MapDataType = 'sst' | 'mhw' | 'impact';
export type TileStyle = 'voyager' | 'osm';
export type ExportFormat = 'csv' | 'json';
export type LatLon = [number, number];

// ---- Static content --------------------------------------------------------
export interface SpeciesItem {
  id: string;
  name: string;
  scientificName: string;
  basin: Basin;
  locationName: string;
  coords: LatLon;
  trend: 'decline' | 'proliferate';
  trendLabel: string;
  criticalThreshold: string;
  baseSst2015: number;
  sst2026: number;
  mortalityRate: string;
  shortDesc: string;
  impactDetails: string;
  narrationText: string;
  museumSection: string;
}

export interface SpeciesImage {
  title: string;
  src: string;
  alt: string;
  artist: string;
  license: string;
}

export interface MuseumSection {
  id: string;
  buttonNumber: number;
  title: string;
  subtitle: string;
  center: LatLon;
  zoom: number;
  color: string;
  speciesIds: string[];
}

// ---- Backend payloads (see backend/main.py) --------------------------------
/** One day of the /api/mhw time series. */
export interface PipelineRecord {
  date: string; // YYYY-MM-DD
  sst: number;
  climatology: number;
  threshold: number; // P90
  anomaly: number | null;
  eventId?: string | null;
}

/** One detected marine heatwave (Hobday). Field names vary between pipeline versions. */
export interface MhwEvent {
  id: string;
  start: string;
  end: string;
  durationDays?: number;
  duration?: number;
  peak?: string;
  peakDate?: string;
  peakSst?: number;
  peakIntensity?: number;
  category?: string;
  cumulativeIntensity?: number;
  cumulative_intensity?: number;
  intensity_cumulative?: number;
}

/** Response of GET /api/mhw. */
export interface Pipeline {
  records: PipelineRecord[];
  events: MhwEvent[];
  activeDate?: string;
  method?: { method?: string; [key: string]: unknown };
  [key: string]: unknown;
}

/** One satellite pixel from GET /api/map. */
export interface MapCell {
  lat: number;
  lon: number;
  sst: number;
}

// ---- Derived ---------------------------------------------------------------
/** Values of the currently selected day, shown in the telemetry pill and exports. */
export interface Telemetry {
  date: string;
  year: number;
  sst: number;
  climatology: number;
  threshold: number;
  anomaly: number;
}

export interface AnnualAnomaly {
  year: number;
  meanAnomaly: number;
}
