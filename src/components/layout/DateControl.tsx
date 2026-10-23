// Date of the map / analysis period, as one small chip that opens a pop-up (replaces the bottom bar).
// - MapDateControl (Visualiser): "day J" or "period average", day stepping ◀ ▶, expert telemetry.
// - PeriodControl (Comprendre): the analysis period only.
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';
import { useRef, type ReactNode } from 'react';
import type { CopernicusData } from '../../hooks/useCopernicusData';
import type { MapSettings } from '../../hooks/useMapSettings';
import { toIsoLocal } from '../../lib/dates';
import { Popover } from '../ui/Popover';
import { CHIP } from './Header';
import { Telemetry } from './Telemetry';

const INPUT = 'tap h-11 w-full min-w-0 px-3 rounded-xl bg-white border border-sky-300 text-sky-950 font-bold text-sm cursor-pointer';
const LABEL = 'block text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-1';

/** '2024-12-31' → '31 déc. 2024' */
function shortDate(iso: string): string {
  if (!iso) return '—';
  return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toIsoLocal(new Date(y, m - 1, d + days));
}

function PeriodFields({ data }: { data: CopernicusData }) {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <label>
          <span className={LABEL}>Du</span>
          <input type="date" value={data.startDate} max={data.endDate} onChange={(e) => e.target.value && data.setStartDate(e.target.value)} className={INPUT} />
        </label>
        <label>
          <span className={LABEL}>Au</span>
          <input type="date" value={data.endDate} min={data.startDate} onChange={(e) => e.target.value && data.setEndDate(e.target.value)} className={INPUT} />
        </label>
      </div>
      <button
        onClick={data.reload}
        className="tap w-full h-11 flex items-center justify-center gap-2 bg-sky-700 hover:bg-sky-800 text-white rounded-xl text-sm font-bold shadow-sm transition-colors"
      >
        <RefreshCw className="w-4 h-4" aria-hidden="true" /> Recharger la période
      </button>
    </div>
  );
}

function PanelTitle({ children }: { children: ReactNode }) {
  return <h2 className="text-sm font-extrabold text-sky-950 mb-3">{children}</h2>;
}

interface MapProps {
  data: CopernicusData;
  settings: MapSettings;
  /** The map pixels of the chosen day are loading (spinner in the chip). */
  isLoading: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MapDateControl({ data, settings, isLoading, open, onOpenChange }: MapProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const isDaily = settings.colorMode === 'daily';
  const day = data.selectedDate || '';
  const telemetry = settings.expert ? data.telemetry : null;
  const canPrev = !!day && day > data.startDate;
  const canNext = !!day && day < data.endDate;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="map-date"
        aria-haspopup="dialog"
        aria-label={isDaily ? `Date de la carte : ${shortDate(day)}. Changer` : `Moyenne du ${shortDate(data.startDate)} au ${shortDate(data.endDate)}. Changer`}
        className={`${CHIP} flex items-center gap-2 px-3 text-sm font-bold text-slate-800 hover:bg-white`}
      >
        {isLoading ? (
          <span className="w-4 h-4 shrink-0 border-2 border-sky-200 border-t-sky-600 rounded-full animate-spin motion-reduce:animate-none" aria-hidden="true" />
        ) : (
          <CalendarDays className="w-4 h-4 text-rose-600 shrink-0" aria-hidden="true" />
        )}
        {isDaily ? (
          <span className="whitespace-nowrap">{shortDate(day)}</span>
        ) : (
          <span className="whitespace-nowrap">
            Moyenne<span className="hidden md:inline"> {shortDate(data.startDate)} → {shortDate(data.endDate)}</span>
          </span>
        )}
        {telemetry && (
          <span className={`px-1.5 py-0.5 rounded-md text-[11px] font-extrabold ${telemetry.anomaly > 0 ? 'bg-rose-100 text-rose-700' : 'bg-sky-100 text-sky-700'}`}>
            {telemetry.anomaly > 0 ? '+' : ''}
            {telemetry.anomaly.toFixed(1)} °C
          </span>
        )}
      </button>

      <span role="status" className="sr-only">
        {isLoading ? `Chargement des pixels SST du ${shortDate(day)}…` : ''}
      </span>
      {open && (
        <Popover id="map-date" label="Date de la carte" anchorRef={buttonRef} onClose={() => onOpenChange(false)} placement="above" width={360}>
          <div className="p-4 pt-2 sm:pt-4 space-y-4">
            <div>
              <PanelTitle>Date de la carte</PanelTitle>
              <div role="group" aria-label="Type de carte" className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200">
                {(
                  [
                    ['daily', 'Un jour'],
                    ['average', 'Moyenne période'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    onClick={() => settings.setColorMode(value)}
                    aria-pressed={settings.colorMode === value}
                    className={`tap h-10 rounded-lg text-sm font-bold transition-colors ${settings.colorMode === value ? 'bg-white text-sky-800 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {isDaily ? (
              <div>
                <label htmlFor="map-day" className={LABEL}>
                  Carte SST du
                </label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => canPrev && data.selectDate(addDays(day, -1))}
                    disabled={!canPrev}
                    aria-label="Jour précédent"
                    className="tap h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-sky-300 bg-white text-sky-800 hover:bg-sky-50 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-5 h-5" aria-hidden="true" />
                  </button>
                  <input id="map-day" type="date" min={data.startDate} max={data.endDate} value={day} onChange={(e) => data.selectDate(e.target.value)} className={INPUT} />
                  <button
                    onClick={() => canNext && data.selectDate(addDays(day, 1))}
                    disabled={!canNext}
                    aria-label="Jour suivant"
                    className="tap h-11 w-11 shrink-0 flex items-center justify-center rounded-xl border border-sky-300 bg-white text-sky-800 hover:bg-sky-50 disabled:opacity-40"
                  >
                    <ChevronRight className="w-5 h-5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <p className={LABEL}>Moyenne sur la période d’analyse</p>
                <PeriodFields data={data} />
              </div>
            )}

            {telemetry && <Telemetry telemetry={telemetry} />}
          </div>
        </Popover>
      )}
    </>
  );
}

interface PeriodProps {
  data: CopernicusData;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PeriodControl({ data, open, onOpenChange }: PeriodProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-controls="analysis-period"
        aria-haspopup="dialog"
        className="tap h-11 inline-flex items-center gap-2 px-3.5 rounded-2xl bg-white border border-sky-200 shadow-sm text-sm font-bold text-slate-800 hover:border-sky-400"
      >
        <CalendarDays className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />
        <span className="sr-only">Période d’analyse :</span>
        <span className="whitespace-nowrap">
          {shortDate(data.startDate)} → {shortDate(data.endDate)}
        </span>
      </button>
      {open && (
        <Popover id="analysis-period" label="Période d’analyse" anchorRef={buttonRef} onClose={() => onOpenChange(false)} width={360}>
          <div className="p-4 pt-2 sm:pt-4">
            <PanelTitle>Période d’analyse</PanelTitle>
            <PeriodFields data={data} />
          </div>
        </Popover>
      )}
    </>
  );
}
