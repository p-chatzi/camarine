// One horizontal line per year; each heatwave is a red ribbon placed at its day of year.
import { Fragment, useState } from 'react';
import { formatLongFr, getDayOfYear, toIsoLocal, yearsInRecords } from '../../lib/dates';
import { eventPeakDate, getHobdayCategory } from '../../lib/hobday';
import type { MhwEvent, PipelineRecord } from '../../types';

interface HoverInfo {
  id: string;
  x: number; // % across the year
  date: string;
  temp: number | null;
  color: string;
}

const MONTH_TICKS = ['01 janv.', '01 mars', '01 mai', '01 juil.', '01 sept.', '01 nov.'];

interface Props {
  records: PipelineRecord[];
  events: MhwEvent[];
}

export function HeatwaveStripPlot({ records, events }: Props) {
  const [hover, setHover] = useState<HoverInfo | null>(null);

  const ribbon = (ev: MhwEvent, year: number) => {
    const leftPct = (getDayOfYear(ev.start) / 365) * 100;
    // Clamp to Dec 31 so events crossing the new year don't overflow the plot.
    const widthPct = Math.min(((ev.durationDays ?? 0) / 365) * 100, 100 - leftPct);
    const peakRec = records.find((r) => r.date === eventPeakDate(ev));
    const color = peakRec ? getHobdayCategory(peakRec.sst, peakRec.climatology, peakRec.threshold).color : 'bg-rose-500 text-white';

    const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
      const pct = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      const hoverDate = new Date(year, 0, Math.floor(pct * 365) + 1);
      const dayRec = records.find((r) => r.date === toIsoLocal(hoverDate));
      setHover({
        id: ev.id,
        x: pct * 100,
        date: formatLongFr(hoverDate),
        temp: dayRec ? dayRec.sst : peakRec ? peakRec.sst : null,
        color,
      });
    };

    return (
      <Fragment key={ev.id}>
        <div
          className="absolute h-3 -top-1 bg-red-400/90 hover:bg-red-500 cursor-pointer transition-colors"
          style={{ left: `${leftPct}%`, width: `${Math.max(0.5, widthPct)}%` }}
          onMouseLeave={() => setHover(null)}
          onMouseMove={onMouseMove}
        />
        {hover?.id === ev.id && (
          <div
            className={`absolute z-50 pointer-events-none px-2.5 py-1.5 rounded shadow-lg text-[10px] flex flex-col gap-0.5 whitespace-nowrap transform -translate-x-1/2 -translate-y-[130%] transition-none ${hover.color}`}
            style={{ left: `${hover.x}%` }}
          >
            <span className="font-medium">Date : {hover.date}</span>
            <span className="font-medium">Température : {hover.temp?.toFixed(2)} °C</span>
            <div className="absolute w-2 h-2 rotate-45 -bottom-1 left-1/2 -translate-x-1/2 bg-inherit"></div>
          </div>
        )}
      </Fragment>
    );
  };

  return (
    <div className="bg-white border border-sky-200/80 rounded-2xl p-5 shadow-xs pb-16">
      <h3 className="text-sm font-bold text-slate-900 mb-2">Canicules marines sur toute la série temporelle</h3>
      <p className="text-xs text-slate-600 mb-2">Dans les deux graphes ci-dessous, les épisodes de canicules marines sont illustrés par les rubans rouges.</p>

      <div className="flex relative pl-14 pr-4 pt-2 pb-8">
        <div className="absolute left-0 top-0 bottom-8 flex items-center justify-center w-8">
          <span className="text-xs font-bold text-slate-600 -rotate-90 whitespace-nowrap tracking-widest">Année</span>
        </div>

        <div className="flex-1 flex flex-col gap-5 relative border-l border-b border-slate-300 pb-2">
          {yearsInRecords(records).map((year) => (
            <div key={year} className="flex items-center h-2 relative w-full group">
              <span className="absolute -left-11 w-8 text-[10px] text-right font-medium text-slate-600 group-hover:text-slate-900">{year}</span>
              <div className="flex-1 h-[1px] bg-slate-200 relative w-full group-hover:bg-slate-300 transition-colors">
                {events.filter((e) => e.start.startsWith(year.toString())).map((ev) => ribbon(ev, year))}
              </div>
            </div>
          ))}
          <div className="absolute -bottom-8 left-0 right-0 flex justify-between text-[10px] text-slate-500 font-medium px-2">
            {MONTH_TICKS.map((m) => (
              <span key={m} className="-rotate-45 translate-y-2">
                {m}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="text-center text-xs text-slate-600 mt-4">Jour de l'année</div>
    </div>
  );
}
