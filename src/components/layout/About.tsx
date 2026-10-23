// "À propos" panel: how Camarine was born (Ocean Hackathon® Toulon 2026), the team, credits.
// Opened from the logo in the header and from the section menu. Facts are sourced (links below,
// see also README.md → Provenance).
import { ExternalLink } from 'lucide-react';
import type { ReactNode } from 'react';

const LINKS = {
  teamRepo: 'https://github.com/maelritouet/OCEAN-HACKATON',
  repo: 'https://github.com/p-chatzi/camarine',
  toulon: 'https://toulon.fr/agenda/ocean-hackathonr-toulon',
  oceanHackathon: 'https://openagenda.com/en/cluster-sequoia/events/98976977_ocean-hackathonr-2026',
};

const CREDITS: { label: string; detail: string; url: string }[] = [
  { label: 'Copernicus Marine Service', detail: 'températures de surface de la mer (SST), 1982 → aujourd’hui', url: 'https://marine.copernicus.eu/' },
  { label: 'IGN – Admin Express', detail: 'contour de la France (Licence Ouverte), via france-geojson', url: 'https://github.com/gregoiredavid/france-geojson' },
  { label: 'Esri World Ocean Base', detail: 'fond de carte', url: 'https://www.esri.com/' },
  { label: 'Natural Earth', detail: 'trait de côte utilisé pour la zone Pelagos', url: 'https://www.naturalearthdata.com/' },
  { label: 'Wikimedia Commons', detail: 'photos des espèces (auteur et licence sur chaque photo)', url: 'https://commons.wikimedia.org/' },
  { label: 'Leaflet, React, Recharts', detail: 'logiciels libres de la carte et des graphiques', url: 'https://leafletjs.com/' },
];

function A({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer" className="text-sky-700 underline underline-offset-2 hover:text-sky-950">
      {children}
      <ExternalLink className="inline w-3 h-3 ml-0.5 -mt-0.5 text-slate-400" aria-hidden="true" />
    </a>
  );
}

export function AboutContent() {
  return (
    <div className="p-4 pt-2 sm:p-5 space-y-4 text-sm text-slate-700 leading-relaxed">
      <div>
        <h2 className="text-base font-extrabold text-sky-950">À propos de Camarine</h2>
        <p className="text-xs text-slate-500">Sentinelle des Canicules Marines</p>
      </div>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Né à l’Ocean Hackathon®</h3>
        <p>
          Camarine est née à l’<A href={LINKS.toulon}>Ocean Hackathon® Toulon</A>, du 16 au 18 octobre 2026 chez TVT Innovation : 48 heures pour
          construire le prototype d’un outil numérique sur un défi maritime, à partir de vraies données marines.
        </p>
        <p>
          L’<A href={LINKS.oceanHackathon}>Ocean Hackathon®</A> a été lancé à Brest en 2016 par le Campus mondial de la mer ; l’édition 2026, la
          10<sup>e</sup>, se tient dans 12 villes de 10 pays.
        </p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-sky-700">L’équipe</h3>
        <p>
          Pendant ces 48 heures, l’équipe du projet a construit une carte des canicules marines autour
          des côtes françaises à partir des données satellite Copernicus, et de leurs effets sur les espèces marines. Merci à toute l’équipe : son
          travail est dans le <A href={LINKS.teamRepo}>dépôt de l’équipe</A>.
        </p>
        <p>
          Après le hackathon, j'ai continué sur le projet, toujours en logiciel libre (<A href={LINKS.repo}>p-chatzi/camarine</A>
          ). Cette verison camarine est une copie à ma sauce pour l'instant. À voir ce que l'avenir nous réserve, mais l'idée est de continuer à faire vivre le projet avec l'équipe initiale. Cette version "Camarine" est probablement temporaire, mais le projet continue d'évoluer.
        </p>
        <p>Merci aussi à TVT Innovation, aux coachs de l’édition toulonnaise et à l'ISEN.</p>
      </section>

      <section className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-sky-700">Données et crédits</h3>
        <ul className="space-y-1.5">
          {CREDITS.map((c) => (
            <li key={c.label}>
              <A href={c.url}>{c.label}</A> <span className="text-slate-500">— {c.detail}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-slate-500">
          Une erreur sur une fiche espèce ? Bouton « Signaler » sur la fiche. Sources détaillées : fichier SOURCES.md du dépôt.
        </p>
      </section>
    </div>
  );
}
