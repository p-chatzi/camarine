// Pure helpers around the species list: visibility per mode, search, labels. No React.
import { SPECIES_DATA } from '../data/species';
import type { HeatEvidence, IucnCategory, Kingdom, SpeciesItem } from '../types';

/** Species visible in a given mode: everything in expert mode, only 'public' species otherwise. */
export function speciesForMode(expert: boolean): SpeciesItem[] {
  return expert ? SPECIES_DATA : SPECIES_DATA.filter((sp) => sp.audience === 'public');
}

/** Lower-case, accent-free text so "eponge" matches "Éponge". */
export function normalizeText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

/** Search by common or scientific name. */
export function matchesQuery(sp: SpeciesItem, query: string): boolean {
  const q = normalizeText(query);
  if (!q) return true;
  return normalizeText(sp.name).includes(q) || normalizeText(sp.scientificName).includes(q);
}

export const KINGDOM_LABELS: Record<Kingdom, string> = { faune: 'Faune', flore: 'Flore' };

export const IUCN_LABELS: Record<IucnCategory, string> = {
  CR: 'En danger critique',
  EN: 'En danger',
  VU: 'Vulnérable',
  NT: 'Quasi menacée',
  LC: 'Préoccupation mineure',
  DD: 'Données insuffisantes',
  NE: 'Non évaluée',
};

/** Tailwind classes per IUCN category (official Red List colour logic: red → orange → yellow → green). */
export const IUCN_BADGE_CLASSES: Record<IucnCategory, string> = {
  CR: 'bg-red-700 text-white border-red-800',
  EN: 'bg-orange-600 text-white border-orange-700',
  VU: 'bg-amber-400 text-slate-950 border-amber-500',
  NT: 'bg-lime-200 text-lime-950 border-lime-300',
  LC: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  DD: 'bg-slate-200 text-slate-800 border-slate-300',
  NE: 'bg-white text-slate-500 border-slate-300 border-dashed',
};

/** Threatened in the IUCN sense = CR, EN or VU. */
export function isThreatened(sp: SpeciesItem): boolean {
  return sp.iucn.category === 'CR' || sp.iucn.category === 'EN' || sp.iucn.category === 'VU';
}

export const HEAT_EVIDENCE_LABELS: Record<HeatEvidence, string> = {
  établi: 'Lien établi par les études citées',
  probable: 'Lien probable (plusieurs indices)',
  hypothèse: 'Hypothèse à confirmer',
};
