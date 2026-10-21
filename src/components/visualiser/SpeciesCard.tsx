// Right-side card shown when a species pin is clicked: photos, critical threshold, impact text.
import { AlertTriangle, MapPin, Volume2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useSpeciesCarousel } from '../../hooks/useSpeciesCarousel';
import type { SpeciesImage, SpeciesItem } from '../../types';

interface Props {
  species: SpeciesItem;
  images: SpeciesImage[];
  /** Year shown next to the estimated SST. */
  year: number;
  heatFactor: number;
  onClose: () => void;
  onSpeak: (text: string) => void;
  /** Extra block at the bottom (museum controls). */
  footer?: ReactNode;
}

function PhotoCarousel({ species, images, onSpeak }: Pick<Props, 'species' | 'images' | 'onSpeak'>) {
  const carousel = useSpeciesCarousel(species.id, images);
  const img = images[carousel.index];

  return (
    <div
      className="relative bg-sky-100 h-56 shrink-0 overflow-hidden group border-b border-sky-100 select-none"
      onMouseEnter={() => carousel.setIsHovering(true)}
      onMouseLeave={() => carousel.setIsHovering(false)}
    >
      <img
        key={img.src}
        src={img.src}
        alt={img.alt}
        onClick={carousel.next}
        className="w-full h-full object-cover cursor-pointer transition-transform duration-700 ease-out group-hover:scale-105"
      />
      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
        <span className="px-2.5 py-1 rounded-lg bg-white/90 backdrop-blur-md text-[10px] font-semibold text-slate-800 border border-sky-200/80 shadow-xs flex items-center gap-1 truncate max-w-[65%]">
          <MapPin className="w-3 h-3 text-sky-600 shrink-0" /> <span className="truncate">{species.locationName}</span>
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onSpeak(`${species.name}. ${species.narrationText}`);
          }}
          className="pointer-events-auto px-2.5 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-[11px] shadow-md flex items-center gap-1 transition-transform active:scale-95 shrink-0"
        >
          <Volume2 className="w-3.5 h-3.5" /> <span>Audio</span>
        </button>
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/90 via-slate-900/65 to-transparent px-3.5 pb-8 pt-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
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
      <div className="absolute bottom-2.5 inset-x-0 flex items-center justify-center gap-2 z-10">
        {images.map((image, idx) => (
          <button
            key={image.title}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              carousel.setIndex(idx);
            }}
            className={`h-2 rounded-full transition-all duration-300 shadow-xs ${idx === carousel.index ? 'w-7 bg-white ring-2 ring-sky-500/50' : 'w-2 bg-white/65 hover:bg-white'}`}
          />
        ))}
      </div>
    </div>
  );
}

export function SpeciesCard({ species, images, year, heatFactor, onClose, onSpeak, footer }: Props) {
  const isDecline = species.trend === 'decline';
  // ⚠ Linear interpolation between two hard-coded values, scaled by today's anomaly — an estimate.
  const estimatedSst = species.baseSst2015 + (species.sst2026 - species.baseSst2015) * heatFactor;

  return (
    <aside
      onClick={(e) => e.stopPropagation()}
      className="absolute top-4 right-4 bottom-4 z-30 w-[calc(100%-2rem)] sm:w-[420px] bg-white/95 backdrop-blur-xl border border-sky-200 rounded-2xl shadow-2xl shadow-sky-950/20 flex flex-col overflow-hidden animate-in fade-in slide-in-from-right-4 duration-200"
    >
      <div className="p-4 bg-gradient-to-r from-sky-50 via-cyan-50/50 to-white border-b border-sky-100 flex items-start justify-between gap-2 shrink-0">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-sky-100 text-sky-800">{species.basin}</span>
            <span
              className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${isDecline ? 'bg-rose-100 text-rose-800 border border-rose-200' : 'bg-emerald-100 text-emerald-800 border border-emerald-200'}`}
            >
              {species.trendLabel}
            </span>
          </div>
          <h2 className="text-lg font-extrabold text-slate-900 mt-1 leading-tight">{species.name}</h2>
          <p className="text-xs italic text-slate-500">{species.scientificName}</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-xl bg-sky-50 hover:bg-sky-100 text-slate-500 hover:text-slate-900 border border-sky-200/80 shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <PhotoCarousel species={species} images={images} onSpeak={onSpeak} />

      <div className="p-4 flex-1 overflow-y-auto space-y-3.5">
        <div className={`p-3 rounded-xl border ${isDecline ? 'bg-rose-50/70 border-rose-200' : 'bg-emerald-50/70 border-emerald-200'}`}>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1">
              <AlertTriangle className={`w-3.5 h-3.5 ${isDecline ? 'text-rose-600' : 'text-emerald-600'}`} /> Seuil Critique :
            </span>
            <span className="font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200 text-[11px]">
              SST {year} : {estimatedSst.toFixed(1)}°C
            </span>
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
        {footer}
      </div>
    </aside>
  );
}
