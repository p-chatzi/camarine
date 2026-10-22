// Bottom-left legend of the map.
export function MapLegend() {
  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="camarine-legend absolute bottom-7 sm:bottom-8 left-3 sm:left-4 z-30 max-w-[calc(100%-5rem)] bg-white/95 backdrop-blur-md border border-sky-200 rounded-xl px-3 py-2 text-[11px] flex flex-wrap items-center gap-3 shadow-md"
    >
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-rose-600 text-white font-bold flex items-center justify-center text-xs">−</span>
        <span className="text-slate-700 font-medium">Disparaît</span>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="w-4 h-4 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs">+</span>
        <span className="text-slate-700 font-medium">Prolifère</span>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 border-l border-sky-200 pl-3">
        <span className="text-slate-500 font-semibold">SST raster :</span>
        <span className="text-[10px] font-mono text-sky-700">16°C</span>
        <div className="w-24 h-2.5 rounded-full bg-gradient-to-r from-sky-400 via-amber-400 to-rose-700 border border-slate-200" />
        <span className="text-[10px] font-mono text-rose-700 font-bold">29°C+</span>
      </div>
    </div>
  );
}
