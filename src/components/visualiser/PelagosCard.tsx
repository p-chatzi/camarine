// Info card shown while the "Sanctuaire Pelagos" facade is selected: what the zone is (sourced),
// and how many Camarine species have their point inside it.
// Collapsible: folded by default on phones (< 640 px) so it doesn't hide the map and its pins.
import { ChevronDown, ExternalLink, Waves } from 'lucide-react';
import { useId, useState } from 'react';
import { PELAGOS_INFO } from '../../config';

interface Props {
  speciesInZone: number;
  /** Species pins hidden because the map is not in "Mode Impact Biologique". */
  pinsHidden: boolean;
  isLoading: boolean;
}

function startsExpanded(): boolean {
  try {
    return window.matchMedia('(min-width: 640px)').matches;
  } catch {
    return true;
  }
}

export function PelagosCard({ speciesInZone, pinsHidden, isLoading }: Props) {
  const [expanded, setExpanded] = useState(startsExpanded);
  const detailsId = useId();
  const status = isLoading
    ? 'Chargement de la zone…'
    : pinsHidden
      ? 'Activez le « Mode Impact Biologique » pour voir les espèces de la zone.'
      : `${speciesInZone} espèce${speciesInZone > 1 ? 's' : ''} de Camarine dans la zone`;

  return (
    <section
      aria-label="Sanctuaire Pelagos"
      className="pointer-events-auto min-h-0 flex flex-col w-[min(22rem,100%)] bg-white/95 backdrop-blur-xl border-2 border-teal-600/70 rounded-2xl shadow-xl text-xs text-slate-700"
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        aria-controls={detailsId}
        className="tap w-full flex items-center justify-between gap-2 px-3.5 py-2.5 text-left rounded-2xl"
      >
        <span className="min-w-0">
          <span className="flex items-center gap-1.5 text-sm font-extrabold text-teal-900">
            <Waves className="w-4 h-4 text-teal-600 shrink-0" aria-hidden="true" /> Sanctuaire Pelagos
          </span>
          <span className="block font-semibold text-teal-800" role="status">
            {status}
          </span>
        </span>
        <ChevronDown className={`w-4 h-4 shrink-0 text-teal-700 transition-transform ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
        <span className="sr-only">{expanded ? 'Replier' : 'En savoir plus'}</span>
      </button>

      {expanded && (
        <div id={detailsId} className="min-h-0 overflow-y-auto px-3.5 pb-3.5 space-y-2">
          <p className="leading-relaxed">
            Aire marine protégée pour les <strong>mammifères marins</strong>, créée par la {PELAGOS_INFO.parties}. Accord signé le{' '}
            {PELAGOS_INFO.signed}, en vigueur depuis le {PELAGOS_INFO.inForce} ; environ {PELAGOS_INFO.areaKm2.toLocaleString('fr-FR')} km², haute mer
            comprise.
          </p>
          <p className="leading-relaxed">
            <span className="font-semibold">8 espèces de cétacés régulières :</span> {PELAGOS_INFO.regularCetaceans.join(', ')}.
          </p>
          <ul className="space-y-1 text-[11px]">
            {PELAGOS_INFO.sources.map((src) => (
              <li key={src.url}>
                <a href={src.url} target="_blank" rel="noreferrer" className="inline-block py-1 text-teal-800 underline underline-offset-2 hover:text-teal-950">
                  {src.label}
                </a>
                <ExternalLink className="inline w-3 h-3 ml-0.5 text-slate-400" aria-hidden="true" />
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
