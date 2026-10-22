// Species suggestions sent from the expert catalogue to the backend (POST /api/suggestions).
// The backend re-validates and re-cleans everything (backend/suggestion_service.py): the client-side
// cleaning below only gives the visitor immediate feedback, it is not a security boundary.
export interface SpeciesSuggestion {
  speciesName: string;
  message: string;
  /** Honeypot: hidden field that humans leave empty. */
  website: string;
}

/** Same rules as the backend: NFC, no invisible/control characters (except newlines), trimmed. */
export function cleanSuggestionText(value: string, maxLength: number, multiline: boolean): string {
  const normalized = value.normalize('NFC').replace(/\r\n?/g, '\n').replace(/\t/g, ' ');
  // \p{C} = control, format (bidi overrides, zero-width…), private use, surrogates, unassigned.
  const visible = multiline
    ? normalized.split('\n').map((line) => line.replace(/\p{C}/gu, '')).join('\n')
    : normalized.replace(/\n/g, ' ').replace(/\p{C}/gu, '');
  return visible.replace(/[ ]{2,}/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, maxLength);
}

/** French message for each failure, with the HTTP status so problems can be diagnosed. */
function errorMessage(status: number): string {
  switch (status) {
    case 404:
    case 405:
      return `Le serveur ne connaît pas encore les suggestions (HTTP ${status}) : le backend n’est pas à jour ou n’a pas été redémarré.`;
    case 413:
      return 'Suggestion trop longue.';
    case 422:
      return 'Suggestion refusée : vérifiez le nom de l’espèce (au moins 2 caractères, dont une lettre).';
    case 429:
      return 'Trop de suggestions envoyées, réessayez dans quelques minutes.';
    case 503:
      return 'Les suggestions sont temporairement fermées.';
    default:
      return status >= 500
        ? `Le backend est injoignable ou en erreur (HTTP ${status}). Est-il lancé sur le port 8000 ?`
        : `Le serveur a refusé la suggestion (HTTP ${status}).`;
  }
}

export async function submitSuggestion(suggestion: SpeciesSuggestion): Promise<void> {
  let response: Response;
  try {
    response = await fetch('/api/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        species_name: suggestion.speciesName,
        message: suggestion.message,
        website: suggestion.website,
      }),
    });
  } catch {
    throw new Error('Serveur injoignable : la suggestion n’a pas été envoyée.');
  }
  if (!response.ok) throw new Error(errorMessage(response.status));
}
