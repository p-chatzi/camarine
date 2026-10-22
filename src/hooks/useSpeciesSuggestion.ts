// State of the "suggest a missing species" form (expert catalogue).
import { useState } from 'react';
import { submitSuggestion } from '../api/suggestions';

export const SUGGESTION_LIMITS = { name: 120, message: 2000 };

type Status = 'idle' | 'sending' | 'sent' | 'error';

export function useSpeciesSuggestion() {
  const [speciesName, setSpeciesName] = useState('');
  const [message, setMessage] = useState('');
  const [website, setWebsite] = useState(''); // honeypot
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);

  const canSubmit = speciesName.trim().length >= 2 && status !== 'sending';

  const submit = async () => {
    if (!canSubmit) return;
    setStatus('sending');
    setError(null);
    try {
      await submitSuggestion({ speciesName: speciesName.trim(), message: message.trim(), website });
      setStatus('sent');
      setSpeciesName('');
      setMessage('');
    } catch (err) {
      setStatus('error');
      setError(err instanceof Error && err.message !== 'Failed to fetch' ? err.message : 'Serveur injoignable : la suggestion n’a pas été envoyée.');
    }
  };

  return {
    speciesName, setSpeciesName,
    message, setMessage,
    website, setWebsite,
    status, error, canSubmit, submit,
    reset: () => setStatus('idle'),
  };
}

export type SpeciesSuggestionForm = ReturnType<typeof useSpeciesSuggestion>;
