import type { PipelineRecord } from '../types';

export const todayIso = () => new Date().toISOString().split('T')[0];

export const yearOf = (isoDate: string) => Number(isoDate.slice(0, 4));

/** 1-based day of year. */
export function getDayOfYear(isoDate: string): number {
  const date = new Date(isoDate);
  const start = new Date(date.getFullYear(), 0, 0);
  return Math.floor((date.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

/** Years present in the records, most recent first. */
export function yearsInRecords(records: PipelineRecord[]): number[] {
  return Array.from(new Set(records.map((r) => yearOf(r.date)))).sort((a, b) => b - a);
}

const SHORT_MONTHS = ['Janv.', 'Févr.', 'Mars', 'Avril', 'Mai', 'Juin', 'Juil.', 'Août', 'Sept.', 'Oct.', 'Nov.', 'Déc.'];

/** '2024-07-01' → '01 Juil.' */
export function formatDayMonth(isoDate: string): string {
  if (!isoDate) return '';
  const [, m, d] = isoDate.split('-');
  return `${d} ${SHORT_MONTHS[parseInt(m, 10) - 1]}`;
}

/** '2024-07-01' → '01 juillet 2024' */
export function formatLongFr(date: Date | string): string {
  return new Date(date).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function toIsoLocal(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
