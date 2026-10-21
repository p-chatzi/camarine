// Bottom control bar: day picker (daily mode), period picker (period mode / Comprendre),
// and the daily ↔ period toggle.
import { Activity, Database, Thermometer } from 'lucide-react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import type { AppMode } from '../../types';

interface Props {
  mode: AppMode;
  data: CopernicusData;
  settings: MapSettings;
}

export function BottomBar({ mode, data, settings }: Props) {
  const isDaily = settings.colorMode === 'daily';
  const showDayPicker = mode === 'visualiser' && isDaily;
  const showPeriodPicker = mode === 'comprendre' || (mode === 'visualiser' && !isDaily);

  return (
    <div className="shrink-0 z-30 px-4 lg:px-8 py-3 bg-white/95 backdrop-blur-md border-t border-sky-200/90 shadow-sm relative">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 min-h-[44px]">
        {showDayPicker && (
          <div className="flex items-center gap-3 bg-sky-50 px-5 py-1.5 rounded-xl border border-sky-200 shadow-sm">
            <Thermometer className="w-5 h-5 text-rose-600" />
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-800">Carte SST du :</label>
            <input
              type="date"
              min={data.startDate}
              max={data.endDate}
              value={data.selectedDate || ''}
              onChange={(e) => data.selectDate(e.target.value)}
              className="px-2 py-1 rounded bg-white border border-sky-300 text-sky-900 font-bold text-sm outline-none cursor-pointer"
            />
          </div>
        )}

        {showPeriodPicker && (
          <div className="flex items-center gap-2 bg-white px-4 py-1.5 rounded-xl shadow-sm border border-slate-200">
            <Database className="w-4 h-4 text-sky-600 hidden sm:inline" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider hidden md:inline mr-1">Période d'analyse :</span>
            <input
              type="date"
              value={data.startDate}
              onChange={(e) => data.setStartDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
            />
            <span className="text-xs font-bold text-slate-400 mx-1">au</span>
            <input
              type="date"
              value={data.endDate}
              onChange={(e) => data.setEndDate(e.target.value)}
              className="px-2 py-1 border border-slate-200 rounded-md text-xs font-bold text-slate-800 outline-none focus:border-sky-500 cursor-pointer"
            />
            <button
              onClick={data.reload}
              className="ml-2 px-3 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              Recharger
            </button>
          </div>
        )}

        {mode === 'visualiser' && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => settings.setColorMode(isDaily ? 'average' : 'daily')}
              className="px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition-colors cursor-pointer flex items-center gap-1.5"
            >
              <Activity className="w-3.5 h-3.5 text-sky-700" />
              <span>{isDaily ? 'Passer en Mode Période (Moyenne)' : 'Passer en Mode Journalier (Jour J)'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
