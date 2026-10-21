// Hobday et al. (2018) marine-heatwave categories.
// Category = how many times the (threshold − climatology) gap the SST exceeds the climatology.
//   1× → I Modérée, 2× → II Forte, 3× → III Sévère, 4× → IV Extrême.
import type { MhwEvent } from '../types';

export type HobdayLevel = 0 | 1 | 2 | 3 | 4;

export const CATEGORY_NAMES: Record<Exclude<HobdayLevel, 0>, string> = {
  1: 'Cat. I (Modérée)',
  2: 'Cat. II (Forte)',
  3: 'Cat. III (Sévère)',
  4: 'Cat. IV (Extrême)',
};

/** Tailwind badge classes (charts, table). */
const BADGE_CLASSES: Record<HobdayLevel, string> = {
  0: 'bg-slate-100 text-slate-500',
  1: 'bg-amber-400 text-amber-950',
  2: 'bg-orange-500 text-white',
  3: 'bg-rose-700 text-white',
  4: 'bg-fuchsia-900 text-white',
};

/** Hex colors (Leaflet map pixels). */
export const CATEGORY_HEX: Record<HobdayLevel, string> = {
  0: '#38bdf8',
  1: '#fbbf24',
  2: '#f97316',
  3: '#e11d48',
  4: '#701a75',
};

/** Raw classification. `minGap` avoids huge multiples when threshold ≈ climatology. */
export function classifyHobday(sst: number, climatology: number, threshold: number, minGap = 0) {
  const gap = Math.max(minGap, threshold - climatology);
  const multiple = (sst - climatology) / gap;
  let level: HobdayLevel = 0;
  if (sst > threshold) {
    if (multiple >= 4) level = 4;
    else if (multiple >= 3) level = 3;
    else if (multiple >= 2) level = 2;
    else level = 1;
  }
  return { level, multiple };
}

export interface HobdayCategory {
  name: string;
  num: HobdayLevel;
  color: string; // Tailwind classes
  mult: string; // multiple formatted to 1 decimal
}

/** Category used by the charts, the events table and the exports. */
export function getHobdayCategory(sst: number, climatology: number, threshold: number): HobdayCategory {
  const none: HobdayCategory = { name: 'Aucune', num: 0, color: BADGE_CLASSES[0], mult: '0' };
  if (!sst || !climatology || !threshold) return none;
  const { level, multiple } = classifyHobday(sst, climatology, threshold);
  if (level === 0) return none;
  return { name: CATEGORY_NAMES[level], num: level, color: BADGE_CLASSES[level], mult: multiple.toFixed(1) };
}

export const UNKNOWN_CATEGORY: HobdayCategory = { name: 'Inconnue', num: 0, color: BADGE_CLASSES[0], mult: '0' };

// ---- Event field helpers (pipeline versions use different names) ----------

/** Peak date of an event (the Python pipeline emits `peakDate`). */
export function eventPeakDate(ev: MhwEvent): string {
  return ev.peak || ev.peakDate || ev.start;
}

export function eventDuration(ev: MhwEvent): number | undefined {
  return ev.durationDays || ev.duration;
}

export function eventCumulativeIntensity(ev: MhwEvent): number | undefined {
  return ev.cumulativeIntensity ?? ev.cumulative_intensity ?? ev.intensity_cumulative;
}
