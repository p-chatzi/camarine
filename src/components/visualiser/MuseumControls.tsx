// Play / pause / next controls shown inside the species card during the museum tour.
import { Pause, Play, SkipForward } from 'lucide-react';
import type { MuseumTour } from '../../hooks/useMuseumTour';

export function MuseumControls({ tour }: { tour: MuseumTour }) {
  return (
    <div className="p-3 rounded-xl bg-amber-50 border border-amber-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-amber-900 truncate">{tour.section.title}</span>
        <span className="text-[11px] font-semibold text-amber-700 shrink-0 ml-2">
          {tour.stepIndex + 1} / {tour.section.speciesIds.length}
        </span>
      </div>
      {tour.isSectionDone ? (
        <div className="p-2 rounded-lg bg-white border border-amber-300 text-[11px] text-amber-900 flex items-center justify-between gap-2">
          <span>
            ⏸️ <strong>Chapitre terminé.</strong> Choisissez un autre bouton de fresque !
          </span>
          <button onClick={() => tour.startSection(tour.section)} className="px-2 py-1 rounded bg-amber-500 text-white font-bold shrink-0">
            Rejouer
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <button
            onClick={() => tour.setIsPlaying(!tour.isPlaying)}
            className="flex-1 py-1.5 px-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-bold text-xs flex items-center justify-center gap-1"
          >
            {tour.isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Lecture
              </>
            )}
          </button>
          <button
            onClick={tour.next}
            className="py-1.5 px-2.5 rounded-lg bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-semibold flex items-center gap-1"
          >
            <span>Suivant</span> <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
