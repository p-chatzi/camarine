// Daily SST vs P90 threshold for one year, with heatwaves shaded in red.
import { useState } from 'react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BASELINE } from '../../config';
import { formatDayMonth, formatLongFr, yearOf, yearsInRecords } from '../../lib/dates';
import type { MhwEvent, PipelineRecord } from '../../types';

interface TooltipProps {
  active?: boolean;
  label?: string;
  payload?: { dataKey: string; value: number }[];
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload?.length || !label) return null;
  const temp = payload.find((p) => p.dataKey === 'sst')?.value;
  const p90 = payload.find((p) => p.dataKey === 'threshold')?.value;
  return (
    <div className="bg-white/95 backdrop-blur-sm border border-slate-100 shadow-xl rounded-2xl p-4 text-xs font-sans pointer-events-none z-50 min-w-[180px]">
      <div className="mb-3 text-slate-400 font-extrabold uppercase tracking-wider text-[9px] border-b border-slate-100 pb-2">{formatLongFr(label)}</div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.6)]"></span>
          <span className="font-bold text-slate-700">Température</span>
        </div>
        <span className="font-black text-slate-900">{temp?.toFixed(2)} °C</span>
      </div>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-300"></span>
          <span className="font-bold text-slate-500">Seuil P90</span>
        </div>
        <span className="font-bold text-slate-500">{p90?.toFixed(2)} °C</span>
      </div>
    </div>
  );
}

interface Props {
  records: PipelineRecord[];
  events: MhwEvent[];
}

export function DailyChart({ records, events }: Props) {
  // Default to the most recent year that actually has data.
  const [year, setYear] = useState(() => yearsInRecords(records)[0] ?? new Date().getFullYear());
  const yearRecords = records.filter((r) => yearOf(r.date) === year);
  const yearEvents = events.filter((ev) => ev.start.startsWith(String(year)) || ev.end.startsWith(String(year)));
  const monthTicks = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}-01`);

  return (
    <div className="bg-white border border-sky-100 rounded-3xl p-6 shadow-xl shadow-sky-900/5 flex flex-col relative w-full xl:sticky xl:top-6 z-10">
      <div className="mb-6 flex items-center justify-between z-10">
        <div className="space-y-1">
          <h3 className="text-base font-black text-slate-900">Évolution journalière</h3>
          <p className="text-xs font-medium text-slate-400">Température observée vs 90e percentile</p>
        </div>
        <div className="flex items-center gap-2.5 bg-slate-50 p-1.5 rounded-xl border border-slate-100">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider pl-2">Année</label>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-1.5 rounded-lg bg-white border-none text-sm font-bold text-slate-800 outline-none cursor-pointer shadow-sm hover:text-blue-600 transition-colors"
          >
            {yearsInRecords(records).map((yr) => (
              <option key={yr} value={yr}>
                {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="h-[420px] w-full relative pb-12 pl-2">
        <div className="absolute top-1/2 -left-3 -translate-y-1/2 -rotate-90 text-[11px] font-bold text-slate-400 uppercase tracking-widest z-10">Température (°C)</div>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={yearRecords} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
            <defs>
              <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="6" stdDeviation="6" floodColor="#3b82f6" floodOpacity="0.25" />
              </filter>
            </defs>
            <CartesianGrid stroke="#f1f5f9" vertical={false} strokeDasharray="4 4" />
            {yearEvents.map((ev) => (
              <ReferenceArea key={`mhw-rect-${ev.id}`} x1={ev.start} x2={ev.end} fill="#fecaca" fillOpacity={0.6} strokeOpacity={0} />
            ))}
            <XAxis
              dataKey="date"
              stroke="#cbd5e1"
              fontSize={10}
              fontWeight={600}
              tickFormatter={formatDayMonth}
              ticks={monthTicks}
              angle={-45}
              textAnchor="end"
              dx={-8}
              dy={8}
              axisLine={false}
              tickLine={false}
            />
            <YAxis domain={['auto', 'auto']} stroke="#cbd5e1" fontSize={11} fontWeight={600} axisLine={false} tickLine={false} dx={-10} tickFormatter={(v) => `${v}°`} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#94a3b8', strokeWidth: 1, strokeDasharray: '4 4' }} />
            <Line type="monotone" dataKey="sst" stroke="#3b82f6" strokeWidth={2.5} dot={false} isAnimationActive={true} activeDot={{ r: 6, fill: '#ffffff', stroke: '#3b82f6', strokeWidth: 3 }} filter="url(#shadow)" />
            <Line type="monotone" dataKey="threshold" stroke="#94a3b8" strokeWidth={2} strokeDasharray="6 6" dot={false} isAnimationActive={true} activeDot={false} />
          </LineChart>
        </ResponsiveContainer>
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex items-center gap-6 text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-white/90 backdrop-blur-md px-6 py-3 rounded-full border border-slate-100 shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-1.5 rounded-full bg-blue-500"></span>
            <span>Année {year}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-4 h-1.5 rounded-full bg-slate-300"></span>
            <span>
              P90 ({BASELINE.start}-{BASELINE.end})
            </span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="w-3.5 h-3.5 rounded-md bg-red-200 border border-red-300"></span>
            <span>Canicule</span>
          </div>
        </div>
      </div>
    </div>
  );
}
