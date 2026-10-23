// Expert mode: top-right button + pop-up (bottom sheet on phones) listing every species (faune / flore), with a name search
// and the "suggest a missing species" form at the bottom.
import { ChevronDown, Fish, Leaf, ListTree, Search, X, type LucideIcon } from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { useSpeciesSuggestion } from '../../hooks/useSpeciesSuggestion';
import { IUCN_BADGE_CLASSES, IUCN_LABELS, KINGDOM_LABELS, isThreatened, matchesQuery } from '../../lib/species';
import type { Kingdom, SpeciesItem } from '../../types';
import { CHIP } from '../layout/Header';
import { Popover } from '../ui/Popover';
import { SuggestionForm } from './SuggestionForm';

interface Props {
  species: SpeciesItem[];
  selectedId: string | null;
  isOpen: boolean;
  onToggle: () => void;
  onSelect: (sp: SpeciesItem) => void;
}

const GROUPS: { kingdom: Kingdom; icon: LucideIcon }[] = [
  { kingdom: 'faune', icon: Fish },
  { kingdom: 'flore', icon: Leaf },
];

function SpeciesRow({ sp, isSelected, onSelect }: { sp: SpeciesItem; isSelected: boolean; onSelect: () => void }) {
  const isDecline = sp.trend === 'decline';
  return (
    <li>
      <button
        onClick={onSelect}
        aria-current={isSelected}
        className={`w-full text-left px-2.5 py-2 rounded-xl border transition-all ${
          isSelected ? 'bg-sky-700 border-sky-800 text-white' : 'bg-white border-sky-100 hover:border-sky-300 hover:bg-sky-50'
        }`}
      >
        <div className="flex items-start gap-2">
          <span
            className={`mt-0.5 w-5 h-5 rounded-full text-white text-xs font-black flex items-center justify-center shrink-0 ${isDecline ? 'bg-rose-600' : 'bg-emerald-500'}`}
            title={isDecline ? 'Impact négatif de la canicule marine' : 'Espèce favorisée par la chaleur'}
          >
            {isDecline ? '−' : '+'}
          </span>
          <div className="min-w-0 flex-1">
            <p className={`text-xs font-bold leading-tight ${isSelected ? 'text-white' : 'text-slate-900'}`}>{sp.name}</p>
            <p className={`text-[11px] italic truncate ${isSelected ? 'text-sky-100' : 'text-slate-500'}`}>{sp.scientificName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-1">
              <span
                className={`px-1.5 py-px rounded border text-[9px] font-extrabold ${IUCN_BADGE_CLASSES[sp.iucn.category]}`}
                title={`UICN : ${IUCN_LABELS[sp.iucn.category]} (${sp.iucn.scope})`}
              >
                UICN {sp.iucn.category}
              </span>
              {isThreatened(sp) && (
                <span className={`text-[9px] font-bold uppercase ${isSelected ? 'text-amber-200' : 'text-red-700'}`}>Menacée</span>
              )}
              <span className={`text-[9px] font-semibold px-1.5 py-px rounded ${isSelected ? 'bg-sky-600 text-sky-50' : 'bg-sky-50 text-sky-800'}`}>{sp.basin}</span>
              {sp.audience === 'expert' && (
                <span className={`text-[9px] font-semibold px-1.5 py-px rounded ${isSelected ? 'bg-sky-600 text-sky-50' : 'bg-slate-100 text-slate-600'}`}>Expert</span>
              )}
            </div>
          </div>
        </div>
      </button>
    </li>
  );
}

export function SpeciesCatalog({ species, selectedId, isOpen, onToggle, onSelect }: Props) {
  const [query, setQuery] = useState('');
  const suggestion = useSpeciesSuggestion();
  const filtered = useMemo(() => species.filter((sp) => matchesQuery(sp, query)), [species, query]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  return (
    <>
      <button
        ref={buttonRef}
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls="species-catalogue"
        aria-haspopup="dialog"
        className={`${CHIP} flex items-center gap-2 px-3.5 text-sm font-bold transition-colors ${
          isOpen ? '!bg-slate-800 !border-slate-900 text-white' : 'text-slate-800 hover:bg-white'
        }`}
      >
        <ListTree className={`w-4 h-4 shrink-0 ${isOpen ? 'text-sky-200' : 'text-sky-600'}`} aria-hidden="true" />
        <span className="whitespace-nowrap">
          <span className="sm:hidden">Espèces</span>
          <span className="hidden sm:inline">Catalogue des espèces</span> <span className="font-semibold opacity-70">({species.length})</span>
        </span>
        <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
      </button>

      {isOpen && (
        <Popover id="species-catalogue" label="Catalogue des espèces" anchorRef={buttonRef} onClose={onToggle} align="end" width={420} scroll={false}>
          <div className="flex-1 min-h-0 flex flex-col">
            <div className="p-3 pt-1 sm:pt-3 border-b border-sky-100 space-y-2 shrink-0">
              <label className="relative block">
                <span className="sr-only">Rechercher une espèce</span>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" aria-hidden="true" />
                <input
                  type="search"
                  maxLength={80}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Nom commun ou scientifique"
                  className="h-11 w-full bg-sky-50/70 border border-sky-200 rounded-xl pl-9 pr-11 text-sm outline-none focus:border-sky-500 focus:bg-white"
                />
                {query && (
                  <button onClick={() => setQuery('')} aria-label="Effacer la recherche" className="absolute right-0 top-0 h-11 w-11 flex items-center justify-center text-slate-400 hover:text-slate-700">
                    <X className="w-4 h-4" aria-hidden="true" />
                  </button>
                )}
              </label>
              <p className="text-[11px] text-slate-500">
                <span className="font-black text-rose-600">−</span> impact négatif de la canicule marine ·{' '}
                <span className="font-black text-emerald-600">+</span> espèce favorisée · statut Liste rouge UICN
              </p>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-3 space-y-4">
              {GROUPS.map(({ kingdom, icon: Icon }) => {
                const items = filtered.filter((sp) => sp.kingdom === kingdom);
                return (
                  <section key={kingdom} aria-label={KINGDOM_LABELS[kingdom]}>
                    <h3 className="flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider text-sky-900 mb-1.5">
                      <Icon className="w-3.5 h-3.5 text-sky-600" aria-hidden="true" /> {KINGDOM_LABELS[kingdom]}
                      <span className="text-slate-400 font-bold">({items.length})</span>
                    </h3>
                    {items.length === 0 ? (
                      <p className="text-[11px] text-slate-400 italic px-1">Aucune espèce ne correspond.</p>
                    ) : (
                      <ul className="space-y-1.5">
                        {items.map((sp) => (
                          <SpeciesRow key={sp.id} sp={sp} isSelected={sp.id === selectedId} onSelect={() => onSelect(sp)} />
                        ))}
                      </ul>
                    )}
                  </section>
                );
              })}

              <SuggestionForm form={suggestion} />
            </div>
          </div>
        </Popover>
      )}
    </>
  );
}
