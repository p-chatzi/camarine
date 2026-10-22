// Top bar: logo, the 3 tabs and the expert-mode toggle.
// Phones: logo + expert toggle on one row, the 3 tabs full width on a second row.
// (Ambient sound and voice-over were removed on 22/10/2026: the audio guide comes later.)
import { BookOpen, Compass, FlaskConical, Share2, Waves, type LucideIcon } from 'lucide-react';
import { DATA_SOURCES } from '../../data/metadata';
import type { AppMode } from '../../types';

const TABS: { mode: AppMode; number: string; label: string; icon: LucideIcon; activeClass: string }[] = [
  { mode: 'visualiser', number: '1.', label: 'Visualiser', icon: Compass, activeClass: 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm shadow-sky-600/25' },
  { mode: 'comprendre', number: '2.', label: 'Comprendre', icon: BookOpen, activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/25' },
  { mode: 'partager', number: '3.', label: 'Partager', icon: Share2, activeClass: 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm shadow-indigo-600/25' },
];

interface Props {
  mode: AppMode;
  onChangeMode: (mode: AppMode) => void;
  /** Expert mode shows source metadata and raw telemetry. */
  expert: boolean;
  onToggleExpert: () => void;
}

export function Header({ mode, onChangeMode, expert, onToggleExpert }: Props) {
  return (
    <header className="shrink-0 z-40 backdrop-blur-xl bg-white/95 border-b border-sky-200/80 px-3 sm:px-4 lg:px-6 py-2 sm:py-2.5 shadow-xs">
      <div className="w-full flex flex-wrap items-center justify-between gap-x-3 gap-y-2">
        <div className="order-1 flex items-center gap-2.5 sm:gap-3 min-w-0">
          <div className="w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-sky-500/25">
            <Waves className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg font-extrabold tracking-tight bg-gradient-to-r from-sky-900 via-cyan-800 to-teal-700 bg-clip-text text-transparent leading-tight">
              Camarine
            </h1>
            <p className="text-[11px] text-slate-500 truncate">
              Sentinelle des Canicules Marines
              {expert && <span className="hidden xl:inline"> • Données {DATA_SOURCES.product}</span>}
            </p>
          </div>
        </div>

        <nav aria-label="Sections" className="order-3 md:order-2 w-full md:w-auto grid grid-cols-3 md:flex md:items-center bg-sky-100/80 p-1 rounded-xl border border-sky-200/80 shadow-inner gap-1">
          {TABS.map(({ mode: tabMode, number, label, icon: Icon, activeClass }) => (
            <button
              key={tabMode}
              onClick={() => onChangeMode(tabMode)}
              aria-current={mode === tabMode ? 'page' : undefined}
              className={`tap flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                mode === tabMode ? activeClass : 'text-slate-600 hover:text-sky-950 hover:bg-white/60'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>
                <span className="hidden sm:inline">{number} </span>
                {label}
              </span>
            </button>
          ))}
        </nav>

        <div className="order-2 md:order-3 flex items-center gap-2">
          <button
            onClick={onToggleExpert}
            aria-pressed={expert}
            aria-label="Mode expert"
            title="Mode expert : sources, télémétrie brute et catalogue des espèces"
            className={`tap flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              expert ? 'bg-slate-800 border-slate-900 text-white' : 'bg-white border-sky-200 text-slate-600 hover:bg-sky-50 hover:text-sky-900'
            }`}
          >
            <FlaskConical className="w-4 h-4" aria-hidden="true" />
            <span className="hidden lg:inline">Mode expert</span>
          </button>
        </div>
      </div>
    </header>
  );
}
