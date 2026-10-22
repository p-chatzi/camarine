// Chapters of the guided "Fresque Murale" tour.
// Note: 'morue-atlantique' does not exist in species.ts; it is skipped at runtime.
// 'tortue-caouanne' and 'meduse-pelagia' exist again since 22/10/2026 (expert-only species).
import type { MuseumSection } from '../types';

export const MUSEUM_SECTIONS: MuseumSection[] = [
  {
    id: 'med', buttonNumber: 1, title: 'Méditerranée : Coraux & Herbiers',
    subtitle: 'Forêts de gorgones, herbiers de posidonie & canicules', center: [43.05, 5.95], zoom: 7,
    color: 'from-rose-500 to-amber-500', speciesIds: ['corail-rouge', 'posidonie', 'tortue-caouanne', 'gorgone-med', 'meduse-pelagia']
  },
  {
    id: 'atl', buttonNumber: 2, title: 'Atlantique & Bretagne : Laminaires',
    subtitle: 'Recul des forêts de kelp, exode du cabillaud et stress ostréicole', center: [47.15, -3.10], zoom: 7,
    color: 'from-sky-500 to-blue-600', speciesIds: ['laminaires-bretagne', 'morue-atlantique', 'huitres-moules']
  },
  {
    id: 'manche', buttonNumber: 3, title: 'Manche : La Prolifération du Poulpe',
    subtitle: 'Quand le réchauffement fait exploser de nouveaux prédateurs', center: [49.15, -2.15], zoom: 8,
    color: 'from-emerald-500 to-teal-600', speciesIds: ['pieuvre-manche']
  },
  {
    id: 'plankton', buttonNumber: 4, title: 'Plancton : Le Socle Invisible Menacé',
    subtitle: 'Stratification des eaux, chute d’oxygène et micro-algues toxiques', center: [42.85, 4.25], zoom: 8,
    color: 'from-indigo-500 to-cyan-600', speciesIds: ['plancton-global']
  }
];
