// Map legend, a chip of the bottom-left cluster (next to the date). Colour scale from 640 px.
import { CHIP } from '../layout/Header';

export function MapLegend() {
  return (
    <div className={`${CHIP} camarine-legend flex items-center gap-3 px-3 text-xs`} role="note" aria-label="Légende de la carte">
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs" aria-hidden="true">
          −
        </span>
        <span className="text-slate-700 font-medium">Disparaît</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs" aria-hidden="true">
          +
        </span>
        <span className="text-slate-700 font-medium">Prolifère</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 border-l border-sky-200 pl-3">
        <span className="text-slate-500 font-semibold">SST</span>
        <span className="text-[10px] font-mono text-sky-700">16°C</span>
        <div className="w-20 h-2.5 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-700 border border-slate-200" aria-hidden="true" />
        <span className="text-[10px] font-mono text-rose-700 font-bold">29°C+</span>
      </div>
    </div>
  );
}
