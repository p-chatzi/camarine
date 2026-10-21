// Four summary tiles at the top of "Comprendre".
interface Props {
  maxAnomaly: number;
  eventCount: number;
  cellCount: number;
  dayCount: number;
  method: string;
}

export function KpiRow({ maxAnomaly, eventCount, cellCount, dayCount, method }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="bg-white border border-sky-200/80 p-4 rounded-xl shadow-2xs">
        <div className="text-xs font-semibold text-slate-500">Pic d'Anomalie de la période</div>
        <div className="text-2xl font-black text-rose-600 mt-1">+{maxAnomaly.toFixed(2)} °C</div>
        <div className="text-[11px] text-slate-500 mt-1">SST vs Climatologie historique</div>
      </div>
      <div className="bg-white border border-sky-200/80 p-4 rounded-xl shadow-2xs">
        <div className="text-xs font-semibold text-slate-500">Canicules Marines (MHW)</div>
        <div className="text-2xl font-black text-amber-600 mt-1">{eventCount}</div>
        <div className="text-[11px] text-slate-500 mt-1">Événements détectés sur la série</div>
      </div>
      <div className="bg-white border border-sky-200/80 p-4 rounded-xl shadow-2xs">
        <div className="text-xs font-semibold text-slate-500">Cellules de la carte (NRT)</div>
        <div className="text-2xl font-black text-sky-700 mt-1">{cellCount} tuiles</div>
        <div className="text-[11px] text-slate-500 mt-1">Couverture globale Copernicus</div>
      </div>
      <div className="bg-white border border-emerald-200/80 p-4 rounded-xl shadow-2xs">
        <div className="text-xs font-semibold text-slate-500">Jours analysés</div>
        <div className="text-2xl font-black text-emerald-700 mt-1">{dayCount}</div>
        <div className="text-[11px] text-slate-500 mt-1 truncate">Méthode: {method}</div>
      </div>
    </div>
  );
}
