// Species suggestions sent from the expert catalogue to the backend (POST /api/suggestions).
export interface SpeciesSuggestion {
  speciesName: string;
  message: string;
  /** Honeypot: hidden field that humans leave empty. */
  website: string;
}

export async function submitSuggestion(suggestion: SpeciesSuggestion): Promise<void> {
  const response = await fetch('/api/suggestions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      species_name: suggestion.speciesName,
      message: suggestion.message,
      website: suggestion.website,
    }),
  });
  if (response.status === 429) throw new Error('Trop de suggestions envoyées, réessayez dans quelques minutes.');
  if (!response.ok) throw new Error('Le serveur n’a pas pu enregistrer la suggestion.');
}
