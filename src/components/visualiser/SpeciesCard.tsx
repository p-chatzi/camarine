// Right-side card shown when a species pin is clicked: photos, critical threshold, impact text,
// then the species sheet (group, IUCN status, habitat, role, sources).
import { AlertTriangle, ArrowLeft, BookOpen, ExternalLink, ImageOff, MapPin, X } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import { useSpeciesCarousel } from '../../hooks/useSpeciesCarousel';
import { HEAT_EVIDENCE_LABELS, IUCN_BADGE_CLASSES, IUCN_LABELS, KINGDOM_LABELS } from '../../lib/species';
import type { SpeciesImage, SpeciesItem } from '../../types';

interface Props {
  species: SpeciesItem;
  images: SpeciesImage[];
  imagesLoading: boolean;
  /** Year shown next to the estimated SST. */
  year: number;
  heatFactor: number;
  onClose: () => void;
  /** Expert mode: "back to catalogue" link in the header. */
  onBack?: () => void;
}

function PhotoPlaceholder({ isLoading }: { isLoading: boolean }) {
  return (
    <div className="relative bg-gradient-to-br from-sky-100 via-cyan-50 to-teal-100 h-44 sm:h-56 shrink-0 border-b border-sky-100 flex flex-col items-center justify-center gap-2 text-sky-800">
      {isLoading ? (
        <div className="w-7 h-7 border-4 border-sky-200 border-t-sky-600 rounded-full animate-spin" />
      ) : (
        <>
          <ImageOff className="w-7 h-7 text-sky-500" />
          <span className="text-xs font-semibold">Photo à venir</span>
        </>
      )}
    </div>
  );
}

function PhotoCarousel({ species, images }: Pick<Props, 'species' | 'images'>) {
  const carousel = useSpeciesCarousel(species.id, images);
  const img = images[carousel.index] ?? images[0];

  return (
    <div
      className="relative bg-sky-100 h-44 sm:h-56 shrink-0 overflow-hidden group border-b border-sky-100 select-none"
      onMouseEnter={() => carousel.setIsHovering(true)}
      onMouseLeave={() => carousel.setIsHovering(false)}
    >
      <img
        key={img.src}
        src={img.src}
        alt={img.alt}
        onError={(e) => (e.currentTarget.style.visibility = 'hidden')} // broken link: keep the blue background, not the alt text
        onClick={carousel.next}
        className="w-full h-full object-cover cursor-pointer transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-semibold text-slate-800 border border-sky-200/80 shadow-xs flex items-center gap-1 truncate max-w-[65%]">
          <MapPin className="w-3 h-3 text-sky-600 shrink-0" /> <span className="truncate">{species.locationName}</span>
        </span>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-900/65 to-transparent px-3.5 pb-8 pt-10 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-300 pointer-events-none">
        <p className="text-xs font-semibold text-white leading-snug drop-shadow-xs">{img.alt}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[10px] text-sky-100 pointer-events-auto">
          <span>Photo :</span>
          <a
            href={`https://commons.wikimedia.org/wiki/${encodeURIComponent(`File:${img.title}`)}`}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="underline decoration-sky-300/70 underline-offset-2 hover:text-white"
          >
            {img.artist}
          </a>
          <span aria-hidden="true">·</span>
          <span>{img.license}</span>
        </div>
      </div>
      {images.length > 1 && (
        <div className="absolute bottom-0.5 inset-x-0 flex items-center justify-center z-10">
          {images.map((image, idx) => (
            <button
              key={image.title}
              type="button"
              aria-label={`Photo ${idx + 1} sur ${images.length}`}
              aria-current={idx === carousel.index}
              onClick={(e) => {
                e.stopPropagation();
                carousel.setIndex(idx);
              }}
              className="tap group/dot min-w-6 min-h-6 px-1 flex items-center justify-center"
            >
              <span
                aria-hidden="true"
                className={`block h-2 rounded-full transition-all duration-300 shadow-xs ${idx === carousel.index ? 'w-7 bg-white ring-2 ring-sky-500/50' : 'w-2 bg-white/65 group-hover/dot:bg-white'}`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Demanded placeholder between the photos and the critical threshold: content is still a draft. */
function DraftNotice() {
  return (
    <div className="px-3 py-2 rounded-xl border border-dashed border-amber-400 bg-amber-50 text-[11px] text-amber-900 flex items-center gap-2">
      <span className="px-1.5 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold uppercase tracking-wider text-[9px]">Placeholder</span>
      <span className="font-semibold">[ À titre indicatif - étude en cours ]</span>
    </div>
  );
}

function SheetRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7.5rem_1fr] gap-2 py-1.5 border-b border-sky-100 last:border-b-0">
      <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-500 pt-0.5">{label}</dt>
      <dd className="text-xs text-slate-800 leading-relaxed">{children}</dd>
    </div>
  );
}

function SpeciesSheet({ species }: { species: SpeciesItem }) {
  const isDecline = species.trend === 'decline';
  const { iucn } = species;
  return (
    <section className="space-y-1">
      <h3 className="text-[11px] font-bold uppercase tracking-wider text-sky-700 flex items-center gap-1.5">
        <BookOpen className="w-3.5 h-3.5" /> Fiche espèce
      </h3>
      <dl className="rounded-xl border border-sky-100 bg-sky-50/40 px-3">
        <SheetRow label="Groupe">{KINGDOM_LABELS[species.kingdom]}</SheetRow>
        <SheetRow label="Impact négatif de la canicule ?">
          <span className={`font-bold ${isDecline ? 'text-rose-700' : 'text-emerald-700'}`}>
            {isDecline ? 'Oui — espèce en déclin' : 'Non — espèce favorisée (prolifère)'}
          </span>
          <span className="block text-[11px] text-slate-500">{HEAT_EVIDENCE_LABELS[species.heatEvidence]}</span>
        </SheetRow>
        <SheetRow label="Statut UICN">
          <span className="flex flex-wrap items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded border text-[10px] font-extrabold ${IUCN_BADGE_CLASSES[iucn.category]}`}>{iucn.category}</span>
            <span className="font-semibold">{IUCN_LABELS[iucn.category]}</span>
          </span>
          <span className="block text-[11px] text-slate-500">
            {iucn.scope}
            {iucn.year ? ` · ${iucn.year}` : ''}
            {iucn.url && (
              <>
                {' · '}
                <a href={iucn.url} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-2 hover:text-sky-900">
                  voir l’évaluation
                </a>
              </>
            )}
          </span>
        </SheetRow>
        <SheetRow label="Zone de prédilection">{species.habitat}</SheetRow>
        <SheetRow label="Rôle & importance">{species.role}</SheetRow>
      </dl>
      <div className="pt-1.5">
        <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Sources</h4>
        <ol className="space-y-1 list-decimal list-inside text-[11px] text-slate-700">
          {species.sources.map((src) => (
            <li key={src.url}>
              <a href={src.url} target="_blank" rel="noreferrer" className="inline-block py-1 text-sky-700 hover:text-sky-900 underline underline-offset-2 decoration-sky-300">
                {src.label}
              </a>
              <ExternalLink className="inline w-3 h-3 ml-0.5 text-slate-400" />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function SpeciesCard({ species, images, imagesLoading, year, heatFactor, onClose, onBack }: Props) {
  const isDecline = species.trend === 'decline';
  // ⚠ Linear interpolation between two hard-coded values, scaled by today's anomaly — an estimate.
  // Only the species from the hackathon have these values; the badge is hidden for the others.
  const hasLegacySst = species.baseSst2015 !== undefined && species.sst2026 !== undefined;
  const estimatedSst = hasLegacySst ? species.baseSst2015! + (species.sst2026! - species.baseSst2015!) * heatFactor : null;

  // Keyboard / screen readers: move focus into the card when it opens, give it back when it closes.
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    titleRef.current?.focus({ preventScroll: true });
    return () => {
      // Pins are re-created when the selection changes: fall back to the new pin of this species.
      const target = previous?.isConnected
        ? previous
        : document.querySelector<HTMLElement>(`.leaflet-marker-icon[aria-label^="${CSS.escape(species.name)} ("]`);
      target?.focus({ preventScroll: true });
    };
  }, [species.id]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    // Phones: bottom sheet over 60 % of the map (SPECIES_SHEET_RATIO in config.ts), the species stays
    // visible above it. ≥ 640 px: panel on the right (420 px).
    <aside
      onClick={(e) => e.stopPropagation()}
      aria-labelledby="species-card-title"
      className="absolute inset-x-0 bottom-0 h-[60%] rounded-t-2xl sm:inset-x-auto sm:top-4 sm:right-4 sm:bottom-4 sm:h-auto sm:w-[420px] sm:rounded-2xl z-30 bg-white/95 backdrop-blur-xl border border-sky-200 shadow-2xl shadow-sky-950/20 flex flex-col overflow-hidden"
    >
      <div className="p-4 bg-gradient-to-r from-sky-50 via-cyan-50/50 to-white border-b border-sky-100 flex items-start justify-between gap-2 shrink-0">
        <div>
          {onBack && (
            <button onClick={onBack} className="tap -ml-1 px-1 mb-1 flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-950 rounded-md">
              <ArrowLeft className="w-3.5 h-3.5" /> Catalogue des espèces
            </button>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800">{species.basin}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-700">{KINGDOM_LABELS[species.kingdom]}</span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isDecline ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}
            >
              {species.trendLabel}
            </span>
          </div>
          <h2 id="species-card-title" ref={titleRef} tabIndex={-1} className="text-lg font-extrabold text-slate-900 mt-1 leading-tight">{species.name}</h2>
          <p className="text-xs italic text-slate-500">{species.scientificName}</p>
        </div>
        <button onClick={onClose} aria-label="Fermer la fiche" className="tap flex items-center justify-center p-2 rounded-xl bg-sky-50 hover:bg-sky-100 text-slate-500 hover:text-slate-900 border border-sky-200/80 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Photos + text scroll together: on a phone bottom sheet there is no room for a fixed photo. */}
      <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
        {images.length > 0 ? (
          <PhotoCarousel species={species} images={images} />
        ) : (
          <PhotoPlaceholder isLoading={imagesLoading} />
        )}

        <div className="p-4 space-y-3.5">
          <DraftNotice />
          <div className={`p-3 rounded-xl border ${isDecline ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
                <AlertTriangle className={`w-3.5 h-3.5 ${isDecline ? 'text-rose-600' : 'text-emerald-600'}`} /> Seuil Critique :
              </span>
              {estimatedSst !== null && (
                <span className="font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                  SST {year} : {estimatedSst.toFixed(1)}°C
                </span>
              )}
            </div>
            <p className="text-xs font-bold text-slate-900">{species.criticalThreshold}</p>
            <p className="text-[11px] text-slate-600 mt-1">
              Terrain : <span className="font-semibold text-slate-800">{species.mortalityRate}</span>
            </p>
          </div>
          <div className="space-y-1">
            <h3 className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Effet de la canicule marine</h3>
            <p className="text-xs text-slate-700 leading-relaxed">{species.impactDetails}</p>
          </div>
          <SpeciesSheet species={species} />
        </div>
      </div>
    </aside>
  );
}
