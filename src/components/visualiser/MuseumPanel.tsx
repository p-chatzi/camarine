// "Fresque Murale" chapter buttons (museum mode only).
import { Radio } from 'lucide-react';
import { MUSEUM_SECTIONS } from '../../data/museumSections';
import type { MuseumTour } from '../../hooks/useMuseumTour';

export function MuseumPanel({ tour }: { tour: MuseumTour }) {
  return (
    <div className="w-80 sm:w-96 bg-white/95 backdrop-blur-xl border border-amber-300 rounded-2xl p-3.5 shadow-xl space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-4 h-4 text-amber-600 animate-pulse" />
          <span className="text-xs font-extrabold uppercase tracking-wider text-amber-900">Fresque Murale</span>
        </div>
        <button onClick={() => tour.setShowDrawer(!tour.showDrawer)} className="text-[11px] font-semibold text-amber-700 hover:underline">
          {tour.showDrawer ? 'Réduire' : 'Déplier'}
        </button>
      </div>
      {tour.showDrawer && (
        <>
          <p className="text-[11px] text-slate-600 leading-snug">Visite guidée avec arrêt automatique à la fin de chaque chapitre.</p>
          <div className="grid grid-cols-2 gap-2">
            {MUSEUM_SECTIONS.map((sec) => {
              const isActive = tour.section.id === sec.id;
              return (
                <button
                  key={sec.id}
                  onClick={() => tour.startSection(sec)}
                  className={`text-left p-2.5 rounded-xl border transition-all ${isActive ? 'bg-amber-50/90 border-amber-500 ring-2 ring-amber-400/40' : 'bg-white border-sky-200 hover:border-sky-400'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-gradient-to-r ${sec.color} text-white`}>#{sec.buttonNumber}</span>
                    {isActive && tour.isPlaying && <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />}
                  </div>
                  <div className="font-bold text-xs text-slate-900 line-clamp-1">{sec.title}</div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
