// Builds the CSV / JSON files offered in the "Partager" tab. Pure functions: no React.
import { DATA_SOURCES } from '../data/metadata';
import { SPECIES_DATA } from '../data/species';
import type { ColorMode, ExportFormat, LatLon, Pipeline, Telemetry } from '../types';
import { FALLBACK_CLIMATOLOGY, FALLBACK_THRESHOLD } from '../config';
import { eventCumulativeIntensity, eventDuration, eventPeakDate, getHobdayCategory } from './hobday';

export interface ExportContext {
  colorMode: ColorMode;
  startDate: string;
  endDate: string;
  selectedDate: string;
  telemetry: Telemetry | null;
  pipeline: Pipeline | null;
  /** SST at a species location (see lib/speciesSst.ts). */
  speciesSst: (coords: LatLon) => number;
}

function speciesCategory(ctx: ExportContext, sst: number) {
  return getHobdayCategory(
    sst,
    ctx.telemetry?.climatology || FALLBACK_CLIMATOLOGY,
    ctx.telemetry?.threshold || FALLBACK_THRESHOLD,
  );
}

export function buildCsv(ctx: ExportContext): string {
  const { colorMode, telemetry } = ctx;
  const activeDate = colorMode === 'daily' ? telemetry?.date || ctx.selectedDate : 'Période globale';
  const records = ctx.pipeline?.records || [];
  const events = ctx.pipeline?.events || [];

  const metadata = [
    `# ============================================================================`,
    `# PROJET: Camarine - Ocean Hackathon / Copernicus Marine Export`,
    `# GÉNÉRÉ LE: ${new Date().toISOString()}`,
    `# MODE DE FILTRE: ${colorMode}`,
    `# DATE ACTIVE / PÉRIODE: ${activeDate} (${ctx.startDate} au${ctx.endDate})`,
    `# SOURCE: ${DATA_SOURCES.provider}`,
    `# PRODUITS: ${DATA_SOURCES.reprocessed} + ${DATA_SOURCES.nearRealTime}`,
    `# INSTITUTION: ${DATA_SOURCES.institution}`,
    `# CLIMATOLOGIE: ${DATA_SOURCES.climatology}`,
    `# TÉLÉMÉTRIE ACTIVE - SST (°C): ${telemetry?.sst ?? 'N/A'}`,
    `# TÉLÉMÉTRIE ACTIVE - Climatologie (°C): ${telemetry?.climatology ?? 'N/A'}`,
    `# TÉLÉMÉTRIE ACTIVE - Seuil P90 (°C): ${telemetry?.threshold ?? 'N/A'}`,
    `# TÉLÉMÉTRIE ACTIVE - Anomalie (°C): ${telemetry?.anomaly ?? 'N/A'}`,
    `# ============================================================================`,
    ``,
  ];

  const recordSection = [
    `# --- SECTION 1 : SÉRIE TEMPORELLE JOURNALIÈRE (COPERNICUS PIPELINE) ---`,
    `Record_Type,Date,SST_C,Climatology_C,Threshold_P90_C,Anomaly_C`,
    ...records.map((r) => `RECORD,${r.date},${r.sst},${r.climatology},${r.threshold},${r.anomaly ?? 0}`),
  ];

  const eventRows = events.map((ev, idx) => {
    const cum = eventCumulativeIntensity(ev) ?? 0;
    return `EVENT,${ev.id || idx + 1},${ev.start},${eventPeakDate(ev)},${ev.end},${eventDuration(ev)},${cum.toFixed(2)}`;
  });
  const eventSection = [
    ``,
    `# --- SECTION 2 : ÉVÉNEMENTS DE CANICULES MARINES (HOBDAY) ---`,
    `Event_Type,Event_ID,Start_Date,Peak_Date,End_Date,Duration_Days,Cumulative_Intensity`,
    ...(eventRows.length > 0 ? eventRows : [`EVENT,None,N/A,N/A,N/A,0,0`]),
  ];

  const speciesSection = [
    ``,
    `# --- SECTION 3 : INDICATEURS BIOLOGIQUES & ESPÈCES ---`,
    `Species_Type,ID_Espece,Nom_Commun,Nom_Scientifique,Bassin,Latitude,Longitude,Tendance,Seuil_Critique,SST_Observee_C,Categorie_Hobday,Multiplicateur_Intensite`,
    ...SPECIES_DATA.map((sp) => {
      const sst = ctx.speciesSst(sp.coords);
      const cat = speciesCategory(ctx, sst);
      return [
        `SPECIES`,
        sp.id,
        `"${sp.name}"`,
        `"${sp.scientificName}"`,
        `"${sp.basin}"`,
        sp.coords[0],
        sp.coords[1],
        `"${sp.trend}"`,
        `"${sp.criticalThreshold.replace(/"/g, '""')}"`,
        +sst.toFixed(2),
        `"${cat.name}"`,
        cat.mult,
      ].join(',');
    }),
  ];

  return [...metadata, ...recordSection, ...eventSection, ...speciesSection].join('\n');
}

export function buildJson(ctx: ExportContext): string {
  const { colorMode, pipeline, telemetry } = ctx;
  const isDaily = colorMode === 'daily';
  const activeDate = isDaily ? telemetry?.date || ctx.selectedDate : null;

  // In daily mode, keep only the selected day and the events that cover it.
  const records = isDaily && pipeline?.records
    ? pipeline.records.filter((r) => r.date === activeDate)
    : pipeline?.records || [];
  const events = isDaily && pipeline?.events
    ? pipeline.events.filter((ev) => activeDate! >= ev.start && activeDate! <= ev.end)
    : pipeline?.events || [];

  const payload = {
    project: 'Camarine - Ocean Hackathon',
    generatedAt: new Date().toISOString(),
    filterMode: colorMode,
    selectedDate: activeDate,
    selectedPeriod: colorMode === 'average' ? { start: ctx.startDate, end: ctx.endDate } : null,
    liveCopernicusTelemetry: telemetry,
    liveCopernicusPipeline: { ...pipeline, records, events },
    speciesIndicators: SPECIES_DATA.map((sp) => {
      const sst = ctx.speciesSst(sp.coords);
      const cat = speciesCategory(ctx, sst);
      return {
        id: sp.id,
        name: sp.name,
        scientificName: sp.scientificName,
        basin: sp.basin,
        coordinates: { lat: sp.coords[0], lon: sp.coords[1] },
        responseToMarineHeatwave: sp.trend === 'decline' ? '- Disparaît / Déclin' : '+ Apparaît / Prolifère',
        criticalThreshold: sp.criticalThreshold,
        telemetryAtSelection: {
          date: activeDate,
          sstBaseline2015: sp.baseSst2015,
          sstObserved: +sst.toFixed(2),
          hobdayCategory: cat.name,
          intensityMultiple: cat.mult,
        },
      };
    }),
  };
  return JSON.stringify(payload, null, 2);
}

export function buildExport(format: ExportFormat, ctx: ExportContext): string {
  return format === 'csv' ? buildCsv(ctx) : buildJson(ctx);
}

export function exportFilename(format: ExportFormat, ctx: ExportContext): string {
  const suffix = ctx.colorMode === 'daily' ? ctx.telemetry?.date || 'jour' : `${ctx.startDate}_au_${ctx.endDate}`;
  return `camarine_export_${suffix}.${format}`;
}

/** Triggers a browser download of a text file. */
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: mimeType }));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function downloadExport(format: ExportFormat, ctx: ExportContext): void {
  const mime = format === 'csv' ? 'text/csv;charset=utf-8;' : 'application/json;charset=utf-8;';
  downloadTextFile(exportFilename(format, ctx), buildExport(format, ctx), mime);
}
