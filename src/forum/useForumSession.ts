// Who is logged in (GET /api/forum/me), shared by every forum page. Keeps the CSRF token in memory.
import { useCallback, useEffect, useState } from 'react';
import { api, setCsrf, type Me } from './api';

export function useForumSession() {
  const [me, setMeState] = useState<Me | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setMe = useCallback((next: Me) => {
    setCsrf(next.csrf ?? '');
    setMeState((prev) => ({ ...next, providers: next.providers ?? prev?.providers ?? [], privacy_contact: next.privacy_contact ?? prev?.privacy_contact }));
  }, []);

  const refresh = useCallback(async () => {
    try {
      setMe(await api<Me>('/me'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Forum indisponible.');
    }
  }, [setMe]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { me, setMe, refresh, error, user: me?.user ?? null };
}

export type ForumSession = ReturnType<typeof useForumSession>;
