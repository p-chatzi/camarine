// "Signaler une erreur" on a species card → POST /api/reports (backend/report_service.py, which
// re-validates everything and notifies the maintainer, see backend/notify.py).
import { cleanSuggestionText } from './suggestions';

export const REPORT_KINDS = [
  { id: 'donnee-erronee', label: 'Donnée erronée' },
  { id: 'source-manquante', label: 'Source manquante' },
  { id: 'source-erronee', label: 'Source erronée ou lien mort' },
  { id: 'autre', label: 'Autre' },
] as const;

export type ReportKind = (typeof REPORT_KINDS)[number]['id'];

export const REPORT_LIMITS = { messageMin: 10, message: 2000, url: 500 };

export interface SpeciesReport {
  speciesId: string;
  speciesName: string;
  kind: ReportKind;
  message: string;
  sourceUrl: string;
  /** Honeypot: hidden field that humans leave empty. */
  website: string;
}

export function cleanReportMessage(value: string): string {
  return cleanSuggestionText(value, REPORT_LIMITS.message, true);
}

/** '' or a valid http(s) link (same rule as the backend). */
export function isValidSourceUrl(value: string): boolean {
  const url = value.trim();
  if (!url) return true;
  try {
    const parsed = new URL(url);
    return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && !!parsed.hostname && !parsed.username && !parsed.password;
  } catch {
    return false;
  }
}

function errorMessage(status: number): string {
  switch (status) {
    case 404:
    case 405:
      return `Le serveur ne connaît pas encore les signalements (HTTP ${status}) : le backend n’est pas à jour ou n’a pas été redémarré.`;
    case 413:
      return 'Message trop long.';
    case 422:
      return 'Signalement refusé : décrivez le problème (au moins 10 caractères) et vérifiez le lien.';
    case 429:
      return 'Trop de signalements envoyés, réessayez dans quelques minutes.';
    case 503:
      return 'Les signalements sont temporairement fermés.';
    default:
      return status >= 500 ? `Le backend est injoignable ou en erreur (HTTP ${status}).` : `Le serveur a refusé le signalement (HTTP ${status}).`;
  }
}

export async function submitReport(report: SpeciesReport): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        species_id: report.speciesId,
        species_name: report.speciesName,
        kind: report.kind,
        message: report.message,
        source_url: report.sourceUrl.trim(),
        website: report.website,
      }),
    });
  } catch {
    throw new Error('Serveur injoignable : le signalement n’a pas été envoyé.');
  }
  if (!response.ok) throw new Error(errorMessage(response.status));
}
