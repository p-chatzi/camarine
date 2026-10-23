// Shared types used across the app. If a shape crosses a file boundary, it lives here.

// ---- UI state --------------------------------------------------------------
export type AppMode = 'visualiser' | 'comprendre' | 'partager' | 'forum';
export type Basin = 'Méditerranée' | 'Atlantique' | 'Manche';
/** Protected marine area offered next to the basins in the "Façades" filter. */
export type MarineZone = 'Pelagos';
export type BasinFilter = 'Tous' | Basin | MarineZone;
/** What the camera focuses on: a basin, a marine zone, or null (= whole of France). */
export type MapFocus = Basin | MarineZone | null;
export type TrendFilter = 'Tous' | 'decline' | 'proliferate';
/** 'daily' = one selected day; 'average' = the whole loaded period. */
export type ColorMode = 'daily' | 'average';
/** What the map pixels show: raw SST, Hobday heatwave categories, or SST + species pins. */
export type MapDataType = 'sst' | 'mhw' | 'impact';
export type ExportFormat = 'csv' | 'json';
export type LatLon = [number, number];

// ---- Static content --------------------------------------------------------
/** Grand groupe affiché dans le catalogue expert. Les algues et le phytoplancton sont rangés en « flore ». */
export type Kingdom = 'faune' | 'flore';

/** 'public' = visible dans tous les modes ; 'expert' = visible uniquement en mode expert. */
export type SpeciesAudience = 'public' | 'expert';

/** Catégories de la Liste rouge UICN. 'NE' = aucune évaluation trouvée. */
export type IucnCategory = 'CR' | 'EN' | 'VU' | 'NT' | 'LC' | 'DD' | 'NE';

export interface IucnStatus {
  category: IucnCategory;
  /** Portée de l'évaluation, ex. « Mondiale » ou « Méditerranée (régionale) ». */
  scope: string;
  year?: number;
  /** Lien vers l'évaluation (iucnredlist.org) ou le document UICN qui la publie. */
  url?: string;
}

/** Solidité du lien entre canicules marines et l'effet observé, d'après les sources citées. */
export type HeatEvidence = 'établi' | 'probable' | 'hypothèse';

export interface SourceRef {
  label: string;
  url: string;
}

export interface SpeciesItem {
  id: string;
  name: string;
  scientificName: string;
  kingdom: Kingdom;
  audience: SpeciesAudience;
  basin: Basin;
  locationName: string;
  /** Toujours en mer, le long des côtes ou au large (vérifié par script, voir SOURCES.md). */
  coords: LatLon;
  trend: 'decline' | 'proliferate';
  trendLabel: string;
  /** Zone de présence / de prédilection. */
  habitat: string;
  /** Rôle écologique et importance (écologique, économique, patrimoniale). */
  role: string;
  iucn: IucnStatus;
  heatEvidence: HeatEvidence;
  sources: SourceRef[];
  criticalThreshold: string;
  /** ⚠ Valeurs codées en dur (héritées du hackathon). Absentes pour les espèces ajoutées depuis. */
  baseSst2015?: number;
  sst2026?: number;
  mortalityRate: string;
  shortDesc: string;
  impactDetails: string;
  /** Script for the future audio guide (not displayed nor read aloud today). */
  narrationText: string;
}

export interface SpeciesImage {
  title: string;
  src: string;
  alt: string;
  artist: string;
  license: string;
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
