// Content of the "Façades" pop-up (bottom sheet on phones): basin filter, map type, species trend,
// satellite raster. The pop-up itself (position, focus, Escape) is ui/Popover.
import { ChevronRight, Compass, Layers, Thermometer, X } from 'lucide-react';
import { DATA_SOURCES } from '../../data/metadata';
import type { MapSettings } from '../../hooks/useMapSettings';
import { speciesForMode } from '../../lib/species';
import type { BasinFilter } from '../../types';

const BASIN_OPTIONS: { id: BasinFilter; label: string }[] = [
  { id: 'Tous', label: '🇫🇷 Toutes les façades (France)' },
  { id: 'Méditerranée', label: '🌊 Méditerranée' },
  { id: 'Atlantique', label: '🌊 Atlantique & Bretagne' },
  { id: 'Manche', label: '🌊 Manche' },
  { id: 'Pelagos', label: '🐋 Sanctuaire Pelagos' },
];

interface Props {
  settings: MapSettings;
  onClose: () => void;
}

export function FilterPanel({ settings: s, onClose }: Props) {
  return (
    <div className="p-4 pt-2 sm:pt-4 space-y-4">
      <div className="flex items-center justify-between border-b border-sky-100 pb-2.5">
        <span className="text-xs font-extrabold uppercase tracking-wider text-sky-900 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-sky-600" aria-hidden="true" /> Façades & affichage
        </span>
        <button onClick={onClose} aria-label="Fermer les filtres" className="tap -m-1 p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-sky-50 flex items-center justify-center">
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>

      {/* Basin */}
      <div className="space-y-1.5">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Filtrer par Façade</h3>
        <div className="grid grid-cols-1 gap-1.5">
          {BASIN_OPTIONS.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                s.setBasin(item.id);
                // Pelagos = "show me the species in the zone": make sure the pins are displayed.
                if (item.id === 'Pelagos' && s.dataType !== 'impact') s.setDataType('impact');
              }}
              aria-pressed={s.basin === item.id}
              className={`tap w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-between ${s.basin === item.id ? 'bg-sky-600 text-white shadow-xs' : 'bg-sky-50/80 text-slate-700 hover:bg-sky-100 border border-sky-200/60'}`}
            >
              <span>{item.label}</span>
              {s.basin === item.id && <ChevronRight className="w-3.5 h-3.5" />}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-2 border-t border-sky-100 space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Les différents types de cartes</h3>

        {/* Pixels on/off (+ data sources button in expert mode) */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => s.setShowThermalOverlay(!s.showThermalOverlay)}
            className={`tap flex-1 px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${s.showThermalOverlay ? 'bg-gradient-to-r from-orange-50 to-rose-100 border-rose-300 text-rose-800' : 'bg-sky-50 border-sky-200 text-slate-600'}`}
          >
            <Thermometer className="w-4 h-4 text-rose-600" /> <span>Pixels NRT : {s.showThermalOverlay ? 'ON' : 'OFF'}</span>
          </button>
          {s.expert && (
            <button onClick={() => s.setShowSourceInfo(!s.showSourceInfo)} title="Sources des données" className="tap ml-1.5 p-2 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 hover:bg-sky-100">
              <Layers className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Map data type */}
        {s.showThermalOverlay && (
          <div className="flex flex-col gap-1.5 bg-slate-100 p-1.5 rounded-xl border border-slate-200 text-[11px] font-bold shadow-inner">
            <div className="flex items-center gap-1">
              <button
                onClick={() => s.setDataType('sst')}
                className={`tap flex-1 py-1.5 rounded-lg transition-all ${s.dataType === 'sst' ? 'bg-white text-sky-700 shadow-sm border border-slate-200' : 'text-slate-500 hover:text-slate-800'}`}
              >
                🌡️ SST Brute
              </button>
              <button
                onClick={() => s.setDataType('mhw')}
                className={`tap flex-1 py-1.5 rounded-lg transition-all ${s.dataType === 'mhw' ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/30' : 'text-slate-500 hover:text-rose-600'}`}
              >
                🔥 Canicule
              </button>
            </div>
            <button
              onClick={() => s.setDataType(s.dataType === 'impact' ? 'sst' : 'impact')}
              className={`tap w-full py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                s.dataType === 'impact' ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md' : 'text-slate-500 hover:text-purple-600 hover:bg-slate-200/50'
              }`}
            >
              <span>🐙 Mode Impact Biologique</span>
            </button>
          </div>
        )}

        {/* Species trend (impact mode only) */}
        {s.dataType === 'impact' && (
          <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-200">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block">Les espèces impactées</h3>
            <div className="grid grid-cols-1 gap-1.5">
              <button
                onClick={() => s.setTrend('Tous')}
                className={`tap px-3 py-2 rounded-xl text-xs font-semibold text-left transition-all ${s.trend === 'Tous' ? 'bg-slate-800 text-white' : 'bg-sky-50/80 text-slate-600 hover:bg-sky-100 border border-sky-200/60'}`}
              >
                Toutes les espèces ({speciesForMode(s.expert).length})
              </button>
              <button
                onClick={() => s.setTrend('decline')}
                className={`tap px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${s.trend === 'decline' ? 'bg-rose-600 text-white shadow-xs' : 'bg-rose-50 text-rose-800 border border-rose-200 hover:bg-rose-100'}`}
              >
                <span className="w-4 h-4 rounded-full bg-rose-700 text-white font-bold flex items-center justify-center text-xs">−</span>
                <span>Disparaît / En déclin</span>
              </button>
              <button
                onClick={() => s.setTrend('proliferate')}
                className={`tap px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${s.trend === 'proliferate' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100'}`}
              >
                <span className="w-4 h-4 rounded-full bg-emerald-700 text-white font-bold flex items-center justify-center text-xs">+</span>
                <span>Apparaît / Prolifère</span>
              </button>
            </div>
          </div>
        )}

        {/* Satellite raster + base map */}
        <button
          onClick={() => s.setShowSatelliteRaster(!s.showSatelliteRaster)}
          className={`tap w-full px-3 py-2 rounded-xl text-xs font-semibold border flex items-center justify-center gap-2 transition-all ${s.showSatelliteRaster ? 'bg-indigo-600 text-white border-indigo-700' : 'bg-sky-50 border-sky-200 text-slate-700 hover:bg-sky-100'}`}
        >
          <span>🛰️ Raster Satellite SST L4 : {s.showSatelliteRaster ? 'ACTIF' : 'OFF'}</span>
        </button>
        {s.expert && s.showSourceInfo && (
          <div className="p-2.5 rounded-xl bg-sky-50 border border-sky-200 text-[10px] text-slate-600 leading-relaxed space-y-0.5">
            <strong className="text-sky-900 block">{DATA_SOURCES.provider}</strong>
            <code className="text-rose-700 block">{DATA_SOURCES.reprocessed}</code>
            <code className="text-rose-700 block">{DATA_SOURCES.nearRealTime}</code>
            <span className="block">Climatologie {DATA_SOURCES.climatology} • {DATA_SOURCES.method}</span>
          </div>
        )}
      </div>
    </div>
  );
}
