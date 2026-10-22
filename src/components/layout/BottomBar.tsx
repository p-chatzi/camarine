// Bottom control bar: day picker (daily mode), period picker (period mode / Comprendre),
// the daily ↔ period toggle and, in expert mode, the telemetry of the selected day.
// Wraps onto several rows on small screens instead of overflowing.
import { Activity, Database, Thermometer } from 'lucide-react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import type { AppMode } from '../../types';
import { Telemetry } from './Telemetry';

interface Props {
  mode: AppMode;
  data: CopernicusData;
  settings: MapSettings;
}

const DATE_INPUT = 'tap px-2 py-1 rounded-md bg-white border border-sky-300 text-sky-900 font-bold text-sm cursor-pointer';

export function BottomBar({ mode, data, settings }: Props) {
  const isDaily = settings.colorMode === 'daily';
  const showDayPicker = mode === 'visualiser' && isDaily;
  const showPeriodPicker = mode === 'comprendre' || (mode === 'visualiser' && !isDaily);
  const showTelemetry = mode === 'visualiser' && settings.expert && data.telemetry;

  return (
    <div className="shrink-0 z-30 px-3 sm:px-4 lg:px-8 py-2 sm:py-3 bg-white/95 backdrop-blur-md border-t border-sky-200/90 shadow-sm relative">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 sm:gap-3">
        {showDayPicker && (
          <div className="flex items-center gap-2 sm:gap-3 bg-sky-50 px-3 sm:px-5 py-1.5 rounded-xl border border-sky-200 shadow-sm">
            <Thermometer className="w-5 h-5 text-rose-600 shrink-0" aria-hidden="true" />
            <label htmlFor="map-day" className="text-xs font-extrabold uppercase tracking-wider text-slate-800">
              <span className="hidden sm:inline">Carte </span>SST du :
            </label>
            <input
              id="map-day"
              type="date"
              min={data.startDate}
              max={data.endDate}
              value={data.selectedDate || ''}
              onChange={(e) => data.selectDate(e.target.value)}
              className={DATE_INPUT}
            />
          </div>
        )}

        {showPeriodPicker && (
          <div role="group" aria-label="Période d'analyse" className="flex flex-wrap items-center gap-2 bg-white px-3 sm:px-4 py-1.5 rounded-xl shadow-sm border border-slate-200">
            <Database className="w-4 h-4 text-sky-600 hidden sm:inline" aria-hidden="true" />
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider hidden md:inline mr-1">Période d'analyse :</span>
            <input type="date" aria-label="Début de la période" value={data.startDate} onChange={(e) => data.setStartDate(e.target.value)} className={DATE_INPUT} />
            <span className="text-xs font-bold text-slate-400" aria-hidden="true">au</span>
            <input type="date" aria-label="Fin de la période" value={data.endDate} onChange={(e) => data.setEndDate(e.target.value)} className={DATE_INPUT} />
            <button
              onClick={data.reload}
              className="tap px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
            >
              Recharger
            </button>
          </div>
        )}

        {showTelemetry && (
          <div className="hidden md:flex order-last xl:order-none w-full xl:w-auto justify-center">
            <Telemetry telemetry={data.telemetry!} />
          </div>
        )}

        {mode === 'visualiser' && (
          <button
            onClick={() => settings.setColorMode(isDaily ? 'average' : 'daily')}
            className="tap px-3.5 py-1.5 rounded-xl text-xs font-bold bg-sky-100 hover:bg-sky-200 text-sky-900 border border-sky-300 transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <Activity className="w-3.5 h-3.5 text-sky-700 shrink-0" aria-hidden="true" />
            <span className="sm:hidden">{isDaily ? 'Mode Période' : 'Mode Jour J'}</span>
            <span className="hidden sm:inline">{isDaily ? 'Passer en Mode Période (Moyenne)' : 'Passer en Mode Journalier (Jour J)'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
