// "Par année" view of the heatwave history: one row per year, bar = number of heatwave days that
// year, split by episode and coloured by Hobday category. Readable on a phone (a 365-day calendar
// squeezed into 300 px is not). Tap / click / Enter on a year lists its episodes.
import { ChevronDown } from 'lucide-react';
import { useMemo, useState } from 'react';
import { yearsInRecords } from '../../lib/dates';
import { CATEGORY_HEX, eventPeakDate, getHobdayCategory, type HobdayLevel } from '../../lib/hobday';
import type { MhwEvent, PipelineRecord } from '../../types';

const DAY_MS = 86_400_000;

interface Episode {
  id: string;
  start: string;
  end: string;
  /** Days of this episode falling in the row's year. */
  days: number;
  level: HobdayLevel;
}

interface YearRow {
  year: number;
  days: number;
  episodes: Episode[];
}

function utc(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number);
  return Date.UTC(y, m - 1, d);
}

/** Days of [start, end] (inclusive) inside `year`. */
function daysInYear(start: string, end: string, year: number): number {
  const from = Math.max(utc(start), Date.UTC(year, 0, 1));
  const to = Math.min(utc(end), Date.UTC(year, 11, 31));
  return to < from ? 0 : Math.round((to - from) / DAY_MS) + 1;
}

function buildRows(records: PipelineRecord[], events: MhwEvent[]): YearRow[] {
  const byDate = new Map(records.map((r) => [r.date, r]));
  const levels = new Map(
    events.map((ev) => {
      const peak = byDate.get(eventPeakDate(ev));
      return [ev.id, peak ? getHobdayCategory(peak.sst, peak.climatology, peak.threshold).num : 1] as const;
    }),
  );
  return yearsInRecords(records).map((year) => {
    const episodes = events
      .filter((ev) => ev.start && ev.end && Number(ev.start.slice(0, 4)) <= year && Number(ev.end.slice(0, 4)) >= year)
      .map((ev) => ({ id: ev.id, start: ev.start, end: ev.end, days: daysInYear(ev.start, ev.end, year), level: (levels.get(ev.id) || 1) as HobdayLevel }))
      .filter((ep) => ep.days > 0)
      .sort((a, b) => a.start.localeCompare(b.start));
    return { year, days: episodes.reduce((sum, ep) => sum + ep.days, 0), episodes };
  });
}

const LEVEL_LABELS: Record<Exclude<HobdayLevel, 0>, string> = { 1: 'I Modérée', 2: 'II Forte', 3: 'III Sévère', 4: 'IV Extrême' };

function shortFr(iso: string): string {
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export function HeatwaveYearBars({ records, events }: { records: PipelineRecord[]; events: MhwEvent[] }) {
  const rows = useMemo(() => buildRows(records, events), [records, events]);
  const maxDays = Math.max(1, ...rows.map((r) => r.days));
  const [openYear, setOpenYear] = useState<number | null>(null);

  return (
    <div>
      <ul className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600 mb-3" aria-label="Couleurs : catégorie de Hobday au pic de l’épisode">
        {([1, 2, 3, 4] as const).map((level) => (
          <li key={level} className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: CATEGORY_HEX[level] }} aria-hidden="true" />
            {LEVEL_LABELS[level]}
          </li>
        ))}
      </ul>

      <ol className="space-y-0.5">
        {rows.map((row) => {
          const isOpen = openYear === row.year;
          const detailsId = `mhw-year-${row.year}`;
          return (
            <li key={row.year}>
              <button
                onClick={() => setOpenYear(isOpen ? null : row.year)}
                disabled={row.episodes.length === 0}
                aria-expanded={row.episodes.length ? isOpen : undefined}
                aria-controls={row.episodes.length ? detailsId : undefined}
                aria-label={`${row.year} : ${row.days} jour${row.days > 1 ? 's' : ''} de canicule marine, ${row.episodes.length} épisode${row.episodes.length > 1 ? 's' : ''}`}
                className="w-full min-h-9 grid grid-cols-[2.75rem_1fr_4.5rem] items-center gap-2 px-1 rounded-lg text-left enabled:hover:bg-sky-50 enabled:cursor-pointer disabled:cursor-default"
              >
                <span className="text-xs font-bold text-slate-700 tabular-nums">{row.year}</span>
                <span className="h-4 rounded bg-slate-100 overflow-hidden flex" aria-hidden="true">
                  {row.episodes.map((ep) => (
                    <span key={ep.id} className="h-full border-r border-white/70 last:border-r-0" style={{ width: `${(ep.days / maxDays) * 100}%`, background: CATEGORY_HEX[ep.level] }} />
                  ))}
                </span>
                <span className="flex items-center justify-end gap-1 text-xs tabular-nums text-slate-700">
                  <strong className="font-bold">{row.days}</strong> j
                  {row.episodes.length > 0 && <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />}
                </span>
              </button>
              {isOpen && (
                <ul id={detailsId} className="ml-12 mr-1 mb-2 mt-0.5 space-y-1">
                  {row.episodes.map((ep) => (
                    <li key={ep.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5">
                      <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ background: CATEGORY_HEX[ep.level] }} aria-hidden="true" />
                      <span className="font-semibold">
                        {shortFr(ep.start)} → {shortFr(ep.end)}
                      </span>
                      <span className="text-slate-500">
                        {ep.days} j · Cat. {LEVEL_LABELS[ep.level as Exclude<HobdayLevel, 0>]}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
