// Top bar: logo, the 3 tabs, ambient sound and voice-over toggles.
import { BookOpen, Compass, FlaskConical, Mic, Share2, Volume2, VolumeX, Waves, type LucideIcon } from 'lucide-react';
import type { AudioControls } from '../../hooks/useAudio';
import { DATA_SOURCES } from '../../data/metadata';
import type { AppMode } from '../../types';

const TABS: { mode: AppMode; label: string; icon: LucideIcon; activeClass: string }[] = [
  { mode: 'visualiser', label: '1. Visualiser', icon: Compass, activeClass: 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-sm shadow-sky-600/25' },
  { mode: 'comprendre', label: '2. Comprendre', icon: BookOpen, activeClass: 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm shadow-orange-500/25' },
  { mode: 'partager', label: '3. Partager', icon: Share2, activeClass: 'bg-gradient-to-r from-indigo-600 to-sky-600 text-white shadow-sm shadow-indigo-600/25' },
];

interface Props {
  mode: AppMode;
  onChangeMode: (mode: AppMode) => void;
  audio: AudioControls;
  /** Expert mode shows source metadata and raw telemetry. */
  expert: boolean;
  onToggleExpert: () => void;
}

export function Header({ mode, onChangeMode, audio, expert, onToggleExpert }: Props) {
  return (
    <header className="shrink-0 z-40 backdrop-blur-xl bg-white/95 border-b border-sky-200/80 px-4 lg:px-6 py-2.5 shadow-xs">
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-500 via-cyan-500 to-teal-500 flex items-center justify-center shadow-sm shadow-sky-500/25">
            <Waves className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base md:text-lg font-extrabold tracking-tight bg-gradient-to-r from-sky-900 via-cyan-800 to-teal-700 bg-clip-text text-transparent">
              Camarine
            </h1>
            {expert && (
              <p className="text-[11px] text-slate-500 hidden xl:block">
                Sentinelle des Canicules Marines • Données {DATA_SOURCES.product}
              </p>
            )}
          </div>
        </div>

        <nav className="flex items-center bg-sky-100/80 p-1 rounded-xl border border-sky-200/80 shadow-inner">
          {TABS.map(({ mode: tabMode, label, icon: Icon, activeClass }) => (
            <button
              key={tabMode}
              onClick={() => onChangeMode(tabMode)}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs md:text-sm font-semibold transition-all ${
                mode === tabMode ? activeClass : 'text-slate-600 hover:text-sky-950 hover:bg-white/60'
              }`}
            >
              <Icon className="w-4 h-4" /> <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleExpert}
            aria-pressed={expert}
            title="Afficher les sources et la télémétrie brute"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              expert ? 'bg-slate-800 border-slate-900 text-white' : 'bg-white border-sky-200 text-slate-600 hover:bg-sky-50 hover:text-sky-900'
            }`}
          >
            <FlaskConical className="w-4 h-4" />
            <span className="hidden md:inline">Mode expert</span>
          </button>
          <button
            onClick={audio.toggleAmbient}
            title="Activer/Désactiver l'ambiance sonore sous-marine"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              audio.ambientOn ? 'bg-cyan-100 border-cyan-400 text-cyan-900 shadow-xs' : 'bg-white border-sky-200 text-slate-600 hover:bg-sky-50 hover:text-sky-900'
            }`}
          >
            {audio.ambientOn ? <Volume2 className="w-4 h-4 text-cyan-600 animate-pulse" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden md:inline">{audio.ambientOn ? 'Son Mer ON' : 'Ambiance Mer'}</span>
          </button>
          <button
            onClick={audio.toggleVoice}
            title="Activer/Désactiver la voix off française"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
              audio.voiceOn ? 'bg-amber-100 border-amber-300 text-amber-900' : 'bg-white border-sky-200 text-slate-600 hover:bg-sky-50 hover:text-sky-900'
            }`}
          >
            <Mic className={`w-4 h-4 ${audio.isSpeaking ? 'text-amber-600 animate-bounce' : ''}`} />
            <span className="hidden md:inline">{audio.voiceOn ? 'Voix Off FR' : 'Voix Off Muet'}</span>
          </button>
        </div>
      </div>
    </header>
  );
}
