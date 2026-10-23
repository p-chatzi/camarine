// Top bar: logo, the 3 sections and the expert-mode toggle, as floating chips (no background band).
// - Visualiser: floats over the map (overlay), the map is the only background.
// - Comprendre / Partager: same chips, in the page flow.
// - Below 768 px the 3 sections fold into one "current section ▾" button (bottom sheet on phones).
// (Ambient sound and voice-over were removed on 22/10/2026: the audio guide comes later.)
import { BookOpen, Check, ChevronDown, Compass, FlaskConical, Share2, Waves, type LucideIcon } from 'lucide-react';
import { useRef, useState } from 'react';
import { DATA_SOURCES } from '../../data/metadata';
import type { AppMode } from '../../types';
import { Popover } from '../ui/Popover';

const TABS: { mode: AppMode; label: string; hint: string; icon: LucideIcon; activeClass: string }[] = [
  { mode: 'visualiser', label: 'Visualiser', hint: 'La carte des températures et des espèces', icon: Compass, activeClass: 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm shadow-sky-600/25' },
  { mode: 'comprendre', label: 'Comprendre', hint: 'Les canicules marines depuis 1982, la méthode', icon: BookOpen, activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/25' },
  { mode: 'partager', label: 'Partager', hint: 'Exporter les données, échanger', icon: Share2, activeClass: 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm shadow-indigo-600/25' },
];

/** Shared look of every floating chip (header, map tools): glass, 44 px high. */
export const CHIP = 'pointer-events-auto h-11 bg-white/92 backdrop-blur-md border border-sky-200/80 shadow-lg shadow-sky-950/10 rounded-2xl';

interface Props {
  mode: AppMode;
  onChangeMode: (mode: AppMode) => void;
  /** Expert mode shows source metadata and raw telemetry. */
  expert: boolean;
  onToggleExpert: () => void;
  /** true: floats over the map (Visualiser). */
  overlay: boolean;
}

function Logo() {
  return (
    <div className="w-8 h-8 shrink-0 rounded-xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-sky-500/25">
      <Waves className="w-[18px] h-[18px] text-white" aria-hidden="true" />
    </div>
  );
}

function SectionMenu({ mode, onChangeMode, expert }: Pick<Props, 'mode' | 'onChangeMode' | 'expert'>) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const current = TABS.find((t) => t.mode === mode) ?? TABS[0];
  const CurrentIcon = current.icon;

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-controls="section-menu"
        aria-haspopup="dialog"
        aria-label={`Section : ${current.label}. Changer de section`}
        className={`hit-44 h-9 flex items-center gap-1.5 pl-2.5 pr-2 rounded-xl text-sm font-bold ${current.activeClass}`}
      >
        <CurrentIcon className="w-4 h-4 shrink-0" aria-hidden="true" />
        <span>{current.label}</span>
        <ChevronDown className={`w-4 h-4 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>
      {open && (
        <Popover id="section-menu" label="Sections de Camarine" anchorRef={buttonRef} onClose={() => setOpen(false)} width={300}>
          <div className="p-3 pt-1 sm:pt-3">
            <p className="px-2 pb-2 text-xs text-slate-500">
              <span className="block text-sm font-extrabold text-sky-950">Camarine</span>
              Sentinelle des Canicules Marines
              {expert && <span className="block">Données {DATA_SOURCES.product}</span>}
            </p>
            <ul className="space-y-1.5">
              {TABS.map(({ mode: tabMode, label, hint, icon: Icon }) => {
                const active = tabMode === mode;
                return (
                  <li key={tabMode}>
                    <button
                      onClick={() => {
                        onChangeMode(tabMode);
                        setOpen(false);
                      }}
                      aria-current={active ? 'page' : undefined}
                      className={`w-full min-h-14 flex items-center gap-3 px-3 py-2 rounded-2xl text-left border transition-colors ${
                        active ? 'bg-sky-50 border-sky-300' : 'border-transparent hover:bg-sky-50/70'
                      }`}
                    >
                      <Icon className="w-5 h-5 text-sky-700 shrink-0" aria-hidden="true" />
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-bold text-slate-900">{label}</span>
                        <span className="block text-xs text-slate-500">{hint}</span>
                      </span>
                      {active && <Check className="w-4 h-4 text-sky-700 shrink-0" aria-hidden="true" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        </Popover>
      )}
    </>
  );
}

export function Header({ mode, onChangeMode, expert, onToggleExpert, overlay }: Props) {
  return (
    <header
      className={`${overlay ? 'absolute top-0 inset-x-0' : 'relative shrink-0'} z-40 pointer-events-none p-3 flex items-center justify-between gap-2`}
    >
      <div className={`${CHIP} min-w-0 flex items-center gap-2 pl-1.5 pr-1`}>
        <Logo />
        <div className="hidden lg:block min-w-0 pr-1">
          <h1 className="text-sm font-extrabold tracking-tight text-sky-950 leading-tight">Camarine</h1>
          <p className="text-[11px] text-slate-500 truncate leading-tight">
            Sentinelle des Canicules Marines
            {expert && <span className="hidden 2xl:inline"> • Données {DATA_SOURCES.product}</span>}
          </p>
        </div>
        <h1 className="sr-only lg:hidden">Camarine, sentinelle des canicules marines</h1>

        <div className="md:hidden">
          <SectionMenu mode={mode} onChangeMode={onChangeMode} expert={expert} />
        </div>
        <nav aria-label="Sections" className="hidden md:flex items-center gap-1">
          {TABS.map(({ mode: tabMode, label, icon: Icon, activeClass }) => (
            <button
              key={tabMode}
              onClick={() => onChangeMode(tabMode)}
              aria-current={mode === tabMode ? 'page' : undefined}
              className={`hit-44 h-9 flex items-center gap-1.5 px-3 rounded-xl text-sm font-semibold transition-all ${
                mode === tabMode ? activeClass : 'text-slate-600 hover:text-sky-950 hover:bg-sky-100/70'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <button
        onClick={onToggleExpert}
        aria-pressed={expert}
        aria-label="Mode expert"
        title="Mode expert : sources, télémétrie brute et catalogue des espèces"
        className={`${CHIP} shrink-0 min-w-11 flex items-center justify-center gap-1.5 px-3 text-sm font-semibold transition-colors ${
          expert ? '!bg-slate-800 !border-slate-900 text-white' : 'text-slate-700 hover:bg-white hover:text-sky-900'
        }`}
      >
        <FlaskConical className="w-4 h-4" aria-hidden="true" />
        <span className="hidden lg:inline">Mode expert</span>
      </button>
    </header>
  );
}
